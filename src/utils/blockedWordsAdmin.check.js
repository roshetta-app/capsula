// Checks for blockedWordsAdmin.js (step 14.9c-3). Run with: node --test src/utils/blockedWordsAdmin.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseWords, parseFlags, checkNewWord, loadBlockedWords, addBlockedWord, removeBlockedWord, dismissFlags,
  confirmCopy, resultText, BLOCKED_WORDS_WORDS,
} from './blockedWordsAdmin.js';

const P1 = '11111111-1111-1111-1111-111111111111';
const P2 = '22222222-2222-2222-2222-222222222222';
const online = () => true;

// A fake database: every call is recorded; a reply (or a function giving one) is set per call name.
function fake(replies = {}, isOnline = online) {
  const calls = [];
  const audits = [];
  const pick = (name, args) => {
    calls.push({ name, args });
    const r = replies[name];
    return Promise.resolve(typeof r === 'function' ? r(args) : r ?? { data: [], error: null });
  };
  return {
    calls, audits,
    deps: {
      listWords: () => pick('listWords'),
      listFlags: () => pick('listFlags'),
      addWord: (w) => pick('addWord', w),
      removeWord: (id) => pick('removeWord', id),
      dismissFlags: (id) => pick('dismissFlags', id),
      audit: async (...a) => { audits.push(a) },
      isOnline, timeLimitMs: 50,
    },
  };
}

test('parseWords keeps well-formed rows, trims, and drops junk', () => {
  const rows = parseWords([
    { id: 1, word: '  spamword ' }, { id: 2, word: '' }, { id: 'x', word: 'bad' }, null, 'x', { id: 3 }, { id: 4, word: 'كلمة' },
  ]);
  assert.deepEqual(rows.map(r => [r.id, r.word]), [[1, 'spamword'], [4, 'كلمة']]);
  for (const bad of [null, undefined, {}, 'x']) assert.deepEqual(parseWords(bad), []);
});

test('parseFlags groups by person, names the matched words once, and keeps only name, handle and words', () => {
  const words = parseWords([{ id: 1, word: 'alpha' }, { id: 2, word: 'beta' }]);
  const flags = parseFlags([
    { profile_id: P1, word_id: 1, created_at: '2026-11-22T10:00:00Z', profiles: { full_name: 'Dr Alpha', handle: 'dr-alpha', phone: '+20100' } },
    { profile_id: P1, word_id: 2, created_at: '2026-11-22T10:00:00Z', profiles: { full_name: 'Dr Alpha', handle: 'dr-alpha' } },
    { profile_id: P1, word_id: 1, created_at: '2026-11-22T10:00:00Z', profiles: { full_name: 'Dr Alpha', handle: 'dr-alpha' } },
    { profile_id: P2, word_id: 2, created_at: '2026-11-21T10:00:00Z', profiles: { full_name: null, handle: null } },
    { profile_id: '', word_id: 1 }, null, { profile_id: P2, word_id: 'x' },
  ], words);
  assert.equal(flags.length, 2);
  const a = flags.find(f => f.profileId === P1);
  assert.deepEqual(a.words, ['alpha', 'beta']);
  assert.equal(a.name, 'Dr Alpha');
  assert.equal(a.handle, 'dr-alpha');
  assert.equal(JSON.stringify(a).includes('+20100'), false);
  const b = flags.find(f => f.profileId === P2);
  assert.equal(b.name, null);
  assert.equal(b.handle, null);
  assert.deepEqual(b.words, ['beta']);
  assert.deepEqual(parseFlags('x', words), []);
});

test('a flag whose word is no longer listed is still kept, with no word shown', () => {
  const f = parseFlags([{ profile_id: P1, word_id: 99, profiles: { full_name: 'Sam', handle: 'sam' } }], []);
  assert.equal(f.length, 1);
  assert.deepEqual(f[0].words, []);
});

