import { useCallback, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlug } from '@fortawesome/free-solid-svg-icons'
import { getDawaagateStatus, setDawaagateFallback, getR2PicturesStatus, setR2Pictures } from '../../lib/adminQueries'
import { useToast } from '../../context/ToastContext'
import ConfirmModal from './ConfirmModal'

/**
 * DawaaGateCard — admin Home card for the DawaaGate failure plan (S15s Part B).
 *
 * Shows the automatic status (OK / Down / Layout changed), since when, the last
 * check, the last few status changes, and a button that turns the fallback on
 * or off by hand. Loads its own data, so a failure here never touches the
 * three stat cards beside it. Only admins can read or switch: the database
 * functions refuse everyone else.
 *
 * 2026-11-10 (S15r, Omar): a second control for the picture copies on Cloudflare
 * R2. "R2 pictures: ON" means the app shows pictures from our own copy; OFF
 * sends them back to DawaaGate. It loads and saves on its own, so a failure
 * there never touches the DawaaGate status above it.
 */

const STATUS_LABEL = {
  ok:             { text: 'OK',             color: 'var(--color-success, #16a34a)' },
  down:           { text: 'Down',           color: 'var(--color-error, #ef4444)' },
  layout_changed: { text: 'Layout changed', color: 'var(--color-warning, #d97706)' },
}

const VERDICT_LABEL = {
  good: 'all good', down: 'site not answering', layout: 'page or picture changed', unknown: 'unclear',
}

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function flipLabel(f) {
  return `${String(f.from_status ?? '').replace('_', ' ')} → ${String(f.to_status ?? '').replace('_', ' ')}`
}

