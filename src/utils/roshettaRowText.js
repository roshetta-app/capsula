/**
 * src/utils/roshettaRowText.js
 * 2026-11-13 (Roshetta plan, step 4.1a): the words under a roshetta's name in the
 * My roshettas list, kept in a plain file so they are checked without a screen
 * (roshettaRowText.check.js).
 *
 *   "3 drugs, changed today"
 *   "1 drug, changed yesterday"
 *   "No drugs yet, changed 3 days ago"
 *   "12 drugs, changed 12 Oct"          (a week or more ago, same year)
 *   "12 drugs, changed 12 Oct 2025"     (an earlier year)
 *
 * Days are counted by the phone's own calendar days, not by 24-hour spans, so a
 * roshetta changed at 11 pm says "yesterday" the next morning. A date that is
 * missing or unreadable leaves the "changed ..." part out. A date in the future
 * (a phone clock that is off) reads as today.
 */

import { countDrugs } from './roshettaRows.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function drugCountText(count) {
  const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  if (n === 0) return 'No drugs yet';
  return n === 1 ? '1 drug' : `${n} drugs`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// "today", "yesterday", "3 days ago", "12 Oct", "12 Oct 2025", or '' when unreadable.
export function changedText(iso, now = new Date()) {
  if (iso == null || iso === '') return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const today = startOfDay(now);
  const thenDay = startOfDay(then);
  const days = Math.round((today.getTime() - thenDay.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const base = `${then.getDate()} ${MONTHS[then.getMonth()]}`;
  return then.getFullYear() === now.getFullYear() ? base : `${base} ${then.getFullYear()}`;
}

// The whole second line for one roshetta { rows, updatedAt }.
export function rowSummary(roshetta, now = new Date()) {
  const drugs = drugCountText(countDrugs(roshetta?.rows));
  const when = changedText(roshetta?.updatedAt, now);
  return when ? `${drugs}, changed ${when}` : drugs;
}
