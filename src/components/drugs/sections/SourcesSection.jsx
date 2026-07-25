/**
 * src/components/drugs/sections/SourcesSection.jsx
 * Drug Detail Screen rebuild — Phase 1, step 1.9c (decision 4.17, §10 Section 16)
 *
 * Mounted last, after every other section (§11.3 order — Pharmacology →
 * Sources). A standalone white floating card, same background/shadow
 * treatment as PharmacologySection.jsx (1.8a), but with no collapse toggle —
 * sources are short, there's no dense MOA-style content to hide by default,
 * so the whole list just always shows.
 *
 * Each row: a colored badge (background/foreground picked deterministically
 * per source, via SPECIALTY_TOKENS — same token system SpecialtySelector/
 * ConditionCard use for their icon bubbles, see specialtyTokens.js), the
 * source's title + optional note, and an external-link icon when a url is
 * present. Rows render in whatever order they arrive in (insertion order) —
 * no re-sorting. Whole row is a real link out (target="_blank") when a url
 * exists, plain text otherwise.
 *
 * Note on the badge itself: STEPS_DRUG_DETAIL.md's 1.9c line describes a
 * generic "FileText" icon badge. The reference screenshot supplied this
 * session instead shows a short text abbreviation per source (BNF / NICE /
 * FDA) — a real per-source label, not one fixed icon repeated on every row.
 * Built to match the screenshot, since it's the more specific and more
 * recent reference; flagging the divergence here rather than silently
 * picking one.
 *
 * Whole card is hidden entirely if `sources` is empty — same hide-when-empty
 * treatment as Pharmacology/Uses.
 *
 * Data shape (jsonb list on generics.sources), one object per entry:
 *   { source, title, note, url }
 *   - source — short badge text, e.g. "BNF" / "NICE" / "FDA" — also the
 *     string the badge color is derived from
 *   - title  — the specific document/guideline name, e.g.
 *     "British National Formulary, 2024" — bold row text
 *   - note   — optional one-line detail under the title, e.g.
 *     "Dosage, Indications, Contraindications"
 *   - url    — optional external link; the link-out icon only renders when
 *     present
 *
 * Props: drug — flat drug object from DrugContext
 */

import { ExternalLink } from 'lucide-react'
import { TOKEN_KEYS, resolveToken } from '../../../utils/specialtyTokens'
import { useIsDark } from '../../../utils/specialtyIcon'

// Deterministic string -> token key, so the same source always gets the
// same badge color across every drug it appears on (not random per render,
// not re-picked on re-render).
function tokenForSource(key) {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return TOKEN_KEYS[hash % TOKEN_KEYS.length]
}

export default function SourcesSection({ drug }) {
  const isDark = useIsDark()

  // Destructuring defaults only cover `undefined`, not `null` — same null-
  // vs-undefined gap PharmacologySection.jsx hit with pharmacokinetics, so
  // guarded the same way here even though queries.js already applies its
  // own `?? []` fallback upstream.
  const sources = drug.sources ?? []

  if (sources.length === 0) return null

  return (
    <div style={{
      marginBottom:    'var(--space-5)',
      backgroundColor: 'var(--color-surface)',
      borderRadius:    16,
      boxShadow:       '0 2px 12px rgba(0,0,0,0.06)',
      padding:         'var(--space-4)',
    }}>
      <div style={{
        fontSize:     17,
        fontWeight:   700,
        color:        'var(--color-text-primary)',
        marginBottom: 'var(--space-3)',
      }}>
        Sources
      </div>

      <div>
        {sources.map((src, i) => {
          const badgeText = src.source ?? src.title?.slice(0, 3).toUpperCase() ?? '?'
          const colors    = resolveToken(tokenForSource(badgeText), isDark)

          const content = (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%' }}>
              <span style={{
                display:         'inline-flex',
                alignItems:      'center',
                justifyContent:  'center',
                minWidth:        40,
                height:          40,
                padding:         '0 var(--space-2)',
                borderRadius:    'var(--radius-sm)',
                backgroundColor: colors.bg,
                color:           colors.fg,
                fontSize:        11,
                fontWeight:      700,
                flexShrink:      0,
              }}>
                {badgeText}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize:   14,
                  fontWeight: 600,
                  color:      'var(--color-text-primary)',
                }}>
                  {src.title}
                </div>
                {src.note && (
                  <div style={{
                    fontSize:  12,
                    color:     'var(--color-text-tertiary)',
                    marginTop: 2,
                  }}>
                    {src.note}
                  </div>
                )}
              </div>

              {src.url && (
                <ExternalLink size={16} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
              )}
            </div>
          )

          return (
            <div
              key={i}
              style={{
                padding:      'var(--space-3) 0',
                borderBottom: i < sources.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
              }}
            >
              {src.url ? (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
                >
                  {content}
                </a>
              ) : content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
