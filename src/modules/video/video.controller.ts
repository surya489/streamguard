import { Request, Response } from "express";
import Video from "./video.model";
import fs from "fs";
import path from "path";

export const uploadVideo = async (req: any, res: Response) => {
  try {
    const { title } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    const video = await Video.create({
      title,
      filename: req.file.filename,
      user: req.user.userId,
      status: "UPLOADING",
    });

    // simulate processing
    setTimeout(async () => {
      await Video.findByIdAndUpdate(video._id, {
        status: "PROCESSING",
      });

      // simulate final stage
      setTimeout(async () => {
        await Video.findByIdAndUpdate(video._id, {
          status: "COMPLETED",
          sensitivity: Math.random() > 0.5 ? "SAFE" : "FLAGGED",
        });
      }, 5000);
    }, 3000);

    res.status(201).json({
      message: "Video uploaded successfully",
      video,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getUserVideos = async (req: any, res: Response) => {
  try {
    const videos = await Video.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.json({
      message: "Videos fetched successfully",
      videos,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const streamVideo = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const videoPath = path.join(
      __dirname,
      "../../../uploads",
      video.filename
    );

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;

    const range = req.headers.range;

    if (!range) {
      return res.status(400).send("Requires Range header");
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : fileSize - 1;

    const chunkSize = end - start + 1;

    const file = fs.createReadStream(videoPath, {
      start,
      end,
    });

    const headers = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    };

    res.writeHead(206, headers);
    file.pipe(res);
  } catch (error) {
    res.status(500).json({ message: "Streaming error", error });
  }
};