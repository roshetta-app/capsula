/**
 * NoteCalloutEditor.jsx
 *
 * CMS editor for `note_callout` blocks.
 *
 * Props:
 *   block    — { block_type: 'note_callout', data: { text, flavor, context } }
 *   onChange — (nextData) => void   ← called with the updated data object only
 *
 * The `context` field ('clinical' | 'rx') is auto-set by BlockListEditor from
 * the active sub-tab at creation time and is NEVER shown to the admin here.
 * This component only exposes `text` and `flavor`.
 *
 * Dependencies: NoteCallout.jsx (src/components/ui/NoteCallout.jsx)
 */

import { useState } from 'react';

// ─── Flavor options ────────────────────────────────────────────────────────────

const FLAVOR_OPTIONS = [
  { value: 'info',    label: 'Info',    color: '#3b82f6' },   // blue
  { value: 'warning', label: 'Warning', color: '#f59e0b' },   // amber
  { value: 'tip',     label: 'Tip',     color: '#10b981' },   // green
];

// ─── Inline preview (mirrors NoteCallout appearance) ──────────────────────────

const FLAVOR_STYLES = {
  info: {
    bg: 'rgba(59,130,246,0.08)',
    border: '#3b82f6',
    icon: 'ℹ️',
    label: 'Info',
  },
  warning: {
    bg: 'rgba(245,158,11,0.08)',
    border: '#f59e0b',
    icon: '⚠️',
    label: 'Warning',
  },
  tip: {
    bg: 'rgba(16,185,129,0.08)',
    border: '#10b981',
    icon: '💡',
    label: 'Tip',
  },
};

function NotePreview({ text, flavor }) {
  const s = FLAVOR_STYLES[flavor] ?? FLAVOR_STYLES.info;
  return (
    <div
      style={{
        background: s.bg,
        borderLeft: `4px solid ${s.border}`,
        borderRadius: '0 6px 6px 0',
        padding: '10px 14px',
        fontSize: '0.85rem',
        color: 'var(--color-text)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        minHeight: 38,
      }}
    >
      <span style={{ marginRight: 8 }}>{s.icon}</span>
      {text || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Note text will appear here…</span>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function NoteCalloutEditor({ block, onChange }) {
  const data = block?.data ?? {};
  const text    = data.text    ?? '';
  const flavor  = data.flavor  ?? 'info';
  // `context` is preserved but never surfaced in this UI
  const context = data.context ?? 'clinical';

  const [showPreview, setShowPreview] = useState(false);

  function update(patch) {
    onChange({ text, flavor, context, ...patch });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Flavor selector ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', minWidth: 48 }}>
          Type
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {FLAVOR_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update({ flavor: opt.value })}
              style={{
                padding: '3px 12px',
                borderRadius: 99,
                border: flavor === opt.value
                  ? `2px solid ${opt.color}`
                  : '2px solid var(--color-border)',
                background: flavor === opt.value ? opt.color + '18' : 'transparent',
                color: flavor === opt.value ? opt.color : 'var(--color-text-muted)',
                fontWeight: flavor === opt.value ? 700 : 400,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Text input ── */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={text}
          onChange={e => update({ text: e.target.value })}
          placeholder="Note text (markdown supported)…"
          dir="auto"
          rows={3}
          style={{
            width: '100%',
            resize: 'vertical',
            padding: '8px 10px',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            minHeight: 72,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            fontSize: '0.7rem',
            color: 'var(--color-text-muted)',
            pointerEvents: 'none',
          }}
        >
          {text.length}
        </div>
      </div>

      {/* ── Preview toggle ── */}
      <div>
        <button
          type="button"
          onClick={() => setShowPreview(p => !p)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '0.78rem',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>

        {showPreview && (
          <div style={{ marginTop: 8 }}>
            <NotePreview text={text} flavor={flavor} />
          </div>
        )}
      </div>

    </div>
  );
}
