/**
 * src/pages/admin/analytics/ContentQualityTab.jsx
 * F10 Batch D (D38), step 8h+ — Content Quality tab
 *
 * Merges three former standalone tabs that were all describing the same
 * content library from different angles:
 *   - Health   — completeness score + warning flags (was ContentHealthTab.jsx)
 *   - Coverage — specialty/category breakdown (was CoverageTab.jsx)
 *   - Search Gaps — zero-result search terms (was SearchGapsTab.jsx)
 *
 * Rendered as three stacked sections under one tab. This is a pure layout
 * consolidation — none of the three sections' computation or data source
 * changed, they're the same components with their loading-check collapsed
 * to one shared check at the top level.
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Copy, Check, TrendingDown } from 'lucide-react'

// ─── Shared styles ──────────────────────────────────────────────────────────

const thStyle = {
  fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  color: 'var(--color-text-tertiary)',
}

const sectionHeadingStyle = {
  fontSize: 16, fontWeight: 700,
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-body)',
}

// ─── Section: Content Health ────────────────────────────────────────────────

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
        <circle
          cx={64} cy={64} r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={10}
        />
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

function ContentHealthSection({ data }) {
  const {
    totalConditions, publishedConditions,
    totalGenerics, genericsWithBrands, genericsWithDoses,
  } = data

  const condPublishRate  = totalConditions  ? (publishedConditions / totalConditions)   * 100 : 0
  const drugsWithBrands  = totalGenerics    ? (genericsWithBrands  / totalGenerics)     * 100 : 0
  const drugsWithDoses   = totalGenerics    ? (genericsWithDoses   / totalGenerics)     * 100 : 0

  const score = Math.round(
    condPublishRate * 0.375  +
    drugsWithBrands * 0.3125 +
    drugsWithDoses  * 0.3125
  )

  const flags = []
  const noBrandsCount  = totalGenerics - genericsWithBrands
  const noDosesCount   = totalGenerics - genericsWithDoses
  const noDefCount     = data.conditionsMissingDefinition ?? 0
  const noFormDoseCount= data.formulationsWithNoDose ?? 0

  if (noBrandsCount  > 0) flags.push(`${noBrandsCount} drug${noBrandsCount !== 1 ? 's' : ''} with no brands`)
  if (noDosesCount   > 0) flags.push(`${noDosesCount} drug${noDosesCount !== 1 ? 's' : ''} with no doses`)
  if (noDefCount     > 0) flags.push(`${noDefCount} condition${noDefCount !== 1 ? 's' : ''} missing definition`)
  if (noFormDoseCount> 0) flags.push(`${noFormDoseCount} formulation${noFormDoseCount !== 1 ? 's' : ''} with no dose data`)

  const condIssues = []
  const unpubCount = totalConditions - publishedConditions
  if (unpubCount  > 0) condIssues.push(`${unpubCount} unpublished or flagged condition${unpubCount !== 1 ? 's' : ''}`)
  if (noDefCount  > 0) condIssues.push(`${noDefCount} condition${noDefCount !== 1 ? 's' : ''} missing definition`)

  const drugIssues = []
  if (noBrandsCount > 0) drugIssues.push(`${noBrandsCount} generic${noBrandsCount !== 1 ? 's' : ''} have no brands`)
  if (noDosesCount  > 0) drugIssues.push(`${noDosesCount} generic${noDosesCount !== 1 ? 's' : ''} have no doses`)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={sectionHeadingStyle}>Content Health</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)',
        }}>
          <ScoreRing score={score} />

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
        </div>
      </div>
    </div>
  )
}

// ─── Section: Coverage ──────────────────────────────────────────────────────

function StatCard({ label, value, color = 'var(--color-accent)' }) {
  return (
    <div style={{
      flex: '1 1 120px',
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: 'var(--font-body)', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
        {label}
      </div>
    </div>
  )
}

const coverageGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(120px,1fr) 80px 80px minmax(100px,1fr)',
  gap: 'var(--space-3)',
  alignItems: 'center',
  padding: 'var(--space-2) var(--space-4)',
  fontFamily: 'var(--font-body)',
}

function CoverageTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
        No specialty data
      </div>
    )
  }

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-body)',
      }}>
        Coverage by Specialty
      </div>

      <div style={{ ...coverageGridStyle, backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
        <span style={thStyle}>Specialty</span>
        <span style={{ ...thStyle, textAlign: 'right' }}>Conditions</span>
        <span style={{ ...thStyle, textAlign: 'right' }}>Published</span>
        <span style={thStyle}>Publish Rate</span>
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)' }}>
        {rows.map(row => {
          const publishRate = row.total > 0 ? Math.round((row.published / row.total) * 100) : 0
          const barColor =
            publishRate >= 80 ? 'var(--color-success)' :
            publishRate >= 50 ? 'var(--color-warning)' :
            'var(--color-danger)'

          return (
            <div
              key={row.specialty}
              style={{
                ...coverageGridStyle,
                borderBottom: '1px solid var(--color-border-subtle)',
                padding: 'var(--space-3) var(--space-4)',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>
                {row.specialty}
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'right' }}>{row.total}</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'right' }}>{row.published}</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{
                  flex: 1, height: 6,
                  backgroundColor: 'var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${publishRate}%`, height: '100%',
                    backgroundColor: barColor,
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: barColor, width: 32, textAlign: 'right' }}>
                  {publishRate}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DrugGroupsChart({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
        }}>
          Top Drug Groups
        </div>
        <div style={{
          padding: 'var(--space-8)', textAlign: 'center',
          color: 'var(--color-text-tertiary)', fontSize: 13,
          backgroundColor: 'var(--color-surface)',
        }}>
          No drug group data
        </div>
      </div>
    )
  }

  const maxCount = rows[0]?.count ?? 1

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-body)',
      }}>
        Top Drug Groups
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {rows.map(row => {
          const pct = (row.count / maxCount) * 100
          return (
            <div key={row.category} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: 140, fontSize: 12,
                color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {row.category}
              </div>
              <div style={{
                flex: 1, height: 20,
                backgroundColor: 'var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  backgroundColor: 'var(--color-accent)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'width 0.5s ease',
                  display: 'flex', alignItems: 'center',
                  paddingLeft: 'var(--space-2)',
                }}>
                  {pct > 15 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{row.count}</span>
                  )}
                </div>
              </div>
              {pct <= 15 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', width: 28, textAlign: 'right' }}>
                  {row.count}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CoverageSection({ data }) {
  const { totalSpecialties, totalConditions, totalGenerics, totalBrands, specialtyCoverage, drugGroups } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={sectionHeadingStyle}>Coverage</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <StatCard label="Specialties"   value={totalSpecialties} color="var(--color-accent)" />
          <StatCard label="Conditions"    value={totalConditions}  color="var(--color-primary)" />
          <StatCard label="Drugs"         value={totalGenerics}    color="var(--color-success)" />
          <StatCard label="Brands"        value={totalBrands}      color="var(--color-warning)" />
        </div>

        <CoverageTable rows={specialtyCoverage} />
        <DrugGroupsChart rows={drugGroups} />
      </div>
    </div>
  )
}

// ─── Section: Search Gaps ───────────────────────────────────────────────────

function GapRow({ rank, term, count, maxCount }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '24px minmax(0,1fr) 120px 48px',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-4)',
      borderBottom: '1px solid var(--color-border-subtle)',
      fontFamily: 'var(--font-body)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'right' }}>
        {rank}
      </span>
      <span style={{
        fontSize: 14, color: 'var(--color-text-primary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)',
      }}>
        {term}
      </span>
      <div style={{
        height: 6,
        backgroundColor: 'var(--color-border)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          backgroundColor: 'var(--color-danger)',
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>
        {count}×
      </span>
    </div>
  )
}

function GapSection({ title, rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</span>
        </div>
        <div style={{
          padding: 'var(--space-8)',
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 13,
          backgroundColor: 'var(--color-surface)',
        }}>
          No zero-result searches in the last 14 days
        </div>
      </div>
    )
  }

  const maxCount = rows[0]?.count ?? 1

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</span>
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--color-danger)',
          backgroundColor: 'var(--color-danger-light)',
          borderRadius: 'var(--radius-full)', padding: '1px 8px',
        }}>
          {rows.length} term{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '24px minmax(0,1fr) 120px 48px',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-4)',
        backgroundColor: 'var(--color-bg)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <span style={thStyle}>#</span>
        <span style={thStyle}>Search Term</span>
        <span style={thStyle}>Frequency</span>
        <span style={{ ...thStyle, textAlign: 'right' }}>Count</span>
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)' }}>
        {rows.map((row, i) => (
          <GapRow key={row.term} rank={i + 1} term={row.term} count={row.count} maxCount={maxCount} />
        ))}
      </div>
    </div>
  )
}

function AiPromptButton({ drugRows, conditionRows }) {
  const [copied, setCopied] = useState(false)

  function buildPrompt() {
    const top10 = [
      ...conditionRows.slice(0, 5).map(r => `"${r.term}" (conditions)`),
      ...drugRows.slice(0, 5).map(r => `"${r.term}" (drugs)`),
    ].slice(0, 10)

    return (
      `I am building a medical reference app called Capsula for Egyptian GPs. ` +
      `Users searched for these terms and found nothing:\n\n` +
      top10.map((t, i) => `${i + 1}. ${t}`).join('\n') +
      `\n\nSuggest which conditions or drugs I should add next, grouped by priority.`
    )
  }

  async function handleCopy() {
    const prompt = buildPrompt()
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copy this prompt:', prompt)
    }
  }

  const hasData = drugRows.length > 0 || conditionRows.length > 0

  return (
    <button
      onClick={handleCopy}
      disabled={!hasData}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-4)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-accent)',
        backgroundColor: copied ? 'var(--color-success-light)' : 'var(--color-accent-light)',
        color: copied ? 'var(--color-success)' : 'var(--color-accent)',
        fontSize: 13, fontWeight: 600,
        fontFamily: 'var(--font-body)',
        cursor: hasData ? 'pointer' : 'not-allowed',
        opacity: hasData ? 1 : 0.5,
        transition: 'all 0.2s ease',
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : 'Ready-to-paste AI Prompt'}
    </button>
  )
}

function SearchGapsSection({ data }) {
  const { drugGaps = [], conditionGaps = [] } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={sectionHeadingStyle}>Search Gaps</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 'var(--space-3)',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <TrendingDown size={18} color="var(--color-danger)" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Zero-result searches · last 14 days
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                {drugGaps.length + conditionGaps.length} unique terms with no results
              </div>
            </div>
          </div>
          <AiPromptButton drugRows={drugGaps} conditionRows={conditionGaps} />
        </div>

        <GapSection title="Condition Search — Zero Results" rows={conditionGaps} />
        <GapSection title="Drug Library — Zero Results"     rows={drugGaps} />
      </div>
    </div>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function ContentQualityTab({ data }) {
  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  const { health, coverage, gaps } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <ContentHealthSection data={health} />
      <div style={{ borderTop: '1px solid var(--color-border)' }} />
      <CoverageSection data={coverage} />
      <div style={{ borderTop: '1px solid var(--color-border)' }} />
      <SearchGapsSection data={gaps} />
    </div>
  )
}
