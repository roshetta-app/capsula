/**
 * src/components/drugs/groups/folderStyles.js
 * 2026-10-22 (UI refresh plan, steps 8.10 to 8.12): the numbers the folder shape shares across the
 * group screens (states, group page, shared group page). Kept apart from FolderShell.jsx so the
 * component file only exports a component. The group card (GroupTile.jsx, step 8.9) has its own
 * copy of the same measurements.
 */

export const FOLDER_TAB_WIDTH = 66
export const FOLDER_TAB_HEIGHT = 14
export const FOLDER_BODY_RADIUS = '0 20px 20px 20px'

// A wash of a colour over the surface colour: one opaque fill, so tab and body show no seam.
export function folderWash(fg) {
  return `color-mix(in srgb, ${fg} 8%, var(--color-surface))`
}

// The plain grey wash used by the state messages and the New group card.
export const FOLDER_GREY_WASH = 'color-mix(in srgb, var(--color-text-primary) 5%, var(--color-bg))'

// Readable count text in a group's own colour (light and dark).
export function folderCountColor(fg) {
  return `color-mix(in srgb, ${fg} 72%, var(--color-text-primary))`
}
