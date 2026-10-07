/**
 * src/components/ui/FilterModal.jsx
 * 2026-10-05 (Other generics): new optional 'otherGroup' ({ label, allLabel,
 * options }) and 'onPickGroup' ((values, on) => void). With them, the pop-up
 * ends its list with one row (label, number of brands, and how many are
 * picked) that unfolds the group's options inside the pop-up: an 'All ...'
 * option first, then each option on its own. It starts unfolded when one of
 * them is already picked. Only the Filter by generic pop-up passes them, so
 * every other pop-up is unchanged.
 *
 * 2026-10-04 (shared pop-up moved out of the Brands list): the small centered
 * pop-up (FilterModal) and the pieces only it uses (ScrollMenu,
 * ClearFilterButton, ToggleChip) moved here unchanged from BrandsList.jsx,
 * where they lived by mistake. The Drugs screen's Search Mode and Sort By
 * pop-ups, the Brands list filters on the drug page and the Search area all
 * use it from here now. Look and behaviour are exactly as before. The notes
 * below were written when it lived in the Brands list and are kept as they
 * were.
 */

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'
import { isOptionLocked } from '../drugs/brandsFilterLogic.js'
import { useBackLayer, useBackClose } from '../../hooks/useBackClose'
import CountTag from './CountTag.jsx'

