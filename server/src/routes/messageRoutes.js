import { Router } from "express";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/:userId", requireAuth, async (req, res) => {
  const otherId = req.params.userId;
  if (!mongoose.isValidObjectId(otherId)) return res.status(400).json({ message: "Invalid user ID." });
  const messages = await Message.find({
    $or: [
      { sender: req.user.id, receiver: otherId },
      { sender: otherId, receiver: req.user.id }
    ]
  })
    .sort({ createdAt: 1 })
    .populate("sender", "name email")
    .populate("receiver", "name email");
  res.json(messages);
});

export default router;
