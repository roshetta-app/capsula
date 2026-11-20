// Checks for tapGuard.js (Roshetta plan, Phase K, step 12.6). Run with: node --test src/utils/tapGuard.check.js
// Cases K7 (double tap opens once) and K24 (fast Back presses, one screen per press).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createTapGuard } from './tapGuard.js'

function setup() {
  let t = 1000
  const guard = createTapGuard({ now: () => t })
  const calls = []
  return { guard, calls, wait: (ms) => { t += ms } }
}

test('K7: a double tap on the same row opens once', () => {
  const { guard, calls, wait } = setup()
  assert.equal(guard.open('/drugs/panadol', () => calls.push('a')), true)
  wait(120)
  assert.equal(guard.open('/drugs/panadol', () => calls.push('b')), false)
  assert.deepEqual(calls, ['a'])
})

test('K7: a different target is never held back', () => {
  const { guard, calls } = setup()
  guard.open('/drugs/panadol', () => calls.push('a'))
  assert.equal(guard.open('/drugs/brufen', () => calls.push('b')), true)
  assert.deepEqual(calls, ['a', 'b'])
})

test('K7: the same target can be opened again after the moment has passed', () => {
  const { guard, calls, wait } = setup()
  guard.open('x', () => calls.push(1))
  wait(701)
  assert.equal(guard.open('x', () => calls.push(2)), true)
  assert.deepEqual(calls, [1, 2])
})

test('K7: a held-back tap does not extend the moment', () => {
  const { guard, calls, wait } = setup()
  guard.open('x', () => calls.push(1))
  wait(500); guard.open('x', () => calls.push('ignored'))
  wait(250) // 750 after the first open
  assert.equal(guard.open('x', () => calls.push(2)), true)
  assert.deepEqual(calls, [1, 2])
})

test('K24: a second Back while the first is settling is ignored', () => {
  const { guard, calls, wait } = setup()
  assert.equal(guard.back(() => calls.push('b1')), true)
  wait(80)
  assert.equal(guard.back(() => calls.push('b2')), false)
  assert.deepEqual(calls, ['b1'])
})

test('K24: once the screen has changed the next Back counts at once', () => {
  const { guard, calls, wait } = setup()
  guard.back(() => calls.push('b1'))
  wait(60)
  guard.settled()
  assert.equal(guard.back(() => calls.push('b2')), true)
  assert.deepEqual(calls, ['b1', 'b2'])
})

test('K24: a Back that never settles is not stuck forever', () => {
  const { guard, calls, wait } = setup()
  guard.back(() => calls.push('b1'))
  wait(451)
  assert.equal(guard.back(() => calls.push('b2')), true)
  assert.deepEqual(calls, ['b1', 'b2'])
})

test('opening and Back do not hold each other back', () => {
  const { guard, calls } = setup()
  guard.open('x', () => calls.push('open'))
  assert.equal(guard.back(() => calls.push('back')), true)
  assert.deepEqual(calls, ['open', 'back'])
})
