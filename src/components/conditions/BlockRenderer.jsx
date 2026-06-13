import ImageCarousel from './ImageCarousel'

/**
 * BlockRenderer — renders a single clinical block based on its type.
 *
 * Phase 2E spec block types:
 *   clinical_picture  → plain text, header "Clinical Picture"
 *   examination       → plain text, header "Examination"
 *   red_flags         → list with red left border, header "Red Flags ⚠️"
 *   investigations    → plain text/list, header "Investigations"
 *   management        → plain text, header "Management"
 *   differential      → list of condition names, header "Differential Diagnosis"
 *   note              → yellow-tinted NB box, optional label
 *   image_gallery     → ImageGallery component (thumbnail strip + portal lightbox)
 *   prescription      → structured Rx block: intro + sections (bullets or drug lists) + footer
 *
 * Props:
 *   block   { id, type, position, content }
 *   images  condition images array (for image_gallery blocks)
 */
export default function BlockRenderer({ block, images = [] }) {
  const { type, content } = block

  switch (type) {
    case 'clinical_picture':
      return <TextBlock title="Clinical Picture" text={content?.text} />

    case 'examination':
      return <TextBlock title="Examination" text={content?.text} />

    case 'investigations':
      return <TextBlock title="Investigations" text={content?.text} />

    case 'management':
      return <TextBlock title="Management" text={content?.text} />

    case 'red_flags':
      return <RedFlagsBlock items={content?.items ?? []} />

    case 'differential':
      return <ListBlock title="Differential Diagnosis" items={content?.items ?? []} />

    case 'note':
      return <NoteBlock label={content?.label} text={content?.text} />

    case 'prescription':
      return <PrescriptionBlock content={content} />

    case 'image_gallery': {
      if (!images.length) return null
      return (
        <div style={{ ...blockWrap }}>
          <SectionTitle>Images</SectionTitle>
          <ImageCarousel images={images} />
        </div>
      )
    }

    default:
      return null
  }
}

// ─── PrescriptionBlock ────────────────────────────────────────────────────────
//
// content shape:
// {
//   intro:    string                          — opening statement (optional)
//   sections: [
//     {
//       label: string                         — section heading (optional)
//       kind:  'bullets' | 'drugs' | 'text'
//       items: string[]                       — for kind='bullets'
//       drugs: [{ name, dose }]              — for kind='drugs'
//       text:  string                         — for kind='text'
//     }
//   ]
//   footer:   string                          — closing line e.g. duration (optional)
// }

