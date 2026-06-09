import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import BlockRenderer from './BlockRenderer'
import ImageGallery from './ImageGallery'

/**
 * ClinicalDataTab — Phase 2E rebuild.
 *
 * Rendering order:
 *  1. ICD-10 badge (top-right, if icd10Code set)
 *  2. Definition box (always first, before blocks, if definition set)
 *  3. clinical_blocks array — sorted by position, rendered via BlockRenderer
 *     • If clinicalBlocks is empty, fall back to legacy fields (clinicalPicture,
 *       historyQuestions, examination, investigations, images)
 *  4. Bottom plain-text sections: Epidemiology, Prognosis, When to Refer
 *
 * Props:
 *   condition  ConditionFull
 */
export default function ClinicalDataTab({ condition }) {
  const [collapsed, setCollapsed] = useState({})
  function toggle(key) { setCollapsed(prev => ({ ...prev, [key]: !prev[key] })) }

  const {
    definition,
    icd10Code,
    epidemiology,
    prognosis,
    whenToRefer,
    clinicalBlocks   = [],
    // legacy fields
    clinicalPicture,
    historyQuestions = [],
    examination      = [],
    investigations   = [],
    images           = [],
  } = condition

  const hasBlocks  = clinicalBlocks.length > 0
  const hasLegacy  = clinicalPicture || historyQuestions.length || examination.length || investigations.length || images.length
  const hasBottom  = epidemiology || prognosis || whenToRefer
  const hasAnything = definition || hasBlocks || hasLegacy || hasBottom

  if (!hasAnything) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 'var(--space-2)' }}>No clinical data added yet</div>
        <div style={{ fontSize: 12 }}>Add clinical information via the admin CMS</div>
      </div>
    )
  }

  // Sort blocks by position
  const sortedBlocks = [...clinicalBlocks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  return (
    <div style={{ position: 'relative' }}>

      {/* ICD-10 badge — top right */}
      {icd10Code && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          fontSize: 11, fontWeight: 600,
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-tertiary)',
          borderRadius: 'var(--radius-full)',
          padding: '3px 9px',
          letterSpacing: '0.04em',
        }}>
          {icd10Code}
        </div>
      )}

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
        paddingTop: icd10Code ? 'var(--space-8)' : 0,
      }}>

        {/* 1 — Definition box (always first if present) */}
        {definition && (
          <div style={{
            backgroundColor: 'var(--color-accent-light, #EFF6FF)',
            border: '1px solid var(--color-accent)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--color-accent)',
              marginBottom: 'var(--space-2)',
            }}>
              Definition
            </div>
            <p dir="auto" style={{
              margin: 0, fontSize: 14, lineHeight: 1.75,
              color: 'var(--color-text-primary)',
            }}>
              {definition}
            </p>
          </div>
        )}

        {/* 2 — clinical_blocks (new CMS path) */}
        {hasBlocks && sortedBlocks.map(block => (
          <BlockRenderer key={block.id} block={block} images={images} />
        ))}

        {/* 3 — Legacy fallback (old CMS path, shown only when no blocks) */}
        {!hasBlocks && hasLegacy && (
          <>
            {clinicalPicture && (
              <Section title="Clinical Picture" sectionKey="clinical" collapsed={collapsed.clinical} onToggle={toggle}>
                <p dir="auto" style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: 'var(--color-text-primary)', whiteSpace: 'pre-line' }}>
                  {clinicalPicture}
                </p>
              </Section>
            )}

            {historyQuestions.length > 0 && (
              <Section title="History Questions" sectionKey="history" collapsed={collapsed.history} onToggle={toggle}>
                <BulletList items={historyQuestions} />
              </Section>
            )}

            {examination.length > 0 && (
              <Section title="Examination" sectionKey="examination" collapsed={collapsed.examination} onToggle={toggle}>
                <BulletList items={examination} />
              </Section>
            )}

            {investigations.length > 0 && (
              <Section title="Investigations" sectionKey="investigations" collapsed={collapsed.investigations} onToggle={toggle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {investigations.map((inv, i) => (
                    <div key={i} style={{
                      backgroundColor: 'var(--color-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-2) var(--space-3)',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.4, marginBottom: inv.note ? 3 : 0 }}>
                        {inv.test}
                      </div>
                      {inv.note && (
                        <div dir="auto" style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                          {inv.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {images.length > 0 && (
              <Section title={`Images (${images.length})`} sectionKey="images" collapsed={collapsed.images} onToggle={toggle}>
                <ImageGallery images={images} />
              </Section>
            )}
          </>
        )}

        {/* 4 — Bottom fields */}
        {epidemiology && (
          <PlainSection title="Epidemiology" text={epidemiology} />
        )}
        {prognosis && (
          <PlainSection title="Prognosis" text={prognosis} />
        )}
        {whenToRefer && (
          <PlainSection title="When to Refer" text={whenToRefer} />
        )}

      </div>
    </div>
  )
}

// ─── PlainSection — for bottom fields ────────────────────────────────────────

function PlainSection({ title, text }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-3) var(--space-4)',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
        marginBottom: 'var(--space-2)',
      }}>
        {title}
      </div>
      <p dir="auto" style={{
        margin: 0, fontSize: 14, lineHeight: 1.75,
        color: 'var(--color-text-primary)', whiteSpace: 'pre-line',
      }}>
        {text}
      </p>
    </div>
  )
}

// ─── BulletList — legacy bullet list ─────────────────────────────────────────

function BulletList({ items }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {items.map((item, i) => (
        <li key={i} dir="auto" style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.5, paddingLeft: 'var(--space-4)', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, color: 'var(--color-accent)', fontWeight: 700, lineHeight: 1.5 }}>·</span>
          {item}
        </li>
      ))}
    </ul>
  )
}

// ─── Section — collapsible wrapper (legacy path only) ────────────────────────

function Section({ title, sectionKey, collapsed, onToggle, children }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
    }}>
      <button
        onClick={() => onToggle(sectionKey)}
        aria-expanded={!collapsed}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-4)', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'var(--font-body)',
          WebkitTapHighlightColor: 'transparent', outline: 'none',
          borderBottom: collapsed ? 'none' : '1px solid var(--color-border-subtle)',
          transition: 'border-color 0.15s ease',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
          {title}
        </span>
        {collapsed
          ? <ChevronRight size={16} color="var(--color-text-tertiary)" strokeWidth={2} />
          : <ChevronDown  size={16} color="var(--color-text-tertiary)" strokeWidth={2} />
        }
      </button>
      {!collapsed && (
        <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-4)' }}>
          {children}
        </div>
      )}
    </div>
  )
}
