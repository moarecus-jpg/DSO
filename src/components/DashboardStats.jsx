import { AlertTriangle, Disc3, FolderOpen, Sparkles, Users } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

const CARDS = [
  { key: "open", icon: FolderOpen, tone: "violet" },
  { key: "members", icon: Users, tone: "pink" },
  { key: "items", icon: Disc3, tone: "orange" },
  { key: "activeToday", icon: Sparkles, tone: "green" },
  { key: "attention", icon: AlertTriangle, tone: "slate", action: true },
];

export function DashboardStats({ stats, onAttention }) {
  const { t } = useLocale();

  return (
    <div className="dash-stats">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = stats?.[card.key] ?? 0;
        const clickable = card.action && value > 0 && onAttention;
        const className = `dash-stat dash-stat--${card.tone}${
          clickable ? " dash-stat--action" : ""
        }`;
        const body = (
          <>
            <span className="dash-stat-icon" aria-hidden>
              <Icon size={18} strokeWidth={2.1} />
            </span>
            <span className="dash-stat-value">{value}</span>
            <span className="dash-stat-label">{t(`orders.stat.${card.key}`)}</span>
            {card.action && value > 0 ? (
              <span className="dash-stat-hint">{t("orders.stat.viewNow")}</span>
            ) : (
              <span className="dash-stat-hint">{t(`orders.statHint.${card.key}`)}</span>
            )}
          </>
        );

        if (clickable) {
          return (
            <button
              key={card.key}
              type="button"
              className={className}
              onClick={onAttention}
            >
              {body}
            </button>
          );
        }

        return (
          <div key={card.key} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
