import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgDist = path.resolve(
  __dirname,
  "../../node_modules/discogs-marketplace-api-nodejs/dist"
);
const requireFromPkg = createRequire(path.join(pkgDist, "package.json"));

const Country = requireFromPkg("./data/country.data.js").default;
const Currency = requireFromPkg("./data/currency.data.js").default;
const extractLegacy = requireFromPkg("./scrapers/extractors/legacy.extractor.js")
  .default;

/** Cap pages so the order page does not hang on huge mywants result sets. */
const MAX_PAGES = 3;
const PAGE_TIMEOUT_MS = 15_000;
const TOTAL_TIMEOUT_MS = 25_000;

function parseMarketplacePrice(raw) {
  if (!raw) return { value: null, currency: null };
  const match = String(raw).trim().match(/^([\d,.]+)\s+([A-Z]{3})$/);
  if (!match) return { value: null, currency: null };
  const normalized = match[1].replace(/,/g, "");
  const value = Number(normalized);
  if (Number.isNaN(value)) return { value: null, currency: null };
  return { value, currency: match[2] };
}

export function mapMarketplaceItemToMatch(item) {
  const price = parseMarketplacePrice(item.price?.base);

  return {
    releaseId: item.release?.id ?? null,
    artist:
      item.artists
        ?.map((artist) => artist.name)
        .filter(Boolean)
        .join(", ") || null,
    title: item.release?.name || item.title || null,
    year: null,
    thumbnail: item.imageUrl ?? null,
    wantNotes: null,
    listing: {
      id: item.id,
      price:
        price.value != null
          ? { value: price.value, currency: price.currency }
          : null,
      condition: item.condition?.media?.full ?? item.condition?.media?.short ?? null,
      sleeve_condition:
        item.condition?.sleeve?.full ?? item.condition?.sleeve?.short ?? null,
      uri: item.url,
      status: item.isAvailable === false ? "Unavailable" : "For Sale",
    },
  };
}

function buildMywantsUrl(seller, username, page, limit = 100) {
  const base = `https://www.discogs.com/en/seller/${encodeURIComponent(seller)}/mywants`;
  const params = new URLSearchParams({
    user: username,
    limit: String(limit),
    page: String(page),
    sort: "listed,desc",
  });
  return `${base}?${params.toString()}`;
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      );
    }),
  ]);
}

async function scrapeMywantsPage(browser, seller, username, page) {
  const url = buildMywantsUrl(seller, username, page);
  const context = await browser.newContext({
    javaScriptEnabled: false,
  });

  try {
    const browserPage = await context.newPage();
    await browserPage.route("**/*", (route) =>
      route.request().resourceType() === "document" ? route.continue() : route.abort()
    );
    await browserPage.addInitScript((globals) => {
      Object.assign(globalThis, globals);
    }, { Country, Currency });

    const response = await browserPage.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_TIMEOUT_MS,
    });
    await browserPage.evaluate(() => {
      window.__name ??= (func) => func;
    });

    if (!response?.ok()) {
      const errorMessage =
        (await browserPage.evaluate(() =>
          document.querySelector("h1 + p")?.innerHTML?.trim()
        )) || `Discogs marketplace ${response?.status() ?? "?"}`;
      throw new Error(errorMessage);
    }

    const { items, total } = await browserPage.evaluate(extractLegacy);
    await browserPage.close();
    return { items: items ?? [], total: total ?? 0, url };
  } finally {
    await context.close();
  }
}

let stealthInstalled = false;

async function launchBrowser() {
  if (!stealthInstalled) {
    chromium.use(StealthPlugin());
    stealthInstalled = true;
  }
  return chromium.launch({
    headless: true,
    chromiumSandbox: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    timeout: 15_000,
  });
}

export async function fetchSellerMywantsListings(seller, username) {
  const cleanSeller = seller?.trim().replace(/^@/, "");
  const cleanUser = username?.trim().replace(/^@/, "");
  if (!cleanSeller || !cleanUser) {
    throw new Error("Seller in Discogs uporabniško ime sta obvezna.");
  }

  let browser;
  const closeBrowser = async () => {
    if (browser) {
      await browser.close().catch(() => {});
      browser = null;
    }
  };

  try {
    return await withTimeout(
      (async () => {
        try {
          browser = await launchBrowser();
        } catch (err) {
          throw new Error(
            `Playwright Chromium ni na voljo (${err.message}). Preveri Docker/Playwright namestitev ali nastavi DISCOGS_MARKETPLACE_DISABLED=true.`
          );
        }

        const allItems = [];
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages && page <= MAX_PAGES) {
          const { items, total } = await scrapeMywantsPage(
            browser,
            cleanSeller,
            cleanUser,
            page
          );
          allItems.push(...items);
          totalPages = Math.max(Math.ceil(Number(total) / 100) || 1, 1);
          page += 1;
          if (!items.length) break;
        }

        return allItems.map(mapMarketplaceItemToMatch);
      })(),
      TOTAL_TIMEOUT_MS,
      "Discogs marketplace scrape"
    );
  } catch (err) {
    await closeBrowser();
    throw err;
  } finally {
    await closeBrowser();
  }
}

export function marketplaceScraperEnabled() {
  return process.env.DISCOGS_MARKETPLACE_DISABLED !== "true";
}
