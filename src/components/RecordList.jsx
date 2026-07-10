import { ExternalLink } from "lucide-react";
import { DiscogsCartActions } from "./DiscogsCartActions.jsx";
import {
  formatPrice,
  listingIdFor,
  recordTitle,
} from "../../shared/orderTotals.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function RecordList({
  links = [],
  orderGrandTotal,
  onRemoveLink,
  removingLinkId,
  canRemoveLink,
}) {
  const { t, recordsLabel } = useLocale();

  if (!links.length) return null;

  const { itemsTotal, total, currency, hasUnknown, count } = orderGrandTotal ?? {};
  const platTotal = itemsTotal ?? total;

  return (
    <div className="order-items card">
      <table className="order-items-table">
        <thead>
          <tr>
            <th className="col-participant">{t("items.ordered")}</th>
            <th className="col-item">{t("items.id")}</th>
            <th className="col-price">{t("items.price")}</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id} className={link.blurred ? "order-item-row--hidden" : undefined}>
              <td className="col-participant">
                <span className="order-participant">
                  {link.user_name ?? t("common.unknown")}
                </span>
              </td>
              <td className="col-item">
                {link.blurred ? (
                  <div className="order-item-hidden" aria-hidden="true">
                    <span className="order-item-hidden-placeholder" />
                  </div>
                ) : (
                  <div className="order-item-cell">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="order-listing-id"
                    >
                      {listingIdFor(link)}
                      <ExternalLink size={12} aria-hidden />
                    </a>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="order-item-title"
                    >
                      {recordTitle(link)}
                    </a>
                    {link.media_condition && (
                      <p className="order-item-condition">
                        {t("items.mediaCondition")}: {link.media_condition}
                      </p>
                    )}
                    {link.sleeve_condition && (
                      <p className="order-item-condition">
                        {t("items.sleeveCondition")}: {link.sleeve_condition}
                      </p>
                    )}
                    <DiscogsCartActions
                      link={link}
                      onRemove={
                        canRemoveLink?.(link)
                          ? () => onRemoveLink?.(link)
                          : undefined
                      }
                      removing={removingLinkId === link.id}
                    />
                  </div>
                )}
              </td>
              <td className="col-price">
                {link.blurred ? "—" : formatPrice(link.price_value, link.price_currency)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="order-subtotal-row">
            <td colSpan={2}>
              {t("items.subtotalFor", {
                label: recordsLabel(count ?? links.length),
              })}
            </td>
            <td className="col-price">{formatPrice(platTotal, currency)}</td>
          </tr>
          <tr className="order-total-row">
            <td colSpan={2}>
              <strong>{t("common.total")}</strong>
            </td>
            <td className="col-price">
              <strong className="order-grand-total">
                {formatPrice(total, currency)}
              </strong>
              {hasUnknown && (
                <span className="muted fine">{t("common.someWithoutPrice")}</span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
