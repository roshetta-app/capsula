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
      <li dir="auto" style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--color-text-primary)', unicodeBidi: 'plaintext' }}>
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
        fontSize: 14,
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
  // Full width, always — this isn't a shrink-wrapped chat message, just a
  // note block that borrows the bubble idiom. What flips with direction is
  // the squared corner (a true 0° tail cue, not just a tight radius) and
  // the icon's side: LTR notes square the top-LEFT corner with the icon on
  // the left; RTL notes square the top-RIGHT corner with the icon on the
  // right — the tail always points toward the side the text reads FROM.
  // MESSAGE-BUBBLE PASS (2026-11-09): reads like a chat message. The bubble is
  // inset 9px on the side the text reads from, and a small tail sticks out of
  // that top corner into the gap (the corner itself stays square, so tail and
  // bubble join cleanly). The flavour icon sits in a round badge instead of
  // floating bare. Soft 18px radius on the other three corners.
  // CSS order: top-left, top-right, bottom-right, bottom-left.
  const radius = isArabic
    ? '18px 0px 18px 18px'   // squared top-right, RTL
    : '0px 18px 18px 18px'   // squared top-left, LTR

  const bubble = (
    <div style={{
      position: 'relative',
      marginLeft: isArabic ? 0 : 9,
      marginRight: isArabic ? 9 : 0,
    }}>
      {/* Tail */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          [isArabic ? 'right' : 'left']: -9,
          width: 10,
          height: 13,
          background: f.bg,
          clipPath: isArabic
            ? 'polygon(0 0, 0 100%, 100% 0)'
            : 'polygon(100% 0, 100% 100%, 0 0)',
        }}
      />
      <div style={{
        width: '100%',
        boxSizing: 'border-box',
        background: f.bg,
        borderRadius: radius,
        padding: '11px 14px',
        boxShadow: '0 1px 1px rgba(0,0,0,0.04)',
      }}>
        <div
          style={{
            display: 'flex',
            flexDirection: isArabic ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          {/* Icon side is controlled ONLY by flexDirection here — no dir
              attribute on this row (dir + row-reverse double-flips in some
              engines). dir stays on the inner text content, where it is
              needed for correct bidi shaping. */}
          <span style={{
            width: 28,
            height: 28,
            flexShrink: 0,
            marginTop: -2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: `color-mix(in srgb, ${f.iconColor} 16%, transparent)`,
          }}>
            <Icon color={f.iconColor} size={16} offset={0} />
          </span>
          {textContent}
        </div>
      </div>
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
