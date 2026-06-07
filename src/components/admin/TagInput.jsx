import { useState } from 'react'
import { X, Plus } from 'lucide-react'

/**
 * TagInput — add/remove string tags (uses[], warnings[], history_questions[], etc.)
 *
 * Props:
 *   tags      string[]
 *   onChange  (tags: string[]) => void
 *   placeholder  string  (default "Type and press Enter")
 *   disabled  boolean
 */
export default function TagInput({ tags = [], onChange, placeholder = 'Type and press Enter…', disabled = false }) {
  const [input, setInput] = useState('')

  function commit() {
    const val = input.trim()
    if (!val || tags.includes(val)) {
      setInput('')
      return
    }
    onChange([...tags, val])
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
    // Backspace on empty input removes last tag
    if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  function remove(idx) {
    onChange(tags.filter((_, i) => i !== idx))
  }

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)',
      backgroundColor: disabled ? 'var(--color-bg)' : 'var(--color-surface)',
      padding: 'var(--space-2)',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-1)',
      minHeight: 40,
      cursor: disabled ? 'not-allowed' : 'text',
    }}
      onClick={() => !disabled && document.getElementById('tag-input-field')?.focus()}
    >
      {tags.map((tag, idx) => (
        <span
          key={idx}
          dir="auto"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            backgroundColor: 'var(--color-accent-light)',
            color: 'var(--color-accent)',
            border: '1px solid #BFDBFE',
            borderRadius: 'var(--radius-full)',
            padding: '2px 10px 2px 10px',
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            maxWidth: '100%',
            wordBreak: 'break-word',
          }}
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); remove(idx) }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, display: 'flex', alignItems: 'center',
                color: 'var(--color-accent)', opacity: 0.7,
                flexShrink: 0,
              }}
              aria-label={`Remove ${tag}`}
            >
              <X size={12} />
            </button>
          )}
        </span>
      ))}

      {!disabled && (
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 120, gap: 'var(--space-1)' }}>
          <input
            id="tag-input-field"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            placeholder={tags.length === 0 ? placeholder : ''}
            style={{
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-primary)',
              flex: 1,
              minWidth: 80,
              padding: '2px 4px',
            }}
          />
          {input.trim() && (
            <button
              type="button"
              onClick={commit}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent)', display: 'flex', alignItems: 'center', padding: 0,
              }}
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
