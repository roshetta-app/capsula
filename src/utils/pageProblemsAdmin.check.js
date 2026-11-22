// Checks for pageProblemsAdmin.js (Track I, step I5). Run with: node --test src/utils/pageProblemsAdmin.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePageProblems, cardView, confirmCopy, runPageAction, loadPageProblems, loadPageProblemCount,
  pageResultText, publicPath, editorPath, noteWhen, PAGE_PROBLEMS_WORDS,
} from './pageProblemsAdmin.js';

const ID = '11111111-1111-1111-1111-111111111111';
const GID = '22222222-2222-2222-2222-222222222222';
const FID = '33333333-3333-3333-3333-333333333333';
const raw = (over = {}) => ({
  kind: 'brand', target_id: ID, slug: 'augmentin-1g', name: 'Augmentin', generic_id: GID, generic_slug: 'amoxicillin-clavulanate',
  generic_name: 'Amoxicillin/Clavulanate', formulation_id: FID, formulation: '1 g tablet', total: 3, has_dose: true, newest: '2026-11-23T10:00:00Z',
  reasons: { typo: 1, wrong_dose: 2, bogus: 4 }, notes: [{ at: '2026-11-23T10:00:00Z', text: 'Max dose is wrong' }, { at: null, text: '   ' }, { text: 5 }], ...over,
});
const online = () => true;
const deps = (reply, isOnline = online, calls = []) => ({
  rpc: async (fn, args) => { calls.push({ fn, args }); return typeof reply === 'function' ? reply() : reply; },
  isOnline, timeLimitMs: 50,
});

test('parsePageProblems keeps valid rows, drops unknown reasons, blank notes and junk, and holds no reporter id', () => {
  const rows = parsePageProblems([raw(), raw({ kind: 'roshetta' }), raw({ target_id: '' }), null, 'x']);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].reasons, { typo: 1, wrong_dose: 2 });
  assert.equal(rows[0].notes.length, 1);
  assert.equal(rows[0].hasDose, true);
  assert.equal(JSON.stringify(rows[0]).includes('reporter'), false);
  for (const bad of [null, undefined, {}, 'x']) assert.deepEqual(parsePageProblems(bad), []);
});

test('a note is cut at 300 letters again and an emoji is never split', () => {
  const long = '\u{1F600}'.repeat(305);
  const row = parsePageProblems([raw({ notes: [{ at: null, text: long }] })])[0];
  assert.equal(Array.from(row.notes[0].text).length, 300);
});

test('the card sorts the dose reason first, shows the plain count and the generic and formulation of a brand', () => {
  const v = cardView(parsePageProblems([raw()])[0]);
  assert.deepEqual(v.reasons.map(r => r.key), ['wrong_dose', 'typo']);
  assert.equal(v.reasons[0].urgent, true);
  assert.equal(v.urgent, true);
  assert.equal(v.countLine, '3 open reports');
  assert.equal(v.kindLabel, 'Brand');
  assert.equal(v.subtitle, 'Amoxicillin/Clavulanate \u00b7 1 g tablet');
  assert.equal(cardView(parsePageProblems([raw({ total: 1 })])[0]).countLine, '1 open report');
});

test('a page with no dose report has no red edge', () => {
  const v = cardView(parsePageProblems([raw({ has_dose: false, reasons: { typo: 1 } })])[0]);
  assert.equal(v.urgent, false);
});

test('the three page addresses and the three editor addresses', () => {
  const brand = parsePageProblems([raw()])[0];
  const generic = parsePageProblems([raw({ kind: 'generic', slug: 'amoxicillin' })])[0];
  const topic = parsePageProblems([raw({ kind: 'topic', slug: 'acute-cholecystitis' })])[0];
  assert.equal(publicPath(brand), '/drugs/augmentin-1g');
  assert.equal(publicPath(generic), '/drugs/generic/amoxicillin');
  assert.equal(publicPath(topic), '/conditions/acute-cholecystitis');
  assert.equal(editorPath(topic), `/admin/conditions/${ID}`);
  assert.equal(editorPath(generic), `/admin/drugs/generic/${ID}`);
  assert.equal(editorPath(brand), `/admin/drugs/generic/${GID}?formulation=${FID}&brand=${ID}`);
});

test('a brand card also links to its formulation and generic; other cards do not', () => {
  const v = cardView(parsePageProblems([raw()])[0]);
  assert.equal(v.formulationPath, `/admin/drugs/generic/${GID}?formulation=${FID}`);
  assert.equal(v.genericPath, `/admin/drugs/generic/${GID}`);
  const t = cardView(parsePageProblems([raw({ kind: 'topic' })])[0]);
  assert.equal(t.formulationPath, null);
  assert.equal(t.genericPath, null);
});

