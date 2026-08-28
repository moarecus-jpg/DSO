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
  // The arced name is only legible at sidebar/login sizes; the compact nav mark
  // pairs a plain disc with the DSO wordmark instead.
  const withName = variant === "sidebar" || variant === "login";

  return (
    <span
      className={`brand-mark brand-mark--${variant}`}
      title="DSO — Discogs Slovenia Orders"
    >
      <DsoLogo className="brand-mark-logo" withName={withName} />
      {!withName && (
        <span className="brand-mark-text">
          <DsoWordmark />
        </span>
      )}
    </span>
  );
}
