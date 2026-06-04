export default function StockToggle({ isInStock, onToggle }) {
  return (
    <div style={{
      display: 'flex',
      gap: 'var(--space-3)',
      alignItems: 'center',
    }}>
      <button
        onClick={() => onToggle(true)}
        style={{
          flex: 1,
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'var(--font-body)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          border: isInStock
            ? '1.5px solid var(--color-instock)'
            : '1.5px solid var(--color-border)',
          backgroundColor: isInStock
            ? 'var(--color-instock-bg)'
            : 'var(--color-surface)',
          color: isInStock
            ? 'var(--color-instock)'
            : 'var(--color-text-tertiary)',
        }}
      >
        ● In Stock
      </button>
      <button
        onClick={() => onToggle(false)}
        style={{
          flex: 1,
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'var(--font-body)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          border: !isInStock
            ? '1.5px solid var(--color-text-tertiary)'
            : '1.5px solid var(--color-border)',
          backgroundColor: !isInStock
            ? '#F3F4F6'
            : 'var(--color-surface)',
          color: !isInStock
            ? 'var(--color-text-primary)'
            : 'var(--color-text-tertiary)',
        }}
      >
        ○ Unavailable
      </button>
    </div>
  )
}