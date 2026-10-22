/**
 * src/components/conditions/FavouritesHero.jsx
 * 2026-10-22 (UI refresh plan, step 8.6b): the same tinted header block as the Drugs and
 * Conditions homes (16 px top and bottom, rounded bottom edge, full width). Row 1 (44 px): heart
 * tile, 'Favourites' and 'Your saved references' on the left, search and filter buttons on the
 * right (search still swaps the title for the search field in place). Under it the Conditions /
 * Drugs segmented control with the counts. New props: activeTab, onSelectTab, counts.
 *
 * Extracted verbatim from src/pages/FavouritesScreen.jsx (Favourites Screen
 * Refactor plan, Phase 1) — the component itself is unchanged. Decision 10
 * (showManagerButton becomes unconditional) and Decision 11 (tab-aware
 * search) are both caller-side changes — FavouritesScreen.jsx will pass
 * different values into the same existing props (showManagerButton,
 * isSearching, onToggleSearch, searchValue, onSearchChange,
 * searchPlaceholder) once its own rewrite lands; this component's shape
 * doesn't change to support that.
 *
 * Single lockup: badge icon centered against the combined title+subtitle
 * stack, manage toggle on the right (same visual slot Home's dark-mode
 * toggle occupies). When isSearching, the title/subtitle stack is replaced
 * in-place by SearchBar; the badge hides and manage hides too, so only the
 * search icon flips to ArrowLeft while the input is showing.
 *
 * Depends on two keyframes (favSearchExpand, favHeaderCrossfade) declared
 * in FavouritesScreen.jsx's local <style> block — that block is not part
 * of this extraction (global CSS, referenced by class/animation name only).
 *
 * Props:
 *   heroRef             ref
 *   showManagerButton   boolean
 *   hasActiveFilters    boolean
 *   onOpenManager       () => void
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
// already followed in FavouritesEmptyStates.jsx and RowStarButton.jsx.
const FAV_ACCENT = 'var(--color-favourite)'

export default function FavouritesHero({ activeTab, onSelectTab, counts, heroRef, showManagerButton, hasActiveFilters, onOpenManager, isSearching, onToggleSearch, searchValue, onSearchChange, searchPlaceholder }) {
  return (
    <div ref={heroRef} style={{
      margin:          '0 calc(-1 * var(--page-gutter, 16px))',
      padding:         '16px var(--page-gutter, 16px) 16px',
      backgroundColor: 'var(--color-header-tint)',
      borderRadius:    '0 0 24px 24px',
    }}>
      {/* height: 44 (not minHeight) is a hard lock matching SearchBar's own
          compact height exactly, so toggling between the title/subtitle
          stack and the search input never visibly shrinks the row. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, height: 44 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          {!isSearching && (
            <div style={{
              width:           38,
              height:          38,
              borderRadius:    '50%',
              backgroundColor: FAV_ACCENT,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
            }}>
              <Heart size={18} fill="#fff" color="#fff" strokeWidth={0} />
            </div>
          )}
          {isSearching
            ? (
                <div
                  key="search"
                  className="fav-search-micro"
                  style={{
                    flex:            1,
                    minWidth:        0,
                    animation:       'favSearchExpand 0.2s ease',
                    transformOrigin: 'left center',
                  }}
                >
                  <SearchBar
                    value={searchValue}
                    onChange={onSearchChange}
                    placeholder={searchPlaceholder}
                    icon={Heart}
                    compact
                  />
                </div>
              )
            : (
                <div key="title" style={{ minWidth: 0, animation: 'favHeaderCrossfade 0.2s ease' }}>
                  <h1 style={{
                    fontSize:      22,
                    lineHeight:    1.15,
                    fontWeight:    700,
                    color:         'var(--color-text-primary)',
                    margin:        0,
                    letterSpacing: '-0.2px',
                  }}>
                    Favourites
                  </h1>
                  <div style={{
                    fontSize:   13,
                    lineHeight: 1.2,
                    color:      'var(--color-text-secondary)',
                    marginTop:  1,
                  }}>
                    Your saved references
                  </div>
                </div>
              )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, marginRight: -8 }}>
          <button
            onClick={onToggleSearch}
            aria-label={isSearching ? 'Close search' : 'Search favourites'}
            style={{
              width:                   44,
              height:                  44,
              borderRadius:            '50%',
              border:                  'none',
              backgroundColor:         isSearching ? 'var(--color-accent)' : 'transparent',
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              flexShrink:              0,
              cursor:                  'pointer',
              WebkitTapHighlightColor: 'transparent',
              outline:                 'none',
              transition:              'width 0.2s ease, height 0.2s ease, background-color 0.15s ease',
            }}
          >
            {isSearching
              ? <ArrowLeft size={17} color="#fff" strokeWidth={2} />
              : <Search size={17} color="var(--color-text-secondary)" strokeWidth={2.2} />}
          </button>

          {showManagerButton && !isSearching && (
            <button
              onClick={onOpenManager}
              aria-label="Sort, filter, and manage favourites"
              style={{
                position:                'relative',
                width:                   44,
                height:                  44,
                borderRadius:            '50%',
                border:                  'none',
                backgroundColor:         'transparent',
                display:                 'flex',
                alignItems:              'center',
                justifyContent:          'center',
                flexShrink:              0,
                cursor:                  'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline:                 'none',
              }}
            >
              <SlidersHorizontal size={17} color="var(--color-text-secondary)" strokeWidth={2.2} />
              {hasActiveFilters && (
                <span aria-hidden="true" style={{
                  position:        'absolute',
                  top:             9,
                  right:           9,
                  width:           7,
                  height:          7,
                  borderRadius:    '50%',
                  backgroundColor: 'var(--color-accent)',
                }} />
              )}
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-3)' }}>
        <FavouritesSegmented activeTab={activeTab} onSelect={onSelectTab} counts={counts} />
      </div>
    </div>
  )
}
