import { Router } from "express";
import {
  connectDiscogs,
  createLocalUser,
  disconnectDiscogs,
  findUserById,
  publicUser,
  updateDiscogsAvatar,
  upsertGoogleUser,
  verifyLocalUser,
} from "../db.js";
import {
  exchangeGoogleCode,
  getGoogleAuthUrl,
  googleCallbackUrl,
  googleConfigured,
} from "../auth/google.js";
import {
  discogsCallbackUrl,
  discogsOAuthConfigured,
  getDiscogsAccessToken,
  getDiscogsAuthUrl,
} from "../discogs/oauth.js";
import { getDiscogsUserProfile, getIdentity } from "../discogs/client.js";
import { discogsAppConfigured } from "../discogs/auth.js";
import { MOCK_USER } from "../mock.js";
import { applySessionPersistence } from "../auth/sessionCookie.js";

const router = Router();

function useMockAuth() {
  return process.env.USE_MOCK_AUTH === "true" || !googleConfigured();
}

function clientUrl(req) {
  return process.env.CLIENT_URL || "http://localhost:5173";
}

async function ensureUserDiscogsAvatar(user) {
  if (!user?.discogs_username || user.discogs_avatar_url || !discogsAppConfigured()) {
    return user;
  }
  try {
    const url = await getDiscogsUserProfile(user.discogs_username);
    if (url) return updateDiscogsAvatar(user.id, url);
  } catch (err) {
    console.warn("User Discogs avatar:", user.discogs_username, err.message);
  }
  return user;
}

router.get("/me", async (req, res) => {
  if (!req.session.userId) {
    return res.json({ user: null });
  }
  let user = findUserById(req.session.userId);
  if (!user && useMockAuth()) {
    return res.json({ user: publicUser(MOCK_USER) });
  }
  user = await ensureUserDiscogsAvatar(user);
  res.json({ user: publicUser(user) });
});

router.get("/google", (req, res) => {
  if (useMockAuth()) {
    const user = upsertGoogleUser({
      googleId: MOCK_USER.google_id,
      email: MOCK_USER.email,
      name: MOCK_USER.name,
      picture: null,
    });
    req.session.mockUserId = MOCK_USER.id;
    req.session.userId = user.id;
    return res.redirect(`${clientUrl(req)}/`);
  }

  if (!googleConfigured()) {
    return res.status(503).json({ error: "Google OAuth not configured" });
  }

  const redirectUri = googleCallbackUrl();
  const state = Math.random().toString(36).slice(2);
  req.session.oauthState = state;
  res.redirect(getGoogleAuthUrl(redirectUri, state));
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${clientUrl(req)}/login?error=google`);
    }
    if (state && req.session.oauthState && state !== req.session.oauthState) {
      return res.redirect(`${clientUrl(req)}/login?error=google`);
    }
    const redirectUri = googleCallbackUrl();
    const profile = await exchangeGoogleCode(code, redirectUri);
    const user = upsertGoogleUser(profile);
    req.session.userId = user.id;
    applySessionPersistence(req, true);
    res.redirect(`${clientUrl(req)}/`);
  } catch (err) {
    console.error(err);
    res.redirect(`${clientUrl(req)}/login?error=google`);
  }
});

router.post("/register", (req, res) => {
  try {
    const { firstName, lastName, password, passwordConfirm, username } = req.body ?? {};
    if (password !== passwordConfirm) {
      return res.status(400).json({ error: "Gesli se ne ujemata." });
    }
    const user = createLocalUser({ firstName, lastName, password, username });
    req.session.userId = user.id;
    applySessionPersistence(req, Boolean(req.body?.rememberMe));
    res.status(201).json({
      user: publicUser(user),
      username: user.username,
    });
  } catch (err) {
    const msg = err.message ?? "Registracija ni uspela.";
    const status =
      msg.includes("obvezna") ||
      msg.includes("Geslo") ||
      msg.includes("Uporabniško") ||
      msg.includes("zasedeno")
        ? 400
        : 500;
    res.status(status).json({ error: msg });
  }
});

router.post("/login", (req, res) => {
  const { username, password, rememberMe } = req.body ?? {};
  if (!username?.trim() || !password) {
    return res.status(400).json({ error: "Vnesi uporabniško ime in geslo." });
  }
  const user = verifyLocalUser(username.trim(), password);
  if (!user) {
    return res.status(401).json({ error: "Napačno uporabniško ime ali geslo." });
  }
  req.session.userId = user.id;
  applySessionPersistence(req, Boolean(rememberMe));
  res.json({ user: publicUser(user) });
});

router.post("/mock-login", (req, res) => {
  if (!useMockAuth()) {
    return res.status(403).json({ error: "Mock login disabled" });
  }
  const user = upsertGoogleUser({
    googleId: MOCK_USER.google_id,
    email: MOCK_USER.email,
    name: MOCK_USER.name,
    picture: null,
  });
  connectDiscogs(user.id, {
    username: MOCK_USER.discogs_username,
    token: "mock",
    tokenSecret: "mock",
  });
  req.session.userId = user.id;
  res.json({ user: publicUser(findUserById(user.id)) });
});

router.get("/discogs", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect(`${clientUrl(req)}/login`);
  }

  if (discogsOAuthConfigured()) {
    try {
      const callbackUrl = discogsCallbackUrl();
      const { url, requestToken, requestTokenSecret } =
        await getDiscogsAuthUrl(callbackUrl);
      req.session.discogsRequestToken = requestToken;
      req.session.discogsRequestTokenSecret = requestTokenSecret;
      return res.redirect(url);
    } catch (err) {
      console.error("Discogs OAuth start:", err);
      return res.redirect(`${clientUrl(req)}/settings?discogs=error`);
    }
  }

  if (useMockAuth()) {
    connectDiscogs(req.session.userId, {
      username: MOCK_USER.discogs_username,
      token: "mock",
      tokenSecret: "mock",
    });
    return res.redirect(`${clientUrl(req)}/settings?discogs=connected&mock=1`);
  }

  return res.redirect(`${clientUrl(req)}/settings?discogs=nokeys`);
});

router.get("/discogs/callback", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect(`${clientUrl(req)}/login`);
  }

  if (!discogsOAuthConfigured()) {
    return res.redirect(`${clientUrl(req)}/settings?discogs=nokeys`);
  }

  try {
    const verifier = req.query.oauth_verifier;
    const { token, tokenSecret } = await getDiscogsAccessToken(
      req.session.discogsRequestToken,
      req.session.discogsRequestTokenSecret,
      verifier
    );
    const identity = await getIdentity(token, tokenSecret);
    let avatarUrl = null;
    try {
      avatarUrl = await getDiscogsUserProfile(identity.username);
    } catch (err) {
      console.warn("Discogs avatar on connect:", err.message);
    }
    connectDiscogs(req.session.userId, {
      username: identity.username,
      token,
      tokenSecret,
      avatarUrl,
    });
    res.redirect(`${clientUrl(req)}/settings?discogs=connected`);
  } catch (err) {
    console.error("Discogs OAuth callback:", err);
    res.redirect(`${clientUrl(req)}/settings?discogs=error`);
  }
});

router.post("/discogs/disconnect", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Login required" });
  const user = disconnectDiscogs(req.session.userId);
  res.json({ user: publicUser(user) });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

export default router;
