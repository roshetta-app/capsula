/**
 * src/utils/homeRoshettas.js
 * Phase H, step 9.4 (2026-11-16): the small decisions of the My roshettas row on Home, in a plain
 * file so they are checked without a screen (homeRoshettas.check.js). The state of the row
 * (loading / guest / error / empty / list) and what a tap on New does are the same as on the Topics
 * shelf (roshettaSectionState.js); this file only adds what is new on Home.
 *
 *   HOME_ROW_MAX                 how many roshetta cards the row holds before "See all" (10)
 *   homeRowCards(list)           the first HOME_ROW_MAX roshettas, as given (already newest first)
 *   showNewCard({ state })               the dashed New card starts the row of a list (also when read only: it is dimmed)
 *   newCardMode({ isReadOnly, atFreeCap })  'readonly' | 'locked' | 'new'
 *   limitLine({ isPro, count, cap, proCap })
 *                                \"3 of 3 on the free plan. Upgrade to Pro for 100.\" when a free
 *                                account is full, otherwise ''
 *   homeNotice({ online, failedCount, waitingCount, syncState })
 *                                the slim notice above the row (the existing sync wording), only
 *                                while changes are waiting or were refused; otherwise null
 *   noticeKind({ online, failedCount, waitingCount, syncState })
 *                                which small icon the status line under the row uses:
 *                                'failed' | 'offline' | 'syncing' | 'waiting' (or '' when no notice)
 *   statusText(kind, failedCount)
 *                                the short words on the status line: "Offline · saved on this phone",
 *                                "Saving…", "Waiting to save", "2 changes not saved", "Couldn't refresh",
 *                                "All saved"
 *   cardLabel(roshetta, waiting, summary, specialtyName)
 *                                what a screen reader says for one card: name, specialty (when
 *                                there is one), summary, waiting
 */

import { syncStatusLine } from './groupSyncStatus.js';

export const HOME_ROW_MAX = 10;

export function homeRowCards(list) {
  const all = Array.isArray(list) ? list : [];
  return all.slice(0, HOME_ROW_MAX);
}

export function showNewCard({ state = 'list' } = {}) {
  return state === 'list';
}

// Which New card to draw: a lapsed account sees it dimmed ("Read only"), a free account at its limit
// sees the locked "Upgrade to Pro" card, everyone else the plain "New" card.
export function newCardMode({ isReadOnly = false, atFreeCap = false } = {}) {
  if (isReadOnly) return 'readonly';
  if (atFreeCap) return 'locked';
  return 'new';
}

export function limitLine({ isPro = false, count = 0, cap = 3, proCap = 100 } = {}) {
  if (isPro || count < cap) return '';
  return `${cap} of ${cap} on the free plan. Upgrade to Pro for ${proCap}.`;
}

export function homeNotice({ online = true, failedCount = 0, waitingCount = 0, syncState = 'idle' } = {}) {
  if (failedCount < 1 && waitingCount < 1) return null;
  return syncStatusLine({ online, failedCount, waitingCount, syncState });
}

export function noticeKind({ online = true, failedCount = 0, waitingCount = 0, syncState = 'idle' } = {}) {
  if (failedCount < 1 && waitingCount < 1) return ''
  if (failedCount > 0) return 'failed'
  if (!online) return 'offline'
  if (syncState === 'syncing') return 'syncing'
  return 'waiting'
}

export function statusText(kind, failedCount = 0) {
  switch (kind) {
    case 'failed': return failedCount === 1 ? '1 change not saved' : `${failedCount} changes not saved`
    case 'offline': return 'Offline \u00b7 saved on this phone'
    case 'syncing': return 'Saving\u2026'
    case 'waiting': return 'Waiting to save'
    case 'refresh': return "Couldn't refresh"
    case 'saved': return 'All saved'
    default: return ''
  }
}

export function cardLabel(roshetta, waiting = false, summary = '', specialtyName = '') {
  const name = roshetta?.name ?? '';
  const spec = typeof specialtyName === 'string' && specialtyName.trim() ? `, ${specialtyName.trim()}` : '';
  return `${name}${name ? spec : spec.slice(2)}${summary ? `, ${summary}` : ''}${waiting ? ', waiting to save' : ''}`;
}
