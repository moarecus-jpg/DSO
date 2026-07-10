import sl from "./locales/sl.js";
import en from "./locales/en.js";

export const LOCALES = ["sl", "en"];
export const DEFAULT_LOCALE = "sl";
export const STORAGE_KEY = "dso_locale";

const catalogs = { sl, en };

/** Server error text (SL or EN) → translation key under errors.* */
const SERVER_ERROR_MAP = {
  "Gesli se ne ujemata.": "errors.passwordsMismatch",
  "Registracija ni uspela.": "errors.registerFailed",
  "Vnesi uporabniško ime in geslo.": "errors.loginFields",
  "Napačno uporabniško ime ali geslo.": "errors.wrongCredentials",
  "Prijava ni uspela. Poskusi znova.": "errors.loginFailed",
  "Uporabniško ime mora imeti 3–32 znakov.": "errors.usernameLength",
  "Uporabniško ime sme vsebovati samo črke, številke, piko, podčrtaj ali vezaj.":
    "errors.usernameChars",
  "Ime in priimek sta obvezna.": "errors.nameRequired",
  "Geslo mora imeti vsaj 6 znakov.": "errors.passwordMin",
  "To uporabniško ime je že zasedeno.": "errors.usernameTaken",
  "Prijavi se v aplikacijo.": "errors.loginRequired",
  "Naročila ni bilo mogoče ustvariti.": "errors.createOrderFailed",
  "Naročila ni bilo mogoče odpreti.": "orders.createFailed",
  "Neveljavna poštnina.": "errors.invalidShipping",
  "Poštnina ne sme biti negativna.": "errors.shippingNegative",
  "Število oseb mora biti vsaj 1.": "errors.minPeople",
  "Neveljavno ime.": "errors.invalidName",
  "Ime je predolgo (največ 80 znakov).": "errors.nameTooLong",
  "Samo admin lahko spreminja imena.": "errors.adminOnly",
  "Zaključenega naročila ni mogoče urejati.": "errors.closedReadOnly",
  "Sodelujoč ni v tem naročilu.": "errors.memberNotInOrder",
  "Vnos ni v tem naročilu.": "errors.linkNotInOrder",
  "Imena ni bilo mogoče shraniti.": "errors.saveNameFailed",
  "Poštnine ni bilo mogoče shraniti.": "errors.saveShippingFailed",
  "Neveljavna Discogs povezava.": "errors.invalidDiscogsLink",
  "Session not found": "errors.sessionNotFound",
  "URL is required": "errors.urlRequired",
  "Failed to add record": "errors.addRecordFailed",
  "Seller username required": "errors.sellerUsernameRequired",
  "Failed to load matches": "errors.loadMatchesFailed",
  "Failed to load wantlist matches": "errors.loadWantlistFailed",
  "DISCOGS_CONSUMER_KEY in DISCOGS_CONSUMER_SECRET nista nastavljena.":
    "errors.discogsKeysMissing",
};

let activeLocale = DEFAULT_LOCALE;

export function readStoredLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (LOCALES.includes(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function setActiveLocale(locale) {
  activeLocale = LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function getActiveLocale() {
  return activeLocale;
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

export function t(key, params = {}, locale = activeLocale) {
  const catalog = catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
  let value = getByPath(catalog, key) ?? getByPath(catalogs[DEFAULT_LOCALE], key) ?? key;
  if (typeof value !== "string") return key;

  for (const [name, replacement] of Object.entries(params)) {
    value = value.replaceAll(`{{${name}}}`, String(replacement));
  }
  return value;
}

export function translateApiError(message, locale = activeLocale) {
  if (!message) return t("common.error", {}, locale);

  const mapped = SERVER_ERROR_MAP[message];
  if (mapped) return t(mapped, {}, locale);

  const serverMatch = message.match(/^Napaka strežnika \((\d+)\)$/);
  if (serverMatch) {
    return t("common.serverError", { status: serverMatch[1] }, locale);
  }
  const enMatch = message.match(/^Server error \((\d+)\)$/);
  if (enMatch) {
    return t("common.serverError", { status: enMatch[1] }, locale);
  }

  if (message.startsWith("Vnesi seller uporabniško ime")) {
    return t("errors.sellerRequired", {}, locale);
  }
  if (message.startsWith("Seja je potekla")) {
    return t("errors.sessionExpired", {}, locale);
  }
  if (message.startsWith("Nobena povezava ni veljavna")) {
    return t("items.noValidLinks", {}, locale);
  }
  if (message.startsWith("Vnesi vsaj eno Discogs povezavo")) {
    return t("items.enterAtLeastOne", {}, locale);
  }
  if (message.startsWith("Podprte so povezave")) {
    return t("errors.listingFormat", {}, locale);
  }

  return message;
}

export function dateLocale(locale = activeLocale) {
  return locale === "en" ? "en-GB" : "sl-SI";
}

export function platCountLabel(n, locale = activeLocale) {
  const count = Number(n) || 0;
  if (count === 1) return t("items.recordOne", {}, locale);
  if (count === 2) return t("items.recordTwo", {}, locale);
  if (count === 3 || count === 4) return t("items.recordFew", { count }, locale);
  return t("items.recordMany", { count }, locale);
}
