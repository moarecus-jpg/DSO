import Database from "better-sqlite3";
import { createHash, randomBytes, randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { formatOrderTitle } from "../shared/orderTitle.js";
import { hashPassword, verifyPassword } from "./auth/password.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDataDir() {
  const explicit = process.env.DATA_DIR?.trim();
  if (explicit) return explicit;

  const databasePath = process.env.DATABASE_PATH?.trim();
  if (databasePath) return path.dirname(databasePath);

  const railwayVolume = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (railwayVolume) return railwayVolume;

  return path.join(__dirname, "..", "data");
}

function isPersistentDataDir(dir) {
  if (process.env.DATA_DIR?.trim() || process.env.DATABASE_PATH?.trim()) {
    return true;
  }
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim()) {
    return true;
  }
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === "production") {
    return false;
  }
  return true;
}

const dataDir = resolveDataDir();
const dbPath =
  process.env.DATABASE_PATH?.trim() || path.join(dataDir, "app.db");
const persistentStorage = isPersistentDataDir(dataDir);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

let db;
try {
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
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

  CREATE TABLE IF NOT EXISTS session_notes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
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
  "ALTER TABLE users ADD COLUMN hide_my_records INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE group_sessions ADD COLUMN target_date TEXT",
  "ALTER TABLE users ADD COLUMN notify_new_order INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE users ADD COLUMN notify_order_note INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE users ADD COLUMN notify_order_closed INTEGER NOT NULL DEFAULT 0",
]) {
  try {
    db.exec(sql);
  } catch {
    /* column already exists */
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

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

const SYNTHETIC_EMAIL_SUFFIX = "@users.iglarnica";

export function isDeliverableEmail(email) {
  const trimmed = email?.trim().toLowerCase() ?? "";
  if (!trimmed || !trimmed.includes("@")) return false;
  return !trimmed.endsWith(SYNTHETIC_EMAIL_SUFFIX);
}

function hashResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email) {
  const trimmed = email?.trim().toLowerCase() ?? "";
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("Neveljaven e-poštni naslov.");
  }
  return trimmed;
}

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

export function findUserByEmail(email) {
  return db
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?)")
    .get(email.trim());
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

export function createLocalUser({ firstName, lastName, password, username: chosen, email: rawEmail }) {
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

  let email;
  if (!rawEmail?.trim()) {
    throw new Error("E-poštni naslov je obvezen.");
  }
  email = normalizeEmail(rawEmail);
  if (findUserByEmail(email)) {
    throw new Error("Ta e-poštni naslov je že v uporabi.");
  }

  const name = `${first} ${last}`;
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
         AND EXISTS (
           SELECT 1 FROM session_links sl
           WHERE sl.session_id = sm.session_id AND sl.user_id = sm.user_id
         )
       ORDER BY sm.joined_at ASC`
    )
    .all(id);

  const links = db
    .prepare(
      `SELECT sl.*, ${EFFECTIVE_ORDERER_NAME_SQL} as user_name,
              ${MEMBER_DISPLAY_NAME_SQL} as member_name, u.discogs_username,
              u.hide_my_records as orderer_hide_records
       FROM session_links sl
       JOIN users u ON u.id = sl.user_id
       LEFT JOIN session_members sm
         ON sm.session_id = sl.session_id AND sm.user_id = sl.user_id
       WHERE sl.session_id = ?
       ORDER BY sl.created_at DESC`
    )
    .all(id);

  const notes = listSessionNotes(id);

  return withOrderTitle({ ...session, members, links, notes });
}

export function listSessionNotes(sessionId) {
  return db
    .prepare(
      `SELECT sn.id, sn.session_id, sn.user_id, sn.body, sn.created_at,
              ${MEMBER_DISPLAY_NAME_SQL} as user_name
       FROM session_notes sn
       JOIN users u ON u.id = sn.user_id
       LEFT JOIN session_members sm
         ON sm.session_id = sn.session_id AND sm.user_id = sn.user_id
       WHERE sn.session_id = ?
       ORDER BY sn.created_at ASC`
    )
    .all(sessionId);
}

export function isSessionMember(sessionId, userId) {
  return Boolean(
    db
      .prepare(
        "SELECT 1 FROM session_members WHERE session_id = ? AND user_id = ?"
      )
      .get(sessionId, userId)
  );
}

export function addSessionNote(sessionId, userId, body) {
  const id = randomUUID();
  db.prepare(
    "INSERT INTO session_notes (id, session_id, user_id, body) VALUES (?, ?, ?, ?)"
  ).run(id, sessionId, userId, body);
  return db
    .prepare(
      `SELECT sn.id, sn.session_id, sn.user_id, sn.body, sn.created_at,
              ${MEMBER_DISPLAY_NAME_SQL} as user_name
       FROM session_notes sn
       JOIN users u ON u.id = sn.user_id
       LEFT JOIN session_members sm
         ON sm.session_id = sn.session_id AND sm.user_id = sn.user_id
       WHERE sn.id = ?`
    )
    .get(id);
}

export function listGroupSessions(status = "open") {
  return db
    .prepare(
      `SELECT gs.*, u.name as creator_name, u.username as creator_username,
        (SELECT COUNT(DISTINCT user_id) FROM session_links WHERE session_id = gs.id) as member_count,
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
        (SELECT COUNT(DISTINCT user_id) FROM session_links WHERE session_id = gs.id) as member_count,
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

function parseTargetDate(value) {
  if (value == null || value === "") return null;
  const trimmed = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Neveljaven ciljni datum.");
  }
  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Neveljaven ciljni datum.");
  }
  return trimmed;
}

