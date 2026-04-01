import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";

import connectDB from "./config/db";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import videoRoutes from "./modules/video/video.routes";
import { initSocket } from "./sockets/socket";

const app = express();
const server = http.createServer(app);

// socket setup
initSocket(server);

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/video", videoRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

void startServer();
