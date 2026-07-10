import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import sessionRoutes from "./routes/sessions.js";
import { getDatabaseInfo } from "./db.js";
import { sessionStore } from "./sessionStore.js";
import { discogsCallbackUrl } from "./appUrl.js";
import { googleCallbackUrl, googleConfigured } from "./auth/google.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");
const serveClient = fs.existsSync(path.join(distDir, "index.html"));
const isProduction =
  process.env.NODE_ENV === "production" || Boolean(process.env.RAILWAY_ENVIRONMENT);

const app = express();
const PORT = process.env.PORT || 3001;

if (isProduction) {
  app.set("trust proxy", 1);
}

if (!isProduction) {
  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
  app.use(
    cors({
      origin: CLIENT_URL,
      credentials: true,
    })
  );
}
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction ? "auto" : false,
      sameSite: "lax",
      /* maxAge set on login when "Zapomni si me" is checked; otherwise session cookie */
    },
  })
);

app.get("/api/health", (req, res) => {
  const mockAuth =
    process.env.USE_MOCK_AUTH === "true" || !googleConfigured();
  const database = getDatabaseInfo();
  res.json({
    ok: true,
    database,
    mockAuth,
    googleOAuthEnabled: googleConfigured() && process.env.USE_MOCK_AUTH !== "true",
    googleCallbackUrl: googleConfigured() ? googleCallbackUrl() : null,
    googleConfigured: googleConfigured(),
    discogsConfigured: Boolean(
      process.env.DISCOGS_CONSUMER_KEY && process.env.DISCOGS_CONSUMER_SECRET
    ),
    discogsCallbackUrl: discogsCallbackUrl(req),
  });
});

app.use("/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);

if (serveClient) {
  app.use(express.static(distDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
      return next();
    }
    res.sendFile(path.join(distDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

const server = app.listen(PORT, () => {
  const database = getDatabaseInfo();
  console.log(`${isProduction ? "App" : "API"} http://localhost:${PORT}`);
  console.log(`Baza: ${database.path} (${database.userCount} računov)`);
  if (isProduction && !database.persistent) {
    console.warn(
      "OPOZORILO: DATA_DIR ni nastavljen — SQLite se ob vsakem redeployu na Railwayu pobriše. " +
        "Dodaj Volume (npr. /data) in nastavi DATA_DIR=/data."
    );
  }
  console.log(
    `Auth: lokalni računi${googleConfigured() ? " + Google OAuth" : ""}${process.env.USE_MOCK_AUTH === "true" ? " · Discogs demo" : ""}`
  );
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} je zaseden. Ustavi stari proces (npr. port 3001) in ponovno zaženi.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
