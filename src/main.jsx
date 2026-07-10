import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { readStoredLocale, setActiveLocale } from "./i18n/index.js";

try {
  const stored = localStorage.getItem("dso_dark_mode");
  document.documentElement.dataset.theme = stored === "false" ? "light" : "dark";
} catch {
  document.documentElement.dataset.theme = "dark";
}

const locale = readStoredLocale();
setActiveLocale(locale);
document.documentElement.lang = locale;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
