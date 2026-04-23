import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./config/env";

const mongoUri = env.mongo.uri;
const parsedMongoUri = new URL(mongoUri);
const parsedDatabase =
    parsedMongoUri.pathname && parsedMongoUri.pathname !== "/"
        ? parsedMongoUri.pathname.substring(1)
        : env.mongo.database;

const config = {
    type: "mongodb" as const,
    host: parsedMongoUri.hostname || env.mongo.host,
    port: parsedMongoUri.port ? Number(parsedMongoUri.port) || env.mongo.port : env.mongo.port,
    database: parsedDatabase,
    username: parsedMongoUri.username
        ? decodeURIComponent(parsedMongoUri.username)
        : env.mongo.username,
    password: parsedMongoUri.password
        ? decodeURIComponent(parsedMongoUri.password)
        : env.mongo.password,
    authSource: parsedMongoUri.searchParams.get("authSource") || env.mongo.authSource,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    synchronize: true,
    logging: false,
    entities: ["dist/entity/*.js"],
    migrations: ["dist/entity/*.js"],
};

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
