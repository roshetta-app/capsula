// Checks for homeHeading.js (Phase H step 9.3, changed in Phase J step 11.2). Run with: node --test src/utils/homeHeading.check.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { firstNameOf, welcomeParts } from './homeHeading.js'

test('first name: first word, titles skipped, Arabic kept', () => {
  assert.equal(firstNameOf('Shaf Ali'), 'Shaf')
  assert.equal(firstNameOf('Mike Vance'), 'Mike')
  assert.equal(firstNameOf('  Dr. Shaf Ali '), 'Shaf')
  assert.equal(firstNameOf('Dr Shaf'), 'Shaf')
  assert.equal(firstNameOf('\u062f. \u0645\u062d\u0645\u062f \u0639\u0644\u064a'), '\u0645\u062d\u0645\u062f')
  assert.equal(firstNameOf('Shaf'), 'Shaf')
  assert.equal(firstNameOf('Dr.'), null)
  assert.equal(firstNameOf(''), null)
  assert.equal(firstNameOf(null), null)
  assert.equal(firstNameOf(42), null)
})

test('two-word first names keep both words', () => {
  assert.equal(firstNameOf('Abd Elrahman Ahmed'), 'Abd Elrahman')
  assert.equal(firstNameOf('Dr. Abdel Rahman Saleh'), 'Abdel Rahman')
  assert.equal(firstNameOf('abu bakr ali'), 'abu bakr')
  assert.equal(firstNameOf('Abd El Rahman Ahmed'), 'Abd El Rahman')
  assert.equal(firstNameOf('Abd-Elrahman Ahmed'), 'Abd-Elrahman')
  assert.equal(firstNameOf('\u0639\u0628\u062f \u0627\u0644\u0631\u062d\u0645\u0646 \u0623\u062d\u0645\u062f'), '\u0639\u0628\u062f \u0627\u0644\u0631\u062d\u0645\u0646')
  assert.equal(firstNameOf('\u062f. \u0623\u0628\u0648 \u0628\u0643\u0631 \u0639\u0644\u064a'), '\u0623\u0628\u0648 \u0628\u0643\u0631')
})

test('a starter alone, or followed by a title, stays one word; other names are untouched', () => {
  assert.equal(firstNameOf('Abd'), 'Abd')
  assert.equal(firstNameOf('Abdo Hassan'), 'Abdo')
  assert.equal(firstNameOf('Omar Abd Elrahman'), 'Omar')
  assert.equal(firstNameOf('Abu Dr'), 'Abu')
})

test('welcome: a guest or no name gets Welcome to Capsula, a name gets a small Hello and the name', () => {
  assert.deepEqual(welcomeParts(false, 'Shaf Ali'), { greeting: null, title: 'Welcome to Capsula' })
  assert.deepEqual(welcomeParts(true, 'Shaf Ali'), { greeting: 'Hello,', title: 'Shaf' })
  assert.deepEqual(welcomeParts(true, 'Abd Elrahman Ahmed'), { greeting: 'Hello,', title: 'Abd Elrahman' })
  assert.deepEqual(welcomeParts(true, null), { greeting: null, title: 'Welcome to Capsula' })
  assert.deepEqual(welcomeParts(true, '   '), { greeting: null, title: 'Welcome to Capsula' })
})
