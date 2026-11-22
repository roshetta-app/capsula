/**
 * src/pages/admin/ReportsManager.jsx
 * 2026-11-22 (Public profile plan, step 14.9c-1): the CMS Reports screen at /admin/reports. One card per
 * reported roshetta, drug group or profile (medical reports first), with the reasons, how many reports and
 * how old the reporters' accounts are, and the actions that fit: Hide or Dismiss reports, Restore or Keep
 * hidden, and the two answers to an owner's one appeal. Every action asks first and is written to the Audit
 * Log by the database. The reporters' names and ids are never shown (the database never sends them).
 *
 * The rules and words live in utils/reportsAdmin.js; the calls are utils/reportsAdminContent.js.
 * A Preview button on each card (step 14.9c-2) shows the reported thing's own words, read through the admin-only
 * database function admin_report_preview, so Hide and Dismiss are not decided from the name alone. The text is drawn
 * as plain text only.
 * 14.9c-4b adds, on profile cards, the buttons Turn off sharing / Restore sharing / Take username back
 * (components/admin/TakedownActions.jsx, rules in utils/takedownAdmin.js), a Sharing off tag, and below the cards the
 * list of people whose sharing is turned off (SharingOffList), so Restore sharing is always reachable.
 * 2026-11-23 (Track I, step I5): below the cards, a Page problems section (components/admin/PageProblemsSection.jsx):
 * reports about Topic, brand and generic pages. Refresh reads it again too.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Flag, ExternalLink, Eye, EyeOff } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import ConfirmModal from '../../components/admin/ConfirmModal'
import TakedownActions from '../../components/admin/TakedownActions'
import SharingOffList from '../../components/admin/SharingOffList'
import PageProblemsSection from '../../components/admin/PageProblemsSection'
import { fetchReports, actOnReport, fetchPreview } from '../../utils/reportsAdminContent'
import { fetchSharingOff } from '../../utils/takedownAdminContent'
import { TAKEDOWN_WORDS } from '../../utils/takedownAdmin'
import { rowView, confirmCopy, resultText, previewStatusText, REPORTS_WORDS, PREVIEW_WORDS } from '../../utils/reportsAdmin'

const STATUS_STYLES = {
  open: { bg: 'var(--color-surface-muted)', color: 'var(--color-text-secondary)' },
  hidden: { bg: '#FEE2E2', color: '#991B1B' },
  appeal: { bg: '#FEF9C3', color: '#854D0E' },
}

const buttonBase = {
  padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-body)', cursor: 'pointer',
}

const previewBox = {
  padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-muted)',
  border: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-primary)', maxHeight: 320, overflowY: 'auto',
  display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
}
const plainText = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }

function PreviewBody({ preview }) {
  if (preview.kind === 'roshetta') {
    return (
      <>
        {preview.description && <div dir="auto" style={{ ...plainText, color: 'var(--color-text-secondary)' }}>{preview.description}</div>}
        {preview.items.map((it, i) => it.type === 'text' ? (
          <div key={i} dir="auto" style={plainText}>{it.text}</div>
        ) : (
          <div key={i} dir="auto" style={{ ...plainText, paddingLeft: 'var(--space-2)', borderLeft: '2px solid var(--color-border)' }}>
            <div style={{ fontWeight: 600 }}>{it.title}{it.meta ? ` \u00b7 ${it.meta}` : ''}</div>
            {it.lines.map((l, j) => <div key={j} style={{ color: 'var(--color-text-secondary)' }}>{l}</div>)}
          </div>
        ))}
        {preview.items.length === 0 && !preview.description && <div>{PREVIEW_WORDS.empty}</div>}
        {preview.truncated && <div style={{ color: 'var(--color-text-tertiary)' }}>{PREVIEW_WORDS.more(preview.items.length, preview.count)}</div>}
      </>
    )
  }
  if (preview.kind === 'group') {
    return (
      <>
        {preview.description && <div dir="auto" style={{ ...plainText, color: 'var(--color-text-secondary)' }}>{preview.description}</div>}
        {preview.drugs.length > 0 && <div dir="auto" style={plainText}>{preview.drugs.join(', ')}</div>}
        {preview.drugs.length === 0 && !preview.description && <div>{PREVIEW_WORDS.empty}</div>}
        {preview.truncated && <div style={{ color: 'var(--color-text-tertiary)' }}>{PREVIEW_WORDS.more(preview.drugs.length, preview.count)}</div>}
      </>
    )
  }
  return preview.bio ? <div dir="auto" style={plainText}>{preview.bio}</div> : <div>{PREVIEW_WORDS.empty}</div>
}

function ReportCard({ row, busy, onAct, sharingOff, onChanged }) {
  const v = rowView(row)
  const [pv, setPv] = useState({ open: false, status: 'idle', preview: null })
  async function togglePreview() {
    if (pv.open) { setPv({ ...pv, open: false }); return }
    setPv({ open: true, status: 'loading', preview: null })
    const r = await fetchPreview(row)
    setPv({ open: true, status: r.status, preview: r.status === 'ok' ? r.preview : null })
  }
  const status = STATUS_STYLES[v.status]
  return (
    <div style={{
      padding: 'var(--space-4)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderLeft: v.hasMedical ? '4px solid #DC2626' : '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontFamily: 'var(--font-body)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{v.kindLabel}</div>
          <div dir="auto" style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', overflowWrap: 'anywhere' }}>{v.title}</div>
          <div dir="ltr" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{v.handleLine}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
          {v.kind === 'profile' && sharingOff === true && (
            <span style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, backgroundColor: '#FEE2E2', color: '#991B1B' }}>
              {TAKEDOWN_WORDS.tag}
            </span>
          )}
          <span style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, backgroundColor: status.bg, color: status.color }}>
            {v.statusLabel}
          </span>
        </div>
      </div>

      {v.reasons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {v.reasons.map(r => (
            <span key={r.key} style={{
              padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 12,
              backgroundColor: r.key === 'medical' ? '#FEE2E2' : 'var(--color-surface-muted)',
              color: r.key === 'medical' ? '#991B1B' : 'var(--color-text-secondary)',
            }}>
              {r.label}: {r.count}
            </span>
          ))}
        </div>
      )}

      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{v.countLine}</div>
      {v.agesLine && <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>{v.agesLine}</div>}

      {pv.open && (
        <div style={previewBox} aria-live="polite">
          {pv.status === 'loading' && <div style={{ color: 'var(--color-text-tertiary)' }}>{PREVIEW_WORDS.loading}</div>}
          {pv.status !== 'loading' && pv.status !== 'ok' && <div role="alert" style={{ color: '#DC2626' }}>{previewStatusText(pv.status)}</div>}
          {pv.status === 'ok' && pv.preview && <PreviewBody preview={pv.preview} />}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
        <button
          type="button"
          onClick={togglePreview}
          aria-expanded={pv.open}
          style={{ ...buttonBase, display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        >
          {pv.open ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          {pv.open ? PREVIEW_WORDS.hide : PREVIEW_WORDS.button}
        </button>
        {v.actions.map(a => (
          <button
            key={a.key}
            type="button"
            disabled={busy}
            onClick={() => onAct(a.key, row)}
            style={{
              ...buttonBase,
              border: a.danger ? 'none' : '1px solid var(--color-border)',
              backgroundColor: a.danger ? 'var(--color-error, #ef4444)' : 'var(--color-surface)',
              color: a.danger ? '#fff' : 'var(--color-text-primary)',
              opacity: busy ? 0.55 : 1, cursor: busy ? 'default' : 'pointer',
            }}
          >
            {a.label}
          </button>
        ))}
        {v.kind === 'profile' && (
          <TakedownActions
            profileId={row.targetId}
            name={row.name}
            handle={row.handle}
            sharingOff={sharingOff}
            disabled={busy}
            onChanged={onChanged}
          />
        )}
        {v.profilePath && (
          <Link
            to={v.profilePath}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-accent-text)', textDecoration: 'none', marginLeft: 'auto' }}
          >
            Open profile <ExternalLink size={13} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  )
}

export default function ReportsManager() {
  const [status, setStatus] = useState('loading')
  const [rows, setRows] = useState([])
  const [pending, setPending] = useState(null)
  const [busyKey, setBusyKey] = useState(null)
  const [notice, setNotice] = useState('')
  const [off, setOff] = useState({ status: 'loading', ids: [], people: [] })

  // Reading again: Refresh and a finished action bump this counter, which runs the effect below once more.
  const [reloadKey, setReloadKey] = useState(0)
  function reload() {
    setStatus('loading')
    setReloadKey((n) => n + 1)
  }

  useEffect(() => {
    let cancelled = false
    fetchReports().then((r) => {
      if (cancelled) return
      if (r.status === 'ok') setRows(r.rows)
      setStatus(r.status)
    })
    // Who has sharing off is read on its own: a failed read never hides the reports.
    fetchSharingOff().then((r) => { if (!cancelled) setOff(r) })
    return () => { cancelled = true }
  }, [reloadKey])

  async function run() {
    const { action, row } = pending
    setPending(null)
    setBusyKey(`${row.kind}:${row.targetId}`)
    setNotice('')
    const r = await actOnReport(action, row)
    setBusyKey(null)
    if (r.status === 'ok') {
      setNotice(resultText('ok'))
      reload()
    } else {
      setNotice(resultText(r.status))
    }
  }

  const copy = pending ? confirmCopy(pending.action, pending.row) : null
  const loading = status === 'loading'

  return (
    <AdminPageHeader
      title={REPORTS_WORDS.title}
      actions={
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          aria-label="Refresh"
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      }
    >
      {notice && (
        <div role="status" style={{
          marginBottom: 'var(--space-4)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 13,
          backgroundColor: notice === resultText('ok') ? '#D1FAE5' : '#FEF2F2',
          color: notice === resultText('ok') ? '#065F46' : '#DC2626',
          border: `1px solid ${notice === resultText('ok') ? '#6EE7B7' : '#FECACA'}`,
        }}>
          {notice}
        </div>
      )}

      {(status === 'forbidden' || status === 'offline' || status === 'error') && (
        <div role="alert" style={{
          padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 13, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626',
        }}>
          {status === 'forbidden' ? REPORTS_WORDS.forbidden : status === 'offline' ? REPORTS_WORDS.offline : REPORTS_WORDS.loadError}
        </div>
      )}

      {loading && rows.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: 120, borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {status === 'ok' && rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
          <div style={{ marginBottom: 'var(--space-3)', opacity: 0.35 }}><Flag size={36} /></div>
          <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>{REPORTS_WORDS.empty}</div>
          <div style={{ fontSize: 13 }}>{REPORTS_WORDS.emptyLine}</div>
        </div>
      )}

      {rows.length > 0 && status !== 'forbidden' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {rows.map(row => (
            <ReportCard
              key={`${row.kind}:${row.targetId}`}
              row={row}
              busy={busyKey !== null}
              onAct={(action, r) => setPending({ action, row: r })}
              sharingOff={off.status === 'ok' ? off.ids.includes(row.targetId) : null}
              onChanged={reload}
            />
          ))}
        </div>
      )}

      {status !== 'forbidden' && <PageProblemsSection reloadKey={reloadKey} />}

      {status !== 'forbidden' && <SharingOffList off={off} onChanged={reload} />}

      <ConfirmModal
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={run}
        title={copy?.title}
        message={copy?.message}
        confirmLabel={copy?.confirmLabel}
        confirmVariant={copy?.confirmVariant}
      />
    </AdminPageHeader>
  )
}
