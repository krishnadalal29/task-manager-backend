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

authRouter.post("/signup", signUpWithEmailPassword);
authRouter.post("/login", loginWithEmailPassword);
authRouter.get("/google/login", startGoogleOAuth);
authRouter.get("/google/callback", handleGoogleOAuthCallback);
authRouter.get("/me", requireAuth, getCurrentUser);
authRouter.post("/logout", requireAuth, logout);

export default authRouter;
