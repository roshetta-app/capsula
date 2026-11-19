/**
 * src/components/home/FeaturedCapsuleArt.jsx
 * 2026-11-16 (Phase J step 11.1): the capsule picture on the featured card. A plain SVG (no image
 * file, no text in it), drawn with soft gradients and a small shadow so it reads as a 3D capsule.
 * Decorative: hidden from screen readers and it never takes a tap.
 */

export default function FeaturedCapsuleArt({ size = 112 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 112 112" aria-hidden="true" focusable="false"
      style={{ display: 'block', pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="fca-white" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D7E2F5" />
        </linearGradient>
        <linearGradient id="fca-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4F8DF7" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <clipPath id="fca-clip"><rect x="8" y="34" width="96" height="44" rx="22" /></clipPath>
      </defs>
      <ellipse cx="58" cy="96" rx="34" ry="5" fill="#0B1F4D" opacity="0.16" />
      <g transform="rotate(-38 56 56)">
        <g clipPath="url(#fca-clip)">
          <rect x="8" y="34" width="48" height="44" fill="url(#fca-white)" />
          <rect x="56" y="34" width="48" height="44" fill="url(#fca-blue)" />
          <rect x="54" y="34" width="4" height="44" fill="#0B1F4D" opacity="0.12" />
        </g>
        <rect x="18" y="39" width="72" height="7" rx="3.5" fill="#FFFFFF" opacity="0.55" />
      </g>
    </svg>
  )
}
