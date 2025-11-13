import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/database.js";
import { authenticateToken, JWT_SECRET } from "../middleware/auth.js";

const router = express.Router();

// Universal Login (for all user types)
router.post("/login", async (req, res) => {
  try {
    console.log("Login attempt:", req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const userQuery = "SELECT * FROM users WHERE email = $1";
    const userResult = await pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

// Admin Login (legacy endpoint)
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const userQuery = "SELECT * FROM users WHERE email = $1 AND role = $2";
    const userResult = await pool.query(userQuery, [email, "system_admin"]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

// User Registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, address } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email and password are required" });
    }

    if (name.length < 20 || name.length > 60) {
      return res
        .status(400)
        .json({ error: "Name must be between 20-60 characters" });
    }

    if (password.length < 8 || password.length > 16) {
      return res
        .status(400)
        .json({ error: "Password must be between 8-16 characters" });
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return res
        .status(400)
        .json({ error: "Password must contain at least one uppercase letter" });
    }

    if (!/(?=.*[!@#$%^&*])/.test(password)) {
      return res.status(400).json({
        error: "Password must contain at least one special character",
      });
    }

    if (address && address.length > 400) {
      return res
        .status(400)
        .json({ error: "Address must be maximum 400 characters" });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const insertQuery = `
      INSERT INTO users (name, email, password, address, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, address, role, created_at
    `;
    const result = await pool.query(insertQuery, [
      name,
      email,
      hashedPassword,
      address || null,
      "normal_user",
    ]);

    res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update Password
router.put("/user/password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Both current and new passwords are required" });
    }

    // Validate new password
    if (newPassword.length < 8 || newPassword.length > 16) {
      return res
        .status(400)
        .json({ error: "Password must be between 8-16 characters" });
    }

    if (!/(?=.*[A-Z])/.test(newPassword)) {
      return res
        .status(400)
        .json({ error: "Password must contain at least one uppercase letter" });
    }

    if (!/(?=.*[!@#$%^&*])/.test(newPassword)) {
      return res.status(400).json({
        error: "Password must contain at least one special character",
      });
    }

    // Get current user
    const userQuery = "SELECT * FROM users WHERE id = $1";
    const userResult = await pool.query(userQuery, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updateQuery =
      "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2";
    await pool.query(updateQuery, [hashedNewPassword, req.user.id]);

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
