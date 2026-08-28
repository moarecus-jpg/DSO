import { useRef, useState } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import {
  GRADES,
  ISSUE_TYPES,
  MAX_ISSUE_BODY_LENGTH,
  MAX_ISSUE_PHOTOS,
  RESOLUTIONS,
} from "../../shared/orderReview.js";
import { formatGrading } from "../../shared/orderTotals.js";
import { compressImage } from "../lib/compressImage.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { AppSelect } from "./AppSelect.jsx";

export function OrderIssueForm({ link, submitting = false, onSubmit, onCancel }) {
  const { t } = useLocale();
  const [issueType, setIssueType] = useState("grading");
  const [resolution, setResolution] = useState("partialRefund");
  const [actualMedia, setActualMedia] = useState("");
  const [actualSleeve, setActualSleeve] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState([]);
  const fileRef = useRef(null);

  const showGrades = issueType !== "missing";
  const gradeOptions = [
    { value: "", label: t("session.reviewKeepGrade") },
    ...GRADES.map((grade) => ({ value: grade, label: grade })),
  ];

  async function handleFiles(event) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const room = MAX_ISSUE_PHOTOS - photos.length;
    if (room <= 0) {
      alert(t("session.reviewPhotoTooMany", { max: MAX_ISSUE_PHOTOS }));
      return;
    }

    const prepared = [];
    for (const file of files.slice(0, room)) {
      const blob = await compressImage(file);
      if (blob) prepared.push({ blob, url: URL.createObjectURL(blob) });
    }
    setPhotos((current) => [...current, ...prepared]);
  }

  function removePhoto(index) {
    setPhotos((current) => {
      const photo = current[index];
      if (photo) URL.revokeObjectURL(photo.url);
      return current.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    await onSubmit?.({
      linkId: link.id,
      issueType,
      resolution,
      actualMediaCondition: showGrades ? actualMedia : "",
      actualSleeveCondition: showGrades ? actualSleeve : "",
      body: body.trim(),
      photos: photos.map((photo) => photo.blob),
    });
  }

  return (
    <form className="order-issue-form" onSubmit={handleSubmit}>
      <div className="order-issue-form-grid">
        <label className="order-issue-field">
          <span className="label">{t("session.reviewIssueType")}</span>
          <AppSelect
            value={issueType}
            onChange={setIssueType}
            options={ISSUE_TYPES.map((value) => ({
              value,
              label: t(`session.issueType.${value}`),
            }))}
            ariaLabel={t("session.reviewIssueType")}
            searchable={false}
            disabled={submitting}
          />
        </label>

        <label className="order-issue-field">
          <span className="label">{t("session.reviewResolution")}</span>
          <AppSelect
            value={resolution}
            onChange={setResolution}
            options={RESOLUTIONS.map((value) => ({
              value,
              label: t(`session.resolution.${value}`),
            }))}
            ariaLabel={t("session.reviewResolution")}
            searchable={false}
            disabled={submitting}
          />
        </label>
      </div>

      {showGrades && (
        <>
          <p className="muted fine order-issue-listed">
            {t("session.reviewListedAs", { grading: formatGrading(link) })}
          </p>
          <div className="order-issue-form-grid">
            <label className="order-issue-field">
              <span className="label">{t("session.reviewActualMedia")}</span>
              <AppSelect
                value={actualMedia}
                onChange={setActualMedia}
                options={gradeOptions}
                ariaLabel={t("session.reviewActualMedia")}
                searchable={false}
                disabled={submitting}
              />
            </label>
            <label className="order-issue-field">
              <span className="label">{t("session.reviewActualSleeve")}</span>
              <AppSelect
                value={actualSleeve}
                onChange={setActualSleeve}
                options={gradeOptions}
                ariaLabel={t("session.reviewActualSleeve")}
                searchable={false}
                disabled={submitting}
              />
            </label>
          </div>
        </>
      )}

      <label className="order-issue-field">
        <span className="label">{t("session.reviewDetails")}</span>
        <textarea
          className="order-notes-input"
          rows={3}
          maxLength={MAX_ISSUE_BODY_LENGTH}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("session.reviewDetailsPlaceholder")}
          disabled={submitting}
        />
      </label>

      <div className="order-issue-photos">
        <span className="label">
          {t("session.reviewPhotos", {
            count: photos.length,
            max: MAX_ISSUE_PHOTOS,
          })}
        </span>
        <div className="order-issue-photo-row">
          {photos.map((photo, index) => (
            <span key={photo.url} className="order-issue-photo">
              <img src={photo.url} alt="" />
              <button
                type="button"
                className="order-issue-photo-remove"
                onClick={() => removePhoto(index)}
                aria-label={t("common.close")}
                disabled={submitting}
              >
                <X size={13} aria-hidden />
              </button>
            </span>
          ))}
          {photos.length < MAX_ISSUE_PHOTOS && (
            <button
              type="button"
              className="order-issue-photo-add"
              onClick={() => fileRef.current?.click()}
              disabled={submitting}
            >
              <ImagePlus size={18} aria-hidden />
              <span>{t("session.reviewAddPhotos")}</span>
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleFiles}
        />
      </div>

      <div className="order-issue-form-actions">
        <button type="button" className="btn btn-ghost btn-small" onClick={onCancel} disabled={submitting}>
          {t("session.reviewCancel")}
        </button>
        <button type="submit" className="btn btn-primary btn-small" disabled={submitting}>
          <Send size={14} aria-hidden />
          {submitting ? t("session.reviewSubmitting") : t("session.reviewSubmit")}
        </button>
      </div>
    </form>
  );
}
