import http from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

type DecodedToken = {
  userId: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  iat?: number;
  exp?: number;
};

let ioInstance: Server | null = null;

export function initSocket(server: http.Server): Server {
  ioInstance = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  ioInstance.on("connection", (socket) => {
    try {
      const rawToken =
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.query?.token as string | undefined);

      if (!rawToken || !process.env.JWT_SECRET) {
        socket.disconnect(true);
        return;
      }

      const token = rawToken.replace("Bearer ", "").trim();
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;

      socket.join(userRoom(decoded.userId));
      if (decoded.role === "ADMIN") {
        socket.join(adminRoom());
      }
      socket.emit("socket:ready", { userId: decoded.userId });
    } catch {
      socket.disconnect(true);
    }
  });

  return ioInstance;
}

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error("Socket.io is not initialized.");
  }

  return ioInstance;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function adminRoom(): string {
  return "admin:dashboard";
}
