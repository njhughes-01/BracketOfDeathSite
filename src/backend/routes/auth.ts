import { Router } from "express";
import UserController from "../controllers/UserController";
import { requireAuth } from "../middleware/auth";

const router = Router();
const userController = new UserController();

// Login endpoint
router.post("/login", userController.login.bind(userController));

// Registration endpoint
router.post("/register", userController.register.bind(userController));

// Password Reset Request
router.post(
  "/forgot-password",
  userController.publicRequestPasswordReset.bind(userController),
);

// Email Verification Request
router.post(
  "/verify-email-request",
  requireAuth,
  userController.requestEmailVerification.bind(userController),
);

export default router;
