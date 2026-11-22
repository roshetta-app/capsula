/**
 * src/components/admin/PageProblemsSection.jsx
 * 2026-11-23 (Track I, step I5): the "Page problems" section of the CMS Reports screen. One card per Topic,
 * brand or generic page that has open reports (a dose report gets a red edge and comes first), with the
 * reasons and how many reports, the newest notes, and the actions: Open page, Open in editor, Mark fixed and
 * Dismiss. Mark fixed and Dismiss only close the open reports; nothing changes on the page and nothing is hidden.
 * Every action asks first and is written to the Audit Log by the database. The reporters' names and ids are
 * never shown (the database never sends them). Notes are the reporters' own words and are drawn as plain text
 * only: never as markup and never as a link.
 *
 * The rules and words live in utils/pageProblemsAdmin.js; the calls are utils/pageProblemsAdminContent.js.
 * reloadKey comes from the Reports screen, so its Refresh button reads this section again too.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import { fetchPageProblems, actOnPageProblem } from '../../utils/pageProblemsAdminContent'
import { cardView, confirmCopy, pageResultText, PAGE_PROBLEMS_WORDS } from '../../utils/pageProblemsAdmin'

const buttonBase = {
  padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-body)', cursor: 'pointer',
}
const plainText = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }
const linkStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-accent-text)', textDecoration: 'none',
}

function PageProblemCard({ row, busy, onAct }) {
  const v = cardView(row)
  return (
    <div style={{
      padding: 'var(--space-4)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderLeft: v.urgent ? '4px solid #DC2626' : '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontFamily: 'var(--font-body)',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{v.kindLabel}</div>
        <div dir="auto" style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', overflowWrap: 'anywhere' }}>{v.title}</div>
        {v.subtitle && <div dir="auto" style={{ fontSize: 13, color: 'var(--color-text-secondary)', overflowWrap: 'anywhere' }}>{v.subtitle}</div>}
      </div>

      {v.reasons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {v.reasons.map(r => (
            <span key={r.key} style={{
              padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 12,
              backgroundColor: r.urgent ? '#FEE2E2' : 'var(--color-surface-muted)',
              color: r.urgent ? '#991B1B' : 'var(--color-text-secondary)',
            }}>
              {r.label}: {r.count}
            </span>
          ))}
        </div>
      )}

      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{v.countLine}</div>

      {v.notes.length > 0 && (
        <div style={{
          padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-muted)',
          border: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-primary)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)' }}>{PAGE_PROBLEMS_WORDS.notesTitle}</div>
          {v.notes.map((n, i) => (
            <div key={i}>
              {n.when && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{n.when}</div>}
              <div dir="auto" style={plainText}>{n.text}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-1)' }}>
        {v.openPagePath && (
          <Link to={v.openPagePath} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            {PAGE_PROBLEMS_WORDS.openPage} <ExternalLink size={13} aria-hidden="true" />
          </Link>
        )}
        {v.editorPath && (
          <Link to={v.editorPath} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            {PAGE_PROBLEMS_WORDS.openEditor} <ExternalLink size={13} aria-hidden="true" />
          </Link>
        )}
        {v.formulationPath && (
          <Link to={v.formulationPath} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            {PAGE_PROBLEMS_WORDS.formulationLink} <ExternalLink size={13} aria-hidden="true" />
          </Link>
        )}
        {v.genericPath && (
          <Link to={v.genericPath} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            {PAGE_PROBLEMS_WORDS.genericLink} <ExternalLink size={13} aria-hidden="true" />
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {['fixed', 'dismissed'].map(a => (
          <button
            key={a}
            type="button"
            disabled={busy}
            onClick={() => onAct(a, row)}
            style={{
              ...buttonBase, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)', opacity: busy ? 0.55 : 1, cursor: busy ? 'default' : 'pointer',
            }}
          >
            {PAGE_PROBLEMS_WORDS[a]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function PageProblemsSection({ reloadKey = 0 }) {
  // What was read last, with the reading it belongs to: while the current reading differs, the section is loading.
  const [res, setRes] = useState({ key: null, status: 'loading', rows: [] })
  const [pending, setPending] = useState(null)
  const [busyKey, setBusyKey] = useState(null)
  const [notice, setNotice] = useState('')
  const [ownKey, setOwnKey] = useState(0)
  const readKey = `${reloadKey}:${ownKey}`
  const status = res.key === readKey ? res.status : 'loading'
  const rows = res.rows

  useEffect(() => {
    let cancelled = false
    fetchPageProblems().then((r) => {
      if (cancelled) return
      setRes((prev) => ({ key: readKey, status: r.status, rows: r.status === 'ok' ? r.rows : prev.rows }))
    })
    return () => { cancelled = true }
  }, [readKey])

  async function run() {
    const { action, row } = pending
    setPending(null)
    setBusyKey(`${row.kind}:${row.targetId}`)
    setNotice('')
    const r = await actOnPageProblem(action, row)
    setBusyKey(null)
    if (r.status === 'ok') {
      setNotice(pageResultText('ok'))
      setOwnKey((n) => n + 1)
    } else {
      setNotice(pageResultText(r.status))
    }
  }

  const copy = pending ? confirmCopy(pending.action, pending.row) : null
  const ok = notice === pageResultText('ok')

  return (
    <section aria-label={PAGE_PROBLEMS_WORDS.title} style={{ marginTop: 'var(--space-6)', fontFamily: 'var(--font-body)' }}>
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {PAGE_PROBLEMS_WORDS.title}{status === 'ok' && rows.length > 0 ? ` (${rows.length})` : ''}
        </h2>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{PAGE_PROBLEMS_WORDS.subtitle}</div>
      </div>

      {notice && (
        <div role="status" style={{
          marginBottom: 'var(--space-4)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 13,
          backgroundColor: ok ? '#D1FAE5' : '#FEF2F2', color: ok ? '#065F46' : '#DC2626',
          border: `1px solid ${ok ? '#6EE7B7' : '#FECACA'}`,
        }}>
          {notice}
        </div>
      )}

      {(status === 'forbidden' || status === 'offline' || status === 'error') && (
        <div role="alert" style={{
          padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 13, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626',
        }}>
          {status === 'forbidden' ? PAGE_PROBLEMS_WORDS.forbidden : status === 'offline' ? PAGE_PROBLEMS_WORDS.offline : PAGE_PROBLEMS_WORDS.loadError}
        </div>
      )}

      {status === 'loading' && rows.length === 0 && (
        <div style={{ height: 120, borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
      )}

      {status === 'ok' && rows.length === 0 && (
        <div style={{ padding: 'var(--space-6) var(--space-4)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
          <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>{PAGE_PROBLEMS_WORDS.empty}</div>
          <div style={{ fontSize: 13 }}>{PAGE_PROBLEMS_WORDS.emptyLine}</div>
        </div>
      )}

      {rows.length > 0 && status !== 'forbidden' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {rows.map(row => (
            <PageProblemCard
              key={`${row.kind}:${row.targetId}`}
              row={row}
              busy={busyKey !== null}
              onAct={(action, r) => setPending({ action, row: r })}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={run}
        title={copy?.title}
        message={copy?.message}
        confirmLabel={copy?.confirmLabel}
        confirmVariant={copy?.confirmVariant}
      />
    </section>
  )
}
