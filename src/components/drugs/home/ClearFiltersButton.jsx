/**
 * src/components/drugs/home/ClearFiltersButton.jsx
 * 2026-10-04 (Drugs home split into small files): moved unchanged out of
 * DrugsScreen.jsx.
 */

import FilledHintButton from './FilledHintButton'

// 2026-10-04: now appears in one spot, the Search area (under the search bar,
// next to the filter button it belongs to). It used to appear in three spots:
// next to "Browse by category", inline with the category back button, and
// (drug-filter-instant-apply) inline with the results-count line in the search
// results view.
//
// drug-filter-instant-apply — onClick opens a confirm step
// (requestClearFilters, wired at each call site) rather than clearing
// directly; the actual clear only happens if the user confirms.
//
// CORRECTED (2026-08-29): label is singular "Clear filter" — only one
// filter type (Form/Route) exists on this screen — and no longer carries
// its own icon, matching the plain-text-button look of FilledHintButton.

export default function ClearFiltersButton({ onClick }) {
  return (
    <FilledHintButton onClick={onClick}>
      Clear filter
    </FilledHintButton>
  )
}
