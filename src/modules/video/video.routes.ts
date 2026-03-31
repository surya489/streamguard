import { Router } from "express";
import { protect, authorize } from "../../middleware/auth.middleware";
import upload from "../../middleware/upload.middleware";
import {
  uploadVideo,
  getUserVideos,
  streamVideo
} from "./video.controller";

const router = Router();

// upload
router.post(
  "/upload",
  protect,
  authorize("ADMIN", "EDITOR"),
  upload.single("video"),
  uploadVideo
);

// get videos (all logged-in users)
router.get("/", protect, getUserVideos);

router.get("/stream/:id", streamVideo);

export default router;