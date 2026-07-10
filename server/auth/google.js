const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v2/userinfo";

export function getGoogleAuthUrl(redirectUri, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `${GOOGLE_AUTH}?${params}`;
}

export async function exchangeGoogleCode(code, redirectUri) {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${await res.text()}`);
  }

  const { access_token } = await res.json();

  const profileRes = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!profileRes.ok) {
    throw new Error("Failed to fetch Google profile");
  }

  const profile = await profileRes.json();
  return {
    googleId: profile.id,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
  };
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** OAuth callback must match the Vite dev URL so session cookies stay on one origin. */
export function googleCallbackUrl() {
  const base = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
  return `${base}/auth/google/callback`;
}
