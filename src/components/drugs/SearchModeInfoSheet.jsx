/**
 * src/components/drugs/SearchModeInfoSheet.jsx
 *
 * 2026-10-04: opened from the info icon next to the 'Search mode' title on the
 * Drugs screen (see DrugsScreen.jsx). A quick visual cheat sheet for the three
 * search modes, built to be scanned, not read:
 *   - Brand   -> Controloc
 *   - Generic -> Pantoprazole
 *   - Class   -> Proton pump inhibitor
 * Flat layout, drawn straight on the white sheet with no cards: each mode is
 * its name (bold, with a small accent icon, followed by a plain 'mode') and, below it, the example term in
 * a quiet, neutral pill that looks like a search field. Thin dividers sit
 * between the three modes. No subtitles. Each mode has its own
 * accent: Brand blue, Generic green, Class violet (theme variables, so light
 * and dark mode follow automatically). One small hint at the bottom explains
 * how to narrow Brand and Generic searches, in a subtle card with its two
 * examples as small tags.
 *
 * Redesign: replaces the earlier version that showed real drug cards, a
 * highlighted-match explanation per mode, and a long footnote. Nothing here
 * explains how search works internally, and there is nothing to load, so the
 * sheet works offline.
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

// One section per mode, drawn flat on the sheet: the mode name with its small
// accent icon, then the example in a search-bar pill. No card behind it.
function ModeSection({ icon: Icon, title, example, color }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={18} color={color} aria-hidden="true" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 16, lineHeight: 1.25, color: 'var(--color-text-primary)' }}>
          <span style={{ fontWeight: 700 }}>{title}</span>
          <span style={{ fontWeight: 400 }}> mode</span>
        </span>
      </div>

      {/* The example: the focal point of the section. */}
      <div style={{
        display:         'flex',
        alignItems:      'center',
        gap:             10,
        height:          44,
        marginTop:       'var(--space-3)',
        padding:         '0 var(--space-4)',
        borderRadius:    'var(--radius-full)',
        backgroundColor: 'var(--color-surface-muted)',
      }}>
        <Search size={16} color={color} aria-hidden="true" style={{ flexShrink: 0 }} />
        <span style={{
          fontSize:     15,
          fontWeight:   400,
          color:        'var(--color-text-primary)',
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
        }}>
          {example}
        </span>
      </div>
    </div>
  )
}

// Thin line between the three modes.
function Divider() {
  return <div style={{ height: 1, backgroundColor: 'var(--color-border)' }} />
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
      {/* Fixed header: title, subtitle and close button. */}
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
            <p style={{
              fontSize:   14,
              lineHeight: 1.4,
              color:      'var(--color-text-secondary)',
              margin:     '4px 0 0',
            }}>
              Choose what you want to search for.
            </p>
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
        gap:           'var(--space-4)',
      }}>
        <ModeSection
          icon={Tag}
          title="Brand"
          example="Controloc"
          color="var(--color-accent)"
        />
        <Divider />
        <ModeSection
          icon={FlaskConical}
          title="Generic"
          example="Pantoprazole"
          color="var(--color-generic)"
        />
        <Divider />
        <ModeSection
          icon={Layers}
          title="Class"
          example="Proton pump inhibitor"
          color="var(--color-class)"
        />

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
