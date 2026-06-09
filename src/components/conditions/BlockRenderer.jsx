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

    case 'image_gallery': {
      // All images belong to the condition — render them all.
      // Uses ImageGallery (thumbnail strip + portal lightbox with pinch-zoom,
      // double-tap, swipe). Portal rendering prevents swipe conflict with tab nav.
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
