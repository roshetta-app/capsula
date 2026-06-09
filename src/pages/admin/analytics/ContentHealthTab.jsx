/**
 * src/pages/admin/analytics/ContentHealthTab.jsx
 * Phase 3J — Analytics Dashboard: Content Health tab
 *
 * Shows:
 *   - Overall health score (circular progress ring)
 *   - Warning flags (auto-detected issues)
 *   - Three expandable rows: Conditions Health, Drugs Health, Prescriptions Health
 *
 * Weights (per masterplan):
 *   conditions published rate  30%
 *   drugs with brands          25%
 *   drugs with doses           25%
 *   prescriptions with sources 20%
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react'

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const label =
    score >= 85 ? 'Excellent' :
    score >= 65 ? 'Good' :
    'Needs Work'

  const color =
    score >= 85 ? 'var(--color-success)' :
    score >= 65 ? 'var(--color-warning)' :
    'var(--color-danger)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
      <svg width={128} height={128} viewBox="0 0 128 128">
        {/* Track */}
        <circle
          cx={64} cy={64} r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={10}
        />
        {/* Progress */}
        <circle
          cx={64} cy={64} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        {/* Percentage */}
        <text
          x={64} y={60}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: 22, fontWeight: 700, fill: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}
        >
          {score}%
        </text>
        <text
          x={64} y={79}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: 11, fill: color, fontFamily: 'var(--font-body)', fontWeight: 600 }}
        >
          {label}
        </text>
      </svg>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
        Overall Content Health
      </div>
    </div>
  )
}

// ─── Expandable section ───────────────────────────────────────────────────────

