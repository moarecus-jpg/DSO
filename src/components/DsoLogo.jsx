import { useId } from "react";

const GROOVES = [0.9, 0.81, 0.72, 0.63, 0.54, 0.45];

/** Tilted vinyl with DSO on the label and the name arced under the disc. */
export function DsoLogo({ className, withName = true }) {
  const uid = useId().replace(/:/g, "");
  const discId = `dso-disc-${uid}`;
  const arcId = `dso-arc-${uid}`;

  return (
    <svg
      className={className}
      viewBox={withName ? "30 24 200 164" : "44 28 174 116"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient
          id={discId}
          x1="52"
          y1="34"
          x2="208"
          y2="140"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4c3f7d" />
          <stop offset="0.55" stopColor="#2e2650" />
          <stop offset="1" stopColor="#1b1730" />
        </linearGradient>
        <path id={arcId} d="M20 126 A 114 66 0 0 0 240 126" />
      </defs>

      <g transform="rotate(-14 130 86)">
        <ellipse
          cx="130"
          cy="86"
          rx="84"
          ry="52"
          fill={`url(#${discId})`}
          stroke="#a78bfa"
          strokeWidth="2"
        />

        <g stroke="#a78bfa" strokeOpacity="0.3" strokeWidth="1.1">
          {GROOVES.map((scale) => (
            <ellipse
              key={scale}
              cx="130"
              cy="86"
              rx={84 * scale}
              ry={52 * scale}
            />
          ))}
        </g>

        <ellipse
          cx="130"
          cy="86"
          rx="31"
          ry="19"
          fill="#14111f"
          stroke="#c4b5fd"
          strokeWidth="1.2"
        />

        <text
          x="130"
          y="94"
          textAnchor="middle"
          fontFamily="'Permanent Marker', cursive"
          fontSize="24"
          letterSpacing="0.03em"
        >
          <tspan fill="#fff">D</tspan>
          <tspan fill="#c4b5fd">S</tspan>
          <tspan fill="#fff">O</tspan>
        </text>
      </g>

      {withName && (
        <text
          className="dso-logo-name"
          textAnchor="middle"
          fontFamily="'Permanent Marker', cursive"
          fontSize="15"
          letterSpacing="0.02em"
        >
          <textPath href={`#${arcId}`} startOffset="50%">
            Discogs Slovenia Orders
          </textPath>
        </text>
      )}
    </svg>
  );
}
