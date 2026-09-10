import fs from "fs";
import os from "os";
import path from "path";
import puppeteer from "puppeteer-core";

const BROWSER_TIMEOUT_MS = 35_000;
const CHALLENGE_WAIT_MS = 4_000;

const DEFAULT_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-blink-features=AutomationControlled",
  "--font-render-hinting=none",
];

const LINUX_CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  process.env.CHROMIUM_PATH,
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
].filter(Boolean);

const WIN_CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  process.env.CHROMIUM_PATH,
  path.join(
    process.env.PROGRAMFILES || "C:\\Program Files",
    "Google",
    "Chrome",
    "Application",
    "chrome.exe"
  ),
  path.join(
    process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)",
    "Google",
    "Chrome",
    "Application",
    "chrome.exe"
  ),
  path.join(
    process.env.LOCALAPPDATA || "",
    "Google",
    "Chrome",
    "Application",
    "chrome.exe"
  ),
].filter(Boolean);

const MAC_CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);

function candidatePaths() {
  if (process.platform === "win32") return WIN_CHROME_CANDIDATES;
  if (process.platform === "darwin") return MAC_CHROME_CANDIDATES;
  return LINUX_CHROME_CANDIDATES;
}

let cachedChromePath = undefined;

export function resolveChromeExecutable() {
  if (cachedChromePath !== undefined) return cachedChromePath;
  for (const candidate of candidatePaths()) {
    try {
      if (candidate && fs.existsSync(candidate)) {
        cachedChromePath = candidate;
        return cachedChromePath;
      }
    } catch {
      /* try next */
    }
  }
  cachedChromePath = null;
  return null;
}

/** True when we can attempt a headless render (system Chrome or @sparticuz/chromium). */
export function browserFetchAvailable() {
  if (resolveChromeExecutable()) return true;
  return process.platform === "linux";
}

