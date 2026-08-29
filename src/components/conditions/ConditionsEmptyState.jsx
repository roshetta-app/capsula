/**
 * src/components/conditions/ConditionsEmptyState.jsx
 *
 * Empty state shown when:
 *   - Search query returns 0 results
 *   - Specialty filter has 0 conditions (edge case, admin data gap)
 *
 * conditions-empty-state-redesign (2026-08-30): restyled to match the
 * icon + headline + subtext + filled-button look already used by every
 * search-hint state on the Drugs screen (DrugsScreen.jsx's EmptyState,
 * DidYouMeanState, etc.) — icon is now full-opacity (was faded to 0.5),
 * the headline is plain-weight in the primary text color (was bold in the
 * secondary color), and the action buttons are the same solid accent-
 * filled pill (FilledHintButton, copied in below) instead of underlined
 * plain-text links, so this screen's empty state no longer looks like a
 * different app from Drugs' search results.
 *
 * Props:
 *   query           string  — current search term (may be empty string)
 *   activeSpecialty string  — 'all' | specialty id
 *   specialtyName   string  — display name for the active specialty
 *   onClearSearch   function — called to clear the query field
 *   onClearFilter   function — called to reset specialty to 'all'
 */
import { useState } from 'react'
import { Search } from 'lucide-react'

// ─── FilledHintButton ───────────────────────────────────────────────────────
// Same filled/bordered accent-color treatment as DrugsScreen.jsx's own
// FilledHintButton (Phase 5, §4.3/§5d there) — copied here rather than
// imported since DrugsScreen.jsx doesn't export it and this is the only
// place Conditions needs it today. Keep both in sync if that shared style
// ever changes.
function FilledHintButton({ onClick, children }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        cursor: 'pointer',
        border: '1.5px solid var(--color-accent)',
        backgroundColor: 'var(--color-accent)',
        color: '#fff',
        fontSize: 13, fontWeight: 600,
        fontFamily: 'var(--font-body)',
        padding: '6px 12px',
        borderRadius: 'var(--radius-md)',
        lineHeight: 1,
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        transition: 'transform 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

export default function ConditionsEmptyState({
  query,
  activeSpecialty,
  specialtyName,
  onClearSearch,
  onClearFilter,
}) {
  const isSearchEmpty = query.trim().length >= 2
  const isFilterEmpty = activeSpecialty !== 'all' && !isSearchEmpty

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      textAlign:     'center',
      padding:       'var(--space-12) var(--space-4)',
      gap:           'var(--space-3)',
    }}>
      {/* Icon */}
      <Search
        size={28}
        color="var(--color-text-tertiary)"
        aria-hidden="true"
      />

      {/* Primary message */}
      <div style={{ fontSize: 15, color: 'var(--color-text-primary)' }}>
        {isSearchEmpty
          ? <>No results for <em>"{query.trim()}"</em></>
          : isFilterEmpty
            ? `No conditions in ${specialtyName}`
            : 'No conditions found'
        }
      </div>

      {/* Secondary suggestion */}
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
        {isSearchEmpty
          ? 'Try a shorter term, a symptom, or check the spelling'
          : 'Try removing the specialty filter'
        }
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {isSearchEmpty && (
          <FilledHintButton onClick={onClearSearch}>
            Clear search
          </FilledHintButton>
        )}
        {activeSpecialty !== 'all' && (
          <FilledHintButton onClick={onClearFilter}>
            Show all specialties
          </FilledHintButton>
        )}
      </div>
    </div>
  )
}
