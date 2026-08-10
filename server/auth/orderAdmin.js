import { findUserById } from "../db.js";
import { userMatchesAdminList } from "./appAdmin.js";

/** Ustvarjalec naročila ali app admin (npr. eraom). */
export function isOrderAdmin(session, userId) {
  if (!session || !userId) return false;
  if (session.created_by === userId) return true;

  const user = findUserById(userId);
  return userMatchesAdminList(user);
}

/** Odpravitelj, app admin ali lastnik itema. */
export function canRemoveSessionLink(session, link, userId) {
  if (!session || !link || !userId) return false;
  if (isOrderAdmin(session, userId)) return true;
  return link.user_id === userId;
}

/** Samo ustvarjalec naročila (odpravitelj). */
export function isOrderCreator(session, userId) {
  if (!session || !userId) return false;
  return session.created_by === userId;
}
