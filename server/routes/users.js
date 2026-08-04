import { Router } from "express";
import { listPublicUsers } from "../db.js";

const router = Router();

// GET /api/users - lists all registered users with non-sensitive fields.
// Intended for debugging/admin inspection; never returns password_hash,
// discogs_token, or discogs_token_secret.
router.get("/", (req, res) => {
  const users = listPublicUsers();
  const format = req.query.format;

  if (format === "count") {
    return res.json({ count: users.length });
  }

  res.json({ count: users.length, users });
});

export default router;
