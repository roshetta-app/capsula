/**
 * src/components/drugs/DrugInfoSections.jsx
 * Phase 2G — Drug Detail Screen
 *
 * Renders all clinical info sections for a drug:
 *   Mechanism · Uses · Side Effects · Pregnancy · Contraindications
 *   Drug Interactions · Dose Adjustments · Pharmacokinetics
 *
 * Props: drug — flat drug object from DrugContext
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize:      10,
      fontWeight:    700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color:         'var(--color-text-tertiary)',
      marginBottom:  'var(--space-3)',
    }}>
      {title}
    </div>
  )
}

function Divider() {
  return (
    <div style={{
      height:          1,
      backgroundColor: 'var(--color-border-subtle)',
      margin:          'var(--space-5) 0',
    }} />
  )
}

function Collapsible({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          width:          '100%',
          background:     'none',
          border:         'none',
          cursor:         'pointer',
          padding:        0,
          fontFamily:     'var(--font-body)',
        }}
      >
        <SectionHeader title={title} />
        {open
          ? <ChevronUp size={14} color="var(--color-text-tertiary)" />
          : <ChevronDown size={14} color="var(--color-text-tertiary)" />
        }
      </button>
      {open && <div style={{ marginTop: 'var(--space-2)' }}>{children}</div>}
      <Divider />
    </div>
  )
}

// ─── Pregnancy badge ──────────────────────────────────────────────────────────

const PREGNANCY_META = {
  A: { bg: '#D1FAE5', color: '#065F46', label: 'Category A — Adequate studies show no risk' },
  B: { bg: '#DBEAFE', color: '#1E40AF', label: 'Category B — Animal studies show no risk; no adequate human studies' },
  C: { bg: '#FEF3C7', color: '#92400E', label: 'Category C — Animal studies show adverse effects; benefits may outweigh risks' },
  D: { bg: '#FEE2E2', color: '#991B1B', label: 'Category D — Evidence of human fetal risk; benefits may outweigh risks' },
  X: { bg: '#FCA5A5', color: '#7F1D1D', label: 'Category X — Fetal abnormalities demonstrated; risks outweigh benefits' },
  N: { bg: '#F3F4F6', color: '#6B7280', label: 'Not classified' },
}

function PregnancyBadge({ category }) {
  const meta = PREGNANCY_META[category] ?? PREGNANCY_META.N
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
      <span style={{
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           32,
        height:          32,
        borderRadius:    'var(--radius-sm)',
        backgroundColor: meta.bg,
        color:           meta.color,
        fontSize:        16,
        fontWeight:      700,
        flexShrink:      0,
      }}>
        {category}
      </span>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
        {meta.label}
      </span>
    </div>
  )
}

function IconRow({ icon, label, value }) {
  if (!value && value !== false) return null
  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      gap:        'var(--space-2)',
      fontSize:   13,
      color:      'var(--color-text-secondary)',
      marginTop:  'var(--space-2)',
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontWeight: 500 }}>{label}:</span>
      <span style={{ color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  )
}

// ─── Severity badge for interactions ─────────────────────────────────────────

const SEVERITY_STYLE = {
  major:    { bg: '#FEE2E2', color: '#991B1B' },
  moderate: { bg: '#FEF3C7', color: '#92400E' },
  minor:    { bg: '#FEF9C3', color: '#713F12' },
}

function SeverityBadge({ severity }) {
  if (!severity) return null
  const s = severity.toLowerCase()
  const style = SEVERITY_STYLE[s] ?? { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{
      fontSize:        11,
      fontWeight:      600,
      textTransform:   'capitalize',
      backgroundColor: style.bg,
      color:           style.color,
      padding:         '2px 7px',
      borderRadius:    'var(--radius-full)',
      marginLeft:      'var(--space-2)',
      flexShrink:      0,
    }}>
      {s}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DrugInfoSections({ drug }) {
  const {
    mechanismOfAction,
    uses = [],
    sideEffectsCommon = [],
    sideEffectsSerious = [],
    pregnancyCategory,
    breastfeedingSafety,
    crossesPlacenta,
    crossesBbb,
    contraindications = [],
    drugInteractions = [],
    doseAdjustments = [],
    pharmacokinetics,
  } = drug

  return (
    <div>

      {/* ── Mechanism of Action ── */}
      {mechanismOfAction && (
        <Collapsible title="Mechanism of Action">
          <p style={{
            fontSize:   14,
            color:      'var(--color-text-primary)',
            lineHeight: 1.6,
            margin:     0,
          }}>
            {mechanismOfAction}
          </p>
        </Collapsible>
      )}

      {/* ── Uses ── */}
      {uses.length > 0 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Uses" />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {uses.map((use, i) => {
              const name    = typeof use === 'string' ? use : use.use_name
              const context = typeof use === 'object' ? use.context : ''
              return (
                <li key={i} style={{ marginBottom: 'var(--space-2)' }}>
                  <span style={{
                    fontSize:   14,
                    fontWeight: 600,
                    color:      'var(--color-text-primary)',
                  }}>
                    {name}
                  </span>
                  {context && (
                    <span style={{
                      fontSize:   13,
                      fontStyle:  'italic',
                      color:      'var(--color-text-tertiary)',
                      marginLeft: 'var(--space-2)',
                    }}>
                      {context}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          <Divider />
        </div>
      )}

      {/* ── Side Effects ── */}
      {(sideEffectsCommon.length > 0 || sideEffectsSerious.length > 0) && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          {sideEffectsCommon.length > 0 && (
            <>
              <SectionHeader title="Side Effects — Common" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                {sideEffectsCommon.map((se, i) => (
                  <span key={i} style={{
                    fontSize:        13,
                    color:           '#92400E',
                    backgroundColor: '#FEF3C7',
                    borderRadius:    'var(--radius-sm)',
                    padding:         '3px 10px',
                  }}>
                    {se}
                  </span>
                ))}
              </div>
            </>
          )}

          {sideEffectsSerious.length > 0 && (
            <>
              <div style={{
                display:       'flex',
                alignItems:    'center',
                gap:           'var(--space-1)',
                fontSize:      10,
                fontWeight:    700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color:         '#DC2626',
                marginBottom:  'var(--space-3)',
              }}>
                <AlertTriangle size={11} />
                Side Effects — Serious
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {sideEffectsSerious.map((se, i) => (
                  <li key={i} style={{
                    fontSize:        13,
                    color:           '#991B1B',
                    backgroundColor: '#FEE2E2',
                    borderRadius:    'var(--radius-sm)',
                    padding:         'var(--space-2) var(--space-3)',
                    marginBottom:    'var(--space-2)',
                    lineHeight:      1.4,
                  }}>
                    {se}
                  </li>
                ))}
              </ul>
            </>
          )}
          <Divider />
        </div>
      )}

      {/* ── Pregnancy & Breastfeeding ── */}
      {(pregnancyCategory || breastfeedingSafety) && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Pregnancy & Breastfeeding" />
          {pregnancyCategory && <PregnancyBadge category={pregnancyCategory} />}
          <IconRow icon="🤱" label="Breastfeeding" value={breastfeedingSafety} />
          <IconRow icon="🧬" label="Crosses placenta" value={
            crossesPlacenta === true ? 'Yes' : crossesPlacenta === false ? 'No' : crossesPlacenta
          } />
          <IconRow icon="🧠" label="Crosses BBB" value={
            crossesBbb === true ? 'Yes' : crossesBbb === false ? 'No' : crossesBbb
          } />
          <Divider />
        </div>
      )}

      {/* ── Contraindications ── */}
      {contraindications.length > 0 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Contraindications" />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {contraindications.map((ci, i) => (
              <li key={i} style={{
                fontSize:    14,
                color:       'var(--color-text-secondary)',
                padding:     'var(--space-2) 0',
                borderBottom: i < contraindications.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                lineHeight:  1.4,
              }}>
                {ci}
              </li>
            ))}
          </ul>
          <Divider />
        </div>
      )}

      {/* ── Drug Interactions ── */}
      {drugInteractions.length > 0 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Drug Interactions" />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {drugInteractions.map((ix, i) => (
              <li key={i} style={{
                padding:      'var(--space-2) 0',
                borderBottom: i < drugInteractions.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {ix.drug ?? ix.drug_name ?? ix.name}
                  </span>
                  {ix.severity && <SeverityBadge severity={ix.severity} />}
                </div>
                {(ix.description ?? ix.risk) && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                    {ix.description ?? ix.risk}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Divider />
        </div>
      )}

      {/* ── Dose Adjustments ── */}
      {doseAdjustments.length > 0 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Dose Adjustments" />
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {doseAdjustments.map((da, i) => (
              <li key={i} style={{
                padding:      'var(--space-2) 0',
                borderBottom: i < doseAdjustments.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                lineHeight:   1.5,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {da.condition}
                </span>
                {da.adjustment && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {da.adjustment}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Divider />
        </div>
      )}

      {/* ── Pharmacokinetics ── */}
      {pharmacokinetics && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <SectionHeader title="Pharmacokinetics" />
          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 'var(--space-3)',
          }}>
            {[
              { key: 'onset',           label: 'Onset' },
              { key: 'peak',            label: 'Peak' },
              { key: 'duration',        label: 'Duration' },
              { key: 'half_life',       label: 'Half-life' },
              { key: 'bioavailability', label: 'Bioavailability' },
            ].map(({ key, label }) =>
              pharmacokinetics[key] ? (
                <div key={key} style={{
                  backgroundColor: 'var(--color-bg)',
                  border:          '1px solid var(--color-border-subtle)',
                  borderRadius:    'var(--radius-sm)',
                  padding:         'var(--space-3)',
                }}>
                  <div style={{
                    fontSize:      10,
                    fontWeight:    700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color:         'var(--color-text-tertiary)',
                    marginBottom:  'var(--space-1)',
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontSize:   14,
                    fontWeight: 600,
                    color:      'var(--color-text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {pharmacokinetics[key]}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

    </div>
  )
}
