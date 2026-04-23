import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

function readNodeEnv(): string {
    const value = process.env.NODE_ENV?.trim();
    return value && value.length > 0 ? value : "local";
}

function loadEnvFiles(currentNodeEnv: string): void {
    const envFiles = [".env", `.env.${currentNodeEnv}`, ".env.local"];

    for (const file of envFiles) {
        const filePath = path.resolve(process.cwd(), file);
        if (fs.existsSync(filePath)) {
            dotenv.config({ path: filePath, override: true, quiet: true });
        }
    }
}

function readOptionalEnv(key: string): string | undefined {
    const value = process.env[key];
    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return undefined;
    }

    const hasMatchingDoubleQuotes = trimmed.startsWith("\"") && trimmed.endsWith("\"");
    const hasMatchingSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'");

    if (trimmed.length >= 2 && (hasMatchingDoubleQuotes || hasMatchingSingleQuotes)) {
        return trimmed.slice(1, -1).trim();
    }

    return trimmed;
}

function readNumberEnv(key: string, fallback: number): number {
    const value = readOptionalEnv(key);
    if (!value) {
        return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = readNodeEnv();
loadEnvFiles(nodeEnv);

function buildMongoUri(): string {
    const explicitMongoUri = readOptionalEnv("MONGO_URI");
    if (explicitMongoUri) {
        return explicitMongoUri;
    }

    const host = readOptionalEnv("MONGO_HOST") ?? "localhost";
    const port = readOptionalEnv("MONGO_PORT") ?? "27017";
    const database = readOptionalEnv("MONGO_DB") ?? "myapp";
    const username = readOptionalEnv("MONGO_USERNAME");
    const password = readOptionalEnv("MONGO_PASSWORD");
    const authSource = readOptionalEnv("MONGO_AUTH_SOURCE") ?? "admin";

    if (username && password) {
        return `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=${authSource}`;
    }

    return `mongodb://${host}:${port}/${database}`;
}

export const env = {
    nodeEnv,
    isLocal: nodeEnv === "local",
    isDev: nodeEnv === "dev" || nodeEnv === "development",
    isProd: nodeEnv === "production",

    server: {
        port: readNumberEnv("PORT", 5000)
    },

    mongo: {
        host: readOptionalEnv("MONGO_HOST") ?? "localhost",
        port: readNumberEnv("MONGO_PORT", 27017),
        database: readOptionalEnv("MONGO_DB") ?? "myapp",
        username: readOptionalEnv("MONGO_USERNAME"),
        password: readOptionalEnv("MONGO_PASSWORD"),
        authSource: readOptionalEnv("MONGO_AUTH_SOURCE") ?? "admin",
        uri: buildMongoUri()
    },

    google: {
        clientId: readOptionalEnv("GOOGLE_CLIENT_ID"),
        clientSecret: readOptionalEnv("GOOGLE_CLIENT_SECRET"),
        redirectUri: readOptionalEnv("GOOGLE_REDIRECT_URI"),
        authEndpoint:
            readOptionalEnv("GOOGLE_AUTH_ENDPOINT") ?? "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint:
            readOptionalEnv("GOOGLE_TOKEN_ENDPOINT") ?? "https://oauth2.googleapis.com/token",
        userInfoEndpoint:
            readOptionalEnv("GOOGLE_USERINFO_ENDPOINT") ??
            "https://www.googleapis.com/oauth2/v3/userinfo"
    },

    frontend: {
        redirectUrl: readOptionalEnv("FRONTEND_REDIRECT_URL")
    }
} as const;
