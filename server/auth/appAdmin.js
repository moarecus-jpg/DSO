import { findUserById } from "../db.js";

const DEFAULT_ADMIN_USERNAMES = ["eraom"];

export function adminUsernames() {
  const fromEnv = (process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ADMIN_USERNAMES, ...fromEnv])];
}

function userAdminNames(user) {
  return [user?.username, user?.discogs_username]
    .filter(Boolean)
    .map((name) => name.trim().toLowerCase());
}

export function userMatchesAdminList(user) {
  if (!user) return false;
  const admins = adminUsernames();
  return userAdminNames(user).some((name) => admins.includes(name));
}

export function isAppAdmin(userId) {
  if (!userId) return false;
  return userMatchesAdminList(findUserById(userId));
}
