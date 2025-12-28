import { Router } from "express";
import UserController from "../controllers/UserController";
import ProfileController from "../controllers/ProfileController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// All profile routes require authentication (but not admin)
router.use(requireAuth);

// Profile routes
router.get("/", ProfileController.getProfile);
router.put("/", ProfileController.updateProfile);
router.post("/link-player", UserController.linkPlayerToSelf);
router.post("/password", ProfileController.changePassword);

export default router;
