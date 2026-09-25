import { useId, useMemo, useState } from "react";
import { useLocale } from "../hooks/useLocale.jsx";

/** Base seconds-per-revolution at 0% pitch (60 / RPM). */
const BASE_PERIOD = {
  33: 60 / 33,
  45: 60 / 45,
};

/**
 * Draft-1 SL-1200 deck wrapping the existing vinyl mark (DsoLogo / BrandMark).
 * Children must include `.dso-logo` — that exact element is what spins.
 * Record artwork/logo style is never replaced.
 */
export function Turntable({ children }) {
  const { t } = useLocale();
  const uid = useId().replace(/:/g, "");
  const metalGradId = `tt-arm-metal-${uid}`;
  const [playing, setPlaying] = useState(false);
  const [rpm, setRpm] = useState(33);
  const [pitch, setPitch] = useState(0);

  const recordSpeed = useMemo(() => {
    const base = BASE_PERIOD[rpm] ?? BASE_PERIOD[33];
    const multiplier = 1 + pitch / 100;
    return `${(base / multiplier).toFixed(4)}s`;
  }, [rpm, pitch]);

  return (
    <div
      className={`turntable${playing ? " turntable--playing" : ""}`}
      style={{ "--record-speed": recordSpeed }}
    >
      <div className="turntable-chassis">
        <div className="turntable-chassis-glow" aria-hidden />
        <div className="turntable-chassis-face" aria-hidden />

        <div className="turntable-stage">
          <div className="turntable-platter-wrap">
            <div className="turntable-platter-glow" aria-hidden />
            <div className="turntable-platter" aria-hidden>
              <div className="turntable-platter-strobe" />
              <div className="turntable-platter-rim" />
              <div className="turntable-platter-mat" />
              <div className="turntable-platter-hub" />
            </div>

            {/* Existing vinyl record (DsoLogo) — keep logo style intact */}
            <div className="turntable-record">{children}</div>
          </div>

          <div
            className={`turntable-tonearm${
              playing ? " turntable-tonearm--cue" : ""
            }`}
            aria-hidden
          >
            <div className="turntable-tonearm-mount">
              <div className="turntable-tonearm-base-ring" />
              <div className="turntable-tonearm-knob" />
            </div>
            <svg
              className="turntable-tonearm-svg"
              viewBox="0 0 72 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id={metalGradId}
                  x1="20"
                  y1="10"
                  x2="52"
                  y2="200"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#f4f4f5" />
                  <stop offset="0.35" stopColor="#a1a1aa" />
                  <stop offset="0.7" stopColor="#d4d4d8" />
                  <stop offset="1" stopColor="#71717a" />
                </linearGradient>
              </defs>
              <rect
                x="28"
                y="6"
                width="16"
                height="18"
                rx="3"
                fill={`url(#${metalGradId})`}
                stroke="#3f3f46"
                strokeWidth="0.8"
              />
              <circle
                cx="36"
                cy="36"
                r="9"
                fill="#27272a"
                stroke="#a1a1aa"
                strokeWidth="1.4"
              />
              <circle cx="36" cy="36" r="4.5" fill={`url(#${metalGradId})`} />
              <path
                d="M36 44 C36 78 36 96 36 118 C36 138 22 148 18 162 C14 176 28 184 40 190 C50 195 54 200 54 208"
                stroke={`url(#${metalGradId})`}
                strokeWidth="4.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M36 44 C36 78 36 96 36 118 C36 138 22 148 18 162 C14 176 28 184 40 190 C50 195 54 200 54 208"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.1"
                strokeLinecap="round"
                fill="none"
                transform="translate(-1.2 0)"
              />
              <rect
                x="44"
                y="200"
                width="22"
                height="10"
                rx="2"
                fill="#18181b"
                stroke="#a1a1aa"
                strokeWidth="1"
                transform="rotate(-18 55 205)"
              />
              <circle cx="48" cy="214" r="5" fill="rgba(168,85,247,0.35)" />
              <circle cx="48" cy="214" r="2.4" fill="#c084fc" />
            </svg>
          </div>

          <label className="turntable-pitch">
            <span className="turntable-pitch-value">
              {pitch > 0 ? `+${pitch}` : pitch}%
            </span>
            <span className="turntable-pitch-track">
              <span className="turntable-pitch-ticks" aria-hidden>
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
              <input
                type="range"
                className="turntable-pitch-slider"
                min={-8}
                max={8}
                step={1}
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                aria-valuemin={-8}
                aria-valuemax={8}
                aria-valuenow={pitch}
                aria-label={t("turntable.pitchAria")}
              />
            </span>
            <span className="turntable-pitch-label">{t("turntable.pitch")}</span>
          </label>
        </div>

        <div className="turntable-footer">
          <div className="turntable-footer-left">
            <button
              type="button"
              className={`turntable-power-knob${
                playing ? " turntable-power-knob--on" : ""
              }`}
              aria-pressed={playing}
              aria-label={
                playing ? t("turntable.stopAria") : t("turntable.startAria")
              }
              onClick={() => setPlaying((v) => !v)}
              title="Power"
            />
            <button
              type="button"
              className={`turntable-start-btn${
                playing ? " turntable-start-btn--on" : ""
              }`}
              aria-pressed={playing}
              aria-label={
                playing ? t("turntable.stopAria") : t("turntable.startAria")
              }
              onClick={() => setPlaying((v) => !v)}
            >
              {t("turntable.startStop")}
            </button>
          </div>

          <div
            className="turntable-rpm"
            role="group"
            aria-label={t("turntable.rpmGroup")}
          >
            <button
              type="button"
              className={`turntable-rpm-btn${
                rpm === 33 ? " turntable-rpm-btn--active" : ""
              }`}
              aria-pressed={rpm === 33}
              onClick={() => setRpm(33)}
            >
              33
            </button>
            <button
              type="button"
              className={`turntable-rpm-btn${
                rpm === 45 ? " turntable-rpm-btn--active" : ""
              }`}
              aria-pressed={rpm === 45}
              onClick={() => setRpm(45)}
            >
              45
            </button>
          </div>

          <button
            type="button"
            className="turntable-target-btn"
            aria-label={t("turntable.strobeAria")}
            title={t("turntable.strobeAria")}
          >
            <span className="turntable-target-icon" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
