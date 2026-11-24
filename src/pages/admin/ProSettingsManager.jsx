/**
 * src/pages/admin/ProSettingsManager.jsx
 *
 * Stage 3, step 4c (2026-11-24) - the CMS Pro settings screen at /admin/pro-settings.
 * One place for the things that used to be fixed in code: the wallet name and number people send money to,
 * the three plan prices, and one switch that pauses payments (the Upgrade page then says so and "I paid" stays off).
 * Changes are live for the next person who opens the Upgrade page; no app release needed.
 * Rules and words: utils/proSettingsAdmin.js. Database side: Migration 19 (pro_settings, admin_save_pro_settings).
 */

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { supabase } from '../../lib/supabase'
import { PLAN_KEYS, PLAN_NAMES, checkProSettings, saveErrorText } from '../../utils/proSettingsAdmin'

const card = {
  backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)', padding: 'var(--space-4)', marginBottom: 'var(--space-3)',
}
const label = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6, fontFamily: 'var(--font-body)' }
const hint = { fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4, fontFamily: 'var(--font-body)' }
const input = {
  width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '0 var(--space-3)', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)',
  fontSize: 15, fontFamily: 'var(--font-body)',
}

export default function ProSettingsManager() {
  const [state, setState] = useState('loading')   // loading | ok | forbidden | error
  const [form, setForm] = useState(null)
  const [notice, setNotice] = useState(null)      // { ok, text }
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setState('loading')
    const [settings, prices] = await Promise.all([
      supabase.from('pro_settings').select('wallet_name, wallet_number, payments_open').maybeSingle(),
      supabase.from('pro_plan_prices').select('plan, amount_egp'),
    ])
    if (settings.error || prices.error || !settings.data) { setState('error'); return }
    const byPlan = Object.fromEntries((prices.data ?? []).map(p => [p.plan, String(p.amount_egp)]))
    setForm({
      walletName: settings.data.wallet_name,
      walletNumber: settings.data.wallet_number,
      paymentsOpen: settings.data.payments_open,
      prices: { monthly: byPlan.monthly ?? '', six_months: byPlan.six_months ?? '', yearly: byPlan.yearly ?? '' },
    })
    setState('ok')
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    setNotice(null)
    const result = checkProSettings(form)
    if (!result.ok) { setNotice({ ok: false, text: result.message }); return }
    setBusy(true)
    const { error } = await supabase.rpc('admin_save_pro_settings', result.args)
    setBusy(false)
    if (error) {
      if (String(error.message).includes('forbidden')) setState('forbidden')
      setNotice({ ok: false, text: saveErrorText(error) })
      return
    }
    setNotice({ ok: true, text: 'Saved. The Upgrade page uses these from now on.' })
    load()
  }

  const set = (patch) => setForm(f => ({ ...f, ...patch }))

  return (
    <AdminPageHeader
      title="Pro settings"
      actions={
        <button
          type="button" onClick={load} disabled={state === 'loading' || busy} aria-label="Refresh"
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      {notice && (
        <div role="status" style={{
          marginBottom: 'var(--space-4)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 13,
          backgroundColor: notice.ok ? '#D1FAE5' : '#FEF2F2', color: notice.ok ? '#065F46' : '#DC2626',
          border: `1px solid ${notice.ok ? '#6EE7B7' : '#FECACA'}`,
        }}>
          {notice.text}
        </div>
      )}

      {(state === 'forbidden' || state === 'error') && (
        <div role="alert" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 13, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
          {state === 'forbidden' ? 'Only an admin account can change these settings.' : 'Could not load the settings. Check the connection and press Refresh.'}
        </div>
      )}

      {state === 'ok' && form && (
        <div style={{ maxWidth: 560 }}>
          <div style={card}>
            <label style={label} htmlFor="ps-open">Payments</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
              <input
                id="ps-open" type="checkbox" checked={form.paymentsOpen}
                onChange={e => set({ paymentsOpen: e.target.checked })} style={{ width: 20, height: 20 }}
              />
              Payments are open
            </label>
            <div style={hint}>Off: the Upgrade page says payments are paused and the &quot;I paid&quot; button stays off. Requests already waiting are not affected.</div>
          </div>

          <div style={card}>
            <label style={label} htmlFor="ps-name">Wallet or InstaPay name</label>
            <input id="ps-name" style={input} value={form.walletName} maxLength={60} onChange={e => set({ walletName: e.target.value })} />
            <div style={{ height: 'var(--space-3)' }} />
            <label style={label} htmlFor="ps-number">Wallet number or InstaPay address</label>
            <input id="ps-number" style={input} value={form.walletNumber} maxLength={60} inputMode="text" onChange={e => set({ walletNumber: e.target.value })} />
            <div style={hint}>People see: &quot;By {form.walletName || '…'} to {form.walletNumber || '…'}&quot;. Check it twice: it is where their money goes.</div>
          </div>

          <div style={card}>
            <div style={label}>Prices (EGP, whole numbers)</div>
            {PLAN_KEYS.map(key => (
              <div key={key} style={{ marginBottom: 'var(--space-3)' }}>
                <label style={{ ...label, fontWeight: 500 }} htmlFor={`ps-${key}`}>{PLAN_NAMES[key]}</label>
                <input
                  id={`ps-${key}`} style={input} inputMode="numeric" value={form.prices[key]}
                  onChange={e => set({ prices: { ...form.prices, [key]: e.target.value } })}
                />
              </div>
            ))}
            <div style={hint}>A new price applies to new requests. A request already waiting keeps the amount it was made with.</div>
          </div>

          <button
            type="button" onClick={save} disabled={busy}
            style={{
              minHeight: 48, padding: '0 var(--space-6)', borderRadius: 9999, border: 'none', cursor: busy ? 'default' : 'pointer',
              backgroundColor: 'var(--color-accent-solid)', color: '#fff', opacity: busy ? 0.6 : 1,
              fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)',
            }}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </AdminPageHeader>
  )
}
