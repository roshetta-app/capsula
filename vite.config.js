import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Single build stamp shared by both the service worker's own cache-busting
// logic and the app's drugs cache schema check (src/constants/cache.js) —
// one value, computed once per build (or once per dev-server start), so the
// two can never drift out of sync the way a manually-typed version number
// could (and did, twice, before this).
const BUILD_STAMP = Date.now().toString(36) // e.g. "lq3k8f2" — short, unique per build

// ─── Service Worker build-stamp plugin ───────────────────────────────────────
// Replaces __BUILD_SHA__ in public/sw.js with a unique timestamp at build time
// so the SW cache key changes on every deploy, forcing old caches to be evicted.

function swBuildStampPlugin() {
  return {
    name: 'sw-build-stamp',

    // During dev: patch sw.js on the fly when requested
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/capsula/sw.js' || req.url === '/sw.js') {
          const swPath = path.resolve(__dirname, 'public/sw.js')
          const content = fs.readFileSync(swPath, 'utf8')
            .replace(/__BUILD_SHA__/g, `dev-${BUILD_STAMP}`)
          res.setHeader('Content-Type', 'application/javascript')
          res.end(content)
          return
        }
        next()
      })
    },

    // During build: write patched sw.js into dist/
    closeBundle() {
      const swSrc  = path.resolve(__dirname, 'public/sw.js')
      const swDest = path.resolve(__dirname, 'dist/sw.js')
      if (!fs.existsSync(swSrc)) return
      fs.mkdirSync(path.dirname(swDest), { recursive: true })
      const content = fs.readFileSync(swSrc, 'utf8')
        .replace(/__BUILD_SHA__/g, BUILD_STAMP)
      fs.writeFileSync(swDest, content, 'utf8')
      console.log(`[sw-build-stamp] CACHE_VERSION stamped: capsula-v${BUILD_STAMP}`)
    },
  }
}

export default defineConfig({
  plugins: [react(), swBuildStampPlugin()],
  base: '/capsula/',
  define: {
    // Exposes the same build stamp used for the service worker to the app
    // bundle itself, so src/constants/cache.js's drugs-cache schema check
    // is stamped automatically on every build/deploy — no manually-typed
    // number to remember to bump whenever a new field is added to the
    // cached drug shape (see cache.js for the history of that going wrong
    // twice: fillVolume/formModifier, then again with sources).
    'import.meta.env.VITE_BUILD_STAMP': JSON.stringify(BUILD_STAMP),
  },
})
