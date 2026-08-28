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
  // The arced name is only legible at login size; the sidebar shows the bare
  // disc and the compact nav mark pairs a plain disc with the DSO wordmark.
  const withArcedName = variant === "login";
  const withWordmark = variant !== "login" && variant !== "sidebar";

  return (
    <span
      className={`brand-mark brand-mark--${variant}`}
      title="DSO — Discogs Slovenia Orders"
    >
      <DsoLogo className="brand-mark-logo" withName={withArcedName} />
      {withWordmark && (
        <span className="brand-mark-text">
          <DsoWordmark />
        </span>
      )}
    </span>
  );
}
