// Checks for reportsAdmin.js (step 14.9c-1). Run with: node --test src/utils/reportsAdmin.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseReports, rowView, confirmCopy, runAction, loadReports, loadReportCount, resultText, ACTIONS,
} from './reportsAdmin.js';

const ID = '11111111-1111-1111-1111-111111111111';
const raw = (over = {}) => ({
  kind: 'roshetta', target_id: ID, name: 'Insulin chart', owner_id: 'o', handle: 'sara', total: 3, counting: 2, has_medical: true,
  reasons: { medical: 2, spam: 1, bogus: 5 }, reporter_ages_days: [40, 2, null], hidden: false, hidden_by: null, appeal_at: null, stays_hidden: false, ...over,
});
const online = () => true;
const deps = (reply, isOnline = online, calls = []) => ({
  rpc: async (fn, args) => { calls.push({ fn, args }); return typeof reply === 'function' ? reply() : reply; },
  isOnline, timeLimitMs: 50,
});

test('parseReports keeps valid rows, drops unknown reasons and junk, and never keeps the owner id', () => {
  const rows = parseReports([raw(), raw({ kind: 'nope' }), raw({ target_id: '' }), null, 'x']);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].reasons, { medical: 2, spam: 1 });
  assert.equal('ownerId' in rows[0] || 'owner_id' in rows[0], false);
  assert.deepEqual(rows[0].reporterAges, [40, 2, null]);
  for (const bad of [null, undefined, {}, 'x']) assert.deepEqual(parseReports(bad), []);
});

test('an appeal is pending only while it has not been answered', () => {
  const a = parseReports([raw({ hidden: true, hidden_by: 'reports', appeal_at: '2026-11-22T10:00:00Z' })])[0];
  assert.equal(a.appealPending, true);
  const b = parseReports([raw({ hidden: true, hidden_by: 'reports', appeal_at: '2026-11-22T10:00:00Z', stays_hidden: true })])[0];
  assert.equal(b.appealPending, false);
  assert.equal(b.staysHidden, true);
});

test('an open, not hidden item offers Hide and Dismiss only', () => {
  const v = rowView(parseReports([raw()])[0]);
  assert.equal(v.status, 'open');
  assert.deepEqual(v.actions.map(a => a.key), ['hide', 'dismiss']);
  assert.equal(v.kindLabel, 'Roshetta');
  assert.equal(v.title, 'Insulin chart');
  assert.equal(v.handleLine, '@sara');
});

test('reasons come medical first, in the report sheet order, with their counts and words', () => {
  const v = rowView(parseReports([raw({ reasons: { spam: 1, other: 4, medical: 2 } })])[0]);
  assert.deepEqual(v.reasons.map(r => r.key), ['medical', 'spam', 'other']);
  assert.equal(v.reasons[0].label, 'Wrong or dangerous medical content');
  assert.deepEqual(v.reasons.map(r => r.count), [2, 1, 4]);
});

test('the count line says how many count toward hiding, but not for a profile', () => {
  assert.match(rowView(parseReports([raw()])[0]).countLine, /3 open reports/);
  assert.match(rowView(parseReports([raw()])[0]).countLine, /2 count toward hiding/);
  assert.equal(rowView(parseReports([raw({ total: 1, counting: 1 })])[0]).countLine.startsWith('1 open report'), true);
  const p = rowView(parseReports([raw({ kind: 'profile', handle: 'sara' })])[0]);
  assert.doesNotMatch(p.countLine, /count toward/);
  assert.equal(rowView(parseReports([raw({ total: 0, counting: 0 })])[0]).countLine, 'No open reports');
});

test('reporter account ages are shown with new accounts and deleted ones marked', () => {
  const line = rowView(parseReports([raw()])[0]).agesLine;
  assert.match(line, /40 days/);
  assert.match(line, /2 days \(new\)/);
  assert.match(line, /deleted/);
  assert.match(rowView(parseReports([raw({ reporter_ages_days: [1] })])[0]).agesLine, /1 day \(new\)/);
  assert.equal(rowView(parseReports([raw({ reporter_ages_days: [] })])[0]).agesLine, '');
});

