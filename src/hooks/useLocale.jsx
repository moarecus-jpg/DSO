import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALES,
  readStoredLocale,
  setActiveLocale,
  STORAGE_KEY,
  t as translate,
  translateApiError,
  dateLocale,
  platCountLabel,
} from "../i18n/index.js";

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(readStoredLocale);

  useEffect(() => {
    setActiveLocale(locale);
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const setLocale = useCallback((next) => {
    if (LOCALES.includes(next)) setLocaleState(next);
  }, []);

  const t = useCallback((key, params) => translate(key, params, locale), [locale]);

  const tx = useCallback(
    (message) => translateApiError(message, locale),
    [locale]
  );

  const localeTag = dateLocale(locale);

  const recordsLabel = useCallback((n) => platCountLabel(n, locale), [locale]);

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, locales: LOCALES, t, tx, localeTag, recordsLabel }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be inside LocaleProvider");
  return ctx;
}

export { DEFAULT_LOCALE };
