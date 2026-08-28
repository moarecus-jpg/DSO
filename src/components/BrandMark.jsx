import { DsoLogo } from "./DsoLogo.jsx";

function DsoWordmark({ className = "" }) {
  return (
    <span className={`brand-mark-name ${className}`.trim()} aria-hidden>
      <span>D</span>
      <span className="brand-mark-name-s">S</span>
      <span>O</span>
    </span>
  );
}

/** Brand lockup — vinyl mark with ring text. */
export function BrandMark({ variant = "nav" }) {
  const isLogin = variant === "login";
  const isSidebar = variant === "sidebar";

  return (
    <span
      className={`brand-mark brand-mark--${variant}`}
      title="DSO — Discogs Slovenia Orders"
    >
      <DsoLogo className="brand-mark-logo" />
      {isSidebar ? null : (
        <span className="brand-mark-text">
          <DsoWordmark />
          {isLogin && (
            <span className="brand-mark-tagline">Discogs Slovenia Orders</span>
          )}
        </span>
      )}
    </span>
  );
}
