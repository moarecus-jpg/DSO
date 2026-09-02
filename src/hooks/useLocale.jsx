import { createContext, useCallback, useContext, useEffect } from "react";
import {
  DEFAULT_LOCALE,
  LOCALES,
  setActiveLocale,
  STORAGE_KEY,
  t as translate,
  translateApiError,
  dateLocale,
  platCountLabel,
} from "../i18n/index.js";

const LocaleContext = createContext(null);
const locale = DEFAULT_LOCALE;

export function LocaleProvider({ children }) {
  useEffect(() => {
    setActiveLocale(locale);
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback(() => {}, []);

  const t = useCallback((key, params) => translate(key, params, locale), []);

  const tx = useCallback((message) => translateApiError(message, locale), []);

  const localeTag = dateLocale(locale);

  const recordsLabel = useCallback((n) => platCountLabel(n, locale), []);

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
