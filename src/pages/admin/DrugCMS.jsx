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
 *   - Search (name_en) + category filter, both querying the live
 *     database directly (debounced, capped at 50 rows) — never a client-side
 *     re-filter of a preloaded list. Category options come from the real
 *     drug_categories table via useCategories, shown as a full-width dropdown.
 *
 * 12.2 (decisions 27-28): added a Generic/Brand mode toggle, styled like the
 * existing Alphabetical/Most Common sort toggle. Generic mode is the table
 * above, completely unchanged. Brand mode searches brands.tradename_clean
 * (searchBrandsForCMS, 12.1/12.2) instead of generics.name_en, and renders
 * its own flat-row result list built on the shared SharedDrugCard (the same
 * row component the consumer app's Drugs screen already uses) rather than
 * the generic table — a brand row shows the brand name plus its real
 * composition underneath, so one brand name that spans several different
 * medicines (e.g. Panadol) still shows each as its own clear row. Category
 * filter and the Alphabetical/Most Common sort are hidden in Brand mode —
 * neither maps onto a list of brands. Brand mode's edit action navigates to
 * the right generic's editor now; auto-expanding the right formulation and
 * highlighting the specific brand is 12.4.
 *
 * 12.3 (decision 28): brand rows now get full parity with a generic row —
 * publish/draft toggle and delete added alongside Edit in the trailing
 * slot. Publish is immediate; unpublish opens ConfirmModal first, same as
 * the generic table. "Delete" is a soft retire (toggleBrandPublished(id,
 * false)) behind that same ConfirmModal pattern, never the hard
 * deleteBrand — every brand row here comes from searchBrandsForCMS, so its
 * identity is always the brand itself.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Edit2, Trash2, Search, X, AlertTriangle, Layers } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useCategories } from '../../hooks/useCategories'
