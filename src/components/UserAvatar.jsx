import { useState } from "react";
import { userInitials } from "../utils/sellerColor.js";

export function UserAvatar({ name, avatarUrl, className = "nav-avatar" }) {
  const [failed, setFailed] = useState(false);

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${className} user-avatar-img`}
        onError={() => setFailed(true)}
      />
    );
  }

  return <span className={className}>{userInitials(name)}</span>;
}
