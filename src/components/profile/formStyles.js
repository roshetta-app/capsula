/**
 * src/components/profile/formStyles.js
 * 2026-11-22 (step 14.7c-1): the shared field styles of the form pieces (moved unchanged from the old wizard).
 * Plain objects, kept apart from the components so the files stay fast-refresh friendly.
 */

// ─── Shared styles ───────────────────────────────────────────────────────────

// wizard-fields-redesign: switched from a bordered pill (transparent card
// bg, visible outline) to a filled field — no border by default, a soft
// muted fill instead. Sits inside a WizardCard (below), whose bg is
// var(--color-surface); using --color-surface-muted here (a step darker)
// keeps the field visible against the card without needing an outline.
export const pillInputStyle = {
  width:           '100%',
  padding:         'var(--space-3) var(--space-4)',
  borderRadius:    'var(--radius-md)',
  border:          '1px solid transparent',
  backgroundColor: 'var(--color-surface-muted)',
  color:           'var(--color-text-primary)',
  fontSize:        15,
  fontFamily:      'var(--font-body)',
  boxSizing:       'border-box',
  transition:      'border-color var(--motion-fast) var(--ease-settle), box-shadow var(--motion-fast) var(--ease-settle)',
}

// wizard-refinements batch: brand-accent focus ring, applied via onFocus/
// onBlur (or WizardDropdown's own `open` state) rather than a CSS
// pseudo-class, since every field here is styled with an inline `style`
// object, not a stylesheet class.
export const pillInputFocusStyle = {
  borderColor: 'var(--color-accent)',
  boxShadow:   '0 0 0 3px color-mix(in srgb, var(--color-accent) 20%, transparent)',
}

// Per-field error state — same red used by the existing saveError banner,
// just applied to the individual field's border/background instead of a
// single block at the bottom of the form.
export const pillInputErrorStyle = {
  borderColor:     '#DC2626',
  backgroundColor: '#FEF2F2',
}

// wizard-fields-redesign: groups a step's fields into one bordered card,
// matching the same card look AccountEditScreen's read-only view already
// uses (ReadOnlyGroup) — ties the editable and read-only screens to one
// visual language instead of two.
export const wizardCardStyle = {
  backgroundColor: 'var(--color-surface)',
  border:          '1px solid var(--color-border)',
  borderRadius:    'var(--radius-lg)',
  padding:         'var(--space-4)',
}

export const fieldIconStyle = { flexShrink: 0 }
