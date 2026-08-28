import { AlertOctagon, ExternalLink } from "lucide-react";
import { DiscogsCartActions } from "./DiscogsCartActions.jsx";
import { OrderIssueForm } from "./OrderIssueForm.jsx";
import {
  formatPrice,
  isLinkUnavailable,
  listingIdFor,
  recordTitle,
} from "../../shared/orderTotals.js";
import { issuesForLink } from "../../shared/orderReview.js";
import { getStoreConfig, isShopStore } from "../../shared/stores.js";
import { useLocale } from "../hooks/useLocale.jsx";

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
}) {
  return (
    <>
    <tr
      className={[
        link.blurred ? "order-item-row--hidden" : "",
        unavailable ? "order-item-row--unavailable" : "",
        issueCount > 0 ? "order-item-row--reported" : "",
      ]
        .filter(Boolean)
        .join(" ") || undefined}
    >
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
      <td className="col-price">
        {link.blurred ? (
          "—"
        ) : unavailable ? (
          <span className="order-item-price--unavailable">
            {formatPrice(link.price_value, link.price_currency)}
          </span>
        ) : (
          formatPrice(link.price_value, link.price_currency)
        )}
      </td>
    </tr>
    {issueFormOpen && (
      <tr className="order-item-issue-row">
        <td colSpan={3}>
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
}) {
  const { t } = useLocale();
  const isShop = isShopStore(store);
  const storeConfig = getStoreConfig(store);

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
            <th className="col-item">{t("items.id")}</th>
            <th className="col-price">{t("items.price")}</th>
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
            />
          ))}
        </tbody>
      </table>
      {isShop && !unavailableOnly && (
        <p className="muted fine order-items-shop-hint">
          {t("items.shopOpenHint", { store: storeConfig.label })}
        </p>
      )}
    </div>
  );
}
