import multer from "multer";
import path from "path";

const allowedMimeTypes = [
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
];

const allowedExtensions = new Set([".mp4", ".mov", ".mkv", ".webm"]);

// storage config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/");
  },

  filename: (_req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, uniqueName + path.extname(file.originalname).toLowerCase());
  },
});

const upload = multer({
  storage,
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