import express from "express";
import pool from "../config/database.js";
import { verifyUser } from "../middleware/auth.js";

const router = express.Router();

// Get All Stores (for normal users)
router.get("/stores", verifyUser, async (req, res) => {
  try {
    const { search } = req.query;

    let storesQuery = `
      SELECT s.id, s.name, s.email, s.address,
             COALESCE(AVG(r.rating), 0) as average_rating,
             COUNT(r.rating) as total_ratings,
             ur.rating as user_rating
      FROM stores s
      LEFT JOIN ratings r ON s.id = r.store_id
      LEFT JOIN ratings ur ON s.id = ur.store_id AND ur.user_id = $1
    `;

    const queryParams = [req.user.id];

    if (search) {
      storesQuery += ` WHERE s.name ILIKE $2 OR s.address ILIKE $2`;
      queryParams.push(`%${search}%`);
    }

    storesQuery += ` GROUP BY s.id, s.name, s.email, s.address, ur.rating ORDER BY s.name`;

    const result = await pool.query(storesQuery, queryParams);

    const stores = result.rows.map((store) => ({
      ...store,
      average_rating: parseFloat(store.average_rating).toFixed(1),
      total_ratings: parseInt(store.total_ratings),
      user_rating: store.user_rating || null,
    }));

    res.json(stores);
  } catch (error) {
    console.error("Get stores error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit Rating
router.post("/ratings", verifyUser, async (req, res) => {
  try {
    const { store_id, rating } = req.body;

    if (!store_id || !rating) {
      return res
        .status(400)
        .json({ error: "Store ID and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Check if store exists
    const storeCheck = await pool.query("SELECT id FROM stores WHERE id = $1", [
      store_id,
    ]);
    if (storeCheck.rows.length === 0) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Insert or update rating
    const upsertQuery = `
      INSERT INTO ratings (user_id, store_id, rating, created_at, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, store_id)
      DO UPDATE SET rating = $3, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(upsertQuery, [
      req.user.id,
      store_id,
      rating,
    ]);
    res.json({
      message: "Rating submitted successfully",
      rating: result.rows[0],
    });
  } catch (error) {
    console.error("Submit rating error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
