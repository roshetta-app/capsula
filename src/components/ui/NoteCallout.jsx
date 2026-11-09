/**
 * NoteCallout.jsx — reusable presentational component for note-style content.
 *
 * Used in two contexts:
 *   1. Standalone `note_callout` block — rendered by BlockRenderer
 *      → variant='divider': same bubble shape, slightly more vertical
 *        breathing room since it stands alone between blocks
 *   2. Inline note row inside a PrescriptionSheetBlock sheet
 *      → variant='inline' (default): same bubble shape, tighter spacing
 *        since it sits directly under prescription content
 *
 * Props:
 *   text     string  — markdown-capable note text (required; renders nothing if empty)
 *   flavor   string  — 'info' | 'warning' | 'tip', default 'info'
 *   variant  string  — 'inline' (default) | 'divider'
 *   isLast   bool    — accepted but unused; kept so callers don't need updating
 *   flush    bool    — no outer margins (parent sets the gap)
 *
 * Icon legend:
 *   - info:    stethoscope
 *   - tip:     lightbulb
 *   - warning: stop hand
 *
 * CHAT-BUBBLE PASS: replaced the flat rectangular box with a message-bubble
 * shape — full width always, not shrink-wrapped or side-anchored. What
 * flips with the note's own text direction is the squared corner (a
 * lightweight tail cue, true 0° — not just a tight radius) and the icon's
 * side: LTR notes square the top-left corner with the icon on the left;
 * RTL notes square the top-right corner with the icon on the right. The
 * three non-squared corners use a softer 20px radius. Icon/text side order
 * is set via flexDirection: row-reverse rather than JSX reordering or a dir
 * attribute on the row — combining dir="rtl" with row-reverse caused a
 * double-flip in some engines that left the icon stuck on the left even for
 * Arabic notes. Both variants share this shape; 'divider' just gets a touch
 * more margin since it stands alone between blocks rather than sitting
 * directly under prescription rows.
 */
import { Stethoscope, Hand, Lightbulb } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import { NOTE_FLAVORS, noteFlavorColor } from './noteFlavors'

// ─── Icons per flavor (lucide) ───────────────────────────────────────────────
// Info = stethoscope, Warning = stop hand, Tip = lightbulb.
// size/offset let the CMS chips reuse them (offset 0) while the bubble nudges
// the icon down to sit level with the first line of text.
function makeIcon(LucideIcon) {
  return function FlavorIcon({ color, size = 18, offset = 2 }) {
    return (
      <LucideIcon size={size} color={color} strokeWidth={2.2}
        style={{ flexShrink: 0, marginTop: offset }} aria-hidden="true" />
    )
  }
}
const IconInfo = makeIcon(Stethoscope)
const IconWarning = makeIcon(Hand)
const IconTip = makeIcon(Lightbulb)

const ICONS = { info: IconInfo, warning: IconWarning, tip: IconTip }

// Small icon for the CMS type chips.
export function NoteFlavorIcon({ flavor, size = 14 }) {
  const Icon = ICONS[flavor] ?? IconInfo
  return <Icon color={noteFlavorColor(flavor)} size={size} offset={0} />
}

// Matches Arabic + Arabic Supplement Unicode blocks — used to detect
// Arabic-leading text so the icon side can follow text direction.
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/

