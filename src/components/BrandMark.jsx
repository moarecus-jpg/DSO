import { Disc3 } from "lucide-react";

/** Brand lockup — icon + wordmark. */
export function BrandMark({ variant = "nav" }) {
  const isLogin = variant === "login";
  const isSidebar = variant === "sidebar";

  return (
    <span
      className={`brand-mark brand-mark--${variant}`}
      title="DSO — Discogs Slovenia Orders"
    >
      <span className="brand-mark-icon" aria-hidden>
        <Disc3
          size={isLogin ? 34 : isSidebar ? 32 : 18}
          strokeWidth={isLogin ? 1.5 : 2}
        />
      </span>
      <span className="brand-mark-text">
        {isSidebar ? (
          <span className="brand-mark-wordmark">
            <span className="brand-mark-line">Discogs</span>
            <span className="brand-mark-line brand-mark-line--accent">Slovenia</span>
            <span className="brand-mark-line">Orders</span>
          </span>
        ) : (
          <>
            <span className="brand-mark-name">DSO</span>
            {isLogin && (
              <span className="brand-mark-tagline">
                Discogs <span className="brand-mark-highlight">Slovenia</span> Orders
              </span>
            )}
          </>
        )}
      </span>
    </span>
  );
}