import { useIsDark } from '../../utils/specialtyIcon'
import ConfirmModal from '../../components/admin/ConfirmModal'
import SharedDrugCard from '../../components/SharedDrugCard'
import {
  fetchGenericsPage,
  toggleGenericPublished,
  deleteGeneric,
  searchBrandsForCMS,
  toggleBrandPublished,
} from '../../lib/adminQueries'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DrugCMS() {
  const navigate      = useNavigate()
  const { toast }     = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [generics,     setGenerics]     = useState([])
  const [brands,       setBrands]       = useState([])
  const [totalCount,   setTotalCount]   = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(null)

  const [query,           setQuery]           = useState('')
  const [debouncedQuery,  setDebouncedQuery]  = useState('')

  // Category, sort, mode, and page live in the URL — not component state —
  // so they survive a refresh and restore correctly on browser back/forward
  // after opening a generic. A brand-new session (no params in the URL yet)
  // falls through to sort='common' / mode='generic' by default, per request.
  const activeCategory = searchParams.get('category') || null
  const sortBy         = searchParams.get('sort') || 'common' // 'name' | 'common'
  const mode            = searchParams.get('mode') || 'generic' // 'generic' | 'brand'
  const page            = Number(searchParams.get('page') || '0')

  const isDark = useIsDark()

  function updateSearchParams(patch) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') next.delete(key)
        else next.set(key, String(value))
      })
      return next
    }, { replace: true })
  }

  const [confirmUnpub, setConfirmUnpub] = useState(null)
  const [confirmDel,   setConfirmDel]   = useState(null)
  const [actionId,     setActionId]     = useState(null)

  // 12.3 (decision 28) — brand row actions, kept separate from the generic
  // row's own confirm/action state above so the two lists never collide.
  const [confirmUnpubBrand, setConfirmUnpubBrand] = useState(null)
  const [confirmDelBrand,   setConfirmDelBrand]   = useState(null)
  const [actionIdBrand,     setActionIdBrand]     = useState(null)

  // Real, admin-curated category list (drug_categories table), not scanned
  // from whatever text happens to be sitting on generics right now.
  const { categories } = useCategories()

  // ── Debounce search input — one query per pause-in-typing, not per keystroke ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // A new search, or switching Generic/Brand mode, always starts back at
  // page 1 — the old page number wouldn't mean anything against a different
  // result set. Skips the very first render so a deep-linked/persisted page
  // number isn't immediately wiped.
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    updateSearchParams({ page: 0 })
  }, [debouncedQuery, mode])

  // ── Load — always a real, filtered, sorted, paginated query against the live DB ──
  // Generic mode (unchanged): fetchGenericsPage, category + sort apply.
  // Brand mode (12.2): searchBrandsForCMS instead — category and sort don't
  // apply to a brand list (decision 27), so they're simply not passed.
  async function load() {
    setLoading(true)
    setLoadError(null)

    if (mode === 'brand') {
      const { data, count, error } = await searchBrandsForCMS(debouncedQuery, {
        limit: PAGE_SIZE,
        page,
      })
      setLoading(false)
      if (error) { setLoadError(error.message); return }
      setBrands(data)
      setTotalCount(count)
      return
    }

    const { data, count, error } = await fetchGenericsPage({
      query: debouncedQuery,
      category: activeCategory,
      sortBy,
      limit: PAGE_SIZE,
      page,
    })
    setLoading(false)
    if (error) { setLoadError(error.message); return }
    setGenerics(data)
    setTotalCount(count)
  }

  useEffect(() => { load() }, [debouncedQuery, activeCategory, sortBy, mode, page])

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

  // ── Brand row actions (12.3, decision 28) ────────────────────────────────────
  // Full parity with the generic row above: publish is immediate, unpublish
  // confirms first, "delete" is a soft retire (toggleBrandPublished(id, false)),
  // never the hard deleteBrand — every row here comes from searchBrandsForCMS,
  // so its identity is always the brand itself; toggleGenericPublished never
  // applies on this screen.
  async function handleBrandPublishToggle(brand) {
    const toPublish = !brand.isPublished
    if (!toPublish) {
      setConfirmUnpubBrand(brand)
      return
    }
    setActionIdBrand(brand.id)
    const { error } = await toggleBrandPublished(brand.id, true)
    setActionIdBrand(null)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, isPublished: true } : b))
    toast.success('Brand published')
  }

  async function confirmUnpublishBrand() {
    const b = confirmUnpubBrand
    setConfirmUnpubBrand(null)
    setActionIdBrand(b.id)
    const { error } = await toggleBrandPublished(b.id, false)
    setActionIdBrand(null)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    setBrands(prev => prev.map(x => x.id === b.id ? { ...x, isPublished: false } : x))
    toast.success('Brand unpublished')
  }

  async function handleDeleteBrand() {
    const b = confirmDelBrand
    setConfirmDelBrand(null)
    setActionIdBrand(b.id)
    const { error } = await toggleBrandPublished(b.id, false)
    setActionIdBrand(null)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    setBrands(prev => prev.map(x => x.id === b.id ? { ...x, isPublished: false } : x))
    toast.success('Brand retired')
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
          placeholder={mode === 'brand' ? 'Search brand name…' : 'Search generic name…'}
          style={searchInputStyle}
        />
        {query && (
          <button onClick={() => setQuery('')} style={clearBtnStyle}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Generic/Brand toggle (12.2, decision 27) — Brand mode is its own
          full results list on SharedDrugCard, not a few extra matches
          folded into the generic table below. */}
      <div style={sortToggleWrapStyle}>
        <button
          onClick={() => updateSearchParams({ mode: 'generic', page: 0 })}
          style={{ ...sortToggleBtnStyle, ...(mode === 'generic' ? sortToggleBtnActiveStyle : {}) }}
        >
          Generic
        </button>
        <button
          onClick={() => updateSearchParams({ mode: 'brand', page: 0 })}
          style={{ ...sortToggleBtnStyle, ...(mode === 'brand' ? sortToggleBtnActiveStyle : {}) }}
        >
          Brand
        </button>
      </div>

      {/* Category filter — generics only; a brand list has no category of its own */}
      {mode === 'generic' && categories.length > 0 && (
        <select
          value={activeCategory ?? ''}
          onChange={e => updateSearchParams({ category: e.target.value || null, page: 0 })}
          style={categorySelectStyle}
        >
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.slug}>{c.name_en}</option>
          ))}
        </select>
      )}

      {/* Sort toggle — generics only; "Most Common" counts a generic's
          brands, which doesn't map onto a list of brands */}
      {mode === 'generic' && (
        <div style={sortToggleWrapStyle}>
          <button
            onClick={() => updateSearchParams({ sort: 'name', page: 0 })}
            style={{ ...sortToggleBtnStyle, ...(sortBy === 'name' ? sortToggleBtnActiveStyle : {}) }}
          >
            Alphabetical
          </button>
          <button
            onClick={() => updateSearchParams({ sort: 'common', page: 0 })}
            style={{ ...sortToggleBtnStyle, ...(sortBy === 'common' ? sortToggleBtnActiveStyle : {}) }}
          >
            Most Common
          </button>
        </div>
      )}

      {/* Count */}
      <div style={{
        fontSize: 12, color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-3)',
      }}>
        {loading
          ? 'Loading…'
          : totalCount === 0
            ? `0 ${mode === 'brand' ? 'brands' : 'generics'}`
            : `Showing ${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + (mode === 'brand' ? brands.length : generics.length)} of ${totalCount}`}
        {query && ` for "${query}"`}
      </div>

      {/* Load error */}
      {loadError && (
        <ErrorBanner message={loadError} onDismiss={() => setLoadError(null)} />
      )}

      {/* Results — Generic mode: the table below, unchanged. Brand mode
          (12.2): a flat SharedDrugCard list, no table header, since a brand
          row isn't a table row. */}
      {!loading && (mode === 'brand' ? brands.length === 0 : generics.length === 0) ? (
        <EmptyState query={query} noun={mode === 'brand' ? 'brands' : 'generics'} />
      ) : (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}>

          {/* Header row — generic table only */}
          {mode === 'generic' && (
            <div style={theadStyle}>
              <span style={thStyle}>Generic</span>
              <span style={{ ...thStyle, textAlign: 'center' }}>Forms</span>
              <span style={{ ...thStyle, textAlign: 'center' }}>Published</span>
              <span style={thStyle}>Actions</span>
            </div>
          )}

          {loading ? (
            [1,2,3,4].map(i => <SkeletonRow key={i} height={mode === 'brand' ? 64 : 56} />)
          ) : mode === 'brand' ? (
            brands.map((b, idx) => (
              <SharedDrugCard
                key={b.id}
                drug={b}
                categories={categories}
                isDark={isDark}
                isLast={idx === brands.length - 1}
                highlight={query}
                searchMode="brand"
                onTap={() => navigate(`/admin/drugs/generic/${b.genericId}`)}
                trailing={
                  <div style={{
                    display: 'flex', gap: 'var(--space-1)', alignItems: 'center',
                    opacity: actionIdBrand === b.id ? 0.5 : 1,
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); actionIdBrand !== b.id && handleBrandPublishToggle(b) }}
                      disabled={actionIdBrand === b.id}
                      aria-label={b.isPublished ? 'Unpublish' : 'Publish'}
                      title={b.isPublished ? 'Click to unpublish' : 'Click to publish'}
                      style={{
                        ...toggleBtnStyle,
                        backgroundColor: b.isPublished ? '#D1FAE5' : 'var(--color-bg)',
                        color: b.isPublished ? '#065F46' : 'var(--color-text-tertiary)',
                        border: `1px solid ${b.isPublished ? '#6EE7B7' : 'var(--color-border)'}`,
                      }}
                    >
                      {b.isPublished ? '● Live' : '○ Draft'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/drugs/generic/${b.genericId}`) }}
                      aria-label="Edit"
                      title="Edit generic, formulations & brands"
                      style={iconBtnStyle}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelBrand(b) }}
                      aria-label="Delete"
                      title="Retire brand"
                      style={{ ...iconBtnStyle, color: '#DC2626' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                }
              />
            ))
          ) : (
            generics.map((g, idx) => {
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
          )}
        </div>
      )}

      {/* Pager */}
      {!loading && totalCount > PAGE_SIZE && (
        <div style={pagerStyle}>
          <button
            onClick={() => updateSearchParams({ page: Math.max(0, page - 1) })}
            disabled={page === 0}
            style={{ ...pagerBtnStyle, opacity: page === 0 ? 0.4 : 1, cursor: page === 0 ? 'default' : 'pointer' }}
          >
            ‹ Prev
          </button>
          <span style={pagerLabelStyle}>
            Page {page + 1} of {Math.ceil(totalCount / PAGE_SIZE)}
          </span>
          <button
            onClick={() => updateSearchParams({ page: (page + 1) * PAGE_SIZE < totalCount ? page + 1 : page })}
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

      {/* Confirm unpublish (brand, 12.3) */}
      {confirmUnpubBrand && (
        <ConfirmModal
          isOpen
          title="Unpublish brand?"
          message="This brand will be hidden from the app. You can republish it at any time."
          confirmLabel="Unpublish"
          danger
          onConfirm={confirmUnpublishBrand}
          onCancel={() => setConfirmUnpubBrand(null)}
        />
      )}

      {/* Confirm delete (brand, 12.3) — a soft retire (toggleBrandPublished),
          not the hard deleteBrand, per decision 28 / §10 Section 21 */}
      {confirmDelBrand && (
        <ConfirmModal
          isOpen
          title="Retire this brand?"
          message="This brand will be hidden from the app, the same as unpublishing it. You can bring it back at any time from the generic's editor."
          confirmLabel="Retire"
          danger
          onConfirm={handleDeleteBrand}
          onCancel={() => setConfirmDelBrand(null)}
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

function EmptyState({ query, noun = 'generics' }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
      <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}>
        <Search size={32} />
      </div>
      <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
        No {noun} found{query ? ` for "${query}"` : ''}
      </div>
      <div style={{ fontSize: 13 }}>Try a different search{noun === 'generics' ? ' or category filter' : ''}</div>
    </div>
  )
}

function SkeletonRow({ height = 56 }) {
  return (
    <div style={{
      height,
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

const sortToggleWrapStyle = {
  display: 'flex', gap: 'var(--space-2)',
  marginBottom: 'var(--space-3)',
}

const sortToggleBtnStyle = {
  flex: 1,
  padding: '6px 14px',
  borderRadius: 'var(--radius-full)',
  fontSize: 12,
  fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  border: '1.5px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  transition: 'all 0.15s ease',
}

const sortToggleBtnActiveStyle = {
  fontWeight: 600,
  border: '1.5px solid var(--color-accent)',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
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