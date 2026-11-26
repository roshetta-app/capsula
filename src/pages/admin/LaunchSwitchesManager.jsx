/**
 * src/pages/admin/LaunchSwitchesManager.jsx
 *
 * Track S, step S4 (2026-11-25) - the CMS Launch switches screen at /admin/launch-switches.
 * Two on/off switches that live in the cms_config table, so they change for everyone at once
 * with no app release:
 *   - Pause new sign-ups (the database refuses to create new accounts; people who already
 *     have an account sign in as usual).
 *   - Download the drug list from Cloudflare (the static files, instead of Supabase).
 * Writing needs an admin account (database rule auth_write_cms_config). Rules and keys:
 * utils/launchSwitches.js and lib/catalogStatic.js.
 */

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { fetchSwitchRows } from '../../lib/switchQueries'
import { updateCmsConfig } from '../../lib/adminQueries'
import { CATALOG_SWITCH_KEY } from '../../lib/catalogStatic'
import { SIGNUPS_PAUSED_KEY, isSwitchOn, switchValue } from '../../utils/launchSwitches'

const card = {
  backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)', padding: 'var(--space-4)', marginBottom: 'var(--space-3)',
}
const label = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6, fontFamily: 'var(--font-body)' }
const hint = { fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4, fontFamily: 'var(--font-body)' }
const row = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }

export default function LaunchSwitchesManager() {
  const [state, setState] = useState('loading')   // loading | ok | error
  const [form, setForm] = useState({ signupsPaused: false, catalogStatic: false })
  const [notice, setNotice] = useState(null)      // { ok, text }
  const [busy, setBusy] = useState(false)

  // Bumping reloadKey reads the two rows again.
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchSwitchRows([SIGNUPS_PAUSED_KEY, CATALOG_SWITCH_KEY])
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setState('error'); return }
        const byKey = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
        setForm({ signupsPaused: isSwitchOn(byKey[SIGNUPS_PAUSED_KEY]), catalogStatic: isSwitchOn(byKey[CATALOG_SWITCH_KEY]) })
        setState('ok')
      })
    return () => { cancelled = true }
  }, [reloadKey])

  function refresh() {
    setState('loading')
    setReloadKey(k => k + 1)
  }

  async function save() {
    setNotice(null)
    setBusy(true)
    try {
      await updateCmsConfig(SIGNUPS_PAUSED_KEY, switchValue(form.signupsPaused))
      await updateCmsConfig(CATALOG_SWITCH_KEY, switchValue(form.catalogStatic))
      setNotice({ ok: true, text: 'Saved. New sign-ups and downloads follow these from now on.' })
      setReloadKey(k => k + 1)
    } catch (err) {
      const refused = err?.code === '42501' || /row-level security|permission denied/i.test(String(err?.message))
      setNotice({ ok: false, text: refused ? 'Only an admin account can change these switches.' : 'Could not save. Check the connection and try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminPageHeader
      title="Launch switches"
      actions={
        <button
          type="button" onClick={refresh} disabled={state === 'loading' || busy} aria-label="Refresh"
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

      {state === 'error' && (
        <div role="alert" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 13, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
          Could not load the switches. Check the connection and press Refresh.
        </div>
      )}

      {state === 'ok' && (
        <div style={{ maxWidth: 560 }}>
          <div style={card}>
            <div style={label}>New sign-ups</div>
            <label style={row}>
              <input
                type="checkbox" checked={form.signupsPaused}
                onChange={e => setForm(f => ({ ...f, signupsPaused: e.target.checked }))} style={{ width: 20, height: 20 }}
              />
              Pause new sign-ups
            </label>
            <div style={hint}>
              On: the database refuses to create new accounts, and a new person trying Google sign-in sees a short &quot;paused&quot; message.
              People who already have an account sign in as usual. Accounts made from the admin tools are also refused while this is on.
            </div>
          </div>

          <div style={card}>
            <div style={label}>Drug list download</div>
            <label style={row}>
              <input
                type="checkbox" checked={form.catalogStatic}
                onChange={e => setForm(f => ({ ...f, catalogStatic: e.target.checked }))} style={{ width: 20, height: 20 }}
              />
              Download the drug list from Cloudflare
            </label>
            <div style={hint}>
              On: new installs and full refreshes read the static files from Cloudflare (faster, and no Supabase data used).
              Off: they download from Supabase as before. It takes effect the next time a phone does a full download.
            </div>
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