export default function NoteCallout({ text, flavor = 'info', variant = 'inline', isLast = false, flush = false }) {
  if (!text || !text.trim()) return null

  const f = NOTE_FLAVORS[flavor] ?? NOTE_FLAVORS.info
  const Icon = ICONS[flavor] ?? IconInfo

  // Direction is resolved from the first strong character so the icon's
  // flex order flips for Arabic-leading notes: icon on the RIGHT for
  // Arabic, LEFT for English (previously always left, ignoring direction).
  const isArabic = ARABIC_RE.test(text.trim().charAt(0))
  const direction = isArabic ? 'rtl' : 'ltr'

  /**
   * RTL/LTR fix:
   *   Each <p> block from ReactMarkdown becomes a <div dir="auto"> so the browser
   *   resolves bidi direction per paragraph rather than inheriting a single direction
   *   for the whole note. This correctly handles mixed Arabic / English / emoji lines.
   *   unicodeBidi: 'plaintext' ensures each run uses its own base direction.
   */
  const components = {
    p: ({ children }) => (
      <div
        dir="auto"
        style={{
          margin: 0,
          unicodeBidi: 'plaintext',
          lineHeight: 1.5,
        }}
      >
        {children}
      </div>
    ),
    h1: ({ children }) => <div dir="auto" style={{ fontWeight: 700, unicodeBidi: 'plaintext' }}>{children}</div>,
    h2: ({ children }) => <div dir="auto" style={{ fontWeight: 700, unicodeBidi: 'plaintext' }}>{children}</div>,
    h3: ({ children }) => <div dir="auto" style={{ fontWeight: 700, unicodeBidi: 'plaintext' }}>{children}</div>,
    ul: ({ children }) => (
      <ul style={{ margin: '4px 0 0', padding: 0, paddingInlineStart: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol style={{ margin: '4px 0 0', padding: 0, paddingInlineStart: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li dir="auto" style={{ fontSize: 16, lineHeight: 1.55, color: 'var(--color-text-primary)', unicodeBidi: 'plaintext' }}>
        {children}
      </li>
    ),
    strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
  }

  const textContent = (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        fontSize: 16,
        fontWeight: 600,
        fontStyle: 'normal',
        color: 'var(--color-text-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )

  // ── Bubble shape — shared by both variants ────────────────────────────────
  // Full width, always — a note block that borrows the speech-bubble idiom.
  // Icon side follows the text direction (Arabic-leading notes: icon on the right).
  // MESSAGE-BUBBLE PASS (2026-11-09, v3): an outlined chat bubble. Full width,
  // level with every other card (no side inset). Near-white fill with a thin
  // flavour-tinted outline and a soft shadow, a classic tail (a rotated square
  // with outline on its two outer sides) under the bottom corner on the side
  // the text reads from, and a solid round avatar-style badge for the icon.
  const fill = `color-mix(in srgb, ${f.iconColor} 6%, var(--color-surface))`
  const edge = `color-mix(in srgb, ${f.iconColor} 38%, var(--color-surface))`

  const bubble = (
    <div style={{ position: 'relative', paddingBottom: 8 }}>
      <div style={{
        width: '100%',
        boxSizing: 'border-box',
        background: fill,
        border: `1.5px solid ${edge}`,
        borderRadius: 22,
        padding: '14px 16px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
      }}>
        <div
          style={{
            display: 'flex',
            flexDirection: isArabic ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          {/* Icon side is controlled ONLY by flexDirection here — no dir
              attribute on this row (dir + row-reverse double-flips in some
              engines). dir stays on the inner text content, where it is
              needed for correct bidi shaping. */}
          <span style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: f.iconColor,
          }}>
            <Icon color="#fff" size={22} offset={0} />
          </span>
          {textContent}
        </div>
      </div>
      {/* Tail — rotated square, outlined on its two outer sides only, so it
          merges into the bubble's fill and breaks its bottom outline */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 1,
          [isArabic ? 'right' : 'left']: 26,
          width: 13,
          height: 13,
          background: fill,
          borderRight: `1.5px solid ${edge}`,
          borderBottom: `1.5px solid ${edge}`,
          transform: 'rotate(45deg)',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )

  // flush: no outer margins — the parent (sheet or BlockStack) sets the gap
  // around this note, see utils/blockSpacing.js.
  if (flush) return bubble

  if (variant === 'divider') {
    return (
      <div style={{ marginTop: 12, marginBottom: 8 }}>
        {bubble}
      </div>
    )
  }

  // variant='inline' — sits directly under prescription rows, tighter margins
  return (
    <div style={{ marginTop: 10, marginBottom: 2 }}>
      {bubble}
    </div>
  )
}
