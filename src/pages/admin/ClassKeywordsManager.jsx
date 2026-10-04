/**
 * src/pages/admin/ClassKeywordsManager.jsx
 *
 * Class keywords CMS screen (phase E2). Modelled on CategoriesManager.jsx:
 * list, add, edit, switch on/off, delete.
 *
 * A keyword is an everyday word ("vomiting") that points at one or more
 * drug classes / families so Class search finds them even when the word is
 * not in their name. A target is { class, subclass }; subclass null means
 * the whole class. Targets are plain text names (no ids exist), so the
 * pickers only offer real class / family names read from the drug library.
 *
 * E2 = basic picker (type or choose a class, then a family or "whole
 * class", add one at a time). The many-at-once picker and the broken-link
 * warning list come in E3.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { useToast }       from '../../context/ToastContext'
import Modal              from '../../components/admin/Modal'
import ConfirmModal       from '../../components/admin/ConfirmModal'
import AdminPageHeader    from '../../components/admin/AdminPageHeader'
import {
  fetchClassKeywords,
  fetchClassFamilyPairs,
  insertClassKeyword,
  updateClassKeyword,
  toggleClassKeywordActive,
  deleteClassKeyword,
} from '../../lib/adminQueries'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function targetLabel(t) {
  return t.subclass ? `${t.class} › ${t.subclass}` : t.class
}

function targetKey(t) {
  return `${t.class}\u0000${t.subclass ?? ''}`
}

const MAX_CHIPS_IN_LIST = 6

// ─── Add / edit modal ─────────────────────────────────────────────────────────

function KeywordModal({ open, keywordRow, pairs, onClose, onSaved }) {
  const { toast } = useToast()

  const [word,    setWord]    = useState('')
  const [targets, setTargets] = useState([])
  const [clsText, setClsText] = useState('')
  const [subText, setSubText] = useState('')   // '' = whole class
  const [busy,    setBusy]    = useState(false)

  // Reset the form every time the modal opens.
  useEffect(() => {
    if (!open) return
    setWord(keywordRow?.keyword ?? '')
    setTargets(keywordRow?.targets ?? [])
    setClsText('')
    setSubText('')
    setBusy(false)
  }, [open, keywordRow])

  const classNames = useMemo(
    () => [...new Set(pairs.map(p => p.class))],
    [pairs]
  )

  // Canonical class name for whatever was typed (case-insensitive), or null.
  const matchedClass = useMemo(() => {
    const typed = clsText.trim().toLowerCase()
    if (!typed) return null
    return classNames.find(c => c.toLowerCase() === typed) ?? null
  }, [clsText, classNames])

  const families = useMemo(() => {
    if (!matchedClass) return []
    return pairs
      .filter(p => p.class === matchedClass && p.subclass)
      .map(p => p.subclass)
  }, [pairs, matchedClass])

  function handleAddTarget() {
    if (!matchedClass) {
      toast.error('Choose a class from the list')
      return
    }
    const t = { class: matchedClass, subclass: subText || null }
    if (targets.some(x => targetKey(x) === targetKey(t))) {
      toast.error('Already added')
      return
    }
    setTargets(prev => [...prev, t])
    setClsText('')
    setSubText('')
  }

  function removeTarget(t) {
    setTargets(prev => prev.filter(x => targetKey(x) !== targetKey(t)))
  }

  async function handleSave() {
    if (!word.trim()) {
      toast.error('Keyword is required')
      return
    }
    if (targets.length === 0) {
      toast.error('Add at least one class or family')
      return
    }
    setBusy(true)
    const payload = { keyword: word, targets }
    const result = keywordRow
      ? await updateClassKeyword(keywordRow.id, payload)
      : await insertClassKeyword(payload)
    setBusy(false)

    if (result.error) {
      toast.error(result.error.message ?? 'Save failed')
      return
    }
    toast.success(keywordRow ? 'Keyword updated' : 'Keyword added')
    onSaved()
    onClose()
  }

  return (
    <Modal
      isOpen={open}
      title={keywordRow ? 'Edit Keyword' : 'Add Keyword'}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Keyword */}
        <label style={labelStyle}>
          Keyword *
          <input
            value={word}
            onChange={e => setWord(e.target.value)}
            placeholder="e.g. headache"
            style={inputStyle}
          />
          <span style={hintText}>
            One word or a short phrase, saved in lowercase. Plurals are not
            matched automatically, so add them separately if needed.
          </span>
        </label>

        {/* Current targets */}
        <div>
          <div style={labelText}>Points at ({targets.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {targets.length === 0 && (
              <span style={hintText}>Nothing yet — add a class or family below.</span>
            )}
            {targets.map(t => (
              <span key={targetKey(t)} style={chipRemovable}>
                {targetLabel(t)}
                <button
                  onClick={() => removeTarget(t)}
                  title="Remove"
                  style={chipX}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Add a target */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          padding: 12, borderRadius: 10,
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-muted)',
        }}>
          <div style={labelText}>Add a class or family</div>

          <input
            list="class-keywords-class-list"
            value={clsText}
            onChange={e => { setClsText(e.target.value); setSubText('') }}
            placeholder="Class — type or choose"
            style={inputStyle}
          />
          <datalist id="class-keywords-class-list">
            {classNames.map(c => <option key={c} value={c} />)}
          </datalist>

          <select
            value={subText}
            onChange={e => setSubText(e.target.value)}
            disabled={!matchedClass}
            style={inputStyle}
          >
            <option value="">Whole class</option>
            {families.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <button
            onClick={handleAddTarget}
            disabled={!matchedClass}
            style={{ ...btnSecondary, opacity: matchedClass ? 1 : 0.5 }}
          >
            Add
          </button>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button onClick={onClose} disabled={busy} style={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={busy} style={btnPrimary}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>

      </div>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClassKeywordsManager() {
  const { toast } = useToast()

  // Toast kept in a ref so load() never depends on it (same fix as
  // CategoriesManager: avoids an infinite fetch/setState loop).
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const [rows,    setRows]    = useState([])
  const [pairs,   setPairs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  const [modalOpen,  setModalOpen]  = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const [confirmOpen,   setConfirmOpen]   = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({})

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const [kw, pr] = await Promise.all([fetchClassKeywords(), fetchClassFamilyPairs()])
    setLoading(false)
    if (kw.error) { toastRef.current.error('Failed to load keywords'); return }
    setRows(kw.data ?? [])
    if (pr.error) {
      toastRef.current.error('Failed to load the class list')
    } else {
      setPairs(pr.data ?? [])
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Search filter (keyword or any target name) ────────────────────────────

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      r.keyword.toLowerCase().includes(q) ||
      (r.targets ?? []).some(t => targetLabel(t).toLowerCase().includes(q))
    )
  }, [rows, search])

  // ── Toggle / delete ───────────────────────────────────────────────────────

  async function handleToggleActive(row) {
    const { error } = await toggleClassKeywordActive(row.id, !row.is_active, row.keyword)
    if (error) { toast.error(error.message ?? 'Toggle failed'); return }
    toast.success(!row.is_active ? 'Keyword switched on' : 'Keyword switched off')
    load()
  }

  function handleDelete(row) {
    setConfirmConfig({
      title:   'Delete Keyword?',
      message: `"${row.keyword}" will be permanently removed. This cannot be undone.`,
      onConfirm: () => doDelete(row),
    })
    setConfirmOpen(true)
  }

  async function doDelete(row) {
    const { error } = await deleteClassKeyword(row.id, row.keyword)
    if (error) { toast.error(error.message ?? 'Delete failed'); return }
    toast.success('Keyword deleted')
    load()
  }

  // ─────────────────────────────────────────────────────────────────────────

  const activeCount = rows.filter(r => r.is_active).length

  return (
    <AdminPageHeader
      title="Class keywords"
      actions={
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true) }}
          style={btnPrimary}
        >
          <Plus size={14} /> Add
        </button>
      }
    >
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search keywords or classes…"
        style={{ ...inputStyle, marginBottom: 8 }}
      />
      {!loading && (
        <div style={{ ...hintText, marginBottom: 12 }}>
          {search.trim()
            ? `${visible.length} of ${rows.length} keywords`
            : `${rows.length} keywords (${activeCount} on)`}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
          Loading…
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
          {rows.length === 0 ? 'No keywords yet.' : 'No keywords match your search.'}
        </div>
      )}

      {!loading && visible.map(row => {
        const targets = row.targets ?? []
        const shown   = targets.slice(0, MAX_CHIPS_IN_LIST)
        const extra   = targets.length - shown.length

        return (
          <div
            key={row.id}
            style={{
              display:         'flex',
              alignItems:      'center',
              gap:             8,
              padding:         '10px 12px',
              border:          '1px solid var(--color-border)',
              borderRadius:    10,
              marginBottom:    8,
              backgroundColor: 'var(--color-surface)',
              opacity:         row.is_active ? 1 : 0.55,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 600,
                fontSize:   14,
                color:      'var(--color-text-primary)',
                marginBottom: 6,
              }}>
                {row.keyword}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {shown.map(t => (
                  <span key={targetKey(t)} style={chip}>{targetLabel(t)}</span>
                ))}
                {extra > 0 && <span style={chip}>+{extra} more</span>}
              </div>
            </div>

            {/* Switch on / off */}
            <button
              onClick={() => handleToggleActive(row)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              title={row.is_active ? 'Switch off' : 'Switch on'}
            >
              {row.is_active
                ? <ToggleRight size={22} color="var(--color-success)" />
                : <ToggleLeft  size={22} color="var(--color-text-tertiary)" />}
            </button>

            {/* Edit */}
            <button
              onClick={() => { setEditTarget(row); setModalOpen(true) }}
              style={iconBtn}
              title="Edit"
            >
              <Pencil size={13} />
            </button>

            {/* Delete */}
            <button
              onClick={() => handleDelete(row)}
              style={{ ...iconBtn, color: 'var(--color-danger)' }}
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )
      })}

      <KeywordModal
        open={modalOpen}
        keywordRow={editTarget}
        pairs={pairs}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        onSaved={load}
      />

      <ConfirmModal
        isOpen={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={() => { setConfirmOpen(false); confirmConfig.onConfirm?.() }}
        onClose={() => setConfirmOpen(false)}
      />
    </AdminPageHeader>
  )
}

// ─── Shared micro styles (same look as CategoriesManager) ─────────────────────

const btnPrimary = {
  display:         'flex',
  alignItems:      'center',
  gap:             6,
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

const labelText = {
  fontSize:   13,
  fontWeight: 600,
  color:      'var(--color-text-secondary)',
  fontFamily: 'var(--font-body)',
}

const hintText = {
  fontSize:   11,
  fontWeight: 400,
  color:      'var(--color-text-tertiary)',
  fontFamily: 'var(--font-body)',
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

const chip = {
  padding:         '2px 8px',
  borderRadius:    'var(--radius-full)',
  border:          '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface-muted)',
  fontSize:        11,
  color:           'var(--color-text-secondary)',
}

const chipRemovable = {
  ...chip,
  display:    'inline-flex',
  alignItems: 'center',
  gap:        4,
  fontSize:   12,
}

const chipX = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  background:     'none',
  border:         'none',
  padding:        0,
  cursor:         'pointer',
  color:          'var(--color-text-tertiary)',
}
