/**
 * src/components/admin/adminSectionPrimitives.jsx
 * Phase 3.1 — shared section-card primitives for admin editors.
 *
 * Extracted verbatim from ConditionEditor.jsx (decision 4.18) so
 * GenericEditor.jsx (3.3) can adopt the same card treatment without a
 * second copy of the same three components. No behavior or style change
 * from the originals — a pure extraction.
 *
 * ConditionEditor.jsx still uses its own local copies for now; it switches
 * to importing these in 3.2. This step only creates the shared file.
 */

// ─── Section card header ──────────────────────────────────────────────────────
// Renders the bold uppercase label that sits directly above each section card.

export function SectionCardHeader({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
      marginBottom: 'var(--space-2)',
    }}>
      {children}
    </div>
  )
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
// One white card per major section, sits on the tinted --color-bg backdrop.
// No nested borders inside — content is rendered flat within this single shell.

export function SectionCard({ children, style }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-5)',
      boxShadow: 'var(--shadow-card)',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Field label ─────────────────────────────────────────────────────────────

export function FieldLabel({ children, required }) {
  return (
    <label style={{
      display: 'block', fontSize: 13, fontWeight: 600,
      color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)',
    }}>
      {children}{required && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
    </label>
  )
}
