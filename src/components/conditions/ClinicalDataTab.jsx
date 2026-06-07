import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import ImageGallery from './ImageGallery'

/**
 * ClinicalDataTab — collapsible clinical data sections for a condition.
 *
 * Props:
 *   condition  ConditionFull
 *
 * Five sections (all start expanded, toggle independently):
 *   1. Clinical Picture   — <p dir="auto">
 *   2. History Questions  — <ul> of strings
 *   3. Examination        — <ul> of strings
 *   4. Investigations     — list of { test (bold), note (muted) }
 *   5. Images             — ImageGallery (only if images.length > 0)
 *
 * Sections with no data are hidden entirely.
 */
export default function ClinicalDataTab({ condition }) {
  // Track collapsed state per section key; default all open (false = not collapsed)
  const [collapsed, setCollapsed] = useState({
    clinical:      false,
    history:       false,
    examination:   false,
    investigations: false,
    images:        false,
  })

  function toggle(key) {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const {
    clinicalPicture,
    historyQuestions = [],
    examination      = [],
    investigations   = [],
    images           = [],
  } = condition

  const hasAnything =
    clinicalPicture ||
    historyQuestions.length ||
    examination.length ||
    investigations.length ||
    images.length

  if (!hasAnything) {
    return (
      <div style={{
        textAlign: 'center',
        padding: 'var(--space-12) var(--space-4)',
        color: 'var(--color-text-tertiary)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 'var(--space-2)' }}>
          No clinical data added yet
        </div>
        <div style={{ fontSize: 12 }}>
          Add clinical information via the admin CMS
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

      {/* 1 — Clinical Picture */}
      {clinicalPicture && (
        <Section
          title="Clinical Picture"
          sectionKey="clinical"
          collapsed={collapsed.clinical}
          onToggle={toggle}
        >
          <p
            dir="auto"
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: 'var(--color-text-primary)',
              whiteSpace: 'pre-line',
            }}
          >
            {clinicalPicture}
          </p>
        </Section>
      )}

      {/* 2 — History Questions */}
      {historyQuestions.length > 0 && (
        <Section
          title="History Questions"
          sectionKey="history"
          collapsed={collapsed.history}
          onToggle={toggle}
        >
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {historyQuestions.map((q, i) => (
              <li
                key={i}
                dir="auto"
                style={{
                  fontSize: 14,
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.5,
                  paddingLeft: 'var(--space-4)',
                  position: 'relative',
                }}
              >
                <span style={{
                  position: 'absolute',
                  left: 0,
                  color: 'var(--color-accent)',
                  fontWeight: 700,
                  lineHeight: 1.5,
                }}>
                  ·
                </span>
                {q}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 3 — Examination */}
      {examination.length > 0 && (
        <Section
          title="Examination"
          sectionKey="examination"
          collapsed={collapsed.examination}
          onToggle={toggle}
        >
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {examination.map((item, i) => (
              <li
                key={i}
                dir="auto"
                style={{
                  fontSize: 14,
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.5,
                  paddingLeft: 'var(--space-4)',
                  position: 'relative',
                }}
              >
                <span style={{
                  position: 'absolute',
                  left: 0,
                  color: 'var(--color-accent)',
                  fontWeight: 700,
                  lineHeight: 1.5,
                }}>
                  ·
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 4 — Investigations */}
      {investigations.length > 0 && (
        <Section
          title="Investigations"
          sectionKey="investigations"
          collapsed={collapsed.investigations}
          onToggle={toggle}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {investigations.map((inv, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                }}
              >
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.4,
                  marginBottom: inv.note ? 3 : 0,
                }}>
                  {inv.test}
                </div>
                {inv.note && (
                  <div
                    dir="auto"
                    style={{
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    {inv.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 5 — Images */}
      {images.length > 0 && (
        <Section
          title={`Images (${images.length})`}
          sectionKey="images"
          collapsed={collapsed.images}
          onToggle={toggle}
        >
          <ImageGallery images={images} />
        </Section>
      )}

    </div>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

/**
 * Collapsible section wrapper.
 *
 * Props:
 *   title       — string
 *   sectionKey  — key into the collapsed state object
 *   collapsed   — boolean
 *   onToggle    — (key) => void
 *   children    — section content
 */
function Section({ title, sectionKey, collapsed, onToggle, children }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
    }}>
      {/* Header row — tappable */}
      <button
        onClick={() => onToggle(sectionKey)}
        aria-expanded={!collapsed}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-4)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          borderBottom: collapsed ? 'none' : '1px solid var(--color-border-subtle)',
          transition: 'border-color 0.15s ease',
        }}
      >
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-text-tertiary)',
        }}>
          {title}
        </span>
        {collapsed
          ? <ChevronRight size={16} color="var(--color-text-tertiary)" strokeWidth={2} />
          : <ChevronDown  size={16} color="var(--color-text-tertiary)" strokeWidth={2} />
        }
      </button>

      {/* Content — hidden when collapsed */}
      {!collapsed && (
        <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-4)' }}>
          {children}
        </div>
      )}
    </div>
  )
}
