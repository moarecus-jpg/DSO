/** Prefer custom profile photo, then Discogs avatar, then Google/OAuth picture. */
export function resolveUserAvatarUrl(user) {
  if (!user) return null;
  if ((user.hasCustomAvatar || user.avatar_mime) && user.id) {
    return `/auth/avatar/${user.id}`;
  }
  if (user.discogsAvatarUrl) return user.discogsAvatarUrl;
  if (user.discogs_avatar_url) return user.discogs_avatar_url;
  return user.picture ?? null;
}
