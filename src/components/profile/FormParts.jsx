/**
 * src/components/profile/FormParts.jsx
 * 2026-11-22 (step 14.7c-1): the form pieces of the old wizard (field wrapper, dropdown with search,
 * phone country-code sheet and the shared field styles), moved here unchanged so the one Edit
 * screen can use them. The old wizard file was deleted in 14.7c-2.
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { COUNTRIES } from '../../utils/profileOptions'
import { pillInputStyle, pillInputFocusStyle, pillInputErrorStyle } from './formStyles'

// ─── Field wrapper ───────────────────────────────────────────────────────────

export function WizardField({ label, icon, last, error, children }) {
  return (
    <div style={{ marginBottom: last ? 0 : 'var(--space-3)' }}>
      <label style={{
        display:      'flex',
        alignItems:   'center',
        gap:          6,
        fontSize:     13,
        fontWeight:   500,
        color:        error ? '#DC2626' : 'var(--color-text-secondary)',
        marginBottom: 'var(--space-2)',
      }}>
        {icon}
        {label}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6, lineHeight: 1.4 }}>
          {error}
        </div>
      )}
    </div>
  )
}

// ─── Pill dropdown, with an optional search box for long lists ─────────────

export function WizardDropdown({ value, onChange, options, placeholder = 'Select…', disabled = false, error = false }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const containerRef      = useRef(null)
  const searchRef         = useRef(null)

  // Normalize to { value, label } — plain strings map to themselves.
  const normalized = useMemo(
    () => options.map(o => (typeof o === 'string' ? { value: o, label: o } : o)),
    [options]
  )
  const searchable = normalized.length > 8

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return normalized
    const q = query.trim().toLowerCase()
    return normalized.filter(o => o.label.toLowerCase().includes(q))
  }, [normalized, query, searchable])

  const selected = normalized.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus()
    if (!open) setQuery('')
  }, [open, searchable])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{
          ...pillInputStyle,
          ...(open ? pillInputFocusStyle : {}),
          ...(error && !open ? pillInputErrorStyle : {}),
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          cursor:         disabled ? 'not-allowed' : 'pointer',
          opacity:        disabled ? 0.6 : 1,
          textAlign:      'left',
        }}
      >
        <span style={{ color: selected ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.8}
          color="var(--color-text-secondary)"
          style={{
            transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--motion-fast) var(--ease-settle)',
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div style={{
          position:        'absolute',
          top:             'calc(100% + 6px)',
          left:            0,
          right:           0,
          zIndex:          100,
          backgroundColor: 'var(--color-surface)',
          border:          '1px solid var(--color-border)',
          borderRadius:    'var(--radius-md)',
          boxShadow:       '0 4px 16px rgba(0,0,0,0.10)',
          overflow:        'hidden',
        }}>
          {searchable && (
            <div style={{
              display:      'flex',
              alignItems:   'center',
              gap:          'var(--space-2)',
              padding:      'var(--space-2) var(--space-3)',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <Search size={14} strokeWidth={1.8} color="var(--color-text-tertiary)" />
              <input
                ref={searchRef}
                type="text"
                dir="auto"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search…"
                style={{
                  flex:       1,
                  border:     'none',
                  outline:    'none',
                  background: 'none',
                  fontSize:   14,
                  fontFamily: 'var(--font-body)',
                  color:      'var(--color-text-primary)',
                }}
              />
            </div>
          )}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{
                padding:  '10px 12px',
                fontSize: 14,
                color:    'var(--color-text-tertiary)',
              }}>
                No matches
              </div>
            )}
            {filtered.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false) }}
                style={{
                  width:      '100%',
                  textAlign:  'left',
                  padding:    '10px 12px',
                  border:     'none',
                  background: option.value === value ? 'var(--color-bg)' : 'none',
                  fontSize:   14,
                  fontFamily: 'var(--font-body)',
                  color:      'var(--color-text-primary)',
                  cursor:     'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = option.value === value ? 'var(--color-bg)' : 'transparent' }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Phone country-code picker — full-width bottom sheet ───────────────────
//
// Previously this was just another WizardDropdown squeezed into the Phone
// row's 42%-wide code column. With 150+ countries and a search box, that
// popover had nowhere to render but overlapping/clipped at the screen edge.
// Sheet shell (backdrop fade, slide-up transform, shouldRender/animateIn
// mount timing, Escape key, body-scroll lock) copied from the same
// convention already used by SpecialtiesBottomSheet.jsx and
// PregnancyCategoryBottomSheet.jsx — no new sheet mechanism introduced.
// Search box lives in the fixed header (unlike those two sheets, which have
// no search) since this list is far longer than either of theirs.

export function PhoneCodeSheet({ value, onSelect, onClose, isOpen }) {
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)
  const [query,        setQuery]        = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
    } else {
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 280)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) searchRef.current?.focus()
    else setQuery('')
  }, [isOpen])

  if (!shouldRender) return null

  const filtered = query.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        c.dial.includes(query.trim())
      )
    : COUNTRIES

  function handleSelect(dial) {
    onSelect(dial)
    onClose()
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          200,
          backgroundColor: 'rgba(0,0,0,0.35)',
          opacity:         animateIn ? 1 : 0,
          transition:      'opacity var(--motion-base) var(--ease-reveal)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select country code"
        style={{
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          zIndex:          201,
          backgroundColor: 'var(--color-surface)',
          borderRadius:    '16px 16px 0 0',
          display:         'flex',
          flexDirection:   'column',
          maxHeight:       '70dvh',
          paddingBottom:   'env(safe-area-inset-bottom)',
          transform:       animateIn ? 'translateY(0)' : 'translateY(100%)',
          transition:      'transform var(--motion-screen) var(--ease-settle)',
        }}
      >
        {/* Fixed header — drag handle, label, search. Does not scroll;
            only the country list below it does. */}
        <div style={{ flexShrink: 0, padding: 'var(--space-5) var(--space-4) var(--space-3)' }}>
          <div style={{
            width:           40,
            height:          4,
            borderRadius:    2,
            backgroundColor: 'var(--color-border)',
            margin:          '0 auto var(--space-4)',
          }} />
          <div style={{
            fontSize:     13,
            fontWeight:   500,
            color:        'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 'var(--space-3)',
          }}>
            Select country code
          </div>
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          'var(--space-2)',
            padding:      '10px var(--space-3)',
            border:       '1px solid var(--color-border)',
            borderRadius: 999,
          }}>
            <Search size={16} strokeWidth={1.8} color="var(--color-text-tertiary)" />
            <input
              ref={searchRef}
              type="text"
              dir="auto"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search country or code…"
              style={{
                flex:       1,
                border:     'none',
                outline:    'none',
                background: 'none',
                fontSize:   15,
                fontFamily: 'var(--font-body)',
                color:      'var(--color-text-primary)',
              }}
            />
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{
          flex:      1,
          overflowY: 'auto',
          padding:   '0 var(--space-4) var(--space-6)',
        }}>
          {filtered.length === 0 && (
            <div style={{
              padding:  'var(--space-4) 0',
              fontSize: 14,
              color:    'var(--color-text-tertiary)',
              textAlign: 'center',
            }}>
              No matches
            </div>
          )}
          {filtered.map(c => (
            <button
              key={c.name}
              type="button"
              onClick={() => handleSelect(c.dial)}
              style={{
                width:           '100%',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'space-between',
                textAlign:       'left',
                padding:         '12px 14px',
                marginBottom:    2,
                borderRadius:    'var(--radius-md)',
                border:          'none',
                background:      c.dial === value ? 'var(--color-bg)' : 'none',
                fontSize:        15,
                fontFamily:      'var(--font-body)',
                fontWeight:      c.dial === value ? 600 : 400,
                color:           'var(--color-text-primary)',
                cursor:          'pointer',
              }}
            >
              <span>{c.name}</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{c.dial}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// phone-entry-standardization: maps each dial code in COUNTRIES to its
// ISO 3166-1 alpha-2 code, verified directly against libphonenumber-js's
// own metadata (see matched_countries.json generation) rather than typed
// by hand. Two dial codes are shared by more than one country in this
// list (+1: US/Canada, +7: Russia/Kazakhstan); for those, defaulting to
// the same country libphonenumber-js itself picks when a region is
// ambiguous (US, Russia) — the same fallback every phone-input library
// in this situation uses, since the stored value is the dial code alone.

// ─── Plain text input and textarea in the same pill style ───────────────────

export function PillInput({ error = false, multiline = false, style, onFocus, onBlur, ...rest }) {
  const [focus, setFocus] = useState(false)
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <Tag
      {...rest}
      onFocus={(e) => { setFocus(true); onFocus?.(e) }}
      onBlur={(e) => { setFocus(false); onBlur?.(e) }}
      style={{
        ...pillInputStyle,
        ...(focus ? pillInputFocusStyle : (error ? pillInputErrorStyle : {})),
        ...(multiline ? { resize: 'none' } : {}),
        ...style,
      }}
    />
  )
}
