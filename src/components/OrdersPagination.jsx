import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

function pageNumbers(page, pageCount) {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const start = Math.min(Math.max(1, page - 2), pageCount - 4);
  return Array.from({ length: 5 }, (_, index) => start + index);
}

export function OrdersPagination({ page, pageCount, from, to, total, onPageChange }) {
  const { t } = useLocale();
  if (total === 0) return null;

  return (
    <div className="orders-pagination">
      <p className="orders-pagination-summary">
        {t("orders.paginationShowing", { from, to, total })}
      </p>
      {pageCount > 1 && (
        <div className="orders-pagination-pages">
          <button
            type="button"
            className="orders-page-btn"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={t("orders.paginationPrev")}
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          {pageNumbers(page, pageCount).map((number) => (
            <button
              key={number}
              type="button"
              className={`orders-page-btn orders-page-btn--num${
                number === page ? " active" : ""
              }`}
              onClick={() => onPageChange(number)}
              aria-current={number === page ? "page" : undefined}
            >
              {number}
            </button>
          ))}
          <button
            type="button"
            className="orders-page-btn"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label={t("orders.paginationNext")}
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
