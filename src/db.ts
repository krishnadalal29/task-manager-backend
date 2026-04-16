import "reflect-metadata";
import { DataSource } from "typeorm";
import { readFileSync } from "fs";
import * as path from "path";

const configPath = path.join(__dirname, "..", "ormconfig.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));

export const AppDataSource = new DataSource(config);

export async function initializeDatabase(): Promise<void> {
    try {
        await AppDataSource.initialize();
        console.log("Data Source has been initialized!");
    } catch (err) {
        console.error("Error during Data Source initialization", err);
        throw err;
    }
}
