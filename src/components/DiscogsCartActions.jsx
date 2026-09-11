import { ExternalLink } from "lucide-react";
import { DiscogsAddToCartLink } from "./DiscogsAddToCartLink.jsx";
import { RemoveFromOrderButton } from "./RemoveFromOrderButton.jsx";
import { ReportProblemButton } from "./ReportProblemButton.jsx";
import { isLinkUnavailable } from "../../shared/orderTotals.js";
import { getStoreConfig, isShopStore, normalizeStore, STORE_HHV } from "../../shared/stores.js";
import { hhvPriceLocaleUrl } from "../../shared/parseShopUrl.js";
import { useLocale } from "../hooks/useLocale.jsx";

function shopOpenUrl(link, store) {
  const href = link?.url;
  if (!href) return null;
  if (normalizeStore(store) === STORE_HHV) {
    return hhvPriceLocaleUrl(href) || href;
  }
  return href;
}

export function DiscogsCartActions({
  link,
  store = "discogs",
  onRemove,
  removing = false,
  onReportIssue,
  issueFormOpen = false,
  className = "",
}) {
  const { t } = useLocale();
  const isShop = isShopStore(store);
  const storeConfig = getStoreConfig(store);
  const unavailable = isLinkUnavailable(link);
  const openUrl = shopOpenUrl(link, store);

  return (
    <div className={`discogs-cart-actions ${className}`.trim()}>
      {unavailable ? null : isShop ? (
        openUrl ? (
          <a
            href={openUrl}
            target="_blank"
            rel="noreferrer"
            className="discogs-add-to-cart"
            title={t("items.openOnShopHint", { store: storeConfig.label })}
          >
            <ExternalLink size={14} aria-hidden />
            {t("items.openOnShop", { store: storeConfig.label })}
          </a>
        ) : null
      ) : (
        <DiscogsAddToCartLink link={link} />
      )}
      <RemoveFromOrderButton onRemove={onRemove} removing={removing} />
      <ReportProblemButton onReport={onReportIssue} open={issueFormOpen} />
    </div>
  );
}
