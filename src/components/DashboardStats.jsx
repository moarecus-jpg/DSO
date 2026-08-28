import { AlertTriangle, ArrowUpRight, FolderOpen, Sparkles } from "lucide-react";
import { displayOrderTitle } from "../../shared/orderTitle.js";
import { useLocale } from "../hooks/useLocale.jsx";

const CARDS = [
  { key: "open", icon: FolderOpen, tone: "violet", trend: "openWeek", action: "open" },
  { key: "attention", icon: AlertTriangle, tone: "amber", action: "attention" },
  { key: "recent", icon: Sparkles, tone: "sky", action: "recent", wide: true },
];

export function DashboardStats({
  stats,
  recentSessions = [],
  onOpen,
  onAttention,
  onRecent,
  onSelectOrder,
}) {
  const { t } = useLocale();

  const handlers = {
    open: onOpen,
    attention: onAttention,
    recent: onRecent,
  };

  return (
    <div className="dash-stats">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value =
          card.key === "recent"
            ? (stats?.recent ?? recentSessions.length)
            : (stats?.[card.key] ?? 0);
        const delta = stats?.trend?.[card.key === "open" ? "open" : card.key] ?? 0;
        const onClick = handlers[card.action];
        const className = [
          "dash-stat",
          `dash-stat--${card.tone}`,
          card.wide ? "dash-stat--wide" : "",
          onClick ? "dash-stat--action" : "",
        ]
          .filter(Boolean)
          .join(" ");

        let hint = null;
        if (card.key === "attention") {
          hint = value > 0 ? t("orders.stat.viewNow") : t("orders.statHint.attention");
        } else if (card.key === "recent") {
          hint =
            recentSessions.length > 0
              ? t("orders.statHint.recentList")
              : t("orders.statHint.recent");
        } else if (delta > 0) {
          hint = (
            <>
              <ArrowUpRight size={13} strokeWidth={2.4} aria-hidden />
              {t(`orders.statTrend.${card.trend}`, { count: delta })}
            </>
          );
        } else {
          hint = t(`orders.statHint.${card.key}`);
        }

        const summary = (
          <>
            <div className="dash-stat-head">
              <span className="dash-stat-label">{t(`orders.stat.${card.key}`)}</span>
              <span className="dash-stat-icon" aria-hidden>
                <Icon size={18} strokeWidth={2.1} />
              </span>
            </div>
            <span className="dash-stat-value">{value}</span>
            <span className="dash-stat-hint">{hint}</span>
          </>
        );

        if (card.key === "recent") {
          return (
            <div key={card.key} className={className}>
              <button type="button" className="dash-stat-main" onClick={onClick}>
                {summary}
              </button>
              {recentSessions.length > 0 && (
                <ul className="dash-stat-recent">
                  {recentSessions.map((session) => (
                    <li key={session.id}>
                      <button
                        type="button"
                        className="dash-stat-recent-item"
                        onClick={() => {
                          onSelectOrder?.(session);
                          onRecent?.();
                        }}
                      >
                        {displayOrderTitle(session)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        }

        if (onClick) {
          return (
            <button key={card.key} type="button" className={className} onClick={onClick}>
              {summary}
            </button>
          );
        }

        return (
          <div key={card.key} className={className}>
            {summary}
          </div>
        );
      })}
    </div>
  );
}
