import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { Request, Response } from "express";
import { AppDataSource } from "../db";
import { AuthSession } from "../entity/authSession";
import { User } from "../entity/user";
import { hashAuthToken } from "../middleware/authMiddleware";

type GoogleTokenResponse = {
    access_token?: string;
    error?: string;
    error_description?: string;
};

type GoogleUserInfoResponse = {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
};

type OAuthConfig = {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    frontendRedirect?: string;
};
type OAuthEndpoints = {
    authEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint: string;
};

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_SCRYPT_KEY_LENGTH = 64;

const oauthStates = new Map<string, number>();

function readEnvWithDefault(key: string, defaultValue: string): string {
    const value = process.env[key];
    if (!value || !value.trim()) {
        return defaultValue;
    }

    return value.trim();
}

function getGoogleOAuthEndpoints(): OAuthEndpoints {
    return {
        authEndpoint: readEnvWithDefault(
            "GOOGLE_AUTH_ENDPOINT",
            "https://accounts.google.com/o/oauth2/v2/auth"
        ),
        tokenEndpoint: readEnvWithDefault(
            "GOOGLE_TOKEN_ENDPOINT",
            "https://oauth2.googleapis.com/token"
        ),
        userInfoEndpoint: readEnvWithDefault(
            "GOOGLE_USERINFO_ENDPOINT",
            "https://www.googleapis.com/oauth2/v3/userinfo"
        )
    };
}

function getOAuthConfig(): OAuthConfig | null {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const frontendRedirect = process.env.FRONTEND_REDIRECT_URL;

    if (!clientId || !clientSecret || !redirectUri) {
        return null;
    }

    return {
        clientId,
        clientSecret,
        redirectUri,
        frontendRedirect
    };
}

function pruneExpiredStates(): void {
    const now = Date.now();
    for (const [state, expiry] of oauthStates) {
        if (expiry <= now) {
            oauthStates.delete(state);
        }
    }
}

function issueStateToken(): string {
    pruneExpiredStates();
    const state = randomBytes(24).toString("hex");
    oauthStates.set(state, Date.now() + OAUTH_STATE_TTL_MS);
    return state;
}

function consumeStateToken(state: string): boolean {
    const expiry = oauthStates.get(state);
    if (!expiry) {
        return false;
    }

    oauthStates.delete(state);
    return expiry > Date.now();
}

function sanitizeUser(user: User): Pick<User, "_id" | "email" | "name" | "picture"> {
    return {
        _id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture
    };
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createPasswordCredentials(password: string): { salt: string; hash: string } {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, PASSWORD_SCRYPT_KEY_LENGTH).toString("hex");
    return { salt, hash };
}

function verifyPassword(password: string, salt: string, expectedHashHex: string): boolean {
    const computedHash = scryptSync(password, salt, PASSWORD_SCRYPT_KEY_LENGTH);
    const expectedHash = Buffer.from(expectedHashHex, "hex");
    if (expectedHash.length !== computedHash.length) {
        return false;
    }
    return timingSafeEqual(computedHash, expectedHash);
}

async function createSessionForUser(userId: User["_id"]): Promise<{ token: string; expiresAt: Date }> {
    const sessionRepo = AppDataSource.getRepository(AuthSession);
    const now = new Date();
    const rawSessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    const session = sessionRepo.create({
        userId,
        tokenHash: hashAuthToken(rawSessionToken),
        createdAt: now,
        expiresAt,
        is_expired: false
    });

    await sessionRepo.save(session);

    return {
        token: rawSessionToken,
        expiresAt
    };
}

export const startGoogleOAuth = async (_req: Request, res: Response): Promise<Response | void> => {
    const config = getOAuthConfig();
    if (!config) {
        return res.status(500).json({
            error: "OAuth config missing. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI."
        });
    }

    const endpoints = getGoogleOAuthEndpoints();
    const state = issueStateToken();
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "consent",
        state
    });

    res.redirect(`${endpoints.authEndpoint}?${params.toString()}`);
};

