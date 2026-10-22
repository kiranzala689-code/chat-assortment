
import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Server } from "socket.io";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { verifyToken } from "./middleware/auth.js";
import Message from "./models/Message.js";
import connectDB from "../config/db.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const jwt = verifyToken(token);
    socket.userId = jwt.id;
    next();
  } catch {
    next(new Error("Invalid authentication token"));
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.userId);

  socket.join(String(socket.userId));

  socket.on("send_message", async (payload, callback) => {
    try {
      const receiverId = String(payload?.receiverId || "");
      const text = String(payload?.text || "").trim();

      if (
        !mongoose.isValidObjectId(receiverId) ||
        !text ||
        text.length > 2000
      ) {
        return callback?.({
          error:
            "A valid recipient and message (1–2000 characters) are required.",
        });
      }

      const message = await Message.create({
        sender: socket.userId,
        receiver: receiverId,
        text,
      });

      const populated = await message.populate([
        { path: "sender", select: "name email" },
        { path: "receiver", select: "name email" },
      ]);

      const messageData = populated.toObject();

      io.to(String(socket.userId)).emit("new_message", messageData);
      io.to(receiverId).emit("new_message", messageData);

      callback?.({ message: messageData });
    } catch (error) {
      console.error("Send message error:", error.message);

      callback?.({
        error: "Could not send message. Please try again.",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.userId);
  });
});

const port = process.env.PORT || 9900;

connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log("MongoDB Atlas Connected Successfully");
      console.log(`Chat server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
