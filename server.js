import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import storeOwnerRoutes from "./routes/storeOwnerRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "https://store-rating-frontend-zeta.vercel.app/",
  "http://localhost:5173",
];

// ✅ Apply CORS before anything else
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Allow non-browser tools like Postman
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.log("Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ Handle all preflight requests globally
app.options("*", cors());

// ✅ Middleware
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
