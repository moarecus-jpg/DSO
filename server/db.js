import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { formatOrderTitle } from "../shared/orderTitle.js";
import { hashPassword, verifyPassword } from "./auth/password.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir =
  process.env.DATA_DIR?.trim() || path.join(__dirname, "..", "data");
const dbPath =
  process.env.DATABASE_PATH?.trim() || path.join(dataDir, "app.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

let db;
try {
  db = new Database(dbPath);
} catch (err) {
  if (err?.code === "ERR_DLOPEN_FAILED") {
    console.error(
      "\nSQLite (better-sqlite3) ni združljiv s to različico Node.js (" +
        process.version +
        ").\n" +
        "Uporabi Node 22 LTS (glej .nvmrc), nato v mapi projekta:\n" +
        "  npm rebuild better-sqlite3\n" +
        "  npm run dev\n"
    );
  }
  throw err;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_id TEXT UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    picture TEXT,
    discogs_username TEXT,
    discogs_token TEXT,
    discogs_token_secret TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS group_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    seller_username TEXT NOT NULL,
    created_by TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS session_members (
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (session_id, user_id),
    FOREIGN KEY (session_id) REFERENCES group_sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS session_links (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    release_id INTEGER,
    listing_id INTEGER,
    label TEXT,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES group_sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

try {
  db.exec("ALTER TABLE group_sessions ADD COLUMN order_number INTEGER");
} catch {
  /* column already exists */
}

for (const sql of [
  "ALTER TABLE session_links ADD COLUMN artist TEXT",
  "ALTER TABLE session_links ADD COLUMN title TEXT",
  "ALTER TABLE session_links ADD COLUMN price_value REAL",
  "ALTER TABLE session_links ADD COLUMN price_currency TEXT",
  "ALTER TABLE session_links ADD COLUMN media_condition TEXT",
  "ALTER TABLE session_links ADD COLUMN sleeve_condition TEXT",
  "ALTER TABLE session_links ADD COLUMN item_description TEXT",
  "ALTER TABLE users ADD COLUMN username TEXT",
  "ALTER TABLE users ADD COLUMN password_hash TEXT",
  "ALTER TABLE users ADD COLUMN first_name TEXT",
  "ALTER TABLE users ADD COLUMN last_name TEXT",
  "ALTER TABLE group_sessions ADD COLUMN shipping_value REAL",
  "ALTER TABLE group_sessions ADD COLUMN shipping_currency TEXT",
  "ALTER TABLE group_sessions ADD COLUMN seller_avatar_url TEXT",
  "ALTER TABLE users ADD COLUMN discogs_avatar_url TEXT",
  "ALTER TABLE group_sessions ADD COLUMN shipping_split_count INTEGER",
  "ALTER TABLE session_members ADD COLUMN display_name TEXT",
  "ALTER TABLE session_links ADD COLUMN orderer_display_name TEXT",
]) {
  try {
    db.exec(sql);
  } catch {
    /* column already exists */
  }
}

const needsBackfill = db
  .prepare("SELECT 1 FROM group_sessions WHERE order_number IS NULL LIMIT 1")
  .get();
if (needsBackfill) {
  const rows = db
    .prepare(
      "SELECT id FROM group_sessions WHERE order_number IS NULL ORDER BY created_at ASC"
    )
    .all();
  let max =
    db.prepare("SELECT COALESCE(MAX(order_number), 0) AS m FROM group_sessions").get()
      ?.m ?? 0;
  const update = db.prepare(
    "UPDATE group_sessions SET order_number = ? WHERE id = ?"
  );
  for (const row of rows) {
    max += 1;
    update.run(max, row.id);
  }
}

function nextOrderNumber() {
  return (
    db.prepare("SELECT COALESCE(MAX(order_number), 0) + 1 AS n FROM group_sessions").get()
      ?.n ?? 1
  );
}

const MEMBER_DISPLAY_NAME_SQL =
  "COALESCE(NULLIF(TRIM(sm.display_name), ''), u.name)";

const EFFECTIVE_ORDERER_NAME_SQL = `COALESCE(NULLIF(TRIM(sl.orderer_display_name), ''), ${MEMBER_DISPLAY_NAME_SQL})`;

function withOrderTitle(session) {
  if (!session) return null;
  const orderNumber =
    session.order_number ??
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM group_sessions WHERE created_at <= ?"
      )
      .get(session.created_at)?.n ??
    1;
  return {
    ...session,
    title: formatOrderTitle(orderNumber, session.seller_username),
  };
}

export function findUserByGoogleId(googleId) {
  return db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId);
}

export function findUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

export function findUserByUsername(username) {
  return db
    .prepare("SELECT * FROM users WHERE lower(username) = lower(?)")
    .get(username.trim());
}

function slugName(value) {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "") || "user"
  );
}

