/**
 * src/components/ui/ShareCard.jsx
 * Phase 2J — Sharing
 *
 * Off-screen React component captured by html2canvas as a branded PNG.
 * Always light theme (never inherits dark mode).
 *
 * Props:
 *   condition     — { name, specialtyName }
 *   prescription  — { label, drugs: [{ brandName, concentration, form, dose, note }] }
 *   ref           — forwarded ref so the parent can pass it to html2canvas
 */

import { forwardRef } from 'react'

const ShareCard = forwardRef(function ShareCard({ condition, prescription }, ref) {
  const drugs = prescription?.drugs ?? []

  return (
    <div
      ref={ref}
      style={{
        // Fixed canvas size — html2canvas captures exactly this box
        width:           375,
        backgroundColor: '#FFFFFF',
        fontFamily:      "'DM Sans', 'Segoe UI', sans-serif",
        color:           '#111827',
        borderRadius:    16,
        overflow:        'hidden',
        boxShadow:       '0 4px 24px rgba(0,0,0,0.12)',
      }}
    >
      {/* ── Header bar ── */}
      <div style={{
        backgroundColor: '#1E40AF',
        padding:         '14px 20px',
        display:         'flex',
        alignItems:      'center',
        gap:             10,
      }}>
        {/* Capsule icon (inline SVG — no external deps) */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
          <circle cx="18" cy="18" r="4" />
          <line x1="16" y1="18" x2="20" y2="18" stroke="#FFFFFF" />
        </svg>
        <span style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>
          Capsula
        </span>
        {condition?.specialtyName && (
          <span style={{
            marginLeft:      'auto',
            fontSize:        11,
            color:           'rgba(255,255,255,0.75)',
            fontWeight:      500,
            letterSpacing:   '0.04em',
            textTransform:   'uppercase',
          }}>
            {condition.specialtyName}
          </span>
        )}
      </div>

      {/* ── Condition name ── */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: '#111827', lineHeight: 1.25, letterSpacing: '-0.3px' }}>
          {condition?.name ?? ''}
        </div>
        {prescription?.label && (
          <div style={{
            display:         'inline-block',
            marginTop:       8,
            fontSize:        12,
            fontWeight:      600,
            backgroundColor: '#DBEAFE',
            color:           '#1E40AF',
            padding:         '3px 10px',
            borderRadius:    999,
          }}>
            {prescription.label}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, backgroundColor: '#E5E7EB', margin: '14px 20px 0' }} />

      {/* ── Drug list ── */}
      <div style={{ padding: '12px 20px' }}>
        {drugs.map((drug, idx) => (
          <div key={idx} style={{
            display:       'flex',
            gap:           12,
            paddingBottom: 12,
            marginBottom:  idx < drugs.length - 1 ? 12 : 0,
            borderBottom:  idx < drugs.length - 1 ? '1px solid #F3F4F6' : 'none',
          }}>
            {/* Number badge */}
            <div style={{
              width:           22,
              height:          22,
              borderRadius:    '50%',
              backgroundColor: '#1E40AF',
              color:           '#FFFFFF',
              fontSize:        12,
              fontWeight:      700,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
              marginTop:       1,
            }}>
              {idx + 1}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Brand name + form */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                  {drug.brandName}
                </span>
                {drug.concentration && (
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    {drug.concentration}
                  </span>
                )}
                {drug.form && (
                  <span style={{
                    fontSize:        11,
                    fontWeight:      500,
                    backgroundColor: '#F3F4F6',
                    color:           '#374151',
                    padding:         '1px 7px',
                    borderRadius:    999,
                  }}>
                    {drug.form}
                  </span>
                )}
              </div>

              {/* Dose */}
              {drug.dose && (
                <div style={{ fontSize: 13, color: '#374151', marginTop: 3, lineHeight: 1.4 }}>
                  {drug.dose}
                </div>
              )}

              {/* Note */}
              {drug.note && (
                <div style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginTop: 2 }}>
                  {drug.note}
                </div>
              )}
            </div>
          </div>
        ))}

        {drugs.length === 0 && (
          <div style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>
            No drugs listed
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        backgroundColor: '#F9FAFB',
        borderTop:       '1px solid #E5E7EB',
        padding:         '10px 20px',
        display:         'flex',
        justifyContent:  'space-between',
        alignItems:      'center',
      }}>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>capsula.app</span>
        <span style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'right', maxWidth: '60%' }}>
          Clinical reference only. Verify before prescribing.
        </span>
      </div>
    </div>
  )
})

export default ShareCard
