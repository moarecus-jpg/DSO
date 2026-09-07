import { DsoLogo } from "./DsoLogo.jsx";
import { APP_TITLE } from "../../shared/brand.js";

function DcoWordmark({ className = "" }) {
  return (
    <span className={`brand-mark-name ${className}`.trim()} aria-hidden>
      <span>D</span>
      <span className="brand-mark-name-c">C</span>
      <span>O</span>
    </span>
  );
}

/** Brand lockup — vinyl mark; nav shows DCO wordmark, icon is logo-only. */
export function BrandMark({ variant = "nav" }) {
  const withWordmark = variant === "nav";

  return (
    <span className={`brand-mark brand-mark--${variant}`} title={APP_TITLE}>
      <DsoLogo className="brand-mark-logo" />
      {withWordmark && (
        <span className="brand-mark-text">
          <DcoWordmark />
        </span>
      )}
    </span>
  );
}
