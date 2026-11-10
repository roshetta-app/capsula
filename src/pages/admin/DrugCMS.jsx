/**
 * DrugCMS.jsx
 * /admin/drugs
 *
 * The Drug Library: find a generic, a brand or a class and manage it.
 *
 * 2026-11-10 (full search engine): the screen now runs the app's OWN search on the admin's
 * device, the same hook the Drugs screen uses (useDrugSearch), on a copy of the whole drug list
 * (useCmsDrugIndex: every brand, drafts included, plus one row for each generic that has no
 * brand yet). So it matches the app exactly: starts-with / word-starts / anywhere tiers,
 * strength and form typed in the text ('para 500 tab'), Arabic names, plurals, 'Did you mean',
 * the 'it matches in another mode' card, the class hint, and the 'your filter is hiding
 * these results' card. Search is not logged (logSearches: false), so the admin's searches are not
 * counted as real user searches.
 *
 *   Brand mode    one SharedDrugCard row per brand (the app's row), with Live / Draft, edit, retire.
 *   Generic mode  one GenericDrugCard row per generic (the generic twin of that row), with
 *                 Live / Draft, edit, delete. The engine ranks brand rows; they are folded into
 *                 their generics in the same order. With no text typed, the sort chips order
 *                 the whole list (Alphabetical / Most Common).
 *   Class mode    class and family cards (ClassSearchResults); with no text, every class A to Z.
 *                 A card opens /admin/drugs/class (ClassCMS.jsx).
 *
 * The filter icon in the search bar opens DrugFilterSheet: Category (Generic mode) or Form
 * (Brand mode), applied after the search like the app does, so the 'filter is hiding results'
 * card can say how many matches it hides. Mode, category, forms, sort and page live in the
 * address, so they survive a refresh and the browser Back button.
 *
 * Row actions keep the earlier rules: publish is immediate, unpublish asks first, a generic's
 * delete asks first and removes its formulations and brands, a brand's 'delete' is a soft retire
 * (toggleBrandPublished(id, false)), never the hard deleteBrand. After each one the in-memory
 * list is edited in place, so the screen changes at once without reloading 21,000 rows.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Edit2, Trash2, Search, X, AlertTriangle, Tag, FlaskConical, Layers, ArrowDownAZ, TrendingUp, RefreshCw } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useCategories } from '../../hooks/useCategories'
import { useClassKeywords } from '../../hooks/useClassKeywords'
import { useDrugSearch } from '../../hooks/useDrugSearch'
import { useCmsDrugIndex } from '../../hooks/useCmsDrugIndex'
import { useIsDark } from '../../utils/specialtyIcon'
import { buildClassIndex } from '../../utils/classSearch'
import ConfirmModal from '../../components/admin/ConfirmModal'
import SharedDrugCard from '../../components/SharedDrugCard'
import GenericDrugCard from '../../components/admin/GenericDrugCard'
import DrugFilterSheet from '../../components/admin/DrugFilterSheet'
import DrugSearchBar from '../../components/drugs/DrugSearchBar'
import ModeSegmentedControl from '../../components/drugs/home/ModeSegmentedControl'
import ClearFiltersButton from '../../components/drugs/home/ClearFiltersButton'
import ClassSearchResults from '../../components/drugs/classes/ClassSearchResults'
import {
  EmptyState as SearchEmptyState,
  ModeSwitchState,
  DidYouMeanState,
  FilterMaskedState,
  TooShortState,
  SearchSwitchingState,
  ClassHintStrip,
} from '../../components/drugs/search/SearchStates'
import { FORM_OPTIONS } from '../../components/drugs/DrugFilterPanel'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import {
  toggleGenericPublished,
  deleteGeneric,
  toggleBrandPublished,
} from '../../lib/adminQueries'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50
const NO_DRUGS = []

// Same three chips as the app's Drugs search.
const SEARCH_MODES = [
  { value: 'brand',   label: 'Brand',   icon: Tag },
  { value: 'generic', label: 'Generic', icon: FlaskConical },
  { value: 'class',   label: 'Class',   icon: Layers },
]

// Sort chips (Generic mode, nothing typed), drawn with the same chip look as the search modes.
const SORT_OPTIONS = [
  { value: 'name',   label: 'Alphabetical', icon: ArrowDownAZ },
  { value: 'common', label: 'Most Common',  icon: TrendingUp },
]

// The chosen Form chips turned into the raw form / route lists a row is checked against
// (the same rule the app's Form / Route filter uses: form in 'matches' OR route in 'routes').
function formsToFilter(values) {
  const chosen = FORM_OPTIONS.filter(o => values.includes(o.value))
  return {
    matches: new Set(chosen.flatMap(o => o.matches ?? [])),
    routes:  new Set(chosen.flatMap(o => o.routes  ?? [])),
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DrugCMS() {
  const navigate      = useNavigate()
  const { toast }     = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // Category, forms, sort, mode, and page live in the URL — not component state —
  // so they survive a refresh and restore correctly on browser back/forward
  // after opening a generic. A brand-new session (no params in the URL yet)
  // falls through to sort='common' / mode='generic' by default.
  const activeCategory = searchParams.get('category') || null
  const sortBy         = searchParams.get('sort') || 'common' // 'name' | 'common'
  const mode           = searchParams.get('mode') || 'generic' // 'generic' | 'brand' | 'class'
  const formsParam     = searchParams.get('forms') || ''
  const activeForms    = formsParam ? formsParam.split(',').filter(Boolean) : []
  const page           = Number(searchParams.get('page') || '0')

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

  const [filterOpen, setFilterOpen] = useState(false)

  const [confirmUnpub, setConfirmUnpub] = useState(null)
  const [confirmDel,   setConfirmDel]   = useState(null)
  const [actionId,     setActionId]     = useState(null)

  const [confirmUnpubBrand, setConfirmUnpubBrand] = useState(null)
  const [confirmDelBrand,   setConfirmDelBrand]   = useState(null)
  const [actionIdBrand,     setActionIdBrand]     = useState(null)

  const [dismissedError, setDismissedError] = useState(false)

  // Real, admin-curated category list (drug_categories table).
  const { categories } = useCategories()
  const { classKeywords } = useClassKeywords()

  // The whole drug list, and the app's search running on it.
  const index = useCmsDrugIndex()
  const drugs = index.drugs ?? NO_DRUGS
  const {
    query, setQuery, results, queryTooShort, suggestions, crossModeMatch,
    classResults, crossModeTargets, classHint, searchPending,
  } = useDrugSearch(drugs, mode, classKeywords, { logSearches: false })

  const trimmed  = query.trim()
  const hasQuery = trimmed.length > 0
  const typedSearch = hasQuery && !queryTooShort // a real search is showing, not the full list

  // A new search, a new mode or a new filter always starts back at page 1. Skips the very first
  // render so a deep-linked page number is not wiped.
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    updateSearchParams({ page: 0 })
  }, [query, mode, formsParam, activeCategory])

  // ── What the list shows ─────────────────────────────────────────────────────
  // 'matched' is the engine's answer before the filter; 'shown' is after it. Brand mode needs a
  // typed text or a Form filter to list anything (21,000 brands is not a browse list); Generic
  // mode with nothing typed lists every generic.
  const formFilter = mode === 'brand' && activeForms.length > 0 ? formsToFilter(activeForms) : null
  const hasActiveFilter = mode === 'brand' ? activeForms.length > 0 : mode === 'generic' ? !!activeCategory : false

  const { matched, shown } = useMemo(() => {
    if (index.drugs === null || mode === 'class') return { matched: [], shown: [] }

    if (mode === 'brand') {
      const base = (!hasQuery && !formFilter) ? [] : results.filter(d => !d.isGenericOnly)
      const kept = formFilter
        ? base.filter(d => formFilter.matches.has(String(d.form ?? '').toLowerCase()) || formFilter.routes.has(d.route))
        : base
      return { matched: base, shown: kept }
    }

    // Generic mode: fold the engine's brand rows into their generics, keeping the engine's order.
    const seen = new Set()
    const generics = []
    for (const d of results) {
      if (seen.has(d.genericId)) continue
      seen.add(d.genericId)
      const g = index.genericsById.get(d.genericId)
      if (g) generics.push(g)
    }
    if (!typedSearch) {
      generics.sort(sortBy === 'common'
        ? (a, b) => (b.brand_count ?? 0) - (a.brand_count ?? 0) || a.name_en.localeCompare(b.name_en)
        : (a, b) => a.name_en.localeCompare(b.name_en))
    }
    const kept = activeCategory ? generics.filter(g => g.category === activeCategory) : generics
    return { matched: generics, shown: kept }
  // 'index.version' changes when a row is edited in place, so the lists redraw.
  }, [index.drugs, index.genericsById, index.version, results, mode, hasQuery, typedSearch, formFilter, activeCategory, sortBy]) // eslint-disable-line react-hooks/exhaustive-deps

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const safePage  = Math.min(page, pageCount - 1)
  const pageItems = shown.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const isFilterMasked = typedSearch && shown.length === 0 && matched.length > 0

  // Class mode: with nothing typed, every class A to Z; with text, the engine's class cards.
  const classBrowse = useMemo(() => {
    if (mode !== 'class' || index.drugs === null) return null
    const idx = buildClassIndex(index.drugs)
    return { classes: [...idx.classes].sort((a, b) => a.name.localeCompare(b.name)), subclasses: [] }
  }, [mode, index.drugs])
  const classShown = hasQuery && !queryTooShort ? classResults : classBrowse
  // Right after a mode change the hook may still hold the other kind of answer for a moment.
  const classNotReady = mode === 'class' && hasQuery && !queryTooShort && classResults == null
  const driveNotReady = mode !== 'class' && hasQuery && !queryTooShort && classResults != null

  function clearFilters() {
    updateSearchParams(mode === 'brand' ? { forms: null, page: 0 } : { category: null, page: 0 })
  }
  function handleModeChange(m) { updateSearchParams({ mode: m, page: 0 }) }

  // ── Publish toggle (generic) ────────────────────────────────────────────────
  async function handlePublishToggle(generic) {
    if (generic.is_published) { setConfirmUnpub(generic); return }
    setActionId(generic.id)
    const { error } = await toggleGenericPublished(generic.id, true)
    setActionId(null)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    index.setGenericPublished(generic.id, true)
    toast.success('Generic published')
  }

  async function confirmUnpublish() {
    const g = confirmUnpub
    setConfirmUnpub(null)
    setActionId(g.id)
    const { error } = await toggleGenericPublished(g.id, false)
    setActionId(null)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    index.setGenericPublished(g.id, false)
    toast.success('Generic unpublished')
  }

  // ── Delete (generic) ────────────────────────────────────────────────────────
  async function handleDelete() {
    const g = confirmDel
    setConfirmDel(null)
    setActionId(g.id)
    const { error } = await deleteGeneric(g.id)
    setActionId(null)
    if (error) { toast.error(`Delete failed: ${error.message}`); return }
    index.removeGeneric(g.id)
    toast.success('Generic deleted')
  }

  // ── Brand row actions (12.3, decision 28) ────────────────────────────────────
  // Full parity with the generic row: publish is immediate, unpublish confirms first, "delete"
  // is a soft retire (toggleBrandPublished(id, false)), never the hard deleteBrand.
  async function handleBrandPublishToggle(brand) {
    if (brand.isPublished) { setConfirmUnpubBrand(brand); return }
    setActionIdBrand(brand.id)
    const { error } = await toggleBrandPublished(brand.id, true)
    setActionIdBrand(null)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    index.setBrandPublished(brand.id, true)
    toast.success('Brand published')
  }

  async function confirmUnpublishBrand() {
    const b = confirmUnpubBrand
    setConfirmUnpubBrand(null)
    setActionIdBrand(b.id)
    const { error } = await toggleBrandPublished(b.id, false)
    setActionIdBrand(null)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    index.setBrandPublished(b.id, false)
    toast.success('Brand unpublished')
  }

  async function handleDeleteBrand() {
    const b = confirmDelBrand
    setConfirmDelBrand(null)
    setActionIdBrand(b.id)
    const { error } = await toggleBrandPublished(b.id, false)
    setActionIdBrand(null)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    index.setBrandPublished(b.id, false)
    toast.success('Brand retired')
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const listBoxStyle = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-card)',
    padding: '0 var(--space-4)',
  }

  // What the results area draws.
  let body
  if (index.loading || (index.drugs === null && !index.error)) {
    const p = index.progress
    body = (
      <div style={listBoxStyle}>
        <div style={{ padding: 'var(--space-4) 0 var(--space-2)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Loading the drug list{p ? ` (${p.loaded} of ${p.total})` : '…'}
        </div>
        {p && (
          <div style={{ height: 4, borderRadius: 2, backgroundColor: 'var(--color-border-subtle)', marginBottom: 'var(--space-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((p.loaded / Math.max(1, p.total)) * 100)}%`, backgroundColor: 'var(--color-accent)', transition: 'width 0.2s ease' }} />
          </div>
        )}
        {[1,2,3,4].map(i => <SkeletonRow key={i} height={64} />)}
      </div>
    )
  } else if (index.drugs === null) {
    body = null // the load error banner above says what happened
  } else if (queryTooShort) {
    body = <TooShortState />
  } else if (mode === 'class') {
    if (classNotReady) {
      body = <SearchSwitchingState />
    } else if (classShown && (classShown.classes.length + classShown.subclasses.length) > 0) {
      body = (
        <ClassSearchResults
          results={classShown}
          query={typedSearch ? query : ''}
          startExpanded
          onOpenClass={name => navigate(`/admin/drugs/class?class=${encodeURIComponent(name)}`)}
          onOpenSubclass={(className, name) =>
            navigate(`/admin/drugs/class?class=${encodeURIComponent(className)}&family=${encodeURIComponent(name)}`)}
        />
      )
    } else if (crossModeTargets.length > 0) {
      body = <ModeSwitchState query={query} mode={mode} hint={null} targets={crossModeTargets} onSwitch={handleModeChange} />
    } else if (suggestions.length > 0) {
      body = <DidYouMeanState query={query} suggestions={suggestions} onSelect={setQuery} />
    } else {
      body = <SearchEmptyState query={query} mode={mode} onClear={() => setQuery('')} />
    }
  } else if (driveNotReady || (searchPending && hasQuery && shown.length === 0)) {
    body = <SearchSwitchingState />
  } else if (mode === 'brand' && !hasQuery && !formFilter) {
    body = (
      <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
        <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}><Search size={32} /></div>
        <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>Search for a brand</div>
        <div style={{ fontSize: 13 }}>Type a brand name, or use the filter icon to list brands by form</div>
      </div>
    )
  } else if (shown.length === 0) {
    if (isFilterMasked) {
      body = <FilterMaskedState count={matched.length} query={query} onClearFilter={clearFilters} />
    } else if (hasQuery && (classHint || crossModeMatch)) {
      body = (
        <ModeSwitchState
          query={query}
          mode={mode}
          hint={classHint}
          targets={[
            ...(classHint ? ['class'] : []),
            ...(crossModeMatch ? [mode === 'brand' ? 'generic' : 'brand'] : []),
          ]}
          onSwitch={handleModeChange}
        />
      )
    } else if (hasQuery && suggestions.length > 0) {
      body = <DidYouMeanState query={query} suggestions={suggestions} onSelect={setQuery} />
    } else {
      body = <SearchEmptyState query={query} mode={mode} onClear={() => setQuery('')} />
    }
  } else if (mode === 'brand') {
    body = (
      <div style={listBoxStyle}>
        {pageItems.map((b, idx) => (
          <SharedDrugCard
            key={b.id}
            drug={b}
            categories={categories}
            isDark={isDark}
            isLast={idx === pageItems.length - 1}
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
                  className="cms-hide-phone"
                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/drugs/generic/${b.genericId}?formulation=${b.formulationId}&brand=${b.id}`) }}
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
        ))}
      </div>
    )
  } else {
    body = (
      <div style={listBoxStyle}>
        {pageItems.map((g, idx) => {
          const isActing = actionId === g.id
          return (
            <GenericDrugCard
              key={g.id}
              generic={g}
              categories={categories}
              isDark={isDark}
              isLast={idx === pageItems.length - 1}
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
                    className="cms-hide-phone"
                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/drugs/generic/${g.id}`) }}
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
        })}
      </div>
    )
  }

  const showCount = mode !== 'class' && index.drugs !== null && shown.length > 0 && !queryTooShort
  const noun = mode === 'brand' ? 'brands' : 'generics'

  return (
    <AdminPageHeader
      title="Drug Library"
      actions={
        <>
          <button
            onClick={() => index.refresh()}
            disabled={index.loading || index.refreshing}
            aria-label="Reload the drug list"
            title="Reload the drug list from the database"
            style={{ ...iconBtnStyle, width: 34, height: 34 }}
          >
            <RefreshCw size={15} style={{ opacity: index.refreshing ? 0.4 : 1 }} />
          </button>
          <button onClick={() => navigate('/admin/drugs/new')} style={primaryBtnStyle}>
            <Plus size={15} />
            Add Generic
          </button>
        </>
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
          <ModeSegmentedControl options={SEARCH_MODES} mode={mode} onChange={handleModeChange} />
        </div>
      </div>

      {hasActiveFilter && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <ClearFiltersButton onClick={clearFilters} style={{ display: 'block', width: '100%' }} />
        </div>
      )}

      {/* Sort chips — Generic mode with nothing typed; a typed search keeps the engine's
          best-match-first order, and brands and classes have nothing to count */}
      {mode === 'generic' && !typedSearch && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <ModeSegmentedControl
            options={SORT_OPTIONS}
            mode={sortBy}
            onChange={v => updateSearchParams({ sort: v, page: 0 })}
          />
        </div>
      )}

      {/* The class hint: the typed text also names a class or drug family */}
      {typedSearch && mode !== 'class' && classHint && shown.length > 0 && (
        <ClassHintStrip hint={classHint} onSwitch={() => handleModeChange('class')} />
      )}

      {/* Count (Class mode has its own count line inside its results) */}
      {showCount && (
        <div style={{
          fontSize: 12, color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-3)',
        }}>
          {`Showing ${safePage * PAGE_SIZE + 1}–${safePage * PAGE_SIZE + pageItems.length} of ${shown.length} ${noun}`}
          {typedSearch && ` for "${query}"`}
        </div>
      )}

      {/* Load error */}
      {index.error && !dismissedError && (
        <ErrorBanner
          message={`${index.error}. `}
          onDismiss={() => setDismissedError(true)}
          onRetry={() => { setDismissedError(false); index.refresh() }}
        />
      )}

      {body}

      {/* Pager */}
      {mode !== 'class' && !queryTooShort && shown.length > PAGE_SIZE && (
        <div style={pagerStyle}>
          <button
            onClick={() => updateSearchParams({ page: Math.max(0, safePage - 1) })}
            disabled={safePage === 0}
            style={{ ...pagerBtnStyle, opacity: safePage === 0 ? 0.4 : 1, cursor: safePage === 0 ? 'default' : 'pointer' }}
          >
            ‹ Prev
          </button>
          <span style={pagerLabelStyle}>
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            onClick={() => updateSearchParams({ page: Math.min(pageCount - 1, safePage + 1) })}
            disabled={safePage >= pageCount - 1}
            style={{
              ...pagerBtnStyle,
              opacity: safePage >= pageCount - 1 ? 0.4 : 1,
              cursor: safePage >= pageCount - 1 ? 'default' : 'pointer',
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

function ErrorBanner({ message, onDismiss, onRetry }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
      backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
      borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
      marginBottom: 'var(--space-3)', fontSize: 13, color: '#DC2626',
    }}>
      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
      <span>{message}{onRetry && <button onClick={onRetry} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', textDecoration: 'underline', padding: 0, font: 'inherit' }}>Try again</button>}</span>
      <button onClick={onDismiss} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>
        <X size={14} />
      </button>
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

