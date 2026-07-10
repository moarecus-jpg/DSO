import { useMemo, useState } from "react";
import { Link2, User } from "lucide-react";
import { parseDiscogsRecordUrl } from "../../shared/parseRecordUrl.js";
import { parseSellerInput } from "../../shared/parseSeller.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function NewOrderForm({ onSubmit, creating, error }) {
  const { t } = useLocale();
  const [sellerMode, setSellerMode] = useState("username");
  const [seller, setSeller] = useState("");

  const parsedSeller = useMemo(() => {
    const direct = parseSellerInput(seller);
    if (direct) return { username: direct, source: "seller" };
    const record = parseDiscogsRecordUrl(seller);
    if (record.valid && record.listingId) {
      return { username: null, source: "listing", listingId: record.listingId };
    }
    return null;
  }, [seller]);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = seller.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
  }

  return (
    <form className="card form-card" onSubmit={handleCreate}>
      <h2>{t("orders.newOrder")}</h2>

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

      {error && <p className="form-error">{error}</p>}

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

      <button className="btn btn-primary" type="submit" disabled={creating || !seller.trim()}>
        {creating ? t("orders.opening") : t("orders.openOrder")}
      </button>
    </form>
  );
}
