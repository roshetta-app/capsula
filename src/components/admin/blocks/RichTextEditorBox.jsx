/**
 * RichTextEditorBox — src/components/admin/blocks/RichTextEditorBox.jsx
 *
 * The "Write" view of a text block: a box that looks like the finished text
 * (bold is bold, colours are colours, bullets are bullets, cards are cards)
 * and is edited like a word processor. No code is shown.
 *
 * The saved text is the same kind of text as before (markdown + ::: cards +
 * <u> / <span class="rt-..."> pieces); src/lib/richTextConvert.js turns it into
 * what this box shows and back. The box only writes back when the person types
 * or formats something, so just opening a block never changes it.
 *
 * Props:
 *   value      saved text (markdown)
 *   onChange   (markdown) => void
 *   disabled   freezes the box while the page saves
 *   placeholder
 *
 * Contains its own formatting toolbar (RichTextToolbar), pinned at the top of the screen
 * while you scroll (StickyBar), with copy / paste format buttons, plus a
 * "Card" button for adding warning / dose / ... cards.
 */

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { LayoutPanelTop } from 'lucide-react'
import RichTextToolbar, { EMPTY_ACTIVE } from './RichTextToolbar'
import StickyBar from './StickyBar'
import { markdownToEditorHtml, editorToMarkdown, newCardHtml, padCards } from '../../../lib/richTextConvert'
import { applyAutoDir } from '../../../lib/autoDir'
import { DIRECTIVES } from '../../../lib/directiveRenderer'
import { repairMarkdown } from '../../../lib/markdownRepair'

// ─── Small helpers ───────────────────────────────────────────────────────────

