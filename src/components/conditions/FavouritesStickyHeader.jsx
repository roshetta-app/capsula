/**
 * src/components/conditions/FavouritesStickyHeader.jsx
 * 2026-10-22 (UI refresh plan, step 8.6b, rule 13): the slim bar is now one row: the compact
 * Conditions / Drugs control with the search and filter buttons beside it. While searching, the
 * row is the back button and the search field. The title row and the underline tabs are gone.
 *
 * Extracted verbatim from src/pages/FavouritesScreen.jsx (Favourites Screen
 * Refactor plan, Phase 1) — the component itself is unchanged. Like
 * FavouritesHero.jsx, Decision 10 (unconditional showManagerButton) and
 * Decision 11 (tab-aware search) land in the FavouritesScreen.jsx caller,
 * not here — this component already accepted generic search/manage props
 * before this move.
 *
 * Appears once FavouritesHero scrolls out of view. Same title row / manage
 * toggle / search-swap lockup as FavouritesHero at a smaller (sticky) scale,
 * plus the tab row underneath, kept in sync with the in-page tab row via the
 * shared renderTabs from FavouritesTabBar.jsx.
 *
 * Depends on two keyframes (favSearchExpand, favHeaderCrossfade) declared
 * in FavouritesScreen.jsx's local <style> block — that block is not part
 * of this extraction (global CSS, referenced by class/animation name only).
 *
 * Props:
 *   visible             boolean
 *   activeTab           string
 *   onSelectTab         (key) => void
 *   showManagerButton   boolean
 *   hasActiveFilters    boolean
 *   onOpenManager       () => void
 *   counts              object
 *   isSearching         boolean
 *   onToggleSearch      () => void
 *   searchValue         string
 *   onSearchChange      (value) => void
 *   searchPlaceholder   string
 */

import { Heart, Search, ArrowLeft, SlidersHorizontal } from 'lucide-react'
import SearchBar from '../ui/SearchBar'
import { FavouritesSegmented } from './FavouritesTabBar'

// Favourites' own identity color — same one-line alias / same convention
// already followed in FavouritesHero.jsx, FavouritesEmptyStates.jsx, and
// RowStarButton.jsx.

export default function FavouritesStickyHeader({ visible, activeTab, onSelectTab, showManagerButton, hasActiveFilters, onOpenManager, counts, isSearching, onToggleSearch, searchValue, onSearchChange, searchPlaceholder }) {
  return (
    <div
      aria-hidden="true"
      className="fav-sticky-header"
      style={{
        position:                'fixed',
        top:                     0,
        left:                    0,
        right:                   0,
        zIndex:                  50,
        backgroundColor:         'var(--color-surface)',
        borderBottomLeftRadius:  18,
        borderBottomRightRadius: 18,
        boxShadow:               '0 4px 12px rgba(0, 0, 0, 0.06)',
        transform:               visible ? 'translateY(0)' : 'translateY(-100%)',
        transition:              'transform 0.25s ease',
        pointerEvents:           visible ? 'auto' : 'none',
      }}
    >
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        6,
          padding:    '8px var(--page-gutter, var(--space-4))',
          boxSizing:  'border-box',
        }}>
          {isSearching ? (
            <>
              <button
                onClick={onToggleSearch}
                aria-label="Close search"
                style={{
                  width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0,
                  backgroundColor: 'var(--color-accent-solid)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                <ArrowLeft size={17} color="#fff" strokeWidth={2.2} />
              </button>
              <div
                key="search"
                className="fav-search-micro fav-sticky-search-height"
                style={{ flex: 1, minWidth: 0, animation: 'favSearchExpand 0.2s ease', transformOrigin: 'left center' }}
              >
                <SearchBar
                  value={searchValue}
                  onChange={onSearchChange}
                  placeholder={searchPlaceholder}
                  icon={Heart}
                  compact
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <FavouritesSegmented activeTab={activeTab} onSelect={onSelectTab} counts={counts} compact />
              </div>
              <button
                onClick={onToggleSearch}
                aria-label="Search favourites"
                style={{
                  width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0,
                  backgroundColor: 'transparent', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                <Search size={18} color="var(--color-text-primary)" strokeWidth={2.2} />
              </button>
              {showManagerButton && (
                <button
                  onClick={onOpenManager}
                  aria-label="Sort, filter, and manage favourites"
                  style={{
                    position: 'relative', width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0,
                    backgroundColor: 'transparent', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', outline: 'none',
                  }}
                >
                  <SlidersHorizontal size={18} color="var(--color-text-primary)" strokeWidth={2.2} />
                  {hasActiveFilters && (
                    <span aria-hidden="true" style={{
                      position: 'absolute', top: 7, right: 7, width: 7, height: 7,
                      borderRadius: '50%', backgroundColor: 'var(--color-accent)',
                    }} />
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
