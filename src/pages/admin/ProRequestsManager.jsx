/**
 * src/pages/admin/ProRequestsManager.jsx
 *
 * Stage 3, step 4 (2026-11-24) — the CMS Pro requests screen at /admin/pro-requests. One card per payment
 * request the app made ("I paid" on the Upgrade page). Waiting requests come first, oldest on top; one
 * waiting over 12 hours gets an amber edge, over 24 hours a red edge (the 24 hour promise, decision 29).
 *
 * Approve asks first and says what to check in your own wallet (decision 28: a receipt photo is not proof).
 * Approve calls admin_approve_pro_request (Pro on, the end date extended from the later of today and the current
 * end, the person notified). Reject picks one of six reasons, asks first, then admin_reject_pro_request.
 * The receipt photo (private folder pro-receipts, admin read only) is opened on demand through a short-lived link.
 * The rules and words are in utils/proRequestsAdmin.js; the database side is Migration 16.
 *
 * Not here (later): the Telegram doorbell for a new request, the repeat at 12 hours, the Approve button in Telegram.
 */

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Receipt } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import ConfirmModal from '../../components/admin/ConfirmModal'
import { supabase } from '../../lib/supabase'
import {
  STATUS_TABS, REJECT_REASONS, PLAN_NAMES, waitTone, waitText, approveCopy, rejectCopy, errorText,
} from '../../utils/proRequestsAdmin'

const TONE_EDGE = { none: 'var(--color-border)', ok: 'var(--color-border)', late: '#D97706', overdue: '#DC2626' }

const buttonBase = {
  padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-body)', cursor: 'pointer',
}

function fmt(iso) {
  return iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''
}

