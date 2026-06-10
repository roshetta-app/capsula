/**
 * src/pages/admin/ConditionsCMS.jsx
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, ChevronLeft } from 'lucide-react'
import { useConditionContext } from '../../context/ConditionContext'
import { useToast } from '../../context/ToastContext'
import { deleteCondition, toggleConditionPublished, fetchSpecialtiesForCMS } from '../../lib/adminQueries'
import { fetchAllConditions } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import ConfirmModal from '../../components/admin/ConfirmModal'
import { logAudit } from '../../utils/auditLogger'

// ─── Age group badge ──────────────────────────────────────────────────────────

const AGE_STYLES = {
  adult:     { bg: '#DBEAFE', color: '#1E40AF' },
  pediatric: { bg: '#D1FAE5', color: '#065F46' },
  both:      { bg: '#EDE9FE', color: '#5B21B6' },
}

function AgeGroupBadge({ group }) {
  const style = AGE_STYLES[group] ?? { bg: '#F3F4F6', color: '#374151' }
  const label = group === 'pediatric' ? 'Pediatric' : group === 'both' ? 'All ages' : 'Adult'
  return (
    <span style={{
      fontSize: 11, fontWeight: 500,
      backgroundColor: style.bg, color: style.color,
      padding: '2px 8px', borderRadius: 'var(--radius-full)',
      flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

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
      toast.error(err.message ?? 'Failed to load conditions')
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

  const filtered = conditions.filter(c => {
    const matchesSpecialty = activeSpecialty === 'all' || c.specialtyId === activeSpecialty
    const matchesQuery = !query.trim() || (
      c.name?.toLowerCase().includes(query.toLowerCase()) ||
      c.specialtyName?.toLowerCase().includes(query.toLowerCase())
    )
    return matchesSpecialty && matchesQuery
  })

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
      
      // Log Audit Trail
      await logAudit('delete', 'conditions', deleteTarget.id, deleteTarget.name, deleteTarget)

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
      
      // Log Audit Trail
      const action = next ? 'publish' : 'unpublish'
      await logAudit(action, 'conditions', condition.id, condition.name, { is_published: [current, next] })

      await refreshPublicCache()
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      fontFamily: 'var(--font-body)',
      color: 'var(--color-text-primary)',
    }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          maxWidth: 680, margin: '0 auto',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              onClick={() => navigate('/admin')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
                fontFamily: 'var(--font-body)', padding: '4px 0',
                display: 'flex', alignItems: 'center', gap: 2,
              }}
            >
              <ChevronLeft size={16} />
              Dashboard
            </button>
            <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Conditions
            </span>
          </div>

          <button
            onClick={() => navigate('/admin/conditions/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
              padding: '7px 14px', borderRadius: 'var(--radius-md)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: 'none', backgroundColor: 'var(--color-accent)', color: '#fff',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Plus size={15} />
            Add New
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-4) var(--space-4) var(--space-12)' }}>

        {/* Search */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <input
            type="search"
            placeholder="Search conditions…"
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

        {/* Specialty filter pills */}
        {specialties.length > 0 && (
          <div style={{
            display: 'flex', gap: 'var(--space-2)',
            overflowX: 'auto', paddingBottom: 'var(--space-2)',
            marginBottom: 'var(--space-4)', scrollbarWidth: 'none',
          }}>
            {['all', ...specialties.map(s => s.id)].map(id => {
              const isActive = activeSpecialty === id
              const label    = id === 'all' ? 'All' : specialties.find(s => s.id === id)?.name_en
              return (
                <button
                  key={id}
                  onClick={() => setActiveSpecialty(id)}
                  style={{
                    flexShrink: 0, padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    fontFamily: 'var(--font-body)', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isActive ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                    backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* Count */}
        <div style={{
          fontSize: 12, color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-3)',
        }}>
          {loadingList ? 'Loading…' : `${filtered.length} condition${filtered.length !== 1 ? 's' : ''}`}
        </div>

        {/* List */}
        {!loadingList && filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 'var(--space-12) var(--space-4)',
            color: 'var(--color-text-tertiary)', fontSize: 14,
          }}>
            {query ? `No conditions matching "${query}"` : 'No conditions yet. Click "Add New" to create one.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {filtered.map(condition => {
              const isPublished = publishedOverrides[condition.id] ?? condition.isPublished ?? true
              return (
                <ConditionRow
                  key={condition.id}
                  condition={condition}
                  isPublished={isPublished}
                  onEdit={() => navigate(`/admin/conditions/${condition.id}`)}
                  onDelete={() => setDeleteTarget(condition)}
                  onTogglePublished={() => handleTogglePublished(condition)}
                />
              )
            })}
          </div>
        )}
      </main>

      {/* Delete confirm modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete condition?"
        message={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.name}" including all its prescriptions and images. This cannot be undone.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
      />
    </div>
  )
}

// ─── Condition row ────────────────────────────────────────────────────────────

function ConditionRow({ condition, isPublished, onEdit, onDelete, onTogglePublished }) {
  const rxCount = condition.prescriptions?.length ?? 0

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: `1px solid ${isPublished ? 'var(--color-border)' : 'var(--color-border-subtle)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-3) var(--space-4)',
      boxShadow: 'var(--shadow-card)',
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      opacity: isPublished ? 1 : 0.65,
    }}>
      {/* Publish toggle dot */}
      <button
        onClick={onTogglePublished}
        title={isPublished ? 'Published — click to unpublish' : 'Draft — click to publish'}
        style={{
          flexShrink: 0,
          width: 10, height: 10,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: isPublished ? 'var(--color-success)' : 'var(--color-border)',
          cursor: 'pointer',
          padding: 0,
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-1)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        }}>
          {condition.name}
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
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {condition.specialtyName && (
            <span style={{
              fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase',
              color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: 'var(--radius-full)',
            }}>
              {condition.specialtyName}
            </span>
          )}
          <AgeGroupBadge group={condition.ageGroup} />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {rxCount} rx
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
        <button
          onClick={onEdit}
          aria-label="Edit condition"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          <Edit2 size={15} />
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete condition"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 'var(--radius-md)',
            border: '1px solid #FECACA',
            backgroundColor: '#FEF2F2', color: '#DC2626',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
