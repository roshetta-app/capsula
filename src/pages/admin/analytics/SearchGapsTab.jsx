/**
 * src/pages/admin/analytics/SearchGapsTab.jsx
 * Phase 3J — Analytics Dashboard: Search Gaps tab
 *
 * Shows zero-result search terms from the last 14 days.
 * Sections: Drug Library Zero Results | Condition Search Zero Results
 * "Ready-to-paste AI Prompt" button: generates + copies a prompt listing top 10 terms.
 */

import { useState } from 'react'
import { Copy, Check, TrendingDown } from 'lucide-react'

// ─── Inline bar chart row ─────────────────────────────────────────────────────

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

// ─── Section card ─────────────────────────────────────────────────────────────

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
      {/* Header */}
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

      {/* Column headers */}
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

      {/* Rows */}
      <div style={{ backgroundColor: 'var(--color-surface)' }}>
        {rows.map((row, i) => (
          <GapRow key={row.term} rank={i + 1} term={row.term} count={row.count} maxCount={maxCount} />
        ))}
      </div>
    </div>
  )
}

// ─── AI Prompt generator ──────────────────────────────────────────────────────

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
      // Fallback: show a text area with the prompt
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SearchGapsTab({ data }) {
  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  const { drugGaps = [], conditionGaps = [] } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Summary + AI prompt */}
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
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const thStyle = {
  fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  color: 'var(--color-text-tertiary)',
}
