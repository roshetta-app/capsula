/**
 * src/pages/admin/BusinessNumbers.jsx
 *
 * Track K step K4 (2026-11-24) - the CMS Business screen at /admin/business.
 * Four blocks: headline numbers, the path to Pro, what needs you now, what ends soon (plus trials started per day).
 * One admin-only database call, admin_business_numbers(period) (Migration 20), which returns counts and sums only.
 * Rules and words: utils/businessNumbersAdmin.js. Counts are distinct signed-in people, not clicks.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, RefreshCw } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { rpcAdminBusinessNumbers } from '../../lib/screenQueries'
import {
  PERIODS, PATH_STEPS, normalizeNumbers, needsAttention, pathPercent, formatCount, formatEgp,
  buildCsvRows, csvText, csvFileName, loadErrorText,
} from '../../utils/businessNumbersAdmin'

const card = {
  backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)', padding: 'var(--space-4)',
}
const blockTitle = { fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', margin: 0 }
const caption = { fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4, fontFamily: 'var(--font-body)' }
const bigNumber = { fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)', lineHeight: 1.2 }
const smallLabel = { fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2, fontFamily: 'var(--font-body)' }
const buttonStyle = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer',
}

function Stat({ value, label, note, danger = false, to = null }) {
  const body = (
    <div style={{
      ...card, borderLeft: danger ? '4px solid #DC2626' : card.border,
      backgroundColor: danger ? '#FEF2F2' : card.backgroundColor, height: '100%', boxSizing: 'border-box',
    }}>
      <div style={{ ...bigNumber, color: danger ? '#991B1B' : bigNumber.color }}>{value}</div>
      <div style={smallLabel}>{label}</div>
      {note ? <div style={caption}>{note}</div> : null}
    </div>
  )
  if (!to) return body
  return <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{body}</Link>
}

const grid = (min) => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 'var(--space-3)', marginTop: 'var(--space-3)' })

export default function BusinessNumbers() {
  const [period, setPeriod] = useState('30d')
  const [state, setState] = useState('loading')   // loading | ok | forbidden | error
  const [errorText, setErrorText] = useState('')
  const [numbers, setNumbers] = useState(null)
  const latest = useRef(0)

  const load = useCallback(async () => {
    const mine = ++latest.current
    setState('loading')
    const { data, error } = await rpcAdminBusinessNumbers(period)
    if (mine !== latest.current) return   // an older answer arriving late is ignored
    if (error) {
      setState(String(error.message ?? '').includes('forbidden') ? 'forbidden' : 'error')
      setErrorText(loadErrorText(error))
      return
    }
    const next = normalizeNumbers(data)
    if (!next) { setState('error'); setErrorText(loadErrorText(null)); return }
    setNumbers(next)
    setState('ok')
  }, [period])

  useEffect(() => { load() }, [load])

  const ready = state === 'ok' && numbers !== null   // numbers are shown only for an answer that just arrived

  function exportCsv() {
    if (!ready) return
    const blob = new Blob([csvText(buildCsvRows(numbers))], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = csvFileName(numbers.period)
    a.click()
    URL.revokeObjectURL(url)
  }

  const loading = state === 'loading'
  const show = (value, format = formatCount) => (ready ? format(value) : '—')
  const n = numbers
  const h = n?.headline
  const updated = n?.generatedAt
    ? new Date(n.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' })
    : null

  return (
    <AdminPageHeader
      title="Business numbers"
      actions={
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button type="button" onClick={exportCsv} disabled={!ready} aria-label="Export CSV"
            style={{ ...buttonStyle, opacity: ready ? 1 : 0.5 }}>
            <Download size={14} /> Export CSV
          </button>
          <button type="button" onClick={load} disabled={loading} aria-label="Refresh" style={buttonStyle}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      }
    >
      <div role="group" aria-label="Period" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
        {PERIODS.map(p => {
          const on = p.key === period
          return (
            <button key={p.key} type="button" aria-pressed={on} onClick={() => setPeriod(p.key)}
              style={{
                minHeight: 40, padding: '0 var(--space-4)', borderRadius: 9999, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                fontFamily: 'var(--font-body)', border: '1px solid var(--color-border)',
                backgroundColor: on ? 'var(--color-accent-solid)' : 'var(--color-surface)', color: on ? '#fff' : 'var(--color-text-primary)',
              }}>
              {p.label}
            </button>
          )
        })}
      </div>
      <div style={{ ...caption, marginTop: 0, marginBottom: 'var(--space-4)' }}>
        The period changes sign-ups, income and the path to Pro. The other blocks show how things are right now.
        {updated ? ` Updated ${updated} (Cairo).` : ''}
      </div>

      {(state === 'forbidden' || state === 'error') && (
        <div role="alert" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 13, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
          {errorText}
        </div>
      )}

      {state !== 'forbidden' && (
        <>
          <section aria-label="Headline numbers">
            <div style={grid(180)}>
              <Stat value={show(h?.signups)} label="New sign-ups" />
              <Stat value={show(h?.activePro)} label="Active Pro"
                note={ready && h.lifetime > 0 ? `Plus ${formatCount(h.lifetime)} lifetime, not counted` : 'Paid plans, right now'} />
              <Stat value={show(h?.onTrial)} label="On trial now" />
              <Stat value={show(h?.incomeEgp, formatEgp)} label="Income" note="Approved payments you recorded, not a bank statement" />
            </div>
          </section>

          <section aria-label="Path to Pro" style={{ marginTop: 'var(--space-6)' }}>
            <h2 style={blockTitle}>Path to Pro</h2>
            <div style={caption}>Different people who did each thing in the period, counted once each. It is approximate: the boxes are not one group followed step by step.</div>
            <div style={grid(150)}>
              {PATH_STEPS.map((step, i) => (
                <Stat key={step.key}
                  value={show(n?.path[step.key])}
                  label={step.label}
                  note={ready && i > 0 ? pathPercent(n.path[PATH_STEPS[i - 1].key], n.path[step.key]) : ''} />
              ))}
            </div>
          </section>

          <section aria-label="Needs you now" style={{ marginTop: 'var(--space-6)' }}>
            <h2 style={blockTitle}>Needs you now</h2>
            <div style={grid(180)}>
              <Stat value={show(n?.needsYou.waitingOver12)} label="Requests waiting over 12 hours" to="/admin/pro-requests"
                danger={ready && needsAttention(n?.needsYou.waitingOver12)} />
              <Stat value={show(n?.needsYou.waitingOver24)} label="Requests waiting over 24 hours" to="/admin/pro-requests"
                note="The promise to people is 24 hours" danger={ready && needsAttention(n?.needsYou.waitingOver24)} />
              <Stat value={show(n?.needsYou.openReports)} label="Open reports" to="/admin/reports"
                danger={ready && needsAttention(n?.needsYou.openReports)} />
            </div>
          </section>

          <section aria-label="Ending soon" style={{ marginTop: 'var(--space-6)' }}>
            <h2 style={blockTitle}>Ending soon</h2>
            <div style={grid(180)}>
              <Stat value={show(n?.endingSoon.pro7)} label="Pro ending in 7 days" />
              <Stat value={show(n?.endingSoon.pro1)} label="Pro ending in 1 day" />
              <Stat value={show(n?.endingSoon.trials2)} label="Trials ending in 2 days" />
            </div>
          </section>

          <section aria-label="Trials started per day" style={{ marginTop: 'var(--space-6)' }}>
            <h2 style={blockTitle}>Trials started per day</h2>
            <div style={caption}>The last 14 days, Cairo days. A sudden spike can mean one person making many accounts.</div>
            <div style={{ ...card, marginTop: 'var(--space-3)' }}>
              {ready && n.trialsByDay.length > 0 ? (() => {
                const most = Math.max(1, ...n.trialsByDay.map(d => d.count))
                return n.trialsByDay.map(d => (
                  <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 13, fontFamily: 'var(--font-body)', marginBottom: 4 }}>
                    <span style={{ width: 84, color: 'var(--color-text-tertiary)' }}>{d.day.slice(5)}</span>
                    <span style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: 'var(--color-border)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${(d.count / most) * 100}%`, backgroundColor: 'var(--color-accent-solid)' }} />
                    </span>
                    <span style={{ width: 28, textAlign: 'right', color: 'var(--color-text-primary)', fontWeight: 600 }}>{d.count}</span>
                  </div>
                ))
              })() : (
                <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>{ready ? 'No days to show.' : loading ? 'Loading…' : '—'}</div>
              )}
            </div>
          </section>
        </>
      )}
    </AdminPageHeader>
  )
}
