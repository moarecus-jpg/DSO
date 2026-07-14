import { useEffect, useMemo, useState } from "react";
import { Disc3, X } from "lucide-react";
import { parseDiscogsUrlList } from "../../shared/parseRecordUrl.js";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { AppSelect } from "./AppSelect.jsx";

function displayUserLabel(user) {
  const primary = user.name ?? user.username ?? user.discogsUsername;
  if (primary && user.discogsUsername && primary !== user.discogsUsername) {
    return `${primary} (@${user.discogsUsername})`;
  }
  return primary ?? user.username ?? user.discogsUsername ?? user.id;
}

function buildUserOptions(users, currentUserId, t) {
  return [...users]
    .sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return displayUserLabel(a).localeCompare(displayUserLabel(b), undefined, {
        sensitivity: "base",
      });
    })
    .map((user) => {
      const label = displayUserLabel(user);
      return {
        value: user.id,
        label:
          user.id === currentUserId ? `${label}${t("items.addForMeSuffix")}` : label,
      };
    });
}

export function AddRecordModal({
  open,
  onClose,
  onSubmit,
  submitting,
  sellerUsername,
  currentUserId,
}) {
  const { t } = useLocale();
  const [urlsText, setUrlsText] = useState("");
  const [progress, setProgress] = useState(null);
  const [forUserId, setForUserId] = useState(currentUserId ?? "");
  const [ordererOptions, setOrdererOptions] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!open) {
      setUrlsText("");
      setProgress(null);
      setForUserId(currentUserId ?? "");
      return undefined;
    }

    let cancelled = false;
    setLoadingUsers(true);

    api("/auth/users")
      .then(({ users = [] }) => {
        if (cancelled) return;
        const options = buildUserOptions(users, currentUserId, t);
        setOrdererOptions(options);
        setForUserId((current) => {
          if (current && options.some((option) => option.value === current)) {
            return current;
          }
          return currentUserId ?? options[0]?.value ?? "";
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        if (currentUserId) {
          setOrdererOptions([
            {
              value: currentUserId,
              label: t("items.addForMe"),
            },
          ]);
          setForUserId(currentUserId);
        } else {
          setOrdererOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, currentUserId, t]);

  const { valid: validUrls, invalid: invalidUrls } = useMemo(
    () => parseDiscogsUrlList(urlsText),
    [urlsText]
  );

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validUrls.length) {
      alert(
        invalidUrls.length ? t("items.noValidLinks") : t("items.enterAtLeastOne")
      );
      return;
    }

    setProgress({ current: 0, total: validUrls.length });
    try {
      const result = await onSubmit({
        urls: validUrls,
        forUserId: forUserId || currentUserId,
        onProgress: setProgress,
      });
      if (result?.ok !== false) {
        setUrlsText("");
        setProgress(null);
        onClose();
      }
    } catch (err) {
      alert(err.message ?? t("session.addFailed"));
    } finally {
      setProgress(null);
    }
  }

  const busy = submitting || progress != null || loadingUsers;
  const submitLabel =
    progress && progress.total > 0
      ? t("items.adding", { current: progress.current, total: progress.total })
      : validUrls.length === 0
        ? t("items.add")
        : validUrls.length === 1
          ? t("items.addOne")
          : t("items.addMany", { count: validUrls.length });

  return (
    <div
      className="modal-overlay"
      onClick={busy ? undefined : onClose}
      role="presentation"
    >
      <div className="modal card modal-add-record" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Disc3 size={20} />
            {t("items.addItem")}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-link-form">
          <div className="modal-field-row">
            <span className="modal-field-label">{t("items.addFor")}</span>
            <AppSelect
              className="modal-orderer-select"
              value={forUserId}
              onChange={setForUserId}
              options={
                ordererOptions.length > 0
                  ? ordererOptions
                  : [{ value: "", label: t("common.loading") }]
              }
              ariaLabel={t("items.addFor")}
              disabled={busy || ordererOptions.length === 0}
            />
          </div>

          <p className="muted fine">{t("items.linksHint", { seller: sellerUsername })}</p>
          <label>
            {t("items.linksLabel")}
            <textarea
              className="modal-urls-textarea"
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              placeholder={
                "https://www.discogs.com/sell/item/123\nhttps://www.discogs.com/shop/item/456"
              }
              rows={6}
              autoFocus
              disabled={busy}
            />
          </label>
          {validUrls.length > 0 && (
            <p className="muted fine">
              {validUrls.length === 1
                ? t("items.validLinkOne")
                : t("items.validLinkMany", { count: validUrls.length })}
            </p>
          )}
          {invalidUrls.length > 0 && (
            <p className="form-error fine">
              {invalidUrls.length === 1
                ? t("items.invalidLineOne")
                : t("items.invalidLineMany", { count: invalidUrls.length })}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || validUrls.length === 0 || !forUserId}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
