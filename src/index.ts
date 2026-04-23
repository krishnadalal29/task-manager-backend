import { initializeDatabase } from "./db";
import { createApp } from "./app";
import { env } from "./config/env";

const PORT = env.server.port;
async function startServer(): Promise<void> {
    try {
        await initializeDatabase();
        const app = await createApp();
        app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
            console.log(`API available at http://localhost:${PORT}/api`);
            console.log(`API Documentation available at http://localhost:${PORT}/api/docs`);
        });
    } catch (err) {
        console.error("Startup failed", err);
    }
}

if (require.main === module) {
    void startServer();
}