function uniqueUsername(firstName, lastName) {
  const base = `${slugName(firstName)}.${slugName(lastName)}`.replace(/^\.|\.$/g, "") || "user";
  let candidate = base;
  let n = 1;
  while (findUserByUsername(candidate)) {
    candidate = `${base}${n}`;
    n += 1;
  }
  return candidate;
}

export function normalizeUsername(value) {
  const raw = value?.trim().toLowerCase() ?? "";
  if (!raw) return null;
  if (raw.length < 3 || raw.length > 32) {
    throw new Error("Uporabniško ime mora imeti 3–32 znakov.");
  }
  if (!/^[a-z0-9._-]+$/.test(raw)) {
    throw new Error(
      "Uporabniško ime sme vsebovati samo črke, številke, piko, podčrtaj ali vezaj."
    );
  }
  return raw;
}

export function createLocalUser({ firstName, lastName, password, username: chosen }) {
  const first = firstName?.trim();
  const last = lastName?.trim();
  if (!first || !last) {
    throw new Error("Ime in priimek sta obvezna.");
  }
  if (!password || password.length < 6) {
    throw new Error("Geslo mora imeti vsaj 6 znakov.");
  }

  let username;
  if (chosen?.trim()) {
    username = normalizeUsername(chosen);
    if (findUserByUsername(username)) {
      throw new Error("To uporabniško ime je že zasedeno.");
    }
  } else {
    username = uniqueUsername(first, last);
  }
  const name = `${first} ${last}`;
  const email = `${username}@users.iglarnica`;
  const id = randomUUID();

  db.prepare(
    `INSERT INTO users (
       id, google_id, email, name, picture, username, password_hash, first_name, last_name
     ) VALUES (?, NULL, ?, ?, NULL, ?, ?, ?, ?)`
  ).run(id, email, name, username, hashPassword(password), first, last);

  return findUserById(id);
}

export function verifyLocalUser(username, password) {
  const user = findUserByUsername(username);
  if (!user?.password_hash) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  return user;
}

export function upsertGoogleUser({ googleId, email, name, picture }) {
  const existing = findUserByGoogleId(googleId);
  if (existing) {
    db.prepare(
      "UPDATE users SET email = ?, name = ?, picture = ? WHERE id = ?"
    ).run(email, name, picture, existing.id);
    return findUserById(existing.id);
  }

  const id = randomUUID();
  db.prepare(
    "INSERT INTO users (id, google_id, email, name, picture) VALUES (?, ?, ?, ?, ?)"
  ).run(id, googleId, email, name, picture);
  return findUserById(id);
}

export function connectDiscogs(userId, { username, token, tokenSecret, avatarUrl = null }) {
  db.prepare(
    `UPDATE users SET discogs_username = ?, discogs_token = ?, discogs_token_secret = ?,
      discogs_avatar_url = ?
     WHERE id = ?`
  ).run(username, token, tokenSecret, avatarUrl, userId);
  return findUserById(userId);
}

export function updateDiscogsAvatar(userId, avatarUrl) {
  db.prepare("UPDATE users SET discogs_avatar_url = ? WHERE id = ?").run(avatarUrl, userId);
  return findUserById(userId);
}

export function disconnectDiscogs(userId) {
  db.prepare(
    `UPDATE users SET discogs_username = NULL, discogs_token = NULL, discogs_token_secret = NULL,
      discogs_avatar_url = NULL
     WHERE id = ?`
  ).run(userId);
  return findUserById(userId);
}

