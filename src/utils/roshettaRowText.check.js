// Checks for roshettaRowText.js (step 4.1a). Run with: node --test src/utils/roshettaRowText.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { drugCountText, changedText, rowSummary } from './roshettaRowText.js';

const NOW = new Date(2026, 10, 13, 9, 30); // 13 Nov 2026, 09:30 local
const at = (y, m, d, h = 12, min = 0) => new Date(y, m, d, h, min).toISOString();

test('drug count: none, one, many, and nonsense', () => {
  assert.equal(drugCountText(0), 'No drugs yet');
  assert.equal(drugCountText(1), '1 drug');
  assert.equal(drugCountText(2), '2 drugs');
  assert.equal(drugCountText(30), '30 drugs');
  for (const bad of [undefined, null, NaN, -3, 'x']) assert.equal(drugCountText(bad), 'No drugs yet');
});

test('changed: today, yesterday, days ago, by calendar day not by 24 hours', () => {
  assert.equal(changedText(at(2026, 10, 13, 0, 5), NOW), 'today');
  assert.equal(changedText(at(2026, 10, 12, 23, 59), NOW), 'yesterday', '23:59 the day before is yesterday even though it is under 24 hours ago');
  assert.equal(changedText(at(2026, 10, 11), NOW), '2 days ago');
  assert.equal(changedText(at(2026, 10, 7), NOW), '6 days ago');
});

test('changed: a week or more gives the date, with the year only for an earlier year', () => {
  assert.equal(changedText(at(2026, 10, 6), NOW), '6 Nov');
  assert.equal(changedText(at(2026, 0, 2), NOW), '2 Jan');
  assert.equal(changedText(at(2025, 11, 31), NOW), '31 Dec 2025');
});

test('changed: a date in the future reads as today; missing or unreadable gives nothing', () => {
  assert.equal(changedText(at(2026, 10, 14), NOW), 'today');
  for (const bad of [undefined, null, '', 'not a date']) assert.equal(changedText(bad, NOW), '');
});

test('summary joins the drug count (partners count) and the change time', () => {
  const rows = [
    { row_type: 'drug', alternatives: [{}, {}] },
    { row_type: 'plain_text', content: 'hi' },
    { row_type: 'drug' },
  ];
  assert.equal(rowSummary({ rows, updatedAt: at(2026, 10, 13) }, NOW), '4 drugs, changed today');
  assert.equal(rowSummary({ rows: [], updatedAt: at(2026, 10, 12) }, NOW), 'No drugs yet, changed yesterday');
  assert.equal(rowSummary({ rows: [{ row_type: 'drug' }] }, NOW), '1 drug', 'no date, no "changed" part');
  assert.equal(rowSummary(null, NOW), 'No drugs yet');
});
