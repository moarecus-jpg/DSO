import { findUserById } from "../db.js";

export function adminUsernames() {
  return (process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAppAdmin(userId) {
  if (!userId) return false;
  const user = findUserById(userId);
  const username = user?.username?.toLowerCase();
  if (!username) return false;
  return adminUsernames().includes(username);
}