function escText(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function selectionRangeIn(root) {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return null
  const r = sel.getRangeAt(0)
  return root.contains(r.commonAncestorContainer) ? r : null
}

// Text that can be edited: its nearest contenteditable owner is on, and it is
// not part of a card's title strip or remove button.
function isEditableText(n) {
  if (!n.nodeValue) return false
  const host = n.parentElement
  if (!host || host.closest('[data-ui="1"]')) return false
  const owner = host.closest('[contenteditable]')
  return !!owner && owner.getAttribute('contenteditable') !== 'false'
}

function expandCollapsedToWord(range) {
  const node = range.startContainer
  if (node.nodeType !== 3) return false
  const text = node.nodeValue
  let a = range.startOffset
  let b = range.startOffset
  while (a > 0 && /\S/.test(text[a - 1])) a -= 1
  while (b < text.length && /\S/.test(text[b])) b += 1
  if (a === b) return false
  range.setStart(node, a)
  range.setEnd(node, b)
  return true
}

// Splits the text pieces at the edges of the selection and returns the pieces inside it.
function textPiecesInRange(root, range) {
  let sc = range.startContainer
  const so = range.startOffset
  let ec = range.endContainer
  const eo = range.endOffset
  if (ec.nodeType === 3 && eo < ec.length) ec.splitText(eo)
  if (sc.nodeType === 3 && so > 0) {
    const tail = sc.splitText(so)
    if (sc === ec) ec = tail
    sc = tail
  }
  // after splitting, point the selection exactly at the pieces that are inside it
  if (sc.nodeType === 3) range.setStart(sc, 0)
  if (ec.nodeType === 3) range.setEnd(ec, ec.length)
  const walker = document.createTreeWalker(range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer, NodeFilter.SHOW_TEXT)
  const pieces = []
  let n = walker.currentNode
  if (n.nodeType !== 3) n = walker.nextNode()
  while (n) {
    if (range.intersectsNode(n) && isEditableText(n)) pieces.push(n)
    n = walker.nextNode()
  }
  return pieces
}

// Gives `node` its own copy of every wrapper up to `ancestor`, so a change to
// the ancestor only touches `node`.
function isolate(node, ancestor) {
  let cur = node
  while (cur !== ancestor) {
    const parent = cur.parentNode
    if (cur.previousSibling) {
      const before = parent.cloneNode(false)
      while (parent.firstChild !== cur) before.appendChild(parent.firstChild)
      parent.parentNode.insertBefore(before, parent)
    }
    if (cur.nextSibling) {
      const after = parent.cloneNode(false)
      while (cur.nextSibling) after.appendChild(cur.nextSibling)
      parent.parentNode.insertBefore(after, parent.nextSibling)
    }
    cur = parent
  }
}

function unwrap(el) {
  const parent = el.parentNode
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  parent.removeChild(el)
}

// kind 'c' (colour), 's' (size), 'h' (highlighter) or 'b' (badge); value null = back to normal.
function applySpanClass(root, kind, value) {
  const range = selectionRangeIn(root)
  if (!range) return false
  if (range.collapsed && !expandCollapsedToWord(range)) return false
  const prefix = `rt-${kind}-`
  const pieces = textPiecesInRange(root, range)
  if (!pieces.length) return false
  for (const t of pieces) {
    let span = t.parentElement
    while (span && span !== root && !(span.tagName === 'SPAN' && Array.from(span.classList).some(c => c.startsWith(prefix)))) span = span.parentElement
    if (span && span !== root) {
      isolate(t, span)
      Array.from(span.classList).filter(c => c.startsWith(prefix)).forEach(c => span.classList.remove(c))
      if (value) span.classList.add(prefix + value)
      else if (!span.classList.length) unwrap(span)
    } else if (value) {
      const w = document.createElement('span')
      w.className = prefix + value
      t.parentNode.insertBefore(w, t)
      w.appendChild(t)
    }
  }
  const sel = window.getSelection()
  const r = document.createRange()
  r.setStartBefore(pieces[0])
  r.setEndAfter(pieces[pieces.length - 1])
  sel.removeAllRanges()
  sel.addRange(r)
  return true
}

// Gives the selected text (or the word at the cursor) the copied look: bold, italic,
// underline, colour and size each end up exactly as copied, including "off".
function pasteFormat(root, look) {
  const range = selectionRangeIn(root)
  if (!range) return
  if (range.collapsed && !expandCollapsedToWord(range)) return
  for (const [flag, cmd] of [['b', 'bold'], ['i', 'italic'], ['u', 'underline']]) {
    let on = false
    try { on = document.queryCommandState(cmd) } catch { /* ignore */ }
    if (on !== !!look[flag]) document.execCommand(cmd)
  }
  applySpanClass(root, 'c', look.color)
  applySpanClass(root, 's', look.size)
  applySpanClass(root, 'h', look.highlight ?? null)
  applySpanClass(root, 'b', look.badge ?? null)
}

// The table cell the cursor is in, or null.
function tableCellAt(root) {
  const range = selectionRangeIn(root)
  if (!range) return null
  const n = range.startContainer
  const host = n.nodeType === 3 ? n.parentElement : n
  const cell = host?.closest?.('td, th')
  return cell && root.contains(cell) ? cell : null
}

function newCell(tag) {
  const c = document.createElement(tag)
  c.appendChild(document.createElement('br'))
  return c
}

function placeCaretIn(node) {
  if (!node) return
  const r = document.createRange()
  r.selectNodeContents(node)
  r.collapse(true)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(r)
}

// Add / delete a row or column of the table the cursor is in. Returns true when it did something.
function tableOpDom(root, op) {
  const cell = tableCellAt(root)
  if (!cell) return false
  const row = cell.parentElement
  const table = cell.closest('table')
  const rows = Array.from(table.rows)
  const rIdx = rows.indexOf(row)
  const cIdx = cell.cellIndex
  const cols = row.cells.length
  let focus = cell
  if (op === 'delTable' || (op === 'delCol' && cols <= 1)) {
    const after = table.nextElementSibling
    table.remove()
    if (!root.firstChild) root.appendChild(Object.assign(document.createElement('p'), { innerHTML: '<br>' }))
    placeCaretIn(after || root.lastElementChild)
    return true
  }
  if (op === 'addRow') {
    const tr = document.createElement('tr')
    for (let i = 0; i < cols; i += 1) tr.appendChild(newCell('td'))
    if (rIdx === 0) {
      let tb = table.tBodies[0]
      if (!tb) { tb = document.createElement('tbody'); table.appendChild(tb) }
      tb.insertBefore(tr, tb.firstChild)
    } else {
      row.parentNode.insertBefore(tr, row.nextSibling)
    }
    focus = tr.cells[Math.min(cIdx, tr.cells.length - 1)]
  } else if (op === 'delRow') {
    if (rIdx === 0) return false
    const near = rows[rIdx + 1] || rows[rIdx - 1]
    row.remove()
    focus = near.cells[Math.min(cIdx, near.cells.length - 1)]
  } else if (op === 'addCol') {
    rows.forEach((r, i) => {
      const ref = r.cells[cIdx]
      r.insertBefore(newCell(i === 0 ? 'th' : 'td'), ref ? ref.nextSibling : null)
    })
    focus = row.cells[cIdx + 1]
  } else if (op === 'delCol') {
    rows.forEach(r => { if (r.cells[cIdx]) r.cells[cIdx].remove() })
    focus = row.cells[Math.min(cIdx, row.cells.length - 1)]
  } else return false
  placeCaretIn(focus)
  return true
}

function looksLikeMarkdown(t) {
  return /(^|\n)\s*(#{1,6} |[-*+] |\d+[.)] |> |:::|\|.*\|)/.test(t)
    || /(^|\n)\s*([-*_])(\s*\2){2,}\s*(\n|$)/.test(t)
    || /\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/.test(t)
}

function plainToHtml(t) {
  const lines = t.replace(/\r/g, '').split('\n')
  return lines.map(l => `<p>${l.trim() ? escText(l) : '<br>'}</p>`).join('')
}

// ─── Card menu ───────────────────────────────────────────────────────────────

function CardMenu({ onPick, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const menuRef = useRef(null)

  // The Card button can sit at the far right of a narrow screen: slide the menu back
  // inside the editor box (and the screen) instead of letting it run off the edge.
  useLayoutEffect(() => {
    if (!open) return
    const host = ref.current
    const menu = menuRef.current
    if (!host || !menu) return
    const box = (host.closest('[data-rt-box]') || document.body).getBoundingClientRect()
    const lo = Math.max(box.left, 0) + 4
    const hi = Math.min(box.right, window.innerWidth) - 4
    const btnLeft = host.getBoundingClientRect().left
    let left = btnLeft
    if (left + menu.offsetWidth > hi) left = hi - menu.offsetWidth
    if (left < lo) left = lo
    menu.style.left = `${Math.round(left - btnLeft)}px`   // set directly: no flash, no extra render
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        disabled={disabled}
        onMouseDown={e => e.preventDefault()}
        onClick={() => setOpen(v => !v)}
        aria-label="Add a card"
        title="Add a card"
        style={{
          display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px',
          fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
          color: 'var(--color-text-secondary)', background: 'var(--color-bg)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        }}
      >
        <LayoutPanelTop size={14} /> Card
      </button>
      {open && (
        <div
          ref={menuRef}
          onMouseDown={e => e.preventDefault()}
          style={{
            position: 'absolute', top: 36, left: 0, zIndex: 50, minWidth: 170, maxWidth: 'min(240px, calc(100vw - 48px))',
            maxHeight: '55vh', overflowY: 'auto',
            background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: 4,
          }}
        >
          {Object.entries(DIRECTIVES).map(([type, cfg]) => (
            <button
              key={type}
              type="button"
              onClick={() => { setOpen(false); onPick(type) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px',
                fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)',
                background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer',
              }}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── The box ─────────────────────────────────────────────────────────────────

const EDITOR_CSS = `
.rt-editor { min-height: 160px; padding: var(--space-3); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); background: var(--color-bg); outline: none; box-sizing: border-box;
  -webkit-user-select: text; user-select: text; caret-color: var(--color-accent); }
.rt-editor:focus { border-color: var(--color-accent); }
.rt-editor[contenteditable="false"] { opacity: 0.6; }
.rt-editor .dir-card { position: relative; margin: 10px 0; }
.rt-editor .rt-card-body { outline: none; min-height: 1.6em; }
.rt-editor .rt-card-body > :last-child { margin-bottom: 0; }
.rt-editor .dir-card-header { display: flex; align-items: center; justify-content: flex-start; gap: 8px; }
.rt-editor .rt-card-remove { margin-inline-start: auto; border: none; background: none; cursor: pointer; font-size: 18px; line-height: 1;
  padding: 0 4px; color: var(--color-text-tertiary); }
.rt-editor .rt-plain-card { position: relative; margin: 8px 0; padding: 6px 28px 2px 8px;
  border: 1px dashed var(--color-border); border-radius: 8px; }
.rt-editor .rt-plain-card .rt-card-remove-plain { position: absolute; top: 2px; right: 4px; }
.rt-editor table { border-collapse: collapse; width: 100%; margin: 8px 0; }
.rt-editor th, .rt-editor td { border: 1px solid var(--color-border); padding: 4px 8px; text-align: start; }
.rt-editor-placeholder { position: absolute; top: var(--space-3); inset-inline-start: var(--space-3);
  right: var(--space-3); pointer-events: none; font-size: 14px; color: var(--color-text-tertiary);
  font-family: var(--font-body); }
`

export default function RichTextEditorBox({ value, onChange, disabled = false, history, placeholder = 'Write here. Select text and use the toolbar.' }) {
  const elRef = useRef(null)
  const lastEmitted = useRef(null)
  const [active, setActive] = useState(EMPTY_ACTIVE)
  const [painter, setPainter] = useState(null) // copied look: { b, i, u, color, size }
  const [empty, setEmpty] = useState(!(value ?? '').trim())

  // Put the saved text into the box (first time, and whenever it is changed from
  // outside, e.g. undo, or coming back from the Code view).
  useLayoutEffect(() => {
    const el = elRef.current
    if (!el) return
    if (lastEmitted.current === value) return
    el.innerHTML = markdownToEditorHtml(value ?? '')
    padCards(el)
    lastEmitted.current = value ?? ''
    setEmpty(!(value ?? '').trim())
  }, [value])

  // step = true for a toolbar choice, a pasted block, a card ... (its own Undo step);
  // typing is grouped into steps by the parent.
  const emit = useCallback((step = false) => {
    const el = elRef.current
    if (!el) return
    applyAutoDir(el)   // new lines typed or pasted get their own direction
    const md = editorToMarkdown(el)
    lastEmitted.current = md
    setEmpty(!md.trim())
    onChange(md, { step: step === true })
  }, [onChange])

  // The look of the text at the cursor / selection, or null when the cursor is elsewhere.
  const computeActive = useCallback(() => {
    const el = elRef.current
    if (!el) return null
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount || !el.contains(sel.anchorNode)) return null
    const host = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode
    const find = prefix => {
      const s = host?.closest?.(`span[class*="${prefix}"]`)
      const c = s && Array.from(s.classList).find(x => x.startsWith(prefix))
      return c ? c.slice(prefix.length) : null
    }
    let b = false; let i = false; let u = false; let list = false; let olist = false
    let sub = false; let sup = false
    try {
      sub = document.queryCommandState('subscript')
      sup = document.queryCommandState('superscript')
      b = document.queryCommandState('bold')
      i = document.queryCommandState('italic')
      u = document.queryCommandState('underline')
      list = document.queryCommandState('insertUnorderedList')
      olist = document.queryCommandState('insertOrderedList')
    } catch { /* not supported: buttons just stay unlit */ }
    const h = host?.closest?.('h2, h3, h4')
    const heading = h && el.contains(h) ? Number(h.tagName[1]) : null
    const inTable = !!host?.closest?.('td, th')
    return { b, i, u, sub, sup, color: find('rt-c-'), size: find('rt-s-'), highlight: find('rt-h-'), badge: find('rt-b-'), list, olist, heading, inTable }
  }, [])

  const readActive = useCallback(() => {
    const next = computeActive()
    if (!next) return
    setActive(prev => (Object.keys(next).every(k => prev[k] === next[k]) ? prev : next))
  }, [computeActive])

  useEffect(() => {
    document.addEventListener('selectionchange', readActive)
    return () => document.removeEventListener('selectionchange', readActive)
  }, [readActive])

  function runAction(action) {
    const el = elRef.current
    if (!el || disabled) return
    if (action.type === 'undo') { history?.undo(); return }
    if (action.type === 'redo') { history?.redo(); return }
    el.focus()
    try { document.execCommand('styleWithCSS', false, false) } catch { /* ignore */ }
    if (action.type === 'copyFormat') {
      // remember the look of the selected text; the text itself is not changed
      const now = computeActive() ?? active
      setPainter({ b: !!now.b, i: !!now.i, u: !!now.u, color: now.color ?? null, size: now.size ?? null, highlight: now.highlight ?? null, badge: now.badge ?? null })
      return
    }
    if (action.type === 'pasteFormat') {
      if (!painter) return
      pasteFormat(el, painter)
    } else if (action.type === 'toggle') {
      document.execCommand({ b: 'bold', i: 'italic', u: 'underline', sub: 'subscript', sup: 'superscript' }[action.id])
    } else if (action.type === 'list') {
      document.execCommand('insertUnorderedList')
    } else if (action.type === 'color') {
      applySpanClass(el, 'c', action.value)
    } else if (action.type === 'size') {
      applySpanClass(el, 's', action.value)
    } else if (action.type === 'highlight') {
      applySpanClass(el, 'h', action.value)
    } else if (action.type === 'badge') {
      applySpanClass(el, 'b', action.value)
    } else if (action.type === 'olist') {
      document.execCommand('insertOrderedList')
    } else if (action.type === 'heading') {
      // choosing the level the line already has turns it back into normal text
      const nowLevel = computeActive()?.heading ?? null
      const tag = action.value && action.value !== nowLevel ? `H${action.value}` : 'P'
      document.execCommand('formatBlock', false, tag)
    } else if (action.type === 'table') {
      insertTable()
      return
    } else if (action.type === 'divider') {
      insertDivider()
      return
    } else if (action.type === 'tableOp') {
      if (!tableOpDom(el, action.op)) return
    } else if (action.type === 'symbol') {
      document.execCommand('insertText', false, action.value)
    } else if (action.type === 'clear') {
      document.execCommand('removeFormat')
      applySpanClass(el, 'c', null)
      applySpanClass(el, 's', null)
      applySpanClass(el, 'h', null)
      applySpanClass(el, 'b', null)
    }
    emit(true)
    readActive()
  }

  function insertCard(type) {
    const el = elRef.current
    if (!el || disabled) return
    const html = newCardHtml(type)
    if (!html) return
    // after the top-level block the cursor is in (or at the end)
    let anchor = null
    const range = selectionRangeIn(el)
    if (range) {
      anchor = range.startContainer
      while (anchor && anchor.parentNode !== el) anchor = anchor.parentNode
    }
    const tpl = document.createElement('template')
    tpl.innerHTML = html
    const card = tpl.content.firstElementChild
    if (anchor) el.insertBefore(card, anchor.nextSibling)
    else el.appendChild(card)
    padCards(el)
    const body = card.querySelector('.rt-card-body')
    body.focus()
    const r = document.createRange()
    r.selectNodeContents(body.firstChild || body)
    r.collapse(true)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(r)
    emit(true)
  }

  // Puts a block (table, divider) after the block the cursor is in, with an empty
  // line after it so the cursor can always get out. Inside a card it stays in the card.
  function placeBlockAfterCursor(block) {
    const el = elRef.current
    const range = selectionRangeIn(el)
    const host = range
      ? (range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer)
      : null
    const container = host?.closest?.('.rt-card-body') || el
    let anchor = null
    if (range) {
      anchor = range.startContainer
      while (anchor && anchor.parentNode !== container) anchor = anchor.parentNode
      if (anchor && !container.contains(anchor)) anchor = null
    }
    const after = document.createElement('p')
    after.appendChild(document.createElement('br'))
    if (anchor) {
      container.insertBefore(block, anchor.nextSibling)
      container.insertBefore(after, block.nextSibling)
    } else {
      container.appendChild(block)
      container.appendChild(after)
    }
    padCards(el)
    return after
  }

  // A small starter table (2 columns, 2 rows) after the block the cursor is in.
  function insertTable() {
    const el = elRef.current
    if (!el || disabled) return
    el.focus()
    const tpl = document.createElement('template')
    tpl.innerHTML =
      '<table><thead><tr><th>Column 1</th><th>Column 2</th></tr></thead>' +
      '<tbody><tr><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td></tr></tbody></table>'
    const table = tpl.content.firstElementChild
    placeBlockAfterCursor(table)
    placeCaretIn(table.querySelector('th'))
    emit(true)
    readActive()
  }

  function insertDivider() {
    const el = elRef.current
    if (!el || disabled) return
    el.focus()
    const after = placeBlockAfterCursor(document.createElement('hr'))
    placeCaretIn(after)
    emit(true)
    readActive()
  }

  function handleClick(e) {
    const btn = e.target.closest?.('[data-action="remove-card"]')
    if (!btn || disabled) return
    e.preventDefault()
    const card = btn.closest('[data-card]')
    if (card) {
      card.remove()
      padCards(elRef.current)
      emit(true)
    }
  }

  function handlePaste(e) {
    if (disabled) return
    const text = e.clipboardData?.getData('text/plain')
    if (text == null) return
    e.preventDefault()
    insertSmartText(text)
  }

  // Shared by normal paste, drag-and-drop and keyboard / phone clipboard inserts, so
  // every way of getting text in is tidied the same way.
  function insertSmartText(text) {
    const insideCard = !!window.getSelection()?.anchorNode?.parentElement?.closest?.('.rt-card-body')
    let html
    // tidy pasted text first (tables with no divider line, lists stuck under a
    // paragraph, ...) so it shows the way the writer meant it
    const fixed = repairMarkdown(text)
    if (looksLikeMarkdown(fixed)) {
      html = markdownToEditorHtml(fixed)
      if (insideCard) {
        // a card cannot go inside another card: keep only the card's text
        const tpl = document.createElement('template')
        tpl.innerHTML = html
        tpl.content.querySelectorAll('[data-card]').forEach(c => {
          const body = c.querySelector('.rt-card-body')
          const frag = document.createDocumentFragment()
          while (body && body.firstChild) frag.appendChild(body.firstChild)
          c.replaceWith(frag)
        })
        html = tpl.innerHTML
      }
    } else {
      html = plainToHtml(text)
    }
    document.execCommand('insertHTML', false, html)
    padCards(elRef.current)
    emit(true)
  }

  // Some ways of inserting text (the phone keyboard's clipboard strip, drag-and-drop)
  // never fire a paste event. Without this they were typed in as plain lines and the
  // symbols (##, -, :::) came out escaped. Multi-line inserts now take the smart route.
  const smartInsertRef = useRef(null)
  smartInsertRef.current = { insertSmartText, disabled }
  useEffect(() => {
    const el = elRef.current
    if (!el) return undefined
    function onBeforeInput(e) {
      const { insertSmartText: insert, disabled: off } = smartInsertRef.current
      if (off) return
      const kind = e.inputType
      if (kind !== 'insertText' && kind !== 'insertFromPaste' && kind !== 'insertFromDrop'
        && kind !== 'insertReplacementText') return
      const text = e.dataTransfer?.getData('text/plain') ?? e.data
      if (typeof text !== 'string' || !text.includes('\n')) return
      e.preventDefault()
      insert(text)
    }
    el.addEventListener('beforeinput', onBeforeInput)
    return () => el.removeEventListener('beforeinput', onBeforeInput)
  }, [])

  // Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Y) use the block's own history, so they also undo
  // toolbar choices, which the browser's own undo does not know about.
  function handleKeyDown(e) {
    if (!history || !(e.ctrlKey || e.metaKey) || e.altKey) return
    const k = e.key.toLowerCase()
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); history.undo() }
    else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); history.redo() }
  }

  function handleFocus() {
    try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch { /* ignore */ }
  }

  return (
    <div data-rt-box style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <style>{EDITOR_CSS}</style>
      <StickyBar style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <RichTextToolbar active={active} onAction={runAction} disabled={disabled} painter={painter}
            canUndo={!!history?.canUndo} canRedo={!!history?.canRedo} />
        </div>
        <CardMenu onPick={insertCard} disabled={disabled} />
      </StickyBar>
      <div style={{ position: 'relative' }}>
        <div
          ref={elRef}
          className="dir-prose rt-editor"
          dir="auto"
          contentEditable={!disabled}
          suppressContentEditableWarning
          spellCheck
          role="textbox"
          aria-multiline="true"
          aria-label="Text"
          onInput={() => emit()}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onPaste={handlePaste}
          onFocus={handleFocus}
        />
        {empty && <div className="rt-editor-placeholder" aria-hidden="true">{placeholder}</div>}
      </div>
    </div>
  )
}
