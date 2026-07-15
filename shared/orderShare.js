import { displayOrderTitle } from "./orderTitle.js";

export function orderSharePath(sessionId) {
  return `/session/${sessionId}`;
}

export function orderShareUrl(baseUrl, sessionId) {
  return `${String(baseUrl).replace(/\/$/, "")}${orderSharePath(sessionId)}`;
}

export function orderPageTitle(session) {
  const name = displayOrderTitle(session);
  return name ? `${name} · DSO` : "DSO — Discogs Slovenia Orders";
}

export function orderShareDescription(session, locale = "sl") {
  if (!session) return "";

  const seller = session.seller_username?.trim();
  const recordCount = session.link_count ?? session.links?.length ?? 0;
  const participantCount =
    session.participant_count ??
    session.member_count ??
    session.members?.length ??
    0;
  const isClosed = session.status === "closed";
  const isSl = locale === "sl";

  const parts = [];
  if (isClosed) {
    parts.push(isSl ? "Zaprto skupinsko naročilo" : "Closed group order");
  } else {
    parts.push(isSl ? "Odprto skupinsko naročilo" : "Open group order");
  }

  if (seller) {
    parts.push(`@${seller}`);
  }

  if (recordCount > 0) {
    parts.push(
      isSl
        ? `${recordCount} ${recordCount === 1 ? "plošča" : recordCount === 2 ? "plošči" : "plošč"}`
        : `${recordCount} record${recordCount === 1 ? "" : "s"}`
    );
  }

  if (participantCount > 0) {
    parts.push(
      isSl
        ? `${participantCount} ${participantCount === 1 ? "sodelujoči" : participantCount === 2 ? "sodelujoča" : "sodelujočih"}`
        : `${participantCount} participant${participantCount === 1 ? "" : "s"}`
    );
  }

  return parts.join(" · ");
}

export function orderEmailLinkLabel(session, { locale = "sl", action = "open" } = {}) {
  const title = displayOrderTitle(session);
  const isSl = locale === "sl";
  const actionLabel =
    action === "view"
      ? isSl
        ? "Poglej naročilo"
        : "View order"
      : isSl
        ? "Odpri naročilo"
        : "Open order";
  return title ? `${title} — ${actionLabel}` : actionLabel;
}
