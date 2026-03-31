import { Router } from "express";
import { protect, authorize } from "../../middleware/auth.middleware";
import {
  getAllUsers,
  updateUserRole,
} from "./user.controller";

const router = Router();

// ADMIN: get all users
router.get("/", protect, authorize("ADMIN"), getAllUsers);

// ADMIN: update role
router.put("/role", protect, authorize("ADMIN"), updateUserRole);

export default router;