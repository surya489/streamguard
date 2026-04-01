import multer from "multer";
import path from "path";

const allowedMimeTypes = [
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
];

const allowedExtensions = new Set([".mp4", ".mov", ".mkv", ".webm"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(ext) || !allowedMimeTypes.includes(file.mimetype)) {
      cb(new Error("Invalid video format. Allowed: mp4, mov, mkv, webm"));
      return;
    }

    cb(null, true);
  },
});

export default upload;
