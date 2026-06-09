/**
 * src/components/ErrorBoundary.jsx
 * Phase 3K — Global Error Boundary
 */

import { Component } from 'react'
import { logCrash } from '../utils/crashLogger'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
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
        backgroundColor: '#f9fafb',
        fontFamily:      'system-ui, sans-serif',
        textAlign:       'center',
        gap:             '16px',
      }}>
        <div style={{ fontSize: 40, opacity: 0.3 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
          Something went wrong
        </div>
        <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 320, lineHeight: 1.5 }}>
          The error has been logged and will be reviewed. Try reloading the app.
        </div>
        <button
          onClick={this.handleReload}
          style={{
            marginTop:       8,
            padding:         '10px 24px',
            borderRadius:    '8px',
            border:          'none',
            backgroundColor: '#2563eb',
            color:           '#fff',
            fontSize:        14,
            fontWeight:      600,
            cursor:          'pointer',
          }}
        >
          Reload app
        </button>
      </div>
    )
  }
}
