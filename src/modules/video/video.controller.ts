import { Response } from "express";
import fs from "node:fs";
import path from "node:path";

import { AuthRequest } from "../../middleware/auth.middleware";
import { adminRoom, getIO, userRoom } from "../../sockets/socket";
import Video from "./video.model";

type VideoStatus = "UPLOADING" | "PROCESSING" | "COMPLETED";
type Sensitivity = "SAFE" | "FLAGGED";

const uploadsDir = path.join(process.cwd(), "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildLocalFileName(userId: string, originalName: string) {
  const safeOriginal = sanitizeFileName(path.basename(originalName));
  return `${Date.now()}-${userId}-${safeOriginal}`;
}

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

    ensureUploadsDir();
    const localFileName = buildLocalFileName(req.user.userId, req.file.originalname);
    const destinationPath = path.join(uploadsDir, localFileName);

    await fs.promises.writeFile(destinationPath, req.file.buffer);

    const video = await Video.create({
      title: (title || "").trim() || req.file.originalname,
      filename: localFileName,
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
    console.error("Upload failed:", error);
    res.status(500).json({ message: "Video upload failed" });
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

    const filePath = path.join(uploadsDir, video.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Video file missing on server" });
    }

    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const ext = path.extname(video.filename).toLowerCase();
    const contentType = ext === ".webm" ? "video/webm" : ext === ".mov" ? "video/quicktime" : ext === ".mkv" ? "video/x-matroska" : "video/mp4";
    const range = req.headers.range;

    if (!range) {
      res.status(200);
      res.set({
        "Content-Length": fileSize,
        "Content-Type": contentType,
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = Number.parseInt(parts[0], 10);
    const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
      return res.status(416).json({ message: "Invalid range" });
    }

    const chunkSize = end - start + 1;

    const headers = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
    };

    res.writeHead(206, headers);
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } catch (error) {
    res.status(500).json({ message: "Streaming error", error });
  }
};
