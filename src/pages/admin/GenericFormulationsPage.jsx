/**
 * GenericFormulationsPage — /admin/drugs/generic/:genericId
 *
 * Lists all formulations for a given generic.
 * Each row links to FormulationDetailEditor (/admin/drugs/:formulationId).
 * "+ Add Formulation" button links to AddDrugFlow (or a future AddFormulationFlow).
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Edit2, Layers } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function GenericFormulationsPage() {
  const { genericId } = useParams()
  const navigate      = useNavigate()

  const [genericName,   setGenericName]   = useState('')
  const [formulations,  setFormulations]  = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('formulations')
        .select(`
          id, concentration, form, route, is_published,
          generics ( id, name_en ),
          brands ( id )
        `)
        .eq('generic_id', genericId)
        .order('concentration')

      if (error) { setError(error.message); setLoading(false); return }

      if (data.length > 0) setGenericName(data[0].generics?.name_en ?? '')
      setFormulations(data)
      setLoading(false)
    }
    load()
  }, [genericId])

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>

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
            onClick={() => navigate('/admin/drugs')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
              fontFamily: 'var(--font-body)', padding: '4px 0',
              display: 'flex', alignItems: 'center', gap: 2,
            }}
          >
            <ChevronLeft size={16} />
            Drug Library
          </button>
          <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {genericName || 'Formulations'}
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: 'var(--space-5) var(--space-4) var(--space-12)' }}>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Layers size={16} style={{ color: 'var(--color-text-tertiary)' }} />
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {loading ? '…' : `${formulations.length} formulation${formulations.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
            fontSize: 13, color: '#DC2626', marginBottom: 'var(--space-4)',
          }}>
            {error}
          </div>
        )}

        {/* Formulation list */}
        {!loading && formulations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            No formulations yet for this generic.
          </div>
        ) : (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
          }}>
            {loading
              ? [1,2,3].map(i => (
                  <div key={i} style={{
                    height: 60,
                    borderBottom: '1px solid var(--color-border-subtle)',
                    animation: 'shimmer 1.4s ease-in-out infinite',
                  }} />
                ))
              : formulations.map((f, idx) => {
                  const isLast = idx === formulations.length - 1
                  return (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)',
                        backgroundColor: f.is_published ? 'transparent' : 'var(--color-bg)',
                        gap: 'var(--space-3)',
                      }}
                    >
                      {/* Left: concentration + form + route */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{
                            fontSize: 14, fontWeight: 600,
                            color: f.is_published ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                          }}>
                            {f.concentration}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 500,
                            color: 'var(--color-text-secondary)',
                            backgroundColor: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-full)',
                            padding: '1px 8px',
                            textTransform: 'capitalize',
                          }}>
                            {f.form}
                          </span>
                          {!f.is_published && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                              letterSpacing: '0.05em', color: 'var(--color-text-tertiary)',
                              backgroundColor: 'var(--color-bg)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-full)',
                              padding: '1px 7px',
                            }}>Draft</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                          {f.route} · {(f.brands ?? []).length} brand{(f.brands ?? []).length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Edit button → FormulationDetailEditor */}
                      <button
                        onClick={() => navigate(`/admin/drugs/${f.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                          padding: 'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text-secondary)',
                          fontSize: 13, fontWeight: 500,
                          fontFamily: 'var(--font-body)',
                          cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>
                    </div>
                  )
                })
            }
          </div>
        )}
      </main>
    </div>
  )
}
