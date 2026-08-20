/**
 * src/pages/admin/UsersManager.jsx
 * Phase F11 Stage 2 — Users CMS.
 *
 * Modeled on CategoriesManager.jsx's load()/toast/ConfirmModal shape.
 * Differences from that near-twin, both driven by what this data actually
 * is:
 *  - No drag-reorder, no active/inactive toggle, no add/delete — accounts
 *    are created by Google sign-in, not from this screen, and there is no
 *    "order" concept for a user list.
 *  - Flat list only (10 real accounts today, per the F11 Stage 1 audit) —
 *    no search/filter bar, matching D33's scope.
 *  - Tap a row to open a detail modal for role/tier/ban, instead of an
 *    inline toggle — role and ban are consequential enough to want an
 *    explicit save step, and ban specifically goes through ConfirmModal
 *    since it blocks the person's sign-in.
 *  - tier is a currently-unused placeholder (D33 / F8 still undecided) —
 *    this screen only records the value, no billing logic reads it yet.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Ban, CircleUserRound } from 'lucide-react'
import { useToast }   from '../../context/ToastContext'
import Modal          from '../../components/admin/Modal'
import ConfirmModal   from '../../components/admin/ConfirmModal'
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
    <Modal isOpen={open} title={user.email ?? 'User'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          <div>Joined {formatDate(user.created_at)}</div>
          <div>Last sign-in {formatDate(user.last_sign_in_at)}</div>
        </div>

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersManager() {
  const navigate  = useNavigate()
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

  return (
    <div style={{
      maxWidth:   680,
      margin:     '0 auto',
      padding:    'var(--space-4)',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-5)' }}>
        <button onClick={() => navigate('/admin')} style={iconBtn}>
          <ArrowLeft size={16} />
        </button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Users
        </h1>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
          Loading…
        </div>
      )}

      {!loading && rows.map(user => {
        const banned = isBanned(user)
        return (
          <button
            key={user.id}
            onClick={() => openDetail(user)}
            style={{
              display:         'flex',
              alignItems:      'center',
              gap:             10,
              width:           '100%',
              padding:         '10px 12px',
              border:          '1px solid var(--color-border)',
              borderRadius:    10,
              marginBottom:    8,
              backgroundColor: 'var(--color-surface)',
              cursor:          'pointer',
              textAlign:       'left',
              fontFamily:      'var(--font-body)',
              opacity:         banned ? 0.65 : 1,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              backgroundColor: 'var(--color-surface-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CircleUserRound size={18} color="var(--color-text-secondary)" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)',
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>
                {user.email ?? user.id}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                Joined {formatDate(user.created_at)}
              </div>
            </div>

            {user.role === 'admin' && (
              <span style={{ ...badgeStyle, color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}>
                <ShieldCheck size={11} /> Admin
              </span>
            )}

            <span style={badgeStyle}>
              {user.tier === 'paid' ? 'Paid' : 'Free'}
            </span>

            {banned && (
              <span style={{ ...badgeStyle, color: 'var(--color-error, #ef4444)', borderColor: 'var(--color-error, #ef4444)' }}>
                <Ban size={11} /> Banned
              </span>
            )}
          </button>
        )
      })}

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
    </div>
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

const iconBtn = {
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  width:           28,
  height:          28,
  borderRadius:    6,
  border:          '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color:           'var(--color-text-secondary)',
  cursor:          'pointer',
  padding:         0,
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
