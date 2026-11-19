import test from 'node:test';
import assert from 'node:assert/strict';
import { pageEntranceKind, pageFadeStyle, TAB_ROOTS } from './pageEntrance.js';

test('pageEntranceKind: forward opens of detail screens fade every time', () => {
  for (const p of ['/conditions/abc', '/drugs/xyz', '/roshetta/1', '/roshetta/1/edit', '/roshettas', '/drugs/group/9']) {
    assert.equal(pageEntranceKind({ pathname: p, navType: 'PUSH' }), 'fade', p);
    assert.equal(pageEntranceKind({ pathname: p, navType: 'REPLACE' }), 'fade', p);
  }
});

test('pageEntranceKind: Back and a cold start never fade', () => {
  assert.equal(pageEntranceKind({ pathname: '/conditions/abc', navType: 'POP' }), 'none');
  assert.equal(pageEntranceKind({ pathname: '/drugs', navType: 'POP' }), 'none');
});

test('pageEntranceKind: Home, Topics and admin have their own rules', () => {
  assert.equal(pageEntranceKind({ pathname: '/', navType: 'PUSH' }), 'none');
  assert.equal(pageEntranceKind({ pathname: '/conditions', navType: 'PUSH' }), 'none');
  assert.equal(pageEntranceKind({ pathname: '/admin/home-card', navType: 'PUSH' }), 'none');
  assert.equal(pageEntranceKind({ pathname: '/admin', navType: 'PUSH' }), 'none');
});

test('pageEntranceKind: a tab fades only the first time in a session', () => {
  for (const p of TAB_ROOTS) {
    assert.equal(pageEntranceKind({ pathname: p, navType: 'PUSH', seenTab: false }), 'fade');
    assert.equal(pageEntranceKind({ pathname: p, navType: 'PUSH', seenTab: true }), 'none');
  }
});

test('pageEntranceKind: reduce motion turns it all off', () => {
  assert.equal(pageEntranceKind({ pathname: '/conditions/abc', navType: 'PUSH', reduceMotion: true }), 'none');
});

test('pageFadeStyle: opacity only, nothing left when done or off', () => {
  assert.deepEqual(pageFadeStyle('hidden'), { opacity: 0 });
  assert.equal(pageFadeStyle('in').opacity, 1);
  assert.ok(!('transform' in pageFadeStyle('in')));
  assert.deepEqual(pageFadeStyle('done'), {});
  assert.deepEqual(pageFadeStyle('off'), {});
});
