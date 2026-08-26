/**
 * src/pages/admin/GatesManager.jsx
 * App Gate System — Phase 1 Step 3b
 *
 * Admin screen for Remote Messages — maintenance banners, critical
 * announcements, promos, and force-update blocks — all controlled here
 * with an instant on/off switch, no deploy or app-store wait either way.
 *
 * Form fields adapt to the selected type: force_update hides the
 * image/CTA fields (the block screen doesn't use them) and shows the
 * minimum-version field instead; every other type is the reverse.
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Megaphone } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import Modal from '../../components/admin/Modal'
import { listGates, createGate, updateGate, toggleGateActive, getMinimumSupported } from '../../lib/adminQueries'

const TYPE_OPTIONS = ['force_update', 'maintenance', 'critical_announcement', 'promo']
const PLATFORM_OPTIONS = ['web', 'android', 'ios']

const EMPTY_FORM = {
  type: 'maintenance',
  title: '',
  message: '',
  image_url: '',
  cta_label: '',
  cta_url: '',
  dismissible: true,
  platforms: [...PLATFORM_OPTIONS],
  starts_at: '',
  ends_at: '',
}

export default function GatesManager() {
  const [gates, setGates]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [minVersions, setMinVersions] = useState({}) // { web: '4.2.0', android: null, ios: null }

  const loadMinVersions = useCallback(async () => {
    const entries = await Promise.all(
      PLATFORM_OPTIONS.map(async p => {
        const { data } = await getMinimumSupported(p)
        return [p, data?.version ?? null]
      })
    )
    setMinVersions(Object.fromEntries(entries))
  }, [])

  const loadGates = useCallback(async () => {
    setLoading(true)
    const { data } = await listGates()
    setGates(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadGates() }, [loadGates])
  useEffect(() => { loadMinVersions() }, [loadMinVersions])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(gate) {
    setEditingId(gate.id)
    setForm({
      type: gate.type,
      title: gate.title ?? '',
      message: gate.message ?? '',
      image_url: gate.image_url ?? '',
      cta_label: gate.cta_label ?? '',
      cta_url: gate.cta_url ?? '',
      dismissible: gate.type === 'force_update' ? false : gate.dismissible,
      platforms: gate.platforms ?? [...PLATFORM_OPTIONS],
      starts_at: gate.starts_at ? gate.starts_at.slice(0, 16) : '',
      ends_at: gate.ends_at ? gate.ends_at.slice(0, 16) : '',
    })
    setShowModal(true)
  }

  function togglePlatform(p) {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter(x => x !== p)
        : [...f.platforms, p],
    }))
  }

  async function handleSave() {
    if (!form.title.trim() || !form.message.trim()) return
    setSaving(true)

    const payload = {
      type: form.type,
      title: form.title.trim(),
      message: form.message.trim(),
      image_url: form.type === 'force_update' ? null : (form.image_url.trim() || null),
      cta_label: form.type === 'force_update' ? null : (form.cta_label.trim() || null),
      cta_url: form.type === 'force_update' ? null : (form.cta_url.trim() || null),
      dismissible: form.type === 'force_update' ? false : form.dismissible,
      platforms: form.platforms.length ? form.platforms : [...PLATFORM_OPTIONS],
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    }

    if (editingId) {
      await updateGate(editingId, payload)
    } else {
      await createGate(payload)
    }

    setSaving(false)
    setShowModal(false)
    loadGates()
  }

  async function handleToggleActive(gate) {
    await toggleGateActive(gate.id, !gate.active, gate.title)
    loadGates()
  }

  return (
    <AdminPageHeader
      title="Messages"
      actions={
        <button onClick={openCreate} style={styles.addButton}>
          <Plus size={15} />
          Add Message
        </button>
      }
    >
      {loading ? (
        <div style={styles.emptyState}>Loading…</div>
      ) : gates.length === 0 ? (
        <div style={styles.emptyState}>No messages yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {gates.map(g => (
            <div key={g.id} style={styles.row}>
              <div
                onClick={() => openEdit(g)}
                style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <span style={styles.typeBadge(g.type)}>{g.type.replace('_', ' ')}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
                    {g.title}
                  </span>
                  {!g.dismissible && (
                    <span style={styles.hardBlockBadge}>Non-dismissible</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                  {g.message}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {(g.platforms ?? []).join(', ')}
                </div>
              </div>

              <button
                onClick={() => handleToggleActive(g)}
                style={styles.activeToggle(g.active)}
                aria-label={g.active ? 'Deactivate' : 'Activate'}
              >
                {g.active ? 'Active' : 'Off'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Message' : 'Add Message'}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <label style={styles.fieldLabel}>
            Type
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              style={styles.input}
            >
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </label>

          <label style={styles.fieldLabel}>
            Title
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={styles.input}
            />
          </label>

          <label style={styles.fieldLabel}>
            Message
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={3}
              style={{ ...styles.input, resize: 'vertical' }}
            />
          </label>

          {form.type === 'force_update' ? (
            <div style={styles.fieldLabel}>
              Minimum version (read-only — set from Releases → "Set as minimum")
              <div style={styles.minVersionDisplay}>
                {form.platforms.length === 0 ? (
                  <span style={{ color: 'var(--color-text-tertiary)' }}>No platforms selected</span>
                ) : (
                  form.platforms.map(p => (
                    <div key={p} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ textTransform: 'capitalize' }}>{p}</span>
                      <span>{minVersions[p] ? `v${minVersions[p]}` : 'None set'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              <label style={styles.fieldLabel}>
                Image URL (optional)
                <input
                  type="text"
                  value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  style={styles.input}
                />
              </label>

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <label style={{ ...styles.fieldLabel, flex: 1 }}>
                  CTA label (optional)
                  <input
                    type="text"
                    value={form.cta_label}
                    onChange={e => setForm(f => ({ ...f, cta_label: e.target.value }))}
                    style={styles.input}
                  />
                </label>
                <label style={{ ...styles.fieldLabel, flex: 1 }}>
                  CTA URL (optional)
                  <input
                    type="text"
                    value={form.cta_url}
                    onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))}
                    style={styles.input}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={form.dismissible}
                  onChange={e => setForm(f => ({ ...f, dismissible: e.target.checked }))}
                />
                Dismissible
              </label>
            </>
          )}

          <div style={styles.fieldLabel}>
            Platforms
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {PLATFORM_OPTIONS.map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                  <input
                    type="checkbox"
                    checked={form.platforms.includes(p)}
                    onChange={() => togglePlatform(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <label style={{ ...styles.fieldLabel, flex: 1 }}>
              Starts (optional)
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                style={styles.input}
              />
            </label>
            <label style={{ ...styles.fieldLabel, flex: 1 }}>
              Ends (optional)
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                style={styles.input}
              />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button onClick={() => setShowModal(false)} style={styles.cancelButton}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.message.trim()}
              style={{ ...styles.saveButton, opacity: (saving || !form.title.trim() || !form.message.trim()) ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          <div style={styles.hint}>
            <Megaphone size={13} />
            Saved messages start switched off. Use the Active/Off button on
            the list to actually publish it — that's instant either way.
          </div>
        </div>
      </Modal>
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
  typeBadge: (type) => {
    const colors = {
      force_update:           { bg: 'rgba(239,68,68,0.12)',  fg: '#dc2626' },
      maintenance:            { bg: 'rgba(234,179,8,0.12)',  fg: '#a16207' },
      critical_announcement:  { bg: 'rgba(249,115,22,0.12)', fg: '#c2410c' },
      promo:                  { bg: 'rgba(59,130,246,0.12)', fg: '#2563eb' },
    }
    const c = colors[type] ?? colors.promo
    return {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'capitalize',
      padding: '2px 8px',
      borderRadius: 999,
      backgroundColor: c.bg,
      color: c.fg,
      fontFamily: 'var(--font-body)',
      flexShrink: 0,
    }
  },
  hardBlockBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-tertiary)',
    fontFamily: 'var(--font-body)',
  },
  activeToggle: (active) => ({
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-sm)',
    border: active ? 'none' : '1px solid var(--color-border)',
    backgroundColor: active ? '#16a34a' : 'transparent',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    flexShrink: 0,
    minWidth: 64,
  }),
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-body)',
  },
  minVersionDisplay: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
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
  hint: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 12,
    color: 'var(--color-text-tertiary)',
    fontFamily: 'var(--font-body)',
  },
}

