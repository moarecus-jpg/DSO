import session from "express-session";
import createSqliteStore from "better-sqlite3-session-store";
import db from "./db.js";

const SqliteStore = createSqliteStore(session);

export const sessionStore = new SqliteStore({
  client: db,
  expired: {
    clear: true,
    intervalMs: 60 * 60 * 1000,
  },
});
