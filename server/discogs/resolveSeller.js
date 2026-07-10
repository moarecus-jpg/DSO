import { parseDiscogsRecordUrl } from "../../shared/parseRecordUrl.js";
import { parseSellerInput } from "../../shared/parseSeller.js";
import { MOCK_SESSION } from "../mock.js";
import { assertDiscogsAuth, buildAppDiscogsHeaders } from "./auth.js";
import { runDiscogsRequest } from "./throttle.js";

const API = "https://api.discogs.com";

async function fetchListingSeller(listingId) {
  const headers = buildAppDiscogsHeaders();
  assertDiscogsAuth(headers);

  return runDiscogsRequest(async () => {
    const res = await fetch(`${API}/marketplace/listings/${listingId}`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data.seller?.username ?? null;
  });
}

export async function resolveSellerInput(input, { mock = false } = {}) {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  const direct = parseSellerInput(trimmed);
  if (direct) return direct;

  const record = parseDiscogsRecordUrl(trimmed);
  if (!record.valid || record.listingId == null) return null;

  if (mock) {
    return MOCK_SESSION.seller_username;
  }

  return fetchListingSeller(record.listingId);
}
