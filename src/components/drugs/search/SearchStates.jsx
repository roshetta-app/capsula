/**
 * src/components/drugs/search/SearchStates.jsx
 *
 * 2026-10-21 (Drug groups plan, step 11.7): every message and list the search shows
 * besides the drug rows themselves, moved out of DrugsScreen.jsx so the Drugs home and
 * the Add drugs screen (12.5) can use the same ones. All wording is unchanged. The look
 * is flat: messages are a centred icon with text and no box; lists (the Class hint,
 * 'found in other modes', 'Did you mean', the loading rows, 'Search all drugs instead'
 * inside a category) are flat rows with thin lines between them, no fills or corners.
 *
 * The 'allowClass' setting (default true): when it is false the Class hint strip draws
 * nothing, Class is never offered as a place the text was found, and the no-result
 * message never uses the Class wording. The Add drugs screen passes false.
 */

import { useEffect, useState } from 'react'
import { History as HistoryIcon, FilterX, SearchX, Lightbulb, ArrowLeftRight, Globe, Search, ChevronRight } from 'lucide-react'
import FilledHintButton from '../home/FilledHintButton'
import { shimmer } from '../home/shimmer'
import { MODE_OPTIONS } from '../home/DrugsSearchSection'
import { titleCaseWords } from '../../../utils/classSearch'

// ─── Shared look ─────────────────────────────────────────────────────────────
const STATE_BOX_STYLE = { textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }
const STATE_ICON_SIZE = 40
const STATE_ICON_ROW_STYLE = { display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }
const STATE_TITLE_STYLE = {
  fontSize: 19, fontWeight: 700, lineHeight: 1.25, marginBottom: 6,
  color: 'var(--color-text-primary)', overflowWrap: 'anywhere',
}
const STATE_LINE_STYLE = {
  fontSize: 15, lineHeight: 1.4, marginBottom: 'var(--space-4)',
  color: 'var(--color-text-secondary)', overflowWrap: 'anywhere',
}

