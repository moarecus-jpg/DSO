import { useMemo, useState } from "react";
import { useLocale } from "../hooks/useLocale.jsx";

/** Base seconds-per-revolution at 0% pitch (60 / RPM). */
const BASE_PERIOD = {
  33: 60 / 33,
  45: 60 / 45,
};

/**
 * SL-1200-inspired deck that wraps the existing vinyl mark (DsoLogo / BrandMark).
 * Children must include `.dso-logo` — that exact element is what spins.
 */
export function Turntable({ children }) {
  const { t } = useLocale();
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
        <div className="turntable-chassis-face" aria-hidden />
        <div className="turntable-chassis-bevel" aria-hidden />

        <div className="turntable-deck">
          <div className="turntable-platter-wrap">
            <div className="turntable-platter-glow" aria-hidden />
            <div className="turntable-platter" aria-hidden>
              <div className="turntable-platter-rim" />
              <div className="turntable-platter-mat" />
              <div className="turntable-platter-hub" />
            </div>

            {/* Existing vinyl record (DsoLogo) — do not replace */}
            <div className="turntable-record">{children}</div>
          </div>

          <div
            className={`turntable-tonearm${
              playing ? " turntable-tonearm--cue" : ""
            }`}
            aria-hidden
          >
            <div className="turntable-tonearm-base">
              <div className="turntable-tonearm-pivot" />
              <div className="turntable-tonearm-rest" />
            </div>
            <div className="turntable-tonearm-assembly">
              <div className="turntable-tonearm-counterweight" />
              <div className="turntable-tonearm-shaft" />
              <div className="turntable-tonearm-s-curve" />
              <div className="turntable-tonearm-headshell">
                <div className="turntable-tonearm-stylus" />
              </div>
            </div>
          </div>
        </div>

        <div className="turntable-controls">
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
            <span className="turntable-start-btn-label">
              {playing ? t("turntable.stop") : t("turntable.start")}
            </span>
          </button>

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

          <label className="turntable-pitch">
            <span className="turntable-pitch-meta">
              <span>{t("turntable.pitch")}</span>
              <span className="turntable-pitch-value">
                {pitch > 0 ? `+${pitch}` : pitch}%
              </span>
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
            <span className="turntable-pitch-scale" aria-hidden>
              <span>−8</span>
              <span>0</span>
              <span>+8</span>
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
