import { useState } from "react";
import { getStoreConfig, isShopStore } from "../../shared/stores.js";
import { SellerAvatar } from "./SellerAvatar.jsx";

export function StoreAvatar({ store, className = "order-icon", size }) {
  const config = getStoreConfig(store);
  const [failed, setFailed] = useState(false);
  const style = size
    ? { width: size, height: size, minWidth: size, minHeight: size }
    : undefined;

  if (!failed && config.logoUrl) {
    return (
      <span
        className={`${className} store-avatar store-avatar--${config.id}`}
        style={style}
        title={config.label}
      >
        <img
          src={config.logoUrl}
          alt=""
          className="store-avatar-img"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`${className} store-avatar store-avatar--fallback store-avatar--${config.id}`}
      style={style}
      title={config.label}
      aria-hidden
    >
      <span className="store-avatar-initials">{config.label.slice(0, 2)}</span>
    </span>
  );
}

/** Discogs seller photo, or shop logo for HHV / Yoyaku / Decks / Deejay / Juno. */
export function OrderStoreAvatar({
  store,
  username,
  avatarUrl,
  className = "order-icon",
  size,
}) {
  if (isShopStore(store)) {
    return <StoreAvatar store={store} className={className} size={size} />;
  }
  return (
    <SellerAvatar
      username={username}
      avatarUrl={avatarUrl}
      className={className}
      size={size}
    />
  );
}