// A flat tappable row: no fill, no corners, a thin line under it. A light press fade.
function FlatRowButton({ onClick, children, style }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', minHeight: 52, boxSizing: 'border-box', textAlign: 'left',
        padding: '10px 2px',
        border: 'none', borderBottom: '1px solid var(--color-border)', borderRadius: 0,
        background: 'none', fontFamily: 'var(--font-body)', cursor: 'pointer',
        opacity: pressed ? 0.6 : 1, transition: 'opacity var(--motion-fast, 120ms) ease',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// The wrapper for a short list of flat rows inside a centred message: a thin line on top.
const FLAT_LIST_STYLE = {
  display: 'flex', flexDirection: 'column',
  width: '100%', maxWidth: 420, margin: '0 auto', textAlign: 'left',
  borderTop: '1px solid var(--color-border)',
}

// ─── FadeIn ──────────────────────────────────────────────────────────────────
// Eases a state in when it appears (instant when the phone asks for reduced motion).
export function FadeIn({ children, disabled = false, ms = 200, rise = 6 }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  const still = disabled || (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  return (
    <div style={{
      opacity:    on || still ? 1 : 0,
      transform:  on || still ? 'none' : `translateY(${rise}px)`,
      transition: still ? 'none' : `opacity ${ms}ms ease, transform ${ms}ms ease`,
    }}>
      {children}
    </div>
  )
}

// ─── SearchSwitchingState ────────────────────────────────────────────────────
// Shown for a moment while the results of a new mode or a new search are on their way:
// flat placeholder rows with a thin line under each, in the shape of a result row.
const SWITCH_SKELETON_ROWS = 6

export function SearchSwitchingState() {
  return (
    <div role="status" aria-label="Loading results">
      <div style={shimmer({ width: 110, height: 13, marginBottom: 'var(--space-3)' })} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {Array.from({ length: SWITCH_SKELETON_ROWS }, (_, i) => (
          <div
            key={i}
            style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              padding: '14px 2px', borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={shimmer({ width: i % 2 === 0 ? '62%' : '48%', height: 15 })} />
            <div style={shimmer({ width: i % 2 === 0 ? '34%' : '40%', height: 12 })} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TooShortState ───────────────────────────────────────────────────────────
// One typed character: search asks for one more rather than listing thousands of names.
export function TooShortState() {
  return (
    <div style={STATE_BOX_STYLE}>
      <div style={STATE_ICON_ROW_STYLE}>
        <Search size={STATE_ICON_SIZE} color="var(--color-text-tertiary)" />
      </div>
      <div style={STATE_TITLE_STYLE}>Keep typing</div>
      <div style={{ ...STATE_LINE_STYLE, marginBottom: 0 }}>
        Type at least 2 characters to search
      </div>
    </div>
  )
}

// ─── RecentEmptyState ────────────────────────────────────────────────────────
// The search focus mode's empty list.
export function RecentEmptyState() {
  return (
    <div style={STATE_BOX_STYLE}>
      <div style={STATE_ICON_ROW_STYLE}>
        <HistoryIcon size={STATE_ICON_SIZE} color="var(--color-text-tertiary)" />
      </div>
      <div style={STATE_TITLE_STYLE}>No recent searches</div>
      <div style={{ ...STATE_LINE_STYLE, marginBottom: 0 }}>
        Drugs you open from a search will show up here
      </div>
    </div>
  )
}

// ─── SearchAllButton ─────────────────────────────────────────────────────────
// 'Search all drugs instead' with a globe icon ('count' adds '· 12 more'). Inside a
// message it is the filled button; with 'flat' it is a flat row (the line above the
// results of an open category).
export function SearchAllButton({ onClick, count, style, flat = false }) {
  const label = count > 0 ? `Search all drugs instead · ${count} more` : 'Search all drugs instead'
  if (flat) {
    return (
      <FlatRowButton onClick={onClick} style={{ minHeight: 44, color: 'var(--color-accent)', ...style }}>
        <Globe size={17} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{label}</span>
        <ChevronRight size={16} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
      </FlatRowButton>
    )
  }
  return (
    <FilledHintButton
      onClick={onClick}
      style={{ fontSize: 14, padding: '10px 16px', gap: 8, ...style }}
    >
      <Globe size={17} style={{ flexShrink: 0 }} />
      {label}
    </FilledHintButton>
  )
}

// ─── WidenSearchState ────────────────────────────────────────────────────────
// Nothing in the open category, but other categories have matches ('count').
export function WidenSearchState({ query, scopeLabel, count, onSearchAll }) {
  return (
    <FadeIn ms={170} rise={4}>
    <div style={STATE_BOX_STYLE}>
      <div style={STATE_ICON_ROW_STYLE}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--color-accent-light)',
        }}>
          <Globe size={32} color="var(--color-accent)" />
        </div>
      </div>
      <div style={STATE_TITLE_STYLE}>
        {`Nothing in ${scopeLabel}${query ? ` for "${query}"` : ''}`}
      </div>
      <div style={STATE_LINE_STYLE}>
        {`${count} ${count === 1 ? 'drug matches' : 'drugs match'} in other categories`}
      </div>
      <SearchAllButton onClick={onSearchAll} />
    </div>
    </FadeIn>
  )
}

// A text-only button for the quieter actions inside a message.
function QuietLinkButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 'var(--space-1) var(--space-1)',
        color: 'var(--color-accent)', fontFamily: 'var(--font-body)',
        fontSize: 15, fontWeight: 600,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

// ─── EmptyState ──────────────────────────────────────────────────────────────
// Nothing found here, no typo guess, and no other mode has it: a plain dead end.
// Same wording in every mode; the Class wording only when Class search is allowed.
export function EmptyState({ query, mode, onClear, allowClass = true }) {
  const inClassMode = allowClass && mode === 'class'
  const quoted = query ? ` "${query}"` : ''
  return (
    <FadeIn ms={170} rise={4}>
    <div style={STATE_BOX_STYLE}>
      <div style={STATE_ICON_ROW_STYLE}>
        <SearchX size={STATE_ICON_SIZE} color="var(--color-text-tertiary)" />
      </div>
      <div style={STATE_TITLE_STYLE}>
        {inClassMode ? `No classes or drug families match${quoted}` : `No drugs match${quoted}`}
      </div>
      <div style={{ ...STATE_LINE_STYLE, marginBottom: 'var(--space-3)' }}>
        {inClassMode
          ? 'Try part of a class or drug family name, or a common word like "vomiting"'
          : 'Check the spelling, or try the first letters of the name'}
      </div>
      <QuietLinkButton onClick={onClear}>Clear search</QuietLinkButton>
    </div>
    </FadeIn>
  )
}

// ─── ClassHintStrip ──────────────────────────────────────────────────────────
// The typed text is also a class, a drug family or a class keyword. 'hint' is
// { classes, subclasses } (counts). A flat row above a list that already has drugs, in
// the Class mode's violet, with a thin line under it. Only switches the mode.
export function ClassHintStrip({ hint, onSwitch, allowClass = true }) {
  if (!allowClass || !hint) return null
  const total = hint.classes + hint.subclasses
  const opt = MODE_OPTIONS.find(o => o.value === 'class')
  const Icon = opt.icon
  return (
    <FlatRowButton
      onClick={onSwitch}
      style={{ minHeight: 44, gap: 8, marginBottom: 'var(--space-2)', color: opt.color, fontSize: 13.5, fontWeight: 500 }}
    >
      <Icon size={16} color={opt.color} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>{`See ${total} ${total === 1 ? 'match' : 'matches'} in Class mode`}</span>
      <ChevronRight size={16} color={opt.color} style={{ flexShrink: 0 }} />
    </FlatRowButton>
  )
}

// ─── ModeSwitchState ─────────────────────────────────────────────────────────
// 'Not here, but found in another mode': the top says this mode has nothing, then one
// flat row per mode that has the text, each with that mode's own icon and colour.
// 'targets' lists those modes, most useful first. Tapping a row only switches the mode.
function modeSwitchSubline(target, hint) {
  if (target === 'class') {
    const total = hint ? hint.classes + hint.subclasses : 0
    return total > 0 ? `${total} ${total === 1 ? 'result' : 'results'}` : null
  }
  return `Matches a ${target} name`
}

export function ModeSwitchState({ query, mode, hint, targets, onSwitch, allowClass = true }) {
  const shownTargets = allowClass ? targets : targets.filter(t => t !== 'class')
  if (shownTargets.length === 0) return null
  const quoted = query ? ` "${query}"` : ''
  return (
    <FadeIn ms={170} rise={4}>
    <div style={STATE_BOX_STYLE}>
      <div style={STATE_ICON_ROW_STYLE}>
        <ArrowLeftRight size={STATE_ICON_SIZE} color="var(--color-text-tertiary)" />
      </div>
      <div style={STATE_TITLE_STYLE}>
        {allowClass && mode === 'class'
          ? `No classes or drug families match${quoted}`
          : `No drugs match${quoted}`}
      </div>
      <div style={STATE_LINE_STYLE}>
        {shownTargets.length > 1
          ? 'But it has results in other search modes'
          : 'But it has results in another search mode'}
      </div>
      <div style={FLAT_LIST_STYLE}>
        {shownTargets.map(t => {
          const opt = MODE_OPTIONS.find(o => o.value === t)
          if (!opt) return null
          const Icon = opt.icon
          const sub = modeSwitchSubline(t, hint)
          return (
            <FlatRowButton key={t} onClick={() => onSwitch(t)}>
              <Icon size={22} color={opt.color} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600, lineHeight: 1.25, color: 'var(--color-text-primary)' }}>
                  {`See ${opt.label} results`}
                </span>
                {sub && (
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 400, lineHeight: 1.3, color: 'var(--color-text-secondary)' }}>
                    {sub}
                  </span>
                )}
              </span>
              <ChevronRight size={18} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
            </FlatRowButton>
          )
        })}
      </div>
    </div>
    </FadeIn>
  )
}

