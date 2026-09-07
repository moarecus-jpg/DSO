import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Disc3, Users } from "lucide-react";
import { api } from "../api.js";
import { BrandMark } from "../components/BrandMark.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

export function InviteLanding() {
  const { code } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const [community, setCommunity] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code?.trim()) {
      setLoading(false);
      setError(t("communities.invalidInvite"));
      return;
    }
    let cancelled = false;
    setLoading(true);
    api(`/api/communities/preview/${encodeURIComponent(code.trim())}`)
      .then((data) => {
        if (!cancelled) {
          setCommunity(data.community);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCommunity(null);
          setError(err.message ?? t("communities.invalidInvite"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code, t]);

  if (authLoading) {
    return <p className="muted center page">{t("common.loading")}</p>;
  }

  if (user && code) {
    return <Navigate to={`/join/${encodeURIComponent(code)}`} replace />;
  }

  const location = [community?.city, community?.country].filter(Boolean).join(", ");
  const nextJoin = `/join/${code || ""}`;
  const loginTo = `/login?next=${encodeURIComponent(nextJoin)}`;
  const registerTo = `/login?mode=register&next=${encodeURIComponent(nextJoin)}`;

  return (
    <div className="auth-page invite-landing-page">
      <div className="auth-card invite-landing-card">
        <BrandMark variant="auth" />
        <h1>{t("communities.inviteLandingTitle")}</h1>
        <p className="muted">{t("communities.inviteLandingSubtitle")}</p>

        {loading ? (
          <p className="muted">{t("common.loading")}</p>
        ) : error ? (
          <p className="auth-error">{error}</p>
        ) : community ? (
          <div className="invite-landing-preview">
            <h2>{community.name}</h2>
            {location ? <p className="muted fine">{location}</p> : null}
            <div className="invite-landing-stats">
              <div>
                <Users size={18} aria-hidden />
                <strong>{community.memberCount ?? 0}</strong>
                <span>{t("communities.inviteStatMembers")}</span>
              </div>
              <div>
                <Disc3 size={18} aria-hidden />
                <strong>{community.openOrderCount ?? 0}</strong>
                <span>{t("communities.inviteStatOpen")}</span>
              </div>
              <div>
                <Disc3 size={18} aria-hidden />
                <strong>{community.recentOrderCount ?? 0}</strong>
                <span>{t("communities.inviteStatRecent")}</span>
              </div>
            </div>
            <p className="muted fine">{t("communities.inviteLandingPrivacy")}</p>
          </div>
        ) : null}

        {!loading && community ? (
          <div className="invite-landing-actions">
            <Link to={loginTo} className="btn btn-primary">
              {t("communities.inviteLandingCta")}
            </Link>
            <Link to={registerTo} className="btn btn-ghost">
              {t("auth.createAccount")}
            </Link>
          </div>
        ) : null}

        {!loading && error ? (
          <p className="auth-switch">
            <Link to="/login">{t("auth.backToLogin")}</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
