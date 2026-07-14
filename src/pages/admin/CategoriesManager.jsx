/**
 * src/pages/admin/CategoriesManager.jsx
 *
 * 1A.3 — Near-twin of SpecialtiesManager.jsx (drug_categories mirrors the
 * specialties table shape, see GENERIC_FORMULATION_BRAND_MAPPING_PLAN.md
 * ADR-039). Two deliberate differences from the specialties original:
 *
 *  - No "Uncategorized" sentinel row / reassignment-on-deactivate. A
 *    generic's category is a plain text label (generics.category), not a
 *    foreign key, so deactivating a category just stops offering it in
 *    pickers — existing drugs keep showing their old label untouched.
 *  - Count-only badge, no tap-to-expand name list. Categories can end up
 *    covering thousands of drugs at full migration scale (vs. a handful of
 *    conditions per specialty today), where an inline name list would get
 *    unwieldy.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, GripVertical, Pencil, Trash2,
  ToggleLeft, ToggleRight, ChevronUp, ChevronDown,
  Upload, Check,
} from 'lucide-react'
import { useToast }       from '../../context/ToastContext'
import Modal              from '../../components/admin/Modal'
import ConfirmModal       from '../../components/admin/ConfirmModal'
import { SpecialtyIcon, LUCIDE_ICON_OPTIONS } from '../../utils/specialtyIcon'
import { SPECIALTY_TOKENS, TOKEN_KEYS, resolveToken, FALLBACK_TOKEN } from '../../utils/specialtyTokens'
import {
  fetchAllCategories,
  insertCategory,
  updateCategory,
  toggleCategoryActive,
  deleteCategory,
  reorderCategories,
  uploadCategoryIcon,
} from '../../lib/adminQueries'

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name_en:     '',
  name_ar:     '',
  icon_type:   'lucide',
  icon_name:   'Stethoscope',   // Lucide key (stored in existing icon_name col)
  icon_url:    null,            // custom SVG public URL
  color_token: FALLBACK_TOKEN,
}

// ─── Slug helper ──────────────────────────────────────────────────────────────

function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// ─── Token palette picker ─────────────────────────────────────────────────────

function TokenPalette({ value, onChange }) {
  // Render in light mode colors so the admin always sees a consistent preview
  return (
    <div>
      <div style={labelText}>Color</div>
      <div style={{
        display:   'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap:       6,
        marginTop: 8,
      }}>
        {TOKEN_KEYS.map(key => {
          const t       = SPECIALTY_TOKENS[key].light
          const active  = value === key
          return (
            <button
              key={key}
              title={SPECIALTY_TOKENS[key].label}
              onClick={() => onChange(key)}
              style={{
                width:        36,
                height:       36,
                borderRadius: 8,
                backgroundColor: t.bg,
                border:       active
                  ? `2.5px solid ${t.fg}`
                  : '2px solid transparent',
                cursor:       'pointer',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                outline:      'none',
                position:     'relative',
              }}
            >
              {/* Small fg dot so admin can see both bg and fg in the swatch */}
              <div style={{
                width:        12,
                height:       12,
                borderRadius: '50%',
                backgroundColor: t.fg,
              }} />
              {active && (
                <div style={{
                  position:        'absolute',
                  inset:           0,
                  borderRadius:    6,
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                }}>
                  <Check size={14} color={t.fg} strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>
      <div style={{
        marginTop: 4,
        fontSize:  11,
        color:     'var(--color-text-tertiary)',
      }}>
        {SPECIALTY_TOKENS[value]?.label ?? 'Slate'} — tokens can be shared across categories
      </div>
    </div>
  )
}

// ─── Icon picker ──────────────────────────────────────────────────────────────

