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
import { ShieldCheck, Ban, CircleUserRound, Users as UsersIcon, Search } from 'lucide-react'
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
  FILTERS, filterUsers, filterCounts, pageOf, planName, endsText, itemsText,
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
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{value}</div>
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

function ProDetail({ user, state, detail, onRetry }) {
  const now = new Date()
  const ends = endsText(user, now)

  if (state === 'error') {
    return (
      <div style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: 'var(--color-surface-muted)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
        <div style={{ marginBottom: 8 }}>{DETAIL_LOAD_ERROR}</div>
        <button onClick={onRetry} style={btnSecondary}>Try again</button>
      </div>
    )
  }

  const loading = state !== 'ready'
  const dash = '…'
  const history  = detail?.history ?? []
  const requests = detail?.requests ?? []
  const waiting  = requests.find(r => r.status === 'waiting')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="cms-cols cms-wrap-any" style={{
        '--cols-phone': 'minmax(0, 1fr) minmax(0, 1fr)',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px',
        padding: '10px 12px', borderRadius: 8, backgroundColor: 'var(--color-surface-muted)',
      }}>
        <Fact label="Plan" value={planNameOf(user, now)} />
        <Fact label="Ends" value={ends || '—'} />
        <Fact label="Payment code" value={loading ? dash : referenceText(detail?.reference_code)} />
        <Fact label="Free trial" value={trialText(user)} />
        <Fact label="Hit a free limit" value={loading ? dash : limitHitsText(detail?.limit_hits)} />
        <Fact label="Roshettas made" value={loading ? dash : String(detail?.items_made ?? 0)} />
      </div>

      {waiting && (
        <div style={{
          padding: '10px 12px', borderRadius: 8, fontSize: 13,
          border: '1px solid var(--color-warning, #d97706)', color: 'var(--color-text-primary)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>A request is waiting: {requestLine(waiting).title}</div>
          <Link to="/admin/pro-requests" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
            Open Pro requests to approve or reject
          </Link>
        </div>
      )}

      <div>
        <SectionTitle>Requests</SectionTitle>
        {loading
          ? <div style={mutedLine}>Loading…</div>
          : requests.length === 0
            ? <div style={mutedLine}>No requests.</div>
            : requests.map(r => {
                const line = requestLine(r)
                return (
                  <div key={r.id} style={listRow}>
                    <div style={{ fontWeight: 600 }}>{line.title}</div>
                    <div style={mutedLine}>
                      {[line.status, line.when, line.receipt, line.code, line.by && `by ${line.by}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                )
              })}
      </div>

      <div>
        <SectionTitle>Pro history</SectionTitle>
        {loading
          ? <div style={mutedLine}>Loading…</div>
          : history.length === 0
            ? <div style={mutedLine}>Nothing yet.</div>
            : history.map(h => {
                const line = historyLine(h)
                return (
                  <div key={h.id} style={listRow}>
                    <div>{line.text}</div>
                    <div style={mutedLine}>{[line.when, line.by && `by ${line.by}`].filter(Boolean).join(' · ')}</div>
                  </div>
                )
              })}
      </div>
    </div>
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

// ─── UserModal — role / tier / ban detail view ──────────────────────────────

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          <div>Joined {formatDate(user.created_at)}</div>
          <div>Last sign-in {formatDate(user.last_sign_in_at)}</div>
        </div>

        {profileFields.length > 0 && (
          <div className="cms-cols cms-wrap-any" style={{
            '--cols-phone': 'minmax(0, 1fr) minmax(0, 1fr)',
            display:      'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:          '8px 16px',
            padding:      '10px 12px',
            borderRadius: 8,
            backgroundColor: 'var(--color-surface-muted)',
          }}>
            {profileFields.map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        <ProDetail
          user={user}
          state={detailState}
          detail={detail}
          onRetry={() => setDetailTry(n => n + 1)}
        />

        <AddDays
          key={user.id}
          user={user}
          onAdded={id => { setDetailTry(n => n + 1); onAdded(id) }}
        />

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

        {banned && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderRadius: 8,
            backgroundColor: 'var(--color-error, #ef4444)1a',
            border: '1px solid var(--color-error, #ef4444)',
            fontSize: 13, color: 'var(--color-error, #ef4444)',
          }}>
            <Ban size={14} />
            This account is currently banned.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', paddingTop: 8 }}>
          <button
            onClick={() => banned ? handleUnban() : onRequestBanConfirm(user)}
            disabled={busy}
            style={banned ? btnSecondary : btnDanger}
          >
            {banned ? 'Unban' : 'Ban user'}
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} disabled={busy} style={btnSecondary}>Cancel</button>
            <button onClick={handleSave} disabled={busy} style={btnPrimary}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

      </div>
    </Modal>
  )
}

// ─── Stat cards ─────────────────────────────────────────────────────────────

function StatCard({ label, value, faIconAsLucide: Icon }) {
  return (
    <div style={{
      display:         'flex',
      alignItems:      'center',
      gap:             'var(--space-3)',
      padding:         'var(--space-4)',
      backgroundColor: 'var(--color-surface)',
      border:          '1px solid var(--color-border)',
      borderRadius:    'var(--radius-lg)',
      boxShadow:       'var(--shadow-card)',
    }}>
      <div style={{
        width: 40, height: 40,
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-accent-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        color: 'var(--color-accent)',
      }}>
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
          {label}
        </div>
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
      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-5)',
      }}>
        <StatCard label="Total Users" value={loading ? '—' : totalUsers} faIconAsLucide={UsersIcon} />
        <StatCard label="Admins"      value={loading ? '—' : totalAdmins} faIconAsLucide={ShieldCheck} />
        <StatCard label="Banned"      value={loading ? '—' : totalBanned} faIconAsLucide={Ban} />
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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

          {/* Table */}
          {view.total > 0 && (
            <div style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              backgroundColor: 'var(--color-surface)',
            }}>
              <table className="cms-table-cards" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-muted)' }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Plan</th>
                    <th style={thStyle}>Ends</th>
                    <th style={thStyle}>Items</th>
                    <th style={thStyle}>Last seen</th>
                    <th style={thStyle}>Request</th>
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map(user => {
                    const banned = isBanned(user)
                    const req = requestCell(user, now)
                    const ends = endsText(user, now)
                    return (
                      <tr
                        key={user.id}
                        onClick={() => openDetail(user)}
                        style={{
                          cursor: 'pointer',
                          borderTop: '1px solid var(--color-border)',
                          opacity: banned ? 0.65 : 1,
                        }}
                      >
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <CircleUserRound size={16} color="var(--color-text-secondary)" />
                            <span>{user.full_name || '—'}</span>
                            {user.role === 'admin' && (
                              <span style={{ ...badgeStyle, color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}>
                                <ShieldCheck size={11} /> Admin
                              </span>
                            )}
                            {banned && (
                              <span style={{ ...badgeStyle, color: 'var(--color-error, #ef4444)', borderColor: 'var(--color-error, #ef4444)' }}>
                                <Ban size={11} /> Banned
                              </span>
                            )}
                          </div>
                          <div className="cms-wrap-any" style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                            {user.email ?? user.id}
                          </div>
                        </td>
                        <td style={tdStyle}>{planName(user, now)}</td>
                        <td style={{ ...tdStyle, color: ends ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{ends || '—'}</td>
                        <td style={tdStyle}>{itemsText(user)}</td>
                        <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)' }}>{lastSeenText(user, now)}</td>
                        <td style={{ ...tdStyle, ...requestToneStyle[req.tone] }}>{req.text}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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

const btnDanger = {
  padding:         '8px 14px',
  borderRadius:    'var(--radius-sm)',
  border:          'none',
  backgroundColor: 'var(--color-error, #ef4444)',
  color:           '#fff',
  fontSize:        13,
  fontWeight:      600,
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

const badgeStyle = {
  display:         'inline-flex',
  alignItems:      'center',
  gap:             4,
  padding:         '2px 8px',
  borderRadius:    'var(--radius-full)',
  border:          '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface-muted)',
  fontSize:        11,
  fontWeight:      500,
  color:           'var(--color-text-secondary)',
  flexShrink:      0,
}

// How the Request cell is coloured: late (12 hours) amber, overdue (24 hours) red, ending soon amber.
const requestToneStyle = {
  none:    { color: 'var(--color-text-tertiary)' },
  ok:      { color: 'var(--color-text-primary)', fontWeight: 600 },
  late:    { color: 'var(--color-warning, #d97706)', fontWeight: 600 },
  overdue: { color: 'var(--color-error, #ef4444)', fontWeight: 600 },
  ending:  { color: 'var(--color-warning, #d97706)' },
}

const thStyle = {
  textAlign:    'left',
  padding:      '10px 12px',
  fontSize:     11,
  fontWeight:   600,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  color:        'var(--color-text-tertiary)',
}

const tdStyle = {
  padding: '10px 12px',
  color:   'var(--color-text-primary)',
}
