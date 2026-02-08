import { Router } from "express";
import { discountCodeController } from "../controllers/DiscountCodeController";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

// Public route - validate discount code (requires auth)
router.post("/validate", requireAuth, discountCodeController.validate);

// Admin routes
router.get("/", requireAdmin, discountCodeController.list);
router.get("/:id", requireAdmin, discountCodeController.get);
router.post("/", requireAdmin, discountCodeController.create);
router.put("/:id", requireAdmin, discountCodeController.update);
router.delete("/:id", requireAdmin, discountCodeController.deactivate);

export default router;
