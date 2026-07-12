import { findUserById } from "../db.js";
import { adminUsernames } from "./appAdmin.js";

/** Ustvarjalec naročila ali uporabnik iz ADMIN_USERNAMES (v .env). */
export function isOrderAdmin(session, userId) {
  if (!session || !userId) return false;
  if (session.created_by === userId) return true;

  const user = findUserById(userId);
  const username = user?.username?.toLowerCase();
  if (!username) return false;

  return adminUsernames().includes(username);
}

/** Odpravitelj naročila lahko odstrani katerikoli item; ostali samo svoje. */
export function canRemoveSessionLink(session, link, userId) {
  if (!session || !link || !userId) return false;
  if (session.created_by === userId) return true;
  return link.user_id === userId;
}

/** Samo ustvarjalec naročila (odpravitelj). */
export function isOrderCreator(session, userId) {
  if (!session || !userId) return false;
  return session.created_by === userId;
}
