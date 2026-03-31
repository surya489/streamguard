import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    filename: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["UPLOADING", "PROCESSING", "COMPLETED"],
      default: "UPLOADING",
    },

    sensitivity: {
      type: String,
      enum: ["SAFE", "FLAGGED"],
      default: "SAFE",
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Video = mongoose.model("Video", videoSchema);

export default Video;