export function updateSessionTargetDate(id, targetDate) {
  const existing = db
    .prepare("SELECT id FROM group_sessions WHERE id = ?")
    .get(id);
  if (!existing) return null;

  const value = parseTargetDate(targetDate);
  db.prepare("UPDATE group_sessions SET target_date = ? WHERE id = ?").run(
    value,
    id
  );
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
    db.prepare("DELETE FROM session_notes WHERE session_id = ?").run(id);
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

function ensureSessionMember(sessionId, userId) {
  db.prepare(
    "INSERT OR IGNORE INTO session_members (session_id, user_id) VALUES (?, ?)"
  ).run(sessionId, userId);
}

function removeSessionMemberIfNoLinks(sessionId, userId) {
  const remaining = db
    .prepare(
      "SELECT 1 FROM session_links WHERE session_id = ? AND user_id = ? LIMIT 1"
    )
    .get(sessionId, userId);
  if (!remaining) {
    db.prepare(
      "DELETE FROM session_members WHERE session_id = ? AND user_id = ?"
    ).run(sessionId, userId);
  }
}

export function findDuplicateSessionLink(sessionId, userId, { listingId, url }) {
  if (listingId != null) {
    return db
      .prepare(
        `SELECT id FROM session_links
         WHERE session_id = ? AND user_id = ? AND listing_id = ?`
      )
      .get(sessionId, userId, listingId);
  }

  const normalized = url?.trim().toLowerCase();
  if (!normalized) return null;

  return db
    .prepare(
      `SELECT id FROM session_links
       WHERE session_id = ? AND user_id = ? AND lower(url) = ?`
    )
    .get(sessionId, userId, normalized);
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

  ensureSessionMember(sessionId, userId);

  return getSessionLinkById(id);
}

function getSessionLinkById(id) {
  const link = db.prepare("SELECT * FROM session_links WHERE id = ?").get(id);
  if (!link) return null;
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
    .get(link.session_id, id);
  return {
    ...link,
    user_name: row?.user_name ?? null,
    member_name: row?.member_name ?? null,
  };
}

export function removeSessionLink(sessionId, linkId) {
  const link = db
    .prepare(
      "SELECT id, user_id FROM session_links WHERE id = ? AND session_id = ?"
    )
    .get(linkId, sessionId);
  if (!link) return null;

  db.prepare("DELETE FROM session_links WHERE id = ? AND session_id = ?").run(
    linkId,
    sessionId
  );
  removeSessionMemberIfNoLinks(sessionId, link.user_id);
  return getGroupSession(sessionId);
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

export function updateHideMyRecords(userId, hideMyRecords) {
  db.prepare("UPDATE users SET hide_my_records = ? WHERE id = ?").run(
    hideMyRecords ? 1 : 0,
    userId
  );
  return findUserById(userId);
}

export function updateUserEmail(userId, email) {
  const normalized = normalizeEmail(email);
  if (!isDeliverableEmail(normalized)) {
    throw new Error("Vnesi veljaven e-poštni naslov.");
  }
  const existing = findUserByEmail(normalized);
  if (existing && existing.id !== userId) {
    throw new Error("Ta e-poštni naslov je že v uporabi.");
  }
  db.prepare("UPDATE users SET email = ? WHERE id = ?").run(normalized, userId);
  return findUserById(userId);
}

export function updateNotificationPrefs(userId, prefs) {
  const fields = [];
  const values = [];

  if (typeof prefs.notifyNewOrder === "boolean") {
    fields.push("notify_new_order = ?");
    values.push(prefs.notifyNewOrder ? 1 : 0);
  }
  if (typeof prefs.notifyOrderNote === "boolean") {
    fields.push("notify_order_note = ?");
    values.push(prefs.notifyOrderNote ? 1 : 0);
  }
  if (typeof prefs.notifyOrderClosed === "boolean") {
    fields.push("notify_order_closed = ?");
    values.push(prefs.notifyOrderClosed ? 1 : 0);
  }

  if (!fields.length) return findUserById(userId);

  values.push(userId);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return findUserById(userId);
}

export function createPasswordResetToken(userId) {
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(userId);

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(id, userId, tokenHash, expiresAt);

  return token;
}

export function consumePasswordResetToken(token, newPassword) {
  if (!token?.trim() || !newPassword || newPassword.length < 6) {
    throw new Error("Neveljavna zahteva za ponastavitev gesla.");
  }

  const tokenHash = hashResetToken(token.trim());
  const row = db
    .prepare(
      `SELECT prt.*, u.password_hash IS NOT NULL AS has_password
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = ?`
    )
    .get(tokenHash);

  if (!row) {
    throw new Error("Povezava za ponastavitev gesla je neveljavna ali je potekla.");
  }
  if (new Date(row.expires_at) < new Date()) {
    db.prepare("DELETE FROM password_reset_tokens WHERE id = ?").run(row.id);
    throw new Error("Povezava za ponastavitev gesla je potekla. Zahtevaj novo.");
  }
  if (!row.has_password) {
    throw new Error("Ta račun nima gesla. Prijavi se z Google.");
  }

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    hashPassword(newPassword),
    row.user_id
  );
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(row.user_id);

  return findUserById(row.user_id);
}

export function listUsersForAdmin() {
  return db
    .prepare(
      `SELECT id, username, name, email, created_at,
              password_hash IS NOT NULL AS has_password,
              google_id IS NOT NULL AS has_google,
              discogs_username
       FROM users
       ORDER BY datetime(created_at) DESC, name ASC`
    )
    .all()
    .map((row) => ({
      id: row.id,
      username: row.username ?? null,
      name: row.name ?? null,
      email: row.email,
      hasRealEmail: isDeliverableEmail(row.email),
      authType: row.has_google ? "google" : row.has_password ? "local" : "unknown",
      createdAt: row.created_at,
      discogsUsername: row.discogs_username ?? null,
    }));
}

export function adminSetUserPassword(userId, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Geslo mora imeti vsaj 6 znakov.");
  }

  const user = findUserById(userId);
  if (!user) {
    throw new Error("Uporabnik ni bil najden.");
  }
  if (user.google_id && !user.password_hash) {
    throw new Error("Ta račun uporablja Google prijavo in nima gesla.");
  }

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    hashPassword(newPassword),
    userId
  );
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(userId);
  return findUserById(userId);
}

