import fs from "fs";
import os from "os";
import path from "path";
import puppeteer from "puppeteer-core";

const BROWSER_TIMEOUT_MS = 35_000;
const CHALLENGE_WAIT_MS = 4_000;

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

async function renderOnce(url, executablePath) {
  const userDataDir = path.join(
    os.tmpdir(),
    `dco-chrome-${process.pid}-${Date.now()}`
  );

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      `--user-data-dir=${userDataDir}`,
    ],
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
    const executablePath = resolveChromeExecutable();
    if (!executablePath) {
      throw new Error(
        "Chromium ni na voljo (nastavi PUPPETEER_EXECUTABLE_PATH)."
      );
    }

    try {
      return await renderOnce(url, executablePath);
    } catch (err) {
      // Retries help when HHV navigates mid-scrape (detached frame).
      console.warn(
        `[shops] browser render retry after: ${err?.message ?? err}`
      );
      return await renderOnce(url, executablePath);
    }
  };

  const queued = browserQueue.then(run, run);
  browserQueue = queued.then(
    () => undefined,
    () => undefined
  );
  return queued;
}
