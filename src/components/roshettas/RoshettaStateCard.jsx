// The empty and guest card of the My roshettas area (Phase G step 8.1): white card, accent tile,
// a title, one line of body, one primary button.

import { FileText } from 'lucide-react'

export default function RoshettaStateCard({ title, body, actionLabel, onAction }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16,
        padding: '24px 16px', textAlign: 'center', fontFamily: 'var(--font-body)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 40, height: 40, borderRadius: 12, margin: '0 auto 12px',
          backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <FileText size={22} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)', marginBottom: 16 }}>{body}</div>
      <button
        type="button"
        onClick={onAction}
        style={{
          minHeight: 44, padding: '0 24px', borderRadius: 9999, border: 'none', cursor: 'pointer',
          backgroundColor: 'var(--color-accent-solid)', color: '#fff',
          fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
          outline: 'none', WebkitTapHighlightColor: 'transparent',
        }}
      >
        {actionLabel}
      </button>
    </div>
  )
}
