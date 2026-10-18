/**
 * src/components/drugs/home/SearchHistoryList.jsx
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

import { Clock, X, Tag, FlaskConical, Layers } from 'lucide-react'

const MODE_META = {
  brand:   { label: 'Brand',   icon: Tag,          color: 'var(--color-accent)' },
  generic: { label: 'Generic', icon: FlaskConical, color: 'var(--color-generic)' },
  class:   { label: 'Class',   icon: Layers,       color: 'var(--color-class)' },
}

export default function SearchHistoryList({
  history, onPick, onRemove, onClear,
  heading = 'Recent searches', showClear = true, showRemove = true,
}) {
  if (history.length === 0) return null

  return (
    <div>
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
        {history.map(entry => {
          const meta = MODE_META[entry.mode] ?? MODE_META.brand
          return (
            <div
              key={`${entry.mode}:${entry.text.toLowerCase()}`}
              style={{
                display:      'flex',
                alignItems:   'center',
                borderBottom: '1px solid var(--color-border)',
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
                <Clock size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                <span
                  dir="auto"
                  style={{
                    flex: 1, minWidth: 0, fontSize: 15, color: 'var(--color-text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {entry.text}
                </span>
                <span style={{
                  flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 500, color: meta.color,
                }}>
                  <meta.icon size={12} strokeWidth={2} />
                  {meta.label}
                </span>
              </button>
              {showRemove && (
              <button
                onClick={() => onRemove(entry)}
                aria-label={`Remove ${entry.text} from recent searches`}
                style={{
                  flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                  padding: 10, color: 'var(--color-text-tertiary)', display: 'flex',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <X size={15} />
              </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