function IconPicker({ iconType, iconName, iconUrl, onChangeLucide, onChangeCustom }) {
  const [tab, setTab]       = useState(iconType === 'custom' ? 'custom' : 'lucide')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState(null)
  const fileRef = useRef(null)
  const { toast } = useToast()

  const filtered = LUCIDE_ICON_OPTIONS.filter(o =>
    search === '' ||
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.key.toLowerCase().includes(search.toLowerCase())
  )

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'image/svg+xml') {
      setUploadErr('Only SVG files are accepted.')
      return
    }
    if (file.size > 30_000) {
      setUploadErr('SVG must be under 30 KB.')
      return
    }
    setUploadErr(null)
    setUploading(true)
    const { url, error } = await uploadCategoryIcon(file)
    setUploading(false)
    if (error) {
      setUploadErr(error.message ?? 'Upload failed')
      return
    }
    onChangeCustom(url)
    toast.success('Icon uploaded')
  }

  return (
    <div>
      <div style={labelText}>Icon</div>

      {/* Tab switcher */}
      <div style={{
        display:       'flex',
        gap:           4,
        marginTop:     8,
        marginBottom:  10,
        background:    'var(--color-surface-muted)',
        borderRadius:  8,
        padding:       3,
      }}>
        {['lucide', 'custom'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex:            1,
              padding:         '5px 0',
              borderRadius:    6,
              border:          'none',
              fontSize:        12,
              fontWeight:      tab === t ? 600 : 400,
              fontFamily:      'var(--font-body)',
              cursor:          'pointer',
              backgroundColor: tab === t ? 'var(--color-surface)' : 'transparent',
              color:           tab === t ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              boxShadow:       tab === t ? 'var(--shadow-card)' : 'none',
              transition:      'all 0.12s ease',
            }}
          >
            {t === 'lucide' ? 'Icon library' : 'Custom SVG'}
          </button>
        ))}
      </div>

      {/* Lucide tab */}
      {tab === 'lucide' && (
        <div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search icons…"
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <div style={{
            display:      'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap:          4,
            maxHeight:    200,
            overflowY:    'auto',
            border:       '1px solid var(--color-border)',
            borderRadius: 8,
            padding:      6,
          }}>
            {filtered.map(({ key, label, Icon }) => {
              const active = iconType === 'lucide' && iconName === key
              return (
                <button
                  key={key}
                  title={label}
                  onClick={() => onChangeLucide(key)}
                  style={{
                    display:         'flex',
                    flexDirection:   'column',
                    alignItems:      'center',
                    gap:             3,
                    padding:         '8px 4px',
                    borderRadius:    6,
                    border:          active
                      ? '1.5px solid var(--color-accent)'
                      : '1.5px solid transparent',
                    backgroundColor: active
                      ? 'var(--color-accent-light)'
                      : 'transparent',
                    cursor:          'pointer',
                    outline:         'none',
                  }}
                >
                  <Icon
                    size={20}
                    color={active ? 'var(--color-accent)' : 'var(--color-text-secondary)'}
                    strokeWidth={1.75}
                  />
                  <span style={{
                    fontSize:  9,
                    color:     active ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    overflow:  'hidden',
                    display:   '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {label}
                  </span>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div style={{
                gridColumn: '1 / -1',
                padding:    '16px 0',
                textAlign:  'center',
                fontSize:   13,
                color:      'var(--color-text-tertiary)',
              }}>
                No icons match "{search}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom SVG tab */}
      {tab === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            ref={fileRef}
            type="file"
            accept=".svg,image/svg+xml"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Current custom icon preview */}
          {iconType === 'custom' && iconUrl && (
            <div style={{
              display:        'flex',
              alignItems:     'center',
              gap:            10,
              padding:        '10px 12px',
              borderRadius:   8,
              border:         '1px solid var(--color-border)',
              backgroundColor:'var(--color-surface-muted)',
            }}>
              <img src={iconUrl} width={28} height={28} alt="" style={{ objectFit: 'contain' }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flex: 1 }}>
                Custom SVG active
              </span>
            </div>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             6,
              padding:         '10px',
              borderRadius:    8,
              border:          '1.5px dashed var(--color-border)',
              backgroundColor: 'var(--color-surface-muted)',
              color:           'var(--color-text-secondary)',
              fontSize:        13,
              fontFamily:      'var(--font-body)',
              cursor:          uploading ? 'wait' : 'pointer',
            }}
          >
            <Upload size={14} />
            {uploading ? 'Uploading…' : 'Upload SVG from device'}
          </button>

          {uploadErr && (
            <div style={{ fontSize: 12, color: 'var(--color-danger)' }}>
              {uploadErr}
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
            SVG only · max 30 KB · monochrome works best.<br />
            The icon background color is still controlled by the token above.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CategoryModal ────────────────────────────────────────────────────────────

function CategoryModal({ open, category, onClose, onSaved, nextOrder }) {
  const { toast } = useToast()
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(category
        ? {
            name_en:     category.name_en     ?? '',
            name_ar:     category.name_ar     ?? '',
            icon_type:   category.icon_type   ?? 'lucide',
            icon_name:   category.icon_name   ?? 'Stethoscope',
            icon_url:    category.icon_url    ?? null,
            color_token: category.color_token ?? FALLBACK_TOKEN,
          }
        : { ...EMPTY_FORM }
      )
    }
  }, [open, category])

  function patch(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleLucideChange(key) {
    setForm(f => ({ ...f, icon_type: 'lucide', icon_name: key, icon_url: null }))
  }

  function handleCustomChange(url) {
    setForm(f => ({ ...f, icon_type: 'custom', icon_url: url }))
  }

  async function handleSave() {
    if (!form.name_en.trim()) {
      toast.error('Name (English) is required')
      return
    }
    setBusy(true)

    const payload = {
      name_en:     form.name_en.trim(),
      name_ar:     form.name_ar.trim() || null,
      icon_name:   form.icon_type === 'lucide' ? form.icon_name : 'Stethoscope',
      icon_type:   form.icon_type,
      icon_url:    form.icon_type === 'custom' ? (form.icon_url ?? null) : null,
      color_token: form.color_token,
      // Keep color_hex in sync with token for any legacy readers
      color_hex:   SPECIALTY_TOKENS[form.color_token]?.light.bg ?? '#F1F5F9',
      ...(category ? {} : { sort_order: nextOrder ?? 99 }),
    }

    let result
    if (category) {
      result = await updateCategory(category.id, payload)
    } else {
      payload.slug      = toSlug(form.name_en)
      payload.is_active = true
      result = await insertCategory(payload)
    }

    setBusy(false)

    if (result.error) {
      toast.error(result.error.message ?? 'Save failed')
      return
    }

    toast.success(category ? 'Category updated' : 'Category added')
    onSaved()
    onClose()
  }

  // Resolve preview colors
  const previewColors = resolveToken(form.color_token, false)

  return (
    <Modal
      isOpen={open}
      title={category ? 'Edit Category' : 'Add Category'}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Name EN */}
        <label style={labelStyle}>
          Name (English) *
          <input
            value={form.name_en}
            onChange={e => patch('name_en', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="e.g. Cardiovascular"
            style={inputStyle}
          />
        </label>

        {/* Name AR */}
        <label style={labelStyle}>
          Name (Arabic)
          <input
            value={form.name_ar}
            onChange={e => patch('name_ar', e.target.value)}
            placeholder="اختياري"
            dir="rtl"
            style={inputStyle}
          />
        </label>

        {/* Color token palette */}
        <TokenPalette
          value={form.color_token}
          onChange={v => patch('color_token', v)}
        />

        {/* Icon picker */}
        <IconPicker
          iconType={form.icon_type}
          iconName={form.icon_name}
          iconUrl={form.icon_url}
          onChangeLucide={handleLucideChange}
          onChangeCustom={handleCustomChange}
        />

        {/* Live preview */}
        <div>
          <div style={labelText}>Preview</div>
          <div style={{
            marginTop:       8,
            display:         'flex',
            alignItems:      'center',
            gap:             12,
            padding:         '12px 16px',
            border:          '1px solid var(--color-border)',
            borderRadius:    10,
            backgroundColor: 'var(--color-bg)',
          }}>
            {/* Bubble */}
            <div style={{
              width:           44,
              height:          44,
              borderRadius:    12,
              backgroundColor: previewColors.bg,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
              boxShadow:       'inset 0 0 0 1px rgba(0,0,0,0.06)',
            }}>
              <SpecialtyIcon
                iconType={form.icon_type}
                iconValue={form.icon_type === 'custom' ? (form.icon_url ?? '') : form.icon_name}
                size={22}
                color={previewColors.fg}
              />
            </div>
            {/* Text */}
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
                {form.name_en || 'Category Name'}
              </div>
              {form.name_ar && (
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', direction: 'rtl' }}>
                  {form.name_ar}
                </div>
              )}
              {/* Token label */}
              <div style={{
                display:         'inline-flex',
                alignItems:      'center',
                gap:             4,
                marginTop:       4,
                padding:         '2px 8px',
                borderRadius:    'var(--radius-full)',
                backgroundColor: previewColors.bg,
                fontSize:        11,
                fontWeight:      500,
                color:           previewColors.fg,
              }}>
                {SPECIALTY_TOKENS[form.color_token]?.label ?? 'Slate'}
              </div>
            </div>
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

export default function CategoriesManager() {
  const navigate      = useNavigate()
  const { toast }     = useToast()

  // Store toast in a ref so load() never needs it as a dep — same fix as
  // SpecialtiesManager (avoids an infinite fetch/setState loop; see that
  // file's header comment for the full crash story).
  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)

  const [modalOpen,  setModalOpen]  = useState(false)
  const [editTarget, setEditTarget] = useState(null)

  const [confirmOpen,   setConfirmOpen]   = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({})

  const dragIdx  = useRef(null)
  const dragOver = useRef(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchAllCategories()
    setLoading(false)
    if (error) { toastRef.current.error('Failed to load categories'); return }
    setRows(data ?? [])
  }, [])  // ← empty dep array: load() is created once; toast accessed via ref

  useEffect(() => { load() }, [load])

  // ── Move row up / down ────────────────────────────────────────────────────

  async function moveRow(idx, direction) {
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= rows.length) return

    const reordered = [...rows]
    ;[reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]]
    const withOrder = reordered.map((c, i) => ({ ...c, sort_order: i + 1 }))
    setRows(withOrder)

    const { error } = await reorderCategories(
      withOrder.map(c => ({ id: c.id, sort_order: c.sort_order }))
    )
    if (error) { toast.error('Reorder failed'); load() }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────
  //
  // Simple flip only — no reassignment. A category is a text label on
  // generics, not a foreign key, so deactivating one just stops offering it
  // in pickers; drugs already carrying that label keep showing it as-is.

  async function handleToggleActive(category) {
    const { error } = await toggleCategoryActive(category.id, !category.is_active, category.name_en)
    if (error) { toast.error(error.message ?? 'Toggle failed'); return }
    toast.success(!category.is_active ? 'Category activated' : 'Category deactivated')
    load()
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(category) {
    if (category.genericCount > 0) {
      toast.error(`Cannot delete — ${category.genericCount} drug(s) still carry this category.`)
      return
    }
    setConfirmConfig({
      title:   'Delete Category?',
      message: `"${category.name_en}" will be permanently removed. This cannot be undone.`,
      onConfirm: () => doDelete(category),
    })
    setConfirmOpen(true)
  }

  async function doDelete(category) {
    const { error } = await deleteCategory(category.id, category.name_en)
    if (error) { toast.error(error.message ?? 'Delete failed'); return }
    toast.success('Category deleted')
    load()
  }

  // ── Drag-and-drop ─────────────────────────────────────────────────────────

  function onDragStart(idx) { dragIdx.current = idx }
  function onDragEnter(idx) { dragOver.current = idx }

  async function onDragEnd() {
    const from = dragIdx.current
    const to   = dragOver.current
    if (from === null || to === null || from === to) {
      dragIdx.current = dragOver.current = null
      return
    }
    const reordered = [...rows]
    const [moved]   = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const withOrder = reordered.map((c, i) => ({ ...c, sort_order: i + 1 }))
    setRows(withOrder)
    dragIdx.current = dragOver.current = null

    const { error } = await reorderCategories(
      withOrder.map(c => ({ id: c.id, sort_order: c.sort_order }))
    )
    if (error) { toast.error('Reorder failed'); load() }
  }

  // ─────────────────────────────────────────────────────────────────────────

  const nextOrder = rows.length + 1

  return (
    <div style={{
      maxWidth:  680,
      margin:    '0 auto',
      padding:   'var(--space-4)',
      fontFamily:'var(--font-body)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-5)' }}>
        <button onClick={() => navigate('/admin')} style={iconBtn}>
          <ArrowLeft size={16} />
        </button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Categories
        </h1>
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true) }}
          style={{ ...btnPrimary, marginLeft: 'auto' }}
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-tertiary)' }}>
          Loading…
        </div>
      )}

      {!loading && rows.map((category, idx) => {
        const tokenKey = category.color_token ?? FALLBACK_TOKEN
        const colors   = resolveToken(tokenKey, false)

        return (
          <div
            key={category.id}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragEnter={() => onDragEnter(idx)}
            onDragEnd={onDragEnd}
            onDragOver={e => e.preventDefault()}
            style={{
              display:         'flex',
              alignItems:      'center',
              gap:             8,
              padding:         '10px 12px',
              border:          '1px solid var(--color-border)',
              borderRadius:    10,
              marginBottom:    8,
              backgroundColor: 'var(--color-surface)',
              opacity:         category.is_active ? 1 : 0.55,
            }}
          >
            {/* Drag handle */}
            <GripVertical
              size={16}
              color="var(--color-text-tertiary)"
              style={{ cursor: 'grab', flexShrink: 0 }}
            />

            {/* Icon bubble */}
            <div style={{
              width:           36,
              height:          36,
              flexShrink:      0,
              borderRadius:    8,
              backgroundColor: colors.bg,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
            }}>
              <SpecialtyIcon
                iconType={category.icon_type   ?? 'lucide'}
                iconValue={category.icon_type === 'custom'
                  ? (category.icon_url ?? '')
                  : (category.icon_name ?? 'Stethoscope')}
                size={18}
                color={colors.fg}
              />
            </div>

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight:   600,
                fontSize:     14,
                color:        'var(--color-text-primary)',
                overflow:     'hidden',
                whiteSpace:   'nowrap',
                textOverflow: 'ellipsis',
              }}>
                {category.name_en}
              </div>
              {category.name_ar && (
                <div style={{
                  fontSize:  12,
                  color:     'var(--color-text-tertiary)',
                  direction: 'rtl',
                }}>
                  {category.name_ar}
                </div>
              )}
            </div>

            {/* Drug count badge — count only, no expand */}
            <div style={{
              padding:         '2px 8px',
              borderRadius:    'var(--radius-full)',
              border:          '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface-muted)',
              fontSize:        11,
              color:           'var(--color-text-secondary)',
            }}>
              {category.genericCount ?? 0}
            </div>

            {/* Up / Down */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <button onClick={() => moveRow(idx, -1)} style={iconBtn} title="Move up">
                <ChevronUp size={12} />
              </button>
              <button onClick={() => moveRow(idx, +1)} style={iconBtn} title="Move down">
                <ChevronDown size={12} />
              </button>
            </div>

            {/* Toggle active */}
            <button
              onClick={() => handleToggleActive(category)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              title={category.is_active ? 'Deactivate' : 'Activate'}
            >
              {category.is_active
                ? <ToggleRight size={22} color="var(--color-success)" />
                : <ToggleLeft  size={22} color="var(--color-text-tertiary)" />}
            </button>

            {/* Edit */}
            <button
              onClick={() => { setEditTarget(category); setModalOpen(true) }}
              style={iconBtn}
              title="Edit"
            >
              <Pencil size={13} />
            </button>

            {/* Delete */}
            <button
              onClick={() => handleDelete(category)}
              style={{ ...iconBtn, color: 'var(--color-danger)' }}
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )
      })}

      {/* Add/Edit modal */}
      <CategoryModal
        open={modalOpen}
        category={editTarget}
        nextOrder={nextOrder}
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
    </div>
  )
}

// ─── Shared micro styles ──────────────────────────────────────────────────────

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