function Field({ label, value }) {
  return (
    <div style={{ minWidth: 120 }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  )
}

function RequestCard({ row, busy, onApprove, onReject }) {
  const [showReasons, setShowReasons] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState(null)
  const [receiptError, setReceiptError] = useState('')
  const tone = waitTone(row.status, row.hours_waiting)

  async function viewReceipt() {
    setReceiptError('')
    const { data, error } = await supabase.storage.from('pro-receipts').createSignedUrl(row.receipt_path, 120)
    if (error || !data?.signedUrl) { setReceiptError('Could not open the receipt.'); return }
    setReceiptUrl(data.signedUrl)
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: `4px solid ${TONE_EDGE[tone]}`,
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', padding: 'var(--space-4)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <Field label="Person" value={row.full_name || '(no name)'} />
        <Field label="Plan" value={PLAN_NAMES[row.plan] ?? row.plan} />
        <Field label="Amount" value={`${row.amount_egp} EGP`} />
        <Field label="Code" value={row.reference_code} />
        <Field label="Sent from (last 4)" value={row.sender_last4} />
        <Field label="Requested" value={fmt(row.created_at)} />
        {row.status === 'waiting' && (
          <Field
            label="Waiting"
            value={`${waitText(row.hours_waiting)}${tone === 'overdue' ? ' (over 24 hours)' : tone === 'late' ? ' (over 12 hours)' : ''}`}
          />
        )}
        {row.status !== 'waiting' && <Field label="Decided" value={fmt(row.decided_at)} />}
        {row.status === 'rejected' && row.reject_reason && (
          <Field label="Reason" value={REJECT_REASONS.find(r => r.key === row.reject_reason)?.label ?? row.reject_reason} />
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)' }}>
        {row.has_receipt && !row.receipt_deleted ? (
          <button type="button" onClick={viewReceipt} style={{ ...buttonBase, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Receipt size={14} /> View receipt
          </button>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            {row.receipt_deleted ? 'Receipt deleted after 90 days' : 'No receipt photo'}
          </span>
        )}
        {receiptError && <span role="alert" style={{ fontSize: 13, color: '#DC2626' }}>{receiptError}</span>}
      </div>

      {receiptUrl && (
        <div>
          <img src={receiptUrl} alt="Receipt photo" style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
          <div style={{ marginTop: 4 }}>
            <a href={receiptUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--color-accent-text)' }}>Open full size</a>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}> (link works for 2 minutes)</span>
          </div>
        </div>
      )}

      {row.status === 'waiting' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <button
              type="button" disabled={busy} onClick={() => onApprove(row)}
              style={{ ...buttonBase, border: 'none', backgroundColor: 'var(--color-accent-solid)', color: '#fff', opacity: busy ? 0.5 : 1 }}
            >
              Approve
            </button>
            <button
              type="button" disabled={busy} onClick={() => setShowReasons(v => !v)}
              style={{ ...buttonBase, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)', opacity: busy ? 0.5 : 1 }}
            >
              Reject
            </button>
          </div>
          {showReasons && (
            <div role="group" aria-label="Reason for rejecting" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {REJECT_REASONS.map(r => (
                <button
                  key={r.key} type="button" disabled={busy} onClick={() => onReject(row, r.key)}
                  style={{ ...buttonBase, fontWeight: 500, border: '1px solid #FECACA', backgroundColor: '#FEF2F2', color: '#991B1B' }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function ProRequestsManager() {
  const [tab, setTab] = useState('waiting')
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading')   // loading | ok | forbidden | error
  const [notice, setNotice] = useState(null)       // { ok: boolean, text: string }
  const [pending, setPending] = useState(null)     // { action: 'approve'|'reject', row, reason? }
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (which) => {
    setState('loading')
    const { data, error } = await supabase.rpc('admin_pro_requests', { p_status: which, p_limit: 100 })
    if (error) {
      setState(String(error.message).includes('forbidden') ? 'forbidden' : 'error')
      return
    }
    setRows(data ?? [])
    setState('ok')
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  async function run() {
    if (!pending) return
    const { action, row, reason } = pending
    setBusy(true)
    setPending(null)
    const { error } = action === 'approve'
      ? await supabase.rpc('admin_approve_pro_request', { p_id: row.id })
      : await supabase.rpc('admin_reject_pro_request', { p_id: row.id, p_reason: reason })
    setBusy(false)
    if (error) setNotice({ ok: false, text: errorText(error) })
    else setNotice({ ok: true, text: action === 'approve' ? 'Approved. Pro is on and the person was notified.' : 'Rejected. The person was notified.' })
    load(tab)
  }

  const copy = pending ? (pending.action === 'approve' ? approveCopy(pending.row) : rejectCopy(pending.row, pending.reason)) : null

  return (
    <AdminPageHeader
      title="Pro requests"
      actions={
        <button
          type="button" onClick={() => load(tab)} disabled={state === 'loading'} aria-label="Refresh"
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
            cursor: state === 'loading' ? 'not-allowed' : 'pointer', opacity: state === 'loading' ? 0.5 : 1,
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      <div role="tablist" aria-label="Request status" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {STATUS_TABS.map(t => (
          <button
            key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            style={{
              ...buttonBase, fontWeight: 500, borderRadius: 9999,
              border: tab === t.key ? '1px solid var(--color-accent-solid)' : '1px solid var(--color-border)',
              backgroundColor: tab === t.key ? 'var(--color-accent-light)' : 'var(--color-surface)',
              color: tab === t.key ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice && (
        <div role="status" style={{
          marginBottom: 'var(--space-4)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 13,
          backgroundColor: notice.ok ? '#D1FAE5' : '#FEF2F2', color: notice.ok ? '#065F46' : '#DC2626',
          border: `1px solid ${notice.ok ? '#6EE7B7' : '#FECACA'}`,
        }}>
          {notice.text}
        </div>
      )}

      {(state === 'forbidden' || state === 'error') && (
        <div role="alert" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 13, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
          {state === 'forbidden' ? 'Only an admin account can open this screen.' : 'Could not load the requests. Check the connection and press Refresh.'}
        </div>
      )}

      {state === 'ok' && rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-4)', color: 'var(--color-text-tertiary)', fontSize: 15 }}>
          {tab === 'waiting' ? 'No requests are waiting.' : `No ${tab} requests.`}
        </div>
      )}

      {state === 'ok' && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {rows.map(row => (
            <RequestCard
              key={row.id} row={row} busy={busy}
              onApprove={r => setPending({ action: 'approve', row: r })}
              onReject={(r, reason) => setPending({ action: 'reject', row: r, reason })}
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
        confirmVariant={pending?.action === 'reject' ? 'danger' : 'primary'}
      />
    </AdminPageHeader>
  )
}
