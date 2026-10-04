/**
 * src/components/drugs/home/BrowseStates.jsx
 * 2026-10-04 (Drugs home split into small files): the Browse area's loading
 * placeholder (DrugsSkeleton) and failed-download message (LibraryErrorState),
 * moved out of DrugsScreen.jsx. DrugsSkeleton now draws only the tile
 * placeholders: the hero and search bar placeholders it used to draw first are
 * not needed, because the real hero and Search area are always drawn above the
 * Browse area now. Notes below were written when these lived in DrugsScreen.jsx
 * and are kept as they were.
 */

import { WifiOff } from 'lucide-react'
import { shimmer } from './shimmer'
import FilledHintButton from './FilledHintButton'

// Cold-start loading placeholder for the Browse area: a grid of tile
// placeholders matching CategoryRow's real shape (icon circle + label), drawn
// with the shimmer() style (shimmer.js) that ConditionsScreen.jsx /
// ConditionDetailScreen.jsx use too. A fixed tile count (8, filling 4 grid
// rows), not computed from viewport height, for the same reason
// SKELETON_CONTENT_BLOCK_COUNT is fixed on ConditionDetailScreen.jsx: sized to
// read as plausible content, not to exactly fill the screen. (It used to also
// draw hero and search bar placeholders above the grid; the real ones are
// always on screen now, so only the grid is left.)

const SKELETON_TILE_COUNT = 8

function SkeletonTile() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
      border: '1px solid var(--color-border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-3)',
    }}>
      <div style={shimmer({ width: 32, height: 32, borderRadius: '50%' })} />
      <div style={shimmer({ width: '70%', height: 13 })} />
    </div>
  )
}

export function DrugsSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-2)' }}>
      {Array.from({ length: SKELETON_TILE_COUNT }, (_, i) => <SkeletonTile key={i} />)}
    </div>
  )
}

// ─── LibraryErrorState ──────────────────────────────────────────────────────
// 2026-08-31 bugfix: shown when the cold-start download finishes trying but
// didn't actually get anything — previously this fell through to an empty
// category grid with no explanation and no way to recover without
// restarting the app. Same icon → headline → supporting-line → button shape
// as EmptyState/CrossModeHintState further down this file, reusing
// FilledHintButton, so it reads as a native member of that family. onRetry
// is useDrugs.js's retry() (via DrugContext), the same one the onboarding
// screen's own Retry button already uses.

export function LibraryErrorState({ onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
        <WifiOff size={28} color="var(--color-text-tertiary)" />
      </div>
      <div style={{ fontSize: 15, marginBottom: 4, color: 'var(--color-text-primary)' }}>
        Couldn't load your library
      </div>
      <div style={{ fontSize: 13, marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
        Check your connection and try again
      </div>
      <FilledHintButton onClick={onRetry}>
        Try again
      </FilledHintButton>
    </div>
  )
}
