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

/** Brand lockup — flat vinyl mark; nav also shows the DSO wordmark. */
export function BrandMark({ variant = "nav" }) {
  const withWordmark = variant === "nav";

  return (
    <span
      className={`brand-mark brand-mark--${variant}`}
      title="DSO — Discogs Slovenia Orders"
    >
      <DsoLogo className="brand-mark-logo" />
      {withWordmark && (
        <span className="brand-mark-text">
          <DsoWordmark />
        </span>
      )}
    </span>
  );
}
