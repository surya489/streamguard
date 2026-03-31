import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in environment variables.");
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("MongoDB connected successfully");
  } catch (error) {
    const err = error as Error & { code?: string };

    if (err?.message?.includes("querySrv") || err?.code === "ECONNREFUSED") {
      console.error(
        "MongoDB SRV DNS lookup failed. This is usually a DNS/network issue. Try changing DNS to 8.8.8.8 or 1.1.1.1, or use a non-SRV mongodb:// URI from Atlas."
      );
    }

    throw error;
  }
};

export default connectDB;