function HealthRow({ title, completeness, issueCount, issues }) {
  const [open, setOpen] = useState(false)

  const color =
    completeness >= 85 ? 'var(--color-success)' :
    completeness >= 65 ? 'var(--color-warning)' :
    'var(--color-danger)'

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', width: '100%',
          padding: 'var(--space-3) var(--space-4)',
          backgroundColor: 'var(--color-surface)',
          border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}
      >
        <div style={{ flex: 1, textAlign: 'left' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {title}
          </span>
          {issueCount > 0 && (
            <span style={{
              marginLeft: 'var(--space-2)',
              fontSize: 11, fontWeight: 600,
              color: 'var(--color-warning)',
              backgroundColor: 'var(--color-warning-light)',
              borderRadius: 'var(--radius-full)',
              padding: '1px 8px',
            }}>
              {issueCount} issue{issueCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {/* Progress bar + % */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginRight: 'var(--space-3)' }}>
          <div style={{
            width: 100, height: 6,
            backgroundColor: 'var(--color-border)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${completeness}%`, height: '100%',
              backgroundColor: color,
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color, width: 36, textAlign: 'right' }}>
            {completeness}%
          </span>
        </div>
        {open ? <ChevronUp size={15} color="var(--color-text-tertiary)" /> : <ChevronDown size={15} color="var(--color-text-tertiary)" />}
      </button>

      {open && issues.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-muted)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        }}>
          {issues.map((issue, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              fontSize: 13, color: 'var(--color-text-secondary)',
            }}>
              <AlertTriangle size={13} color="var(--color-warning)" style={{ flexShrink: 0 }} />
              {issue}
            </div>
          ))}
        </div>
      )}

      {open && issues.length === 0 && (
        <div style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-muted)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          fontSize: 13, color: 'var(--color-success)',
        }}>
          <CheckCircle size={13} />
          No issues detected
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ContentHealthTab({ data }) {
  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  const {
    totalConditions, publishedConditions,
    totalGenerics, genericsWithBrands, genericsWithDoses,
    totalPrescriptions, prescriptionsWithSource,
  } = data

  // ── Score computation ──────────────────────────────────────────────────────
  const condPublishRate  = totalConditions  ? (publishedConditions / totalConditions)   * 100 : 0
  const drugsWithBrands  = totalGenerics    ? (genericsWithBrands  / totalGenerics)     * 100 : 0
  const drugsWithDoses   = totalGenerics    ? (genericsWithDoses   / totalGenerics)     * 100 : 0
  const rxWithSource     = totalPrescriptions ? (prescriptionsWithSource / totalPrescriptions) * 100 : 0

  const score = Math.round(
    condPublishRate * 0.30 +
    drugsWithBrands * 0.25 +
    drugsWithDoses  * 0.25 +
    rxWithSource    * 0.20
  )

  // ── Warning flags ──────────────────────────────────────────────────────────
  const flags = []
  const noBrandsCount  = totalGenerics - genericsWithBrands
  const noDosesCount   = totalGenerics - genericsWithDoses
  const noDefCount     = data.conditionsMissingDefinition ?? 0
  const noFormDoseCount= data.formulationsWithNoDose ?? 0

  if (noBrandsCount  > 0) flags.push(`${noBrandsCount} drug${noBrandsCount !== 1 ? 's' : ''} with no brands`)
  if (noDosesCount   > 0) flags.push(`${noDosesCount} drug${noDosesCount !== 1 ? 's' : ''} with no doses`)
  if (noDefCount     > 0) flags.push(`${noDefCount} condition${noDefCount !== 1 ? 's' : ''} missing definition`)
  if (noFormDoseCount> 0) flags.push(`${noFormDoseCount} formulation${noFormDoseCount !== 1 ? 's' : ''} with no dose data`)

  // ── Per-section issues ─────────────────────────────────────────────────────
  const condIssues = []
  const unpubCount = totalConditions - publishedConditions
  if (unpubCount  > 0) condIssues.push(`${unpubCount} unpublished condition${unpubCount !== 1 ? 's' : ''}`)
  if (noDefCount  > 0) condIssues.push(`${noDefCount} condition${noDefCount !== 1 ? 's' : ''} missing definition`)

  const drugIssues = []
  if (noBrandsCount > 0) drugIssues.push(`${noBrandsCount} generic${noBrandsCount !== 1 ? 's' : ''} have no brands`)
  if (noDosesCount  > 0) drugIssues.push(`${noDosesCount} generic${noDosesCount !== 1 ? 's' : ''} have no doses`)

  const rxIssues = []
  const rxNoSrc = totalPrescriptions - prescriptionsWithSource
  if (rxNoSrc > 0) rxIssues.push(`${rxNoSrc} prescription${rxNoSrc !== 1 ? 's' : ''} missing a source label`)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Score ring */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)',
      }}>
        <ScoreRing score={score} />

        {/* Flags */}
        {flags.length > 0 && (
          <div style={{
            width: '100%',
            backgroundColor: 'var(--color-warning-light)',
            border: '1px solid var(--color-warning)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: 'var(--color-warning)', marginBottom: 'var(--space-2)',
            }}>
              Warning Flags
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {flags.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  fontSize: 13, color: 'var(--color-text-secondary)',
                }}>
                  <AlertTriangle size={13} color="var(--color-warning)" style={{ flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {flags.length === 0 && (
          <div style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            backgroundColor: 'var(--color-success-light)',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            fontSize: 13, color: 'var(--color-success)',
          }}>
            <CheckCircle size={14} />
            No issues detected — content looks healthy
          </div>
        )}
      </div>

      {/* Expandable rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <HealthRow
          title="Conditions Health"
          completeness={Math.round(condPublishRate)}
          issueCount={condIssues.length}
          issues={condIssues}
        />
        <HealthRow
          title="Drugs Health"
          completeness={Math.round((drugsWithBrands + drugsWithDoses) / 2)}
          issueCount={drugIssues.length}
          issues={drugIssues}
        />
        <HealthRow
          title="Prescriptions Health"
          completeness={Math.round(rxWithSource)}
          issueCount={rxIssues.length}
          issues={rxIssues}
        />
      </div>

    </div>
  )
}
