import { sessionStatusAppearance } from "../../shared/orderStatus.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function StatusPill({ status }) {
  const { t } = useLocale();
  const meta = sessionStatusAppearance(status);

  return (
    <span className={`status-pill-v2 ${meta.className}`}>
      <span className="status-dot" />
      {t(meta.labelKey)}
    </span>
  );
}
