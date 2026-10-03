/**
 * src/debug/backTrace.js
 *
 * TEMPORARY diagnostic for the 'second Back refreshes the page' bug on the
 * class sheet (website / installed app). Remove this file and its one import
 * line in src/main.jsx once the bug is fixed.
 *
 * Does nothing unless switched on. To switch it on, open the site once with
 * '?backdebug=1' at the end of the address (for example
 * https://your-site/capsula/drugs?backdebug=1). It stays on for that browser
 * tab until you open '?backdebug=off' or close the tab.
 *
 * When on, a small log panel is pinned to the top of the screen. It records,
 * with a timestamp, every Back press (popstate), every history step the app
 * adds or replaces (with the line of code that did it), every page unload or
 * reload, and any error. The log is kept across a page reload, and each page
 * load is marked with its type ('reload' means a real browser refresh;
 * 'navigate' or 'back_forward' mean something else). After each Back press it
 * also notes how many pop-up sheets are still on screen.
 *
 * It only watches. It never changes history, never blocks a Back press and
 * never touches any app state. The panel has three buttons: Copy (puts the
 * whole log on the clipboard), Clear, and Hide/Show.
 */

const FLAG_KEY   = 'capsula_backdebug'
const LOG_KEY    = 'capsula_backdebug_log'
const MAX_LINES  = 80

function isEnabled() {
  try {
    const search = window.location.search || ''
    if (search.indexOf('backdebug=off') !== -1) {
      sessionStorage.removeItem(FLAG_KEY)
      sessionStorage.removeItem(LOG_KEY)
      return false
    }
    if (search.indexOf('backdebug') !== -1) sessionStorage.setItem(FLAG_KEY, '1')
    return sessionStorage.getItem(FLAG_KEY) === '1'
  } catch (e) {
    return false
  }
}

