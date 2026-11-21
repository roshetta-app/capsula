// Checks for editorLeave.js and the roshetta editor's wiring (Roshetta plan, Phase K, step 12.9b; K12, K22).
// Run with:  node --test src/utils/editorLeave.check.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { editorUnsaved, leaveQuestion } from './editorLeave.js'
import { createLeaveGuard } from './leaveGuard.js'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')

test('K22: nothing is unsaved while the save is going fine (typing, saving, waiting, saved)', () => {
  assert.equal(editorUnsaved({}), false)
  assert.equal(editorUnsaved({ refused: false, failedHere: false }), false)
  assert.equal(editorUnsaved(), false)
})

test('K22: a refused save, or a change the server refused, counts as unsaved', () => {
  assert.equal(editorUnsaved({ refused: true }), true)
  assert.equal(editorUnsaved({ failedHere: true }), true)
})

test('the question says what is at stake in plain words', () => {
  const q = leaveQuestion()
  assert.equal(typeof q.title, 'string')
  assert.ok(q.title.length > 0)
  assert.match(q.message, /not saved|couldn.t be saved/i)
  assert.equal(q.confirmLabel, 'Leave')
})

test('K12: with unsaved work the guard asks first; Leave runs once; Stay does nothing', () => {
  const guard = createLeaveGuard()
  let unsaved = true
  guard.setUnsavedCheck(() => unsaved)
  let asked = null
  guard.setLeaveAsker(req => { asked = req })
  let left = 0, stayed = 0
  assert.equal(guard.requestLeave(() => { left++ }, () => { stayed++ }), false)
  asked.stay()
  assert.deepEqual([left, stayed], [0, 1])
  guard.requestLeave(() => { left++ })
  asked.leave(); asked.stay()
  assert.deepEqual([left, stayed], [1, 1])
  unsaved = false
  assert.equal(guard.requestLeave(() => { left++ }), true)
  assert.equal(left, 2)
})

test('wiring: the editor registers its unsaved check and question, waits for the save, and the arrow asks', () => {
  const ed = read('../pages/RoshettaEditorScreen.jsx')
  assert.match(ed, /setUnsavedCheck\(/)
  assert.match(ed, /setLeaveAsker\(/)
  assert.match(ed, /editorUnsaved\(/)
  assert.match(ed, /await flush\(\)/)
  assert.match(ed, /requestLeave\(/)
  assert.doesNotMatch(ed, /onClick=\{\(\) => navigate\(-1\)\}/)
})