// ─── FilterMaskedState ───────────────────────────────────────────────────────
// The search found drugs but the Form/Route filter hid all of them. 'onClearFilter'
// goes through the same confirm step as every other Clear filter button.
export function FilterMaskedState({ count, query, onClearFilter }) {
  return (
    <FadeIn ms={170} rise={4}>
    <div style={STATE_BOX_STYLE}>
      <div style={STATE_ICON_ROW_STYLE}>
        <FilterX size={STATE_ICON_SIZE} color="var(--color-text-tertiary)" />
      </div>
      <div style={STATE_TITLE_STYLE}>
        Your filter is hiding these results
      </div>
      <div style={STATE_LINE_STYLE}>
        {count} drug{count !== 1 ? 's' : ''} match{query ? ` "${query}"` : ''}
      </div>
      <FilledHintButton onClick={onClearFilter}>
        Clear filter
      </FilledHintButton>
    </div>
    </FadeIn>
  )
}

// ─── DidYouMeanState ─────────────────────────────────────────────────────────
// Nothing matched, but there are one to three close guesses. One guess or several: the
// same flat rows. A long name wraps onto a second line and is cut after that. Every
// name is shown capitalised (display only); the search uses it exactly as given.
export function DidYouMeanState({ query, suggestions, onSelect }) {
  const single = suggestions.length === 1
  return (
    <FadeIn ms={170} rise={4}>
    <div style={STATE_BOX_STYLE}>
      <div style={STATE_ICON_ROW_STYLE}>
        <Lightbulb size={STATE_ICON_SIZE} color="var(--color-text-tertiary)" />
      </div>
      <div style={STATE_TITLE_STYLE}>
        {single ? 'Did you mean this?' : 'Did you mean one of these?'}
      </div>
      <div style={{ ...STATE_LINE_STYLE, marginBottom: 'var(--space-4)' }}>
        {`No exact match${query ? ` for "${query}"` : ''}`}
      </div>
      <div style={FLAT_LIST_STYLE}>
        {suggestions.map(name => (
          <FlatRowButton key={name} onClick={() => onSelect(name)} style={{ minHeight: 48 }}>
            <Search size={18} color="var(--color-accent)" style={{ flexShrink: 0 }} />
            <span style={{
              flex: 1, minWidth: 0, overflowWrap: 'anywhere',
              fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text-primary)',
              display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
            }}>
              {titleCaseWords(name)}
            </span>
            <ChevronRight size={18} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
          </FlatRowButton>
        ))}
      </div>
    </div>
    </FadeIn>
  )
}
