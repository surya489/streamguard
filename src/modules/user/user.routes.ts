import { Router } from "express";
import { protect, authorize } from "../../middleware/auth.middleware";
import {
  changeMyPassword,
  getAllUsers,
  getMyProfile,
  updateMyProfile,
  updateUserRole,
} from "./user.controller";

const router = Router();

// ADMIN: get all users
router.get("/", protect, authorize("ADMIN"), getAllUsers);

// USER: get own profile
router.get("/me", protect, getMyProfile);

// USER: update own profile
router.put("/profile", protect, updateMyProfile);

// USER: change own password
router.put("/password", protect, changeMyPassword);

// ADMIN: update role
router.put("/role", protect, authorize("ADMIN"), updateUserRole);

export default router;