test('missing facts give no link instead of a broken one', () => {
  const noSlug = parsePageProblems([raw({ slug: null })])[0];
  assert.equal(publicPath(noSlug), null);
  const noGeneric = parsePageProblems([raw({ generic_id: null })])[0];
  assert.equal(editorPath(noGeneric), null);
  assert.equal(cardView(noGeneric).title, 'Augmentin');
  assert.equal(cardView(parsePageProblems([raw({ name: null })])[0]).title, 'Untitled');
});

test('a slug with odd characters is made safe in the address', () => {
  const row = parsePageProblems([raw({ slug: 'a b/c?d' })])[0];
  assert.equal(publicPath(row), '/drugs/a%20b%2Fc%3Fd');
});

test('notes keep their text exactly and only draw a day, never a time', () => {
  const v = cardView(parsePageProblems([raw({ notes: [{ at: '2026-11-23T23:59:00Z', text: '<b>x</b> https://a.b\nline' }] })])[0]);
  assert.equal(v.notes[0].text, '<b>x</b> https://a.b\nline');
  assert.equal(v.notes[0].when, '23 Nov 2026');
  assert.equal(noteWhen('nope'), '');
  assert.equal(noteWhen(null), '');
});

test('the confirm words say nothing changes on the page and never promise a hide', () => {
  for (const a of ['fixed', 'dismissed']) {
    const c = confirmCopy(a, { kind: 'topic' });
    assert.match(c.message, /nothing changes on the page/i);
    assert.equal(/hide|hidden/i.test(c.title + c.message), false);
  }
  assert.equal(confirmCopy('fixed', { kind: 'brand' }).confirmLabel, 'Mark fixed');
  assert.equal(confirmCopy('dismissed', { kind: 'brand' }).confirmLabel, 'Dismiss');
  assert.equal(PAGE_PROBLEMS_WORDS.fixed, 'Mark fixed');
});

test('runPageAction calls the right function with the right words, and refuses anything else', async () => {
  const calls = [];
  const row = parsePageProblems([raw()])[0];
  assert.deepEqual(await runPageAction('fixed', row, deps({ data: 3, error: null }, online, calls)), { status: 'ok' });
  assert.deepEqual(calls[0], { fn: 'admin_resolve_page_problems', args: { p_kind: 'brand', p_id: ID, p_action: 'fixed' } });
  await runPageAction('dismissed', row, deps({ data: 1, error: null }, online, calls));
  assert.equal(calls[1].args.p_action, 'dismissed');
  const before = calls.length;
  assert.deepEqual(await runPageAction('hide', row, deps({ data: 1, error: null }, online, calls)), { status: 'error' });
  assert.deepEqual(await runPageAction('fixed', { kind: 'roshetta', targetId: ID }, deps({ data: 1, error: null }, online, calls)), { status: 'error' });
  assert.equal(calls.length, before);
});

test('actions answer offline, forbidden, a failed call and a timeout in plain words', async () => {
  const row = parsePageProblems([raw()])[0];
  assert.deepEqual(await runPageAction('fixed', row, deps({ data: 1 }, () => false)), { status: 'offline' });
  assert.deepEqual(await runPageAction('fixed', row, deps({ data: null, error: { message: 'forbidden' } })), { status: 'forbidden' });
  assert.deepEqual(await runPageAction('fixed', row, deps({ data: null, error: { code: '42501' } })), { status: 'forbidden' });
  assert.deepEqual(await runPageAction('fixed', row, deps({ data: null, error: { message: 'boom' } })), { status: 'error' });
  assert.deepEqual(await runPageAction('fixed', row, deps({ data: null, error: { message: 'boom' } }, () => false)), { status: 'offline' });
  assert.deepEqual(await runPageAction('fixed', row, { rpc: () => new Promise(() => {}), isOnline: online, timeLimitMs: 10 }), { status: 'offline' });
  assert.equal(pageResultText('ok'), 'Done.');
});

test('loadPageProblems and loadPageProblemCount answer every case', async () => {
  const calls = [];
  const ok = await loadPageProblems(deps({ data: [raw()], error: null }, online, calls));
  assert.equal(ok.status, 'ok');
  assert.equal(ok.rows.length, 1);
  assert.equal(calls[0].fn, 'admin_list_page_problems');
  assert.deepEqual(await loadPageProblems(deps({ data: [] }, () => false)), { status: 'offline' });
  assert.deepEqual(await loadPageProblems(deps({ data: null, error: { message: 'forbidden' } })), { status: 'forbidden' });
  assert.deepEqual((await loadPageProblems(deps({ data: null, error: null }))).rows, []);
  assert.deepEqual(await loadPageProblemCount(deps({ data: 4, error: null })), { status: 'ok', count: 4 });
  assert.deepEqual(await loadPageProblemCount(deps({ data: -1, error: null })), { status: 'error' });
  assert.deepEqual(await loadPageProblemCount(deps({ data: 'x', error: null })), { status: 'error' });
  assert.deepEqual(await loadPageProblemCount(deps({ data: 1 }, () => false)), { status: 'offline' });
});
