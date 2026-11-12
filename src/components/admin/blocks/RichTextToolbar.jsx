/**
 * RichTextToolbar — src/components/admin/blocks/RichTextToolbar.jsx
 *
 * Formatting toolbar for the text block body (bold, italic, underline, font
 * color, font size, clear formatting) plus the small engine that applies each
 * choice to the selected text of the body box.
 *
 * How a choice is stored (inside the body text, so old blocks keep working):
 *   bullets    one "- " at the start of each line (shown as a bullet list)
 *   bold       **text**
 *   italic     _text_
 *   underline  <u>text</u>
 *   color      <span class="rt-c-red">text</span>   (fixed set, see COLORS)
 *   highlight  <span class="rt-h-yellow">text</span>  (see HIGHLIGHTS)
 *   badge      <span class="rt-b-red">text</span>     (see COLORS, shown as a small tag)
 *   heading    ## / ### / #### at the start of the line
 *   size       <span class="rt-s-lg">text</span>    (small / large, see SIZES)
 * The classes are styled in globals.css, with light and dark mode values.
 *
 * Exports:
 *   default RichTextToolbar({ active, onAction, disabled })
 *   applyFormat(value, start, end, action) -> { value, selStart, selEnd } | null
 *   getActiveFormats(value, start, end)    -> { b, i, u, color, size }
 *   EMPTY_ACTIVE
 *
 * Actions:
 *   { type: 'toggle', id: 'b' | 'i' | 'u' }
 *   { type: 'color',  value: 'red' | ... | null }   (null = back to default)
 *   { type: 'size',   value: 'sm' | 'lg' | null }   (null = normal)
 *   { type: 'clear' }
 *   { type: 'list' }                                      (bullet list on the selected lines, toggles)
 *   { type: 'olist' }                                     (numbered list on the selected lines, toggles)
 *   { type: 'highlight', value: 'yellow' | 'green' | 'blue' | 'pink' | null }   (highlighter, null = off)
 *   { type: 'badge',     value: 'red' | ... | null }      (small coloured tag, null = off)
 *   { type: 'heading',   value: 2 | 3 | 4 | null }        (heading level of the line, null = normal text)
 *   { type: 'table' }                                     (adds a small table after the current line)
 *   { type: 'copyFormat' }                                (remember the look of the selected text)
 *   { type: 'pasteFormat' }                               (give the selected text that look)
 *
 * The copy / paste format buttons only show when the parent passes the `painter`
 * prop (null = nothing copied yet, or an object { b, i, u, color, size }).
 */

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Bold, Italic, Underline, Palette, Type, Eraser, List, ListOrdered, Paintbrush, ClipboardPaste, Highlighter, Tag, Heading, Table } from 'lucide-react'

// ─── Choices ───────────────────────────────────────────────────────────────────

export const COLORS = [
  { key: 'red',    label: 'Red',    hex: '#DC2626' },
  { key: 'orange', label: 'Orange', hex: '#D97706' },
  { key: 'green',  label: 'Green',  hex: '#15803D' },
  { key: 'blue',   label: 'Blue',   hex: '#2563EB' },
  { key: 'purple', label: 'Purple', hex: '#7C3AED' },
  { key: 'gray',   label: 'Gray',   hex: '#6B7280' },
]

export const HIGHLIGHTS = [
  { key: 'yellow', label: 'Yellow', hex: '#FACC15' },
  { key: 'green',  label: 'Green',  hex: '#4ADE80' },
  { key: 'blue',   label: 'Blue',   hex: '#60A5FA' },
  { key: 'pink',   label: 'Pink',   hex: '#F472B6' },
]

export const HEADINGS = [
  { level: 2, label: 'Heading' },
  { level: 3, label: 'Sub-heading' },
  { level: 4, label: 'Pill label' },
  { level: null, label: 'Normal text' },
]

export const SIZES = [
  { key: 'sm', label: 'Small',  px: 12 },
  { key: null, label: 'Normal', px: 14 },
  { key: 'lg', label: 'Large',  px: 18 },
]

