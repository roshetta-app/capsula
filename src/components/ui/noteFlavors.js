// Bubble look per flavor. Every colour comes from the app's theme tokens, so
// the icon and the tint follow light and dark mode automatically (the icon
// used to keep its light-mode colour in dark mode). Warning has a stronger
// tint so it stands apart from Info and Tip.
export const NOTE_FLAVORS = {
  info: {
    label: 'Info',
    iconColor: 'var(--color-note-info)',
    bg: 'color-mix(in srgb, var(--color-note-info) 7%, var(--color-note-bg) 93%)',
  },
  warning: {
    label: 'Warning',
    iconColor: 'var(--color-warning)',
    bg: 'color-mix(in srgb, var(--color-warning) 13%, var(--color-note-bg) 87%)',
  },
  tip: {
    label: 'Tip',
    iconColor: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 8%, var(--color-note-bg) 92%)',
  },
}

// Used by NoteCallout, and by the CMS so its type chips match the app exactly.
export const NOTE_FLAVOR_OPTIONS = Object.entries(NOTE_FLAVORS).map(([value, f]) => ({ value, label: f.label }))
export function noteFlavorColor(flavor) {
  return (NOTE_FLAVORS[flavor] ?? NOTE_FLAVORS.info).iconColor
}
