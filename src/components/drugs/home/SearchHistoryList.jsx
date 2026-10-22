/**
 * 2026-10-23 (UI refresh): the X on each row is now an arrow pointing up and right that opens the
 * search, the same as tapping the row (so a single search can no longer be removed; Clear all stays).
 * The mode tag is quieter: no fill behind it, a softer colour, lighter text. 'onRemove' is no longer used.
 *
 * 2026-10-22 (UI refresh plan, step 8.4a): no card; the list sits plain on the page, right under
 * the header. Heading and Clear all, then rows with thin lines between: clock icon, the search
 * text, a small mode tag in the mode's own tint, and the remove button. Same props and behaviour.
 *
 * src/components/drugs/home/SearchHistoryList.jsx
 * 2026-10-21 (step 11.7): new 'allowClass' setting (default true); false hides the Class entries.
 * The rows were already flat with thin lines, so the look is unchanged.
 *
 * 2026-10-18 (Omar): 'Clear all' is red (the app's danger colour), and the mode
 * tag on each row is the mode's own icon and name in the mode's colour, with no
 * pill behind it (same icons as the mode menu: Tag, FlaskConical, Layers).
 *
 * 2026-10-15: the empty message moved to DrugsScreen (same look as the other search
 * states). 'heading', 'showClear' and 'showRemove' let the same rows serve as the short
 * hints under the typed text (no Clear all, no X).
 *
 * 2026-10-14: shown in the results area while the search box is open and empty.
 * Each row is a previous search (with the mode it was typed in); tapping it runs it
 * again at once, in that mode. The small X removes one row, 'Clear all' empties the list.
 */

import { Clock, ArrowUpRight, Tag, FlaskConical, Layers } from 'lucide-react'

const MODE_META = {
  brand:   { label: 'Brand',   icon: Tag,          color: 'var(--color-accent)',  tint: 'var(--color-accent-light)' },
  generic: { label: 'Generic', icon: FlaskConical, color: 'var(--color-generic)', tint: 'var(--color-generic-light)' },
  class:   { label: 'Class',   icon: Layers,       color: 'var(--color-class)',   tint: 'var(--color-class-light)' },
}

export default function SearchHistoryList({
  history: fullHistory, onPick, onClear,
  heading = 'Recent searches', showClear = true, showRemove = true,
  allowClass = true,
}) {
  // Without Class (step 11.7) the Class searches are left out of the list.
  const history = allowClass ? fullHistory : fullHistory.filter(entry => entry.mode !== 'class')
  if (history.length === 0) return null

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '4px 2px 8px',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          {heading}
        </span>
        {showClear && (
        <button
          onClick={onClear}
          style={{
            background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, color: 'var(--color-danger)',
            fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent',
          }}
        >
          Clear all
        </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {history.map((entry, i) => {
          const meta = MODE_META[entry.mode] ?? MODE_META.brand
          return (
            <div
              key={`${entry.mode}:${entry.text.toLowerCase()}`}
              style={{
                display:      'flex',
                alignItems:   'center',
                borderBottom: i === history.length - 1 ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <button
                onClick={() => onPick(entry)}
                style={{
                  flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 2px', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'var(--font-body)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Clock size={18} strokeWidth={1.8} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                <span
                  dir="auto"
                  style={{
                    flex: 1, minWidth: 0, fontSize: 16, color: 'var(--color-text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {entry.text}
                </span>
                <span style={{
                  flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 500,
                  color: `color-mix(in srgb, ${meta.color} 70%, var(--color-text-tertiary))`,
                }}>
                  <meta.icon size={11} strokeWidth={1.8} />
                  {meta.label}
                </span>
              </button>
              {showRemove && (
              <button
                onClick={() => onPick(entry)}
                aria-label={`Search ${entry.text} again`}
                style={{
                  flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                  padding: 10, color: 'var(--color-text-tertiary)', display: 'flex',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <ArrowUpRight size={18} strokeWidth={1.8} />
              </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
