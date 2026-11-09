/**
 * src/components/admin/PhonePreviewModal.jsx
 *
 * 2026-11-09: "Phone preview" in the condition editor's top bar. Opens a popup
 * with a phone-sized screen showing the condition the way the app draws it,
 * from what is on the editor right now (saved or not).
 *
 * It uses the app's own Treatment and Clinical tab components, so it follows
 * the real screen. Two deliberate differences: the Personal Notes section is
 * left out (it needs the signed-in app, which the editor does not have), and
 * tapping a drug does nothing (PreviewModeContext turns navigation off).
 * A crash inside the preview is caught here and never takes the editor down.
 *
 * 2026-11-09 fix: the preview used to wrap its content in its own MemoryRouter.
 * The editor already sits inside the app's router, and React Router refuses a
 * router inside a router, so every open showed the "could not draw" message.
 * It now reuses the editor's router.
 */
import { Component, useEffect, useMemo, useState } from 'react'
import { X, ArrowLeft } from 'lucide-react'
import { PreviewModeContext } from '../../context/PreviewModeContext'
import PrescriptionsTab from '../conditions/PrescriptionsTab'
import ClinicalDataTab from '../conditions/ClinicalDataTab'

const TABS = ['Treatment', 'Clinical']

// Editor rows -> the shape the app screens read (see mapConditions in queries.js).
function toAppBlocks(blocks = []) {
  return blocks.map((b, i) => ({
    id: b.id ?? `preview-${i}`,
    blockType: b.block_type,
    orderIndex: b.order_index ?? i,
    data: b.data,
  }))
}

class PreviewBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidUpdate(prev) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false })
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
        The preview could not draw this page. Your edits are safe. Change something and it will try again.
      </div>
    )
  }
}

export default function PhonePreviewModal({ isOpen, onClose, name, blocks }) {
  const [tab, setTab] = useState(0)
  const appBlocks = useMemo(() => toAppBlocks(blocks), [blocks])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="cms-preview-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--space-4)', fontFamily: 'var(--font-body)',
      }}
    >
      <div className="cms-preview-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          className="cms-preview-close"
          onClick={onClose}
          aria-label="Close preview"
          style={{
            alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 'var(--radius-full)', border: 'none',
            backgroundColor: 'rgba(255,255,255,0.16)', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          <X size={14} /> Close
        </button>

        {/* Phone */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Phone preview"
          className="cms-phone-preview"
          style={{
            width: 390, maxWidth: '100%',
            height: 'min(780px, calc(100dvh - 90px))',
            backgroundColor: 'var(--color-bg)',
            border: '8px solid #111827', borderRadius: 36,
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Top of the screen: back arrow, name, tabs */}
          <div style={{ flexShrink: 0, padding: 'var(--space-3) var(--space-6) 0', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 8 }}>
              <ArrowLeft size={16} /> Back
            </div>
            <h1 style={{
              fontSize: 22, fontWeight: 600, margin: '0 0 10px 0', lineHeight: 1.2,
              letterSpacing: '-0.4px', color: 'var(--color-text-primary)',
            }}>
              {name?.trim() || 'Untitled condition'}
            </h1>
            <div style={{ display: 'flex' }}>
              {TABS.map((label, i) => {
                const active = tab === i
                const color = active ? 'var(--color-accent)' : 'var(--color-text-secondary)'
                return (
                  <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setTab(i)}
                      style={{
                        width: '100%', padding: '7px var(--space-2)', border: 'none', background: 'none',
                        cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 500, color,
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {label}
                    </button>
                    <span style={{
                      display: 'block', height: 2, width: '100%', marginTop: 4,
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: active ? 'var(--color-accent)' : 'transparent',
                    }} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Scrolling content, same padding as the app */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
            <div style={{ padding: 'var(--space-5) var(--space-6) var(--space-6)' }}>
              <PreviewBoundary resetKey={appBlocks}>
                <PreviewModeContext.Provider value={true}>
                  {tab === 0
                    ? <PrescriptionsTab blocks={appBlocks} />
                    : <ClinicalDataTab blocks={appBlocks} />}
                </PreviewModeContext.Provider>
              </PreviewBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