function PrescriptionBlock({ content }) {
  if (!content) return null
  const { intro, sections = [], footer } = content

  return (
    <div style={blockWrap}>
      <SectionTitle>Rx — Prescription</SectionTitle>

      {/* Intro statement */}
      {intro ? (
        <p dir="auto" style={{
          margin: '0 0 14px',
          fontSize: 14,
          lineHeight: 1.7,
          color: 'var(--color-text-primary)',
          fontStyle: 'italic',
        }}>
          {intro}
        </p>
      ) : null}

      {/* Sections */}
      {sections.map((section, si) => (
        <div key={si} style={{ marginBottom: 16 }}>

          {/* Section label / heading */}
          {section.label ? (
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
              letterSpacing: '0.03em',
              marginBottom: 8,
              paddingBottom: 4,
              borderBottom: '0.5px solid var(--color-border)',
            }}>
              {section.label}
            </div>
          ) : null}

          {/* Bullet list */}
          {section.kind === 'bullets' && (section.items ?? []).length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {section.items.map((item, ii) => (
                <li key={ii} dir="auto" style={{
                  fontSize: 14, lineHeight: 1.6,
                  color: 'var(--color-text-primary)',
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  <span style={{
                    color: 'var(--color-accent)', fontWeight: 700,
                    flexShrink: 0, marginTop: 2, fontSize: 12,
                  }}>»</span>
                  {item}
                </li>
              ))}
            </ul>
          )}

          {/* Drug list — name bold + dosage muted + OR separators */}
          {section.kind === 'drugs' && (section.drugs ?? []).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {section.drugs.map((drug, di) => (
                <div key={di}>
                  {/* OR separator between drugs */}
                  {di > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      margin: '8px 0',
                    }}>
                      <div style={{ flex: 1, height: '0.5px', backgroundColor: 'var(--color-border)' }} />
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: 'var(--color-text-tertiary)',
                        letterSpacing: '0.08em',
                      }}>OR</span>
                      <div style={{ flex: 1, height: '0.5px', backgroundColor: 'var(--color-border)' }} />
                    </div>
                  )}
                  {/* Drug name */}
                  <p dir="auto" style={{
                    margin: 0,
                    fontSize: 14, fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.5,
                  }}>
                    {drug.name}
                  </p>
                  {/* Dosage */}
                  {drug.dose ? (
                    <p dir="auto" style={{
                      margin: '2px 0 0',
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                    }}>
                      {drug.dose}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* Plain text section */}
          {section.kind === 'text' && section.text ? (
            <p dir="auto" style={{
              margin: 0, fontSize: 14, lineHeight: 1.7,
              color: 'var(--color-text-primary)', whiteSpace: 'pre-line',
            }}>
              {section.text}
            </p>
          ) : null}
        </div>
      ))}

      {/* Footer — e.g. duration of treatment */}
      {footer ? (
        <div style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '0.5px solid var(--color-border)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
        }}>
          {footer}
        </div>
      ) : null}
    </div>
  )
}

// ─── TextBlock ────────────────────────────────────────────────────────────────

function TextBlock({ title, text }) {
  if (!text) return null
  return (
    <div style={blockWrap}>
      <SectionTitle>{title}</SectionTitle>
      <p dir="auto" style={{
        margin: 0, fontSize: 14, lineHeight: 1.75,
        color: 'var(--color-text-primary)', whiteSpace: 'pre-line',
      }}>
        {text}
      </p>
    </div>
  )
}

// ─── RedFlagsBlock ────────────────────────────────────────────────────────────

function RedFlagsBlock({ items }) {
  if (!items.length) return null
  return (
    <div style={{
      ...blockWrap,
      borderLeft: '3px solid #DC2626',
      backgroundColor: '#FEF2F2',
    }}>
      <SectionTitle style={{ color: '#DC2626' }}>Red Flags ⚠️</SectionTitle>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {items.map((item, i) => (
          <li key={i} dir="auto" style={{
            fontSize: 14, lineHeight: 1.5,
            color: '#991B1B',
            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
          }}>
            <span style={{ color: '#DC2626', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── ListBlock ────────────────────────────────────────────────────────────────

function ListBlock({ title, items }) {
  if (!items.length) return null
  return (
    <div style={blockWrap}>
      <SectionTitle>{title}</SectionTitle>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {items.map((item, i) => (
          <li key={i} dir="auto" style={{
            fontSize: 14, lineHeight: 1.5,
            color: 'var(--color-text-primary)',
            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
          }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── NoteBlock ────────────────────────────────────────────────────────────────

function NoteBlock({ label, text }) {
  if (!text) return null
  return (
    <div style={{
      ...blockWrap,
      backgroundColor: '#FFFBEB',
      borderLeft: '3px solid #D97706',
    }}>
      {label && (
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: '#92400E',
          marginBottom: 'var(--space-1)',
        }}>
          {label}
        </div>
      )}
      <p dir="auto" style={{
        margin: 0, fontSize: 14, lineHeight: 1.7,
        color: '#78350F', whiteSpace: 'pre-line',
      }}>
        {text}
      </p>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const blockWrap = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-3) var(--space-4)',
  boxShadow: 'var(--shadow-card)',
  marginBottom: 'var(--space-3)',
}

function SectionTitle({ children, style = {} }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
      marginBottom: 'var(--space-2)',
      ...style,
    }}>
      {children}
    </div>
  )
}
