import mongoose from "mongoose";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in environment variables.");
  }

  let attempt = 0;
  const maxAttempts = 5;

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });

      const conn = mongoose.connection;

      conn.removeAllListeners("error");
      conn.removeAllListeners("disconnected");
      conn.removeAllListeners("reconnected");

      conn.on("error", (err) => {
        console.error("MongoDB connection error:", err.message);
      });

      conn.on("disconnected", () => {
        console.warn("MongoDB disconnected. Mongoose will retry automatically.");
      });

      conn.on("reconnected", () => {
        console.log("MongoDB reconnected.");
      });

      console.log("MongoDB connected successfully");
      return;
    } catch (error) {
      const err = error as Error & { code?: string };
      const isRetryable =
        RETRYABLE_NETWORK_CODES.has(err.code || "") ||
        err?.message?.includes("querySrv") ||
        err?.message?.includes("ECONNRESET");

      if (err?.message?.includes("querySrv")) {
        console.error(
          "MongoDB SRV DNS lookup failed. Try DNS 8.8.8.8 or 1.1.1.1, or use a non-SRV mongodb:// URI."
        );
      }

      if (!isRetryable || attempt >= maxAttempts) {
        throw error;
      }

      const waitMs = attempt * 2000;
      console.warn(
        `MongoDB connect attempt ${attempt}/${maxAttempts} failed (${err.code || err.message}). Retrying in ${waitMs}ms...`
      );
      await delay(waitMs);
    }
  }
};

export default connectDB;