function install() {
  if (typeof window === 'undefined') return
  if (window.__capsulaBackTraceInstalled) return
  if (!isEnabled()) return
  window.__capsulaBackTraceInstalled = true

  // ── Log storage (kept across reloads in sessionStorage) ──────────────────
  let lines = []
  try {
    const saved = sessionStorage.getItem(LOG_KEY)
    if (saved) lines = JSON.parse(saved)
    if (!Array.isArray(lines)) lines = []
  } catch (e) {
    lines = []
  }

  let panelText = null

  function stamp() {
    const d = new Date()
    const p = (n, w) => String(n).padStart(w || 2, '0')
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' + p(d.getMilliseconds(), 3)
  }

  function render() {
    if (!panelText) return
    panelText.textContent = lines.join('\n')
    panelText.scrollTop = panelText.scrollHeight
  }

  function log(tag, detail) {
    lines.push(stamp() + ' ' + tag + (detail ? ' ' + detail : ''))
    if (lines.length > MAX_LINES) lines = lines.slice(lines.length - MAX_LINES)
    try { sessionStorage.setItem(LOG_KEY, JSON.stringify(lines)) } catch (e) { /* storage unavailable: log stays in memory only */ }
    render()
  }

  function shortState(s) {
    try {
      if (s === null || s === undefined) return 'null'
      const json = JSON.stringify(s)
      return json.length > 70 ? json.slice(0, 70) + '...' : json
    } catch (e) {
      return '[unreadable]'
    }
  }

  function where() {
    try {
      const stack = String(new Error().stack || '').split('\n')
      // line 0 is the error text, line 1 is this helper, line 2 is the
      // history wrapper, line 3 is whoever called pushState/replaceState.
      const caller = (stack[3] || stack[2] || '').trim()
      return caller.length > 110 ? caller.slice(0, 110) + '...' : caller
    } catch (e) {
      return ''
    }
  }

  function here() {
    return window.location.pathname + window.location.search
  }

  function dialogCount() {
    try { return document.querySelectorAll('[role="dialog"]').length } catch (e) { return -1 }
  }

  // ── Page load marker ─────────────────────────────────────────────────────
  let navType = 'unknown'
  try {
    const nav = performance.getEntriesByType('navigation')[0]
    if (nav && nav.type) navType = nav.type
  } catch (e) { /* older browser: type stays unknown */ }
  log('==== PAGE LOADED', 'type=' + navType + ' url=' + here() + ' historyLen=' + window.history.length)

  // ── History watching (wraps pushState / replaceState, behaviour unchanged) ─
  const origPush    = window.history.pushState
  const origReplace = window.history.replaceState

  window.history.pushState = function () {
    log('pushState', 'state=' + shortState(arguments[0]) + ' url=' + (arguments[2] == null ? '(same)' : arguments[2]) + ' | ' + where())
    return origPush.apply(this, arguments)
  }
  window.history.replaceState = function () {
    log('replaceState', 'state=' + shortState(arguments[0]) + ' url=' + (arguments[2] == null ? '(same)' : arguments[2]) + ' | ' + where())
    return origReplace.apply(this, arguments)
  }

  // ── Event watching ───────────────────────────────────────────────────────
  // Capture phase and registered first, so this line is written before any
  // other popstate listener in the app reacts to the same press.
  window.addEventListener('popstate', function () {
    log('POPSTATE', 'url=' + here() + ' state=' + shortState(window.history.state) + ' historyLen=' + window.history.length + ' dialogsNow=' + dialogCount())
    setTimeout(function () {
      log('  after-popstate', 'url=' + here() + ' dialogs=' + dialogCount())
    }, 120)
  }, true)

  window.addEventListener('beforeunload', function () {
    log('beforeunload', 'page is about to unload or reload')
  })
  window.addEventListener('pagehide', function (e) {
    log('pagehide', 'persisted=' + !!e.persisted)
  })
  window.addEventListener('pageshow', function (e) {
    log('pageshow', 'persisted=' + !!e.persisted)
  })
  document.addEventListener('visibilitychange', function () {
    log('visibility', document.visibilityState)
  })
  window.addEventListener('error', function (e) {
    log('ERROR', String((e && e.message) || e).slice(0, 140))
  })
  window.addEventListener('unhandledrejection', function (e) {
    const r = e && e.reason
    log('REJECTION', String((r && r.message) || r).slice(0, 140))
  })
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        log('sw-controllerchange', 'a new service worker took control')
      })
      navigator.serviceWorker.addEventListener('message', function (e) {
        log('sw-message', shortState(e && e.data))
      })
    }
  } catch (e) { /* no service worker support */ }

  // ── Panel (fixed to the top, outside the app's own layout) ────────────────
  function buildPanel() {
    const root = document.createElement('div')
    root.setAttribute('data-backdebug', 'panel')
    root.style.cssText = [
      'position:fixed', 'left:0', 'right:0', 'top:env(safe-area-inset-top,0px)',
      'z-index:2147483647', 'background:rgba(0,0,0,0.82)', 'color:#9ef59e',
      'font:10px/1.35 monospace', 'padding:4px', 'box-sizing:border-box',
    ].join(';')

    const bar = document.createElement('div')
    bar.style.cssText = 'display:flex;gap:6px;margin-bottom:3px'

    const text = document.createElement('pre')
    text.style.cssText = 'margin:0;max-height:34vh;overflow:auto;white-space:pre-wrap;word-break:break-all'

    function button(label, onClick) {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = label
      b.style.cssText = 'font:11px sans-serif;padding:3px 10px;border-radius:4px;border:1px solid #888;background:#222;color:#fff'
      b.addEventListener('click', onClick)
      return b
    }

    bar.appendChild(button('Copy', function () {
      const all = lines.join('\n')
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(all).then(function () { log('(copied)', '') }, function () { fallbackCopy(all) })
      } else {
        fallbackCopy(all)
      }
    }))
    bar.appendChild(button('Clear', function () {
      lines = []
      try { sessionStorage.setItem(LOG_KEY, '[]') } catch (e) { /* ignore */ }
      render()
    }))
    let hidden = false
    bar.appendChild(button('Hide/Show', function () {
      hidden = !hidden
      text.style.display = hidden ? 'none' : 'block'
    }))

    root.appendChild(bar)
    root.appendChild(text)
    panelText = text
    document.documentElement.appendChild(root)
    render()
  }

  function fallbackCopy(all) {
    try {
      const ta = document.createElement('textarea')
      ta.value = all
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
      document.documentElement.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.documentElement.removeChild(ta)
      log('(copied)', '')
    } catch (e) {
      log('(copy failed)', 'select the log text by hand instead')
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildPanel)
  } else {
    buildPanel()
  }
}

install()