test('the newest flagged person comes first', () => {
  const words = parseWords([{ id: 1, word: 'alpha' }]);
  const f = parseFlags([
    { profile_id: P2, word_id: 1, created_at: '2026-11-20T10:00:00Z', profiles: { full_name: 'Old', handle: 'old' } },
    { profile_id: P1, word_id: 1, created_at: '2026-11-22T10:00:00Z', profiles: { full_name: 'New', handle: 'new' } },
  ], words);
  assert.deepEqual(f.map(x => x.profileId), [P1, P2]);
});

test('checkNewWord: trims, needs two letters, and has a ceiling', () => {
  assert.deepEqual(checkNewWord('  scam  '), { ok: true, word: 'scam' });
  assert.deepEqual(checkNewWord('ab'), { ok: true, word: 'ab' });
  assert.deepEqual(checkNewWord('كلمة'), { ok: true, word: 'كلمة' });
  assert.equal(checkNewWord('').reason, 'empty');
  assert.equal(checkNewWord('   ').reason, 'empty');
  assert.equal(checkNewWord(null).reason, 'empty');
  assert.equal(checkNewWord('a').reason, 'short');
  assert.equal(checkNewWord('x'.repeat(41)).reason, 'long');
  assert.equal(checkNewWord('x'.repeat(40)).ok, true);
});

test('loadBlockedWords reads both lists and returns them parsed', async () => {
  const { deps } = fake({
    listWords: { data: [{ id: 1, word: 'alpha', created_at: '2026-11-22T10:00:00Z' }], error: null },
    listFlags: { data: [{ profile_id: P1, word_id: 1, created_at: '2026-11-22T10:00:00Z', profiles: { full_name: 'Dr Alpha', handle: 'dr-alpha' } }], error: null },
  });
  const r = await loadBlockedWords(deps);
  assert.equal(r.status, 'ok');
  assert.equal(r.words.length, 1);
  assert.deepEqual(r.flags[0].words, ['alpha']);
});

test('loadBlockedWords: offline asks nothing; a failed read of either list is an error, never a half list', async () => {
  const off = fake({}, () => false);
  assert.deepEqual(await loadBlockedWords(off.deps), { status: 'offline' });
  assert.equal(off.calls.length, 0);
  const a = fake({ listWords: { data: null, error: { message: 'boom' } } });
  assert.equal((await loadBlockedWords(a.deps)).status, 'error');
  const b = fake({ listFlags: { data: null, error: { message: 'boom' } } });
  assert.equal((await loadBlockedWords(b.deps)).status, 'error');
  const c = fake({ listWords: { data: null, error: { code: '42501', message: 'permission denied' } } });
  assert.equal((await loadBlockedWords(c.deps)).status, 'forbidden');
  const d = fake({ listWords: () => new Promise(() => {}) });
  assert.equal((await loadBlockedWords(d.deps)).status, 'offline');
});

test('addBlockedWord sends the trimmed word once and writes it to the Audit Log', async () => {
  const { deps, calls, audits } = fake({ addWord: { data: { id: 7, word: 'scam' }, error: null } });
  const r = await addBlockedWord('  scam ', deps);
  assert.equal(r.status, 'ok');
  assert.deepEqual(calls.map(c => [c.name, c.args]), [['addWord', 'scam']]);
  assert.deepEqual(audits, [['create', 'blocked_words', '7', 'scam']]);
});

test('addBlockedWord refuses a bad word before asking the database', async () => {
  for (const [text, status] of [['', 'empty'], ['a', 'short'], ['x'.repeat(41), 'long']]) {
    const { deps, calls } = fake();
    assert.equal((await addBlockedWord(text, deps)).status, status);
    assert.equal(calls.length, 0);
  }
  const off = fake({}, () => false);
  assert.equal((await addBlockedWord('scam', off.deps)).status, 'offline');
  assert.equal(off.calls.length, 0);
});

