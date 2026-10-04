/**
 * src/components/drugs/SearchModeInfoSheet.jsx
 *
 * 2026-10-04: opened from the info icon next to the 'Search mode' title on the
 * Drugs screen (see DrugsScreen.jsx). A quick visual cheat sheet for the three
 * search modes, built to be scanned, not read.
 *
 * 2026-10-04 (phase D2, compact rows + more examples): each mode is one row
 * with a small tinted icon tile (Brand blue, Generic green, Class violet,
 * theme variables so light and dark follow automatically), the mode name, and
 * three example searches as small search-bar pills that wrap onto a second
 * line when the screen is narrow. Class has an extra line saying names and
 * everyday words both work (keyword search). The subtitle and the word 'mode'
 * are gone. One small hint card at the bottom explains how to narrow Brand and
 * Generic searches. Nothing here explains how search works internally, and
 * there is nothing to load, so the sheet works offline.
 *
 * Shell (title + close button pinned, body scrolls if the screen is short) is
 * built on SheetShell.jsx like every other sheet.
 *
 * Props:
 *   isOpen   boolean
 *   onClose  () => void
 *
 * The caller may still pass 'categories' and 'isDark'. They are no longer
 * needed and are ignored, so DrugsScreen.jsx does not have to change.
 */

import { Tag, FlaskConical, Layers, Search, Lightbulb } from 'lucide-react'
import SheetShell from '../ui/SheetShell'

// One row per mode: a tinted icon tile, the mode name, then its example
// searches as small search-bar pills (they wrap if the screen is narrow), and
// an optional one-line note.
function ModeRow({ icon: Icon, title, examples, note, color, tint, first = false }) {
  return (
    <div style={{
      display:   'flex',
      gap:       12,
      padding:   'var(--space-3) 0',
      borderTop: first ? 'none' : '1px solid var(--color-border)',
    }}>
      <span
        aria-hidden="true"
        style={{
          width:           34,
          height:          34,
          borderRadius:    10,
          backgroundColor: tint,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
        }}
      >
        <Icon size={17} strokeWidth={1.9} color={color} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, color: 'var(--color-text-primary)', marginTop: 6 }}>
          {title}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'var(--space-2)' }}>
          {examples.map(ex => (
            <span
              key={ex}
              style={{
                display:         'inline-flex',
                alignItems:      'center',
                gap:             6,
                maxWidth:        '100%',
                height:          30,
                padding:         '0 12px',
                borderRadius:    'var(--radius-full)',
                backgroundColor: 'var(--color-surface-muted)',
                fontSize:        13.5,
                color:           'var(--color-text-primary)',
                boxSizing:       'border-box',
              }}
            >
              <Search size={13} color={color} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex}</span>
            </span>
          ))}
        </div>
        {note && (
          <div style={{ fontSize: 12.5, lineHeight: 1.4, color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
            {note}
          </div>
        )}
      </div>
    </div>
  )
}

// A small tag-style example query used in the hint.
function QueryTag({ children }) {
  return (
    <span style={{
      display:         'inline-block',
      padding:         '5px 12px',
      borderRadius:    'var(--radius-full)',
      backgroundColor: 'var(--color-surface)',
      fontSize:        12,
      fontWeight:      500,
      color:           'var(--color-text-primary)',
      whiteSpace:      'nowrap',
    }}>
      {children}
    </span>
  )
}

export default function SearchModeInfoSheet({ isOpen, onClose }) {
  return (
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="How search works" maxHeight="85dvh">
      {/* Fixed header: title and close button. */}
      <div style={{ flexShrink: 0, padding: '0 var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div style={{
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          gap:            'var(--space-2)',
        }}>
          <div>
            <h2 style={{
              fontSize:   20,
              fontWeight: 700,
              lineHeight: 1.25,
              color:      'var(--color-text-primary)',
              margin:     0,
            }}>
              How search works
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              width:                   28,
              height:                  28,
              borderRadius:            '50%',
              background:              'none',
              border:                  'none',
              cursor:                  'pointer',
              color:                   'var(--color-text-tertiary)',
              WebkitTapHighlightColor: 'transparent',
              flexShrink:              0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Body. Scrolls only if the screen is too short to fit everything. */}
      <div style={{
        flex:          1,
        overflowY:     'auto',
        padding:       '0 var(--space-4) var(--space-6)',
        display:       'flex',
        flexDirection: 'column',
        gap:           'var(--space-2)',
      }}>
        <div>
          <ModeRow
            first
            icon={Tag}
            title="Brand"
            examples={['Controloc', 'Augmentin', 'Panadol']}
            color="var(--color-accent)"
            tint="var(--color-accent-light)"
          />
          <ModeRow
            icon={FlaskConical}
            title="Generic"
            examples={['Pantoprazole', 'Amoxicillin', 'Paracetamol']}
            color="var(--color-generic)"
            tint="color-mix(in srgb, var(--color-generic) 14%, transparent)"
          />
          <ModeRow
            icon={Layers}
            title="Class"
            examples={['Proton pump inhibitor', 'vomiting', 'allergy']}
            note="Names or everyday words."
            color="var(--color-class)"
            tint="color-mix(in srgb, var(--color-class) 14%, transparent)"
          />
        </div>

        {/* Hint: a subtle card, not a fourth mode. The examples sit on their own
            line as small query tags. */}
        <div style={{
          display:         'flex',
          alignItems:      'flex-start',
          gap:             10,
          marginTop:       'var(--space-3)',
          padding:         'var(--space-3) var(--space-4)',
          borderRadius:    'var(--radius-lg)',
          backgroundColor: 'var(--color-surface-muted)',
        }}>
          <Lightbulb size={16} color="var(--color-accent)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Narrow your search
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Add a strength or form when needed:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'var(--space-2)' }}>
              <QueryTag>Controloc 40 mg</QueryTag>
              <QueryTag>Pantoprazole tablet</QueryTag>
            </div>
          </div>
        </div>
      </div>
    </SheetShell>
  )
}