test('a hidden item offers Restore and Keep hidden; a pending appeal offers the two answers instead', () => {
  const hidden = rowView(parseReports([raw({ hidden: true, hidden_by: 'reports' })])[0]);
  assert.equal(hidden.status, 'hidden');
  assert.equal(hidden.statusLabel, 'Hidden by reports');
  assert.deepEqual(hidden.actions.map(a => a.key), ['restore', 'keep']);
  const mine = rowView(parseReports([raw({ hidden: true, hidden_by: 'admin' })])[0]);
  assert.equal(mine.statusLabel, 'Hidden by you');
  const appeal = rowView(parseReports([raw({ hidden: true, hidden_by: 'reports', appeal_at: 'x' })])[0]);
  assert.equal(appeal.status, 'appeal');
  assert.equal(appeal.statusLabel, 'Appeal waiting');
  assert.deepEqual(appeal.actions.map(a => a.key), ['answer_restore', 'answer_keep']);
});

test('a hidden item with no open reports has nothing to keep, only Restore', () => {
  const v = rowView(parseReports([raw({ total: 0, counting: 0, has_medical: false, reasons: {}, reporter_ages_days: [], hidden: true, hidden_by: 'admin' })])[0]);
  assert.deepEqual(v.actions.map(a => a.key), ['restore']);
});

test('a final answer is shown on the status', () => {
  const v = rowView(parseReports([raw({ hidden: true, hidden_by: 'reports', appeal_at: 'x', stays_hidden: true })])[0]);
  assert.match(v.statusLabel, /decision final/i);
  assert.deepEqual(v.actions.map(a => a.key), ['restore', 'keep']);
});

test('a profile can be opened from the screen only while it is visible and has a username', () => {
  assert.equal(rowView(parseReports([raw({ kind: 'profile' })])[0]).canOpenProfile, true);
  assert.equal(rowView(parseReports([raw({ kind: 'profile', hidden: true, hidden_by: 'admin' })])[0]).canOpenProfile, false);
  assert.equal(rowView(parseReports([raw({ kind: 'profile', handle: null })])[0]).canOpenProfile, false);
  assert.equal(rowView(parseReports([raw()])[0]).canOpenProfile, false);
});

test('the view carries the medical flag and a profile path with the username safely encoded', () => {
  assert.equal(rowView(parseReports([raw()])[0]).hasMedical, true);
  assert.equal(rowView(parseReports([raw({ has_medical: false })])[0]).hasMedical, false);
  assert.equal(rowView(parseReports([raw({ kind: 'profile', handle: 'sara-ahmed' })])[0]).profilePath, '/u/sara-ahmed');
  assert.equal(rowView(parseReports([raw({ kind: 'profile', handle: 'a b/c' })])[0]).profilePath, '/u/a%20b%2Fc');
  assert.equal(rowView(parseReports([raw()])[0]).profilePath, null);
  assert.equal(rowView(parseReports([raw({ kind: 'profile', hidden: true, hidden_by: 'admin' })])[0]).profilePath, null);
});

test('a missing name and username have plain fallbacks', () => {
  const v = rowView(parseReports([raw({ name: null, handle: null })])[0]);
  assert.equal(v.title, 'Untitled');
  assert.equal(v.handleLine, 'No username');
});

test('every action has a confirmation that says what happens, and the destructive ones are red', () => {
  const row = parseReports([raw()])[0];
  for (const key of ACTIONS) {
    const c = confirmCopy(key, row);
    assert.ok(c.title.endsWith('?'), key);
    assert.ok(c.message.length > 20, key);
    assert.ok(c.confirmLabel.length > 2, key);
  }
  assert.equal(confirmCopy('hide', row).confirmVariant, 'danger');
  assert.equal(confirmCopy('restore', row).confirmVariant, 'primary');
  assert.match(confirmCopy('hide', row).message, /ask for one review/i);
  assert.match(confirmCopy('hide', row).message, /nothing is deleted/i);
  assert.match(confirmCopy('answer_keep', row).message, /final/i);
  const prof = parseReports([raw({ kind: 'profile' })])[0];
  assert.match(confirmCopy('hide', prof).message, /public link/i);
  assert.match(confirmCopy('hide', row).title, /roshetta/i);
});

