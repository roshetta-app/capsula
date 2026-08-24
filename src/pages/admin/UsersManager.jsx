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
 *  - No search/filter bar (10 real accounts today, per the F11 Stage 1
 *    audit) — matching D33's original scope, unchanged by this redesign.
 *  - Tap a row to open a detail modal for role/tier/ban, instead of an
 *    inline toggle — role and ban are consequential enough to want an
 *    explicit save step, and ban specifically goes through ConfirmModal
 *    since it blocks the person's sign-in.
 *  - tier is a currently-unused placeholder (D33 / F8 still undecided) —
 *    this screen only records the value, no billing logic reads it yet.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { ShieldCheck, Ban, CircleUserRound, Users as UsersIcon } from 'lucide-react'
import { useToast }   from '../../context/ToastContext'
import Modal          from '../../components/admin/Modal'
import ConfirmModal   from '../../components/admin/ConfirmModal'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import {
  fetchAllUsers,
  updateUserRole,
  updateUserTier,
  banUser,
  unbanUser,
} from '../../lib/adminQueries'

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

// ─── UserModal — role / tier / ban detail view ──────────────────────────────

function UserModal({ open, user, onClose, onSaved, onRequestBanConfirm }) {
  const { toast } = useToast()
  const [role, setRole] = useState('user')
  const [tier, setTier] = useState('free')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open && user) {
      setRole(user.role ?? 'user')
      setTier(user.tier ?? 'free')
    }
  }, [open, user])

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
          <div style={{
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

  const [detailOpen, setDetailOpen]     = useState(false)
  const [detailTarget, setDetailTarget] = useState(null)

  const [confirmOpen,   setConfirmOpen]   = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchAllUsers()
    setLoading(false)
    if (error) { toastRef.current.error('Failed to load users'); return }
    setRows(data ?? [])
  }, [])

  useEffect(() => { load() }, [load])

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

      {/* Table */}
      {!loading && (
        <div style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          backgroundColor: 'var(--color-surface)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-muted)' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Tier</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(user => {
                const banned = isBanned(user)
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CircleUserRound size={16} color="var(--color-text-secondary)" />
                        {user.full_name || '—'}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                      {user.email ?? user.id}
                    </td>
                    <td style={tdStyle}>
                      {user.role === 'admin'
                        ? <span style={{ ...badgeStyle, color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}>
                            <ShieldCheck size={11} /> Admin
                          </span>
                        : <span style={badgeStyle}>User</span>
                      }
                    </td>
                    <td style={tdStyle}>{user.tier === 'paid' ? 'Paid' : 'Free'}</td>
                    <td style={tdStyle}>
                      {banned
                        ? <span style={{ ...badgeStyle, color: 'var(--color-error, #ef4444)', borderColor: 'var(--color-error, #ef4444)' }}>
                            <Ban size={11} /> Banned
                          </span>
                        : <span style={badgeStyle}>Active</span>
                      }
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)' }}>
                      {formatDate(user.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <UserModal
        open={detailOpen}
        user={detailTarget}
        onClose={() => { setDetailOpen(false); setDetailTarget(null) }}
        onSaved={load}
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
  backgroundColor: 'var(--color-accent)',
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
