/**
 * richTextConvert — src/lib/richTextConvert.js
 *
 * Lets the text block editor work like a word processor while the saved text
 * stays exactly the same kind of text as before (markdown plus ::: cards plus
 * the small <u> / <span class="rt-..."> pieces), so the app and all old blocks
 * keep working.
 *
 *   markdownToEditorHtml(markdown)         saved text -> what the editing box shows
 *   editorToMarkdown(rootElement)          what the box shows -> saved text
 *   canEditVisually(markdown, doc?)        true when opening a block in the box and
 *                                          saving it again would look identical in
 *                                          the app (otherwise the editor falls back
 *                                          to the plain Code view for that block)
 *
 * Cards in the box:
 *   <div class="dir-card dir-card-warning" data-card="warning" data-title="..." contenteditable="false">
 *     <div class="dir-card-header" data-ui="1">Warning: ...</div>
 *     <div class="rt-card-body" contenteditable="true"> ...body... </div>
 *   </div>
 * Card types the app does not know (:::info, :::rx ...) are kept, and shown the
 * same way the app shows them (as plain text, no card box), so nothing is lost.
 */

import { marked } from 'marked'
import { DIRECTIVES, renderDirectiveMarkdown } from './directiveRenderer'
import { addAutoDir, applyAutoDir } from './autoDir'

// ─── saved text -> editor HTML ───────────────────────────────────────────────

function stripLooseListParagraphs(html) {
  return html.replace(/<li><p>([\s\S]*?)<\/p>\n?<\/li>/g, '<li>$1</li>')
}

function escAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escText(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function markdownToEditorHtml(raw) {
  const text = raw ?? ''
  if (!text.trim()) return '<p><br></p>'

  const blocks = {}
  let counter = 0

  const withPlaceholders = text.replace(
    /:::(\w+)(?: ([^\n]*))?\n([\s\S]*?):::/g,
    (match, type, title) => {
      const body = match.replace(/^:::(\w+)(?: ([^\n]*))?\n/, '').replace(/:::$/, '')
      const cfg = DIRECTIVES[type.toLowerCase()]
      let inner = stripLooseListParagraphs(marked.parse(body.trim(), { breaks: true, gfm: true }))
      if (!inner.trim()) inner = '<p><br></p>'
      const labelText = cfg ? (title ? `${cfg.label}: ${title}` : cfg.label) : ''
      const cls = cfg ? `dir-card ${cfg.cls}` : 'rt-plain-card'
      const header = cfg
        ? `<div class="dir-card-header" data-ui="1" contenteditable="false">${escText(labelText)}<button type="button" class="rt-card-remove" data-ui="1" data-action="remove-card" contenteditable="false" aria-label="Remove card">×</button></div>`
        : `<button type="button" class="rt-card-remove rt-card-remove-plain" data-ui="1" data-action="remove-card" contenteditable="false" aria-label="Remove block">×</button>`
      const html =
        `<div class="${cls}" data-card="${escAttr(type)}" data-title="${escAttr(title ?? '')}" dir="auto" contenteditable="false">` +
        header +
        `<div class="rt-card-body" contenteditable="true">${inner}</div></div>`
      const key = `DIRECTIVE_PLACEHOLDER_${counter++}_END`
      blocks[key] = html
      return `\n\n${key}\n\n`
    }
  )

  let html = stripLooseListParagraphs(marked.parse(withPlaceholders, { breaks: false, gfm: true }))
  Object.entries(blocks).forEach(([key, cardHtml]) => {
    html = html.replace(new RegExp(`<p>\\s*${key}\\s*</p>`, 'g'), () => cardHtml)
    html = html.replace(new RegExp(key, 'g'), () => cardHtml)
  })
  return addAutoDir(html)
}

// Makes sure the cursor can reach the spot before, between and after cards.
export function padCards(root) {
  const doc = root.ownerDocument
  const isCard = n => n && n.nodeType === 1 && n.getAttribute('data-card') !== null
  const blank = () => { const p = doc.createElement('p'); p.appendChild(doc.createElement('br')); return p }
  for (const card of Array.from(root.children).filter(isCard)) {
    if (!card.previousSibling || isCard(card.previousSibling)) root.insertBefore(blank(), card)
    if (!card.nextSibling || isCard(card.nextSibling)) root.insertBefore(blank(), card.nextSibling)
  }
  if (!root.firstChild) root.appendChild(blank())
  applyAutoDir(root)
}

// Empty card HTML for the toolbar's "insert card" choice.
export function newCardHtml(type) {
  const cfg = DIRECTIVES[type]
  if (!cfg) return ''
  return (
    `<div class="dir-card ${cfg.cls}" data-card="${escAttr(type)}" data-title="" dir="auto" contenteditable="false">` +
    `<div class="dir-card-header" data-ui="1" contenteditable="false">${escText(cfg.label)}<button type="button" class="rt-card-remove" data-ui="1" data-action="remove-card" contenteditable="false" aria-label="Remove card">×</button></div>` +
    `<div class="rt-card-body" contenteditable="true"><p><br></p></div></div>`
  )
}

// ─── editor DOM -> saved text ────────────────────────────────────────────────

const NBSP = /\u00a0/g
const HARD_BREAK = '  \n' // two spaces + newline = a line break inside a paragraph
const TRAILING_BREAKS = /(?: {2}\n)+$/g

// Escapes text so it shows literally when the saved text is displayed.
function escapeInline(s) {
  let t = s.replace(NBSP, ' ')
  t = t.replace(/\\/g, '\\\\')
  t = t.replace(/\*/g, '\\*')
  t = t.replace(/`/g, '\\`')
  t = t.replace(/~/g, '\\~')
  t = t.replace(/\[/g, '\\[').replace(/\]/g, '\\]')
  // an underscore only matters at the edge of a word
  t = t.replace(/(^|[^A-Za-z0-9])_/g, '$1\\_').replace(/_([^A-Za-z0-9]|$)/g, '\\_$1')
  t = t.replace(/&(?=#?\w+;)/g, '&amp;')
  t = t.replace(/</g, '&lt;')
  return t
}

// Keeps the spaces outside a bold/italic marker (markdown needs the marker
// to touch the word).
function wrapMarks(inner, open, close = open) {
  if (!inner.trim()) return inner
  const lead = inner.match(/^\s*/)[0]
  const trail = inner.match(/\s*$/)[0]
  return `${lead}${open}${inner.trim()}${close}${trail}`
}

function isUi(node) {
  return node.nodeType === 1 && (node.getAttribute('data-ui') === '1')
}

function inlineOf(node, ctx) {
  let out = ''
  for (const child of Array.from(node.childNodes)) out += inlineNode(child, ctx)
  return out
}

function inlineNode(n, ctx) {
  if (n.nodeType === 3) return escapeInline(n.nodeValue)
  if (n.nodeType !== 1 || isUi(n)) return ''
  const tag = n.tagName.toLowerCase()
  switch (tag) {
    case 'strong': case 'b': return wrapMarks(inlineOf(n, ctx), '**')
    case 'em': case 'i': return wrapMarks(inlineOf(n, ctx), '*')
    case 'u': return wrapMarks(inlineOf(n, ctx), '<u>', '</u>')
    case 'span': {
      const classes = Array.from(n.classList || []).filter(c => /^rt-[csbh]-[a-z]+$/.test(c))
      const inner = inlineOf(n, ctx)
      if (!classes.length || !inner.trim()) return inner
      return wrapMarks(inner, `<span class="${classes.join(' ')}">`, '</span>')
    }
    case 'br': return ctx.cell ? '<br>' : HARD_BREAK
    case 'a': {
      const href = (n.getAttribute('href') || '').replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29')
      const inner = inlineOf(n, ctx)
      return href ? `[${inner}](${href})` : inner
    }
    case 'code': {
      const t = n.textContent.replace(NBSP, ' ')
      const fence = t.includes('`') ? '``' : '`'
      return `${fence}${t}${fence}`
    }
    case 'font': case 'mark': return inlineOf(n, ctx)
    default: return inlineOf(n, ctx)
  }
}

const BLOCK_TAGS = new Set(['p', 'div', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'blockquote', 'hr', 'pre'])

function isBlockEl(n) {
  return n.nodeType === 1 && BLOCK_TAGS.has(n.tagName.toLowerCase())
}

// Stops a paragraph from turning into a heading / list / quote by accident.
function protectLineStart(line) {
  return line
    .replace(/^(\s*)(#{1,6})(\s)/, '$1\\$2$3')
    .replace(/^(\s*)([-+])(\s)/, '$1\\$2$3')
    .replace(/^(\s*)(\d+)([.)])(\s)/, '$1$2\\$3$4')
    .replace(/^(\s*)>/, '$1\\>')
    .replace(/^(\s*)(:::)/, '$1\\:::')
    .replace(/^(\s*)(-{3,}|_{3,}|={3,})\s*$/, '$1\\$2')
}

// Turns the children of a container into text blocks (separated by a blank line).
function blocksOf(container, ctx) {
  const out = []
  let run = [] // inline nodes waiting to become one paragraph

  const flush = () => {
    if (!run.length) return
    const holder = { childNodes: run }
    let text = inlineOf(holder, ctx).replace(/^(\s|&nbsp;)+|(\s|&nbsp;)+$/g, '')
    text = text.replace(TRAILING_BREAKS, '')
    if (text.trim()) out.push(protectLineStart(text))
    run = []
  }

  for (const child of Array.from(container.childNodes)) {
    if (child.nodeType === 1 && isUi(child)) continue
    if (child.nodeType === 3 || !isBlockEl(child)) { run.push(child); continue }
    flush()
    const s = blockNode(child, ctx)
    if (s !== null && s !== '') out.push(s)
  }
  flush()
  return out
}

function listToText(el, ctx) {
  const ordered = el.tagName.toLowerCase() === 'ol'
  let index = parseInt(el.getAttribute('start') || '1', 10)
  if (Number.isNaN(index)) index = 1
  const lines = []
  for (const li of Array.from(el.children)) {
    if (li.tagName.toLowerCase() !== 'li') continue
    const marker = ordered ? `${index}. ` : '- '
    index += 1
    const pad = ' '.repeat(marker.length)
    // the item's own text first, then any lists inside it
    const textNodes = []
    const nested = []
    for (const c of Array.from(li.childNodes)) {
      if (c.nodeType === 1 && (c.tagName.toLowerCase() === 'ul' || c.tagName.toLowerCase() === 'ol')) nested.push(c)
      else textNodes.push(c)
    }
    const holder = { childNodes: textNodes.flatMap(c => (c.nodeType === 1 && c.tagName.toLowerCase() === 'p') ? Array.from(c.childNodes) : [c]) }
    let text = inlineOf(holder, { ...ctx, cell: false }).replace(TRAILING_BREAKS, '').trim()
    text = text.split('\n').map((l, i) => (i === 0 ? l : pad + l)).join('\n')
    lines.push(marker + text)
    for (const nl of nested) {
      listToText(nl, ctx).split('\n').forEach(l => lines.push(pad + l))
    }
  }
  return lines.join('\n')
}

function tableToText(el, ctx) {
  const rows = Array.from(el.querySelectorAll('tr'))
  if (!rows.length) return ''
  const cellsOf = tr => Array.from(tr.children).filter(c => /^(th|td)$/i.test(c.tagName))
  const cellText = c => inlineOf(c, { ...ctx, cell: true }).replace(/\n/g, ' ').replace(/\|/g, '\\|').trim()
  const head = cellsOf(rows[0])
  const cols = head.length
  if (!cols) return ''
  const align = head.map(c => {
    const a = (c.getAttribute('align') || c.style?.textAlign || '').toLowerCase()
    return a === 'center' ? ':---:' : a === 'right' ? '---:' : a === 'left' ? ':---' : '---'
  })
  const line = cells => `| ${cells.join(' | ')} |`
  const out = [line(head.map(cellText)), line(align)]
  for (const tr of rows.slice(1)) {
    const cells = cellsOf(tr).map(cellText)
    while (cells.length < cols) cells.push('')
    out.push(line(cells.slice(0, cols)))
  }
  return out.join('\n')
}

function cardToText(el, ctx) {
  const type = el.getAttribute('data-card') || ''
  const title = (el.getAttribute('data-title') || '').trim()
  const body = Array.from(el.children).find(c => c.classList && c.classList.contains('rt-card-body')) || el
  const inner = blocksOf(body, ctx).join('\n\n')
  return `:::${type}${title ? ` ${title}` : ''}\n${inner}\n:::`
}

function blockNode(el, ctx) {
  const tag = el.tagName.toLowerCase()
  if (el.getAttribute && el.getAttribute('data-card')) return cardToText(el, ctx)
  if (/^h[1-6]$/.test(tag)) {
    const t = inlineOf(el, ctx).replace(TRAILING_BREAKS, '').trim()
    return t ? `${'#'.repeat(Number(tag[1]))} ${t}` : ''
  }
  switch (tag) {
    case 'ul': case 'ol': return listToText(el, ctx)
    case 'table': return tableToText(el, ctx)
    case 'hr': return '---'
    case 'blockquote': {
      const inner = blocksOf(el, ctx).join('\n\n')
      return inner.split('\n').map(l => `> ${l}`.trimEnd()).join('\n')
    }
    case 'pre': return '```\n' + el.textContent.replace(NBSP, ' ').replace(/\n$/, '') + '\n```'
    case 'p': {
      const t = inlineOf(el, ctx).replace(TRAILING_BREAKS, '').replace(/^(\s)+|(\s)+$/g, '')
      return t.trim() ? protectLineStart(t) : ''
    }
    case 'div': case 'li': {
      // a plain div (some keyboards make one on Enter): a paragraph, or a container
      const hasBlock = Array.from(el.childNodes).some(isBlockEl)
      if (!hasBlock) {
        const t = inlineOf(el, ctx).replace(TRAILING_BREAKS, '').replace(/^(\s)+|(\s)+$/g, '')
        return t.trim() ? protectLineStart(t) : ''
      }
      return blocksOf(el, ctx).join('\n\n')
    }
    default: return blocksOf(el, ctx).join('\n\n')
  }
}

export function editorToMarkdown(root) {
  return blocksOf(root, { cell: false }).join('\n\n')
}

// ─── safety check ────────────────────────────────────────────────────────────

function normalizeHtml(html) {
  return String(html ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim()
}

/**
 * True when opening `markdown` in the Word-style box and saving it again would
 * look the same in the app. If it returns false, the editor keeps that block in
 * the plain Code view instead of risking a change.
 */
export function canEditVisually(markdown, doc = globalThis.document) {
  try {
    if (!markdown || !markdown.trim()) return true
    const holder = doc.createElement('div')
    holder.innerHTML = markdownToEditorHtml(markdown)
    const back = editorToMarkdown(holder)
    return normalizeHtml(renderDirectiveMarkdown(markdown)) === normalizeHtml(renderDirectiveMarkdown(back))
  } catch {
    return false
  }
}
