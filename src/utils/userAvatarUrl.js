/** Prefer Discogs avatar when connected, otherwise Google/OAuth picture. */
export function resolveUserAvatarUrl(user) {
  if (!user) return null;
  if (user.discogsAvatarUrl) return user.discogsAvatarUrl;
  if (user.discogs_avatar_url) return user.discogs_avatar_url;
  return user.picture ?? null;
}
