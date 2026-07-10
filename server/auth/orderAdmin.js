import { findUserById } from "../db.js";

function adminUsernames() {
  return (process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Ustvarjalec naročila ali uporabnik iz ADMIN_USERNAMES (v .env). */
export function isOrderAdmin(session, userId) {
  if (!session || !userId) return false;
  if (session.created_by === userId) return true;

  const user = findUserById(userId);
  const username = user?.username?.toLowerCase();
  if (!username) return false;

  return adminUsernames().includes(username);
}
