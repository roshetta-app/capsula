/**
 * src/utils/edgeSwipe.js
 * 2026-11-21 (step 12.12, K30): on an iPhone installed app the swipe from the screen's left or
 * right edge is the system's Back. A screen with its own sideways swipe (the Favourites tabs)
 * must not also react to a touch that starts on that edge strip, or one swipe does both.
 * Plain rule, no React, so the checks run it on its own.
 */

/** Width in pixels of the strip at each screen edge that belongs to the system swipe. */
export const EDGE_SWIPE_STRIP = 24

/** True when a touch that starts at `x` (in a screen `width` pixels wide) is on an edge strip. */
export function startsAtScreenEdge(x, width, strip = EDGE_SWIPE_STRIP) {
  if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0) return false
  return x < strip || x > width - strip
}
