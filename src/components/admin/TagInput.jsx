import { useState, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'

/**
 * TagInput — add/remove string tags (uses[], warnings[], history_questions[], etc.)
 *
 * Props:
 *   tags         string[]
 *   onChange     (tags: string[]) => void
 *   placeholder  string  (default "Type and press Enter")
 *   disabled     boolean
 *   suggestions  string[]  — optional list of existing values for autocomplete dropdown
 */
export default function TagInput({
  tags = [],
  onChange,
  placeholder = 'Type and press Enter…',
  disabled = false,
  suggestions = [],
}) {
  const [input, setInput]   = useState('')
  const [open, setOpen]     = useState(false)
  const containerRef        = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Filtered suggestions: match input, exclude already-selected tags
  const filtered = suggestions.filter(s =>
    !tags.includes(s) &&
    s.toLowerCase().includes(input.toLowerCase())
  )

  function commit(val) {
    const trimmed = (val ?? input).trim()
    setInput('')
    setOpen(false)
    if (!trimmed || tags.includes(trimmed)) return
    onChange([...tags, trimmed])
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
    if (e.key === 'Escape') setOpen(false)
    // Backspace on empty input removes last tag
    if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  function remove(idx) {
    onChange(tags.filter((_, i) => i !== idx))
  }

  const showDropdown = open && !disabled && filtered.length > 0

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        style={{
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
        onClick={() => {
          if (!disabled) {
            document.getElementById('tag-input-field')?.focus()
            if (suggestions.length > 0) setOpen(true)
          }
        }}
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
              onChange={e => {
                setInput(e.target.value)
                if (suggestions.length > 0) setOpen(true)
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                // Slight delay so suggestion click fires first
                setTimeout(() => {
                  commit()
                  setOpen(false)
                }, 150)
              }}
              onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
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
                onMouseDown={e => { e.preventDefault(); commit() }}
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

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          zIndex: 100,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          maxHeight: 200,
          overflowY: 'auto',
        }}>
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={e => { e.preventDefault(); commit(s) }}
              style={{
                width: '100%', textAlign: 'left',
                padding: '8px 12px',
                border: 'none', background: 'none',
                fontSize: 13, fontFamily: 'var(--font-body)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