// Short words for a copied look, e.g. "Bold · Red · Large" ("Normal text" when plain).
function describePainter(f) {
  if (!f) return ''
  const parts = []
  if (f.b) parts.push('Bold')
  if (f.i) parts.push('Italic')
  if (f.u) parts.push('Underline')
  if (f.color) parts.push(COLORS.find(c => c.key === f.color)?.label ?? f.color)
  if (f.size) parts.push(SIZES.find(z => z.key === f.size)?.label ?? f.size)
  if (f.highlight) parts.push(`${HIGHLIGHTS.find(h => h.key === f.highlight)?.label ?? f.highlight} highlight`)
  if (f.badge) parts.push(`${COLORS.find(c => c.key === f.badge)?.label ?? f.badge} badge`)
  return parts.length ? parts.join(' · ') : 'Normal text'
}

export const EMPTY_ACTIVE = { b: false, i: false, u: false, color: null, size: null, highlight: null, badge: null, list: false, olist: false, heading: null }

// ─── Formatting engine ─────────────────────────────────────────────────────────

// Each token is an opener/closer pair as it appears in the text. Order matters
// only when two could match at the same spot.
const TOKENS = [
  { id: 'b', o: '\\*\\*',                      c: '\\*\\*' },
  { id: 'i', o: '_',                           c: '_' },
  { id: 'u', o: '<u>',                         c: '<\\/u>' },
  { id: 'c', o: '<span class="rt-c-[a-z]+">',  c: '<\\/span>' },
  { id: 's', o: '<span class="rt-s-[a-z]+">',  c: '<\\/span>' },
  { id: 'hl', o: '<span class="rt-h-[a-z]+">',  c: '<\\/span>' },
  { id: 'bd', o: '<span class="rt-b-[a-z]+">',  c: '<\\/span>' },
].map(t => ({
  ...t,
  reOpenEnd:    new RegExp(t.o + '$'),
  reCloseStart: new RegExp('^' + t.c),
  reOpenStart:  new RegExp('^' + t.o),
  reCloseEnd:   new RegExp(t.c + '$'),
  reOpenAny:    new RegExp(t.o),
}))

function wrapperFor(action) {
  if (action.type === 'toggle') {
    if (action.id === 'b') return ['**', '**']
    if (action.id === 'i') return ['_', '_']
    return ['<u>', '</u>']
  }
  if (action.type === 'color') return [`<span class="rt-c-${action.value}">`, '</span>']
  if (action.type === 'highlight') return [`<span class="rt-h-${action.value}">`, '</span>']
  if (action.type === 'badge') return [`<span class="rt-b-${action.value}">`, '</span>']
  return [`<span class="rt-s-${action.value}">`, '</span>']
}

// Markers that sit directly around [a, b) — peeled outward one pair at a time,
// so bold-around-underline-around-the-text is still found from the text itself.
function peelOutside(value, a, b) {
  const layers = []
  let bo = a
  let ao = b
  for (;;) {
    const before = value.slice(Math.max(0, bo - 80), bo)
    const after = value.slice(ao, ao + 12)
    let hit = false
    for (const tok of TOKENS) {
      const m1 = before.match(tok.reOpenEnd)
      const m2 = after.match(tok.reCloseStart)
      if (m1 && m2) {
        layers.push({ id: tok.id, oS: bo - m1[0].length, oE: bo, cS: ao, cE: ao + m2[0].length, openText: m1[0] })
        bo -= m1[0].length
        ao += m2[0].length
        hit = true
        break
      }
    }
    if (!hit) break
  }
  return layers
}

function ambiguousInside(tok, inner) {
  if (tok.id === 'c' || tok.id === 's' || tok.id === 'hl' || tok.id === 'bd') {
    const opens = (inner.match(/<span /g) || []).length
    const closes = (inner.match(/<\/span>/g) || []).length
    return opens !== closes
  }
  return tok.reOpenAny.test(inner)
}

