import { useMemo, useState } from 'react'
import { ArrowLeft, Search, X } from 'lucide-react'

export default function ManageStock({ drugs, stockMap, onToggle, onSetAll, onBack }) {
  const [searchQuery, setSearchQuery] = useState('')

  // Sort order is computed ONCE on mount (snapshot of stockMap at open time).
  // Toggling does NOT re-sort — the list stays stable while the panel is open.
  // Next time the panel opens, it re-mounts and re-sorts fresh.
  const sortedDrugs = useMemo(() => {
    const inStock = drugs
      .filter(d => stockMap[d.id])
      .sort((a, b) => a.genericName.localeCompare(b.genericName))
    const outStock = drugs
      .filter(d => !stockMap[d.id])
      .sort((a, b) => a.genericName.localeCompare(b.genericName))
    return [...inStock, ...outStock]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — freeze order at mount

  // Filter by search query
  const visibleDrugs = useMemo(() => {
    if (!searchQuery.trim()) return sortedDrugs
    const lower = searchQuery.toLowerCase()
    return sortedDrugs.filter(d =>
      d.genericName.toLowerCase().includes(lower) ||
      d.arabicName.includes(searchQuery) ||
      d.brandNames.some(b => b.toLowerCase().includes(lower))
    )
  }, [sortedDrugs, searchQuery])

  const visibleIds = visibleDrugs.map(d => d.id)
  const allVisibleInStock = visibleIds.length > 0 && visibleIds.every(id => stockMap[id])

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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-1)',
        }}>
          <h1 style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
            letterSpacing: '-0.3px',
          }}>
            Manage Stock
          </h1>

          {/* Select / Deselect All */}
          <button
            onClick={() => onSetAll(visibleIds, !allVisibleInStock)}
            disabled={visibleIds.length === 0}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
              cursor: visibleIds.length === 0 ? 'default' : 'pointer',
              border: '1px solid var(--color-border)',
              backgroundColor: allVisibleInStock
                ? 'var(--color-instock-bg)'
                : 'var(--color-surface)',
              color: allVisibleInStock
                ? 'var(--color-instock)'
                : 'var(--color-text-secondary)',
              transition: 'all 0.15s ease',
              opacity: visibleIds.length === 0 ? 0.4 : 1,
            }}
          >
            {allVisibleInStock ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div style={{
          fontSize: 13,
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {inStockCount} / {drugs.length} in stock
        </div>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 'var(--space-4)' }}>
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: 'var(--space-4)',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-tertiary)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search to select…"
          style={{
            width: '100%',
            padding: 'var(--space-3) var(--space-10) var(--space-3) var(--space-10)',
            fontSize: 14,
            fontFamily: 'var(--font-body)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--color-text-primary)',
            outline: 'none',
            boxSizing: 'border-box',
            boxShadow: 'var(--shadow-card)',
            transition: 'border-color 0.15s ease',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: 'var(--space-4)',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Drug rows */}
      {visibleDrugs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-10) var(--space-4)',
          color: 'var(--color-text-tertiary)',
          fontSize: 14,
        }}>
          No drugs match "{searchQuery}"
        </div>
      ) : (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}>
          {visibleDrugs.map((drug, index) => {
            const isInStock = stockMap[drug.id]
            const isLast = index === visibleDrugs.length - 1

            return (
              <div
                key={drug.id}
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
                  onClick={() => onToggle(drug.id, !isInStock)}
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
      )}
    </div>
  )
}
