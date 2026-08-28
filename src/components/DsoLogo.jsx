import { useId } from "react";

const DISC_RADIUS = 84;
const DISC_CENTER = 100;
const LABEL_RADIUS = 31;
const GROOVE_STEP = 2.1;
const GROOVE_INSET = 3;

function buildGrooveRadii() {
  const radii = [];
  const maxRadius = DISC_RADIUS - GROOVE_INSET;
  const minRadius = LABEL_RADIUS + GROOVE_INSET;

  for (let radius = maxRadius; radius >= minRadius; radius -= GROOVE_STEP) {
    radii.push(Number(radius.toFixed(2)));
  }

  return radii;
}

const GROOVE_RADII = buildGrooveRadii();

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

      <g stroke="#a78bfa" strokeWidth="0.7">
        {GROOVE_RADII.map((radius, index) => (
          <circle
            key={radius}
            cx={DISC_CENTER}
            cy={DISC_CENTER}
            r={radius}
            strokeOpacity={0.16 + (index / Math.max(GROOVE_RADII.length - 1, 1)) * 0.16}
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
        cx={DISC_CENTER}
        cy={DISC_CENTER}
        r={LABEL_RADIUS}
        fill="#14111f"
        stroke="#c4b5fd"
        strokeWidth="1.2"
      />

      <text
        x={DISC_CENTER}
        y={DISC_CENTER + 8}
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
