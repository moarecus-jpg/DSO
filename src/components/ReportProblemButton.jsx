import { AlertOctagon } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

export function ReportProblemButton({ onReport, open = false, className = "" }) {
  const { t } = useLocale();

  if (!onReport) return null;

  return (
    <button
      type="button"
      className={`report-problem${open ? " report-problem--open" : ""} ${className}`.trim()}
      onClick={onReport}
      aria-expanded={open}
    >
      <AlertOctagon size={14} aria-hidden />
      {open ? t("common.cancel") : t("session.reviewReportProblem")}
    </button>
  );
}
