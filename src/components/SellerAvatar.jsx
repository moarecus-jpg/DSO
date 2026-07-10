import { useState } from "react";
import { sellerGradient } from "../utils/sellerColor.js";

export function SellerAvatar({
  username,
  avatarUrl,
  className = "order-icon",
  size,
}) {
  const [failed, setFailed] = useState(false);
  const style = size ? { width: size, height: size } : undefined;
  const showImage = avatarUrl && !failed;

  if (showImage) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${className} seller-avatar-img`}
        style={style}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={className}
      style={{ ...style, background: sellerGradient(username ?? "") }}
      aria-hidden
    />
  );
}