export default function DawaaGateCard() {
  const { toast } = useToast()
  const [info, setInfo]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [saving, setSaving]       = useState(false)
  const [confirmOpen, setConfirm] = useState(false)
  const [r2, setR2]               = useState(null)   // 'on' | 'off' | null (not loaded)
  const [r2Error, setR2Error]     = useState(null)
  const [r2Saving, setR2Saving]   = useState(false)
  const [r2Confirm, setR2Confirm] = useState(false)

  const load = useCallback(async () => {
    const { data, error: err } = await getDawaagateStatus()
    if (err) { setError(err); setInfo(null) } else { setError(null); setInfo(data) }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    getDawaagateStatus().then(({ data, error: err }) => {
      if (cancelled) return
      if (err) { setError(err); setInfo(null) } else { setError(null); setInfo(data) }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const loadR2 = useCallback(async () => {
    const { data, error: err } = await getR2PicturesStatus()
    if (err) { setR2Error(err); setR2(null) } else { setR2Error(null); setR2(data) }
  }, [])

  useEffect(() => {
    let cancelled = false
    getR2PicturesStatus().then(({ data, error: err }) => {
      if (cancelled) return
      if (err) { setR2Error(err); setR2(null) } else { setR2Error(null); setR2(data) }
    })
    return () => { cancelled = true }
  }, [])

  const r2On = r2 === 'on'

  async function applyR2Switch() {
    setR2Saving(true)
    const { error: err } = await setR2Pictures(!r2On)
    setR2Saving(false)
    if (err) { toast.error(err.message ?? 'Could not change the picture switch.'); return }
    toast.success(r2On ? 'R2 pictures turned off' : 'R2 pictures turned on')
    loadR2()
  }

  const handOn  = info?.force_fallback === 'on'
  const status  = STATUS_LABEL[info?.status] ?? { text: info?.status ?? '—', color: 'var(--color-text-tertiary)' }
  const flips   = (info?.flips ?? []).slice(0, 5)

  async function applySwitch() {
    setSaving(true)
    const { error: err } = await setDawaagateFallback(!handOn)
    setSaving(false)
    if (err) { toast.error(err.message ?? 'Could not change the switch.'); return }
    toast.success(handOn ? 'Fallback turned off' : 'Fallback turned on')
    load()
  }

  return (
    <div style={{
      gridColumn: '1 / -1',
      padding: 'var(--space-4)',
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <FontAwesomeIcon icon={faPlug} style={{ width: 20, height: 20 }} />
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2, color: loading || error ? 'var(--color-text-primary)' : status.color }}>
            {loading ? '—' : error ? 'Unavailable' : status.text}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>DawaaGate</div>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--color-danger, #d33)', fontSize: 14, marginTop: 'var(--space-3)' }}>
          Couldn't load the DawaaGate status — {error.message ?? 'please try refreshing.'}
        </div>
      )}

      {info && (
        <div style={{ marginTop: 'var(--space-3)', fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
          <div>Since {fmt(info.since)}</div>
          <div>
            Last check {info.last_check ? `${fmt(info.last_check.sent_at)} (${VERDICT_LABEL[info.last_check.verdict] ?? info.last_check.verdict})` : '—'}
            {' · '}{info.checks_24h ?? 0} checks in 24 h
          </div>
          {handOn && (
            <div style={{ color: 'var(--color-warning, #d97706)', fontWeight: 600 }}>
              Hand switch is ON: the app is using the fallback.
            </div>
          )}
          {!handOn && info.fallback_on && (
            <div style={{ color: 'var(--color-warning, #d97706)', fontWeight: 600 }}>
              The app is using the fallback because DawaaGate is not OK.
            </div>
          )}

          {flips.length > 0 && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <div style={{ fontWeight: 600 }}>Recent changes</div>
              {flips.map(f => (
                <div key={f.id}>{fmt(f.at)} — {flipLabel(f)}</div>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => setConfirm(true)}
            style={{
              marginTop: 'var(--space-3)',
              padding: '8px 14px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: handOn ? 'var(--color-surface)' : 'var(--color-error, #ef4444)',
              color: handOn ? 'var(--color-text-primary)' : '#fff',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {handOn ? 'Turn fallback off' : 'Turn fallback on'}
          </button>
        </div>
      )}

      <div style={{
        marginTop: 'var(--space-4)',
        paddingTop: 'var(--space-3)',
        borderTop: '1px solid var(--color-border)',
        fontSize: 13,
        lineHeight: 1.6,
        color: 'var(--color-text-secondary)',
      }}>
        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Our own picture copies (R2):{' '}
          <span style={{ color: r2Error || r2 === null ? 'var(--color-text-tertiary)' : r2On ? 'var(--color-success, #16a34a)' : 'var(--color-warning, #d97706)' }}>
            {r2Error ? 'Unavailable' : r2 === null ? '—' : r2On ? 'ON' : 'OFF'}
          </span>
        </div>
        <div>
          {r2Error
            ? `Couldn't load the picture switch — ${r2Error.message ?? 'please try refreshing.'}`
            : r2On
              ? 'Pictures load from our own copy. Turn this off if the copy ever has a problem: pictures then load from DawaaGate again.'
              : 'Pictures load from DawaaGate. Turn this on to use our own copy again.'}
        </div>
        {r2 !== null && !r2Error && (
          <button
            type="button"
            disabled={r2Saving}
            onClick={() => setR2Confirm(true)}
            style={{
              marginTop: 'var(--space-2)',
              padding: '8px 14px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: r2On ? 'var(--color-error, #ef4444)' : 'var(--color-surface)',
              color: r2On ? '#fff' : 'var(--color-text-primary)',
              cursor: r2Saving ? 'default' : 'pointer',
              opacity: r2Saving ? 0.6 : 1,
            }}
          >
            {r2On ? 'Turn R2 pictures off' : 'Turn R2 pictures on'}
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={r2Confirm}
        onClose={() => setR2Confirm(false)}
        onConfirm={applyR2Switch}
        title={r2On ? 'Turn R2 pictures off?' : 'Turn R2 pictures on?'}
        message={r2On
          ? 'The app goes back to loading pictures from DawaaGate, unless the fallback above is on.'
          : 'The app loads pictures from our own copy again, for every drug that has one.'}
        confirmLabel={r2On ? 'Turn off' : 'Turn on'}
        confirmVariant={r2On ? 'danger' : 'primary'}
      />

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirm(false)}
        onConfirm={applySwitch}
        title={handOn ? 'Turn the fallback off?' : 'Turn the fallback on?'}
        message={handOn
          ? 'The app goes back to showing pictures and DawaaGate price pages, unless DawaaGate itself is down.'
          : 'The app stops showing pictures right away (DawaaGate and our own copy), and the price icon opens a web search instead of the DawaaGate page.'}
        confirmLabel={handOn ? 'Turn off' : 'Turn on'}
        confirmVariant={handOn ? 'primary' : 'danger'}
      />
    </div>
  )
}
