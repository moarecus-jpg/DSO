/** 30 days when "remember me" is checked. */
export const REMEMBER_ME_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function applySessionPersistence(req, rememberMe) {
  if (rememberMe) {
    req.session.cookie.maxAge = REMEMBER_ME_MAX_AGE_MS;
  } else {
    req.session.cookie.maxAge = null;
  }
}
