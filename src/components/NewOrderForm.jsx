import { useMemo, useState } from "react";
import { Link2, User } from "lucide-react";
import { parseDiscogsRecordUrl } from "../../shared/parseRecordUrl.js";
import { parseSellerInput } from "../../shared/parseSeller.js";
import {
  STORE_DISCOGS,
  STORES,
  getStoreConfig,
  isShopStore,
  shopSellerUsername,
} from "../../shared/stores.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { StoreAvatar } from "./OrderStoreAvatar.jsx";

const STORE_OPTIONS = Object.values(STORES);

export function NewOrderForm({ onSubmit, creating, error }) {
  const { t } = useLocale();
  const [store, setStore] = useState(STORE_DISCOGS);
  const [sellerMode, setSellerMode] = useState("username");
  const [seller, setSeller] = useState("");

  const storeConfig = getStoreConfig(store);
  const isShop = isShopStore(store);

  const parsedSeller = useMemo(() => {
    if (isShop) {
      return { username: shopSellerUsername(store), source: "shop" };
    }
    const direct = parseSellerInput(seller);
    if (direct) return { username: direct, source: "seller" };
    const record = parseDiscogsRecordUrl(seller);
    if (record.valid && record.listingId) {
      return { username: null, source: "listing", listingId: record.listingId };
    }
    return null;
  }, [seller, isShop, store]);

  async function handleCreate(e) {
    e.preventDefault();
    if (isShop) {
      await onSubmit({ store });
      return;
    }
    const trimmed = seller.trim();
    if (!trimmed) return;
    await onSubmit({ store: STORE_DISCOGS, sellerUsername: trimmed });
  }

  const canSubmit = isShop || Boolean(seller.trim());
  const exampleTitle = `${shopSellerUsername(store)}#0007`;

  return (
    <form className="card form-card" onSubmit={handleCreate}>
      <h2>{t("orders.newOrder")}</h2>

      <div className="tabs store-tabs" role="tablist" aria-label={t("orders.storeLabel")}>
        {STORE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={store === option.id}
            className={store === option.id ? "active" : ""}
            onClick={() => setStore(option.id)}
            disabled={creating}
          >
            <StoreAvatar
              store={option.id}
              className="store-tab-icon"
              size={16}
            />
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {isShop ? (
        <>
          <p className="muted fine">
            {t("orders.shopHint", {
              store: storeConfig.label,
              domain: storeConfig.urlHint,
            })}
          </p>
          <p className="muted fine">
            {t("orders.titleHint")} <code>{shopSellerUsername(store)}#····</code>
            {" "}
            {t("orders.titleExample")} <code>{exampleTitle}</code>
          </p>
        </>
      ) : (
        <>
          <div className="tabs seller-tabs">
            <button
              type="button"
              className={sellerMode === "username" ? "active" : ""}
              onClick={() => setSellerMode("username")}
            >
              <User size={16} />
              {t("orders.tabUsername")}
            </button>
            <button
              type="button"
              className={sellerMode === "url" ? "active" : ""}
              onClick={() => setSellerMode("url")}
            >
              <Link2 size={16} />
              {t("orders.tabUrl")}
            </button>
          </div>

          <label>
            {sellerMode === "username" ? t("orders.sellerUsername") : t("orders.sellerUrl")}
            <input
              value={seller}
              onChange={(e) => setSeller(e.target.value)}
              placeholder={
                sellerMode === "username"
                  ? t("orders.sellerPlaceholder")
                  : t("orders.urlPlaceholder")
              }
              required
              disabled={creating}
            />
          </label>

          {parsedSeller?.username && (
            <p className="muted fine">
              {t("orders.sellerDetected")} <code>@{parsedSeller.username}</code>
            </p>
          )}

          {parsedSeller?.source === "listing" && (
            <p className="muted fine">{t("orders.listingDetected")}</p>
          )}

          {seller.trim() && !parsedSeller && (
            <p className="form-error">{t("orders.invalidUrl")}</p>
          )}

          <p className="muted fine">
            {t("orders.titleHint")} <code>seller#····</code>
            {parsedSeller?.username && (
              <>
                {" "}
                {t("orders.titleExample")}{" "}
                <code>{parsedSeller.username}#0007</code>
              </>
            )}
          </p>
        </>
      )}

      {error && <p className="form-error">{error}</p>}

      <button className="btn btn-primary" type="submit" disabled={creating || !canSubmit}>
        {creating ? t("orders.opening") : t("orders.openOrder")}
      </button>
    </form>
  );
}
