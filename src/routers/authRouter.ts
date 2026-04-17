import { Router } from "express";
import {
    getCurrentUser,
    handleGoogleOAuthCallback,
    loginWithEmailPassword,
    logout,
    signUpWithEmailPassword,
    startGoogleOAuth
} from "../controllers/authController";
import { requireAuth } from "../middleware/authMiddleware";

const authRouter = Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user with email and password
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: User already exists
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
authRouter.post("/signup", signUpWithEmailPassword);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
authRouter.post("/login", loginWithEmailPassword);

/**
 * @swagger
 * /api/auth/google/login:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags:
 *       - Authentication
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent screen
 *       404:
 *         description: Resource not found
 *       500:
 *         description: OAuth config missing
 */
authRouter.get("/google/login", startGoogleOAuth);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback endpoint
 *     tags:
 *       - Authentication
 *     parameters:
 *       - name: code
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - name: state
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: State token for CSRF protection
 *     responses:
 *       200:
 *         description: OAuth authentication successful, returns token
 *       302:
 *         description: Redirect with token if frontend redirect configured
 *       400:
 *         description: Invalid authorization code or state
 *       502:
 *         description: OAuth token exchange or user profile fetch failed
 *       404:
 *         description: Resource not found
 *       500:
 *         description: Internal server error
 */
authRouter.get("/google/callback", handleGoogleOAuthCallback);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized - token missing or invalid
 */
authRouter.get("/me", requireAuth, getCurrentUser);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout the current user
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       404:
 *         description: Session not found
 *       401:
 *         description: Unauthorized - token missing or invalid
 */
authRouter.post("/logout", requireAuth, logout);

export default authRouter;
