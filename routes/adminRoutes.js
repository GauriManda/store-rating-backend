import express from "express";
import bcrypt from "bcrypt";
import pool from "../config/database.js";
import { verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// Admin Dashboard
router.get("/dashboard", verifyAdmin, async (req, res) => {
  try {
    const usersQuery = "SELECT COUNT(*) as count FROM users";
    const usersResult = await pool.query(usersQuery);

    const storesQuery = "SELECT COUNT(*) as count FROM stores";
    const storesResult = await pool.query(storesQuery);

    const ratingsQuery = "SELECT COUNT(*) as count FROM ratings";
    const ratingsResult = await pool.query(ratingsQuery);

    res.json({
      totalUsers: parseInt(usersResult.rows[0].count),
      totalStores: parseInt(storesResult.rows[0].count),
      totalRatings: parseInt(ratingsResult.rows[0].count),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin Add Store with Store Owner
router.post("/stores", verifyAdmin, async (req, res) => {
  try {
    const { name, email, address, ownerName, ownerPassword } = req.body;

    // Validation
    if (!name || !email || !address || !ownerName || !ownerPassword) {
      return res.status(400).json({
        error:
          "Store name, email, address, owner name, and owner password are required",
      });
    }

    // Validate owner name (20-60 characters)
    if (ownerName.length < 20 || ownerName.length > 60) {
      return res.status(400).json({
        error: "Owner name must be between 20-60 characters",
      });
    }

    // Validate password
    if (ownerPassword.length < 8 || ownerPassword.length > 16) {
      return res.status(400).json({
        error: "Password must be between 8-16 characters",
      });
    }

    if (!/(?=.*[A-Z])/.test(ownerPassword)) {
      return res.status(400).json({
        error: "Password must contain at least one uppercase letter",
      });
    }

    if (!/(?=.*[!@#$%^&*])/.test(ownerPassword)) {
      return res.status(400).json({
        error: "Password must contain at least one special character",
      });
    }

    // Check if store email already exists
    const existingStore = await pool.query(
      "SELECT id FROM stores WHERE email = $1",
      [email]
    );
    if (existingStore.rows.length > 0) {
      return res.status(400).json({ error: "Store email already exists" });
    }

    // Check if owner email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Owner email already exists" });
    }

    // Start transaction
    await pool.query("BEGIN");

    try {
      // Hash the owner password
      const hashedPassword = await bcrypt.hash(ownerPassword, 10);

      // Create store owner user first
      const createUserQuery = `
        INSERT INTO users (name, email, password, address, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, email, address, role, created_at
      `;
      const userResult = await pool.query(createUserQuery, [
        ownerName,
        email,
        hashedPassword,
        address || null,
        "store_owner",
      ]);

      const ownerId = userResult.rows[0].id;

      // Create store with owner_id reference
      const createStoreQuery = `
        INSERT INTO stores (name, email, address, owner_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const storeResult = await pool.query(createStoreQuery, [
        name,
        email,
        address,
        ownerId,
      ]);

      // Commit transaction
      await pool.query("COMMIT");

      res.json({
        store: storeResult.rows[0],
        owner: {
          id: userResult.rows[0].id,
          name: userResult.rows[0].name,
          email: userResult.rows[0].email,
          role: userResult.rows[0].role,
        },
      });
    } catch (error) {
      // Rollback transaction on error
      await pool.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Add store error:", error);
    if (error.code === "23505") {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res
        .status(500)
        .json({ error: "Internal server error: " + error.message });
    }
  }
});

// Admin Add User
router.post("/users", verifyAdmin, async (req, res) => {
  try {
    const { name, email, password, address, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertQuery = `
      INSERT INTO users (name, email, password, address, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, address, role, created_at
    `;
    const result = await pool.query(insertQuery, [
      name,
      email,
      hashedPassword,
      address,
      role,
    ]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Add user error:", error);
    if (error.code === "23505") {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Admin Get All Stores
router.get("/stores", verifyAdmin, async (req, res) => {
  try {
    const storesQuery = `
      SELECT s.*, 
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(r.rating) as total_ratings,
             u.name as owner_name
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      LEFT JOIN users u ON s.owner_id = u.id
      GROUP BY s.id, s.name, s.email, s.address, s.created_at, s.owner_id, u.name
      ORDER BY s.name
    `;
    const result = await pool.query(storesQuery);

    const stores = result.rows.map((store) => ({
      ...store,
      average_rating: parseFloat(store.average_rating).toFixed(1),
      total_ratings: parseInt(store.total_ratings),
    }));

    res.json(stores);
  } catch (error) {
    console.error("Get stores error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin Get All Users
router.get("/users", verifyAdmin, async (req, res) => {
  try {
    const usersQuery = `
      SELECT u.id, u.name, u.email, u.address, u.role, u.created_at,
             CASE 
               WHEN u.role = 'store_owner' THEN (
                 SELECT COALESCE(AVG(r.rating), 0)
                 FROM stores s
                 LEFT JOIN ratings r ON s.id = r.store_id
                 WHERE s.owner_id = u.id
               )
               ELSE NULL
             END as store_rating
      FROM users u
      ORDER BY u.name
    `;
    const result = await pool.query(usersQuery);

    const users = result.rows.map((user) => ({
      ...user,
      store_rating: user.store_rating
        ? parseFloat(user.store_rating).toFixed(1)
        : null,
    }));

    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