export function looksLikeBotWall(html) {
  if (!html) return true;
  const text = String(html);
  const len = text.length;
  const hasLdJson = /application\/ld\+json/i.test(text);
  const hasPriceHint =
    /itemprop=["']price["']/i.test(text) ||
    /"price"\s*:/i.test(text) ||
    /€\s*\d/.test(text) ||
    /\d+[.,]\d{2}\s*€/.test(text);
  const obfuscatedChallenge =
    /<script[^>]*>[\s\S]*_0x[a-f0-9]{3,}/i.test(text) ||
    /challenge|cf-browser|attention required/i.test(text);

  if (hasLdJson || hasPriceHint) return false;
  if (len < 12_000 && obfuscatedChallenge) return true;
  if (len < 5_000 && /<script/i.test(text) && !/<title/i.test(text)) return true;
  return false;
}

let browserQueue = Promise.resolve();
let loggedLaunchConfig = false;

async function resolveLaunchConfig() {
  const systemPath = resolveChromeExecutable();
  if (systemPath) {
    return {
      executablePath: systemPath,
      args: DEFAULT_ARGS,
      headless: true,
      source: "system",
    };
  }

  const { default: chromium } = await import("@sparticuz/chromium");
  const executablePath = await chromium.executablePath();
  return {
    executablePath,
    args: [...chromium.args, "--disable-dev-shm-usage"],
    headless: chromium.headless ?? true,
    source: "sparticuz",
  };
}

async function renderOnce(url, launchConfig) {
  const userDataDir = path.join(
    os.tmpdir(),
    `dco-chrome-${process.pid}-${Date.now()}`
  );

  const browser = await puppeteer.launch({
    executablePath: launchConfig.executablePath,
    headless: launchConfig.headless,
    args: [...launchConfig.args, `--user-data-dir=${userDataDir}`],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
    });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: BROWSER_TIMEOUT_MS,
    });

    // Give anti-bot JS time to redirect / hydrate the product page.
    await new Promise((resolve) => setTimeout(resolve, CHALLENGE_WAIT_MS));

    await page
      .waitForFunction(
        () => {
          try {
            const html = document.documentElement?.innerHTML || "";
            return (
              html.includes("application/ld+json") ||
              Boolean(document.querySelector('[itemprop="price"]')) ||
              /€\s*\d/.test(document.body?.innerText || "") ||
              /\d+[.,]\d{2}\s*€/.test(document.body?.innerText || "")
            );
          } catch {
            return false;
          }
        },
        { timeout: 18_000 }
      )
      .catch(() => {});

    return await page.content();
  } finally {
    await browser.close().catch(() => {});
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/**
 * Render a shop product page in headless Chromium (bypasses JS anti-bot walls).
 * Serialized so Railway doesn't spawn multiple Chromium processes at once.
 */
export function fetchHtmlWithBrowser(url) {
  const run = async () => {
    let launchConfig = await resolveLaunchConfig();
    if (!loggedLaunchConfig) {
      loggedLaunchConfig = true;
      console.info(
        `[shops] browser launch via ${launchConfig.source}: ${launchConfig.executablePath}`
      );
    }

    try {
      return await renderOnce(url, launchConfig);
    } catch (err) {
      console.warn(
        `[shops] browser render failed (${launchConfig.source}): ${err?.message ?? err}`
      );

      // If system Chromium is broken (common in slim Docker images), fall back.
      if (launchConfig.source === "system") {
        cachedChromePath = null;
        try {
          const { default: chromium } = await import("@sparticuz/chromium");
          launchConfig = {
            executablePath: await chromium.executablePath(),
            args: [...chromium.args, "--disable-dev-shm-usage"],
            headless: chromium.headless ?? true,
            source: "sparticuz",
          };
          console.info(
            `[shops] falling back to sparticuz chromium: ${launchConfig.executablePath}`
          );
          return await renderOnce(url, launchConfig);
        } catch (fallbackErr) {
          console.warn(
            `[shops] sparticuz fallback failed: ${fallbackErr?.message ?? fallbackErr}`
          );
        }
      }

      // Final retry with the last known config.
      return await renderOnce(url, launchConfig);
    }
  };

  const queued = browserQueue.then(run, run);
  browserQueue = queued.then(
    () => undefined,
    () => undefined
  );
  return queued;
}

/**
 * Decks product HTML is behind Cloudflare. Warm once, then resolve many codes
 * via same-origin getPrice/getAudio (+ optional product-page DOM for the first).
 * @param {{ code: string, productUrl?: string|null }[]} items
 * @returns {Promise<Map<string, object>>}
 */
export function fetchDecksMetaBatchWithBrowser(items) {
  const list = (Array.isArray(items) ? items : [])
    .map((item) => ({
      code: String(item?.code ?? "").trim(),
      productUrl: item?.productUrl || null,
    }))
    .filter((item) => item.code);

  if (!list.length) {
    return Promise.resolve(new Map());
  }

  const run = async () => {
    let launchConfig = await resolveLaunchConfig();
    if (!loggedLaunchConfig) {
      loggedLaunchConfig = true;
      console.info(
        `[shops] browser launch via ${launchConfig.source}: ${launchConfig.executablePath}`
      );
    }

    const userDataDir = path.join(
      os.tmpdir(),
      `dco-chrome-decks-${process.pid}-${Date.now()}`
    );

    const browser = await puppeteer.launch({
      executablePath: launchConfig.executablePath,
      headless: launchConfig.headless,
      args: [...launchConfig.args, `--user-data-dir=${userDataDir}`],
    });

    const byCode = new Map();

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
      // de-DE keeps Decks prices in EUR (en-US JSON-LD often labels EUR amounts as USD).
      await page.setExtraHTTPHeaders({
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
      });
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      });

      await page.goto("https://www.decks.de/", {
        waitUntil: "domcontentloaded",
        timeout: BROWSER_TIMEOUT_MS,
      });
      await new Promise((resolve) => setTimeout(resolve, CHALLENGE_WAIT_MS + 2_000));

      // Open first product page so #t-price / basket widgets + CF session settle.
      const first = list[0];
      const startUrl =
        first.productUrl ||
        `https://www.decks.de/track/item/${encodeURIComponent(first.code)}`;
      await page.goto(startUrl, {
        waitUntil: "domcontentloaded",
        timeout: BROWSER_TIMEOUT_MS,
      });
      await new Promise((resolve) => setTimeout(resolve, CHALLENGE_WAIT_MS));
      await page
        .waitForFunction(
          () => {
            const tPrice = document.querySelector("#t-price")?.textContent || "";
            const body = document.body?.innerText || "";
            return /\d/.test(tPrice) || /\d+[.,]\d{2}\s*EUR/i.test(body);
          },
          { timeout: 18_000 }
        )
        .catch(() => {});

      const codes = list.map((item) => item.code);
      const batch = await page.evaluate(async (ids) => {
        const fetchJson = async (path) => {
          const res = await fetch(path, {
            credentials: "same-origin",
            headers: {
              Accept: "application/json, text/javascript, */*",
              "X-Requested-With": "XMLHttpRequest",
            },
          });
          const text = await res.text();
          try {
            return { ok: res.ok, status: res.status, json: JSON.parse(text) };
          } catch {
            return {
              ok: false,
              status: res.status,
              json: null,
              text: text.slice(0, 120),
            };
          }
        };

        const clean = (raw) =>
          String(raw ?? "")
            .replace(/\*/g, "")
            .replace(/EUR/gi, "")
            .replace(/€/g, "")
            .trim();

        const tPrice = clean(document.querySelector("#t-price")?.textContent);
        const tNetto = clean(
          document.querySelector("#t-pricenetto")?.textContent
        );
        const bodyMatch = (document.body?.innerText || "").match(
          /(\d+[.,]\d{2})\s*EUR/i
        );
        const basketPrice = clean(bodyMatch?.[1] || "");
        const firstDom = tPrice || tNetto || basketPrice || null;

        const out = {};
        for (let i = 0; i < ids.length; i += 1) {
          const id = ids[i];
          let price = await fetchJson(
            `/decks/rpc/getPrice.php?id=${encodeURIComponent(id)}`
          );
          if (!price?.ok || !price?.json?.price) {
            await new Promise((r) => setTimeout(r, 1500));
            price = await fetchJson(
              `/decks/rpc/getPrice.php?id=${encodeURIComponent(id)}`
            );
          }
          const audio = await fetchJson(
            `/decks/rpc/getAudio.php?id=${encodeURIComponent(id)}`
          );
          out[id] = {
            domPrice: i === 0 ? firstDom : null,
            pageTitle: document.title || null,
            finalUrl: location.href,
            price,
            audio,
          };
        }
        return out;
      }, codes);

      for (const code of codes) {
        if (batch?.[code]) byCode.set(code, batch[code]);
      }
      return byCode;
    } finally {
      await browser.close().catch(() => {});
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  };

  const queued = browserQueue.then(run, run);
  browserQueue = queued.then(
    () => undefined,
    () => undefined
  );
  return queued;
}

/**
 * Single-code helper (add-link path). Prefer batch for order refresh.
 */
export function fetchDecksMetaWithBrowser(deckscode, productUrl = null) {
  const code = String(deckscode ?? "").trim();
  if (!code) {
    return Promise.reject(new Error("Missing decks code"));
  }
  return fetchDecksMetaBatchWithBrowser([{ code, productUrl }]).then((map) => {
    const meta = map.get(code);
    if (!meta) throw new Error(`Decks meta missing for ${code}`);
    return meta;
  });
}

export async function logBrowserStatus() {
  try {
    const config = await resolveLaunchConfig();
    console.info(
      `[shops] headless browser ready (${config.source}): ${config.executablePath}`
    );
  } catch (err) {
    console.warn(`[shops] headless browser unavailable: ${err?.message ?? err}`);
  }
}
