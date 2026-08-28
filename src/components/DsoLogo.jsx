import { useId } from "react";

const GROOVES = [0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44];

/** Vinyl mark with DSO and ring text in Permanent Marker. */
export function DsoLogo({ className }) {
  const uid = useId().replace(/:/g, "");
  const vinylId = `dso-vinyl-${uid}`;
  const shineId = `dso-shine-${uid}`;
  const clipId = `dso-clip-${uid}`;
  const ringId = `dso-ring-${uid}`;

  return (
    <svg
      className={className}
      viewBox="0 0 240 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={vinylId} x1="40" y1="40" x2="200" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ede9fe" />
          <stop offset="0.42" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <radialGradient id={shineId} cx="68%" cy="28%" r="55%">
          <stop stopColor="#fff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <ellipse cx="120" cy="118" rx="88" ry="54" />
        </clipPath>
        <path
          id={ringId}
          d="M38 118 A 82 50 0 0 0 202 118"
        />
      </defs>

      <ellipse cx="120" cy="126" rx="88" ry="54" fill="#4c1d95" opacity="0.85" />
      <ellipse cx="120" cy="118" rx="88" ry="54" fill={`url(#${vinylId})`} />
      <ellipse cx="120" cy="118" rx="88" ry="54" fill={`url(#${shineId})`} />

      <g clipPath={`url(#${clipId})`} stroke="#5b21b6" strokeOpacity="0.28" strokeWidth="1.15">
        {GROOVES.map((scale) => (
          <ellipse
            key={scale}
            cx="120"
            cy="118"
            rx={88 * scale}
            ry={54 * scale}
          />
        ))}
      </g>

      <ellipse cx="120" cy="118" rx="34" ry="21" fill="#16121f" />
      <ellipse cx="120" cy="118" rx="34" ry="21" stroke="#a78bfa" strokeWidth="1.2" />

      <text
        x="120"
        y="126"
        textAnchor="middle"
        fontFamily="'Permanent Marker', cursive"
        fontSize="26"
        letterSpacing="0.04em"
      >
        <tspan fill="#fff">D</tspan>
        <tspan fill="#c4b5fd">S</tspan>
        <tspan fill="#fff">O</tspan>
      </text>

      <text
        textAnchor="middle"
        fontFamily="'Permanent Marker', cursive"
        fontSize="14"
        fill="#faf5ff"
        stroke="#3b0764"
        strokeWidth="0.35"
        paintOrder="stroke"
        letterSpacing="0.03em"
      >
        <textPath href={`#${ringId}`} startOffset="50%">
          Discogs Slovenia Orders
        </textPath>
      </text>
    </svg>
  );
}
