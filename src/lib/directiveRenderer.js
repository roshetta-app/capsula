/**
 * directiveRenderer.js — src/lib/directiveRenderer.js
 *
 * Shared markdown + directive renderer for Capsula.
 * Used by both FreeTextPostBlock (app reader) and FreeTextPostEditor (CMS preview).
 *
 * Render pipeline (order is critical):
 *   1. Extract :::type [title]\n body \n::: blocks via regex
 *   2. Render each directive body independently with marked.parse()
 *   3. Store each rendered card HTML under a unique placeholder key
 *   4. Run marked.parse() on the remaining clean markdown text
 *      (marked never sees card HTML — only placeholder tokens)
 *   5. Swap placeholder tokens back into the final HTML string
 *   6. Caller sets innerHTML / dangerouslySetInnerHTML with result
 *
 * To add a new directive type:
 *   1. Add one entry to DIRECTIVES below
 *   2. Add one CSS class block to globals.css (dir-card-<type>)
 *   3. Update the AI prompt in Supabase cms_config (Phase 2)
 *   No other changes needed.
 */

import { marked } from 'marked'

// ─── Directive config ──────────────────────────────────────────────────────────

export const DIRECTIVES = {
  info:              { icon: 'ℹ️',  label: 'Note',                cls: 'dir-card-info' },
  warning:           { icon: '⚠️',  label: 'Warning',             cls: 'dir-card-warning' },
  danger:            { icon: '🔴',  label: 'Danger',              cls: 'dir-card-danger' },
  redflags:          { icon: '🚩',  label: 'Red Flags',           cls: 'dir-card-redflags' },
  tip:               { icon: '💡',  label: 'Clinical Pearl',      cls: 'dir-card-tip' },
  success:           { icon: '✅',  label: 'Key Point',           cls: 'dir-card-success' },
  dose:              { icon: '💊',  label: 'Dosage',              cls: 'dir-card-dose' },
  rx:                { icon: '📋',  label: 'Sample Prescription', cls: 'dir-card-rx' },
  note:              { icon: '📝',  label: 'Note',                cls: 'dir-card-note' },
  contraindications: { icon: '🚫',  label: 'Contraindications',   cls: 'dir-card-contraindications' },
  pearls:            { icon: '✨',  label: 'Clinical Pearls',     cls: 'dir-card-pearls' },
}

// ─── Renderer ──────────────────────────────────────────────────────────────────

/**
 * renderDirectiveMarkdown(raw: string) → string (HTML)
 *
 * Converts raw markdown (with optional ::: directive blocks) into an HTML string.
 * Safe to call on every keystroke — pure function, no side effects.
 */
export function renderDirectiveMarkdown(raw) {
  if (!raw?.trim()) return ''

  const blocks = {}
  let counter = 0

  // Step 1 — Extract directive blocks, render each independently, store with placeholder key.
  // Regex: :::word [optional title]\n body \n:::
  const withPlaceholders = raw.replace(
    /:::(\w+)(?: ([^\n]*))?\n([\s\S]*?):::/g,
    (match, type, title, body) => {
      const cfg = DIRECTIVES[type.toLowerCase()]
      if (!cfg) return match // unknown type — leave as-is

      const labelText = title ? `${cfg.label}: ${title}` : cfg.label
      const innerHtml = marked.parse(body.trim(), { breaks: true, gfm: true })

      const cardHtml = `<div class="dir-card ${cfg.cls}" dir="auto">
  <div class="dir-card-header">
    <span class="dir-card-icon">${cfg.icon}</span>${labelText}
  </div>
  ${innerHtml}</div>`

      const key = `DIRECTIVE_PLACEHOLDER_${counter++}`
      blocks[key] = cardHtml
      // Surround with blank lines so marked treats the token as its own paragraph block
      return `\n\n${key}\n\n`
    }
  )

  // Step 2 — Run marked on clean markdown only (no card HTML present).
  let html = marked.parse(withPlaceholders, { breaks: false, gfm: true })

  // Step 3 — Swap placeholders back.
  // marked may have wrapped them in <p> tags — strip those too.
  Object.entries(blocks).forEach(([key, cardHtml]) => {
    html = html.replace(new RegExp(`<p>\\s*${key}\\s*</p>`, 'g'), cardHtml)
    html = html.replace(new RegExp(key, 'g'), cardHtml) // fallback if not wrapped
  })

  return html
}