test('addBlockedWord turns every database refusal into a plain answer and writes no audit line', async () => {
  const cases = [
    [{ code: '23505', message: 'duplicate key value' }, 'duplicate'],
    [{ code: 'P0001', message: 'blocked_word_too_short' }, 'short'],
    [{ code: '42501', message: 'new row violates row-level security' }, 'forbidden'],
    [{ code: 'XX', message: 'something' }, 'error'],
  ];
  for (const [error, status] of cases) {
    const { deps, audits } = fake({ addWord: { data: null, error } });
    assert.equal((await addBlockedWord('scam', deps)).status, status);
    assert.equal(audits.length, 0);
  }
  const t = fake({ addWord: () => new Promise(() => {}) });
  assert.equal((await addBlockedWord('scam', t.deps)).status, 'offline');
});

test('a failing Audit Log never turns a done change into a failure', async () => {
  const { deps } = fake({ addWord: { data: { id: 7, word: 'scam' }, error: null } });
  deps.audit = async () => { throw new Error('audit down') };
  assert.equal((await addBlockedWord('scam', deps)).status, 'ok');
});

test('removeBlockedWord deletes by id and audits; nothing removed reads as gone', async () => {
  const ok = fake({ removeWord: { data: [{ id: 7 }], error: null } });
  assert.equal((await removeBlockedWord({ id: 7, word: 'scam' }, ok.deps)).status, 'ok');
  assert.deepEqual(ok.calls.map(c => [c.name, c.args]), [['removeWord', 7]]);
  assert.deepEqual(ok.audits, [['delete', 'blocked_words', '7', 'scam']]);
  const gone = fake({ removeWord: { data: [], error: null } });
  assert.equal((await removeBlockedWord({ id: 7, word: 'scam' }, gone.deps)).status, 'gone');
  assert.equal(gone.audits.length, 0);
  const bad = fake();
  assert.equal((await removeBlockedWord({ id: 'x', word: 'scam' }, bad.deps)).status, 'error');
  assert.equal(bad.calls.length, 0);
  const off = fake({}, () => false);
  assert.equal((await removeBlockedWord({ id: 7, word: 'scam' }, off.deps)).status, 'offline');
});

test('dismissFlags clears that person\'s flags only and audits it with the name', async () => {
  const { deps, calls, audits } = fake({ dismissFlags: { data: [{ profile_id: P1 }], error: null } });
  const r = await dismissFlags({ profileId: P1, name: 'Dr Alpha' }, deps);
  assert.equal(r.status, 'ok');
  assert.deepEqual(calls.map(c => [c.name, c.args]), [['dismissFlags', P1]]);
  assert.deepEqual(audits, [['dismiss', 'profile_name_flags', P1, 'Dr Alpha']]);
  const none = fake({ dismissFlags: { data: [], error: null } });
  assert.equal((await dismissFlags({ profileId: P1, name: null }, none.deps)).status, 'gone');
  const bad = fake();
  assert.equal((await dismissFlags({ profileId: '', name: null }, bad.deps)).status, 'error');
  assert.equal(bad.calls.length, 0);
});

test('the words are plain, say what each action does, and promise nothing that is not true', () => {
  const rm = confirmCopy('remove', { word: 'scam' });
  assert.match(rm.message, /nobody is renamed/i);
  assert.match(rm.message, /flags/i);
  assert.equal(rm.confirmVariant, 'danger');
  const dm = confirmCopy('dismiss', { name: 'Dr Alpha' });
  assert.match(dm.message, /nothing changes for them/i);
  const add = BLOCKED_WORDS_WORDS.addHelp;
  assert.match(add, /flag/i);
  assert.match(add, /nobody is renamed/i);
  for (const s of ['ok', 'duplicate', 'short', 'long', 'empty', 'forbidden', 'offline', 'gone', 'error']) {
    assert.equal(typeof resultText(s), 'string');
    assert.ok(resultText(s).length > 0);
  }
  assert.equal(resultText('duplicate'), 'That word is already blocked.');
});