export function createGroupSession({
  sellerUsername,
  createdBy,
  sellerAvatarUrl = null,
}) {
  const id = randomUUID();
  const orderNumber = nextOrderNumber();
  const title = formatOrderTitle(orderNumber, sellerUsername);
  db.prepare(
    `INSERT INTO group_sessions (
       id, title, seller_username, created_by, order_number, seller_avatar_url
     ) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, title, sellerUsername, createdBy, orderNumber, sellerAvatarUrl);
  db.prepare(
    "INSERT INTO session_members (session_id, user_id) VALUES (?, ?)"
  ).run(id, createdBy);
  return getGroupSession(id);
}

export function getGroupSession(id) {
  const session = db
    .prepare("SELECT * FROM group_sessions WHERE id = ?")
    .get(id);
  if (!session) return null;

  const members = db
    .prepare(
      `SELECT u.id, u.name as account_name, ${MEMBER_DISPLAY_NAME_SQL} as name,
              sm.display_name, u.email, u.picture, u.discogs_username, sm.joined_at
       FROM session_members sm
       JOIN users u ON u.id = sm.user_id
       WHERE sm.session_id = ?
       ORDER BY sm.joined_at ASC`
    )
    .all(id);

  const links = db
    .prepare(
      `SELECT sl.*, ${EFFECTIVE_ORDERER_NAME_SQL} as user_name,
              ${MEMBER_DISPLAY_NAME_SQL} as member_name, u.discogs_username
       FROM session_links sl
       JOIN users u ON u.id = sl.user_id
       LEFT JOIN session_members sm
         ON sm.session_id = sl.session_id AND sm.user_id = sl.user_id
       WHERE sl.session_id = ?
       ORDER BY sl.created_at DESC`
    )
    .all(id);

  return withOrderTitle({ ...session, members, links });
}

export function listGroupSessions(status = "open") {
  return db
    .prepare(
      `SELECT gs.*, u.name as creator_name, u.username as creator_username,
        (SELECT COUNT(*) FROM session_members WHERE session_id = gs.id) as member_count,
        (SELECT COUNT(*) FROM session_links WHERE session_id = gs.id) as link_count
       FROM group_sessions gs
       JOIN users u ON u.id = gs.created_by
       WHERE gs.status = ?
       ORDER BY gs.created_at DESC`
    )
    .all(status)
    .map(withOrderTitle);
}

export function listAllGroupSessions() {
  return db
    .prepare(
      `SELECT gs.*, u.name as creator_name, u.username as creator_username,
        (SELECT COUNT(*) FROM session_members WHERE session_id = gs.id) as member_count,
        (SELECT COUNT(*) FROM session_links WHERE session_id = gs.id) as link_count
       FROM group_sessions gs
       JOIN users u ON u.id = gs.created_by
       ORDER BY gs.created_at DESC`
    )
    .all()
    .map(withOrderTitle);
}

export function updateSessionSellerAvatar(id, sellerAvatarUrl) {
  const existing = db
    .prepare("SELECT id FROM group_sessions WHERE id = ?")
    .get(id);
  if (!existing) return null;
  db.prepare("UPDATE group_sessions SET seller_avatar_url = ? WHERE id = ?").run(
    sellerAvatarUrl,
    id
  );
  return getGroupSession(id);
}

export function updateSessionShipping(
  id,
  shippingValue,
  shippingCurrency,
  shippingSplitCount
) {
  const existing = db
    .prepare("SELECT id FROM group_sessions WHERE id = ?")
    .get(id);
  if (!existing) return null;

  const value =
    shippingValue == null || shippingValue === ""
      ? null
      : Number(shippingValue);
  if (value != null && Number.isNaN(value)) {
    throw new Error("Neveljavna poštnina.");
  }

  let split = null;
  if (shippingSplitCount != null && shippingSplitCount !== "") {
    split = Math.floor(Number(shippingSplitCount));
    if (Number.isNaN(split) || split < 1) {
      throw new Error("Število oseb mora biti vsaj 1.");
    }
  }

  db.prepare(
    `UPDATE group_sessions
     SET shipping_value = ?, shipping_currency = ?, shipping_split_count = ?
     WHERE id = ?`
  ).run(value, shippingCurrency ?? null, split, id);

  return getGroupSession(id);
}

export function closeGroupSession(id) {
  const existing = db
    .prepare("SELECT id, status FROM group_sessions WHERE id = ?")
    .get(id);
  if (!existing) return null;
  if (existing.status === "closed") return getGroupSession(id);

  db.prepare("UPDATE group_sessions SET status = 'closed' WHERE id = ?").run(id);
  return getGroupSession(id);
}

export function deleteGroupSession(id) {
  const existing = db
    .prepare("SELECT id FROM group_sessions WHERE id = ?")
    .get(id);
  if (!existing) return false;

  const del = db.transaction(() => {
    db.prepare("DELETE FROM session_links WHERE session_id = ?").run(id);
    db.prepare("DELETE FROM session_members WHERE session_id = ?").run(id);
    db.prepare("DELETE FROM group_sessions WHERE id = ?").run(id);
  });
  del();
  return true;
}

export function joinSession(sessionId, userId) {
  db.prepare(
    "INSERT OR IGNORE INTO session_members (session_id, user_id) VALUES (?, ?)"
  ).run(sessionId, userId);
  return getGroupSession(sessionId);
}

export function addSessionLink({
  sessionId,
  userId,
  url,
  releaseId,
  listingId,
  label,
  note,
  artist,
  title,
  priceValue,
  priceCurrency,
  mediaCondition,
  sleeveCondition,
  itemDescription,
}) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO session_links (
       id, session_id, user_id, url, release_id, listing_id, label, note,
       artist, title, price_value, price_currency, media_condition, sleeve_condition,
       item_description
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    sessionId,
    userId,
    url,
    releaseId ?? null,
    listingId ?? null,
    label,
    note ?? null,
    artist ?? null,
    title ?? null,
    priceValue ?? null,
    priceCurrency ?? null,
    mediaCondition ?? null,
    sleeveCondition ?? null,
    itemDescription ?? null
  );

  const link = db.prepare("SELECT * FROM session_links WHERE id = ?").get(id);
  const row = db
    .prepare(
      `SELECT ${EFFECTIVE_ORDERER_NAME_SQL} as user_name,
              ${MEMBER_DISPLAY_NAME_SQL} as member_name
       FROM session_links sl
       JOIN users u ON u.id = sl.user_id
       LEFT JOIN session_members sm
         ON sm.session_id = sl.session_id AND sm.user_id = sl.user_id
       WHERE sl.session_id = ? AND sl.id = ?`
    )
    .get(sessionId, id);
  return {
    ...link,
    user_name: row?.user_name ?? null,
    member_name: row?.member_name ?? null,
  };
}

export function updateLinkOrdererDisplayName(sessionId, linkId, ordererDisplayName) {
  const trimmed = ordererDisplayName?.trim() ?? "";
  const value = trimmed === "" ? null : trimmed;
  const result = db
    .prepare(
      `UPDATE session_links SET orderer_display_name = ?
       WHERE id = ? AND session_id = ?`
    )
    .run(value, linkId, sessionId);
  if (result.changes === 0) return null;
  return getGroupSession(sessionId);
}

export function listUserOrderedItems(userId) {
  return db
    .prepare(
      `SELECT sl.*, gs.id as session_id, gs.seller_username, gs.status as session_status,
              gs.order_number, gs.created_at as session_created_at,
              ${EFFECTIVE_ORDERER_NAME_SQL} as user_name
       FROM session_links sl
       JOIN group_sessions gs ON gs.id = sl.session_id
       JOIN users u ON u.id = sl.user_id
       LEFT JOIN session_members sm
         ON sm.session_id = sl.session_id AND sm.user_id = sl.user_id
       WHERE sl.user_id = ?
       ORDER BY gs.created_at DESC, sl.created_at DESC`
    )
    .all(userId);
}

export function updateMemberDisplayName(sessionId, memberUserId, displayName) {
  const trimmed = displayName?.trim() ?? "";
  const value = trimmed === "" ? null : trimmed;
  const result = db
    .prepare(
      `UPDATE session_members SET display_name = ?
       WHERE session_id = ? AND user_id = ?`
    )
    .run(value, sessionId, memberUserId);
  if (result.changes === 0) return null;
  return getGroupSession(sessionId);
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username ?? null,
    firstName: user.first_name ?? null,
    lastName: user.last_name ?? null,
    picture: user.picture,
    discogsConnected: Boolean(user.discogs_token),
    discogsUsername: user.discogs_username ?? null,
    discogsAvatarUrl: user.discogs_avatar_url ?? null,
  };
}

export function getDatabaseInfo() {
  return {
    path: dbPath,
    dataDir,
    persistent: Boolean(process.env.DATA_DIR?.trim() || process.env.DATABASE_PATH?.trim()),
    userCount: db.prepare("SELECT COUNT(*) AS c FROM users").get()?.c ?? 0,
  };
}

export default db;
