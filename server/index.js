import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import authRoutes from "./routes/auth.js";
import sessionRoutes from "./routes/sessions.js";
import { googleCallbackUrl, googleConfigured } from "./auth/google.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      /* maxAge set on login when "Zapomni si me" is checked; otherwise session cookie */
    },
  })
);

app.get("/api/health", (_req, res) => {
  const mockAuth =
    process.env.USE_MOCK_AUTH === "true" || !googleConfigured();
  res.json({
    ok: true,
    mockAuth,
    googleOAuthEnabled: googleConfigured() && process.env.USE_MOCK_AUTH !== "true",
    googleCallbackUrl: googleConfigured() ? googleCallbackUrl() : null,
    googleConfigured: googleConfigured(),
    discogsConfigured: Boolean(
      process.env.DISCOGS_CONSUMER_KEY && process.env.DISCOGS_CONSUMER_SECRET
    ),
    discogsCallbackUrl:
      process.env.DISCOGS_CONSUMER_KEY && process.env.DISCOGS_CONSUMER_SECRET
        ? (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "") +
          "/auth/discogs/callback"
        : null,
  });
});

app.use("/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);

const server = app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
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
