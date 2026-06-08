/**
 * DrugRowEditor — manages drug alternatives for a prescription_items row of type='drug'.
 *
 * Props:
 *   item      PrescriptionItem  — must have prescription_drug_alternatives[]
 *   onChange  (updatedItem) => void
 *   disabled  boolean
 */

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, ChevronUp, ChevronDown, Link, LinkOff } from 'lucide-react'
import {
  searchBrandsForTypeahead,
  insertDrugAlternative,
  updateDrugAlternative,
  deleteDrugAlternative,
  updatePrescriptionItem,
  reorderItems,
} from '../../lib/adminQueries'

// ─── Brand typeahead (portal dropdown) ───────────────────────────────────────

function BrandTypeahead({ onSelect, disabled }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef(null)

  // Reposition dropdown whenever it opens
  useEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropPos({
        top:   rect.bottom + window.scrollY + 4,
        left:  rect.left   + window.scrollX,
        width: rect.width,
      })
    }
  }, [open, results])

  async function handleChange(e) {
    const q = e.target.value
    setQuery(q)
    if (q.trim().length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    const { data } = await searchBrandsForTypeahead(q.trim())
    setResults(data ?? [])
    setOpen(true)
    setLoading(false)
  }

  function handleSelect(brand) {
    onSelect(brand)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const dropdown = open && (
    <div
      style={{
        position: 'absolute',
        top:   dropPos.top,
        left:  dropPos.left,
        width: dropPos.width,
        zIndex: 9999,
        backgroundColor: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        maxHeight: 240,
        overflowY: 'auto',
      }}
      // prevent input blur from firing before mousedown select
      onMouseDown={e => e.preventDefault()}
    >
      {results.length === 0 && !loading && (
        <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          No brands found for "{query}"
        </div>
      )}
      {results.map(brand => {
        const f     = brand.formulations
        const label = `${brand.name}${f ? ` — ${f.concentration} ${f.form}` : ''}`
        const sub   = f?.generics?.name_en ?? ''
        return (
          <button
            key={brand.id}
            onMouseDown={() => handleSelect(brand)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '9px 12px', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              borderBottom: '1px solid var(--color-border)',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{sub}</div>}
          </button>
        )
      })}
    </div>
  )

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder="Search brand name…"
        disabled={disabled}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '8px 12px',
          border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          fontSize: 13, fontFamily: 'var(--font-body)',
          backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)',
          outline: 'none',
        }}
      />
      {loading && (
        <div style={{ position: 'absolute', right: 10, top: 10, fontSize: 11, color: 'var(--color-text-tertiary)' }}>…</div>
      )}
      {createPortal(dropdown, document.body)}
    </div>
  )
}

// ─── Single alternative row ───────────────────────────────────────────────────

function AlternativeRow({ alt, idx, total, onMove, onDelete, onDoseChange, disabled }) {
  const brand  = alt.brands
  const f      = brand?.formulations
  const name   = brand?.name ?? 'Unknown brand'
  const detail = f ? `${f.concentration} ${f.form}` : ''

  return (
    <div style={{
      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
      padding: 'var(--space-3)', marginBottom: 'var(--space-2)',
      backgroundColor: 'var(--color-bg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{name}</div>
          {detail && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{detail}</div>}
          {f?.generics?.name_en && (
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{f.generics.name_en}</div>
          )}
        </div>

        {idx < total - 1 && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
            backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)',
            color: 'var(--color-text-tertiary)', letterSpacing: '0.04em',
            textTransform: 'uppercase', alignSelf: 'center',
          }}>or</span>
        )}

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => onMove(idx, -1)} disabled={idx === 0 || disabled}
            style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', padding: 2, opacity: idx === 0 ? 0.3 : 1, display: 'flex' }}>
            <ChevronUp size={13} />
          </button>
          <button onClick={() => onMove(idx, 1)} disabled={idx === total - 1 || disabled}
            style={{ background: 'none', border: 'none', cursor: idx === total - 1 ? 'default' : 'pointer', padding: 2, opacity: idx === total - 1 ? 0.3 : 1, display: 'flex' }}>
            <ChevronDown size={13} />
          </button>
          <button onClick={() => onDelete(alt.id)} disabled={disabled}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: 'var(--radius-md)',
              border: '1px solid #FECACA', backgroundColor: '#FEF2F2',
              color: '#DC2626', cursor: disabled ? 'default' : 'pointer',
            }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <textarea
        value={alt.dose_instruction ?? ''}
        onChange={e => onDoseChange(alt.id, e.target.value)}
        onBlur={e => onDoseChange(alt.id, e.target.value, true)}
        placeholder="Dose instruction (e.g. 1 capsule every 8hrs for 7 days)…"
        rows={2}
        dir="auto"
        disabled={disabled}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '7px 10px',
          border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          fontSize: 13, fontFamily: 'var(--font-body)',
          backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)',
          resize: 'vertical', outline: 'none',
        }}
      />
    </div>
  )
}

// ─── Field label ──────────────────────────────────────────────────────────────

