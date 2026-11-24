import test from 'node:test'
import assert from 'node:assert/strict'
import { checkProSettings, payState, saveErrorText } from './proSettingsAdmin.js'

const good = { walletName: ' InstaPay ', walletNumber: '0100 000 0000', paymentsOpen: true, prices: { monthly: '49', six_months: '199', yearly: '299' } }

test('good settings are trimmed and turned into function arguments', () => {
  const r = checkProSettings(good)
  assert.equal(r.ok, true)
  assert.deepEqual(r.args, { p_wallet_name: 'InstaPay', p_wallet_number: '0100 000 0000', p_payments_open: true, p_prices: { monthly: 49, six_months: 199, yearly: 299 } })
})

test('payments on needs both wallet name and number', () => {
  assert.equal(checkProSettings({ ...good, walletNumber: '  ' }).ok, false)
  assert.equal(checkProSettings({ ...good, walletName: '' }).ok, false)
  assert.equal(checkProSettings({ ...good, walletName: '', walletNumber: '', paymentsOpen: false }).ok, true)
})

test('prices must be whole numbers from 1 to 100000', () => {
  for (const bad of ['', '0', '-5', '12.5', 'abc', '100001']) {
    assert.equal(checkProSettings({ ...good, prices: { ...good.prices, yearly: bad } }).ok, false, bad)
  }
  assert.equal(checkProSettings({ ...good, prices: { ...good.prices, yearly: '100000' } }).ok, true)
})

test('wallet text is limited to 60', () => {
  assert.equal(checkProSettings({ ...good, walletName: 'x'.repeat(61) }).ok, false)
  assert.equal(checkProSettings({ ...good, walletName: 'x'.repeat(60) }).ok, true)
})

test('payState: ready, paused, missing', () => {
  assert.equal(payState({ payments_open: true, wallet_name: 'A', wallet_number: '1' }), 'ready')
  assert.equal(payState({ payments_open: false, wallet_name: 'A', wallet_number: '1' }), 'paused')
  assert.equal(payState({ payments_open: true, wallet_name: '', wallet_number: '1' }), 'missing')
  assert.equal(payState(null), 'missing')
})

test('save errors are plain words', () => {
  assert.match(saveErrorText({ message: 'forbidden' }), /admin/)
  assert.match(saveErrorText({ message: 'bad_prices' }), /prices/)
  assert.match(saveErrorText(new Error('network')), /Could not save/)
})
