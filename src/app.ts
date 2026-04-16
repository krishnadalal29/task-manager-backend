import express, { Express } from "express";
import apiRouter from "./routers/baseRouter";

export function createApp(): Express {
    const app = express();

    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "http://localhost:3000");
        res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (req.method === "OPTIONS") {
            return res.status(200).end();
        }

        next();
    });

    app.use(express.json());
    app.use("/api", apiRouter);

    return app;
}

const app = createApp();

export default app;
