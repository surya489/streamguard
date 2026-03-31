import { Request, Response } from "express";
import User from "./user.model";

// 🔥 Get all users (ADMIN only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password");

    res.json({
      message: "Users fetched successfully",
      users,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// 🔥 Update user role (ADMIN only)
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({
        message: "userId and role are required",
      });
    }

    // validate role
    const validRoles = ["ADMIN", "EDITOR", "VIEWER"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select("-password");

    res.json({
      message: "User role updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};