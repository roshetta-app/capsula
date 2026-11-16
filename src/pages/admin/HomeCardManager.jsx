/**
 * src/pages/admin/HomeCardManager.jsx
 * Phase H, step 9.2 — CMS screen "Home card".
 *
 * The list of topics and drugs that may be shown on the big featured card on Home.
 * Add (pick a topic or a drug from the library), edit the short line, switch on/off,
 * remove, and a live preview of the card. Removing only takes the item off this list;
 * the topic or drug itself is never deleted. Same patterns as the Messages screen.
 * All the rules (title, label, line, path, "can it show") live in src/utils/homeFeatured.js.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Stethoscope, Pill } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import Modal from '../../components/admin/Modal'
import ConfirmModal from '../../components/admin/ConfirmModal'
import {
  listHomeFeatured, addHomeFeatured, updateHomeFeaturedTagline, setHomeFeaturedActive,
  removeHomeFeatured, searchTopicsForHomeCard, searchBrandsForHomeCard,
} from '../../lib/adminQueries'
import {
  TAGLINE_MAX, cardTitle, cardLabel, cardLine, cardButton, blockedReason, summaryText, cleanTagline,
  countSummary,
} from '../../utils/homeFeatured'

// ─── Preview of the card as it will look on Home ────────────────────────────

function CardPreview({ item }) {
  const Icon = item.kind === 'brand' ? Pill : Stethoscope
  return (
    <div style={styles.card}>
      <div style={styles.cardShape} aria-hidden="true" />
      <Icon size={44} style={styles.cardIcon} aria-hidden="true" />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '78%' }}>
        <span dir="auto" style={styles.cardLabel}>{cardLabel(item)}</span>
        <span dir="auto" style={styles.cardTitle}>{cardTitle(item) || 'Title'}</span>
        <span dir="auto" style={styles.cardLine}>{cardLine(item)}</span>
        <span style={styles.cardPill}>{cardButton(item)}</span>
      </div>
    </div>
  )
}

// ─── Add sheet ──────────────────────────────────────────────────────────────

// Mounted only while open, so every opening starts fresh.
function AddSheet({ onClose, existingIds, onAdded }) {
  const [kind, setKind]       = useState('condition')
  const [query, setQuery]     = useState('')
  const [found, setFound]   = useState({ key: '', data: [] })
  const [picked, setPicked]   = useState(null)
  const [line, setLine]       = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const runId = useRef(0)

  const key = `${kind}|${query}`
  const searching = found.key !== key
  const results = searching ? [] : found.data

  useEffect(() => {
    const id = ++runId.current
    const timer = setTimeout(async () => {
      const { data } = kind === 'brand'
        ? await searchBrandsForHomeCard(query)
        : await searchTopicsForHomeCard(query)
      if (id !== runId.current) return
      setFound({ key: `${kind}|${query}`, data })
    }, 250)
    return () => clearTimeout(timer)
  }, [kind, query])

  function switchKind(k) { setKind(k); setPicked(null) }

  const previewItem = picked
    ? {
        kind, tagline: line,
        conditions: kind === 'condition' ? picked : null,
        brands:     kind === 'brand'     ? picked : null,
      }
    : null

  async function handleAdd() {
    if (!picked) return
    const cleaned = cleanTagline(line)
    if (cleaned.error) { setError(cleaned.error); return }
    setSaving(true)
    const title = cardTitle(previewItem)
    const { error: err } = await addHomeFeatured({ kind, targetId: picked.id, tagline: cleaned.value, title })
    setSaving(false)
    if (err) { setError(err.code === '23505' ? 'Already on the list' : 'Couldn\u2019t add it. Try again.'); return }
    onAdded()
    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title="Add to Home card" size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {[['condition', 'Topic'], ['brand', 'Drug']].map(([k, label]) => (
            <button key={k} onClick={() => switchKind(k)} style={styles.tab(kind === k)}>{label}</button>
          ))}
        </div>

        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={kind === 'brand' ? 'Search drugs by brand name' : 'Search topics by name'}
          style={styles.input}
          dir="auto"
        />

        <div style={styles.resultsBox}>
          {kind === 'brand' && !query.trim() ? (
            <div style={styles.emptyState}>Type a brand name to search.</div>
          ) : searching && results.length === 0 ? (
            <div style={styles.emptyState}>Searching…</div>
          ) : results.length === 0 ? (
            <div style={styles.emptyState}>Nothing found.</div>
          ) : results.map(r => {
            const taken = existingIds.has(r.id)
            const name = kind === 'brand' ? r.tradename_clean : r.name
            const selected = picked?.id === r.id
            return (
              <button
                key={r.id}
                disabled={taken}
                onClick={() => { setPicked(r); setError('') }}
                style={styles.resultRow(selected, taken)}
              >
                <span dir="auto" style={{ fontWeight: 600 }}>{name}</span>
                {taken && <span style={styles.takenNote}>Already on the list</span>}
              </button>
            )
          })}
        </div>

        {previewItem && (
          <>
            <label style={styles.fieldLabel}>
              Short line (optional)
              <input
                value={line}
                onChange={e => { setLine(e.target.value); setError('') }}
                placeholder={cardLine({ kind })}
                style={styles.input}
                dir="auto"
              />
              <span style={{ ...styles.hint, color: line.trim().length > TAGLINE_MAX ? '#dc2626' : 'var(--color-text-tertiary)' }}>
                {line.trim().length} / {TAGLINE_MAX}
              </span>
            </label>
            <CardPreview item={previewItem} />
          </>
        )}

        {error && <div style={{ ...styles.hint, color: '#dc2626' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button onClick={onClose} style={styles.cancelButton}>Cancel</button>
          <button onClick={handleAdd} disabled={!picked || saving} style={{ ...styles.saveButton, opacity: !picked || saving ? 0.5 : 1 }}>
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function HomeCardManager() {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showAdd, setShowAdd]   = useState(false)
  const [editing, setEditing]   = useState(null)   // the item being edited
  const [editLine, setEditLine] = useState('')
  const [editError, setEditError] = useState('')
  const [saving, setSaving]     = useState(false)
  const [removing, setRemoving] = useState(null)   // the item waiting for "are you sure"

  // Reload by bumping the counter; the list is fetched in the effect.
  const [reload, setReload] = useState(0)
  const load = useCallback(() => setReload(n => n + 1), [])

  useEffect(() => {
    let alive = true
    listHomeFeatured().then(({ data, error }) => {
      if (!alive) return
      setItems(data)
      setLoadError(!!error)
      setLoading(false)
    })
    return () => { alive = false }
  }, [reload])

  const existingIds = new Set(items.map(i => i.condition_id ?? i.brand_id))
  const { total, showing } = countSummary(items)

  function openEdit(item) { setEditing(item); setEditLine(item.tagline ?? ''); setEditError('') }

  async function handleSaveEdit() {
    const cleaned = cleanTagline(editLine)
    if (cleaned.error) { setEditError(cleaned.error); return }
    setSaving(true)
    const { error } = await updateHomeFeaturedTagline(editing.id, cleaned.value, cardTitle(editing))
    setSaving(false)
    if (error) { setEditError('Couldn\u2019t save. Try again.'); return }
    setEditing(null)
    load()
  }

  async function handleToggle(item) {
    await setHomeFeaturedActive(item.id, !item.is_active, cardTitle(item))
    load()
  }

  async function handleRemove() {
    const item = removing
    if (!item) return
    await removeHomeFeatured(item.id, cardTitle(item))
    load()
  }

  return (
    <AdminPageHeader
      title="Home card"
      actions={
        <button onClick={() => setShowAdd(true)} style={styles.addButton}>
          <Plus size={15} />
          Add item
        </button>
      }
    >
      {loading ? (
        <div style={styles.emptyState}>Loading…</div>
      ) : loadError ? (
        <div style={styles.emptyState}>Couldn’t load the list. Refresh to try again.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={styles.summary}>{summaryText(items)}</div>
          {total > 0 && showing === 0 && (
            <div style={styles.warning}>Nothing can show right now, so Home will have no featured card.</div>
          )}

          {total === 0 ? (
            <div style={styles.emptyState}>No items yet. Add a topic or a drug to feature it on Home.</div>
          ) : items.map(item => {
            const reason = blockedReason(item)
            return (
              <div key={item.id} style={styles.row}>
                <div onClick={() => openEdit(item)} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span style={styles.kindBadge(item.kind)}>{item.kind === 'brand' ? 'Drug' : 'Topic'}</span>
                    <span dir="auto" style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
                      {cardTitle(item) || 'Unavailable'}
                    </span>
                  </div>
                  <div dir="auto" style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                    {item.tagline ? item.tagline : <span style={{ color: 'var(--color-text-tertiary)' }}>Default line: {cardLine(item)}</span>}
                  </div>
                  {reason && item.is_active && <div style={styles.amber}>{reason}</div>}
                </div>

                <button onClick={() => handleToggle(item)} style={styles.activeToggle(item.is_active)} aria-label={item.is_active ? 'Switch off' : 'Switch on'}>
                  {item.is_active ? 'On' : 'Off'}
                </button>
                <button onClick={() => setRemoving(item)} style={styles.iconButton} aria-label="Remove from the list">
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && <AddSheet onClose={() => setShowAdd(false)} existingIds={existingIds} onAdded={load} />}

      {/* Edit the short line */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit item" size="md">
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <label style={styles.fieldLabel}>
              Short line (optional)
              <input
                value={editLine}
                onChange={e => { setEditLine(e.target.value); setEditError('') }}
                placeholder={cardLine({ kind: editing.kind })}
                style={styles.input}
                dir="auto"
              />
              <span style={{ ...styles.hint, color: editLine.trim().length > TAGLINE_MAX ? '#dc2626' : 'var(--color-text-tertiary)' }}>
                {editLine.trim().length} / {TAGLINE_MAX}
              </span>
            </label>
            <CardPreview item={{ ...editing, tagline: editLine }} />
            {editError && <div style={{ ...styles.hint, color: '#dc2626' }}>{editError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button onClick={() => setEditing(null)} style={styles.cancelButton}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} style={{ ...styles.saveButton, opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={handleRemove}
        title="Remove from Home card?"
        message={removing ? `“${cardTitle(removing) || 'This item'}” will come off this list. The ${removing.kind === 'brand' ? 'drug' : 'topic'} itself stays in the library.` : ''}
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </AdminPageHeader>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = {
  addButton: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-sm)', border: 'none',
    backgroundColor: 'var(--color-accent-solid)', color: '#fff',
    fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
  },
  emptyState: {
    padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-tertiary)',
    fontSize: 14, fontFamily: 'var(--font-body)',
  },
  summary: { fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' },
  warning: {
    padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(234,179,8,0.12)', color: '#a16207', fontSize: 13, fontFamily: 'var(--font-body)',
  },
  amber: { fontSize: 12, color: '#a16207', fontFamily: 'var(--font-body)' },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
    padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
  },
  kindBadge: (kind) => ({
    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, flexShrink: 0,
    fontFamily: 'var(--font-body)',
    backgroundColor: kind === 'brand' ? 'rgba(124,58,237,0.12)' : 'rgba(59,130,246,0.12)',
    color: kind === 'brand' ? '#6d28d9' : '#2563eb',
  }),
  activeToggle: (active) => ({
    padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-sm)',
    border: active ? 'none' : '1px solid var(--color-border)',
    backgroundColor: active ? '#16a34a' : 'transparent',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', flexShrink: 0, minWidth: 56,
  }),
  iconButton: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, flexShrink: 0,
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
    backgroundColor: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer',
  },
  tab: (on) => ({
    padding: 'var(--space-2) var(--space-4)', borderRadius: 999, fontSize: 13, fontWeight: 600,
    fontFamily: 'var(--font-body)', cursor: 'pointer',
    border: on ? 'none' : '1px solid var(--color-border)',
    backgroundColor: on ? 'var(--color-accent-solid)' : 'transparent',
    color: on ? '#fff' : 'var(--color-text-secondary)',
  }),
  resultsBox: {
    display: 'flex', flexDirection: 'column', maxHeight: 220, overflowY: 'auto',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
  },
  resultRow: (selected, taken) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)', textAlign: 'start', border: 'none',
    borderBottom: '1px solid var(--color-border)', fontSize: 14, fontFamily: 'var(--font-body)',
    backgroundColor: selected ? 'rgba(59,130,246,0.12)' : 'transparent',
    color: taken ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
    cursor: taken ? 'default' : 'pointer', opacity: taken ? 0.6 : 1,
  }),
  takenNote: { fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 },
  fieldLabel: {
    display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
    fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
  },
  input: {
    padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)', fontSize: 14, fontFamily: 'var(--font-body)',
    color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg)',
  },
  hint: { fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)', fontWeight: 400 },
  cancelButton: {
    padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)', backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer',
  },
  saveButton: {
    padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-sm)', border: 'none',
    backgroundColor: 'var(--color-accent-solid)', color: '#fff',
    fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
  },
  // The card preview: one solid blue block, as approved in 9.0.
  card: {
    position: 'relative', overflow: 'hidden', minHeight: 150, borderRadius: 16, padding: 16,
    backgroundColor: 'var(--color-accent-solid)', color: '#fff', fontFamily: 'var(--font-body)',
  },
  cardShape: {
    position: 'absolute', insetInlineEnd: -40, top: -40, width: 150, height: 150,
    borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardIcon: { position: 'absolute', insetInlineEnd: 18, bottom: 18, color: 'rgba(255,255,255,0.7)' },
  cardLabel: { fontSize: 12, fontWeight: 500, opacity: 0.85 },
  cardTitle: { fontSize: 22, fontWeight: 500, lineHeight: 1.25, overflowWrap: 'anywhere' },
  cardLine:  { fontSize: 13, opacity: 0.9, overflowWrap: 'anywhere' },
  cardPill: {
    alignSelf: 'flex-start', marginTop: 6, padding: '8px 16px', borderRadius: 999,
    backgroundColor: '#fff', color: 'var(--color-accent-solid)', fontSize: 13, fontWeight: 600,
  },
}
