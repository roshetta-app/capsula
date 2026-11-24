/**
 * src/pages/admin/UsersManager.jsx
 * Phase F11 Stage 2 — Users CMS.
 * Admin CMS sidebar redesign, Users migration (D4/D6/D7):
 *  - Own header, back-button, and outer width wrapper removed — this
 *    screen now renders only its content, inside AdminLayout's shell
 *    (D4). Width widened from the old flat-list's 680 to 960 to make
 *    room for a real table instead of stacked buttons.
 *  - Redesigned from a flat list of tappable rows into a stat-card row
 *    (Total Users / Admins / Banned) + a real table (D6), computed
 *    client-side from the same fetchAllUsers() payload — no extra query
 *    needed for the stats.
 *  - Detail modal now also shows the newer profile fields (full name,
 *    occupation, specialty, country, gender, phone, student type) that
 *    the admin-users Edge Function's 'list' action was widened to
 *    return. These are display-only — D7: admins do not get an editing
 *    UI for a user's personal/professional info from the CMS, matching
 *    the existing ownership boundary (only role/tier/ban are
 *    admin-writable; self-editing is scoped to the row's own owner).
 *
 * Modeled on CategoriesManager.jsx's load()/toast/ConfirmModal shape.
 * Differences from that near-twin, both driven by what this data
 * actually is:
 *  - No drag-reorder, no active/inactive toggle, no add/delete —
 *    accounts are created by Google sign-in, not from this screen, and
 *    there is no "order" concept for a user list.
 *  - Track K step K5d (2026-11-24): the table now shows Name (with the email
 *    under it), Plan, Ends, Items (roshettas made), Last seen and Request,
 *    with filter chips (All, Pro, Trial, Ending soon, Waiting request), a
 *    search box (name or email) and paging (50 per page). All the rules and
 *    words live in src/utils/usersAdmin.js (checked on their own); the data
 *    comes from the admin-users 'list' answer (K5b). Role, tier and ban still
 *    live in the detail window, unchanged. Everything is filtered on this
 *    screen, which is fine at launch size (decision 1 of K5).
 *  - Track K step K5e (2026-11-24): the detail window also shows the person's
 *    Pro side, read from the admin-users 'detail' action when it opens: plan and
 *    end date, payment code, trial used or not, times they hit a limit, roshettas
 *    made, their requests (with a link to the Pro requests screen when one is
 *    waiting) and their Pro history, each line with who and when. If that call
 *    fails the window still opens and role, tier and ban still work.
 *  - Track K step K5f (2026-11-24): an Add days section in the same window (the
 *    late-approval fix, decision 29). A reason is required, 1 to 366 days per
 *    action, asked once before it is done; it goes through the database function
 *    admin_add_days (which writes the Pro history) and the app writes the Audit
 *    Log line. Lifetime and plans that are not running get a plain message
 *    instead of a button. After it, the end date and the history refresh.
 *  - Tap a row to open a detail modal for role/tier/ban, instead of an
 *    inline toggle — role and ban are consequential enough to want an
 *    explicit save step, and ban specifically goes through ConfirmModal
 *    since it blocks the person's sign-in.
 *  - tier is a currently-unused placeholder (D33 / F8 still undecided) —
 *    this screen only records the value, no billing logic reads it yet.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ShieldCheck, Ban, Search, ChevronRight, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast }   from '../../context/ToastContext'
import Modal          from '../../components/admin/Modal'
import ConfirmModal   from '../../components/admin/ConfirmModal'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import {
  fetchAllUsers,
  fetchUserDetail,
  addProDays,
  updateUserRole,
  updateUserTier,
  banUser,
  unbanUser,
} from '../../lib/adminQueries'
import {
  FILTERS, planKey, filterUsers, filterCounts, pageOf, planName, endsText, itemsText,
  lastSeenText, requestCell, planName as planNameOf, trialText, historyLine, requestLine,
  referenceText, limitHitsText, DETAIL_LOAD_ERROR,
  ADD_DAYS_MAX, canAddDays, validateAddDays, addDaysConfirmText, addDaysErrorText, addDaysDoneText,
} from '../../utils/usersAdmin'

// ─── Formatting helpers ─────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function isBanned(user) {
  return !!user.banned_until && new Date(user.banned_until).getTime() > Date.now()
}

function formatOccupation(user) {
  if (!user.occupation) return null
  if (user.occupation === 'Other' && user.occupation_other) return user.occupation_other
  return user.occupation
}

function formatPhone(user) {
  if (!user.phone_number) return null
  return user.phone_country_code
    ? `${user.phone_country_code} ${user.phone_number}`
    : user.phone_number
}

// ─── Person's Pro side (K5e) — read only ────────────────────────────────────

function Fact({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>
      {children}
    </div>
  )
}

// ─── Look and feel: pills, avatar, cards (2026-11-24 redesign of the list and the window) ──────────

const TONE_COLOR = {
  success: 'var(--color-success, #059669)',
  accent:  'var(--color-accent)',
  warning: 'var(--color-warning, #d97706)',
  error:   'var(--color-error, #ef4444)',
  muted:   'var(--color-text-secondary)',
}

function Pill({ tone = 'muted', icon: Icon, children }) {
  const c = TONE_COLOR[tone] ?? TONE_COLOR.muted
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 'var(--radius-full)',
      border: `1px solid color-mix(in srgb, ${c} 40%, transparent)`,
      backgroundColor: `color-mix(in srgb, ${c} 12%, transparent)`,
      color: c, fontSize: 11, fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {Icon && <Icon size={11} />}{children}
    </span>
  )
}

function planTone(user, now) {
  const key = planKey(user, now)
  if (key === 'free') return 'muted'
  if (key === 'trial') return 'accent'
  return 'success'
}

const REQUEST_TONE = { ok: 'accent', late: 'warning', overdue: 'error', ending: 'warning' }

function Avatar({ user, size = 40 }) {
  const letter = (user.full_name || user.email || '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'color-mix(in srgb, var(--color-accent) 14%, transparent)',
      color: 'var(--color-accent)', fontSize: Math.round(size * 0.42), fontWeight: 700,
    }}>
      {letter}
    </div>
  )
}

// Plan, end date and request state as small coloured pills. Extra pills (Admin, Banned) go in as children.
function StatusPills({ user, now, children }) {
  const req  = requestCell(user, now)
  const ends = endsText(user, now)
  const ending = req.tone === 'ending'
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      <Pill tone={planTone(user, now)}>{planName(user, now)}</Pill>
      {ending
        ? <Pill tone="warning">{req.text}{ends ? ` · ${ends}` : ''}</Pill>
        : ends && <Pill tone="muted">{ends === 'No end' ? 'No end date' : `Ends ${ends}`}</Pill>}
      {req.tone !== 'none' && !ending && <Pill tone={REQUEST_TONE[req.tone] ?? 'muted'}>{req.text}</Pill>}
      {children}
    </div>
  )
}

const sectionCard = {
  padding: '12px 14px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
}

const factsGrid = {
  '--cols-phone': 'minmax(0, 1fr) minmax(0, 1fr)',
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px',
}

// A section the admin can fold away: a native details element, so it works with no extra code.
function Collapsible({ title, count, defaultOpen = false, children }) {
  return (
    <details open={defaultOpen} style={sectionCard}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        <span>{title}{count !== undefined && count !== null ? <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 500 }}> · {count}</span> : null}</span>
        <ChevronDown size={16} color="var(--color-text-tertiary)" />
      </summary>
      <div style={{ marginTop: 10 }}>{children}</div>
    </details>
  )
}

// ─── Person's Pro side (K5e) — read only ────────────────────────────────────

// Waiting-request alert and the Pro facts. The facts that come from the list (plan, ends, trial) always show;
// the ones that need the detail call show dots while loading and a dash if it failed.
function ProFacts({ user, state, detail, onRetry }) {
  const now = new Date()
  const ends = endsText(user, now)
  const loading = state !== 'ready'
  const dash = state === 'error' ? '—' : '…'
  const waiting = (detail?.requests ?? []).find(r => r.status === 'waiting')

  return (
    <>
      {waiting && (
        <div style={{
          padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: 13,
          border: '1px solid var(--color-warning, #d97706)',
          backgroundColor: 'color-mix(in srgb, var(--color-warning, #d97706) 10%, transparent)',
          color: 'var(--color-text-primary)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>A request is waiting: {requestLine(waiting).title}</div>
          <Link to="/admin/pro-requests" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
            Open Pro requests to approve or reject
          </Link>
        </div>
      )}

      <div style={sectionCard}>
        <SectionTitle>Pro</SectionTitle>
        <div className="cms-cols cms-wrap-any" style={factsGrid}>
          <Fact label="Plan" value={planNameOf(user, now)} />
          <Fact label="Ends" value={ends || '—'} />
          <Fact label="Payment code" value={loading ? dash : referenceText(detail?.reference_code)} />
          <Fact label="Free trial" value={trialText(user)} />
          <Fact label="Hit a free limit" value={loading ? dash : limitHitsText(detail?.limit_hits)} />
          <Fact label="Roshettas made" value={loading ? dash : String(detail?.items_made ?? 0)} />
        </div>
        {state === 'error' && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-text-secondary)' }}>
            <div style={{ marginBottom: 8 }}>{DETAIL_LOAD_ERROR}</div>
            <button onClick={onRetry} style={btnSecondary}>Try again</button>
          </div>
        )}
      </div>
    </>
  )
}

// Requests and Pro history, each folded away until opened.
function ProLists({ state, detail }) {
  const loading  = state === 'loading'
  const history  = detail?.history ?? []
  const requests = detail?.requests ?? []
  if (state === 'error') return null

  return (
    <>
      <Collapsible title="Requests" count={loading ? null : requests.length}>
        {loading
          ? <div style={mutedLine}>Loading…</div>
          : requests.length === 0
            ? <div style={mutedLine}>No requests.</div>
            : requests.map((r, i) => {
                const line = requestLine(r)
                return (
                  <div key={r.id} style={{ ...listRow, borderTop: i === 0 ? 'none' : listRow.borderTop }}>
                    <div style={{ fontWeight: 600 }}>{line.title}</div>
                    <div style={mutedLine}>
                      {[line.status, line.when, line.receipt, line.code, line.by && `by ${line.by}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                )
              })}
      </Collapsible>

      <Collapsible title="Pro history" count={loading ? null : history.length}>
        {loading
          ? <div style={mutedLine}>Loading…</div>
          : history.length === 0
            ? <div style={mutedLine}>Nothing yet.</div>
            : history.map((h, i) => {
                const line = historyLine(h)
                return (
                  <div key={h.id} style={{ ...listRow, borderTop: i === 0 ? 'none' : listRow.borderTop }}>
                    <div>{line.text}</div>
                    <div style={mutedLine}>{[line.when, line.by && `by ${line.by}`].filter(Boolean).join(' · ')}</div>
                  </div>
                )
              })}
      </Collapsible>
    </>
  )
}

const mutedLine = { fontSize: 12, color: 'var(--color-text-tertiary)' }
const listRow  = { padding: '6px 0', borderTop: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-primary)' }

// ─── Add days (K5f) ──────────────────────────────────────────────────────────

function AddDays({ user, onAdded }) {
  const { toast } = useToast()
  const [days, setDays]       = useState('')
  const [reason, setReason]   = useState('')
  const [asking, setAsking]   = useState(false)   // true while the "are you sure" line is shown
  const [problem, setProblem] = useState('')
  const [busy, setBusy]       = useState(false)

  const can = canAddDays(user)
  if (!can.allowed) {
    return (
      <div>
        <SectionTitle>Add days</SectionTitle>
        <div style={mutedLine}>{can.why}</div>
      </div>
    )
  }

  function ask() {
    const check = validateAddDays(days, reason)
    if (!check.ok) { setProblem(check.error); return }
    setProblem('')
    setAsking(true)
  }

  async function doAdd() {
    const check = validateAddDays(days, reason)
    if (!check.ok) { setProblem(check.error); setAsking(false); return }
    setBusy(true)
    const { data, error } = await addProDays(user.id, check.days, check.reason, user.email)
    setBusy(false)
    setAsking(false)
    if (error) { setProblem(addDaysErrorText(error.message)); return }
    toast.success(addDaysDoneText(check.days, data.newEnd))
    setDays('')
    setReason('')
    setProblem('')
    onAdded(user.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionTitle>Add days</SectionTitle>
      <div style={mutedLine}>For a late approval or a goodwill extension. 1 to {ADD_DAYS_MAX} days each time. It is written in the Pro history and the Audit Log.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="number" inputMode="numeric" min={1} max={ADD_DAYS_MAX} step={1}
          value={days}
          onChange={e => { setDays(e.target.value); setAsking(false); setProblem('') }}
          placeholder="Days"
          aria-label="Days to add"
          disabled={busy}
          style={{ ...inputStyle, width: 90, flexShrink: 0 }}
        />
        <input
          value={reason}
          onChange={e => { setReason(e.target.value); setAsking(false); setProblem('') }}
          placeholder="Reason (required)"
          aria-label="Reason for adding days"
          maxLength={500}
          disabled={busy}
          style={inputStyle}
        />
      </div>

      {problem && <div role="alert" style={{ fontSize: 13, color: 'var(--color-error, #ef4444)' }}>{problem}</div>}

      {!asking && (
        <div>
          <button onClick={ask} disabled={busy} style={btnSecondary}>Add days</button>
        </div>
      )}

      {asking && (
        <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-primary)' }}>
          <div style={{ marginBottom: 8 }}>{addDaysConfirmText(user, validateAddDays(days, reason).days ?? days)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setAsking(false)} disabled={busy} style={btnSecondary}>Cancel</button>
            <button onClick={doAdd} disabled={busy} style={btnPrimary}>{busy ? 'Adding…' : 'Yes, add the days'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── UserModal — the person window ──────────────────────────────────────────

function UserModal({ open, user, onClose, onSaved, onAdded, onRequestBanConfirm }) {
  const { toast } = useToast()
  const [role, setRole] = useState('user')
  const [tier, setTier] = useState('free')
  const [busy, setBusy] = useState(false)
  const [detailTry, setDetailTry] = useState(0)
  const [detailResult, setDetailResult] = useState({ key: null, data: null, failed: false })
  useEffect(() => {
    if (open && user) {
      setRole(user.role ?? 'user')
      setTier(user.tier ?? 'free')
    }
  }, [open, user])

  // Pro details of this one person, kept with the key (person and attempt) they were asked for, so
  // an answer for someone else, or from before a retry, is never shown: it simply counts as loading.
  // A failure never blocks the role, tier and ban controls.
  const userId = user?.id
  const detailKey = `${userId}:${detailTry}`
  useEffect(() => {
    if (!open || !userId) return undefined
    let current = true
    fetchUserDetail(userId).then(({ data, error }) => {
      if (!current) return
      setDetailResult({ key: detailKey, data: error ? null : data, failed: Boolean(error || !data) })
    })
    return () => { current = false }
  }, [open, userId, detailKey])
  const fresh = detailResult.key === detailKey
  const detail = fresh ? detailResult.data : null
  const detailState = !fresh ? 'loading' : detailResult.failed ? 'error' : 'ready'

  if (!user) return null

  const banned = isBanned(user)
  const now = new Date()
  const dirty = role !== user.role || tier !== user.tier

  // View-only profile fields (D7) — only render the ones the account
  // actually has a value for, so accounts filled out before a given
  // field existed don't show a wall of "—".
  const profileFields = [
    ['Full name',    user.full_name],
    ['Occupation',   formatOccupation(user)],
    ['Specialty',    user.specialty],
    ['Student type', user.student_type],
    ['Country',      user.country],
    ['Gender',       user.gender],
    ['Phone',        formatPhone(user)],
  ].filter(([, value]) => !!value)

  async function handleSave() {
    setBusy(true)

    if (role !== user.role) {
      const { error } = await updateUserRole(user.id, role, user.email)
      if (error) {
        setBusy(false)
        toast.error(error.message ?? 'Failed to update role')
        return
      }
    }

    if (tier !== user.tier) {
      const { error } = await updateUserTier(user.id, tier, user.email)
      if (error) {
        setBusy(false)
        toast.error(error.message ?? 'Failed to update tier')
        return
      }
    }

    setBusy(false)
    toast.success('User updated')
    onSaved()
    onClose()
  }

  async function handleUnban() {
    setBusy(true)
    const { error } = await unbanUser(user.id, user.email)
    setBusy(false)
    if (error) { toast.error(error.message ?? 'Failed to unban'); return }
    toast.success('User unbanned')
    onSaved()
    onClose()
  }

  return (
    <Modal isOpen={open} title={user.full_name || user.email || 'User'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Who: avatar, email, dates, then plan / end / request / admin / banned as pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar user={user} size={48} />
          <div className="cms-wrap-any" style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{user.email ?? user.id}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Joined {formatDate(user.created_at)} · Last sign-in {formatDate(user.last_sign_in_at)}
            </div>
          </div>
        </div>

        <StatusPills user={user} now={now}>
          {user.role === 'admin' && <Pill tone="accent" icon={ShieldCheck}>Admin</Pill>}
          {banned && <Pill tone="error" icon={Ban}>Banned</Pill>}
        </StatusPills>

        <ProFacts
          user={user}
          state={detailState}
          detail={detail}
          onRetry={() => setDetailTry(n => n + 1)}
        />

        <div style={sectionCard}>
          <AddDays
            key={user.id}
            user={user}
            onAdded={id => { setDetailTry(n => n + 1); onAdded(id) }}
          />
        </div>

        <ProLists state={detailState} detail={detail} />

        {profileFields.length > 0 && (
          <Collapsible title="Profile" defaultOpen>
            <div className="cms-cols cms-wrap-any" style={factsGrid}>
              {profileFields.map(([label, value]) => <Fact key={label} label={label} value={value} />)}
            </div>
          </Collapsible>
        )}

        {/* Account controls: role and tier side by side */}
        <div style={sectionCard}>
          <SectionTitle>Account</SectionTitle>
          <div className="cms-cols" style={{ ...factsGrid, gap: 12 }}>
            <label style={labelStyle}>
              Role
              <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label style={labelStyle}>
              Tier
              <select value={tier} onChange={e => setTier(e.target.value)} style={inputStyle}>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </label>
          </div>
          <div style={{ ...mutedLine, marginTop: 8 }}>
            Changing the tier by hand does not set a plan or dates. To give Pro, approve a request.
          </div>
        </div>

        {/* Ban lives apart, at the bottom, so it is never tapped by accident */}
        <div style={{ ...sectionCard, borderColor: 'color-mix(in srgb, var(--color-error, #ef4444) 40%, transparent)' }}>
          {banned && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, color: 'var(--color-error, #ef4444)' }}>
              <Ban size={14} />
              This account is currently banned.
            </div>
          )}
          <button
            onClick={() => banned ? handleUnban() : onRequestBanConfirm(user)}
            disabled={busy}
            style={{ ...btnSecondary, width: '100%', ...(banned ? {} : { color: 'var(--color-error, #ef4444)', borderColor: 'var(--color-error, #ef4444)' }) }}
          >
            {banned ? 'Unban this user' : 'Ban this user'}
          </button>
          {!banned && <div style={{ ...mutedLine, marginTop: 8 }}>Signs them out and blocks sign-in until unbanned.</div>}
        </div>

        {/* Footer stays in view while the window scrolls; Save is on only when something changed */}
        <div style={{
          position: 'sticky', bottom: 0,
          margin: '0 calc(-1 * var(--space-5)) calc(-1 * var(--space-5))',
          padding: '12px var(--space-5)',
          backgroundColor: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} disabled={busy} style={btnSecondary}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={busy || !dirty}
            style={{ ...btnPrimary, ...((busy || !dirty) ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>

      </div>
    </Modal>
  )
}

// ─── Stat tiles (small, three in a row, also on a phone) ───────────────────

function StatCard({ label, value }) {
  return (
    <div style={{
      padding:         '10px 12px',
      backgroundColor: 'var(--color-surface)',
      border:          '1px solid var(--color-border)',
      borderRadius:    'var(--radius-lg)',
      textAlign:       'center',
      minWidth:        0,
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersManager() {
  const { toast } = useToast()

  // Store toast in a ref so load() never needs it as a dep — same fix as
  // CategoriesManager/SpecialtiesManager (avoids an infinite fetch/setState
  // loop; see CategoriesManager.jsx's header comment for the full story).
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [filter, setFilter]   = useState('all')
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)

  const [detailOpen, setDetailOpen]     = useState(false)
  const [detailTarget, setDetailTarget] = useState(null)

  const [confirmOpen,   setConfirmOpen]   = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    const { data, error } = await fetchAllUsers()
    setLoading(false)
    if (error) { setLoadFailed(true); toastRef.current.error('Failed to load users'); return }
    setRows(data ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  // After days were added: reload the list and point the open window at the fresh row, so the
  // end date it shows is the new one. The window itself reloads its history.
  async function refreshAfterAdd(userId) {
    const { data, error } = await fetchAllUsers()
    if (error || !data) return
    setRows(data)
    const fresh = data.find(u => u.id === userId)
    if (fresh) setDetailTarget(fresh)
  }

  function openDetail(user) {
    setDetailTarget(user)
    setDetailOpen(true)
  }

  function requestBanConfirm(user) {
    setConfirmConfig({
      title:   'Ban this user?',
      message: `"${user.email}" will be signed out and unable to sign in again until unbanned.`,
      onConfirm: () => doBan(user),
    })
    setConfirmOpen(true)
  }

  async function doBan(user) {
    const { error } = await banUser(user.id, user.email)
    if (error) { toast.error(error.message ?? 'Failed to ban'); return }
    toast.success('User banned')
    setDetailOpen(false)
    load()
  }

  // One clock for the whole screen draw, so every row agrees on "today".
  const now = useMemo(() => new Date(), [rows])  // eslint-disable-line react-hooks/exhaustive-deps
  const counts   = useMemo(() => filterCounts(rows, now), [rows, now])
  const filtered = useMemo(() => filterUsers(rows, { filter, search }, now), [rows, filter, search, now])
  const view     = pageOf(filtered, page)
  const searching = search.trim() !== '' || filter !== 'all'

  const totalUsers  = rows.length
  const totalAdmins = rows.filter(u => u.role === 'admin').length
  const totalBanned = rows.filter(isBanned).length

  return (
    <AdminPageHeader title="Users">
      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 'var(--space-4)' }}>
        <StatCard label="Total Users" value={loading ? '—' : totalUsers} />
        <StatCard label="Admins"      value={loading ? '—' : totalAdmins} />
        <StatCard label="Banned"      value={loading ? '—' : totalBanned} />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
          Loading…
        </div>
      )}

      {/* Could not load: say so plainly and offer a retry (never a blank table that looks like "no users") */}
      {!loading && loadFailed && (
        <div style={{
          textAlign: 'center', padding: 32, borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-secondary)',
        }}>
          <div style={{ marginBottom: 12 }}>The users could not be loaded.</div>
          <button onClick={load} style={btnPrimary}>Try again</button>
        </div>
      )}

      {!loading && !loadFailed && (
        <>
          {/* Search and filter chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 'var(--space-4)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: 10, top: 11 }} />
              <input
                type="search"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by name or email…"
                aria-label="Search users by name or email"
                style={{ ...inputStyle, paddingLeft: 30 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {FILTERS.map(f => {
                const active = filter === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => { setFilter(f.key); setPage(1) }}
                    aria-pressed={active}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-full)',
                      border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      backgroundColor: active ? 'var(--color-accent-light)' : 'transparent',
                      color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
                      flexShrink: 0, whiteSpace: 'nowrap',
                    }}
                  >
                    {f.label} · {counts[f.key]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nothing to show: no users at all, or nothing matches the chip and search */}
          {view.total === 0 && (
            <div style={{
              textAlign: 'center', padding: 32, borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
            }}>
              {searching ? (
                <>
                  <div style={{ marginBottom: 12 }}>No one matches.</div>
                  <button onClick={() => { setFilter('all'); setSearch(''); setPage(1) }} style={btnSecondary}>Clear search and filter</button>
                </>
              ) : 'There are no users yet.'}
            </div>
          )}

          {/* People: one card each (same on phone and computer) */}
          {view.total > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
              gap: 10,
            }}>
              {view.rows.map(user => {
                const banned = isBanned(user)
                const n = itemsText(user)
                return (
                  <div
                    key={user.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(user)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(user) } }}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 8,
                      padding: '12px 14px', cursor: 'pointer',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: 'var(--color-surface)',
                      opacity: banned ? 0.65 : 1,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar user={user} size={36} />
                      <div className="cms-wrap-any" style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {user.full_name || user.email || '—'}
                          </span>
                          {user.role === 'admin' && <Pill tone="accent" icon={ShieldCheck}>Admin</Pill>}
                          {banned && <Pill tone="error" icon={Ban}>Banned</Pill>}
                        </div>
                        {user.full_name && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                            {user.email ?? user.id}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} color="var(--color-text-tertiary)" />
                    </div>
                    <StatusPills user={user} now={now} />
                    <div style={mutedLine}>
                      {n} {n === '1' ? 'roshetta' : 'roshettas'} · Seen {lastSeenText(user, now).toLowerCase()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Paging: shown only when there is more than one page */}
          {view.pages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 'var(--space-4)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <button onClick={() => setPage(view.page - 1)} disabled={view.page <= 1} style={btnSecondary}>Previous</button>
              <span>Page {view.page} of {view.pages} · {view.total} people</span>
              <button onClick={() => setPage(view.page + 1)} disabled={view.page >= view.pages} style={btnSecondary}>Next</button>
            </div>
          )}
        </>
      )}

      <UserModal
        open={detailOpen}
        user={detailTarget}
        onClose={() => { setDetailOpen(false); setDetailTarget(null) }}
        onSaved={load}
        onAdded={refreshAfterAdd}
        onRequestBanConfirm={requestBanConfirm}
      />

      <ConfirmModal
        isOpen={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel="Ban"
        confirmVariant="danger"
        onConfirm={() => { setConfirmOpen(false); confirmConfig.onConfirm?.() }}
        onClose={() => setConfirmOpen(false)}
      />
    </AdminPageHeader>
  )
}

// ─── Shared micro styles (matches CategoriesManager.jsx) ──────────────────────

const btnPrimary = {
  padding:         '8px 14px',
  borderRadius:    'var(--radius-sm)',
  border:          'none',
  backgroundColor: 'var(--color-accent-solid)',
  color:           '#fff',
  fontSize:        13,
  fontWeight:      600,
  fontFamily:      'var(--font-body)',
  cursor:          'pointer',
}

const btnSecondary = {
  padding:         '8px 14px',
  borderRadius:    'var(--radius-sm)',
  border:          '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color:           'var(--color-text-secondary)',
  fontSize:        13,
  fontWeight:      500,
  fontFamily:      'var(--font-body)',
  cursor:          'pointer',
}

const labelStyle = {
  display:       'flex',
  flexDirection: 'column',
  gap:           6,
  fontSize:      13,
  fontWeight:    600,
  color:         'var(--color-text-secondary)',
  fontFamily:    'var(--font-body)',
}

const inputStyle = {
  padding:         '8px 10px',
  borderRadius:    'var(--radius-sm)',
  border:          '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg)',
  color:           'var(--color-text-primary)',
  fontSize:        14,
  fontFamily:      'var(--font-body)',
  outline:         'none',
  width:           '100%',
  boxSizing:       'border-box',
}
