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

// Email Verification Request
router.post(
  "/verify-email-request",
  requireAuth,
  UserController.requestEmailVerification,
);

export default router;