function FieldLabel({ children, hint }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {children}
      </span>
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 6 }}>{hint}</span>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DrugRowEditor({ item, onChange, disabled }) {
  const alternatives = item.prescription_drug_alternatives ?? []
  const [adding, setAdding] = useState(false)

  // ─── Item-level field save (blur) ─────────────────────────────────────────

  async function saveItemField(field, value) {
    await updatePrescriptionItem(item.id, { [field]: value })
  }

  function handleItemFieldChange(field, value) {
    onChange({ ...item, [field]: value })
  }

  function handleItemFieldBlur(field, value) {
    saveItemField(field, value)
  }

  function handleShowGenericLinkToggle() {
    const next = !(item.show_generic_link ?? true)
    onChange({ ...item, show_generic_link: next })
    saveItemField('show_generic_link', next)
  }

  // ─── Alternatives ─────────────────────────────────────────────────────────

  async function handleSelectBrand(brand) {
    setAdding(true)
    const doses   = brand.formulations?.generics?.doses ?? []
    const prefill = Array.isArray(doses) && doses.length > 0 ? doses[0].instruction : ''

    const { data: row, error } = await insertDrugAlternative({
      item_id:          item.id,
      brand_id:         brand.id,
      dose_instruction: prefill,
      sort_order:       alternatives.length,
    })

    if (!error) {
      onChange({ ...item, prescription_drug_alternatives: [...alternatives, { ...row, brands: brand }] })
    }
    setAdding(false)
  }

  async function handleDelete(altId) {
    const { error } = await deleteDrugAlternative(altId)
    if (!error) {
      onChange({ ...item, prescription_drug_alternatives: alternatives.filter(a => a.id !== altId) })
    }
  }

  async function handleMove(idx, direction) {
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= alternatives.length) return
    const next = [...alternatives]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    const reordered = next.map((a, i) => ({ ...a, sort_order: i }))
    onChange({ ...item, prescription_drug_alternatives: reordered })
    await reorderItems('prescription_drug_alternatives', reordered.map(a => ({ id: a.id, sort_order: a.sort_order })))
  }

  async function handleDoseChange(altId, value, save = false) {
    const updated = alternatives.map(a => a.id === altId ? { ...a, dose_instruction: value } : a)
    onChange({ ...item, prescription_drug_alternatives: updated })
    if (save) await updateDrugAlternative(altId, { dose_instruction: value })
  }

  const showLink = item.show_generic_link ?? true

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* ── Item-level fields (Phase 3D) ── */}
      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        backgroundColor: 'var(--color-bg)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
      }}>

        {/* dose_override */}
        <div>
          <FieldLabel hint="Leave blank to use formulation default">Dose override</FieldLabel>
          <input
            type="text"
            value={item.dose_override ?? ''}
            onChange={e => handleItemFieldChange('dose_override', e.target.value)}
            onBlur={e  => handleItemFieldBlur('dose_override', e.target.value || null)}
            placeholder="e.g. 1 tablet twice daily for 5 days"
            disabled={disabled}
            dir="auto"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '7px 10px',
              border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              fontSize: 13, fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {/* drug_note (EN) */}
        <div>
          <FieldLabel hint="English">Drug note</FieldLabel>
          <input
            type="text"
            value={item.drug_note ?? ''}
            onChange={e => handleItemFieldChange('drug_note', e.target.value)}
            onBlur={e  => handleItemFieldBlur('drug_note', e.target.value || null)}
            placeholder="e.g. Only if cramping present"
            disabled={disabled}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '7px 10px',
              border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              fontSize: 13, fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {/* drug_note_ar */}
        <div>
          <FieldLabel hint="Arabic (RTL)">Drug note — Arabic</FieldLabel>
          <input
            type="text"
            value={item.drug_note_ar ?? ''}
            onChange={e => handleItemFieldChange('drug_note_ar', e.target.value)}
            onBlur={e  => handleItemFieldBlur('drug_note_ar', e.target.value || null)}
            placeholder="ملاحظة بالعربي (اختياري)"
            disabled={disabled}
            dir="rtl"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '7px 10px',
              border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              fontSize: 13, fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)',
              outline: 'none', textAlign: 'right',
            }}
          />
        </div>

        {/* show_generic_link toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={handleShowGenericLinkToggle}
            disabled={disabled}
            title={showLink ? 'Drug name links to Drug Detail — click to disable' : 'Drug name is plain text — click to enable link'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${showLink ? 'var(--color-accent)' : 'var(--color-border)'}`,
              backgroundColor: showLink ? '#EFF6FF' : 'transparent',
              color: showLink ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
              fontSize: 12, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {showLink ? <Link size={12} /> : <LinkOff size={12} />}
            {showLink ? 'Drug link: ON' : 'Drug link: OFF'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            {showLink ? 'Name taps navigate to Drug Detail screen' : 'Name shown as plain text'}
          </span>
        </div>
      </div>

      {/* ── Alternatives section ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Brand alternatives
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            — shown as "or" options in the app
          </span>
        </div>

        {alternatives.length === 0 && (
          <div style={{
            textAlign: 'center', fontSize: 13, color: 'var(--color-text-tertiary)',
            padding: 'var(--space-3)', border: '1.5px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)',
          }}>
            No alternatives yet. Search a brand below.
          </div>
        )}

        {alternatives.map((alt, idx) => (
          <AlternativeRow
            key={alt.id}
            alt={alt}
            idx={idx}
            total={alternatives.length}
            onMove={handleMove}
            onDelete={handleDelete}
            onDoseChange={handleDoseChange}
            disabled={disabled}
          />
        ))}

        <div style={{ marginTop: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
            <Plus size={13} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Add alternative
            </span>
          </div>
          <BrandTypeahead onSelect={handleSelectBrand} disabled={adding || disabled} />
        </div>
      </div>

    </div>
  )
}
