import "reflect-metadata";
import { DataSource } from "typeorm";

const mongoUri = process.env.MONGO_URI;
const config = {
    type: "mongodb" as const,
    host: mongoUri ? new URL(mongoUri).hostname : process.env.MONGO_HOST || "localhost",
    port: mongoUri ? parseInt(new URL(mongoUri).port) || 27017 : Number(process.env.MONGO_PORT) || 27017,
    database: mongoUri ? new URL(mongoUri).pathname.substring(1) : process.env.MONGO_DB || "myapp",
    username: process.env.MONGO_USERNAME,
    password: process.env.MONGO_PASSWORD,
    authSource: process.env.MONGO_AUTH_SOURCE,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    synchronize: true,
    logging: false,
    entities: ["dist/entity/*.js"],
    migrations: ["dist/entity/*.js"],
};

if (mongoUri) {
    const parsed = new URL(mongoUri);
    if (parsed.username) {
        config.username = parsed.username;
    }
    if (parsed.password) {
        config.password = parsed.password;
    }
    if (parsed.searchParams.has("authSource")) {
        config.authSource = parsed.searchParams.get("authSource") || undefined;
    }
}

export const AppDataSource = new DataSource(config);

export async function initializeDatabase(): Promise<void> {
    try {
        console.log(`Connecting to MongoDB at ${config.host}:${config.port}/${config.database}`);
        await AppDataSource.initialize();
        console.log("Data Source has been initialized!");
    } catch (err) {
        console.error("Error during Data Source initialization", err);
        throw err;
    }
}
