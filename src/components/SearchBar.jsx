import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder = 'Search drugs, brands, or Arabic name…' }) {
  return (
    <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
      <Search
        size={16}
        style={{
          position: 'absolute', left: 'var(--space-4)', top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--color-text-tertiary)', pointerEvents: 'none',
        }}
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: 'var(--space-3) var(--space-10) var(--space-3) var(--space-10)',
          fontSize: 15, fontFamily: 'var(--font-body)',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--color-text-primary)',
          outline: 'none', boxSizing: 'border-box',
          boxShadow: 'var(--shadow-card)', transition: 'border-color 0.15s ease',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: 'var(--space-4)', top: '50%',
            transform: 'translateY(-50%)', background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--color-text-tertiary)',
            display: 'flex', alignItems: 'center', padding: 0,
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