// Markers that are part of the selection itself (selection includes them).
function peelInside(value, a, b) {
  const layers = []
  let io = 0
  let ic = 0
  for (;;) {
    const text = value.slice(a + io, b - ic)
    let hit = false
    for (const tok of TOKENS) {
      const m1 = text.match(tok.reOpenStart)
      const m2 = text.match(tok.reCloseEnd)
      if (!m1 || !m2 || m1[0].length + m2[0].length > text.length) continue
      const inner = text.slice(m1[0].length, text.length - m2[0].length)
      if (ambiguousInside(tok, inner)) continue
      layers.push({
        id: tok.id,
        oS: a + io, oE: a + io + m1[0].length,
        cS: b - ic - m2[0].length, cE: b - ic,
        openText: m1[0],
      })
      io += m1[0].length
      ic += m2[0].length
      hit = true
      break
    }
    if (!hit) break
  }
  return layers
}

function findLayers(value, a, b) {
  return { inside: peelInside(value, a, b), outside: peelOutside(value, a, b) }
}

function firstLayer(layers, id) {
  return layers.inside.find(l => l.id === id) ?? layers.outside.find(l => l.id === id) ?? null
}

// The pieces of text a choice applies to: the selection (or the word at the
// cursor), split per line, skipping list/heading marks, blank space and cards.
function getPieces(value, start, end) {
  let s = start
  let e = end
  if (s === e) {
    while (s > 0 && !/\s/.test(value[s - 1])) s -= 1
    while (e < value.length && !/\s/.test(value[e])) e += 1
    if (s === e) return { caret: true, at: start }
  }
  const list = []
  let pos = s
  while (pos < e) {
    const nl = value.indexOf('\n', pos)
    const segEnd = nl === -1 || nl > e ? e : nl
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1
    let a = pos
    if (pos === lineStart) {
      const m = value.slice(pos, segEnd).match(/^\s*(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s+)/)
      if (m) a = pos + m[0].length
    }
    let b = segEnd
    while (a < b && /\s/.test(value[a])) a += 1
    while (b > a && /\s/.test(value[b - 1])) b -= 1
    if (b > a && !value.slice(a, b).startsWith(':::')) list.push([a, b])
    pos = segEnd + 1
  }
  return { caret: false, list }
}

function stripInline(t) {
  return t
    .replace(/<\/?u>/g, '')
    .replace(/<span class="rt-[csbh]-[a-z]+">/g, '')
    .replace(/<\/span>/g, '')
    .replace(/\*\*/g, '')
    .replace(/(^|[\s(>])_(?=\S)/g, '$1')
    .replace(/(\S)_(?=$|[\s).,;:!?<])/g, '$1')
}

function applyEdits(value, edits) {
  const sorted = [...edits].sort((x, y) => (y.from - x.from) || (y.to - x.to))
  let out = value
  for (const ed of sorted) out = out.slice(0, ed.from) + ed.text + out.slice(ed.to)
  return out
}

// ─── Bullet list ───────────────────────────────────────────────────────────────
// Works on whole lines: the lines touched by the selection (or the cursor's
// line). Blank lines, headings and ::: card lines are left alone. If every
// line already is a bullet the bullets come off; otherwise every line becomes
// a bullet (a numbered line is turned into a bullet).
const BULLET_RE = /^(\s*)[-*+]\s+/
const NUMBER_RE = /^(\s*)\d+[.)]\s+/

function listLines(value, start, end) {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const last = end > start && value[end - 1] === '\n' ? end - 1 : end
  let lineEnd = value.indexOf('\n', last)
  if (lineEnd === -1) lineEnd = value.length
  const lines = value.slice(lineStart, lineEnd).split('\n')
  const isTarget = l => {
    const t = l.trim()
    return t !== '' && !t.startsWith(':::') && !t.startsWith('#')
  }
  return { lineStart, lineEnd, lines, isTarget }
}

function applyList(value, start, end, numbered = false) {
  const { lineStart, lineEnd, lines, isTarget } = listLines(value, start, end)
  const targets = lines.filter(isTarget)
  if (!targets.length) return null
  const re = numbered ? NUMBER_RE : BULLET_RE
  const allOn = targets.every(l => re.test(l))
  let n = 0
  const next = lines.map(l => {
    if (!isTarget(l)) return l
    if (allOn) return l.replace(re, '$1')
    n += 1
    return (numbered ? `${n}. ` : '- ') + l.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '').trimStart()
  })
  const newBlock = next.join('\n')
  const out = value.slice(0, lineStart) + newBlock + value.slice(lineEnd)
  if (start === end) {
    const idx = value.slice(lineStart, start).split('\n').length - 1
    const diff = next[idx].length - lines[idx].length
    const caret = Math.max(lineStart, start + diff)
    return { value: out, selStart: caret, selEnd: caret }
  }
  return { value: out, selStart: lineStart, selEnd: lineStart + newBlock.length }
}

