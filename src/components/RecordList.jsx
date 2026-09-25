import { AlertOctagon, ExternalLink } from "lucide-react";
import { DiscogsCartActions } from "./DiscogsCartActions.jsx";
import { OrderIssueForm } from "./OrderIssueForm.jsx";
import {
  formatPrice,
  isLinkUnavailable,
  linkDiscountApplies,
  listingIdFor,
  recordTitle,
} from "../../shared/orderTotals.js";
import { issuesForLink } from "../../shared/orderReview.js";
import { getStoreConfig, isShopStore, normalizeStore, STORE_HHV } from "../../shared/stores.js";
import { hhvPriceLocaleUrl } from "../../shared/parseShopUrl.js";
import { useLocale } from "../hooks/useLocale.jsx";

function itemHref(link, store) {
  const href = link?.url;
  if (!href) return "#";
  if (normalizeStore(store) === STORE_HHV) return hhvPriceLocaleUrl(href) || href;
  return href;
}

function DiscountControl({
  link,
  t,
  applies,
  canManageDiscount,
  discountBusy,
  onToggleDiscount,
}) {
  if (canManageDiscount) {
    return (
      <label className="ui-check order-item-discount-check">
        <input
          type="checkbox"
          checked={applies}
          disabled={discountBusy || !onToggleDiscount}
          onChange={() => onToggleDiscount?.(link, !applies)}
          aria-label={t("items.discountAppliesAria")}
        />
      </label>
    );
  }
  if (applies) {
    return (
      <span className="order-item-discount-yes" title={t("items.discountApplies")}>
        ✓
      </span>
    );
  }
  return <span className="muted order-item-discount-empty">—</span>;
}

function ItemRow({
  link,
  store,
  t,
  onRemoveLink,
  removingLinkId,
  canRemoveLink,
  unavailable,
  issueCount = 0,
  canReportIssue = false,
  issueFormOpen = false,
  onToggleIssueForm,
  onSubmitIssue,
  submittingIssue = false,
  showDiscountCol = false,
  canManageDiscount = false,
  onToggleDiscount,
  togglingDiscountId = null,
  colSpan = 2,
}) {
  const href = itemHref(link, store);
  const applies = linkDiscountApplies(link);
  const discountBusy = togglingDiscountId === link.id;
  const priceLabel = link.blurred
    ? "—"
    : unavailable
      ? (
          <span className="order-item-price--unavailable">
            {formatPrice(link.price_value, link.price_currency)}
          </span>
        )
      : formatPrice(link.price_value, link.price_currency);

  return (
    <>
    <tr
      className={[
        link.blurred ? "order-item-row--hidden" : "",
        unavailable ? "order-item-row--unavailable" : "",
        issueCount > 0 ? "order-item-row--reported" : "",
        applies && showDiscountCol ? "order-item-row--discount" : "",
      ]
        .filter(Boolean)
        .join(" ") || undefined}
    >
      <td className="col-participant" data-label={t("items.ordered")}>
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
            {unavailable && (
              <span className="order-item-unavailable-badge">
                {t("items.unavailable")}
              </span>
            )}
            {issueCount > 0 && (
              <span className="order-item-issue-badge">
                <AlertOctagon size={12} aria-hidden />
                {t("session.reviewItemReported", { count: issueCount })}
              </span>
            )}
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="order-listing-id"
            >
              {listingIdFor(link)}
              <ExternalLink size={12} aria-hidden />
            </a>
            <div className="order-item-title-row">
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="order-item-title"
              >
                {recordTitle(link)}
              </a>
              <div className="order-item-side">
                <span className="order-item-price">{priceLabel}</span>
                {showDiscountCol && (
                  <DiscountControl
                    link={link}
                    t={t}
                    applies={applies}
                    canManageDiscount={canManageDiscount}
                    discountBusy={discountBusy}
                    onToggleDiscount={onToggleDiscount}
                  />
                )}
              </div>
            </div>
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
              store={store}
              onRemove={
                canRemoveLink?.(link) ? () => onRemoveLink?.(link) : undefined
              }
              removing={removingLinkId === link.id}
              onReportIssue={
                canReportIssue ? () => onToggleIssueForm?.(link) : undefined
              }
              issueFormOpen={issueFormOpen}
            />
          </div>
        )}
      </td>
    </tr>
    {issueFormOpen && (
      <tr className="order-item-issue-row">
        <td colSpan={colSpan}>
          <OrderIssueForm
            link={link}
            submitting={submittingIssue}
            onCancel={() => onToggleIssueForm?.(link)}
            onSubmit={onSubmitIssue}
          />
        </td>
      </tr>
    )}
    </>
  );
}

export function RecordList({
  links = [],
  store = "discogs",
  onRemoveLink,
  removingLinkId,
  canRemoveLink,
  unavailableOnly = false,
  issues = [],
  canReportIssue,
  issueFormLinkId = null,
  onToggleIssueForm,
  onSubmitIssue,
  submittingIssue = false,
  showDiscountCol = false,
  canManageDiscount = false,
  onToggleDiscount,
  togglingDiscountId = null,
}) {
  const { t } = useLocale();
  const isShop = isShopStore(store);
  const storeConfig = getStoreConfig(store);
  const colSpan = 2;

  const visible = unavailableOnly
    ? links.filter((link) => isLinkUnavailable(link) && !link.blurred)
    : links.filter((link) => !isLinkUnavailable(link) || link.blurred);

  if (!visible.length) return null;

  return (
    <div className={`order-items card${unavailableOnly ? " order-items--unavailable" : ""}`}>
      {unavailableOnly && (
        <h2 className="order-unavailable-title">{t("items.unavailableListTitle")}</h2>
      )}
      <table className="order-items-table">
        <thead>
          <tr>
            <th className="col-participant">{t("items.ordered")}</th>
            <th className="col-item">
              <span className="order-items-head-row">
                <span>{t("items.id")}</span>
                <span className="order-items-head-side">
                  <span className="order-items-head-price">{t("items.price")}</span>
                  {showDiscountCol && (
                    <span
                      className="order-items-head-discount"
                      title={t("items.discountHint")}
                    >
                      {t("items.discount")}
                    </span>
                  )}
                </span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((link) => (
            <ItemRow
              key={link.id}
              link={link}
              store={store}
              t={t}
              onRemoveLink={onRemoveLink}
              removingLinkId={removingLinkId}
              canRemoveLink={canRemoveLink}
              unavailable={isLinkUnavailable(link)}
              issueCount={issuesForLink(issues, link.id).length}
              canReportIssue={Boolean(canReportIssue?.(link))}
              issueFormOpen={issueFormLinkId === link.id}
              onToggleIssueForm={onToggleIssueForm}
              onSubmitIssue={onSubmitIssue}
              submittingIssue={submittingIssue}
              showDiscountCol={showDiscountCol}
              canManageDiscount={canManageDiscount && !unavailableOnly}
              onToggleDiscount={onToggleDiscount}
              togglingDiscountId={togglingDiscountId}
              colSpan={colSpan}
            />
          ))}
        </tbody>
      </table>
      {showDiscountCol && canManageDiscount && !unavailableOnly && (
        <p className="muted fine order-items-discount-hint">
          {t("items.discountHint")}
        </p>
      )}
      {isShop && !unavailableOnly && (
        <p className="muted fine order-items-shop-hint">
          {t("items.shopOpenHint", { store: storeConfig.label })}
        </p>
      )}
    </div>
  );
}
