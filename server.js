import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import storeOwnerRoutes from "./routes/storeOwnerRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Use official CORS middleware
app.use(
  cors({
    origin: [
      "https://store-rating-frontend-zeta.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ Explicitly handle preflight requests
app.options("*", cors());

app.use(express.json());

// ✅ Routes
app.use("/api", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", userRoutes);
app.use("/api/store-owner", storeOwnerRoutes);

app.get("/", (req, res) => {
  res.send("Store Rating backend is running successfully!");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
