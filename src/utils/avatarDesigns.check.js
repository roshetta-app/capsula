import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AVATAR_CODES } from './profileRules.js'
import { AVATAR_COLORS, AVATAR_SYMBOLS, avatarDesign, initialsFor, autoColor, resolveAvatar } from './avatarDesigns.js'

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrastWithWhite = (hex) => 1.05 / (lum(hex) + 0.05)

test('every code in the list (the same list the database holds) has a design', () => {
  assert.equal(AVATAR_CODES.length, 16)
  for (const code of AVATAR_CODES) {
    const d = avatarDesign(code)
    assert.ok(d, `no design for ${code}`)
    assert.ok(AVATAR_SYMBOLS.includes(d.symbol))
    assert.equal(d.bg, AVATAR_COLORS[d.color])
    assert.equal(resolveAvatar({ code, name: 'Sara Ali' }).kind, 'design')
  }
  assert.equal(new Set(AVATAR_CODES.map((c) => avatarDesign(c).symbol)).size, 16) // every symbol different
})

test('unknown, empty or old codes give initials, never an error', () => {
  for (const code of [undefined, null, '', 'nope', 'heart', 'heart-purple', 'heart-rose ', 42, {}]) {
    assert.equal(avatarDesign(code), null)
    assert.equal(resolveAvatar({ code, name: 'Sara Ali' }).kind, 'initials')
  }
  assert.deepEqual(resolveAvatar({ code: 'nope', name: 'Sara Ali' }), { kind: 'initials', text: 'SA', bg: AVATAR_COLORS[autoColor('Sara Ali')] })
  assert.deepEqual(resolveAvatar(), { kind: 'initials', text: '', bg: AVATAR_COLORS[autoColor('')] })
})

test('initials: first and last word, one word gives one letter, Arabic kept, no name gives nothing', () => {
  assert.equal(initialsFor('Sara Ali'), 'SA')
  assert.equal(initialsFor('  sara   mohamed   ali '), 'SA')
  assert.equal(initialsFor('Sara'), 'S')
  assert.equal(initialsFor('سارة علي'), 'سع')
  assert.equal(initialsFor(''), '')
  assert.equal(initialsFor(null), '')
})

test('the initials colour is steady for a name and always one of the palette', () => {
  assert.equal(autoColor('Sara Ali'), autoColor('Sara Ali'))
  assert.equal(autoColor('Sara Ali'), autoColor('  Sara Ali '))
  for (const n of ['Sara', 'سارة', 'Omar Hassan', '', 'x']) assert.ok(AVATAR_COLORS[autoColor(n)])
  assert.ok(new Set(['Sara', 'Omar', 'Lina', 'Youssef', 'Mona', 'Karim', 'Dina', 'Hany'].map(autoColor)).size > 3)
})

test('white on every background is readable (4.5 to 1 or better), in both light and dark mode', () => {
  for (const [name, hex] of Object.entries(AVATAR_COLORS)) {
    assert.ok(contrastWithWhite(hex) >= 4.5, `${name} ${hex} gives ${contrastWithWhite(hex).toFixed(2)}`)
  }
})
