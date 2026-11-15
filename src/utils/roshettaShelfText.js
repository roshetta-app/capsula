// Wording for the My roshettas shelf and the See all list (Phase G, steps 8.1 and 8.2).
// Plain functions, no screen code, so the plain checks can run them.
//
//   drugPreviewText(rows)         "Motinorm, Notussil +3" (clean brand names), or "No drugs yet"
//   shortDateText(iso, now)       "Today", "Yesterday", "Mon", "6 Nov", "31 Dec 2025"
//   SHELF_MAX                     how many rows the shelf shows before "See all"
//   shelfRows(list)               { rows, hasMore }
//   filterRoshettas(list, query)  name or any drug name (brand or generic) contains the words typed
//   sortRoshettas(list, mode)     'recent' (default) or 'az', a copy
//   groupRoshettas(list, mode, now)  [{ label, items }]: Today / This week / Earlier, or A, B, C ...
//   listMeta({ count, cap })      "40 of 100 roshettas"

import { drugLines } from './roshettaDrugLines.js';

export const SHELF_MAX = 3;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function allLines(rows) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const row of rows) {
    if (row && row.row_type === 'drug') out.push(...drugLines(row, null));
  }
  return out;
}

export function drugPreviewText(rows) {
  const names = allLines(rows).map(l => l.shownName);
  if (names.length === 0) return 'No drugs yet';
  if (names.length <= 2) return names.join(', ');
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysAgo(iso, now) {
  if (iso == null || iso === '') return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return Math.round((startOfDay(now).getTime() - startOfDay(then).getTime()) / 86400000);
}

export function shortDateText(iso, now = new Date()) {
  const days = daysAgo(iso, now);
  if (days === null) return '';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const then = new Date(iso);
  if (days < 7) return DAYS[then.getDay()];
  const base = `${then.getDate()} ${MONTHS[then.getMonth()]}`;
  return then.getFullYear() === now.getFullYear() ? base : `${base} ${then.getFullYear()}`;
}

export function shelfRows(list) {
  const all = Array.isArray(list) ? list : [];
  return { rows: all.slice(0, SHELF_MAX), hasMore: all.length > SHELF_MAX };
}

export function filterRoshettas(list, query) {
  const all = Array.isArray(list) ? list : [];
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return all;
  return all.filter(r => {
    const hay = [r?.name ?? '', ...allLines(r?.rows).flatMap(l => [l.shownName, l.genericName ?? ''])]
      .join(' ').toLowerCase();
    return words.every(w => hay.includes(w));
  });
}

function time(r) {
  const t = new Date(r?.updatedAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function sortRoshettas(list, mode = 'recent') {
  const all = Array.isArray(list) ? [...list] : [];
  const byName = (a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''), undefined, { sensitivity: 'base' });
  if (mode === 'az') return all.sort(byName);
  return all.sort((a, b) => time(b) - time(a) || byName(a, b));
}

export function groupRoshettas(list, mode = 'recent', now = new Date()) {
  const sorted = sortRoshettas(list, mode);
  const groups = [];
  const labelOf = r => {
    if (mode === 'az') {
      const c = String(r?.name ?? '').trim().charAt(0).toUpperCase();
      return /[A-Z]/.test(c) ? c : '#';
    }
    const days = daysAgo(r?.updatedAt, now);
    if (days === null || days > 6) return 'Earlier';
    return days <= 0 ? 'Today' : 'This week';
  };
  for (const r of sorted) {
    const label = labelOf(r);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(r);
    else groups.push({ label, items: [r] });
  }
  return groups;
}

export function listMeta({ count = 0, cap = 3 } = {}) {
  const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  return `${n} of ${cap} ${cap === 1 ? 'roshetta' : 'roshettas'}`;
}