// Small centered pop-up box for one filter — same look as the app's InfoSheet
// / ConfirmSheet dialogs, and the Drugs filter panel's chips inside it.
// Drawn inside the brands sheet (see header note): 'position: absolute'
// resolves against the sheet itself, covering it and centering the box in it.
// 'data-vaul-no-drag' keeps a swipe inside the box from dragging the sheet.
// Form / Medicine (onClear present) stay open while picking and finish with
// Done; Sort (pick-one) closes as soon as an option is chosen.
// 'large' (off by default, so every existing pop-up is unchanged) makes the
// option rows taller with bigger text and icons; the Search Mode pop-up uses it.
// An option may carry 'color' and 'tint' (theme variables): its icon then uses
// that colour, and when picked the row is tinted in it instead of solid accent.
export function FilterModal({ title, titleIcon: TitleIcon, scopeName, columns, wrap = false, single = false, lockAll = false, showCounts = true, listMaxHeight = 'min(320px, 45svh)', inertRow, otherGroup, onPickGroup, options, selected, allLabel, onAll, onPick, onClear, onClose, onPage = false, large = false }) {
  const [shown, setShown] = useState(false)
  // 'Other generics' row: unfolded from the start when something in it is picked.
  const [otherOpen, setOtherOpen] = useState(
    () => !!otherGroup && otherGroup.options.some(o => selected.includes(o.value))
  )
  const hasSelection = selected.length > 0
  // Inside a sheet: phone/browser Back closes just this pop-up and leaves the
  // sheet open. No history step of its own (see useBackLayer in
  // useBackClose.js).
  useBackLayer(!onPage, onClose)
  // On a page (the Drugs screen) there is no sheet under it, so the pop-up is
  // the thing Back closes, the same way ConfirmSheet does it.
  useBackClose(onPage, onClose)

  // On a page, lock the page scroll while the pop-up is open, the same way
  // ConfirmSheet does.
  useEffect(() => {
    if (!onPage) return
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    return () => { html.style.overflow = prevOverflow }
  }, [onPage])

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(id); window.removeEventListener('keydown', onKey) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const modal = (
    <div
      data-vaul-no-drag
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position:        onPage ? 'fixed' : 'absolute',
        inset:           0,
        zIndex:          onPage ? 1000 : 5,
        pointerEvents:   'auto',
        backgroundColor: 'rgba(0,0,0,0.45)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         'var(--space-4)',
        opacity:         shown ? 1 : 0,
        transition:      'opacity var(--motion-base) var(--ease-reveal)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width:           '100%',
          maxWidth:        360,
          maxHeight:       '100%',
          display:         'flex',
          flexDirection:   'column',
          boxSizing:       'border-box',
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          boxShadow:       '0 24px 64px rgba(0,0,0,0.18)',
          padding:         'var(--space-5)',
          fontFamily:      'var(--font-body)',
          transform:       shown ? 'scale(1)' : 'scale(0.96)',
          transition:      'transform var(--motion-base) var(--ease-settle)',
        }}
      >
        {/* Header: icon tile and title on one row (All chip on the right),
            then the subclass name as a small rounded-square badge and the hint
            line, both lined up on the left edge under the icon, all above a
            hairline. */}
        <div style={{
          flexShrink:    0,
          marginBottom:  'var(--space-3)',
          paddingBottom: 'var(--space-3)',
          borderBottom:  '0.5px solid var(--color-border)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 'var(--space-2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              {TitleIcon && (
                <span
                  aria-hidden="true"
                  style={{
                    width:           32,
                    height:          32,
                    borderRadius:    9,
                    backgroundColor: 'var(--color-accent-light)',
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    flexShrink:      0,
                  }}
                >
                  <TitleIcon size={16} color="var(--color-accent)" />
                </span>
              )}
              <span style={{
                fontSize: 16, fontWeight: 600, lineHeight: 1.3,
                color: 'var(--color-text-primary)',
              }}>
                {title}
              </span>
            </div>
            {onAll && (
              <ToggleChip label={allLabel} active={!hasSelection} onToggle={onAll} showCheckbox={false} fitContent />
            )}
          </div>
          {/* Generic pop-up only: which subclass these generics belong to,
              as '<Subclass> drugs' with the name in bold. */}
          {scopeName && (
            <div style={{ marginTop: 10 }}>
              <span style={{
                display:         'inline-block',
                maxWidth:        '100%',
                padding:         '4px 11px',
                borderRadius:    8,
                backgroundColor: 'var(--color-surface-muted)',
                fontSize:        14,
                lineHeight:      1.5,
                color:           'var(--color-text-secondary)',
              }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{scopeName}</span> drugs
              </span>
            </div>
          )}
        </div>

        <ScrollMenu maxHeight={listMaxHeight}>
          <div style={{
            display:             'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap:                 large ? 10 : 'var(--space-2)',
          }}>
            {options.map(opt => (
              <ToggleChip
                key={opt.value}
                label={opt.label}
                icon={opt.icon}
                active={selected.includes(opt.value)}
                onToggle={() => onPick(opt.value)}
                wrap={wrap}
                large={large}
                tone={opt.color ? { color: opt.color, tint: opt.tint } : undefined}
                showCheckbox={!single}
                count={showCounts ? opt.count : undefined}
                locked={lockAll || isOptionLocked(opt.count, selected.includes(opt.value))}
              />
            ))}
            {/* 'Other generics' (generic pop-up only): one row that unfolds the
                generics with a single brand, each still pickable on its own. */}
            {otherGroup && (
              <OtherGroup
                group={otherGroup}
                selected={selected}
                open={otherOpen}
                onToggleOpen={() => setOtherOpen(o => !o)}
                onPick={onPick}
                onPickGroup={onPickGroup}
                wrap={wrap}
              />
            )}
            {/* Inert row (generic pop-up only): a generic listed for reference
                that cannot be picked. Drawn at full strength on a soft
                neutral fill (not dimmed), no tick, and a 'Similar' tag where
                the number would be. */}
            {inertRow && (
              <ToggleChip
                label={inertRow.label}
                active={false}
                onToggle={() => {}}
                wrap={wrap}
                showCheckbox={false}
                tag="Similar"
                locked
                inert
              />
            )}
          </div>
        </ScrollMenu>

        {(onClear || lockAll) && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 'var(--space-2)', marginTop: 'var(--space-4)', flexShrink: 0,
          }}>
            {onClear && <ClearFilterButton onClick={onClear} disabled={!hasSelection} />}
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: 'var(--color-accent-light)',
                color: 'var(--color-accent)',
                fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
  // On a page it is drawn on the document itself (like ConfirmSheet), so no
  // parent can clip or offset it.
  return onPage ? createPortal(modal, document.body) : modal
}

// The 'Other generics' row and, when unfolded, its options. The row shows the
// number of brands in the group, or how many of its options are picked. The
// 'All' option picks every option that can be picked (a locked one gives no
// brand); it is ticked once all of those are picked, and ticking it again
// clears them.
function OtherGroup({ group, selected, open, onToggleOpen, onPick, onPickGroup, wrap }) {
  const [pressed, setPressed] = useState(false)
  const picked    = group.options.filter(o => selected.includes(o.value)).length
  const total     = group.options.reduce((sum, o) => sum + (o.count ?? 0), 0)
  const pickable  = group.options.filter(o => !isOptionLocked(o.count, selected.includes(o.value)))
  const allPicked = pickable.length > 0 && pickable.every(o => selected.includes(o.value))
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <button
        onClick={onToggleOpen}
        aria-expanded={open}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', minWidth: 0, boxSizing: 'border-box',
          padding: '8px 14px',
          borderRadius: wrap ? 'var(--radius-md)' : 'var(--radius-full)',
          fontSize: 13, fontWeight: 500, textAlign: 'left',
          cursor: 'pointer',
          border: picked > 0 ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
          backgroundColor: picked > 0 ? 'var(--color-accent-light)' : 'transparent',
          color: picked > 0 ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
          transform: pressed ? 'scale(0.98)' : 'scale(1)',
          transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
        }}
      >
        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {group.label}
        </span>
        {picked > 0
          ? <CountTag tone="accent" style={{ padding: '0 8px' }}>{picked} selected</CountTag>
          : <CountTag tone="neutral">{total}</CountTag>}
        <ChevronDown
          aria-hidden="true"
          size={16}
          strokeWidth={2}
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
        />
      </button>
      {open && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
          marginLeft: 8, paddingLeft: 10,
          borderLeft: '1.5px solid var(--color-border)',
        }}>
          <ToggleChip
            label={group.allLabel}
            active={allPicked}
            onToggle={() => onPickGroup(pickable.map(o => o.value), !allPicked)}
            wrap={wrap}
            locked={pickable.length === 0}
          />
          {group.options.map(opt => (
            <ToggleChip
              key={opt.value}
              label={opt.label}
              active={selected.includes(opt.value)}
              onToggle={() => onPick(opt.value)}
              wrap={wrap}
              count={opt.count}
              locked={isOptionLocked(opt.count, selected.includes(opt.value))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Scroll box with a visible thin scroll indicator. The app hides every native
// scrollbar (globals.css), so without this a long menu gives no hint that it
// scrolls. The indicator only appears when the content is taller than the box.
function ScrollMenu({ maxHeight, children }) {
  const boxRef = useRef(null)
  const [bar, setBar] = useState(null) // { top, height } in px, or null when nothing to scroll

  function measure() {
    const el = boxRef.current
    if (!el || el.scrollHeight <= el.clientHeight + 1) { setBar(null); return }
    const ratio  = el.clientHeight / el.scrollHeight
    const height = Math.max(24, el.clientHeight * ratio)
    const top    = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * (el.clientHeight - height)
    // Keep the same object when nothing visibly changed. A fresh object every
    // time made this component re-render itself forever (the effect below runs
    // after every render), which crashed with React error #185 as soon as a
    // sync update (like a Back press) hit the open pop-up.
    setBar(prev => (
      prev && Math.abs(prev.top - top) < 0.5 && Math.abs(prev.height - height) < 0.5
        ? prev
        : { top, height }
    ))
  }

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={boxRef}
        onScroll={measure}
        style={{
          maxHeight,
          overflowY:    'auto',
          paddingRight: bar ? 10 : 0,
        }}
      >
        {children}
      </div>
      {bar && (
        <span
          aria-hidden="true"
          style={{
            position:        'absolute',
            right:           1,
            top:             bar.top,
            width:           4,
            height:          bar.height,
            borderRadius:    'var(--radius-full)',
            backgroundColor: 'var(--color-text-tertiary)',
            opacity:         0.6,
            pointerEvents:   'none',
          }}
        />
      )}
    </div>
  )
}

// Quiet version of DrugFilterPanel.jsx's red Clear All button (not exported
// there), relabelled for a single filter: plain red text, no fill or border,
// so it does not compete with the filter options.
function ClearFilterButton({ onClick, disabled }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        padding: '8px 12px',
        borderRadius: 'var(--radius-md)',
        fontSize: 13, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        backgroundColor: 'transparent',
        color: disabled ? 'var(--color-text-tertiary)' : '#DC2626',
        fontFamily: 'var(--font-body)',
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        transition: 'color 0.15s ease, transform 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
    >
      Clear filter
    </button>
  )
}

// Copy of DrugFilterPanel.jsx's ToggleChip (not exported there), plus 'wrap'
// for long labels (several lines, softer corners) instead of one clipped line,
// and 'tag' (a word shown in the count tag's place, e.g. 'Similar').
function ToggleChip({ label, icon: Icon, active, onToggle, showCheckbox = true, fitContent = false, wrap = false, count, tag, locked = false, inert = false, large = false, tone }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={locked ? undefined : onToggle}
      aria-disabled={locked || undefined}
      onPointerDown={() => !locked && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: large ? 10 : 8,
        width: fitContent ? 'auto' : '100%', minWidth: 0, boxSizing: 'border-box',
        padding: large ? '11px 16px' : '8px 14px',
        borderRadius: wrap ? 'var(--radius-md)' : 'var(--radius-full)',
        fontSize: large ? 15 : 13, fontWeight: 500, textAlign: 'left',
        cursor: locked ? 'default' : 'pointer',
        // Dimmed only when it is locked AND not picked. A picked option that
        // cannot be removed (the only generic) keeps its full selected look;
        // an inert reference row is drawn at full strength too (2026-10-07).
        opacity: locked && !active && !inert ? 0.45 : 1,
        border: active ? `1.5px solid ${tone ? tone.color : 'var(--color-accent)'}` : `1.5px ${locked && !inert ? 'dashed' : 'solid'} var(--color-border)`,
        backgroundColor: active ? (tone ? tone.tint : 'var(--color-accent)') : (inert ? 'var(--color-surface-muted)' : 'transparent'),
        color: active ? (tone ? tone.color : '#fff') : 'var(--color-text-secondary)',
        fontFamily: 'var(--font-body)',
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
    >
      {showCheckbox && (
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 15, height: 15, flexShrink: 0,
          borderRadius: '50%',
          border: active ? '1.5px solid #fff' : '1.5px solid var(--color-text-tertiary)',
          backgroundColor: active ? '#fff' : 'transparent',
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
        }}>
          {active && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </span>
      )}
      {Icon && <Icon size={large ? 17 : 15} strokeWidth={2} color={tone ? tone.color : undefined} style={{ flexShrink: 0 }} aria-hidden="true" />}
      <span style={wrap
        ? { minWidth: 0, lineHeight: 1.35, overflowWrap: 'anywhere' }
        : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
        {label}
      </span>
      {tag !== undefined ? (
        <CountTag tone="neutral" style={{ marginLeft: 'auto' }}>
          {tag}
        </CountTag>
      ) : count !== undefined && (
        <CountTag tone={active ? 'onAccent' : 'neutral'} style={{ marginLeft: 'auto' }}>
          {count}
        </CountTag>
      )}
    </button>
  )
}