test('each action calls the matching database function with exactly kind and id', async () => {
  const row = parseReports([raw({ kind: 'group' })])[0];
  const expect = {
    hide: ['admin_set_hidden', { p_kind: 'group', p_id: ID, p_hide: true }],
    keep: ['admin_set_hidden', { p_kind: 'group', p_id: ID, p_hide: true }],
    restore: ['admin_set_hidden', { p_kind: 'group', p_id: ID, p_hide: false }],
    dismiss: ['admin_dismiss_reports', { p_kind: 'group', p_id: ID }],
    answer_restore: ['admin_answer_appeal', { p_kind: 'group', p_id: ID, p_restore: true }],
    answer_keep: ['admin_answer_appeal', { p_kind: 'group', p_id: ID, p_restore: false }],
  };
  for (const [key, [fn, args]] of Object.entries(expect)) {
    const calls = [];
    assert.deepEqual(await runAction(key, row, deps({ data: null, error: null }, online, calls)), { status: 'ok' }, key);
    assert.deepEqual(calls, [{ fn, args }], key);
  }
});

test('an unknown action never reaches the database', async () => {
  const calls = [];
  const row = parseReports([raw()])[0];
  assert.deepEqual(await runAction('delete_everything', row, deps({ data: null, error: null }, online, calls)), { status: 'error' });
  assert.equal(calls.length, 0);
});

test('actions: refusals, offline and failures become plain answers', async () => {
  const row = parseReports([raw()])[0];
  assert.equal((await runAction('hide', row, deps({ data: null, error: { message: 'forbidden' } }))).status, 'forbidden');
  assert.equal((await runAction('hide', row, deps({ data: null, error: { code: 'request_timeout', message: 'request_timeout' } }))).status, 'offline');
  assert.equal((await runAction('hide', row, deps({ data: null, error: null }, () => false))).status, 'offline');
  assert.equal((await runAction('hide', row, deps({ data: null, error: { message: 'other' } }))).status, 'error');
  assert.equal((await runAction('hide', row, deps(() => { throw new Error('x') }))).status, 'error');
});

test('loadReports returns clean rows; forbidden, offline and errors are their own answers', async () => {
  const calls = [];
  const ok = await loadReports(deps({ data: [raw()], error: null }, online, calls));
  assert.equal(ok.status, 'ok');
  assert.equal(ok.rows.length, 1);
  assert.deepEqual(calls, [{ fn: 'admin_list_reports', args: undefined }]);
  assert.deepEqual(await loadReports(deps({ data: null, error: null })), { status: 'ok', rows: [] });
  assert.equal((await loadReports(deps({ data: null, error: { message: 'forbidden' } }))).status, 'forbidden');
  assert.equal((await loadReports(deps({ data: [], error: null }, () => false))).status, 'offline');
  assert.equal((await loadReports(deps({ data: null, error: { message: 'boom' } }))).status, 'error');
});

test('loadReportCount returns a whole number, never a negative or a guess', async () => {
  assert.deepEqual(await loadReportCount(deps({ data: 4, error: null })), { status: 'ok', count: 4 });
  assert.deepEqual(await loadReportCount(deps({ data: 0, error: null })), { status: 'ok', count: 0 });
  assert.equal((await loadReportCount(deps({ data: 'x', error: null }))).status, 'error');
  assert.equal((await loadReportCount(deps({ data: -2, error: null }))).status, 'error');
  assert.equal((await loadReportCount(deps({ data: null, error: { message: 'forbidden' } }))).status, 'forbidden');
  assert.equal((await loadReportCount(deps({ data: 1, error: null }, () => false))).status, 'offline');
});

test('every answer has one short line of words', () => {
  for (const s of ['ok', 'forbidden', 'offline', 'error', 'whatever']) {
    const t = resultText(s);
    assert.ok(typeof t === 'string' && t.length > 4 && t.length < 90, s);
  }
});
