import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Search, X, AlertTriangle } from 'lucide-react'
import { useDrugContext } from '../../context/DrugContext'
import { DRUG_CATEGORIES } from '../../config/categories'
import { deleteFormulation } from '../../lib/adminQueries'
import BrandStockRow from '../../components/admin/BrandStockRow'

/**
 * DrugCMS — /admin/drugs
 *
 * Lists all formulations grouped by generic name.
 * Features:
 *   - Search: generic name, Arabic name, brand names
 *   - Category filter pills
 *   - Expandable brand rows per formulation (shows BrandStockRow per brand)
 *   - Edit (→ /admin/drugs/:id) + Delete per formulation
 *   - Delete: inline confirm → deleteFormulation → remove from local state
 *   - "+ Add New" → /admin/drugs/new
 */
export default function DrugCMS() {
  const navigate           = useNavigate()
  const { drugs, loading } = useDrugContext()

  const [query,           setQuery]           = useState('')
  const [activeCategory,  setActiveCategory]  = useState(null)
  const [expandedIds,     setExpandedIds]     = useState(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)  // formulation id pending delete
  const [deletingId,      setDeletingId]      = useState(null)  // formulation id being deleted
  const [deleteError,     setDeleteError]     = useState(null)

  // Local override map for brand stock toggles so UI reflects optimistic changes
  // Shape: { [brandId]: { in_stock, is_available } }
  const [brandOverrides, setBrandOverrides] = useState({})

  // ─── Derive present categories from loaded drugs ────────────────────────────
  const presentCategories = useMemo(() => {
    const cats = new Set(drugs.map(d => d.category))
    return DRUG_CATEGORIES.filter(c => cats.has(c.value))
  }, [drugs])

  // ─── Filter + search ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = drugs
    if (activeCategory) list = list.filter(d => d.category === activeCategory)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(d =>
        d.genericName.toLowerCase().includes(q) ||
        (d.arabicName && d.arabicName.includes(query)) ||
        d.brands?.some(b => b.name.toLowerCase().includes(q))
      )
    }
    return list.slice().sort((a, b) => a.genericName.localeCompare(b.genericName))
  }, [drugs, query, activeCategory])

  // ─── Expand / collapse ──────────────────────────────────────────────────────
  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ─── Brand optimistic update handler ───────────────────────────────────────
  function handleBrandUpdate(brandId, field, value) {
    setBrandOverrides(prev => ({
      ...prev,
      [brandId]: { ...(prev[brandId] ?? {}), [field]: value },
    }))
  }

  // ─── Delete flow ────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    setDeleteError(null)
    setDeletingId(id)
    const { error } = await deleteFormulation(id)
    setDeletingId(null)
    setConfirmDeleteId(null)
    if (error) {
      setDeleteError(`Delete failed: ${error.message}`)
      return
    }
    // DrugContext will refetch on next metadata check; for immediate UI feedback
    // we rely on the drug list updating from the context refresh.
    // If needed, a manual refetch can be added here.
  }

  // ─── Merge brand overrides into drug.brands ─────────────────────────────────
  function resolvedBrands(drug) {
    return (drug.brands ?? []).map(b => ({
      ...b,
      ...(brandOverrides[b.id] ?? {}),
    }))
  }

  if (loading && drugs.length === 0) {
    return <AdminShell onAdd={() => navigate('/admin/drugs/new')}><LoadingSkeleton /></AdminShell>
  }

  return (
    <AdminShell onAdd={() => navigate('/admin/drugs/new')}>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
        <Search size={15} style={{
          position: 'absolute', left: 'var(--space-3)', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)',
          pointerEvents: 'none',
        }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search drug or brand…"
          style={searchInputStyle}
        />
        {query && (
          <button onClick={() => setQuery('')} style={clearBtnStyle}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category filter pills */}
      <div style={{
        display: 'flex', gap: 'var(--space-2)',
        overflowX: 'auto', paddingBottom: 'var(--space-2)',
        marginBottom: 'var(--space-4)', scrollbarWidth: 'none',
      }}>
        {[{ value: null, label: 'All' }, ...presentCategories].map(cat => {
          const active = activeCategory === cat.value
          return (
            <button
              key={cat.value ?? 'all'}
              onClick={() => setActiveCategory(cat.value)}
              style={{
                flexShrink: 0,
                padding: '5px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                border: active ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                backgroundColor: active ? 'var(--color-accent)' : 'var(--color-surface)',
                color: active ? '#fff' : 'var(--color-text-secondary)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.label ?? cat.value}
            </button>
          )
        })}
      </div>

      {/* Results count */}
      <div style={{
        fontSize: 12, color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-3)',
      }}>
        {filtered.length} formulation{filtered.length !== 1 ? 's' : ''}
        {query && ` for "${query}"`}
      </div>

      {/* Delete error banner */}
      {deleteError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
          marginBottom: 'var(--space-3)', fontSize: 13, color: '#DC2626',
        }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          {deleteError}
          <button onClick={() => setDeleteError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Drug list */}
      {filtered.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}>
          {filtered.map((drug, idx) => {
            const isLast     = idx === filtered.length - 1
            const isExpanded = expandedIds.has(drug.id)
            const brands     = resolvedBrands(drug)
            const inStockCount = brands.filter(b => b.in_stock).length
            const isPendingDelete = confirmDeleteId === drug.id
            const isDeleting     = deletingId === drug.id

            return (
              <div
                key={drug.id}
                style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)' }}
              >
                {/* ── Formulation row ── */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  padding: 'var(--space-3) var(--space-4)',
                  gap: 'var(--space-3)',
                  opacity: isDeleting ? 0.4 : 1,
                  transition: 'opacity 0.2s ease',
                }}>

                  {/* Expand toggle */}
                  <button
                    onClick={() => toggleExpand(drug.id)}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-tertiary)', padding: 0,
                      display: 'flex', alignItems: 'center', flexShrink: 0,
                    }}
                  >
                    {isExpanded
                      ? <ChevronDown size={16} />
                      : <ChevronRight size={16} />
                    }
                  </button>

                  {/* Drug info */}
                  <div
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => toggleExpand(drug.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 14, fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}>
                        {drug.genericName}
                      </span>
                      <span style={{
                        fontSize: 12, color: 'var(--color-text-tertiary)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {drug.concentration} · {drug.form} · {drug.route}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 3, flexWrap: 'wrap' }}>
                      {/* Category chip */}
                      <span style={{
                        fontSize: 10, fontWeight: 500,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        color: 'var(--color-text-tertiary)',
                        backgroundColor: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-full)',
                        padding: '1px 7px',
                      }}>
                        {DRUG_CATEGORIES.find(c => c.value === drug.category)?.label ?? drug.category}
                      </span>

                      {/* Brand count + in-stock badge */}
                      <span style={{
                        fontSize: 12, color: 'var(--color-text-tertiary)',
                      }}>
                        {brands.length} brand{brands.length !== 1 ? 's' : ''}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: inStockCount > 0 ? 'var(--color-instock)' : '#DC2626',
                        backgroundColor: inStockCount > 0 ? 'var(--color-instock-bg)' : '#FEF2F2',
                        borderRadius: 'var(--radius-full)',
                        padding: '1px 8px',
                      }}>
                        {inStockCount}/{brands.length} in stock
                      </span>
                    </div>
                  </div>

                  {/* Edit button */}
                  <button
                    onClick={() => navigate(`/admin/drugs/${drug.id}`)}
                    aria-label="Edit"
                    style={iconBtnStyle}
                    title="Edit"
                  >
                    <Edit2 size={15} />
                  </button>

                  {/* Delete button / confirm inline */}
                  {isPendingDelete ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: '#DC2626', whiteSpace: 'nowrap' }}>Delete?</span>
                      <button
                        onClick={() => handleDelete(drug.id)}
                        disabled={isDeleting}
                        style={{
                          ...iconBtnStyle,
                          color: '#DC2626',
                          borderColor: '#FECACA',
                          backgroundColor: '#FEF2F2',
                        }}
                      >
                        {isDeleting ? '…' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={iconBtnStyle}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(drug.id)}
                      aria-label="Delete"
                      style={{ ...iconBtnStyle, color: 'var(--color-text-tertiary)' }}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* ── Expanded brand rows ── */}
                {isExpanded && (
                  <div>
                    {brands.length === 0 ? (
                      <div style={{
                        padding: 'var(--space-2) var(--space-4) var(--space-2) var(--space-8)',
                        fontSize: 13, color: 'var(--color-text-tertiary)',
                        borderTop: '1px solid var(--color-border-subtle)',
                        backgroundColor: 'var(--color-bg)',
                      }}>
                        No brands
                      </div>
                    ) : (
                      brands.map(brand => (
                        <BrandStockRow
                          key={brand.id}
                          brand={brand}
                          onUpdate={handleBrandUpdate}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </AdminShell>
  )
}

// ─── AdminShell ───────────────────────────────────────────────────────────────

function AdminShell({ children, onAdd }) {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={() => navigate('/admin')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
              fontFamily: 'var(--font-body)', padding: '4px 0',
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            }}
          >
            ‹ Admin
          </button>
          <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Drug Library
          </span>
        </div>

        <button
          onClick={onAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: 'var(--color-accent)',
            color: '#fff',
            fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
          }}
        >
          <Plus size={15} />
          Add New
        </button>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: 680, margin: '0 auto',
        padding: 'var(--space-5) var(--space-4) var(--space-12)',
      }}>
        {children}
      </main>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          height: 64,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          animation: 'shimmer 1.4s ease-in-out infinite',
        }} />
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ query }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: 'var(--space-12) var(--space-4)',
      color: 'var(--color-text-tertiary)',
    }}>
      <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}>
        <Search size={32} />
      </div>
      <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
        No drugs found{query ? ` for "${query}"` : ''}
      </div>
      <div style={{ fontSize: 13 }}>Try a different search or category</div>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const searchInputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 'var(--space-2) var(--space-3) var(--space-2) var(--space-8)',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  color: 'var(--color-text-primary)',
  outline: 'none',
  boxShadow: 'var(--shadow-card)',
}

const clearBtnStyle = {
  position: 'absolute',
  right: 'var(--space-3)',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-tertiary)',
  display: 'flex',
  alignItems: 'center',
  padding: 0,
}

const iconBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--space-1) var(--space-2)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  flexShrink: 0,
  minWidth: 30,
}
