import { useId } from "react";

const GROOVES = [0.9, 0.81, 0.72, 0.63, 0.54, 0.45];
const DISC_RADIUS = 84;
const DISC_CENTER = 100;
const LABEL_RADIUS = 31;

/** Front-facing vinyl with DSO on the label. */
export function DsoLogo({ className }) {
  const uid = useId().replace(/:/g, "");
  const discId = `dso-disc-${uid}`;
  const shineMaskId = `dso-shine-mask-${uid}`;

  return (
    <svg
      className={`dso-logo ${className ?? ""}`.trim()}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient
          id={discId}
          x1="44"
          y1="44"
          x2="156"
          y2="156"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4c3f7d" />
          <stop offset="0.55" stopColor="#2e2650" />
          <stop offset="1" stopColor="#1b1730" />
        </linearGradient>

        <mask id={shineMaskId} maskUnits="userSpaceOnUse">
          <circle
            cx={DISC_CENTER}
            cy={DISC_CENTER}
            r={DISC_RADIUS}
            fill="white"
          />
          <circle
            cx={DISC_CENTER}
            cy={DISC_CENTER}
            r={LABEL_RADIUS}
            fill="black"
          />
        </mask>
      </defs>

      <circle
        cx={DISC_CENTER}
        cy={DISC_CENTER}
        r={DISC_RADIUS}
        fill={`url(#${discId})`}
        stroke="#a78bfa"
        strokeWidth="2"
      />

      <g stroke="#a78bfa" strokeOpacity="0.3" strokeWidth="1.1">
        {GROOVES.map((scale) => (
          <circle
            key={scale}
            cx={DISC_CENTER}
            cy={DISC_CENTER}
            r={DISC_RADIUS * scale}
          />
        ))}
      </g>

      <g mask={`url(#${shineMaskId})`}>
        <foreignObject
          x={DISC_CENTER - DISC_RADIUS}
          y={DISC_CENTER - DISC_RADIUS}
          width={DISC_RADIUS * 2}
          height={DISC_RADIUS * 2}
        >
          <div xmlns="http://www.w3.org/1999/xhtml" className="dso-logo-shine" />
        </foreignObject>
      </g>

      <circle
        cx="100"
        cy="100"
        r="31"
        fill="#14111f"
        stroke="#c4b5fd"
        strokeWidth="1.2"
      />

      <text
        x="100"
        y="108"
        textAnchor="middle"
        fontFamily="'Permanent Marker', cursive"
        fontSize="24"
        letterSpacing="0.03em"
      >
        <tspan fill="#fff">D</tspan>
        <tspan fill="#c4b5fd">S</tspan>
        <tspan fill="#fff">O</tspan>
      </text>
    </svg>
  );
}
