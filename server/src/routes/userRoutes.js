import { Router } from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user.id } }).select("name email").sort({ name: 1 });
  res.json(users.map((user) => ({ id: user.id, name: user.name, email: user.email })));
});

export default router;
