import express from "express";
import pool from "../config/database.js";
import { verifyStoreOwner } from "../middleware/auth.js";

const router = express.Router();

// Store Owner Dashboard
router.get("/dashboard", verifyStoreOwner, async (req, res) => {
  try {
    // Get store owned by this user
    const storeQuery = "SELECT * FROM stores WHERE owner_id = $1";
    const storeResult = await pool.query(storeQuery, [req.user.id]);

    if (storeResult.rows.length === 0) {
      return res.status(404).json({
        error: "No store found for this owner. Please contact administrator.",
      });
    }

    const store = storeResult.rows[0];

    // Get ratings for this store
    const ratingsQuery = `
      SELECT r.rating, r.created_at, u.name as user_name, u.email as user_email
      FROM ratings r
      JOIN users u ON r.user_id = u.id
      WHERE r.store_id = $1
      ORDER BY r.created_at DESC
    `;
    const ratingsResult = await pool.query(ratingsQuery, [store.id]);

    // Calculate average rating
    const avgRatingQuery =
      "SELECT AVG(rating) as avg_rating FROM ratings WHERE store_id = $1";
    const avgResult = await pool.query(avgRatingQuery, [store.id]);

    res.json({
      store: store,
      average_rating: avgResult.rows[0].avg_rating
        ? parseFloat(avgResult.rows[0].avg_rating).toFixed(1)
        : "0.0",
      ratings: ratingsResult.rows,
      total_ratings: ratingsResult.rows.length,
    });
  } catch (error) {
    console.error("Store owner dashboard error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
