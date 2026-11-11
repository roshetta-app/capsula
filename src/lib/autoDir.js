/**
 * autoDir — src/lib/autoDir.js
 *
 * Mixed Arabic / English text needs a direction PER LINE, not one for the whole
 * block. A block that starts in Arabic used to push every English bullet, number
 * and line to the Arabic side. Giving each paragraph, list item, heading, quote and
 * table cell its own dir="auto" lets the browser pick the side from the first
 * letter of that line, so the bullet or number also moves to the correct side.
 *
 *   addAutoDir(html)    -> html string with dir="auto" added (display + preview)
 *   applyAutoDir(root)  -> same thing on live editor elements (Write view)
 *
 * Elements that already have a dir are left alone. Code blocks are not touched.
 */

const TAGS = 'p|li|h[1-6]|blockquote|th|td|table'
const TAG_RE = new RegExp(`<(${TAGS})(?=[\\s>])([^>]*)>`, 'g')

export function addAutoDir(html) {
  if (!html) return html
  return html.replace(TAG_RE, (match, tag, attrs) =>
    /\sdir\s*=/.test(attrs) ? match : `<${tag} dir="auto"${attrs}>`)
}

const SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, th, td, table, .rt-card-body > div'

export function applyAutoDir(root) {
  if (!root) return
  const mark = el => { if (!el.hasAttribute('dir')) el.setAttribute('dir', 'auto') }
  root.querySelectorAll(SELECTOR).forEach(mark)
  // plain lines the browser creates when you press Enter in the editor
  Array.from(root.children).forEach(el => {
    if (el.tagName === 'DIV' && el.getAttribute('data-card') === null) mark(el)
  })
}
