// S11 guard: areas already moved behind their data module must not call the server directly again.
// Add a file to MOVED when its direct Supabase calls have been moved. node --test scripts/door.check.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const MOVED = [
  'src/pages/admin/ProRequestsManager.jsx',  // 2026-11-26, now uses src/lib/proQueries.js
  'src/pages/admin/ProSettingsManager.jsx',  // 2026-11-26, now uses src/lib/proQueries.js
]

for (const file of MOVED) {
  test(`${file} does not import the Supabase client`, () => {
    const text = readFileSync(file, 'utf8')
    assert.doesNotMatch(text, /from\s+['"][./]*\/lib\/supabase['"]/)
    assert.doesNotMatch(text, /supabase\.(from|rpc|auth|storage|functions)\b/)
  })
}
