// Bubble look per flavor. Every colour comes from the app's theme tokens (one dedicated
// token per note type, see globals.css), so the icon, the tint and the Contents dots follow
// light and dark mode automatically. Warning has a stronger tint so it stands apart.
export const NOTE_FLAVORS = {
  info: {
    label: 'Info',
    iconColor: 'var(--color-note-info)',
    bg: 'color-mix(in srgb, var(--color-note-info) 8%, var(--color-note-bg) 92%)',
  },
  warning: {
    label: 'Warning',
    iconColor: 'var(--color-note-warning)',
    bg: 'color-mix(in srgb, var(--color-note-warning) 14%, var(--color-note-bg) 86%)',
  },
  tip: {
    label: 'Tip',
    iconColor: 'var(--color-note-tip)',
    bg: 'color-mix(in srgb, var(--color-note-tip) 9%, var(--color-note-bg) 91%)',
  },
}

// Used by NoteCallout, and by the CMS so its type chips match the app exactly.
export const NOTE_FLAVOR_OPTIONS = Object.entries(NOTE_FLAVORS).map(([value, f]) => ({ value, label: f.label }))
export function noteFlavorColor(flavor) {
  return (NOTE_FLAVORS[flavor] ?? NOTE_FLAVORS.info).iconColor
}
