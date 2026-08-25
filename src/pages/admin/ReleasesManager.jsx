/**
 * src/pages/admin/ReleasesManager.jsx
 * App Gate System — Phase 1 Step 2b
 *
 * Admin screen for tracking app releases per platform and flagging the
 * minimum supported version, which is what turns on Force Update for
 * anyone below it. Setting that flag sits behind ConfirmModal since it's
 * a consequential action — it can immediately block real users.
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, ShieldAlert } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import Modal from '../../components/admin/Modal'
import ConfirmModal from '../../components/admin/ConfirmModal'
import { listReleases, createRelease, setMinimumSupported } from '../../lib/adminQueries'

const PLATFORMS = ['web', 'android', 'ios']
const STATUS_OPTIONS = ['live', 'deprecated', 'blocked']

export default function ReleasesManager() {
  const [releases, setReleases]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [platformFilter, setPlatformFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [form, setForm]                   = useState({ platform: 'web', version: '', release_notes: '', status: 'live' })
  const [saving, setSaving]               = useState(false)

  const loadReleases = useCallback(async () => {
    setLoading(true)
    const { data } = await listReleases(platformFilter === 'all' ? {} : { platform: platformFilter })
    setReleases(data)
    setLoading(false)
  }, [platformFilter])

  useEffect(() => { loadReleases() }, [loadReleases])

  async function handleCreate() {
    if (!form.version.trim()) return
    setSaving(true)
    await createRelease({
      platform:      form.platform,
      version:       form.version.trim(),
      release_notes: form.release_notes.trim() || null,
      status:        form.status,
      released_at:   new Date().toISOString(),
    })
    setSaving(false)
    setShowCreateModal(false)
    setForm({ platform: 'web', version: '', release_notes: '', status: 'live' })
    loadReleases()
  }

  async function handleConfirmMinimum() {
    if (!confirmTarget) return
    await setMinimumSupported(
      confirmTarget.id,
      confirmTarget.platform,
      `${confirmTarget.platform} ${confirmTarget.version}`
    )
    setConfirmTarget(null)
    loadReleases()
  }

  return (
    <AdminPageHeader
      title="Releases"
      actions={
        <button onClick={() => setShowCreateModal(true)} style={styles.addButton}>
          <Plus size={15} />
          Add Release
        </button>
      }
    >
      {/* Platform filter tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {['all', ...PLATFORMS].map(p => (
          <button
            key={p}
            onClick={() => setPlatformFilter(p)}
            style={styles.tab(platformFilter === p)}
          >
            {p === 'all' ? 'All' : p}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.emptyState}>Loading…</div>
      ) : releases.length === 0 ? (
        <div style={styles.emptyState}>No releases yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {releases.map(r => (
            <div key={r.id} style={styles.row}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
                    {r.version}
                  </span>
                  <span style={styles.platformBadge}>{r.platform}</span>
                  <span style={styles.statusBadge(r.status)}>{r.status}</span>
                  {r.is_minimum_supported && (
                    <span style={styles.minBadge}>
                      <ShieldAlert size={12} />
                      Minimum supported
                    </span>
                  )}
                </div>
                {r.release_notes && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                    {r.release_notes}
                  </div>
                )}
              </div>

              {!r.is_minimum_supported && (
                <button onClick={() => setConfirmTarget(r)} style={styles.setMinButton}>
                  Set as minimum
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add release */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add Release" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <label style={styles.fieldLabel}>
            Platform
            <select
              value={form.platform}
              onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
              style={styles.input}
            >
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>

          <label style={styles.fieldLabel}>
            Version
            <input
              type="text"
              value={form.version}
              onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
              placeholder="e.g. 4.2.0"
              style={styles.input}
            />
          </label>

          <label style={styles.fieldLabel}>
            Release notes (optional)
            <textarea
              value={form.release_notes}
              onChange={e => setForm(f => ({ ...f, release_notes: e.target.value }))}
              rows={3}
              style={{ ...styles.input, resize: 'vertical' }}
            />
          </label>

          <label style={styles.fieldLabel}>
            Status
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              style={styles.input}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button onClick={() => setShowCreateModal(false)} style={styles.cancelButton}>
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.version.trim()}
              style={{ ...styles.saveButton, opacity: (saving || !form.version.trim()) ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm before flagging a version as the required minimum */}
      <ConfirmModal
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirmMinimum}
        title="Set minimum supported version?"
        message={
          confirmTarget
            ? `Anyone on ${confirmTarget.platform} below version ${confirmTarget.version} will be blocked with a force-update screen until they update. This takes effect immediately.`
            : ''
        }
        confirmLabel="Set as minimum"
        confirmVariant="danger"
      />
    </AdminPageHeader>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = {
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  },
  tab: (active) => ({
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: active ? 'var(--color-accent-light)' : 'transparent',
    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    textTransform: 'capitalize',
  }),
  emptyState: {
    padding: 'var(--space-6)',
    textAlign: 'center',
    color: 'var(--color-text-tertiary)',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
  },
  platformBadge: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    padding: '2px 8px',
    borderRadius: 999,
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-tertiary)',
    fontFamily: 'var(--font-mono)',
  },
  statusBadge: (status) => {
    const colors = {
      live:       { bg: 'rgba(34,197,94,0.12)',  fg: '#16a34a' },
      deprecated: { bg: 'rgba(234,179,8,0.12)',  fg: '#a16207' },
      blocked:    { bg: 'rgba(239,68,68,0.12)',  fg: '#dc2626' },
    }
    const c = colors[status] ?? colors.live
    return {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'capitalize',
      padding: '2px 8px',
      borderRadius: 999,
      backgroundColor: c.bg,
      color: c.fg,
      fontFamily: 'var(--font-body)',
    }
  },
  minBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.12)',
    color: '#dc2626',
    fontFamily: 'var(--font-body)',
  },
  setMinButton: {
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-body)',
  },
  input: {
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-bg)',
  },
  cancelButton: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  },
  saveButton: {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  },
}
