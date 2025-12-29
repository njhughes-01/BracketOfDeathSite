import { Router } from "express";
import UserController from "../controllers/UserController";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// All user management routes require admin privileges
router.use(requireAdmin);

// User CRUD operations
router.get("/", UserController.getUsers);
router.get("/roles", UserController.getAvailableRoles);
router.get("/:id", UserController.getUser);
router.post("/", UserController.createUser);
router.put("/:id", UserController.updateUser);
router.delete("/:id", UserController.deleteUser);
router.post("/claim", UserController.claimUser);

// User-specific operations
router.put("/:id/roles", UserController.updateUserRoles);
router.post("/:id/password", UserController.resetPassword);

export default router;
