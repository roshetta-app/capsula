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
 * E3 = searchable picker with many-at-once ticking (tick a class for the
 * whole class, tick its families for specific ones), plus broken-link
 * warnings: a target whose class or family no longer exists in the drug
 * library is marked in the list and in the editor, and listed at the top.
 * The app ignores such links, so they are harmless but worth cleaning up.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, AlertTriangle } from 'lucide-react'
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
const MAX_PICKER_ROWS   = 150

// Set of valid class names and valid "class + family" keys from the library.
function buildValidity(pairs) {
  const classes = new Set()
  const keys    = new Set()
  for (const p of pairs) {
    classes.add(p.class)
    if (p.subclass) keys.add(targetKey(p))
  }
  return { classes, keys, ready: pairs.length > 0 }
}

// A target is broken when its class (or class + family) is not in the library.
// Until the library list has loaded nothing is flagged, to avoid false alarms.
function isBroken(t, validity) {
  if (!validity.ready) return false
  if (!validity.classes.has(t.class)) return true
  if (t.subclass && !validity.keys.has(targetKey(t))) return true
  return false
}

// ─── Add / edit modal ─────────────────────────────────────────────────────────

function KeywordModal({ open, keywordRow, pairs, validity, onClose, onSaved }) {
  const { toast } = useToast()

  const [word,    setWord]    = useState('')
  const [targets, setTargets] = useState([])
  const [find,    setFind]    = useState('')
  const [busy,    setBusy]    = useState(false)

  // Reset the form every time the modal opens.
  useEffect(() => {
    if (!open) return
    setWord(keywordRow?.keyword ?? '')
    setTargets(keywordRow?.targets ?? [])
    setFind('')
    setBusy(false)
  }, [open, keywordRow])

  const selectedKeys = useMemo(
    () => new Set(targets.map(targetKey)),
    [targets]
  )

  // Picker rows: each class (whole class) followed by its families.
  const allRows = useMemo(() => {
    const byClass = new Map()
    for (const p of pairs) {
      if (!byClass.has(p.class)) byClass.set(p.class, [])
      if (p.subclass) byClass.get(p.class).push(p.subclass)
    }
    const out = []
    for (const [cls, subs] of byClass) {
      out.push({ class: cls, subclass: null })
      for (const sub of subs) out.push({ class: cls, subclass: sub })
    }
    return out
  }, [pairs])

  // Search: a class match shows the class and all its families; a family
  // match shows its class row plus the matching families.
  const pickerRows = useMemo(() => {
    const q = find.trim().toLowerCase()
    if (!q) return allRows
    const classHit = new Set()
    const famHit   = new Set()
    for (const r of allRows) {
      if (!r.subclass && r.class.toLowerCase().includes(q)) classHit.add(r.class)
      if (r.subclass && r.subclass.toLowerCase().includes(q)) famHit.add(targetKey(r))
    }
    const famClasses = new Set(
      allRows.filter(r => r.subclass && famHit.has(targetKey(r))).map(r => r.class)
    )
    return allRows.filter(r =>
      classHit.has(r.class) ||
      (!r.subclass && famClasses.has(r.class)) ||
      (r.subclass && famHit.has(targetKey(r)))
    )
  }, [allRows, find])

  const shownRows = pickerRows.slice(0, MAX_PICKER_ROWS)
  const hiddenRows = pickerRows.length - shownRows.length

  function toggleTarget(t) {
    setTargets(prev =>
      prev.some(x => targetKey(x) === targetKey(t))
        ? prev.filter(x => targetKey(x) !== targetKey(t))
        : [...prev, { class: t.class, subclass: t.subclass ?? null }]
    )
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
      toast.error('Tick at least one class or family')
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
              <span style={hintText}>Nothing yet — tick classes or families below.</span>
            )}
            {targets.map(t => {
              const broken = isBroken(t, validity)
              return (
                <span key={targetKey(t)} style={broken ? chipBrokenRemovable : chipRemovable}>
                  {targetLabel(t)}{broken ? ' — not found' : ''}
                  <button
                    onClick={() => removeTarget(t)}
                    title="Remove"
                    style={chipX}
                  >
                    <X size={12} />
                  </button>
                </span>
              )
            })}
          </div>
        </div>

        {/* Picker */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          padding: 12, borderRadius: 10,
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-muted)',
        }}>
          <div style={labelText}>Pick classes and families</div>
          <input
            value={find}
            onChange={e => setFind(e.target.value)}
            placeholder="Search classes and families…"
            style={inputStyle}
          />

          <div style={{
            maxHeight:       260,
            overflowY:       'auto',
            border:          '1px solid var(--color-border)',
            borderRadius:    8,
            backgroundColor: 'var(--color-bg)',
          }}>
            {pairs.length === 0 && (
              <div style={{ ...hintText, padding: 12 }}>
                The class list did not load. Close and reopen this screen.
              </div>
            )}
            {pairs.length > 0 && shownRows.length === 0 && (
              <div style={{ ...hintText, padding: 12 }}>
                No class or family matches "{find}".
              </div>
            )}
            {shownRows.map(r => {
              const checked = selectedKeys.has(targetKey(r))
              const isFam   = !!r.subclass
              return (
                <label
                  key={targetKey(r)}
                  style={{
                    display:         'flex',
                    alignItems:      'center',
                    gap:             8,
                    padding:         isFam ? '5px 10px 5px 30px' : '7px 10px',
                    fontSize:        isFam ? 13 : 13.5,
                    fontWeight:      isFam ? 400 : 600,
                    fontFamily:      'var(--font-body)',
                    color:           'var(--color-text-primary)',
                    cursor:          'pointer',
                    backgroundColor: checked ? 'var(--color-accent-light)' : 'transparent',
                    borderTop:       !isFam ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTarget(r)}
                  />
                  {isFam ? r.subclass : `${r.class} (whole class)`}
                </label>
              )
            })}
            {hiddenRows > 0 && (
              <div style={{ ...hintText, padding: 10, textAlign: 'center' }}>
                {hiddenRows} more — type in the search box to narrow the list.
              </div>
            )}
          </div>
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

  // ── Broken links: targets whose class / family no longer exists ───────────

  const validity = useMemo(() => buildValidity(pairs), [pairs])

  const brokenList = useMemo(() => {
    const out = []
    for (const r of rows) {
      const bad = (r.targets ?? []).filter(t => isBroken(t, validity))
      if (bad.length > 0) out.push({ row: r, bad })
    }
    return out
  }, [rows, validity])

  const [warnOpen, setWarnOpen] = useState(false)

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
      {!loading && brokenList.length > 0 && (
        <div style={warnBox}>
          <button
            onClick={() => setWarnOpen(o => !o)}
            style={warnHead}
          >
            <AlertTriangle size={14} />
            {brokenList.length} keyword{brokenList.length === 1 ? '' : 's'} point
            {brokenList.length === 1 ? 's' : ''} at a class or family that no longer exists
            <span style={{ marginLeft: 'auto', fontWeight: 500 }}>
              {warnOpen ? 'Hide' : 'Show'}
            </span>
          </button>
          {warnOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {brokenList.map(({ row, bad }) => (
                <div key={row.id} style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  <button
                    onClick={() => { setEditTarget(row); setModalOpen(true) }}
                    style={warnLink}
                  >
                    {row.keyword}
                  </button>
                  {' — '}{bad.map(targetLabel).join('; ')}
                </div>
              ))}
              <div style={hintText}>
                The app ignores these links, so nothing is broken for users.
                Open the keyword to remove them or tick the new name.
              </div>
            </div>
          )}
        </div>
      )}

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
                  <span
                    key={targetKey(t)}
                    style={isBroken(t, validity) ? chipBroken : chip}
                    title={isBroken(t, validity) ? 'Not found in the drug library' : undefined}
                  >
                    {targetLabel(t)}
                  </span>
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
        validity={validity}
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

const chipBroken = {
  ...chip,
  border:          '1px solid var(--color-danger)',
  color:           'var(--color-danger)',
  backgroundColor: 'transparent',
}

const chipBrokenRemovable = {
  ...chipRemovable,
  border:          '1px solid var(--color-danger)',
  color:           'var(--color-danger)',
  backgroundColor: 'transparent',
}

const warnBox = {
  padding:         '10px 12px',
  borderRadius:    10,
  border:          '1px solid var(--color-danger)',
  backgroundColor: 'var(--color-surface)',
  marginBottom:    12,
}

const warnHead = {
  display:     'flex',
  alignItems:  'center',
  gap:         8,
  width:       '100%',
  background:  'none',
  border:      'none',
  padding:     0,
  cursor:      'pointer',
  textAlign:   'left',
  fontSize:    13,
  fontWeight:  600,
  fontFamily:  'var(--font-body)',
  color:       'var(--color-danger)',
}

const warnLink = {
  background:  'none',
  border:      'none',
  padding:     0,
  cursor:      'pointer',
  fontSize:    12,
  fontWeight:  600,
  fontFamily:  'var(--font-body)',
  color:       'var(--color-accent)',
  textDecoration: 'underline',
}