export function changeUserPassword(userId, currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Geslo mora imeti vsaj 6 znakov.");
  }

  const user = findUserById(userId);
  if (!user?.password_hash) {
    throw new Error("Ta račun nima gesla. Prijavi se z Google.");
  }
  if (!currentPassword || !verifyPassword(currentPassword, user.password_hash)) {
    throw new Error("Trenutno geslo ni pravilno.");
  }

  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    hashPassword(newPassword),
    userId
  );
  db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(userId);
  return findUserById(userId);
}

function deliverableUserFilter(alias = "u") {
  return `lower(${alias}.email) NOT LIKE '%${SYNTHETIC_EMAIL_SUFFIX}'`;
}

export function listUsersForNewOrderNotifications(excludeUserId) {
  return db
    .prepare(
      `SELECT id, email, name, username FROM users
       WHERE notify_new_order = 1
         AND ${deliverableUserFilter()}
         AND id != ?`
    )
    .all(excludeUserId ?? "");
}

export function listSessionMembersForNotifications(sessionId, type, excludeUserId) {
  const column =
    type === "note"
      ? "notify_order_note"
      : type === "closed"
        ? "notify_order_closed"
        : null;
  if (!column) return [];

  return db
    .prepare(
      `SELECT u.id, u.email, u.name, u.username
       FROM session_members sm
       JOIN users u ON u.id = sm.user_id
       WHERE sm.session_id = ?
         AND u.${column} = 1
         AND ${deliverableUserFilter()}
         AND u.id != ?`
    )
    .all(sessionId, excludeUserId ?? "");
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
    hideMyRecords: Boolean(user.hide_my_records),
    hasRealEmail: isDeliverableEmail(user.email),
    hasPassword: Boolean(user.password_hash),
    notifyNewOrder: Boolean(user.notify_new_order),
    notifyOrderNote: Boolean(user.notify_order_note),
    notifyOrderClosed: Boolean(user.notify_order_closed),
  };
}

export function getDatabaseInfo() {
  return {
    path: dbPath,
    dataDir,
    persistent: persistentStorage,
    userCount: db.prepare("SELECT COUNT(*) AS c FROM users").get()?.c ?? 0,
    railwayVolumeMountPath: process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() || null,
    recommendedVolumeMount: "/app/data",
  };
}

export default db;
