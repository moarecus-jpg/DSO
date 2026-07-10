import { Disc3 } from "lucide-react";

/** Brand lockup — icon + DSO wordmark. */
export function BrandMark({ variant = "nav" }) {
  const isLogin = variant === "login";
  return (
    <span
      className={`brand-mark brand-mark--${variant}`}
      title="DSO — Discogs Slovenia Orders"
    >
      <span className="brand-mark-icon" aria-hidden>
        {isLogin ? (
          <Disc3 size={34} strokeWidth={1.5} />
        ) : (
          <img
            src="/dso-icon.png"
            alt=""
            className="brand-mark-img brand-mark-img--nav"
          />
        )}
      </span>
      <span className="brand-mark-text">
        <span className="brand-mark-name">DSO</span>
        {isLogin && (
          <span className="brand-mark-tagline">
            Discogs <span className="brand-mark-highlight">Slovenia</span> Orders
          </span>
        )}
      </span>
    </span>
  );
}
