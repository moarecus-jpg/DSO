import { useEffect, useState } from "react";
import { Loader2, Percent, Store } from "lucide-react";
import { PlacPageHeader } from "../components/PlacPageHeader.jsx";
import { PlacSellDialog } from "../components/PlacSellDialog.jsx";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function PlacShopSettings() {
  const { t } = useLocale();
  const [discountPercent, setDiscountPercent] = useState("0");
  const [discountLabel, setDiscountLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    api("/api/plac/shop")
      .then((data) => {
        setDiscountPercent(String(data.settings?.discountPercent ?? 0));
        setDiscountLabel(data.settings?.discountLabel ?? "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { settings } = await api("/api/plac/shop", {
        method: "PATCH",
        body: JSON.stringify({
          discountPercent: Number(discountPercent) || 0,
          discountLabel,
        }),
      });
      setDiscountPercent(String(settings.discountPercent ?? 0));
      setDiscountLabel(settings.discountLabel ?? "");
      setSaved(true);
    } catch (err) {
      setError(err.message ?? t("plac.shopSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page page-orders page-plac">
      <PlacPageHeader
        backTo={{ to: "/plac/mine", label: t("plac.backToMyListings") }}
        title={t("plac.shopSettingsTitle")}
        subtitle={t("plac.shopSettingsSubtitle")}
        showSearch={false}
        onSell={() => setSellOpen(true)}
      />

      {loading ? (
        <p className="orders-loading">{t("common.loadingItems")}</p>
      ) : (
        <form className="plac-shop-settings card" onSubmit={handleSubmit}>
          <div className="plac-shop-settings-head">
            <span className="plac-shop-settings-icon" aria-hidden>
              <Percent size={22} />
            </span>
            <div>
              <h2>{t("plac.shopDiscount")}</h2>
              <p className="muted fine">{t("plac.shopDiscountHint")}</p>
            </div>
          </div>

          <div className="plac-sell-fields">
            <label className="plac-sell-field">
              <span className="plac-sell-label">{t("plac.discountPercent")}</span>
              <input
                type="number"
                min="0"
                max="90"
                step="0.5"
                value={discountPercent}
                onChange={(e) => {
                  setDiscountPercent(e.target.value);
                  setSaved(false);
                }}
              />
            </label>

            <label className="plac-sell-field plac-sell-field--wide">
              <span className="plac-sell-label">{t("plac.discountLabel")}</span>
              <input
                type="text"
                maxLength={80}
                value={discountLabel}
                onChange={(e) => {
                  setDiscountLabel(e.target.value);
                  setSaved(false);
                }}
                placeholder={t("plac.discountLabelPlaceholder")}
              />
            </label>
          </div>

          {Number(discountPercent) > 0 && (
            <p className="plac-shop-preview muted fine">
              <Store size={14} aria-hidden />
              {t("plac.shopDiscountPreview", {
                percent: Number(discountPercent),
                label: discountLabel.trim() || t("plac.shopSaleDefault"),
              })}
            </p>
          )}

          {error && <p className="form-error">{error}</p>}
          {saved && !error && <p className="plac-shop-saved muted fine">{t("plac.shopSaved")}</p>}

          <div className="plac-sell-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 size={16} className="spin" aria-hidden />}
              {saving ? t("plac.saving") : t("plac.saveShopSettings")}
            </button>
          </div>
        </form>
      )}

      <PlacSellDialog open={sellOpen} onClose={() => setSellOpen(false)} />
    </div>
  );
}
