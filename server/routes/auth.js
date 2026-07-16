import { Router } from "express";
import {
  connectDiscogs,
  consumePasswordResetToken,
  createLocalUser,
  createPasswordResetToken,
  disconnectDiscogs,
  findUserByEmail,
  findUserById,
  isDeliverableEmail,
  listUsersForAssignment,
  publicUser,
  updateDiscogsAvatar,
  updateHideMyRecords,
  updateNotificationPrefs,
  updateUserEmail,
  changeUserPassword,
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
  discogsOAuthConfigured,
  getDiscogsAccessToken,
  getDiscogsAuthUrl,
} from "../discogs/oauth.js";
import { appBaseUrl, discogsCallbackUrl as buildDiscogsCallbackUrl } from "../appUrl.js";
import { getDiscogsUserProfile, getIdentity } from "../discogs/client.js";
import { discogsAppConfigured } from "../discogs/auth.js";
import { MOCK_USER } from "../mock.js";
import { applySessionPersistence, saveSession } from "../auth/sessionCookie.js";
import { sendPasswordResetEmail } from "../email/notifications.js";
import { isAppAdmin } from "../auth/appAdmin.js";

const router = Router();

function withAdminFlag(user) {
  const publicProfile = publicUser(user);
  if (!publicProfile) return null;
  return { ...publicProfile, isAdmin: isAppAdmin(user.id) };
}

function useMockAuth() {
  return process.env.USE_MOCK_AUTH === "true" || !googleConfigured();
}

function clientUrl(req) {
  return appBaseUrl(req);
}

function discogsErrorRedirect(req, res, reason = "unknown") {
  return res.redirect(
    `${clientUrl(req)}/settings?discogs=error&reason=${encodeURIComponent(reason)}`
  );
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
  res.json({ user: withAdminFlag(user) });
});

router.get("/users", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Prijavi se v aplikacijo." });
  }
  res.json({ users: listUsersForAssignment() });
});

router.patch("/me/privacy", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Prijavi se v aplikacijo." });
  }

  const hideMyRecords = req.body?.hideMyRecords;
  if (typeof hideMyRecords !== "boolean") {
    return res.status(400).json({ error: "Neveljavna nastavitev zasebnosti." });
  }

  const user = updateHideMyRecords(req.session.userId, hideMyRecords);
  if (!user) {
    return res.status(404).json({ error: "Uporabnik ni bil najden." });
  }

  res.json({ user: publicUser(user) });
});

router.patch("/me/email", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Prijavi se v aplikacijo." });
  }

  const raw = req.body?.email;
  if (typeof raw !== "string" || !raw.trim()) {
    return res.status(400).json({ error: "E-poštni naslov je obvezen." });
  }

  try {
    const user = updateUserEmail(req.session.userId, raw);
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "E-pošte ni bilo mogoče shraniti." });
  }
});

router.patch("/me/password", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Prijavi se v aplikacijo." });
  }

  const { currentPassword, password, passwordConfirm } = req.body ?? {};
  if (password !== passwordConfirm) {
    return res.status(400).json({ error: "Gesli se ne ujemata." });
  }

  try {
    changeUserPassword(req.session.userId, currentPassword, password);
    res.json({ ok: true });
  } catch (err) {
    const msg = err.message ?? "Gesla ni bilo mogoče spremeniti.";
    const status =
      msg.includes("ni pravilno") || msg.includes("nima gesla") || msg.includes("Geslo")
        ? 400
        : 500;
    res.status(status).json({ error: msg });
  }
});

