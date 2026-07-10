/** Serializes all Discogs API traffic and retries on HTTP 429. */

const GAP_MS = 1250;
const MAX_RETRIES = 5;

let lastCall = 0;
let queue = Promise.resolve();

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitGap() {
  const delay = GAP_MS - (Date.now() - lastCall);
  if (delay > 0) await wait(delay);
  lastCall = Date.now();
}

export function isDiscogsRateLimitError(err) {
  const msg = err?.message ?? String(err);
  return msg.includes("429") || /too quickly/i.test(msg);
}

function retryDelayMs(err, attempt) {
  const msg = err?.message ?? "";
  const match = msg.match(/Retry-After["\s:]+(\d+)/i);
  if (match) return Number(match[1]) * 1000;
  return Math.min(30_000, 2000 * 2 ** attempt);
}

/**
 * Run a Discogs API call after the global queue and minimum gap between calls.
 */
export function runDiscogsRequest(fn) {
  const job = queue.then(async () => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      await waitGap();
      try {
        return await fn();
      } catch (err) {
        if (!isDiscogsRateLimitError(err) || attempt >= MAX_RETRIES) {
          throw err;
        }
        await wait(retryDelayMs(err, attempt));
      }
    }
  });
  queue = job.catch(() => {});
  return job;
}
