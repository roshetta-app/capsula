// Step 12.12 (F8, K17, K29), trimmed in S3.4b: the GitHub Pages deep-link page (public/404.html)
// is gone (the app runs on a host that serves the start page for every address; the old address
// now only forwards, see scripts/forwarder.check.mjs). What stays here: the install file.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = rel => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

test('manifest: id equals the start address and scope, and a link opens the installed app', () => {
  const m = JSON.parse(read('../../public/manifest.json'));
  assert.equal(m.id, '/capsula/');
  assert.equal(m.id, m.start_url);
  assert.equal(m.scope, '/capsula/');
  assert.deepEqual(m.launch_handler.client_mode, ['navigate-existing', 'auto']);
});
