import { useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'

export default function ManageStock({ drugs, stockMap, onToggle, onBack }) {
  // Sort order is computed ONCE on mount (snapshot of stockMap at open time).
  // Toggling does NOT re-sort — the list stays stable while the panel is open.
  // Next time the panel opens, it re-mounts and re-sorts fresh.
  const sortedIds = useMemo(() => {
    const inStock = drugs
      .filter(d => stockMap[d.id])
      .sort((a, b) => a.genericName.localeCompare(b.genericName))
    const outStock = drugs
      .filter(d => !stockMap[d.id])
      .sort((a, b) => a.genericName.localeCompare(b.genericName))
    return [...inStock, ...outStock].map(d => d.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — freeze order at mount

  const drugById = useMemo(() => {
    const map = {}
    drugs.forEach(d => { map[d.id] = d })
    return map
  }, [drugs])

  const inStockCount = drugs.filter(d => stockMap[d.id]).length

  return (
    <div style={{
      backgroundColor: 'var(--color-bg)',
      minHeight: '100vh',
      paddingBottom: 'var(--space-12)',
    }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-accent)',
          fontSize: 14,
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          padding: 'var(--space-5) 0 var(--space-4)',
        }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Header */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          margin: '0 0 var(--space-1)',
          letterSpacing: '-0.3px',
        }}>
          Manage Stock
        </h1>
        <div style={{
          fontSize: 13,
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {inStockCount} / {drugs.length} in stock
        </div>
      </div>

      {/* Drug rows */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}>
        {sortedIds.map((id, index) => {
          const drug = drugById[id]
          if (!drug) return null
          const isInStock = stockMap[id]
          const isLast = index === sortedIds.length - 1

          return (
            <div
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)',
                gap: 'var(--space-3)',
                transition: 'background-color 0.1s ease',
                backgroundColor: isInStock ? 'var(--color-surface)' : 'var(--color-outstock-bg)',
              }}
            >
              {/* Drug info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: isInStock ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  lineHeight: 1.3,
                  marginBottom: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {drug.genericName}
                </div>
                {drug.brandNames?.length > 0 && (
                  <div style={{
                    fontSize: 12,
                    color: isInStock ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {drug.brandNames.join(' · ')}
                  </div>
                )}
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => onToggle(id, !isInStock)}
                aria-label={isInStock ? 'Mark unavailable' : 'Mark in stock'}
                style={{
                  flexShrink: 0,
                  width: 44,
                  height: 26,
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 3,
                  backgroundColor: isInStock ? 'var(--color-instock)' : 'var(--color-outstock)',
                  transition: 'background-color 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isInStock ? 'flex-end' : 'flex-start',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-light)'}
                onBlur={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s ease',
                }} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
