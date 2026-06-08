import { ArrowLeft, AlertTriangle } from 'lucide-react'
import StockToggle from './StockToggle'
import { DRUG_CATEGORIES } from '../config/categories'

const CATEGORY_LABELS = Object.fromEntries(
  DRUG_CATEGORIES.map(c => [c.value, c.label])
)

const CATEGORY_COLORS = {
  'antibiotic':              { bg: '#FEF3C7', color: '#92400E' },
  'antiviral':               { bg: '#DBEAFE', color: '#1E40AF' },
  'antifungal':              { bg: '#EDE9FE', color: '#5B21B6' },
  'antiparasitic':           { bg: '#D1FAE5', color: '#065F46' },
  'analgesic-nsaid':         { bg: '#F0FDF4', color: '#166534' },
  'cardiovascular':          { bg: '#FFF1F2', color: '#9F1239' },
  'respiratory':             { bg: '#F0F9FF', color: '#0C4A6E' },
  'gastrointestinal':        { bg: '#FDF4FF', color: '#6B21A8' },
  'endocrine-metabolic':     { bg: '#ECFDF5', color: '#064E3B' },
  'neurological-psychiatric':{ bg: '#F5F3FF', color: '#4C1D95' },
  'musculoskeletal':         { bg: '#FFF7ED', color: '#9A3412' },
  'vitamins-minerals':       { bg: '#F7FEE7', color: '#3F6212' },
  'dermatological':          { bg: '#F5F3FF', color: '#4C1D95' },
  'ophthalmic-otic':         { bg: '#ECFEFF', color: '#164E63' },
  'urological':              { bg: '#EFF6FF', color: '#1E40AF' },
  'obstetric-gynecological': { bg: '#FDF2F8', color: '#831843' },
  'other':                   { bg: '#FEE2E2', color: '#7F1D1D' },
}

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 'var(--space-5)' }}>
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--color-text-tertiary)',
      marginBottom: 'var(--space-3)',
    }}>
      {title}
    </div>
    {children}
    <div style={{
      height: 1,
      backgroundColor: 'var(--color-border-subtle)',
      marginTop: 'var(--space-5)',
    }} />
  </div>
)

const DoseRow = ({ label, value }) => {
  if (!value) return null
  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-4)',
      marginBottom: 'var(--space-2)',
      alignItems: 'baseline',
    }}>
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        minWidth: 60,
        flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 14,
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-mono)',
        lineHeight: 1.4,
        direction: 'auto',
      }}>
        {value}
      </span>
    </div>
  )
}

export default function DrugDetail({ drug, isInStock, onBack, onToggleStock }) {
  const chipStyle  = CATEGORY_COLORS[drug.category] || { bg: '#F3F4F6', color: '#374151' }
  const label      = CATEGORY_LABELS[drug.category]  || drug.category

  // FlatDrug field names
  const brandNames      = drug.brands?.map(b => b.name) ?? []
  const textbookDoses   = drug.textbookDoses  ?? []   // [{ group, instruction }] — textbook reference
  const practicalDoses  = drug.doses ?? []            // [{ group, instruction }] — from formulation

  // Prefer practicalDoses for display; fall back to textbookDoses
  const dosesToShow = practicalDoses.length > 0 ? practicalDoses : textbookDoses

  return (
    <div style={{
      backgroundColor: 'var(--color-bg)',
      minHeight: '100vh',
      paddingBottom: 'var(--space-12)',
    }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-accent)',
          fontSize: 14,
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          padding: 'var(--space-5) 0 var(--space-4)',
        }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Drug header */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        marginBottom: 'var(--space-4)',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 'var(--space-3)',
        }}>
          <h1 style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
            lineHeight: 1.2,
            flex: 1,
            paddingRight: 'var(--space-3)',
          }}>
            {drug.genericName}
          </h1>
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            backgroundColor: chipStyle.bg,
            color: chipStyle.color,
            padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
            flexShrink: 0,
          }}>
            {label}
          </span>
        </div>

        {/* Arabic name */}
        <div style={{
          fontSize: 15,
          color: 'var(--color-text-arabic)',
          fontFamily: 'var(--font-arabic)',
          textAlign: 'right',
          direction: 'rtl',
          marginBottom: 'var(--space-2)',
        }}>
          {drug.arabicName}
        </div>

        {/* Brand names */}
        {brandNames.length > 0 && (
          <div style={{
            fontSize: 13,
            color: 'var(--color-accent)',
            fontWeight: 500,
            marginBottom: drug.class ? 'var(--space-1)' : 0,
          }}>
            {brandNames.join(' · ')}
          </div>
        )}

        {/* Drug class */}
        {drug.class && (
          <div style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            marginTop: 'var(--space-1)',
          }}>
            {drug.class}
          </div>
        )}
      </div>

      {/* Detail sections */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-card)',
      }}>

        {/* Dose — from practicalDoses / textbookDoses */}
        {dosesToShow.length > 0 && (
          <Section title="Dose">
            {dosesToShow.map((d, i) => (
              <DoseRow key={i} label={d.group} value={d.instruction} />
            ))}
            {drug.route && <DoseRow label="Route" value={drug.route} />}
          </Section>
        )}

        {/* Uses */}
        {drug.uses?.length > 0 && (
          <Section title="Uses">
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {drug.uses.map((use, i) => (
                <li key={i} style={{
                  fontSize: 14,
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-2)',
                  paddingLeft: 'var(--space-4)',
                  position: 'relative',
                  lineHeight: 1.4,
                }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--color-accent)', fontWeight: 700 }}>·</span>
                  {typeof use === 'string' ? use : use.use_name}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Warnings */}
        {drug.warnings?.length > 0 && (
          <Section title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={10} style={{ color: '#DC2626' }} />
              Warnings
            </span>
          }>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {drug.warnings.map((w, i) => (
                <li key={i} style={{
                  fontSize: 14,
                  color: '#DC2626',
                  marginBottom: 'var(--space-2)',
                  paddingLeft: 'var(--space-4)',
                  position: 'relative',
                  lineHeight: 1.4,
                }}>
                  <span style={{ position: 'absolute', left: 0, fontWeight: 700 }}>!</span>
                  {w}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Form + concentration + route chip */}
        {(drug.form || drug.concentration) && (
          <Section title="Formulation">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {[drug.form, drug.concentration].filter(Boolean).map((val, i) => (
                <span key={i} style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px 10px',
                  textTransform: 'capitalize',
                }}>
                  {val}
                </span>
              ))}
            </div>
          </Section>
        )}

        <StockToggle isInStock={isInStock} onToggle={onToggleStock} />
      </div>
    </div>
  )
}



