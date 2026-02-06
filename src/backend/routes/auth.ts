import { Router } from "express";
import UserController from "../controllers/UserController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Login endpoint
router.post("/login", UserController.login);

// Registration endpoint
router.post("/register", UserController.register);

// Password Reset Request
router.post("/forgot-password", UserController.publicRequestPasswordReset);

// Complete Password Reset (with token)
router.post("/reset-password", UserController.publicResetPassword);

// Email Verification Request
router.post(
  "/verify-email-request",
  requireAuth,
  UserController.requestEmailVerification,
);

export default router;
