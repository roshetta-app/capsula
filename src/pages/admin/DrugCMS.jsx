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
 * 2026-11-10 (CMS drug library search, same look as the app): the search bar and the
 * Brand / Generic chips are now the app's own (DrugSearchBar, ModeSegmentedControl) on the same
 * tinted block, and a generic is a flat GenericDrugCard row (the twin of SharedDrugCard) instead
 * of a table row, so Generic and Brand results look alike. Category filter, sort, Live / Draft,
 * edit and delete work as before. The old table column header is gone.
 *
 * 2026-11-10 (later): third chip, Class: class and family cards built from the generics' class and
 * subclass text (the app's own search and ClassSearchResults), opening the new /admin/drugs/class page.
 * The category dropdown moved into the filter icon in the search bar (DrugFilterSheet), which also
 * holds the new Form filter for Brand mode. Sort uses the same chips as the search modes.
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

import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Edit2, Trash2, Search, X, AlertTriangle, Tag, FlaskConical, Layers, ArrowDownAZ, TrendingUp } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useCategories } from '../../hooks/useCategories'
import { useIsDark } from '../../utils/specialtyIcon'
import ConfirmModal from '../../components/admin/ConfirmModal'
import SharedDrugCard from '../../components/SharedDrugCard'
import GenericDrugCard from '../../components/admin/GenericDrugCard'
import DrugSearchBar from '../../components/drugs/DrugSearchBar'
import ModeSegmentedControl from '../../components/drugs/home/ModeSegmentedControl'
import ClearFiltersButton from '../../components/drugs/home/ClearFiltersButton'
import ClassSearchResults from '../../components/drugs/classes/ClassSearchResults'
import DrugFilterSheet from '../../components/admin/DrugFilterSheet'
import { FORM_OPTIONS } from '../../components/drugs/DrugFilterPanel'
import { buildClassIndex, searchClassIndex } from '../../utils/classSearch'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import {
  fetchGenericsPage,
  toggleGenericPublished,
  deleteGeneric,
  searchBrandsForCMS,
  toggleBrandPublished,
  fetchClassIndexRows,
} from '../../lib/adminQueries'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

// Same three chips as the app's Drugs search.
const SEARCH_MODES = [
  { value: 'brand',   label: 'Brand',   icon: Tag },
  { value: 'generic', label: 'Generic', icon: FlaskConical },
  { value: 'class',   label: 'Class',   icon: Layers },
]

// Sort chips (Generic mode), drawn with the same chip look as the search modes.
const SORT_OPTIONS = [
  { value: 'name',   label: 'Alphabetical', icon: ArrowDownAZ },
  { value: 'common', label: 'Most Common',  icon: TrendingUp },
]

