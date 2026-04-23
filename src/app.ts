import express, { Express } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import apiRouter from "./routers/baseRouter";
import { env } from "./config/env";

const localApiUrl = `http://localhost:${env.server.port}`;

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Task Manager API",
            version: "1.0.0",
            description: "A comprehensive API for managing tasks and tags with authentication",
            contact: {
                name: "API Support"
            }
        },
        servers: [
            {
                url: localApiUrl,
                description: "Development server"
            },
            {
                url: "https://api.taskmanager.com",
                description: "Production server"
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "JWT authentication token"
                }
            }
        }
    },
    apis: ["./src/routers/*.ts"] // Relative to project root
};

const specs = swaggerJsdoc(swaggerOptions);
console.log("📋 Generated OpenAPI spec with", (specs as any).paths ? Object.keys((specs as any).paths).length : 0, "paths");

function createAppBase(): Express {
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

    app.get("/swagger.json", (req, res) => {
        console.log("📋 Serving swagger.json with", (specs as any).paths ? Object.keys((specs as any).paths).length : 0, "paths");
        res.json(specs);
    });

    app.use("/api", apiRouter);

    return app;
}

export async function createApp(): Promise<Express> {
    const app = createAppBase();

    // Always try to load Scalar first, fallback to HTML docs if it fails
    console.log(`📋 Environment: ${env.nodeEnv}`);

    try {
        console.log("🔄 Attempting to load Scalar API Reference...");
        // Use eval to dynamically import in a way that works with ts-node-dev
        const scalarModule = await eval('import("@scalar/express-api-reference")');
        const { apiReference } = scalarModule;
        app.use("/api/docs", apiReference({ url: "/swagger.json" }));
        console.log("✅ Scalar API Documentation loaded successfully");
    } catch (error) {
        console.warn("⚠️  Scalar API Reference failed to load, using HTML fallback:", (error as Error).message);
        setupFallbackDocs(app);
    }

    return app;
}

function setupFallbackDocs(app: Express): void {
    app.get("/api/docs", (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Task Manager API Documentation</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        background: #f8f9fa;
                        padding: 20px;
                    }
                    .container {
                        max-width: 1200px;
                        margin: 0 auto;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 40px 30px;
                        text-align: center;
                    }
                    .header h1 {
                        font-size: 2.5em;
                        margin-bottom: 10px;
                    }
                    .header p {
                        font-size: 1.2em;
                        opacity: 0.9;
                    }
                    .content {
                        padding: 40px 30px;
                    }
                    .section {
                        margin-bottom: 40px;
                    }
                    .section h2 {
                        color: #2c3e50;
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }
                    .endpoint {
                        background: #f8f9fa;
                        border: 1px solid #e9ecef;
                        border-radius: 6px;
                        padding: 20px;
                        margin-bottom: 15px;
                    }
                    .method {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 4px;
                        font-weight: bold;
                        font-size: 0.9em;
                        text-transform: uppercase;
                    }
                    .method.get { background: #28a745; color: white; }
                    .method.post { background: #007bff; color: white; }
                    .method.put { background: #ffc107; color: black; }
                    .method.delete { background: #dc3545; color: white; }
                    .endpoint h3 {
                        margin: 10px 0;
                        font-size: 1.2em;
                    }
                    .endpoint p {
                        color: #666;
                        margin-bottom: 10px;
                    }
                    .links {
                        display: flex;
                        gap: 15px;
                        flex-wrap: wrap;
                        margin-top: 30px;
                    }
                    .btn {
                        display: inline-block;
                        padding: 12px 24px;
                        background: #3498db;
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: 500;
                        transition: background 0.3s;
                    }
                    .btn:hover {
                        background: #2980b9;
                    }
                    .btn.secondary {
                        background: #95a5a6;
                    }
                    .btn.secondary:hover {
                        background: #7f8c8d;
                    }
                    .btn.success {
                        background: #27ae60;
                    }
                    .btn.success:hover {
                        background: #229954;
                    }
                    .auth-note {
                        background: #fff3cd;
                        border: 1px solid #ffeaa7;
                        border-radius: 6px;
                        padding: 15px;
                        margin: 20px 0;
                    }
                    .auth-note strong {
                        color: #856404;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📋 Task Manager API</h1>
                        <p>Complete API documentation for task management with authentication</p>
                    </div>

                    <div class="content">
                        <div class="auth-note">
                            <strong>🔐 Authentication:</strong> Most endpoints require JWT authentication.
                            Use the <code>Authorization: Bearer &lt;token&gt;</code> header.
                        </div>

                        <div class="section">
                            <h2>🔑 Authentication Endpoints</h2>

                            <div class="endpoint">
                                <span class="method post">POST</span>
                                <h3>/api/auth/signup</h3>
                                <p>Register a new user account</p>
                            </div>

                            <div class="endpoint">
                                <span class="method post">POST</span>
                                <h3>/api/auth/login</h3>
                                <p>Login with email and password</p>
                            </div>

                            <div class="endpoint">
                                <span class="method get">GET</span>
                                <h3>/api/auth/me</h3>
                                <p>Get current authenticated user information</p>
                            </div>

                            <div class="endpoint">
                                <span class="method get">GET</span>
                                <h3>/api/auth/google/login</h3>
                                <p>Initiate Google OAuth login</p>
                            </div>
                        </div>

                        <div class="section">
                            <h2>📝 Task Endpoints</h2>

                            <div class="endpoint">
                                <span class="method get">GET</span>
                                <h3>/api/tasks/getAllTasks</h3>
                                <p>Get all tasks for the authenticated user</p>
                            </div>

                            <div class="endpoint">
                                <span class="method post">POST</span>
                                <h3>/api/tasks/createTask</h3>
                                <p>Create a new task</p>
                            </div>

                            <div class="endpoint">
                                <span class="method put">PUT</span>
                                <h3>/api/tasks/updateTask/{task_id}</h3>
                                <p>Update an existing task</p>
                            </div>

                            <div class="endpoint">
                                <span class="method delete">DELETE</span>
                                <h3>/api/tasks/deleteTask/{task_id}</h3>
                                <p>Delete a task</p>
                            </div>
                        </div>

                        <div class="section">
                            <h2>🏷️ Tag Endpoints</h2>

                            <div class="endpoint">
                                <span class="method get">GET</span>
                                <h3>/api/tags/getAllTags</h3>
                                <p>Get all tags for the authenticated user</p>
                            </div>

                            <div class="endpoint">
                                <span class="method post">POST</span>
                                <h3>/api/tags/createTag</h3>
                                <p>Create a new tag</p>
                            </div>

                            <div class="endpoint">
                                <span class="method delete">DELETE</span>
                                <h3>/api/tags/deleteTag/{tag_id}</h3>
                                <p>Delete a tag</p>
                            </div>
                        </div>

                        <div class="links">
                            <a href="/swagger.json" class="btn success">📄 OpenAPI JSON Spec</a>
                            <a href="https://editor.swagger.io/?url=${localApiUrl}/swagger.json" class="btn" target="_blank">🔗 Swagger Editor</a>
                            <a href="https://petstore.swagger.io/?url=${localApiUrl}/swagger.json" class="btn secondary" target="_blank">🛍️ Swagger UI</a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);
    });
}

// Sync version for tests and backward compatibility
const app = createAppBase();
export default app;
