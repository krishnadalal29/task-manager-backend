import { existsSync, readFileSync } from "fs";
import * as path from "path";
import { initializeDatabase } from "./db";
import app from "./app";

function loadEnvFile(): void {
  const envPath = path.join(__dirname, "..", ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
async function startServer(): Promise<void> {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
            console.log(`API available at http://localhost:${PORT}/api`);
        });
    } catch (err) {
        console.error("Startup failed", err);
    }
}

if (require.main === module) {
    void startServer();
}
