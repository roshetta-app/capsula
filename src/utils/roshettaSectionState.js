/**
 * src/utils/roshettaSectionState.js
 * 2026-11-14 (Roshetta plan, step 4.1d): the small decisions of the My roshettas area,
 * kept in a plain file so they are checked without a screen
 * (roshettaSectionState.check.js).
 *
 *   sectionState({ authLoading, isGuest, status, count })
 *       -> 'loading' | 'guest' | 'error' | 'empty' | 'list'
 *   newTapAnswer({ isGuest, isReadOnly, canCreate })
 *       -> 'signin' | 'readonly' | 'limit' | 'open'   what a tap on New roshetta does
 *   showArea({ isSearching, activeSpecialty })
 *       -> true when the area is drawn on the Topics screen (not while searching or filtering)
 *   countLine({ isPro, count, cap })
 *       -> '' | '2 of 3 roshettas' | '3 of 3 roshettas \u00b7 Full'   the free-plan line
 */

export function sectionState({ authLoading = false, isGuest = false, status = 'loading', count = 0 } = {}) {
  if (authLoading || (!isGuest && status === 'loading')) return 'loading';
  if (isGuest) return 'guest';
  if (status === 'error' && count === 0) return 'error';
  if (count === 0) return 'empty';
  return 'list';
}

// Same order as the groups: the message cases come first, otherwise the details sheet opens.
export function newTapAnswer({ isGuest = false, isReadOnly = false, canCreate = true } = {}) {
  if (isGuest) return 'signin';
  if (isReadOnly) return 'readonly';
  if (!canCreate) return 'limit';
  return 'open';
}

// Only a free account sees a count (a Pro account's cap is a safety cap, never shown).
export function countLine({ isPro = false, count = 0, cap = 3 } = {}) {
  if (isPro || count < 1) return '';
  const word = cap === 1 ? 'roshetta' : 'roshettas';
  return count >= cap ? `${cap} of ${cap} ${word} \u00b7 Full` : `${count} of ${cap} ${word}`;
}

// Step 4.1e: the area sits above the topic list, so it goes away while the person is
// searching or has picked a specialty ('all' means no filter).
export function showArea({ isSearching = false, activeSpecialty = 'all' } = {}) {
  return !isSearching && activeSpecialty === 'all';
}
