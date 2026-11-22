/**
 * src/utils/shareCredit.js
 * 2026-11-21 (Roshetta plan, Phase L, step 13.2): the plain rules and words for the "Created by"
 * line, the "Show my name" switch, the owner opening their own link, and "Already saved". Kept in
 * a plain file so they are checked without a screen (shareCredit.check.js). Used by the share
 * sheets, the Account screen and both shared pages.
 *
 *   dayText(iso, now)              "12 Nov", or "12 Nov 2025" for an earlier year; '' if unreadable
 *   creditText({ ownerName, createdAt, now })
 *                                  "Created by Dr Sara \u00b7 12 Nov", or "Created 12 Nov" when anonymous
 *   groupCreditLine({ ownerName, createdAt, count, now })
 *                                  the same plus the drug count: "Created 12 Nov \u00b7 12 drugs"
 *   nameSwitchText({ fullName, on })
 *                                  the share sheet row: { title, line, prefix, name }
 *   accountSwitchText({ hasName, on })
 *                                  the Account row: { title, line }
 *   readOwner(raw)                 { isOwner, ownId } from what the database function returned
 *   readCredit(raw)                everything the shared pages read from the database answer:
 *                                  { ownerName, ownerHandle, createdAt, isOwner, ownId }
 *   readHandle(raw)                the owner's username if it has the right shape, else null (14.8)
 *   creditLinkHandle({ ownerName, ownerHandle })
 *                                  the username to open from "Created by", or null (needs a name too)
 *   findSavedCopy(items, code)     the saved copy that came from this link, or null
 *   sharedBarState({ kind, isOwner, ownId, savedId, savedCount, totalCount })
 *                                  what the bottom bar of a shared page shows:
 *                                  { mode: 'owner' | 'saved' | 'save', text, button, targetId }
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOT = ' \u00b7 ';

export function dayText(iso, now = new Date()) {
  if (iso === null || iso === undefined || iso === '') return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const base = `${then.getDate()} ${MONTHS[then.getMonth()]}`;
  return then.getFullYear() === now.getFullYear() ? base : `${base} ${then.getFullYear()}`;
}

function cleanName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function creditText({ ownerName, createdAt, now } = {}) {
  const name = cleanName(ownerName);
  const day = dayText(createdAt, now);
  if (name && day) return `Created by ${name}${DOT}${day}`;
  if (name) return `Created by ${name}`;
  if (day) return `Created ${day}`;
  return '';
}

export function groupCreditLine({ ownerName, createdAt, count, now } = {}) {
  const credit = creditText({ ownerName, createdAt, now });
  const n = Number.isFinite(count) && count >= 0 ? Math.floor(count) : null;
  const drugs = n === null ? '' : `${n} ${n === 1 ? 'drug' : 'drugs'}`;
  return [credit, drugs].filter(Boolean).join(DOT);
}

export function nameSwitchText({ fullName, on } = {}) {
  const name = cleanName(fullName);
  const title = 'Show my name';
  if (!name) return { title, line: 'Add your name in Account', prefix: '', name: '' };
  if (on) return { title, line: `Created by ${name}`, prefix: 'Created by ', name };
  return { title, line: 'Anonymous', prefix: '', name: '' };
}

export function accountSwitchText({ hasName, on } = {}) {
  const title = 'Show my name on shared links';
  if (!hasName) return { title, line: 'Add your name in Edit Profile first.' };
  return { title, line: on ? 'On by default' : 'Off by default' };
}

// The database says is_owner and own_id only to the owner. Anything else, or a half answer
// (a flag with no id), counts as a visitor so a visitor never sees the owner bar.
export function readOwner(raw) {
  const isOwner = !!raw && raw.is_owner === true && typeof raw.own_id === 'string' && raw.own_id !== '';
  return { isOwner, ownId: isOwner ? raw.own_id : null };
}

// Step 14.8: the owner's username, sent only for an item that is on their profile. Anything that
// does not look like a username (wrong shape, not text) counts as none, so no link is made from it.
const HANDLE_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function readHandle(raw) {
  const h = raw && typeof raw.owner_handle === 'string' ? raw.owner_handle.trim() : '';
  return h.length >= 3 && h.length <= 30 && HANDLE_SHAPE.test(h) ? h : null;
}

// The name opens the profile only when there is a name to show and a username to open.
export function creditLinkHandle({ ownerName, ownerHandle } = {}) {
  return cleanName(ownerName) && typeof ownerHandle === 'string' && ownerHandle ? ownerHandle : null;
}

export function readCredit(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const name = cleanName(r.owner_name);
  const created = typeof r.created_at === 'string' && dayText(r.created_at) !== '' ? r.created_at : null;
  return { ownerName: name || null, ownerHandle: readHandle(r), createdAt: created, ...readOwner(r) };
}

export function findSavedCopy(items, code) {
  if (typeof code !== 'string' || code === '' || !Array.isArray(items)) return null;
  return items.find(item => item && item.sourceCode === code) ?? null;
}

export function sharedBarState({ kind, isOwner, ownId, savedId, savedCount, totalCount } = {}) {
  const one = kind === 'group' ? 'group' : 'roshetta';
  const many = kind === 'group' ? 'groups' : 'roshettas';
  if (isOwner && ownId) {
    return { mode: 'owner', text: `This is your ${one}`, button: 'Open', targetId: ownId };
  }
  if (savedId) {
    // Step 13.8: a copy with fewer drugs than the link (a free account keeps only the first ones)
    // says so, so the person knows to delete it before saving the full list.
    const partial = Number.isInteger(savedCount) && Number.isInteger(totalCount) && savedCount < totalCount;
    const note = partial ? ` \u00b7 ${savedCount} of ${totalCount} drugs` : '';
    return { mode: 'saved', text: `Already in your ${many}${note}`, button: 'View', targetId: savedId };
  }
  return { mode: 'save', text: '', button: '', targetId: null };
}
