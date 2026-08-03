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
 * Each row: a fixed document-icon badge, colored by the row's position in
 * the list (via SPECIALTY_TOKENS — same token system SpecialtySelector/
 * ConditionCard use for their icon bubbles, see specialtyTokens.js), the
 * source's title + optional note, and an external-link icon when a url is
 * present. Rows render in whatever order they arrive in (insertion order) —
 * no re-sorting, which is what keeps each row's color stable across
 * reloads. Whole row is a real link out (target="_blank") when a url
 * exists, plain text otherwise.
 *
 * Decision 13 (2026-07-29): the badge used to show a per-source text
 * abbreviation (BNF / NICE / FDA) colored by hashing that text — this
 * replaced the original spec's plain "FileText" icon to match an early
 * reference screenshot. Reverted back to the fixed-icon spec, now with
 * position-based color instead of the original's unspecified-color intent,
 * since the CMS's abbreviation field (the badge text's source) is being
 * dropped as a maintenance burden with no display value of its own.
 *
 * Whole card is hidden entirely if `sources` is empty — same hide-when-empty
 * treatment as Pharmacology/Uses.
 *
 * Data shape (jsonb list on generics.sources), one object per entry:
 *   { source, title, note, url }
 *   - source — legacy abbreviation field, no longer read for display
 *   - title  — the specific document/guideline name, e.g.
 *     "British National Formulary, 2024" — bold row text
 *   - note   — optional one-line detail under the title, e.g.
 *     "Dosage, Indications, Contraindications"
 *   - url    — optional external link; the link-out icon only renders when
 *     present
 *
 * Props: drug — flat drug object from DrugContext
 */

import { ExternalLink, FileText } from 'lucide-react'
import { TOKEN_KEYS, resolveToken } from '../../../utils/specialtyTokens'
import { useIsDark } from '../../../utils/specialtyIcon'

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
          const colors = resolveToken(TOKEN_KEYS[i % TOKEN_KEYS.length], isDark)

          const content = (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%' }}>
              <span style={{
                display:         'inline-flex',
                alignItems:      'center',
                justifyContent:  'center',
                width:           40,
                height:          40,
                borderRadius:    'var(--radius-sm)',
                backgroundColor: colors.bg,
                color:           colors.fg,
                flexShrink:      0,
              }}>
                <FileText size={18} />
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize:   13,
                  fontWeight: 500,
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