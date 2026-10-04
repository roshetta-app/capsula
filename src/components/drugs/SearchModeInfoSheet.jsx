/**
 * src/components/drugs/SearchModeInfoSheet.jsx
 *
 * 2026-10-04: opened from the info icon next to the 'Search mode' title on the
 * Drugs screen (see DrugsScreen.jsx). A quick visual cheat sheet for the three
 * search modes, built to be scanned, not read:
 *   - Brand:   'Search by medicine brand name'  -> Controloc
 *   - Generic: 'Search by active ingredient'    -> Pantoprazole
 *   - Class:   'Search by drug class or family' -> Proton pump inhibitor
 * Each card has the same structure: icon, mode name, one short line, and the
 * example term in a pill that looks like a search field. One small tip at the
 * bottom explains how to narrow Brand and Generic searches.
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

// One card per mode. Same structure every time, so the eye learns it once.
function ModeCard({ icon: Icon, title, description, example }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface-muted)',
      border:          '1px solid var(--color-border)',
      borderRadius:    'var(--radius-lg)',
      boxShadow:       'var(--shadow-card)',
      padding:         'var(--space-4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{
          width:           40,
          height:          40,
          borderRadius:    'var(--radius-md)',
          backgroundColor: 'var(--color-accent-light)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
        }}>
          <Icon size={20} color="var(--color-accent)" aria-hidden="true" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, color: 'var(--color-text-primary)' }}>
            {title}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {description}
          </div>
        </div>
      </div>

      {/* The example: the focal point of the card. */}
      <div style={{
        display:         'flex',
        alignItems:      'center',
        gap:             10,
        height:          44,
        marginTop:       'var(--space-3)',
        padding:         '0 var(--space-4)',
        borderRadius:    'var(--radius-full)',
        backgroundColor: 'var(--color-surface)',
        boxShadow:       'var(--shadow-card)',
      }}>
        <Search size={16} color="var(--color-text-tertiary)" aria-hidden="true" style={{ flexShrink: 0 }} />
        <span style={{
          fontSize:     16,
          fontWeight:   600,
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
        gap:           'var(--space-3)',
      }}>
        <ModeCard
          icon={Tag}
          title="Brand"
          description="Search by medicine brand name"
          example="Controloc"
        />
        <ModeCard
          icon={FlaskConical}
          title="Generic"
          description="Search by active ingredient"
          example="Pantoprazole"
        />
        <ModeCard
          icon={Layers}
          title="Class"
          description="Search by drug class or family"
          example="Proton pump inhibitor"
        />

        {/* Tip: smaller and tinted, so it reads as a side note, not a fourth mode. */}
        <div style={{
          display:         'flex',
          alignItems:      'flex-start',
          gap:             'var(--space-3)',
          marginTop:       'var(--space-1)',
          padding:         'var(--space-3) var(--space-4)',
          borderRadius:    'var(--radius-lg)',
          backgroundColor: 'var(--color-accent-light)',
        }}>
          <Lightbulb size={18} color="var(--color-accent)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Narrow your search
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Add a strength or form when needed:{' '}
              <strong style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Controloc 40 mg</strong>
              {' · '}
              <strong style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Pantoprazole tablet</strong>
            </div>
          </div>
        </div>
      </div>
    </SheetShell>
  )
}
