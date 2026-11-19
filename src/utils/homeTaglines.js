// The rotating line under the welcome heading on Home. 2026-11-16 (Phase J, step 11.1): the three
// lines the Topics screen used to rotate (taken from the app's own history), brought back on Home.
// Plain rules only; the screen part is components/home/HomeTagline.jsx.

export const HOME_TAGLINES = Object.freeze([
  'Treat With Confidence',
  'Medicine At Your Fingertips',
  'The Clinic In Your Pocket',
])

export const TAGLINE_VISIBLE_MS = 6500 // each line stays this long
export const TAGLINE_FADE_MS = 400     // the crossfade between two lines

// The line after the one showing; wraps to the first. Anything that is not a valid position starts at 0.
export function nextTaglineIndex(index, count = HOME_TAGLINES.length) {
  if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1) return 0
  if (index < 0 || index >= count) return 0
  return (index + 1) % count
}