// The chosen Form chips turned into the raw form / route lists the query needs.
function formsToFilter(values) {
  const chosen = FORM_OPTIONS.filter(o => values.includes(o.value))
  const matches = [...new Set(chosen.flatMap(o => o.matches ?? []))]
  const routes  = [...new Set(chosen.flatMap(o => o.routes  ?? []))]
  return { matches, routes }
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
  const mode            = searchParams.get('mode') || 'generic' // 'generic' | 'brand' | 'class'
  const formsParam      = searchParams.get('forms') || ''
  const activeForms     = formsParam ? formsParam.split(',').filter(Boolean) : []
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

  // Filter pop-up (the icon inside the search bar) and Class mode's list of class / family rows.
  const [filterOpen, setFilterOpen] = useState(false)
  const [classRows,  setClassRows]  = useState(null)

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
    const t = setTimeout(() => setDebouncedQuery(query), 150)
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

    // Class mode builds its cards from classRows (loaded by its own effect below).
    if (mode === 'class') { setLoading(false); return }

    if (mode === 'brand') {
      const { data, count, error } = await searchBrandsForCMS(debouncedQuery, {
        limit: PAGE_SIZE,
        page,
        forms: activeForms.length > 0 ? formsToFilter(activeForms) : null,
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

  useEffect(() => { load() }, [debouncedQuery, activeCategory, sortBy, mode, page, formsParam])

  // Class mode: one slim list of { class, subclass } per generic, read when the mode is opened.
  useEffect(() => {
    if (mode !== 'class') return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    fetchClassIndexRows().then(({ data, error }) => {
      if (cancelled) return
      setLoading(false)
      if (error) { setLoadError(error.message); return }
      setClassRows(data)
    })
    return () => { cancelled = true }
  }, [mode])

  const classIndex = useMemo(() => (classRows ? buildClassIndex(classRows) : null), [classRows])
  const classResults = useMemo(() => {
    if (!classIndex) return { classes: [], subclasses: [] }
    if (debouncedQuery.trim().length >= 2) return searchClassIndex(classIndex, debouncedQuery)
    // No search text: browse every class, A to Z (families show once a class is opened).
    return {
      classes: [...classIndex.classes].sort((a, b) => a.name.localeCompare(b.name)),
      subclasses: [],
    }
  }, [classIndex, debouncedQuery])

  const hasActiveFilter = mode === 'brand' ? activeForms.length > 0 : mode === 'generic' ? !!activeCategory : false
  function clearFilters() {
    updateSearchParams(mode === 'brand' ? { forms: null, page: 0 } : { category: null, page: 0 })
  }

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
    <AdminPageHeader
      title="Drug Library"
      actions={
        <button onClick={() => navigate('/admin/drugs/new')} style={primaryBtnStyle}>
          <Plus size={15} />
          Add Generic
        </button>
      }
    >
      {/* Search block — the app's own search bar and Brand / Generic / Class chips on the same
          tinted background. The filter icon inside the bar opens the Category filter (Generic
          mode) or the Form filter (Brand mode); Class mode has no filter. */}
      <div style={{
        backgroundColor: 'var(--color-header-tint)',
        borderRadius:    'var(--radius-lg)',
        padding:         'var(--space-4)',
        marginBottom:    'var(--space-3)',
      }}>
        <DrugSearchBar
          value={query}
          onChange={setQuery}
          placeholder={
            mode === 'brand' ? 'Search brand names…'
            : mode === 'class' ? 'Search classes and families…'
            : 'Search generic names…'
          }
          onFilter={() => setFilterOpen(true)}
          filterDisabled={mode === 'class'}
          hasActiveFilters={hasActiveFilter}
          tall
        />
        <div style={{ marginTop: 'var(--space-3)' }}>
          <ModeSegmentedControl
            options={SEARCH_MODES}
            mode={mode}
            onChange={m => updateSearchParams({ mode: m, page: 0 })}
          />
        </div>
      </div>

      {hasActiveFilter && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <ClearFiltersButton onClick={clearFilters} style={{ display: 'block', width: '100%' }} />
        </div>
      )}

      {/* Sort chips — generics only; "Most Common" counts a generic's brands,
          which doesn't map onto a list of brands or classes */}
      {mode === 'generic' && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <ModeSegmentedControl
            options={SORT_OPTIONS}
            mode={sortBy}
            onChange={v => updateSearchParams({ sort: v, page: 0 })}
          />
        </div>
      )}

      {/* Count (Class mode has its own count line inside its results) */}
      {mode !== 'class' && (
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
      )}

      {/* Load error */}
      {loadError && (
        <ErrorBanner message={loadError} onDismiss={() => setLoadError(null)} />
      )}

      {/* Results — Generic mode: the table below, unchanged. Brand mode
          (12.2): a flat SharedDrugCard list, no table header, since a brand
          row isn't a table row. */}
      {mode === 'class' ? (
        loading ? (
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {[1,2,3,4].map(i => <SkeletonRow key={i} height={56} />)}
          </div>
        ) : classResults.classes.length === 0 && classResults.subclasses.length === 0 ? (
          <EmptyState query={query} noun="classes" />
        ) : (
          <ClassSearchResults
            results={classResults}
            query={query}
            startExpanded
            onOpenClass={name => navigate(`/admin/drugs/class?class=${encodeURIComponent(name)}`)}
            onOpenSubclass={(className, name) =>
              navigate(`/admin/drugs/class?class=${encodeURIComponent(className)}&family=${encodeURIComponent(name)}`)}
          />
        )
      ) : !loading && (mode === 'brand' ? brands.length === 0 : generics.length === 0) ? (
        <EmptyState query={query} noun={mode === 'brand' ? 'brands' : 'generics'} />
      ) : (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
          padding: '0 var(--space-4)',
        }}>

          {loading ? (
            [1,2,3,4].map(i => <SkeletonRow key={i} height={64} />)
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
                onTap={() => navigate(`/admin/drugs/generic/${b.genericId}?formulation=${b.formulationId}&brand=${b.id}`)}
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
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/drugs/generic/${b.genericId}?formulation=${b.formulationId}&brand=${b.id}`) }}
                      className="cms-hide-phone"
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
              const isActing = actionId === g.id
              return (
                <GenericDrugCard
                  key={g.id}
                  generic={g}
                  categories={categories}
                  isDark={isDark}
                  isLast={idx === generics.length - 1}
                  highlight={query}
                  onTap={() => navigate(`/admin/drugs/generic/${g.id}`)}
                  trailing={
                    <div style={{
                      display: 'flex', gap: 'var(--space-1)', alignItems: 'center',
                      opacity: isActing ? 0.5 : 1,
                    }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); !isActing && handlePublishToggle(g) }}
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
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/drugs/generic/${g.id}`) }}
                        className="cms-hide-phone"
                      aria-label="Edit"
                        title="Edit generic, formulations & brands"
                        style={iconBtnStyle}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDel(g) }}
                        aria-label="Delete"
                        title="Delete"
                        style={{ ...iconBtnStyle, color: '#DC2626' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  }
                />
              )
            })
          )}
        </div>
      )}

      {/* Pager */}
      {mode !== 'class' && !loading && totalCount > PAGE_SIZE && (
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

      {/* Filter pop-up behind the search bar's filter icon */}
      <DrugFilterSheet
        isOpen={filterOpen && mode !== 'class'}
        onClose={() => setFilterOpen(false)}
        mode={mode}
        categories={categories}
        category={activeCategory}
        onCategory={slug => updateSearchParams({ category: slug, page: 0 })}
        forms={activeForms}
        onForms={values => updateSearchParams({ forms: values.join(','), page: 0 })}
      />

      {/* Confirm unpublish */}
      {confirmUnpub && (
        <ConfirmModal
          isOpen
          title="Unpublish generic?"
          message={`"${confirmUnpub.name_en}" will be hidden from the app. You can republish it at any time.`}
          confirmLabel="Unpublish"
          confirmVariant="danger"
          onConfirm={confirmUnpublish}
          onClose={() => setConfirmUnpub(null)}
        />
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <ConfirmModal
          isOpen
          title="Delete generic?"
          message={`Delete "${confirmDel.name_en}"? This will also delete all formulations and brands under it. This cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onClose={() => setConfirmDel(null)}
        />
      )}

      {/* Confirm unpublish (brand, 12.3) */}
      {confirmUnpubBrand && (
        <ConfirmModal
          isOpen
          title="Unpublish brand?"
          message="This brand will be hidden from the app. You can republish it at any time."
          confirmLabel="Unpublish"
          confirmVariant="danger"
          onConfirm={confirmUnpublishBrand}
          onClose={() => setConfirmUnpubBrand(null)}
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
          confirmVariant="danger"
          onConfirm={handleDeleteBrand}
          onClose={() => setConfirmDelBrand(null)}
        />
      )}

    </AdminPageHeader>
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
  backgroundColor: 'var(--color-accent-solid)',
  color: '#fff',
  fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
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

