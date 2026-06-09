/**
 * src/components/ErrorBoundary.jsx
 * Phase 3K — Global Error Boundary
 *
 * Wraps the entire app. On any uncaught React render error:
 *   1. Logs to Supabase via crashLogger
 *   2. Shows a friendly recovery UI instead of a blank screen
 *
 * Must be a class component — React error boundaries require lifecycle methods
 * (getDerivedStateFromError / componentDidCatch) that hooks cannot provide.
 */

import { Component } from 'react'
import { logCrash } from '../utils/crashLogger'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMessage: null }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError:     true,
      errorMessage: error?.message ?? 'An unexpected error occurred.',
    }
  }

  componentDidCatch(error, info) {
    logCrash(error, info?.componentStack ?? null)
  }

  handleReload() {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight:       '100dvh',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         '24px',
        backgroundColor: 'var(--color-bg, #f9fafb)',
        fontFamily:      'var(--font-body, system-ui, sans-serif)',
        textAlign:       'center',
        gap:             '16px',
      }}>

        <div style={{ fontSize: 40, opacity: 0.3 }}>⚠️</div>

        <div style={{
          fontSize:   18,
          fontWeight: 700,
          color:      'var(--color-text-primary, #111)',
        }}>
          Something went wrong
        </div>

        <div style={{
          fontSize:  13,
          color:     'var(--color-text-tertiary, #6b7280)',
          maxWidth:  320,
          lineHeight: 1.5,
        }}>
          The error has been logged and will be reviewed. Try reloading the app.
        </div>

        <button
          onClick={this.handleReload}
          style={{
            marginTop:       8,
            padding:         '10px 24px',
            borderRadius:    'var(--radius-sm, 8px)',
            border:          '1px solid var(--color-border, #e5e7eb)',
            backgroundColor: 'var(--color-accent, #2563eb)',
            color:           '#fff',
            fontSize:        14,
            fontWeight:      600,
            fontFamily:      'var(--font-body, system-ui, sans-serif)',
            cursor:          'pointer',
          }}
        >
          Reload app
        </button>

      </div>
    )
  }
}
