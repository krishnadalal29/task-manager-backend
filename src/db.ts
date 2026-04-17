import "reflect-metadata";
import { DataSource } from "typeorm";
import { readFileSync } from "fs";
import * as path from "path";

const configPath = path.join(__dirname, "..", "ormconfig.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

// Override host with environment variable if available
if (process.env.MONGO_URI) {
    const mongoUri = new URL(process.env.MONGO_URI);
    config.host = mongoUri.hostname;
    config.port = parseInt(mongoUri.port) || 27017;
    config.database = mongoUri.pathname.substring(1); // Remove leading slash
} else {
    // Fallback to localhost for local development
    config.host = "localhost";
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
