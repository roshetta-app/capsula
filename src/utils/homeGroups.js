/**
 * src/utils/homeGroups.js
 * Phase H, step 9.5 (2026-11-16): the small decisions of the My drug groups row on Home, in a plain
 * file so they are checked without a screen (homeGroups.check.js). The state of the row (loading /
 * guest / error / empty / list), what a tap on New does, the New card rule and the slim notice are
 * the same as the My roshettas row and come from roshettaSectionState.js and homeRoshettas.js.
 *
 *   HOME_GROUPS_MAX              how many group cards the row holds before \"See all\" (10)
 *   homeGroupCards(list, sort)   the first HOME_GROUPS_MAX groups, in the order the person chose
 *                                ('newest' or 'az', the same choice as the See all screen); the
 *                                given list is never changed
 *   groupLimitLine({ isPro, count, cap })
 *                                \"3 of 3 groups \u00b7 Full\" when a free account is full, else ''
 *   groupCountText(n)            \"No drugs yet\" / \"1 drug\" / \"12 drugs\"
 *   groupCardLabel(group, waiting)   what a screen reader says for one card
 */

export const HOME_GROUPS_MAX = 10;

const NAME_ORDER = new Intl.Collator(undefined, { sensitivity: 'base' });

export function homeGroupCards(list, sortMode = 'newest') {
  const all = Array.isArray(list) ? list.slice() : [];
  if (sortMode === 'az') {
    all.sort((a, b) => NAME_ORDER.compare(a?.name ?? '', b?.name ?? ''));
  } else {
    all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  }
  return all.slice(0, HOME_GROUPS_MAX);
}

export function groupLimitLine({ isPro = false, count = 0, cap = 3 } = {}) {
  if (isPro || count < cap) return '';
  return `${cap} of ${cap} groups \u00b7 Full`;
}

export function groupCountText(n) {
  const count = Number.isFinite(n) ? n : 0;
  if (count < 1) return 'No drugs yet';
  return count === 1 ? '1 drug' : `${count} drugs`;
}

export function groupCardLabel(group, waiting = false) {
  if (!group) return '';
  const count = groupCountText(group.brandIds?.length ?? 0);
  return `${group.name ?? ''}, ${count}${waiting ? ', waiting to save' : ''}`;
}