router.patch("/me/notifications", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Prijavi se v aplikacijo." });
  }

  const body = req.body ?? {};
  const prefs = {};
  if (typeof body.notifyNewOrder === "boolean") prefs.notifyNewOrder = body.notifyNewOrder;
  if (typeof body.notifyOrderNote === "boolean") prefs.notifyOrderNote = body.notifyOrderNote;
  if (typeof body.notifyOrderClosed === "boolean") {
    prefs.notifyOrderClosed = body.notifyOrderClosed;
  }

  const user = findUserById(req.session.userId);
  if (!user) {
    return res.status(404).json({ error: "Uporabnik ni bil najden." });
  }

  const enabling =
    prefs.notifyNewOrder || prefs.notifyOrderNote || prefs.notifyOrderClosed;
  if (enabling && !isDeliverableEmail(user.email)) {
    return res.status(400).json({
      error: "Najprej vnesi veljaven e-poštni naslov v nastavitvah.",
    });
  }

  const updated = updateNotificationPrefs(req.session.userId, prefs);
  res.json({ user: publicUser(updated) });
});

router.post("/forgot-password", async (req, res) => {
  const raw = req.body?.email;
  if (typeof raw !== "string" || !raw.trim()) {
    return res.status(400).json({ error: "Vnesi e-poštni naslov." });
  }

  const genericOk = {
    ok: true,
    message:
      "If an account exists with that email, you will receive a password reset link shortly.",
  };

  try {
    const user = findUserByEmail(raw.trim());
    if (user?.password_hash && isDeliverableEmail(user.email)) {
      const token = createPasswordResetToken(user.id);
      await sendPasswordResetEmail({
        baseUrl: clientUrl(req),
        user,
        token,
      });
    }
    res.json(genericOk);
  } catch (err) {
    console.error("Forgot password:", err);
    res.json(genericOk);
  }
});

router.post("/reset-password", (req, res) => {
  const { token, password, passwordConfirm } = req.body ?? {};
  if (password !== passwordConfirm) {
    return res.status(400).json({ error: "Gesli se ne ujemata." });
  }

  try {
    consumePasswordResetToken(token, password);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Gesla ni bilo mogoče ponastaviti." });
  }
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
    await saveSession(req);
    res.redirect(`${clientUrl(req)}/`);
  } catch (err) {
    console.error(err);
    res.redirect(`${clientUrl(req)}/login?error=google`);
  }
});

router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, password, passwordConfirm, username, email } = req.body ?? {};
    if (password !== passwordConfirm) {
      return res.status(400).json({ error: "Gesli se ne ujemata." });
    }
    const user = createLocalUser({ firstName, lastName, password, username, email });
    req.session.userId = user.id;
    const rememberMe = req.body?.rememberMe !== false;
    applySessionPersistence(req, rememberMe);
    await saveSession(req);
    res.status(201).json({
      user: withAdminFlag(user),
      username: user.username,
    });
  } catch (err) {
    const msg = err.message ?? "Registracija ni uspela.";
    const status =
      msg.includes("obvezna") ||
      msg.includes("Geslo") ||
      msg.includes("Uporabniško") ||
      msg.includes("zasedeno") ||
      msg.includes("e-pošt") ||
      msg.includes("E-pošt")
        ? 400
        : 500;
    res.status(status).json({ error: msg });
  }
});

router.post("/login", async (req, res) => {
  try {
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
    await saveSession(req);
    res.json({ user: withAdminFlag(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Prijava ni uspela. Poskusi znova." });
  }
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
      const base = clientUrl(req);
      const callbackUrl = buildDiscogsCallbackUrl(req);
      const { url, requestToken, requestTokenSecret } = await getDiscogsAuthUrl(
        callbackUrl,
        base
      );
      req.session.discogsRequestToken = requestToken;
      req.session.discogsRequestTokenSecret = requestTokenSecret;
      await saveSession(req);
      return res.redirect(url);
    } catch (err) {
      console.error("Discogs OAuth start:", err);
      return discogsErrorRedirect(req, res, "start");
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

  if (!req.session.discogsRequestToken || !req.session.discogsRequestTokenSecret) {
    console.error("Discogs OAuth callback: manjkata request tokena v seji");
    return discogsErrorRedirect(req, res, "session");
  }

  try {
    const base = clientUrl(req);
    const verifier = req.query.oauth_verifier;
    const { token, tokenSecret } = await getDiscogsAccessToken(
      req.session.discogsRequestToken,
      req.session.discogsRequestTokenSecret,
      verifier,
      base
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
    return discogsErrorRedirect(req, res, "callback");
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