export const handleGoogleOAuthCallback = async (
    req: Request,
    res: Response
): Promise<Response | void> => {
    const config = getOAuthConfig();
    if (!config) {
        return res.status(500).json({
            error: "OAuth config missing. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI."
        });
    }

    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;

    if (!code || !state) {
        return res.status(400).json({ error: "Missing OAuth code/state in callback" });
    }

    if (!consumeStateToken(state)) {
        return res.status(400).json({ error: "Invalid or expired OAuth state" });
    }

    try {
        const endpoints = getGoogleOAuthEndpoints();
        const tokenResponse = await fetch(endpoints.tokenEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                code,
                client_id: config.clientId,
                client_secret: config.clientSecret,
                redirect_uri: config.redirectUri,
                grant_type: "authorization_code"
            }).toString()
        });

        const tokenPayload = (await tokenResponse.json()) as GoogleTokenResponse;
        if (!tokenResponse.ok || !tokenPayload.access_token) {
            return res.status(502).json({
                error: "OAuth token exchange failed",
                detail: tokenPayload.error_description ?? tokenPayload.error ?? "Unknown token error"
            });
        }

        const userResponse = await fetch(endpoints.userInfoEndpoint, {
            headers: {
                Authorization: `Bearer ${tokenPayload.access_token}`
            }
        });
        const googleUser = (await userResponse.json()) as GoogleUserInfoResponse;
        if (!userResponse.ok || !googleUser.sub) {
            return res.status(502).json({
                error: "Failed to fetch Google user profile"
            });
        }

        const userRepo = AppDataSource.getRepository(User);
        const now = new Date();

        let user = await userRepo.findOne({
            where: {
                provider: "google",
                providerId: googleUser.sub
            }
        });

        if (!user) {
            user = userRepo.create({
                provider: "google",
                providerId: googleUser.sub,
                email: googleUser.email,
                name: googleUser.name ?? googleUser.email ?? "Google User",
                picture: googleUser.picture,
                createdAt: now,
                updatedAt: now
            });
        } else {
            user.email = googleUser.email ?? user.email;
            user.name = googleUser.name ?? user.name;
            user.picture = googleUser.picture ?? user.picture;
            user.updatedAt = now;
        }

        const savedUser = await userRepo.save(user);
        const session = await createSessionForUser(savedUser._id);

        if (config.frontendRedirect) {
            const redirectUrl = new URL(config.frontendRedirect);
            redirectUrl.searchParams.set("token", session.token);
            return res.redirect(redirectUrl.toString());
        }

        return res.json({
            token: session.token,
            expiresAt: session.expiresAt,
            user: sanitizeUser(savedUser)
        });
    } catch (error) {
        const message = (error as Error).message ?? "Internal Server Error";
        return res.status(500).json({ error: "Internal Server Error", detail: message });
    }
};

export const signUpWithEmailPassword = async (
    req: Request,
    res: Response
): Promise<Response | void> => {
    try {
        const { name, email, password } = req.body ?? {};

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ error: "name is required and must be a non-empty string" });
        }

        if (typeof email !== "string" || !isValidEmail(email)) {
            return res.status(400).json({ error: "email must be a valid email address" });
        }

        if (typeof password !== "string" || password.length < 8) {
            return res.status(400).json({ error: "password must be at least 8 characters" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const userRepo = AppDataSource.getRepository(User);

        const existingUser = await userRepo.findOne({
            where: {
                provider: "local",
                providerId: normalizedEmail
            }
        });
        if (existingUser) {
            return res.status(409).json({ error: "An account with this email already exists" });
        }

        const now = new Date();
        const passwordCredentials = createPasswordCredentials(password);
        const createdUser = userRepo.create({
            provider: "local",
            providerId: normalizedEmail,
            email: normalizedEmail,
            name: name.trim(),
            passwordHash: passwordCredentials.hash,
            passwordSalt: passwordCredentials.salt,
            createdAt: now,
            updatedAt: now
        });

        const savedUser = await userRepo.save(createdUser);
        const session = await createSessionForUser(savedUser._id);

        return res.status(201).json({
            token: session.token,
            expiresAt: session.expiresAt,
            user: sanitizeUser(savedUser)
        });
    } catch (error) {
        const message = (error as Error).message ?? "Internal Server Error";
        return res.status(500).json({ error: "Internal Server Error", detail: message });
    }
};

export const loginWithEmailPassword = async (
    req: Request,
    res: Response
): Promise<Response | void> => {
    try {
        const { email, password } = req.body ?? {};

        if (typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({ error: "email and password are required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({
            where: {
                provider: "local",
                providerId: normalizedEmail
            }
        });

        if (!user || !user.passwordSalt || !user.passwordHash) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isPasswordValid = verifyPassword(password, user.passwordSalt, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        user.updatedAt = new Date();
        const savedUser = await userRepo.save(user);
        const session = await createSessionForUser(savedUser._id);

        return res.json({
            token: session.token,
            expiresAt: session.expiresAt,
            user: sanitizeUser(savedUser)
        });
    } catch (error) {
        const message = (error as Error).message ?? "Internal Server Error";
        return res.status(500).json({ error: "Internal Server Error", detail: message });
    }
};

export const getCurrentUser = async (req: Request, res: Response): Promise<Response | void> => {
    if (!req.authUser) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    return res.json({ user: sanitizeUser(req.authUser) });
};

export const logout = async (req: Request, res: Response): Promise<Response | void> => {
    if (!req.authToken) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const sessionRepo = AppDataSource.getRepository(AuthSession);

    const session = await sessionRepo.findOne({ where: { tokenHash: hashAuthToken(req.authToken) } });
    if (!session) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    await sessionRepo.save({ ...session, is_deleted: true, is_logged_out: true });
    return res.json({ message: "Logged out" });
};
