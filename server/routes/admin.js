import { Router } from "express";
import {
  adminSetUserPassword,
  findUserById,
  listUsersForAdmin,
  updateUserEmail,
} from "../db.js";
import { isAppAdmin } from "../auth/appAdmin.js";

const router = Router();

function requireAppAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Prijavi se v aplikacijo." });
  }
  if (!isAppAdmin(req.session.userId)) {
    return res.status(403).json({ error: "Samo admin lahko dostopa do te strani." });
  }
  next();
}

router.use(requireAppAdmin);

router.get("/users", (req, res) => {
  res.json({ users: listUsersForAdmin() });
});

router.patch("/users/:id/email", (req, res) => {
  const userId = req.params.id;
  const raw = req.body?.email;
  if (typeof raw !== "string" || !raw.trim()) {
    return res.status(400).json({ error: "E-poštni naslov je obvezen." });
  }

  if (!findUserById(userId)) {
    return res.status(404).json({ error: "Uporabnik ni bil najden." });
  }

  try {
    const user = updateUserEmail(userId, raw);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        hasRealEmail: true,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "E-pošte ni bilo mogoče shraniti." });
  }
});

router.post("/users/:id/reset-password", (req, res) => {
  const userId = req.params.id;
  const { password, passwordConfirm } = req.body ?? {};

  if (password !== passwordConfirm) {
    return res.status(400).json({ error: "Gesli se ne ujemata." });
  }

  try {
    adminSetUserPassword(userId, password);
    res.json({ ok: true });
  } catch (err) {
    const msg = err.message ?? "Gesla ni bilo mogoče ponastaviti.";
    const status = msg.includes("ni bil najden") ? 404 : 400;
    res.status(status).json({ error: msg });
  }
});

export default router;
