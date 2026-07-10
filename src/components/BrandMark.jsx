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
        <Disc3 size={isLogin ? 30 : 20} strokeWidth={isLogin ? 1.75 : 2} />
      </span>
      <span className="brand-mark-text">
        <span className="brand-mark-name">DSO</span>
        {isLogin && (
          <span className="brand-mark-tagline">Discogs Slovenia Orders</span>
        )}
      </span>
    </span>
  );
}