function isListActive(value, start, end, numbered = false) {
  const { lines, isTarget } = listLines(value, start, end)
  const targets = lines.filter(isTarget)
  const re = numbered ? NUMBER_RE : BULLET_RE
  return targets.length > 0 && targets.every(l => re.test(l))
}

// ─── Headings ──────────────────────────────────────────────────────────────────
// Works on whole lines, like the lists. A line that already has the chosen level
// goes back to normal text; "Normal text" (value null) removes any level.
const HEADING_RE = /^(\s*)(#{1,6})\s+/

function applyHeading(value, start, end, level) {
  const { lineStart, lineEnd, lines } = listLines(value, start, end)
  const isTarget = l => l.trim() !== '' && !l.trim().startsWith(':::')
  const targets = lines.filter(isTarget)
  if (!targets.length) return null
  const allSame = level && targets.every(l => (l.match(HEADING_RE)?.[2].length ?? 0) === level)
  const next = lines.map(l => {
    if (!isTarget(l)) return l
    const bare = l.replace(/^\s*(?:#{1,6}|[-*+]|\d+[.)])\s+/, '').trimStart()
    return level && !allSame ? `${'#'.repeat(level)} ${bare}` : bare
  })
  const newBlock = next.join('\n')
  const out = value.slice(0, lineStart) + newBlock + value.slice(lineEnd)
  if (start === end) {
    const idx = value.slice(lineStart, start).split('\n').length - 1
    const caret = Math.max(lineStart, start + next[idx].length - lines[idx].length)
    return { value: out, selStart: caret, selEnd: caret }
  }
  return { value: out, selStart: lineStart, selEnd: lineStart + newBlock.length }
}

function headingLevelAt(value, start, end) {
  const { lines } = listLines(value, start, end)
  const levels = lines.filter(l => l.trim() !== '' && !l.trim().startsWith(':::'))
    .map(l => l.match(HEADING_RE)?.[2].length ?? 0)
  if (!levels.length || levels.some(v => v !== levels[0])) return null
  return levels[0] || null
}

// ─── Table ─────────────────────────────────────────────────────────────────────
// A small starter table (2 columns, 2 rows) after the line the cursor is on.
const TABLE_TEXT = '| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n|  |  |'

function applyTable(value, end) {
  let lineEnd = value.indexOf('\n', end)
  if (lineEnd === -1) lineEnd = value.length
  const before = value.slice(0, lineEnd)
  const after = value.slice(lineEnd).replace(/^\n+/, '')
  const lead = before.trim() === '' ? '' : '\n\n'
  const insertAt = before.length + lead.length
  const out = before + lead + TABLE_TEXT + (after ? '\n\n' + after : '\n')
  return { value: out, selStart: insertAt + 2, selEnd: insertAt + 10 }
}

const SPAN_KIND = { color: 'c', size: 's', highlight: 'hl', badge: 'bd' }

export function applyFormat(value, start, end, action) {
  if (action.type === 'list') return applyList(value, start, end)
  if (action.type === 'olist') return applyList(value, start, end, true)
  if (action.type === 'heading') return applyHeading(value, start, end, action.value)
  if (action.type === 'table') return applyTable(value, end)
  const ps = getPieces(value, start, end)

  // Nothing selected and no word under the cursor: open an empty pair to type in.
  if (ps.caret) {
    const isSet = action.type === 'toggle' || (action.type !== 'clear' && action.value)
    if (!isSet) return null
    const [o, c] = wrapperFor(action)
    const next = value.slice(0, ps.at) + o + c + value.slice(ps.at)
    const caret = ps.at + o.length
    return { value: next, selStart: caret, selEnd: caret }
  }
  if (!ps.list.length) return null

  const edits = []
  const remove = (from, to) => edits.push({ from, to, text: '' })
  const insert = (pos, text) => edits.push({ from: pos, to: pos, text })

  if (action.type === 'toggle') {
    const found = ps.list.map(([a, b]) => firstLayer(findLayers(value, a, b), action.id))
    const all = found.every(Boolean)
    const [o, c] = wrapperFor(action)
    ps.list.forEach(([a, b], k) => {
      if (all) {
        remove(found[k].oS, found[k].oE)
        remove(found[k].cS, found[k].cE)
      } else if (!found[k]) {
        insert(a, o)
        insert(b, c)
      }
    })
  } else if (action.type in SPAN_KIND) {
    const id = SPAN_KIND[action.type]
    ps.list.forEach(([a, b]) => {
      const old = firstLayer(findLayers(value, a, b), id)
      if (old) {
        remove(old.oS, old.oE)
        remove(old.cS, old.cE)
      }
      if (action.value) {
        const [o, c] = wrapperFor(action)
        insert(a, o)
        insert(b, c)
      }
    })
  } else if (action.type === 'clear') {
    ps.list.forEach(([a, b]) => {
      findLayers(value, a, b).outside.forEach(l => {
        remove(l.oS, l.oE)
        remove(l.cS, l.cE)
      })
      const text = value.slice(a, b)
      const cleaned = stripInline(text)
      if (cleaned !== text) edits.push({ from: a, to: b, text: cleaned })
    })
  }

  if (!edits.length) return null

  const firstA = ps.list[0][0]
  const lastB = ps.list[ps.list.length - 1][1]
  const delta = ed => ed.text.length - (ed.to - ed.from)
  let selStart = firstA
  let selEnd = lastB
  for (const ed of edits) {
    if (ed.to <= firstA) selStart += delta(ed)
    const isInsertAtEnd = ed.from === ed.to && ed.from === lastB
    if (ed.to <= lastB && !isInsertAtEnd) selEnd += delta(ed)
  }

  return { value: applyEdits(value, edits), selStart, selEnd }
}

export function getActiveFormats(value, start, end) {
  const list = isListActive(value, start, end)
  const olist = isListActive(value, start, end, true)
  const heading = headingLevelAt(value, start, end)
  const ps = getPieces(value, start, end)
  if (ps.caret || !ps.list.length) return { ...EMPTY_ACTIVE, list, olist, heading }
  const perPiece = ps.list.map(([a, b]) => findLayers(value, a, b))
  const every = id => perPiece.every(l => !!firstLayer(l, id))
  const keyOf = (id, re) => {
    const layer = firstLayer(perPiece[0], id)
    return layer ? (layer.openText.match(re)?.[1] ?? null) : null
  }
  return {
    b: every('b'),
    i: every('i'),
    u: every('u'),
    color: keyOf('c', /rt-c-([a-z]+)/),
    size: keyOf('s', /rt-s-([a-z]+)/),
    highlight: keyOf('hl', /rt-h-([a-z]+)/),
    badge: keyOf('bd', /rt-b-([a-z]+)/),
    list,
    olist,
    heading,
  }
}

// ─── UI ────────────────────────────────────────────────────────────────────────

// Keeps the cursor and selection in the body box when a button is pressed.
const keepSelection = e => e.preventDefault()

function IconButton({ label, onClick, active, disabled, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ? 'true' : 'false'}
      disabled={disabled}
      onMouseDown={keepSelection}
      onClick={onClick}
      style={{
        position: 'relative',
        width: 30,
        height: 30,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        backgroundColor: active ? 'var(--color-accent-light)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        opacity: disabled ? 0.45 : 1,
        transition: 'background-color 0.12s ease, color 0.12s ease',
      }}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span style={{ width: 1, height: 18, backgroundColor: 'var(--color-border)', margin: '0 4px' }} />
}

const popoverStyle = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  insetInlineStart: 0,
  zIndex: 30,
  padding: 'var(--space-2)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
}

// A menu that slides back inside the editor box (and the screen) when its button sits
// near the right edge of a narrow phone, instead of running off the side.
function ClampedPopover({ width, onMouseDown, children }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const menu = ref.current
    const host = menu?.parentElement
    if (!menu || !host) return
    const box = (host.closest('[data-rt-box]') || document.body).getBoundingClientRect()
    const lo = Math.max(box.left, 0) + 4
    const hi = Math.min(box.right, window.innerWidth) - 4
    const btnLeft = host.getBoundingClientRect().left
    let left = btnLeft
    if (left + menu.offsetWidth > hi) left = hi - menu.offsetWidth
    if (left < lo) left = lo
    menu.style.insetInlineStart = 'auto'
    menu.style.left = `${Math.round(left - btnLeft)}px`   // set directly: no flash
  }, [])
  return (
    <div
      ref={ref}
      style={{ ...popoverStyle, width, maxWidth: 'calc(100vw - 24px)', boxSizing: 'border-box' }}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  )
}

