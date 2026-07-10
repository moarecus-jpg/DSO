import { useState } from "react";
import { userInitials } from "../utils/sellerColor.js";

export function UserAvatar({ name, avatarUrl, className = "nav-avatar", size }) {
  const [failed, setFailed] = useState(false);
  const style = size ? { width: size, height: size } : undefined;

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${className} user-avatar-img`}
        style={style}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className={className} style={style}>
      {userInitials(name)}
    </span>
  );
}
