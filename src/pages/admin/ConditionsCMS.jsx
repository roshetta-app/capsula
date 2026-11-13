/**
 * src/pages/admin/ConditionsCMS.jsx
 *
 * Changes from previous version:
 *  - "Add New" now navigates to /admin/conditions/new (ConditionEditor, create mode)
 *    instead of opening ConditionFormModal. This gives a single unified editor for
 *    both creating and editing conditions — no duplicate forms.
 *  - ConditionFormModal import removed entirely.
 *  - Specialties still fetched via fetchSpecialtiesForCMS() for the filter pills.
 *
 * 2026-11-10: the list now uses the same pieces as the app's Conditions screen:
 *  - the app's search (buildConditionIndex / searchConditions from searchUtils —
 *    same typo-tolerant, tiered matching; the app's useConditionSearch hook is not
 *    used because it also writes search analytics, which CMS typing must not),
 *  - the app's ConditionCard (icon, specialty, tagline, highlighted match),
 *  - the app's A–Z letter dividers and the app's "no results" state,
 *  - the app's specialty filter (SpecialtySelector + SpecialtiesBottomSheet), fed from
 *    the CMS specialty list so specialties with no conditions yet still show.
 *  CMS-only controls (publish dot, Draft tag, delete) sit in the card's trailing slot;
 *  tapping a card opens the editor.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useConditionContext } from '../../context/ConditionContext'
import { useToast } from '../../context/ToastContext'
import { deleteCondition, toggleConditionPublished, fetchSpecialtiesForCMS } from '../../lib/adminQueries'
import { fetchAllConditions } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import ConfirmModal from '../../components/admin/ConfirmModal'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import ConditionCard from '../../components/ConditionCard'
import ConditionsEmptyState from '../../components/conditions/ConditionsEmptyState'
import AlphabetSectionDivider from '../../components/conditions/AlphabetSectionDivider'
import SpecialtySelector from '../../components/conditions/SpecialtySelector'
import SpecialtiesBottomSheet from '../../components/conditions/SpecialtiesBottomSheet'
import { buildConditionIndex, searchConditions } from '../../utils/searchUtils'
import { alphabetGroup } from '../../utils/alphabetGroup'

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConditionsCMS() {
  const navigate = useNavigate()
  const { refresh: refreshPublicCache } = useConditionContext()
  const { toast } = useToast()

  // Specialties for filter pills — fetched directly so empty ones still appear
  const [specialties, setSpecialties] = useState([])
  useEffect(() => {
    fetchSpecialtiesForCMS().then(({ data }) => {
      if (data) setSpecialties(data)
    })
  }, [])

  // ── Admin condition list (all, including drafts) ───────────────────────────
  const [conditions,   setConditions]   = useState([])
  const [loadingList,  setLoadingList]  = useState(true)

  async function loadAll() {
    setLoadingList(true)
    try {
      const data = await fetchAllConditions(supabase)
      setConditions(data)
    } catch (err) {
      toast.error(err.message ?? 'Failed to load topics')
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [query,           setQuery]           = useState('')
  const [activeSpecialty, setActiveSpecialty] = useState('all')

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  // Optimistic publish overrides — { [conditionId]: boolean }
  const [publishedOverrides, setPublishedOverrides] = useState({})

  // ─── Filter ────────────────────────────────────────────────────────────────

  // Same search as the app: specialty first, then tiered search on that group.
  // No typed text = the whole group, A–Z. Typed text = best match first.
  const filtered = useMemo(() => {
    const pool = activeSpecialty === 'all'
      ? conditions
      : conditions.filter(c => c.specialtyId === activeSpecialty)
    const matched = searchConditions(buildConditionIndex(pool), pool, query) ?? pool
    return query.trim().length === 0
      ? [...matched].sort((a, b) => a.name.localeCompare(b.name))
      : matched
  }, [conditions, activeSpecialty, query])

  // CMS specialty rows reshaped into what the app's filter expects.
  const specialtyOptions = useMemo(() => specialties.map(sp => ({
    id:         sp.id,
    name:       sp.name_en,
    slug:       sp.slug,
    iconType:   sp.icon_type ?? 'lucide',
    iconValue:  sp.icon_type === 'custom' ? sp.icon_url : (sp.icon_name ?? 'Stethoscope'),
    colorToken: sp.color_token ?? null,
    sortOrder:  sp.sort_order,
  })), [specialties])
  const activeSpecialtyObj  = activeSpecialty === 'all'
    ? null
    : specialtyOptions.find(sp => sp.id === activeSpecialty) ?? null
  const activeSpecialtyName = activeSpecialtyObj?.name ?? ''
  const [sheetOpen, setSheetOpen] = useState(false)

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await deleteCondition(deleteTarget.id)
    setDeleting(false)
    if (error) {
      toast.error(error.message ?? 'Delete failed')
    } else {
      toast.success(`"${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
      await loadAll()
      await refreshPublicCache()
    }
  }

  // ─── Publish toggle ────────────────────────────────────────────────────────

  async function handleTogglePublished(condition) {
    const current = publishedOverrides[condition.id] ?? condition.isPublished ?? true
    const next    = !current
    setPublishedOverrides(prev => ({ ...prev, [condition.id]: next }))
    const { error } = await toggleConditionPublished(condition.id, next)
    if (error) {
      setPublishedOverrides(prev => ({ ...prev, [condition.id]: current }))
      toast.error('Failed to update publish status')
    } else {
      toast.success(next ? `"${condition.name}" published` : `"${condition.name}" unpublished`)
      await refreshPublicCache()
    }
  }

  function renderCard(condition, isLast) {
    const isPublished = publishedOverrides[condition.id] ?? condition.isPublished ?? true
    return (
      <div key={condition.id} style={{ opacity: isPublished ? 1 : 0.65 }}>
        <ConditionCard
          condition={condition}
          highlight={query}
          activeSpecialty={activeSpecialty}
          isLast={isLast}
          onTap={() => navigate(`/admin/conditions/${condition.id}`)}
          trailing={
            <CardControls
              isPublished={isPublished}
              onTogglePublished={() => handleTogglePublished(condition)}
              onDelete={() => setDeleteTarget(condition)}
            />
          }
        />
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminPageHeader
      title="Topics"
      actions={
        <button
          onClick={() => navigate('/admin/conditions/new')}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            padding: '7px 14px', borderRadius: 'var(--radius-md)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: 'none', backgroundColor: 'var(--color-accent-solid)', color: '#fff',
            fontFamily: 'var(--font-body)',
          }}
        >
          <Plus size={15} />
          Add New
        </button>
      }
    >
      {/* Search */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <input
            type="search"
            placeholder="Search topics…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 16px',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 15, fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {/* Specialty filter — the app's selector and bottom sheet */}
        {specialties.length > 0 && (
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <SpecialtySelector
              activeSpecialtyObj={activeSpecialtyObj}
              onOpen={() => setSheetOpen(true)}
              onClear={() => setActiveSpecialty('all')}
              isOpen={sheetOpen}
            />
          </div>
        )}

        {/* Count */}
        <div style={{
          fontSize: 12, color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-3)',
        }}>
          {loadingList ? 'Loading…' : `${filtered.length} topic${filtered.length !== 1 ? 's' : ''}`}
        </div>

        {/* List — app's cards, A–Z dividers when browsing, app's empty state */}
        {loadingList ? null : conditions.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 'var(--space-12) var(--space-4)',
            color: 'var(--color-text-tertiary)', fontSize: 14,
          }}>
            No topics yet. Click "Add New" to create one.
          </div>
        ) : filtered.length === 0 ? (
          <ConditionsEmptyState
            query={query}
            activeSpecialty={activeSpecialty}
            specialtyName={activeSpecialtyName}
            onClearSearch={() => setQuery('')}
            onClearFilter={() => setActiveSpecialty('all')}
          />
        ) : (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0 var(--space-4)',
            boxShadow: 'var(--shadow-card)',
          }}>
            {query.trim()
              ? filtered.map((condition, i) => renderCard(condition, i === filtered.length - 1))
              : alphabetGroup(filtered).map(({ letter, items }, gi, groups) => (
                  <div key={letter}>
                    <AlphabetSectionDivider letter={letter} />
                    {items.map((condition, i) =>
                      renderCard(condition, gi === groups.length - 1 && i === items.length - 1))}
                  </div>
                ))}
          </div>
        )}

      <SpecialtiesBottomSheet
        specialties={specialtyOptions}
        activeSpecialty={activeSpecialty}
        onSelect={setActiveSpecialty}
        onClose={() => setSheetOpen(false)}
        isOpen={sheetOpen}
        zIndex={600}
      />

      {/* Delete confirm modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete topic?"
        message={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.name}" including all its prescriptions and images. This cannot be undone.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
      />
    </AdminPageHeader>
  )
}

// ─── CMS controls on each card ────────────────────────────────────────────────
// Sits in the app card's trailing slot. Taps here must not open the editor.

function CardControls({ isPublished, onTogglePublished, onDelete }) {
  const stop = e => e.stopPropagation()
  return (
    <div
      onClick={stop}
      onPointerDown={stop}
      onKeyDown={stop}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
    >
      {!isPublished && (
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
          color: 'var(--color-text-tertiary)',
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          padding: '1px 6px', borderRadius: 'var(--radius-full)',
          textTransform: 'uppercase',
        }}>
          Draft
        </span>
      )}
      <button
        onClick={onTogglePublished}
        title={isPublished ? 'Published — click to unpublish' : 'Draft — click to publish'}
        aria-label={isPublished ? 'Published — unpublish' : 'Draft — publish'}
        className="cms-tap-expand"
        style={{
          flexShrink: 0, width: 10, height: 10, borderRadius: '50%',
          border: 'none', padding: 0, cursor: 'pointer',
          backgroundColor: isPublished ? 'var(--color-success)' : 'var(--color-border)',
        }}
      />
      <button
        onClick={onDelete}
        aria-label="Delete topic"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: 'var(--radius-md)',
          border: '1px solid #FECACA', backgroundColor: '#FEF2F2', color: '#DC2626',
          cursor: 'pointer',
        }}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
