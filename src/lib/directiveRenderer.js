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
 *   3. Update the AI prompt in Supabase cms_config (table: cms_config, key: directive_ai_prompt)
 *   No other changes needed.
 *
 * CARD INVENTORY (8 types — reduced from 12):
 *   Safety:   danger, warning, redflags, contraindications
 *   Dosing:   dose
 *   Clinical: criteria, tip, pearls
 *
 * REMOVED (Phase 5 redesign):
 *   rx       → merged into dose (one drug format, one card type)
 *   info     → use plain prose under a ### heading instead
 *   note     → use plain prose; if critical enough for a card, use warning
 *   success  → use plain prose bold sentence; avoids card inflation
 */

import { marked } from 'marked'

// ─── Directive config ──────────────────────────────────────────────────────────

export const DIRECTIVES = {
  // Safety
  danger:            { label: 'Danger',             cls: 'dir-card-danger' },
  warning:           { label: 'Warning',            cls: 'dir-card-warning' },
  redflags:          { label: 'Red Flags',          cls: 'dir-card-redflags' },
  contraindications: { label: 'Contraindications',  cls: 'dir-card-contraindications' },
  // Dosing
  dose:              { label: 'Dosing',             cls: 'dir-card-dose' },
  // Clinical
  criteria:          { label: 'Criteria',           cls: 'dir-card-criteria' },
  tip:               { label: 'Clinical Pearl',     cls: 'dir-card-tip' },
  pearls:            { label: 'Clinical Pearls',    cls: 'dir-card-pearls' },
}

// ─── Renderer ──────────────────────────────────────────────────────────────────

/**
 * renderDirectiveMarkdown(raw: string) → string (HTML)
 *
 * Converts raw markdown (with optional ::: directive blocks) into an HTML string.
 * Safe to call on every keystroke — pure function, no side effects.
 *
 * Unknown directive types (including removed types like :::rx, :::info, :::note, :::success)
 * fall back to plain prose — prevents raw ::: text leaking into the rendered output.
 */
export function renderDirectiveMarkdown(raw) {
  if (!raw?.trim()) return ''

  const blocks = {}
  let counter = 0

  // Step 1 — Extract directive blocks, render each independently, store with placeholder key.
  const withPlaceholders = raw.replace(
    /:::(\w+)(?: ([^\n]*))?\n([\s\S]*?):::/g,
    (match, type, title, body) => {
      const cfg = DIRECTIVES[type.toLowerCase()]

      // Unknown or removed directive type — render body as plain prose, discard the wrapper.
      if (!cfg) {
        const fallbackHtml = marked.parse(body.trim(), { breaks: true, gfm: true })
        const key = `DIRECTIVE_PLACEHOLDER_${counter++}`
        blocks[key] = fallbackHtml
        return `\n\n${key}\n\n`
      }

      // Build header: "LABEL" or "LABEL: Title" when a title is provided
      const labelText = title ? `${cfg.label}: ${title}` : cfg.label
      const innerHtml = marked.parse(body.trim(), { breaks: true, gfm: true })

      const cardHtml = `<div class="dir-card ${cfg.cls}" dir="auto">
  <div class="dir-card-header">${labelText}</div>
  ${innerHtml}</div>`

      const key = `DIRECTIVE_PLACEHOLDER_${counter++}`
      blocks[key] = cardHtml
      return `\n\n${key}\n\n`
    }
  )

  // Step 2 — Run marked on clean markdown only (no card HTML present).
  let html = marked.parse(withPlaceholders, { breaks: false, gfm: true })

  // Step 3 — Swap placeholders back.
  // marked may have wrapped them in <p> tags — strip those too.
  Object.entries(blocks).forEach(([key, cardHtml]) => {
    html = html.replace(new RegExp(`<p>\\s*${key}\\s*</p>`, 'g'), cardHtml)
    html = html.replace(new RegExp(key, 'g'), cardHtml)
  })

  return html
}
