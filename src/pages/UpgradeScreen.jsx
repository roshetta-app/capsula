/**
 * src/pages/UpgradeScreen.jsx
 *
 * Stage 3, step 3 (2026-11-24) — Capsula PRO: the plans, the "I paid" steps and the request status,
 * all on one page (/account/upgrade) so the navigation rulebook needs one new rule. Drawn first
 * (4 screens); data and rules in src/lib/proQueries.js (Migration 14).
 *
 * What the person sees, top to bottom:
 *   - signed out: a sign-in card (Pro belongs to an account).
 *   - a waiting request:      "Your request" (plan, amount, code, time, receipt) and Cancel request.
 *   - otherwise:              the Pro status (running / ended), a "Not confirmed" card after a rejection,
 *                             then the plans and "Continue to payment"; that opens the "I paid" steps.
 *   - lifetime Pro:           a short message, nothing to buy.
 *
 * Pro is never switched on here. The person only tells us they paid; the owner approves in the CMS
 * (step 4) and the database sets the plan and end date (decision 25: paying early ADDS time).
 * No refunds (decision 25) is said in plain words before the person continues.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronLeft } from 'lucide-react'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import { shimmer } from '../components/drugs/home/shimmer'
import { useAuth } from '../hooks/useAuth'
import { useBackLabel } from '../hooks/useBackLabel'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import {
  PLAN_ORDER, PLAN_MONTHS, PLAN_LABEL, DEFAULT_PLAN, RECEIPT_REQUIRED, PROMISE_TEXT, REJECT_REASON_TEXT,
  fetchPlanPrices, fetchProSettings, fetchMyProReference, fetchMyProRequests, createProRequest, uploadAndAttachReceipt, cancelProRequest,
} from '../lib/proQueries'
import { payState } from '../utils/proSettingsAdmin'
import { logUsageEvent } from '../analytics/usageEvents'

const font = 'var(--font-body)'

const BENEFITS = [
  'Up to 100 roshettas, 30 drugs each',
  'Up to 500 drug groups, 100 drugs each',
  'Longer notes, with photos',
  'The whole library works offline',
]

const cardStyle = {
  backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16,
  padding: 'var(--space-3) var(--space-4)', fontFamily: font,
}

const primaryButton = (disabled) => ({
  width: '100%', minHeight: 48, borderRadius: 9999, border: 'none', cursor: disabled ? 'default' : 'pointer',
  backgroundColor: 'var(--color-accent-solid)', color: '#fff', opacity: disabled ? 0.5 : 1,
  fontFamily: font, fontSize: 15, fontWeight: 600, outline: 'none', WebkitTapHighlightColor: 'transparent',
})

const softButton = {
  width: '100%', minHeight: 44, borderRadius: 9999, cursor: 'pointer',
  backgroundColor: 'var(--color-surface)', color: 'var(--color-accent-text)', border: '1px solid var(--color-chip-line)',
  fontFamily: font, fontSize: 14, fontWeight: 600, outline: 'none', WebkitTapHighlightColor: 'transparent',
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

function perMonth(plan, amount) {
  const months = PLAN_MONTHS[plan]
  if (!months || months === 1) return null
  return `About ${Math.round(amount / months)} EGP a month`
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', fontSize: 14 }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function Notice({ tone, title, children }) {
  const warn = tone === 'warning'
  return (
    <div
      role="status"
      style={{
        ...cardStyle, marginBottom: 'var(--space-3)',
        backgroundColor: warn ? 'var(--color-danger-light)' : 'var(--color-accent-light)',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>{children}</div>
    </div>
  )
}

export default function UpgradeScreen() {
  const navigate = useNavigate()
  useDeepLinkParent()
  const backLabel = useBackLabel() || 'Profile'
  const { user, profile, loading: authLoading, signInWithGoogle } = useAuth()
  const { isOnline } = useOnlineStatus()
  const userId = user?.id ?? null

  const [data, setData] = useState(null)        // { prices, requests, reference } or null while loading
  const [failed, setFailed] = useState(false)
  const [view, setView] = useState('plans')     // 'plans' | 'pay'
  const [plan, setPlan] = useState(DEFAULT_PLAN)
  const [dismissedReject, setDismissedReject] = useState(false)

  const load = useCallback(async () => {
    try {
      const [prices, requests, reference, settings] = await Promise.all([fetchPlanPrices(), fetchMyProRequests(), fetchMyProReference(), fetchProSettings()])
      setData({ prices, requests, reference, settings })
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    load()
  }, [userId, load])

  // Track K (K3b): one 'upgrade_screen_view' per visit, only for a signed-in person once the page has loaded
  // (guests see the sign-in card and are not counted). No name, number or amount is sent.
  const viewLoggedRef = useRef(false)
  useEffect(() => {
    if (!userId || !data || viewLoggedRef.current) return
    viewLoggedRef.current = true
    logUsageEvent('upgrade_screen_view')
  }, [userId, data])

  function retry() {
    setFailed(false)
    setData(null)
    load()
  }

  const isPaid = profile?.tier === 'paid'
  const isLifetime = isPaid && profile?.pro_plan === 'lifetime'
  const hasEnded = !isPaid && Boolean(profile?.pro_end) && new Date(profile.pro_end) < new Date()
  const latest = data?.requests?.[0] ?? null
  const waiting = latest?.status === 'waiting' ? latest : null
  const rejected = latest?.status === 'rejected' && !dismissedReject ? latest : null

  const backButton = (
    <button
      type="button"
      onClick={() => (view === 'pay' ? setView('plans') : navigate(-1))}
      aria-label={view === 'pay' ? 'Back to plans' : `Back to ${backLabel}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-accent-text)', fontSize: 14, fontWeight: 500, fontFamily: font, padding: '4px 0',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <ChevronLeft size={18} strokeWidth={2.2} aria-hidden="true" />
      {view === 'pay' ? 'Plans' : backLabel}
    </button>
  )

  let body
  if (authLoading) {
    body = <div aria-hidden="true" style={shimmer({ height: 56 * 4, borderRadius: 16 })} />
  } else if (!userId) {
    body = (
      <GroupStateMessage
        title="Sign in to go Pro"
        body="Pro belongs to your account, so you need to sign in first."
        actionLabel="Sign in"
        onAction={() => signInWithGoogle?.()}
      />
    )
  } else if (failed) {
    body = (
      <GroupStateMessage
        title="Couldn't load Pro"
        body={isOnline ? 'Something went wrong. Please try again.' : "You're offline. Check your connection and try again."}
        actionLabel="Try again"
        onAction={retry}
        secondary
      />
    )
  } else if (!data) {
    body = <div aria-hidden="true" style={shimmer({ height: 56 * 4, borderRadius: 16 })} />
  } else if (isLifetime) {
    body = (
      <Notice title="Pro is on">
        Your Pro has no end date. There is nothing to buy.
      </Notice>
    )
  } else if (waiting) {
    body = <WaitingView request={waiting} userId={userId} onChanged={load} />
  } else if (view === 'pay') {
    const price = data.prices.find(p => p.plan === plan)
    body = (
      <PayView
        plan={plan}
        amount={price?.amount_egp ?? 0}
        reference={data.reference}
        settings={data.settings}
        userId={userId}
        onDone={async () => { setView('plans'); await load() }}
        onAlreadyWaiting={async () => { setView('plans'); await load() }}
      />
    )
  } else {
    body = (
      <>
        {isPaid && (
          <Notice title="Pro is on">
            {profile?.pro_plan === 'trial'
              ? `Your free trial runs until ${fmtDate(profile?.pro_end)}.`
              : `Your Pro runs until ${fmtDate(profile?.pro_end)}.`}
          </Notice>
        )}
        {hasEnded && (
          <Notice title="Your Pro has ended">
            Nothing was deleted. You can still open, edit and delete everything. You can&apos;t add new items past
            the free limits until you renew or remove some. The offline library has stopped.
          </Notice>
        )}
        {rejected && (
          <Notice tone="warning" title="We could not confirm this payment">
            {REJECT_REASON_TEXT[rejected.reject_reason] ? `Reason: ${REJECT_REASON_TEXT[rejected.reject_reason]} ` : ''}
            You can send a new request.
            <button type="button" onClick={() => setDismissedReject(true)} style={{ ...primaryButton(false), marginTop: 12 }}>
              Try again
            </button>
          </Notice>
        )}
        <PlansView
          prices={data.prices}
          plan={plan}
          onPlan={setPlan}
          renewing={isPaid || hasEnded}
          onContinue={() => { logUsageEvent('upgrade_request_start', null, plan); setView('pay') }}
        />
      </>
    )
  }

  return (
    <div style={{ padding: 'var(--space-3) 0 var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-3)' }}>{backButton}</div>
      <h1 style={{ margin: '0 0 var(--space-3)', fontSize: 22, fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text-primary)', fontFamily: font }}>
        {view === 'pay' && !waiting ? `Pay for ${PLAN_LABEL[plan]}` : waiting ? 'Your request' : 'Capsula PRO'}
      </h1>
      {body}
    </div>
  )
}

function PlansView({ prices, plan, onPlan, renewing, onContinue }) {
  const ordered = PLAN_ORDER.map(p => prices.find(x => x.plan === p)).filter(Boolean)
  return (
    <>
      <div style={{ ...cardStyle, marginBottom: 'var(--space-3)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>With Pro you get</div>
        {BENEFITS.map(b => (
          <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0', fontSize: 14, color: 'var(--color-text-primary)' }}>
            <Check size={16} strokeWidth={2.4} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-accent)' }} />
            <span>{b}</span>
          </div>
        ))}
      </div>

      <div role="radiogroup" aria-label="Plan" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        {ordered.map(p => {
          const selected = p.plan === plan
          const sub = perMonth(p.plan, p.amount_egp) ?? '1 month of Pro'
          return (
            <button
              key={p.plan}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onPlan(p.plan)}
              style={{
                ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', cursor: 'pointer',
                border: selected ? '2px solid var(--color-accent-solid)' : '1px solid var(--color-border)',
                backgroundColor: selected ? 'var(--color-accent-light)' : 'var(--color-surface)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box',
                  border: selected ? '6px solid var(--color-accent-solid)' : '2px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {PLAN_LABEL[p.plan]}
                  {p.plan === 'yearly' && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, backgroundColor: 'var(--color-accent-solid)', color: '#fff' }}>
                      Best value
                    </span>
                  )}
                </span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{sub}</span>
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', flexShrink: 0 }}>{p.amount_egp} EGP</span>
            </button>
          )
        })}
      </div>

      <p style={{ margin: '0 0 var(--space-3)', fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-secondary)', fontFamily: font }}>
        Pay once, no automatic renewal. Payments are not refunded.
        {renewing ? ' Paying early adds time to your current Pro.' : ''}
      </p>

      <button type="button" onClick={onContinue} style={primaryButton(false)}>Continue to payment</button>
    </>
  )
}

function PayView({ plan, amount, reference, settings, userId, onDone, onAlreadyWaiting }) {
  const payReady = payState(settings) === 'ready'
  const [sender, setSender] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const fileRef = useRef(null)

  const digits = sender.replace(/[^0-9٠-٩۰-۹]/g, '')
  const senderOk = digits.length >= 4 && digits.length <= 15
  const receiptOk = !RECEIPT_REQUIRED || Boolean(file)
  const canSubmit = senderOk && receiptOk && Boolean(reference) && payReady && !busy

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(reference)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked: the code is on screen to copy by hand
    }
  }

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const res = await createProRequest(plan, sender)
      if (res.status === 'already_waiting') { await onAlreadyWaiting(); return }
      if (res.status === 'bad_sender') { setError('Enter the number you sent from (at least 4 digits).'); setBusy(false); return }
      if (res.status === 'cap') { setError('You sent too many requests today. Please try again tomorrow.'); setBusy(false); return }
      if (res.status !== 'ok') { setError('Something went wrong. Please try again.'); setBusy(false); return }
      if (file) {
        try {
          await uploadAndAttachReceipt(userId, res.id, file)
        } catch {
          // the request exists; the next screen lets the person add the receipt again
        }
      }
      await onDone()
    } catch {
      setError('Something went wrong. Check your connection and try again.')
      setBusy(false)
    }
  }

  return (
    <>
      <div style={{ ...cardStyle, marginBottom: 'var(--space-2)' }}>
        <Row label="Plan" value={PLAN_LABEL[plan]} />
        <Row label="Amount" value={`${amount} EGP`} />
      </div>

      <div style={{ ...cardStyle, marginBottom: 'var(--space-2)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>1. Send {amount} EGP</div>
        <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          {payReady
            ? `By ${settings.wallet_name} to ${settings.wallet_number}`
            : payState(settings) === 'paused'
              ? 'Payments are paused for now. Please check back later.'
              : 'Payment details are coming soon. Please check back later.'}
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 'var(--space-2)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>2. Write your code in the note</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-accent-text)' }}>{reference ?? '...'}</span>
          <button type="button" onClick={copyCode} style={{ ...softButton, width: 'auto', padding: '0 16px' }}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 'var(--space-2)' }}>
        <label htmlFor="pro-sender" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
          3. Number you sent from
        </label>
        <input
          id="pro-sender"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={sender}
          onChange={e => setSender(e.target.value)}
          placeholder="01XXXXXXXXX"
          style={{
            width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '0 12px', borderRadius: 12,
            border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-primary)',
            fontFamily: font, fontSize: 16,
          }}
        />
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6 }}>We keep only the last 4 digits.</div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 'var(--space-3)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
          4. Add a photo of the receipt{RECEIPT_REQUIRED ? '' : ' (optional)'}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          style={{ display: 'none' }}
        />
        <button type="button" onClick={() => fileRef.current?.click()} style={softButton}>
          {file ? 'Change photo' : 'Choose photo'}
        </button>
        {file && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6, wordBreak: 'break-all' }}>{file.name}</div>}
      </div>

      {error && <div role="alert" style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 'var(--space-2)', fontFamily: font }}>{error}</div>}
      <p style={{ margin: '0 0 var(--space-2)', textAlign: 'center', fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-secondary)', fontFamily: font }}>
        {PROMISE_TEXT}
      </p>
      <button type="button" disabled={!canSubmit} onClick={submit} style={primaryButton(!canSubmit)}>
        {busy ? 'Sending...' : 'I paid'}
      </button>
    </>
  )
}

function WaitingView({ request, userId, onChanged }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  async function cancel() {
    setBusy(true)
    setError('')
    try {
      await cancelProRequest(request.id)
      await onChanged()
    } catch {
      setError('Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  async function addReceipt(file) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      await uploadAndAttachReceipt(userId, request.id, file)
      await onChanged()
    } catch {
      setError('We could not upload the photo. Please try again.')
    }
    setBusy(false)
  }

  return (
    <>
      <Notice title="We got your payment request">
        {PROMISE_TEXT} We will send you a notification.
      </Notice>
      <div style={{ ...cardStyle, marginBottom: 'var(--space-3)' }}>
        <Row label="Plan" value={PLAN_LABEL[request.plan] ?? request.plan} />
        <Row label="Amount" value={`${request.amount_egp} EGP`} />
        <Row label="Your code" value={request.reference_code} />
        <Row label="Sent" value={fmtDateTime(request.created_at)} />
        <Row label="Receipt" value={request.has_receipt ? 'Added' : 'Not added'} />
      </div>
      {!request.has_receipt && (
        <>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => addReceipt(e.target.files?.[0])} />
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} style={{ ...softButton, marginBottom: 'var(--space-2)' }}>
            Add receipt photo
          </button>
        </>
      )}
      {error && <div role="alert" style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 'var(--space-2)', fontFamily: font }}>{error}</div>}
      {confirming ? (
        <div style={{ ...cardStyle }}>
          <div style={{ fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 12 }}>
            Cancel this request?
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} style={softButton}>Keep it</button>
            <button type="button" disabled={busy} onClick={cancel} style={primaryButton(busy)}>Yes, cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => setConfirming(true)} style={softButton}>Cancel request</button>
      )}
    </>
  )
}
