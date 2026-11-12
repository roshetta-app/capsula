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
 *   { type: 'tableOp', op: 'addRow' | 'delRow' | 'addCol' | 'delCol' | 'delTable' }   (cursor inside a table)
 *   { type: 'symbol', value: '≥' }                        (types that symbol at the cursor)
 *   { type: 'divider' }                                   (a divider line after the current line)
 *   { type: 'undo' } / { type: 'redo' }                   (handled by the editor that owns the text history)
 *   { type: 'toggle', id: 'sub' | 'sup' }                 (subscript / superscript, saved as <sub> / <sup>)
 *   { type: 'linkStart' }                                 (the editor remembers the cursor before the Drug / Class pop-up opens)
 *   { type: 'link', markdown, html }                      (a drug link or class link, typed at the cursor, see textLinks.js)
 *   { type: 'copyFormat' }                                (remember the look of the selected text)
 *   { type: 'pasteFormat' }                               (give the selected text that look, once)
 *   { type: 'cancelFormat' }                              (forget the copied look)
 *
 * The copy / paste format buttons only show when the parent passes the `painter`
 * prop (null = nothing copied yet, or an object { b, i, u, color, size }).
 */

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Bold, Italic, Underline, Palette, Type, Eraser, List, ListOrdered, Paintbrush, ClipboardPaste, Highlighter, Tag, Heading, Table, Minus, Undo2, Redo2, Pill, Trash2 } from 'lucide-react'
import { MoleculeIcon } from '../../drugs/classes/ClassIcons'
import TextLinkPicker from './TextLinkPicker'
import { drugLinkMarkdown, classLinkMarkdown, linkEditorHtml } from '../../../lib/textLinks'

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

