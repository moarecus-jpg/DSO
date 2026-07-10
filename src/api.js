import { getActiveLocale, t, translateApiError } from "./i18n/index.js";

const API = "";

export async function api(path, options = {}) {
  const locale = getActiveLocale();
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": locale,
        ...options.headers,
      },
    });
  } catch {
    throw new Error(t("common.networkError", {}, locale));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const raw = data.error ?? t("common.serverError", { status: res.status }, locale);
    throw new Error(translateApiError(raw, locale));
  }
  return data;
}
