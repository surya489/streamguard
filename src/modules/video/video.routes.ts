import { Router, Request, Response, NextFunction } from "express";
import { protect, authorize } from "../../middleware/auth.middleware";
import upload from "../../middleware/upload.middleware";
import { uploadVideo, getUserVideos, streamVideo } from "./video.controller";

const router = Router();

// upload
router.post(
  "/upload",
  protect,
  authorize("ADMIN", "EDITOR"),
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("video")(req, res, (error: unknown) => {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }

      next();
    });
  },
  uploadVideo
);

// get videos (all logged-in users)
router.get("/", protect, getUserVideos);

router.get("/stream/:id", protect, streamVideo);

export default router;