// Each row of the heading menu is drawn the way that style looks in the text.
export const HEADINGS = [
  { level: 2, label: 'Heading', hint: 'section',
    preview: { fontSize: 16, fontWeight: 700, lineHeight: 1.2, borderBottom: '1px solid var(--color-border)', paddingBottom: 2 } },
  { level: 3, label: 'Sub-heading', hint: 'topic',
    preview: { fontSize: 14, fontWeight: 600, lineHeight: 1.2 } },
  { level: 4, label: 'Pill label', hint: 'track',
    preview: { fontSize: 12, fontWeight: 600, lineHeight: 1.3, padding: '1px 9px', borderRadius: 999,
      color: 'var(--color-accent, #2563EB)', background: 'color-mix(in srgb, var(--color-accent, #2563EB) 12%, transparent)' } },
  { level: null, label: 'Normal text', hint: '',
    preview: { fontSize: 13, fontWeight: 400, lineHeight: 1.2 } },
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

export const EMPTY_ACTIVE = { b: false, i: false, u: false, sub: false, sup: false, color: null, size: null, highlight: null, badge: null, list: false, olist: false, heading: null, inTable: false }

// ─── Formatting engine ─────────────────────────────────────────────────────────

// Each token is an opener/closer pair as it appears in the text. Order matters
// only when two could match at the same spot.
const TOKENS = [
  { id: 'b', o: '\\*\\*',                      c: '\\*\\*' },
  { id: 'i', o: '_',                           c: '_' },
  { id: 'u', o: '<u>',                         c: '<\\/u>' },
  { id: 'sub', o: '<sub>',                      c: '<\\/sub>' },
  { id: 'sup', o: '<sup>',                      c: '<\\/sup>' },
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
    if (action.id === 'sub') return ['<sub>', '</sub>']
    if (action.id === 'sup') return ['<sup>', '</sup>']
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
    .replace(/<\/?(?:u|sub|sup)>/g, '')
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

// Puts `text` as its own block after the line that holds `end`, with a blank line
// on both sides. Returns the new text and where the block starts.
function insertBlockAfterLine(value, end, text) {
  let lineEnd = value.indexOf('\n', end)
  if (lineEnd === -1) lineEnd = value.length
  const before = value.slice(0, lineEnd)
  const after = value.slice(lineEnd).replace(/^\n+/, '')
  const lead = before.trim() === '' ? '' : '\n\n'
  const at = before.length + lead.length
  return { value: before + lead + text + (after ? '\n\n' + after : '\n'), at }
}

function applyTable(value, end) {
  const r = insertBlockAfterLine(value, end, TABLE_TEXT)
  return { value: r.value, selStart: r.at + 2, selEnd: r.at + 10 }
}

function applyDivider(value, end) {
  const r = insertBlockAfterLine(value, end, '---')
  return { value: r.value, selStart: r.at + 3, selEnd: r.at + 3 }
}

// ─── Table rows and columns (code view) ────────────────────────────────────────
function splitRow(line) {
  let t = line.trim()
  if (t.startsWith('|')) t = t.slice(1)
  if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1)
  const cells = []
  let cur = ''
  for (let i = 0; i < t.length; i += 1) {
    const ch = t[i]
    if (ch === '\\' && t[i + 1] === '|') { cur += '\\|'; i += 1 }
    else if (ch === '|') { cells.push(cur.trim()); cur = '' }
    else cur += ch
  }
  cells.push(cur.trim())
  return cells
}

const joinRow = cells => `| ${cells.join(' | ')} |`
const isPipeLine = l => l != null && l.trim().startsWith('|')

// The table the cursor is in: its lines, which line and column the cursor is on.
function tableAt(value, pos) {
  const lines = value.split('\n')
  let off = 0
  let idx = lines.length - 1
  for (let i = 0; i < lines.length; i += 1) {
    if (pos <= off + lines[i].length) { idx = i; break }
    off += lines[i].length + 1
  }
  if (!isPipeLine(lines[idx])) return null
  let a = idx
  while (a > 0 && isPipeLine(lines[a - 1])) a -= 1
  let b = idx
  while (b < lines.length - 1 && isPipeLine(lines[b + 1])) b += 1
  const sep = lines[a + 1]
  if (!sep || !/^[\s|:-]+$/.test(sep) || !sep.includes('-')) return null
  const cols = splitRow(lines[a]).length
  const pipes = (lines[idx].slice(0, Math.max(0, pos - off)).match(/(^|[^\\])\|/g) || []).length
  const col = Math.min(Math.max(0, pipes - 1), cols - 1)
  return { lines, a, b, idx, col, cols }
}

function applyTableOp(value, start, op) {
  const t = tableAt(value, start)
  if (!t) return null
  const { lines, a, b, idx, col, cols } = t
  const rows = lines.slice(a, b + 1).map(splitRow).map(r => {
    const x = r.slice(0, cols)
    while (x.length < cols) x.push('')
    return x
  })
  const r = idx - a
  let next = rows
  let caretRow = r
  let caretCol = col
  if (op === 'delTable' || (op === 'delCol' && cols <= 1)) {
    const from = lines.slice(0, a)
    const rest = lines.slice(b + 1)
    while (from.length && from[from.length - 1].trim() === '') from.pop()
    while (rest.length && rest[0].trim() === '') rest.shift()
    const out = [...from, ...(from.length && rest.length ? [''] : []), ...rest].join('\n')
    const caret = from.length ? from.join('\n').length + (rest.length ? 2 : 0) : 0
    return { value: out, selStart: caret, selEnd: caret }
  }
  if (op === 'addRow') {
    const at = r <= 1 ? 2 : r + 1
    next = rows.map(x => x.slice())
    next.splice(at, 0, Array(cols).fill(''))
    caretRow = at
  } else if (op === 'delRow') {
    if (r <= 1) return null
    next = rows.map(x => x.slice())
    next.splice(r, 1)
    caretRow = Math.min(r, next.length - 1)
  } else if (op === 'addCol') {
    next = rows.map((row, i) => { const x = row.slice(); x.splice(col + 1, 0, i === 1 ? '---' : ''); return x })
    caretCol = col + 1
  } else if (op === 'delCol') {
    next = rows.map(row => { const x = row.slice(); x.splice(col, 1); return x })
    caretCol = Math.min(col, cols - 2)
  } else return null
  const newLines = next.map(joinRow)
  const out = [...lines.slice(0, a), ...newLines, ...lines.slice(b + 1)].join('\n')
  const lineOffset = [...lines.slice(0, a), ...newLines.slice(0, caretRow)].reduce((n, l) => n + l.length + 1, 0)
  const row = next[caretRow] || []
  const caret = lineOffset + 2 + row.slice(0, caretCol).reduce((n, c) => n + c.length + 3, 0)
  return { value: out, selStart: caret, selEnd: caret }
}

const SPAN_KIND = { color: 'c', size: 's', highlight: 'hl', badge: 'bd' }

export function applyFormat(value, start, end, action) {
  if (action.type === 'list') return applyList(value, start, end)
  if (action.type === 'olist') return applyList(value, start, end, true)
  if (action.type === 'heading') return applyHeading(value, start, end, action.value)
  if (action.type === 'table') return applyTable(value, end)
  if (action.type === 'divider') return applyDivider(value, end)
  if (action.type === 'tableOp') return applyTableOp(value, start, action.op)
  if (action.type === 'linkStart') return null
  if (action.type === 'link') {
    // the saved link text goes at the cursor (replacing any selected text), then one space so typing can go on
    const text = action.markdown + (/\s/.test(value.charAt(end)) ? '' : ' ')
    const caret = start + text.length
    return { value: value.slice(0, start) + text + value.slice(end), selStart: caret, selEnd: caret }
  }
  if (action.type === 'symbol') {
    const caret = start + action.value.length
    return { value: value.slice(0, start) + action.value + value.slice(end), selStart: caret, selEnd: caret }
  }
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
  const inTable = !!tableAt(value, start)
  if (ps.caret || !ps.list.length) return { ...EMPTY_ACTIVE, list, olist, heading, inTable }
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
    sub: every('sub'),
    sup: every('sup'),
    color: keyOf('c', /rt-c-([a-z]+)/),
    size: keyOf('s', /rt-s-([a-z]+)/),
    highlight: keyOf('hl', /rt-h-([a-z]+)/),
    badge: keyOf('bd', /rt-b-([a-z]+)/),
    list,
    olist,
    heading,
    inTable,
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

function TextButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={keepSelection}
      onClick={onClick}
      style={{
        height: 28, padding: '0 8px', border: 'none', borderRadius: 'var(--radius-sm)',
        background: 'transparent', cursor: disabled ? 'default' : 'pointer',
        color: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600,
        fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', opacity: disabled ? 0.45 : 1,
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

export default function RichTextToolbar({ active = EMPTY_ACTIVE, onAction, disabled = false, painter, canUndo = false, canRedo = false, canClear = false }) {
  const [menu, setMenu] = useState(null) // null | 'color' | 'size' | 'highlight' | 'badge' | 'heading' | 'list'
  const wrapRef = useRef(null)
  const [picker, setPicker] = useState(null) // null | 'drug' | 'class'  (the link pop-up)

  function openPicker(kind) {
    setMenu(null)
    onAction({ type: 'linkStart' })
    setPicker(kind)
  }

  function handlePicked(pick, opts) {
    const markdown = picker === 'drug' ? drugLinkMarkdown(pick, opts) : classLinkMarkdown(pick?.className, pick?.familyName)
    setPicker(null)
    if (!markdown) return
    onAction({ type: 'link', markdown, html: linkEditorHtml(markdown) })
  }

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

  const listActive = !!(active.list || active.olist)

  // Colour dropdown button with the small colour bar under the icon.
  function swatchButton(kind, label, Icon, hex, current, items, offLabel) {
    return (
      <div style={{ position: 'relative' }}>
        <IconButton
          label={label}
          active={menu === kind || !!current}
          disabled={disabled}
          onClick={() => setMenu(menu === kind ? null : kind)}
        >
          <Icon size={16} />
          {hex && (
            <span style={{
              position: 'absolute', bottom: 3, insetInline: 8, height: 3,
              borderRadius: 2, backgroundColor: hex,
            }} />
          )}
        </IconButton>
        {menu === kind && swatchMenu(kind, items, current, offLabel)}
      </div>
    )
  }

  return (
    <div
      ref={wrapRef}
      role="toolbar"
      aria-label="Text formatting"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: 3,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {/* Line 1: sections, left to right: History | Font | Paragraph | Insert | Format painter */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        {/* History: undo, redo, clear all text */}
        <IconButton label="Undo (Ctrl+Z)" disabled={disabled || !canUndo} onClick={() => pick({ type: 'undo' })}>
          <Undo2 size={16} />
        </IconButton>
        <IconButton label="Redo" disabled={disabled || !canRedo} onClick={() => pick({ type: 'redo' })}>
          <Redo2 size={16} />
        </IconButton>
        <IconButton label="Clear all text (Undo brings it back)" disabled={disabled || !canClear} onClick={() => pick({ type: 'clearAll' })}>
          <Trash2 size={16} />
        </IconButton>

        <Divider />

        {/* Font: bold, italic, underline, colour, highlighter, badge, size, clear */}
        <IconButton label="Bold (Ctrl+B)" active={active.b} disabled={disabled} onClick={() => pick({ type: 'toggle', id: 'b' })}>
          <Bold size={16} strokeWidth={2.4} />
        </IconButton>
        <IconButton label="Italic (Ctrl+I)" active={active.i} disabled={disabled} onClick={() => pick({ type: 'toggle', id: 'i' })}>
          <Italic size={16} />
        </IconButton>
        <IconButton label="Underline (Ctrl+U)" active={active.u} disabled={disabled} onClick={() => pick({ type: 'toggle', id: 'u' })}>
          <Underline size={16} />
        </IconButton>
        {swatchButton('color', 'Font color', Palette, colorHex, active.color, COLORS, 'Default color')}
        {swatchButton('highlight', 'Highlighter', Highlighter, highlightHex, active.highlight, HIGHLIGHTS, 'No highlight')}
        {swatchButton('badge', 'Badge (small tag)', Tag, badgeHex, active.badge, COLORS, 'No badge')}
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
              {SIZES.map(sz => (
                <button
                  key={sz.label}
                  type="button"
                  onClick={() => pick({ type: 'size', value: sz.key })}
                  style={menuRowStyle((active.size ?? null) === sz.key)}
                >
                  <span style={{ fontSize: sz.px, lineHeight: 1.2 }}>{sz.label}</span>
                </button>
              ))}
            </ClampedPopover>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <IconButton
            label="Clear formatting"
            active={menu === 'clear'}
            disabled={disabled}
            onClick={() => setMenu(menu === 'clear' ? null : 'clear')}
          >
            <Eraser size={16} />
          </IconButton>
          {menu === 'clear' && (
            <ClampedPopover width={220} onMouseDown={keepSelection}>
              <div style={{ padding: '2px 4px 8px', fontSize: 13, lineHeight: 1.4, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
                Remove all formatting (bold, colours, size, highlights, badges) from the selected text?
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <TextButton label="Cancel" onClick={() => setMenu(null)}>Cancel</TextButton>
                <button
                  type="button"
                  onClick={() => pick({ type: 'clear' })}
                  style={{
                    height: 28, padding: '0 12px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    background: 'var(--color-accent)', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
                  }}
                >
                  Clear
                </button>
              </div>
            </ClampedPopover>
          )}
        </div>

        <Divider />

        {/* Paragraph: heading style, list */}
        <div style={{ position: 'relative' }}>
          <IconButton
            label="Heading style"
            active={menu === 'heading' || !!active.heading}
            disabled={disabled}
            onClick={() => setMenu(menu === 'heading' ? null : 'heading')}
          >
            <Heading size={16} />
          </IconButton>
          {menu === 'heading' && (
            <ClampedPopover width={210} onMouseDown={keepSelection}>
              {HEADINGS.map(h => (
                <button
                  key={h.label}
                  type="button"
                  onClick={() => pick({ type: 'heading', value: h.level })}
                  style={{ ...menuRowStyle((active.heading ?? null) === h.level), display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <span style={h.preview}>{h.label}</span>
                  <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--color-text-tertiary)' }}>{h.hint}</span>
                </button>
              ))}
            </ClampedPopover>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <IconButton
            label="List"
            active={menu === 'list' || listActive}
            disabled={disabled}
            onClick={() => setMenu(menu === 'list' ? null : 'list')}
          >
            {active.olist ? <ListOrdered size={16} /> : <List size={16} />}
          </IconButton>
          {menu === 'list' && (
            <ClampedPopover width={170} onMouseDown={keepSelection}>
              <button type="button" onClick={() => pick({ type: 'list' })} style={{ ...menuRowStyle(!!active.list), display: 'flex', alignItems: 'center', gap: 8 }}>
                <List size={15} /> Bullet list
              </button>
              <button type="button" onClick={() => pick({ type: 'olist' })} style={{ ...menuRowStyle(!!active.olist), display: 'flex', alignItems: 'center', gap: 8 }}>
                <ListOrdered size={15} /> Numbered list
              </button>
            </ClampedPopover>
          )}
        </div>

        <Divider />

        {/* Insert: table, divider, drug link, class link */}
        <IconButton label="Add a table" disabled={disabled} onClick={() => pick({ type: 'table' })}>
          <Table size={16} />
        </IconButton>
        <IconButton label="Divider line" disabled={disabled} onClick={() => pick({ type: 'divider' })}>
          <Minus size={16} />
        </IconButton>
        <IconButton label="Link a drug" disabled={disabled} onClick={() => openPicker('drug')}>
          <Pill size={16} />
        </IconButton>
        <IconButton label="Link a class or drug family" disabled={disabled} onClick={() => openPicker('class')}>
          <MoleculeIcon size={17} />
        </IconButton>
        <TextLinkPicker kind={picker} onClose={() => setPicker(null)} onPick={handlePicked} />

        {painter !== undefined && (
          <>
            <Divider />
            {/* Format painter */}
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
                padding: '0 2px 0 6px', whiteSpace: 'nowrap',
              }}>
                {describePainter(painter)}
              </span>
            )}
            {painter && (
              <TextButton label="Forget the copied format" onClick={() => pick({ type: 'cancelFormat' })}>✕</TextButton>
            )}
          </>
        )}
      </div>

      {/* Line 2: table tools, only while the cursor is inside a table */}
      {active.inTable && (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2,
          paddingTop: 3, borderTop: '1px solid var(--color-border)',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-body)', padding: '0 6px', textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Table
          </span>
          <TextButton label="Add a row below" disabled={disabled} onClick={() => pick({ type: 'tableOp', op: 'addRow' })}>+ Row</TextButton>
          <TextButton label="Add a column to the right" disabled={disabled} onClick={() => pick({ type: 'tableOp', op: 'addCol' })}>+ Col</TextButton>
          <TextButton label="Delete this row" disabled={disabled} onClick={() => pick({ type: 'tableOp', op: 'delRow' })}>− Row</TextButton>
          <TextButton label="Delete this column" disabled={disabled} onClick={() => pick({ type: 'tableOp', op: 'delCol' })}>− Col</TextButton>
          <TextButton label="Delete the whole table" disabled={disabled} onClick={() => pick({ type: 'tableOp', op: 'delTable' })}>Delete table</TextButton>
        </div>
      )}
    </div>
  )
}