const menuRowStyle = isActive => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '6px 10px',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  textAlign: 'start',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  color: 'var(--color-text-primary)',
  backgroundColor: isActive ? 'var(--color-accent-light)' : 'transparent',
  fontWeight: isActive ? 600 : 400,
})

export default function RichTextToolbar({ active = EMPTY_ACTIVE, onAction, disabled = false, painter }) {
  const [menu, setMenu] = useState(null) // null | 'color' | 'size' | 'highlight' | 'badge' | 'heading'
  const wrapRef = useRef(null)

  // Close an open menu when clicking anywhere outside the toolbar.
  useEffect(() => {
    if (!menu) return
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menu])

  function pick(action) {
    setMenu(null)
    onAction(action)
  }

  const colorHex = COLORS.find(c => c.key === active.color)?.hex ?? null
  const highlightHex = HIGHLIGHTS.find(h => h.key === active.highlight)?.hex ?? null
  const badgeHex = COLORS.find(c => c.key === active.badge)?.hex ?? null

  // A menu of colour squares (font colour, highlighter, badge) plus an "off" row.
  function swatchMenu(kind, items, current, offLabel) {
    return (
      <ClampedPopover width={168} onMouseDown={keepSelection}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 4 }}>
          {items.map(c => (
            <button
              key={c.key}
              type="button"
              title={c.label}
              aria-label={c.label}
              onClick={() => pick({ type: kind, value: c.key })}
              style={{
                height: 36,
                borderRadius: 'var(--radius-sm)',
                border: current === c.key ? '2px solid var(--color-text-primary)' : '1px solid var(--color-border)',
                backgroundColor: c.hex,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => pick({ type: kind, value: null })}
          style={{ ...menuRowStyle(false), marginTop: 4, color: 'var(--color-text-secondary)' }}
        >
          {offLabel}
        </button>
      </ClampedPopover>
    )
  }

  return (
    <div
      ref={wrapRef}
      role="toolbar"
      aria-label="Text formatting"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        padding: 3,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <IconButton label="Bold (Ctrl+B)" active={active.b} disabled={disabled} onClick={() => pick({ type: 'toggle', id: 'b' })}>
        <Bold size={16} strokeWidth={2.4} />
      </IconButton>
      <IconButton label="Italic (Ctrl+I)" active={active.i} disabled={disabled} onClick={() => pick({ type: 'toggle', id: 'i' })}>
        <Italic size={16} />
      </IconButton>
      <IconButton label="Underline (Ctrl+U)" active={active.u} disabled={disabled} onClick={() => pick({ type: 'toggle', id: 'u' })}>
        <Underline size={16} />
      </IconButton>

      <Divider />

      {/* Heading level */}
      <div style={{ position: 'relative' }}>
        <IconButton
          label="Heading"
          active={menu === 'heading' || !!active.heading}
          disabled={disabled}
          onClick={() => setMenu(menu === 'heading' ? null : 'heading')}
        >
          <Heading size={16} />
        </IconButton>
        {menu === 'heading' && (
          <ClampedPopover width={160} onMouseDown={keepSelection}>
            {HEADINGS.map(h => (
              <button
                key={h.label}
                type="button"
                onClick={() => pick({ type: 'heading', value: h.level })}
                style={menuRowStyle((active.heading ?? null) === h.level)}
              >
                {h.label}
              </button>
            ))}
          </ClampedPopover>
        )}
      </div>

      <IconButton label="Bullet list" active={active.list} disabled={disabled} onClick={() => pick({ type: 'list' })}>
        <List size={16} />
      </IconButton>
      <IconButton label="Numbered list" active={active.olist} disabled={disabled} onClick={() => pick({ type: 'olist' })}>
        <ListOrdered size={16} />
      </IconButton>
      <IconButton label="Add a table" disabled={disabled} onClick={() => pick({ type: 'table' })}>
        <Table size={16} />
      </IconButton>

      <Divider />

      {/* Font color */}
      <div style={{ position: 'relative' }}>
        <IconButton
          label="Font color"
          active={menu === 'color' || !!active.color}
          disabled={disabled}
          onClick={() => setMenu(menu === 'color' ? null : 'color')}
        >
          <Palette size={16} />
          {colorHex && (
            <span style={{
              position: 'absolute', bottom: 3, insetInline: 8, height: 3,
              borderRadius: 2, backgroundColor: colorHex,
            }} />
          )}
        </IconButton>
        {menu === 'color' && swatchMenu('color', COLORS, active.color, 'Default color')}
      </div>

      {/* Highlighter */}
      <div style={{ position: 'relative' }}>
        <IconButton
          label="Highlighter"
          active={menu === 'highlight' || !!active.highlight}
          disabled={disabled}
          onClick={() => setMenu(menu === 'highlight' ? null : 'highlight')}
        >
          <Highlighter size={16} />
          {highlightHex && (
            <span style={{
              position: 'absolute', bottom: 3, insetInline: 8, height: 3,
              borderRadius: 2, backgroundColor: highlightHex,
            }} />
          )}
        </IconButton>
        {menu === 'highlight' && swatchMenu('highlight', HIGHLIGHTS, active.highlight, 'No highlight')}
      </div>

      {/* Badge (small coloured tag) */}
      <div style={{ position: 'relative' }}>
        <IconButton
          label="Badge (small tag)"
          active={menu === 'badge' || !!active.badge}
          disabled={disabled}
          onClick={() => setMenu(menu === 'badge' ? null : 'badge')}
        >
          <Tag size={16} />
          {badgeHex && (
            <span style={{
              position: 'absolute', bottom: 3, insetInline: 8, height: 3,
              borderRadius: 2, backgroundColor: badgeHex,
            }} />
          )}
        </IconButton>
        {menu === 'badge' && swatchMenu('badge', COLORS, active.badge, 'No badge')}
      </div>

      {/* Font size */}
      <div style={{ position: 'relative' }}>
        <IconButton
          label="Font size"
          active={menu === 'size' || !!active.size}
          disabled={disabled}
          onClick={() => setMenu(menu === 'size' ? null : 'size')}
        >
          <Type size={16} />
        </IconButton>
        {menu === 'size' && (
          <ClampedPopover width={150} onMouseDown={keepSelection}>
            {SIZES.map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => pick({ type: 'size', value: s.key })}
                style={menuRowStyle((active.size ?? null) === s.key)}
              >
                <span style={{ fontSize: s.px, lineHeight: 1.2 }}>{s.label}</span>
              </button>
            ))}
          </ClampedPopover>
        )}
      </div>

      <Divider />

      <IconButton label="Clear formatting" disabled={disabled} onClick={() => pick({ type: 'clear' })}>
        <Eraser size={16} />
      </IconButton>

      {painter !== undefined && (
        <>
          <Divider />
          <IconButton label="Copy format of the selected text" active={!!painter} disabled={disabled} onClick={() => pick({ type: 'copyFormat' })}>
            <Paintbrush size={16} />
          </IconButton>
          <IconButton
            label={painter ? `Paste format (${describePainter(painter)})` : 'Paste format (copy a format first)'}
            disabled={disabled || !painter}
            onClick={() => pick({ type: 'pasteFormat' })}
          >
            <ClipboardPaste size={16} />
          </IconButton>
          {painter && (
            <span style={{
              fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)',
              padding: '0 6px', whiteSpace: 'nowrap',
            }}>
              {describePainter(painter)}
            </span>
          )}
        </>
      )}
    </div>
  )
}
