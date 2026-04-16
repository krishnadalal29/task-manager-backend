import { createHash } from "crypto";
import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../db";
import { AuthSession } from "../entity/authSession";
import { User } from "../entity/user";

function extractBearerToken(authHeader?: string): string | null {
    if (!authHeader) {
        return null;
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        return null;
    }

    return token.trim();
}

export function hashAuthToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export const requireAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> => {
    try {
        const token = extractBearerToken(req.headers.authorization);
        if (!token) {
            return res.status(401).json({ error: "Missing Authorization Bearer token" });
        }

        const sessionRepo = AppDataSource.getRepository(AuthSession);
        const tokenHash = hashAuthToken(token);
        const session = await sessionRepo.findOne({ where: { tokenHash } });
        if (!session) {
            return res.status(401).json({ error: "Invalid or expired session" });
        }

        const expiresAtMs = new Date(session.expiresAt).getTime();
        if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
            // await sessionRepo.delete({ _id: session._id as any });
            session.is_expired = true;
            const updated = await sessionRepo.save(session);
            return res.status(401).json({ error: "Session expired" });
        }

        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { _id: session.userId as any } });
        if (!user) {
            // await sessionRepo.delete({ _id: session._id as any });
            session.is_expired = true;
            session.is_deleted = true;
            await sessionRepo.save(session);
            return res.status(401).json({ error: "User does not exist for this session" });
        }

        req.authToken = token;
        req.authUserId = user._id;
        req.authUser = user;
        next();
    } catch (error) {
        const message = (error as Error).message ?? "Internal Server Error";
        res.status(500).json({ error: "Internal Server Error", detail: message });
    }
};
