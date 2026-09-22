const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const aiRoutes = require("./routes/ai");

const app = express();

// --- CORS ---
// In production, set CLIENT_URL to your frontend origin (comma-separated for
// multiple). When it's not set (local dev) we allow all origins for convenience.
const clientUrls = (process.env.CLIENT_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors(
    clientUrls.length
      ? { origin: clientUrls }
      : {}
  )
);

app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/ai", aiRoutes);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB, then start the server only once the DB is ready.
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected ✅");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} 🚀`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
