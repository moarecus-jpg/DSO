import { AlertTriangle, ArrowUpRight, Disc3, FolderOpen, Zap } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

const CARDS = [
  { key: "open", icon: FolderOpen, tone: "violet", trend: "openWeek" },
  { key: "items", icon: Disc3, tone: "orange", trend: "itemsWeek" },
  { key: "activeToday", icon: Zap, tone: "green", trend: "activeYesterday" },
  { key: "attention", icon: AlertTriangle, tone: "slate", action: true },
];

export function DashboardStats({ stats, onAttention }) {
  const { t } = useLocale();

  return (
    <div className="dash-stats">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = stats?.[card.key] ?? 0;
        const delta = stats?.trend?.[card.key] ?? 0;
        const clickable = card.action && value > 0 && onAttention;
        const className = `dash-stat dash-stat--${card.tone}${
          clickable ? " dash-stat--action" : ""
        }`;

        let hint = null;
        if (card.action) {
          hint = value > 0 ? t("orders.stat.viewNow") : t("orders.statHint.attention");
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

        const body = (
          <>
            <span className="dash-stat-icon" aria-hidden>
              <Icon size={18} strokeWidth={2.1} />
            </span>
            <span className="dash-stat-value">{value}</span>
            <span className="dash-stat-label">{t(`orders.stat.${card.key}`)}</span>
            <span className="dash-stat-hint">{hint}</span>
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
