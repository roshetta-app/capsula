/**
 * src/pages/LegalScreen.jsx
 * 2026-11-22 (Public profile plan, step 14.10): the Terms of Use and the Privacy Policy.
 *
 * One screen, two documents ('terms' or 'privacy'), reached from the Legal card in Settings and
 * placed like the FAQ page: outside the shared Layout (see router.jsx), own back-arrow header, no
 * BottomNav. The words live in utils/legalText.js; this file only draws them as plain text.
 */

import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { legalDocument } from '../utils/legalText'

export default function LegalScreen({ kind }) {
  const navigate = useNavigate()
  const doc = legalDocument(kind)
  if (!doc) return null

  return (
    <div>
      <header style={{
        position:        'sticky',
        top:             0,
        zIndex:          50,
        backgroundColor: 'var(--color-surface)',
        borderBottom:    '1px solid var(--color-border)',
        padding:         'var(--space-3) var(--space-6)',
        display:         'flex',
        alignItems:      'center',
        gap:             'var(--space-3)',
      }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{
            border:     'none',
            background: 'none',
            padding:    'var(--space-1)',
            display:    'flex',
            alignItems: 'center',
            cursor:     'pointer',
            color:      'var(--color-text-primary)',
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{
          margin:     0,
          fontSize:   17,
          fontWeight: 700,
          color:      'var(--color-text-primary)',
        }}>
          {doc.title}
        </h1>
      </header>

      <main style={{
        maxWidth: 680,
        margin:   '0 auto',
        padding:  'var(--space-6) var(--space-6) calc(var(--space-12) + 24px)',
      }}>
        <p style={{
          margin:     '0 0 var(--space-4)',
          fontSize:   13,
          color:      'var(--color-text-tertiary)',
        }}>
          {doc.updated}
        </p>

        {doc.sections.map((section, i) => (
          <section
            key={section.title}
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius:    'var(--radius-lg)',
              border:          '1px solid var(--color-border)',
              padding:         'var(--space-5)',
              marginBottom:    i < doc.sections.length - 1 ? 'var(--space-3)' : 0,
            }}
          >
            <h2 style={{
              margin:       '0 0 var(--space-2)',
              fontSize:     15,
              fontWeight:   600,
              color:        'var(--color-text-primary)',
            }}>
              {section.title}
            </h2>

            {section.paragraphs.map((text, j) => (
              <p key={j} style={{
                margin:     j === 0 ? 0 : 'var(--space-2) 0 0',
                fontSize:   14,
                lineHeight: 1.55,
                color:      'var(--color-text-secondary)',
              }}>
                {text}
              </p>
            ))}

            {section.list && (
              <ul style={{
                margin:      section.paragraphs.length ? 'var(--space-2) 0 0' : 0,
                paddingLeft: 'var(--space-5)',
                fontSize:    14,
                lineHeight:  1.55,
                color:       'var(--color-text-secondary)',
              }}>
                {section.list.map((text, j) => (
                  <li key={j} style={{ marginTop: j === 0 ? 0 : 'var(--space-1)' }}>{text}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
    </div>
  )
}
