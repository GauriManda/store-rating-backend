import jwt from "jsonwebtoken";

// JWT secret
export const JWT_SECRET =
  "235ae705125c391f5980002ba6d52dc215ab856af300506ac9e4279fce5ea3520c9afbad3d46044326a948f2ea813d1d96ca30a6f87c9c1e5dce040312b7a346";

// Middleware to verify JWT token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

// Role-based middleware
export const verifyAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.role === "system_admin") {
      next();
    } else {
      return res
        .status(403)
        .json({ error: "Access denied. Admin role required." });
    }
  });
};

export const verifyUser = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.role === "normal_user" || req.user.role === "system_admin") {
      next();
    } else {
      return res
        .status(403)
        .json({ error: "Access denied. User role required." });
    }
  });
};

export const verifyStoreOwner = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.role === "store_owner" || req.user.role === "system_admin") {
      next();
    } else {
      return res
        .status(403)
        .json({ error: "Access denied. Store owner role required." });
    }
  });
};
