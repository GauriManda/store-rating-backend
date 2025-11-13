import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import storeOwnerRoutes from "./routes/storeOwnerRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "https://store-rating-frontend-zeta.vercel.app",
  "http://localhost:5173",
];

// ✅ CORS middleware (must be at the top)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // ✅ Handle preflight requests immediately
  if (req.method === "OPTIONS") {
    res.status(204).end(); // 204 = No Content (prevents loops)
    return;
  }

  next();
});

// ✅ Parse JSON bodies
app.use(express.json());

// ✅ Routes
app.use("/api", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", userRoutes);
app.use("/api/store-owner", storeOwnerRoutes);

// ✅ Root route
app.get("/", (req, res) => {
  res.send("Store Rating backend is running successfully!");
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
