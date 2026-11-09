/**
 * ClassCMS.jsx
 * /admin/drugs/class?class=<name>            one drug class
 * /admin/drugs/class?class=<name>&family=<n> one drug family (subclass) inside that class
 *
 * 2026-11-10 (CMS drug library, Class mode): the pages the Class and family cards of the Drug
 * Library search open. The names travel in the address as query text (not path parts) because a
 * class name can hold slashes.
 *
 *   Class page:  the drug families of the class as cards with their number of generics (tap one
 *                to open the family), then every generic of the class as flat rows.
 *   Family page: the generics of that family only.
 *
 * Generics are drawn with GenericDrugCard, the same row the Drug Library list uses; tapping one
 * opens its editor. Publishing and deleting stay in the Drug Library list and the editor. Classes
 * and families themselves are plain text on each generic (generics.class, generics.subclass), so
 * they are renamed in the generic's editor; this page only shows them.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Layers, AlertTriangle } from 'lucide-react'
import { useCategories } from '../../hooks/useCategories'
import { useIsDark } from '../../utils/specialtyIcon'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import GenericDrugCard from '../../components/admin/GenericDrugCard'
import ClassCard from '../../components/drugs/classes/ClassCard'
import { MoleculeIcon } from '../../components/drugs/classes/ClassIcons'
import { groupBySubclass } from '../../components/drugs/classes/classGrouping'
import { titleCaseWords } from '../../utils/classSearch'
import { fetchGenericsByClass } from '../../lib/adminQueries'

const listBoxStyle = {
  backgroundColor: 'var(--color-surface)',
  border:          '1px solid var(--color-border)',
  borderRadius:    'var(--radius-lg)',
  overflow:        'hidden',
  boxShadow:       'var(--shadow-card)',
  padding:         '0 var(--space-4)',
}

const groupLabelStyle = {
  margin:     'var(--space-4) 2px var(--space-2)',
  fontSize:   14.5,
  fontWeight: 600,
  color:      'var(--color-text-primary)',
}

export default function ClassCMS() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const className = searchParams.get('class') || ''
  const family    = searchParams.get('family') || ''

  const { categories } = useCategories()
  const isDark = useIsDark()

  const [generics, setGenerics] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    if (!className) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchGenericsByClass({ className, subclass: family || null }).then(({ data, error: err }) => {
      if (cancelled) return
      setLoading(false)
      if (err) { setError(err.message); return }
      setGenerics(data)
    })
    return () => { cancelled = true }
  }, [className, family])

  const classTitle = titleCaseWords(className)
  const families   = family ? [] : groupBySubclass(generics)

  function goBack() {
    if (family) navigate(`/admin/drugs/class?class=${encodeURIComponent(className)}`)
    else navigate('/admin/drugs?mode=class')
  }

  const title = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
      <button
        onClick={goBack}
        aria-label="Back"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, flexShrink: 0,
          background: 'none', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', cursor: 'pointer',
          color: 'var(--color-text-secondary)',
        }}
      >
        <ArrowLeft size={16} />
      </button>
      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{family ? titleCaseWords(family) : classTitle}</span>
    </span>
  )

  function genericRows() {
    return (
      <div style={listBoxStyle}>
        {generics.map((g, idx) => (
          <GenericDrugCard
            key={g.id}
            generic={g}
            categories={categories}
            isDark={isDark}
            isLast={idx === generics.length - 1}
            onTap={() => navigate(`/admin/drugs/generic/${g.id}`)}
          />
        ))}
      </div>
    )
  }

  return (
    <AdminPageHeader title={title}>
      {!className ? (
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>No class chosen. Open one from Drug Library, Class mode.</div>
      ) : (
        <>
          {family && (
            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)' }}>
              Drug family in {classTitle}
            </div>
          )}

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
              marginBottom: 'var(--space-3)', fontSize: 13, color: '#DC2626',
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>Loading…</div>
          ) : generics.length === 0 && !error ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
              No generics found{family ? ' in this family' : ' in this class'}
            </div>
          ) : (
            <>
              {!family && families.length > 0 && (
                <>
                  <div style={{ ...groupLabelStyle, marginTop: 0 }}>
                    {families.length} drug {families.length === 1 ? 'family' : 'families'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {families.map(f => (
                      <ClassCard
                        key={f.name}
                        name={titleCaseWords(f.name)}
                        count={f.items.length}
                        Icon={MoleculeIcon}
                        tone="accent"
                        onClick={() => navigate(`/admin/drugs/class?class=${encodeURIComponent(className)}&family=${encodeURIComponent(f.name)}`)}
                      />
                    ))}
                  </div>
                </>
              )}

              {!family && (
                <div style={{ ...groupLabelStyle, ...(families.length === 0 ? { marginTop: 0 } : {}), display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Layers size={15} aria-hidden="true" />
                  {generics.length} {generics.length === 1 ? 'generic' : 'generics'} in this class
                </div>
              )}
              {family && (
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-3)' }}>
                  {generics.length} {generics.length === 1 ? 'generic' : 'generics'}
                </div>
              )}

              {genericRows()}
            </>
          )}
        </>
      )}
    </AdminPageHeader>
  )
}
