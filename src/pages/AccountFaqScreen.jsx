/**
 * src/pages/AccountFaqScreen.jsx
 * Phase F13 Mini-stage 5 (Account redesign)
 *
 * FAQ page, reached from the Account screen's menu list. Rendered outside
 * the shared Layout group (see router.jsx) — own back-arrow header, no
 * BottomNav, same convention as ConditionDetailScreen/DrugDetailScreen.
 *
 * PLACEHOLDER CONTENT — the questions/answers below are stand-ins, not
 * real copy. Nothing in the codebase or roadmap has actual FAQ content
 * for Capsula; FAQS array needs to be replaced with real questions/answers
 * before this ships to real users.
 */

import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// PLACEHOLDER — replace with real content before shipping.
const FAQS = [
  {
    question: 'Placeholder question one?',
    answer:   'Placeholder answer text goes here once real FAQ content is provided.',
  },
  {
    question: 'Placeholder question two?',
    answer:   'Placeholder answer text goes here once real FAQ content is provided.',
  },
  {
    question: 'Placeholder question three?',
    answer:   'Placeholder answer text goes here once real FAQ content is provided.',
  },
]

export default function AccountFaqScreen() {
  const navigate = useNavigate()

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
            border:          'none',
            background:      'none',
            padding:         'var(--space-1)',
            display:         'flex',
            alignItems:      'center',
            cursor:          'pointer',
            color:           'var(--color-text-primary)',
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
          FAQ
        </h1>
      </header>

      <main style={{
        maxWidth: 680,
        margin:   '0 auto',
        padding:  'var(--space-6) var(--space-6) calc(var(--space-12) + 24px)',
      }}>
        {FAQS.map((item, i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius:    'var(--radius-lg)',
              border:          '1px solid var(--color-border)',
              padding:         'var(--space-5)',
              marginBottom:    i < FAQS.length - 1 ? 'var(--space-3)' : 0,
            }}
          >
            <div style={{
              fontSize:     15,
              fontWeight:   600,
              color:        'var(--color-text-primary)',
              marginBottom: 'var(--space-2)',
            }}>
              {item.question}
            </div>
            <div style={{
              fontSize:   14,
              lineHeight: 1.55,
              color:      'var(--color-text-secondary)',
            }}>
              {item.answer}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
