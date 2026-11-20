// Checks for openTopic.js and its wiring (Roshetta plan, Phase K, step 12.7b). Run with:
//   node --test src/utils/openTopic.check.js
// Cases K5 (a topic opens as one new step from its door) and K7 (a double tap opens once).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { openTopicWith } from './openTopic.js'
import { createTapGuard } from './tapGuard.js'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
const pathFor = (slug) => `/conditions/${slug}`

function door() {
  let t = 1000
  const guard = createTapGuard({ now: () => t })
  const steps = []
  const openPage = (path) => guard.open(path, () => steps.push(path))
  return { steps, openPage, wait: (ms) => { t += ms } }
}

test('K5: opens the topic page as one new step', () => {
  const d = door()
  assert.equal(openTopicWith({ id: 3, slug: 'gastroenteritis' }, { ...d, pathFor }), true)
  assert.deepEqual(d.steps, ['/conditions/gastroenteritis'])
})

test('K5: a topic with no slug, or nothing at all, opens nothing', () => {
  const d = door()
  assert.equal(openTopicWith({ id: 3 }, { ...d, pathFor }), false)
  assert.equal(openTopicWith({ id: 3, slug: '' }, { ...d, pathFor }), false)
  assert.equal(openTopicWith(null, { ...d, pathFor }), false)
  assert.equal(openTopicWith(undefined, { ...d, pathFor }), false)
  assert.deepEqual(d.steps, [])
})

test('K7: a double tap opens once; a later tap on another topic opens', () => {
  const d = door()
  const topic = { id: 3, slug: 'gastroenteritis' }
  assert.equal(openTopicWith(topic, { ...d, pathFor }), true)
  d.wait(200)
  assert.equal(openTopicWith(topic, { ...d, pathFor }), false)
  assert.equal(openTopicWith({ id: 4, slug: 'asthma' }, { ...d, pathFor }), true)
  assert.deepEqual(d.steps, ['/conditions/gastroenteritis', '/conditions/asthma'])
})

test('K7: the same topic can be opened again after the guard window', () => {
  const d = door()
  const topic = { id: 3, slug: 'gastroenteritis' }
  openTopicWith(topic, { ...d, pathFor })
  d.wait(2000)
  assert.equal(openTopicWith(topic, { ...d, pathFor }), true)
  assert.equal(d.steps.length, 2)
})

test('wiring: the Home, Topics and Favourites doors use the guarded helpers, not a bare navigate', () => {
  const chips = read('../components/conditions/RecentlyViewedChips.jsx')
  const topics = read('../pages/ConditionsScreen.jsx')
  const favs = read('../pages/FavouritesScreen.jsx')
  const home = read('../pages/HomeScreen.jsx')
  assert.match(chips, /useOpenTopic/)
  assert.doesNotMatch(chips, /navigate\(ROUTES\.CONDITION_DETAIL/)
  assert.match(topics, /useOpenTopic/)
  assert.doesNotMatch(topics, /navigate\(ROUTES\.CONDITION_DETAIL/)
  assert.match(favs, /useOpenTopic/)
  assert.match(favs, /useOpenDrug/)
  assert.doesNotMatch(favs, /navigate\(`\/conditions\//)
  assert.doesNotMatch(favs, /navigate\(`\/drugs\//)
  assert.match(home, /openPage\(path\)/)
  assert.doesNotMatch(home, /onOpen=\{\(\) => navigate\(path\)\}/)
})
