/**
 * src/components/conditions/FavouritesStickyHeader.jsx
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
import { renderTabs } from './FavouritesTabBar'

// Favourites' own identity color — same one-line alias / same convention
// already followed in FavouritesHero.jsx, FavouritesEmptyStates.jsx, and
// RowStarButton.jsx.
const FAV_ACCENT = 'var(--color-favourite)'

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

        {/* Title row — badge icon + text on the left, manage toggle on the
            right, same lockup as the expanded hero at a smaller scale.
            boxSizing: 'border-box' + height: 44 (not minHeight) hard-locks
            this row to a fixed, padding-inclusive size. */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            8,
          padding:        '8px var(--space-6) 0',
          height:         44,
          boxSizing:      'border-box',
          marginTop:      5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            {!isSearching && (
              <div style={{
                width:           28,
                height:          28,
                borderRadius:    '50%',
                backgroundColor: FAV_ACCENT,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                flexShrink:      0,
              }}>
                <Heart size={15} fill="#fff" color="#fff" strokeWidth={0} />
              </div>
            )}
            {isSearching
              ? (
                  <div
                    key="search"
                    className="fav-search-micro fav-sticky-search-height"
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
                  <div
                    key="title"
                    style={{
                      fontSize:      18,
                      fontWeight:    700,
                      color:         'var(--color-text-primary)',
                      letterSpacing: '-0.2px',
                      minWidth:      0,
                      animation:     'favHeaderCrossfade 0.2s ease',
                    }}
                  >
                    Favourites
                  </div>
                )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={onToggleSearch}
              aria-label={isSearching ? 'Close search' : 'Search favourites'}
              style={{
                width:                   isSearching ? 36 : 32,
                height:                  isSearching ? 36 : 32,
                borderRadius:            '50%',
                border:                  'none',
                backgroundColor:         isSearching ? 'var(--color-accent)' : 'var(--color-surface)',
                display:                 'flex',
                alignItems:              'center',
                justifyContent:          'center',
                flexShrink:              0,
                cursor:                  'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline:                 'none',
                transition:              'width 0.2s ease, height 0.2s ease',
              }}
            >
              {isSearching
                ? <ArrowLeft size={17} color="#fff" strokeWidth={2.2} />
                : <Search size={17} color="var(--color-text-primary)" strokeWidth={2.2} />}
            </button>

            {showManagerButton && !isSearching && (
              <button
                onClick={onOpenManager}
                aria-label="Sort, filter, and manage favourites"
                style={{
                  position:                'relative',
                  width:                   32,
                  height:                  32,
                  borderRadius:            '50%',
                  border:                  'none',
                  backgroundColor:         'var(--color-surface)',
                  display:                 'flex',
                  alignItems:              'center',
                  justifyContent:          'center',
                  flexShrink:              0,
                  cursor:                  'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  outline:                 'none',
                }}
              >
                <SlidersHorizontal size={17} color="var(--color-text-primary)" strokeWidth={2.2} />
                {hasActiveFilters && (
                  <span aria-hidden="true" style={{
                    position:        'absolute',
                    top:             5,
                    right:           5,
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

        {/* Tabs — same content as the in-page row, kept in sync via renderTabs.
            Spacing redistributed (not just trimmed): marginTop 0 and bottom
            padding 3px here exactly offset the +5px marginTop on the title
            row above, so total sticky-header height is unchanged. The 50px
            tab button height itself (inside renderTabs) is untouched. */}
        <div style={{
          marginTop: 0,
          padding:   '0 var(--space-6) 3px',
        }}>
          {renderTabs(activeTab, onSelectTab, counts)}
        </div>

      </div>
    </div>
  )
}
