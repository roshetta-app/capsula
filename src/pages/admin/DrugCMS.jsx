/**
 * DrugCMS.jsx — Phase 3E rebuild
 * /admin/drugs
 *
 * Lists all generics (published + drafts) in a table with:
 *   - Columns: Name | Category | Formulations | Published | Actions
 *   - Published toggle (immediate update + ConfirmModal for unpublish)
 *   - Edit (pencil) → navigates to DrugEditor (/admin/drugs/generic/:id)
 *   - Delete → ConfirmModal
 *   - "Forms" count → navigates to DrugEditor
 *   - "+ Add New" → navigates to AddDrugFlow (/admin/drugs/new)
 *   - Search (name_en, name_ar) + category filter, both querying the live
 *     database directly (debounced, capped at 50 rows) — never a client-side
 *     re-filter of a preloaded list. Category options come from the real
 *     drug_categories table via useCategories, shown as a full-width dropdown.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Search, X, AlertTriangle, Layers } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useCategories } from '../../hooks/useCategories'
import ConfirmModal from '../../components/admin/ConfirmModal'
import {
  fetchGenericsPage,
  toggleGenericPublished,
  deleteGeneric,
} from '../../lib/adminQueries'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DrugCMS() {
  const navigate    = useNavigate()
  const { toast }   = useToast()

  const [generics,     setGenerics]     = useState([])
  const [totalCount,   setTotalCount]   = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(null)

  const [query,           setQuery]           = useState('')
  const [debouncedQuery,  setDebouncedQuery]  = useState('')
  const [activeCategory,  setActiveCategory]  = useState(null)
  const [page,            setPage]            = useState(0)

  const [confirmUnpub, setConfirmUnpub] = useState(null)
  const [confirmDel,   setConfirmDel]   = useState(null)
  const [actionId,     setActionId]     = useState(null)

  // Real, admin-curated category list (drug_categories table), not scanned
  // from whatever text happens to be sitting on generics right now.
  const { categories } = useCategories()

  // ── Debounce search input — one query per pause-in-typing, not per keystroke ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // A new search or category always starts back at page 1 — the old page
  // number wouldn't mean anything against a different result set.
  useEffect(() => { setPage(0) }, [debouncedQuery, activeCategory])

  // ── Load — always a real, filtered, paginated query against the live DB ──────
  async function load() {
    setLoading(true)
    setLoadError(null)
    const { data, count, error } = await fetchGenericsPage({
      query: debouncedQuery,
      category: activeCategory,
      limit: PAGE_SIZE,
      page,
    })
    setLoading(false)
    if (error) { setLoadError(error.message); return }
    setGenerics(data)
    setTotalCount(count)
  }

  useEffect(() => { load() }, [debouncedQuery, activeCategory, page])

  // ── Publish toggle ──────────────────────────────────────────────────────────
  async function handlePublishToggle(generic) {
    const toPublish = !generic.is_published
    if (!toPublish) {
      setConfirmUnpub(generic)
      return
    }
    setActionId(generic.id)
    const { error } = await toggleGenericPublished(generic.id, true)
    setActionId(null)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    setGenerics(prev => prev.map(g => g.id === generic.id ? { ...g, is_published: true } : g))
    toast.success('Generic published')
  }

  async function confirmUnpublish() {
    const g = confirmUnpub
    setConfirmUnpub(null)
    setActionId(g.id)
    const { error } = await toggleGenericPublished(g.id, false)
    setActionId(null)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    setGenerics(prev => prev.map(x => x.id === g.id ? { ...x, is_published: false } : x))
    toast.success('Generic unpublished')
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete() {
    const g = confirmDel
    setConfirmDel(null)
    setActionId(g.id)
    const { error } = await deleteGeneric(g.id)
    setActionId(null)
    if (error) { toast.error(`Delete failed: ${error.message}`); return }
    setGenerics(prev => prev.filter(x => x.id !== g.id))
    toast.success('Generic deleted')
  }

  // ─────────────────────────────────────────────────────────────────────────────

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
          placeholder="Search generic name…"
          style={searchInputStyle}
        />
        {query && (
          <button onClick={() => setQuery('')} style={clearBtnStyle}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <select
          value={activeCategory ?? ''}
          onChange={e => setActiveCategory(e.target.value || null)}
          style={categorySelectStyle}
        >
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.slug}>{c.name_en}</option>
          ))}
        </select>
      )}

      {/* Count */}
      <div style={{
        fontSize: 12, color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-3)',
      }}>
        {loading
          ? 'Loading…'
          : totalCount === 0
            ? '0 generics'
            : `Showing ${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + generics.length} of ${totalCount}`}
        {query && ` for "${query}"`}
      </div>

      {/* Load error */}
      {loadError && (
        <ErrorBanner message={loadError} onDismiss={() => setLoadError(null)} />
      )}

      {/* Table */}
      {!loading && generics.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}>

          {/* Header row */}
          <div style={theadStyle}>
            <span style={thStyle}>Generic</span>
            <span style={{ ...thStyle, textAlign: 'center' }}>Forms</span>
            <span style={{ ...thStyle, textAlign: 'center' }}>Published</span>
            <span style={thStyle}>Actions</span>
          </div>

          {loading
            ? [1,2,3,4].map(i => <SkeletonRow key={i} />)
            : generics.map((g, idx) => {
                const isLast   = idx === generics.length - 1
                const isActing = actionId === g.id

                return (
                  <div
                    key={g.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0,1fr) 64px 90px 80px',
                      alignItems: 'center',
                      padding: 'var(--space-3) var(--space-4)',
                      gap: 'var(--space-3)',
                      borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)',
                      opacity: isActing ? 0.5 : 1,
                      transition: 'opacity 0.15s ease',
                      backgroundColor: g.is_published ? 'transparent' : 'var(--color-bg)',
                    }}
                  >
                    {/* Name + meta */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span
                          title={g.name_en}
                          style={{
                            fontSize: 14, fontWeight: 600,
                            color: g.is_published ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                            minWidth: 0, flex: '1 1 auto',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {g.name_en}
                        </span>
                        {!g.is_published && (
                          <span style={{ ...draftBadgeStyle, flexShrink: 0 }}>Draft</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                        {g.category && (
                          <span style={catChipStyle}>{g.category}</span>
                        )}
                        {g.name_ar && (
                          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', direction: 'rtl' }}>
                            {g.name_ar}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                          {formatDate(g.updated_at)}
                        </span>
                      </div>
                    </div>

                    {/* Formulation count — click to open DrugEditor */}
                    <div style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => navigate(`/admin/drugs/generic/${g.id}`)}
                        title="Edit formulations & brands"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 13, fontWeight: 500,
                          color: 'var(--color-accent)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '2px 4px', borderRadius: 'var(--radius-sm)',
                          fontFamily: 'var(--font-body)',
                          textDecoration: 'underline', textUnderlineOffset: 2,
                        }}
                      >
                        <Layers size={12} />
                        {g.formulationCount}
                      </button>
                    </div>

                    {/* Publish toggle */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button
                        onClick={() => !isActing && handlePublishToggle(g)}
                        disabled={isActing}
                        aria-label={g.is_published ? 'Unpublish' : 'Publish'}
                        title={g.is_published ? 'Click to unpublish' : 'Click to publish'}
                        style={{
                          ...toggleBtnStyle,
                          backgroundColor: g.is_published ? '#D1FAE5' : 'var(--color-bg)',
                          color: g.is_published ? '#065F46' : 'var(--color-text-tertiary)',
                          border: `1px solid ${g.is_published ? '#6EE7B7' : 'var(--color-border)'}`,
                        }}
                      >
                        {g.is_published ? '● Live' : '○ Draft'}
                      </button>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => navigate(`/admin/drugs/generic/${g.id}`)}
                        aria-label="Edit"
                        title="Edit generic, formulations & brands"
                        style={iconBtnStyle}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDel(g)}
                        aria-label="Delete"
                        title="Delete"
                        style={{ ...iconBtnStyle, color: '#DC2626' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })
          }
        </div>
      )}

      {/* Pager */}
      {!loading && totalCount > PAGE_SIZE && (
        <div style={pagerStyle}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ ...pagerBtnStyle, opacity: page === 0 ? 0.4 : 1, cursor: page === 0 ? 'default' : 'pointer' }}
          >
            ‹ Prev
          </button>
          <span style={pagerLabelStyle}>
            Page {page + 1} of {Math.ceil(totalCount / PAGE_SIZE)}
          </span>
          <button
            onClick={() => setPage(p => (p + 1) * PAGE_SIZE < totalCount ? p + 1 : p)}
            disabled={(page + 1) * PAGE_SIZE >= totalCount}
            style={{
              ...pagerBtnStyle,
              opacity: (page + 1) * PAGE_SIZE >= totalCount ? 0.4 : 1,
              cursor: (page + 1) * PAGE_SIZE >= totalCount ? 'default' : 'pointer',
            }}
          >
            Next ›
          </button>
        </div>
      )}

      {/* Confirm unpublish */}
      {confirmUnpub && (
        <ConfirmModal
          isOpen
          title="Unpublish generic?"
          message={`"${confirmUnpub.name_en}" will be hidden from the app. You can republish it at any time.`}
          confirmLabel="Unpublish"
          danger
          onConfirm={confirmUnpublish}
          onCancel={() => setConfirmUnpub(null)}
        />
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <ConfirmModal
          isOpen
          title="Delete generic?"
          message={`Delete "${confirmDel.name_en}"? This will also delete all formulations and brands under it. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

    </AdminShell>
  )
}

// ─── AdminShell ───────────────────────────────────────────────────────────────

function AdminShell({ children, onAdd }) {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>
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
              display: 'flex', alignItems: 'center',
            }}
          >
            ‹ Admin
          </button>
          <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Drug Library
          </span>
        </div>

        <button onClick={onAdd} style={primaryBtnStyle}>
          <Plus size={15} />
          Add Generic
        </button>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-5) var(--space-4) var(--space-12)' }}>
        {children}
      </main>
    </div>
  )
}

// ─── Small components ─────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
      backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
      borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
      marginBottom: 'var(--space-3)', fontSize: 13, color: '#DC2626',
    }}>
      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
      {message}
      <button onClick={onDismiss} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>
        <X size={14} />
      </button>
    </div>
  )
}

function EmptyState({ query }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
      <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}>
        <Search size={32} />
      </div>
      <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
        No generics found{query ? ` for "${query}"` : ''}
      </div>
      <div style={{ fontSize: 13 }}>Try a different search or category filter</div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div style={{
      height: 56,
      borderBottom: '1px solid var(--color-border-subtle)',
      backgroundColor: 'var(--color-surface)',
      animation: 'shimmer 1.4s ease-in-out infinite',
    }} />
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const theadStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0,1fr) 64px 90px 80px',
  gap: 'var(--space-3)',
  padding: 'var(--space-2) var(--space-4)',
  backgroundColor: 'var(--color-bg)',
  borderBottom: '1px solid var(--color-border)',
}

const thStyle = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-text-tertiary)',
}

const catChipStyle = {
  fontSize: 10, fontWeight: 500,
  textTransform: 'uppercase', letterSpacing: '0.04em',
  color: 'var(--color-text-tertiary)',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-full)',
  padding: '1px 7px',
}

const draftBadgeStyle = {
  fontSize: 10, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  color: 'var(--color-text-tertiary)',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-full)',
  padding: '1px 7px',
}

const toggleBtnStyle = {
  padding: '3px 10px',
  borderRadius: 'var(--radius-full)',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s ease',
}

const iconBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
}

const primaryBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

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

const pagerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)',
  marginTop: 'var(--space-4)',
}

const pagerBtnStyle = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  fontSize: 13, fontWeight: 500,
  fontFamily: 'var(--font-body)',
}

const pagerLabelStyle = {
  fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)',
}

const categorySelectStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 'var(--space-2) var(--space-3)',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  color: 'var(--color-text-primary)',
  outline: 'none',
  boxShadow: 'var(--shadow-card)',
  marginBottom: 'var(--space-4)',
  cursor: 'pointer',
}

const clearBtnStyle = {
  position: 'absolute', right: 'var(--space-3)', top: '50%',
  transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--color-text-tertiary)',
  display: 'flex', alignItems: 'center', padding: 0,
}