import { Response } from "express";
import fs from "fs";
import path from "path";

import { AuthRequest } from "../../middleware/auth.middleware";
import { adminRoom, getIO, userRoom } from "../../sockets/socket";
import Video from "./video.model";

type VideoStatus = "UPLOADING" | "PROCESSING" | "COMPLETED";
type Sensitivity = "SAFE" | "FLAGGED";

function emitVideoProgress(params: {
  userId: string;
  videoId: string;
  status: VideoStatus;
  progress: number;
  sensitivity?: Sensitivity;
}) {
  getIO().to(userRoom(params.userId)).emit("video:progress", {
    videoId: params.videoId,
    status: params.status,
    progress: params.progress,
    sensitivity: params.sensitivity ?? null,
    updatedAt: new Date().toISOString(),
  });
}

function getVideoContentType(filename: string): string {
  const extension = path.extname(filename).toLowerCase();

  if (extension === ".webm") return "video/webm";
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".mkv") return "video/x-matroska";
  return "video/mp4";
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runProcessingPipeline(videoId: string, userId: string) {
  try {
    emitVideoProgress({ userId, videoId, status: "UPLOADING", progress: 10 });

    await delay(1500);
    await Video.findByIdAndUpdate(videoId, { status: "PROCESSING" });
    emitVideoProgress({ userId, videoId, status: "PROCESSING", progress: 35 });

    await delay(1500);
    emitVideoProgress({ userId, videoId, status: "PROCESSING", progress: 70 });

    await delay(2000);
    const sensitivity: Sensitivity = Math.random() > 0.5 ? "SAFE" : "FLAGGED";

    await Video.findByIdAndUpdate(videoId, {
      status: "COMPLETED",
      sensitivity,
    });

    emitVideoProgress({
      userId,
      videoId,
      status: "COMPLETED",
      progress: 100,
      sensitivity,
    });

    getIO().to(userRoom(userId)).emit("video:completed", {
      videoId,
      sensitivity,
      status: "COMPLETED",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Processing pipeline failed", error);
  }
}

export const uploadVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    const video = await Video.create({
      title: (title || "").trim() || req.file.originalname,
      filename: req.file.filename,
      user: req.user.userId,
      status: "UPLOADING",
    });

    getIO().to(adminRoom()).emit("admin:video-uploaded", {
      videoId: video._id.toString(),
      userId: req.user.userId,
      createdAt: new Date().toISOString(),
    });

    void runProcessingPipeline(video._id.toString(), req.user.userId);

    res.status(201).json({
      message: "Video uploaded successfully",
      video,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getUserVideos = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { status, sensitivity, search, sort = "desc", all } = req.query;
    const filter: Record<string, unknown> = {
      user: req.user.userId,
    };

    if (req.user.role === "ADMIN" && all === "true") {
      delete filter.user;
    }

    if (status === "UPLOADING" || status === "PROCESSING" || status === "COMPLETED") {
      filter.status = status;
    }

    if (sensitivity === "SAFE" || sensitivity === "FLAGGED") {
      filter.sensitivity = sensitivity;
    }

    if (typeof search === "string" && search.trim().length > 0) {
      filter.title = { $regex: search.trim(), $options: "i" };
    }

    const sortDir = sort === "asc" ? 1 : -1;

    const videos = await Video.find(filter).sort({ createdAt: sortDir });

    res.json({
      message: "Videos fetched successfully",
      videos,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const streamVideo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { id } = req.params;

    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const isOwner = video.user.toString() === req.user.userId;
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    const videoPath = path.join(__dirname, "../../../uploads", video.filename);

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ message: "Video file missing on server" });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const contentType = getVideoContentType(video.filename);
    const range = req.headers.range;

    if (!range) {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
      });

      fs.createReadStream(videoPath).pipe(res);
      return;
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = Number.parseInt(parts[0], 10);
    const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
      return res.status(416).json({ message: "Invalid range" });
    }

    const chunkSize = end - start + 1;

    const file = fs.createReadStream(videoPath, {
      start,
      end,
    });

    const headers = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
    };

    res.writeHead(206, headers);
    file.pipe(res);
  } catch (error) {
    res.status(500).json({ message: "Streaming error", error });
  }
};
