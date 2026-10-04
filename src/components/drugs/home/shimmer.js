/**
 * src/components/drugs/home/shimmer.js
 * 2026-10-04 (Drugs home split into small files): the shimmer placeholder style,
 * moved unchanged out of DrugsScreen.jsx. Same convention ConditionsScreen.jsx
 * and ConditionDetailScreen.jsx keep their own copies of; the Drugs screen's
 * loading placeholders (DrugsSkeleton, SearchSwitchingState) both use this one.
 */

export function shimmer(extra = {}) {
  return {
    backgroundColor: 'var(--color-border)',
    borderRadius:    'var(--radius-sm)',
    animation:       'shimmer 1.4s ease-in-out infinite',
    ...extra,
  }
}
