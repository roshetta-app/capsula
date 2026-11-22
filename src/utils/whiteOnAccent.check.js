// Check (step 14.11): white text must sit on --color-accent-solid, never on --color-accent. In dark mode the plain
// accent is the lighter blue (about 3.7:1 with white), so a button like that is hard to read. Run with: node --test src/utils/whiteOnAccent.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const BAD = /background(Color)?:\s*'var\(--color-accent\)'[^\n]*color:\s*'#fff(fff)?'/i;

function files(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'admin') out.push(...files(p)); }
    // The CMS (admin) is used on a computer and is not part of this rule yet.
    else if (/\.(jsx|js)$/.test(name) && !/\.check\.js$/.test(name) && !/[\\/]admin[\\/]/.test(p)) out.push(p);
  }
  return out;
}

test('no button or tag in the app puts white text on the light accent blue', () => {
  const hits = [];
  for (const f of files(ROOT)) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => { if (BAD.test(line)) hits.push(`${f}:${i + 1}`); });
  }
  assert.deepEqual(hits, []);
});
