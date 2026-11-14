// Checks for roshettaShareText.js (step 6.1a). Run with: node --test src/utils/roshettaShareText.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { roshettaLinkFor, roshettaShareMessage, roshettaCopyText } from './roshettaShareText.js';

const CODE = 'a'.repeat(64);

test('link: base, /r/, then the code; a trailing slash on the base is dropped', () => {
  assert.equal(roshettaLinkFor('https://x.io/capsula', CODE), `https://x.io/capsula/r/${CODE}`);
  assert.equal(roshettaLinkFor('https://x.io/capsula/', CODE), `https://x.io/capsula/r/${CODE}`);
  assert.equal(roshettaLinkFor('https://x.io', CODE), `https://x.io/r/${CODE}`);
});

test('link: the code is made safe for an address', () => {
  assert.equal(roshettaLinkFor('https://x.io', 'a b/c?d'), 'https://x.io/r/a%20b%2Fc%3Fd');
});

test('message: name, a plain line about Capsula, the link; no dose or drug text', () => {
  const m = roshettaShareMessage('Chest pain', 'https://x.io/r/abc');
  assert.equal(m.title, 'Chest pain on Capsula');
  assert.equal(m.url, 'https://x.io/r/abc');
  assert.ok(m.text.startsWith('\u{1F4DD} Chest pain\n'));
  assert.ok(m.text.includes('A roshetta on Capsula'));
  assert.ok(!m.text.includes('http'));
});

test('message: the name is one clean line (line breaks and extra spaces collapse); an empty name gets a plain default', () => {
  assert.equal(roshettaShareMessage('  Chest\n  pain  ', 'u').title, 'Chest pain on Capsula');
  assert.equal(roshettaShareMessage('Chest\npain', 'u').text.split('\n').length, 2);
  for (const v of ['', '   ', null, undefined]) {
    assert.equal(roshettaShareMessage(v, 'u').title, 'A roshetta on Capsula', String(v));
    assert.ok(roshettaShareMessage(v, 'u').text.startsWith('\u{1F4DD} Roshetta\n'));
  }
});

test('message: an Arabic or HTML-looking name is passed as typed', () => {
  assert.equal(roshettaShareMessage('<b>x</b>', 'u').title, '<b>x</b> on Capsula');
  assert.equal(roshettaShareMessage('نزلة برد', 'u').title, 'نزلة برد on Capsula');
});

test('copy text: message text, then the link on its own line', () => {
  const m = roshettaShareMessage('Chest pain', 'https://x.io/r/abc');
  assert.equal(roshettaCopyText(m), `${m.text}\n\u{1F449} https://x.io/r/abc`);
});
