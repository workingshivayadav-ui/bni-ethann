import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

import connectDB from "./config/mongodb.js";
import { connectCloudinary, isCloudinaryConfigured } from "./config/cloudinary.js";
import membersRouter from "./routes/members.js";

// Resolve current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (local dev files + Railway/Vercel injected env)
dotenv.config({ path: path.join(__dirname, "config", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ extended: true, limit: "60mb" }));

// Initialize Services
await connectDB();
connectCloudinary();

// Health Check
app.get("/_health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    mongo: {
      connected: mongoose.connection.readyState === 1,
      database: mongoose.connection.db?.databaseName ?? null,
    },
    cloudinary: {
      configured: isCloudinaryConfigured(),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    },
    attachmentField: "firstname_lastname_attachments",
  });
});

// Routes
app.use("/api/members", membersRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend listening on http://${HOST}:${PORT}`);
});