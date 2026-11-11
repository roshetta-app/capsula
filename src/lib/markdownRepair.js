/**
 * markdownRepair — src/lib/markdownRepair.js
 *
 * Tidies up text that was pasted from an AI chat, a web page or a note, so the
 * text block editor shows it the way the writer meant it. Typical problems it fixes:
 *
 *   - table rows with no divider line under the first row  (Drug Class|Role|Examples)
 *   - table rows missing the outer bars
 *   - a list / heading / "---" line stuck right under a paragraph (a "---" under a
 *     line would otherwise turn that line into a heading)
 *   - a paragraph glued to the end of a list
 *   - "•" style bullets
 *   - a bold-only line ("**Additional Notes:**") sharing a paragraph with the next line
 *   - lines that were typed one under the other (kept as separate lines)
 *   - symbols switched off by a backslash at the start of a line, as Google Docs /
 *     Word exports do:  \---   1\.   \-   \#   (the backslash is removed so the
 *     divider line, numbered list, bullet or heading works again)
 *   - table rows that have blank lines between them (joined into one table)
 *
 * It never touches: fenced code, ::: card marker lines, tables that are already
 * proper, indented lines, or any wording. Running it twice gives the same result.
 *
 *   repairMarkdown(text)  ->  tidied text (the same string when nothing needed fixing)
 */

const FENCE = /^\s*(```|~~~)/
const CARD = /^\s*:::/
const HEADING = /^\s{0,3}#{1,6}\s/
const HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/
const LIST = /^\s*([-*+]|\d+[.)])\s+\S/
const BULLET_GLYPH = /^(\s*)[•●▪◦‣∙]\s+/
const QUOTE = /^\s*>/
const INDENTED = /^( {4,}|\t)/
const BOLD_ONLY = /^\s*(\*\*|__)(?!\s)[^*_]+?(?<!\s)\1\s*$/
const DELIM_ROW = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/
const UNESCAPED_PIPE = /(?<!\\)\|/

// Google Docs / Word exports switch off markdown symbols at the start of a line with
// a backslash: \--- , 1\. , \- , \# . Only these line-start cases are undone, so a
// backslash in the middle of a sentence is never touched.
const ESC_HR = /^(\s{0,3})\\(?=([-*_])(\s*\2){2,}\s*$)/
const ESC_BULLET = /^(\s*)\\(?=[-*+]\s+\S)/
const ESC_ORDERED = /^(\s*)(\d+)\\(?=[.)]\s+\S)/
const ESC_HEADING = /^(\s{0,3})\\(?=#{1,6}\s)/

function unescapeLine(line) {
  return line
    .replace(ESC_HR, '$1')
    .replace(ESC_BULLET, '$1')
    .replace(ESC_ORDERED, '$1$2')
    .replace(ESC_HEADING, '$1')
}

function splitCells(line) {
  const t = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '')
  return t.split(UNESCAPED_PIPE).map(c => c.trim())
}

function kindOf(line) {
  if (!line.trim()) return 'blank'
  if (CARD.test(line)) return 'card'
  if (HEADING.test(line)) return 'heading'
  if (HR.test(line)) return 'hr'
  if (DELIM_ROW.test(line)) return 'prose' // handled with its table
  if (INDENTED.test(line)) return 'raw'
  if (LIST.test(line)) return 'list'
  if (QUOTE.test(line)) return 'quote'
  if (BOLD_ONLY.test(line)) return 'title'
  return 'prose'
}

function isPipeRow(line) {
  return kindOf(unescapeLine(line)) === 'prose' && UNESCAPED_PIPE.test(line) && !FENCE.test(line)
}

// Groups the lines into items: blank, card, heading, hr, list, quote, title, raw,
// prose, fence (a whole fenced block) and table (a whole table block).
function toItems(lines) {
  const items = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (FENCE.test(line)) {
      const marker = line.trim().slice(0, 3)
      const block = [line]
      i += 1
      while (i < lines.length) {
        block.push(lines[i])
        if (lines[i].trim().startsWith(marker)) { i += 1; break }
        i += 1
      }
      items.push({ kind: 'fence', lines: block })
      continue
    }

    const fixedLine = unescapeLine(line).replace(BULLET_GLYPH, '$1- ')
    const kind = kindOf(fixedLine)
    const pipey = (kind === 'prose') && UNESCAPED_PIPE.test(line)

    if (pipey) {
      // collect pipe rows; blank lines between two pipe rows do not end the table
      const run = []
      let j = i
      let end = i
      while (j < lines.length) {
        if (isPipeRow(lines[j])) {
          run.push(lines[j])
          j += 1
          end = j
        } else if (!lines[j].trim()) {
          j += 1
        } else {
          break
        }
      }
      const table = tableFromRun(run)
      if (table) {
        items.push({ kind: 'table', lines: table })
        i = end
        continue
      }
    }

    items.push({ kind, line: fixedLine })
    i += 1
  }
  return items
}

// A run of pipe lines becomes a table when it is clearly one: at least two rows,
// the same number of columns (two or more) on every row. Returns the lines of the
// table, or null when the run is not a table.
function tableFromRun(run) {
  if (run.length < 2) return null

  // already a proper table (divider line right under the first row): leave it alone
  if (DELIM_ROW.test(run[1])) return run

  const rows = run.map(splitCells)
  const cols = rows[0].length
  if (cols < 2) return null
  if (!rows.every(r => r.length === cols)) return null
  if (rows.some(r => r.every(c => c === ''))) return null

  const line = cells => `| ${cells.join(' | ')} |`
  return [line(rows[0]), line(rows[0].map(() => '---')), ...rows.slice(1).map(line)]
}

const BLOCKY = new Set(['heading', 'hr', 'table', 'title', 'fence'])

function needsBlankBetween(prev, cur) {
  if (prev.kind === 'blank' || cur.kind === 'blank') return false
  if (prev.kind === 'card' || cur.kind === 'card') return false
  if (BLOCKY.has(prev.kind) || BLOCKY.has(cur.kind)) return true
  if (prev.kind === 'list' && (cur.kind === 'prose' || cur.kind === 'quote')) return true
  if ((prev.kind === 'prose' || prev.kind === 'quote') && cur.kind === 'list') return true
  if (prev.kind === 'quote' && cur.kind === 'prose') return true
  if (prev.kind === 'prose' && cur.kind === 'quote') return true
  return false
}

// Two prose lines one under the other stay two lines (a hard line break).
function needsHardBreak(prev, cur) {
  return prev.kind === 'prose' && cur.kind === 'prose'
}

export function repairMarkdown(text) {
  const original = text ?? ''
  if (!original.trim()) return original

  const lines = original.replace(/\r\n?/g, '\n').split('\n')
  const items = toItems(lines)

  const out = []
  for (let k = 0; k < items.length; k += 1) {
    const cur = items[k]
    const prev = items[k - 1]

    if (prev) {
      if (needsBlankBetween(prev, cur)) {
        out.push('')
      } else if (needsHardBreak(prev, cur)) {
        const last = out.length - 1
        if (!/( {2}|\\)$/.test(out[last])) out[last] = `${out[last].replace(/\s+$/, '')}  `
      }
    }

    if (cur.lines) out.push(...cur.lines)
    else out.push(cur.line)
  }

  const result = out.join('\n')
  return result === original ? original : result
}
