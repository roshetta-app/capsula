import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Build stamp used ONLY by the service worker's own cache-busting logic
// below — unique per build (or per dev-server start), so the SW's
// CACHE_VERSION changes on every deploy and forces the browser to evict old
// JS/CSS/asset caches and fetch fresh ones. That's the correct behavior for
// build assets: they must always bust on every deploy.
//
// 2026-08-03: this used to ALSO be piped into the app's drugs cache schema
// check (src/constants/cache.js's DRUGS_CACHE_SCHEMA_VERSION, via the
// VITE_BUILD_STAMP define below) — the idea being one shared value so the
// two could never drift out of sync. In practice this meant the local drugs
// cache (tens of MB, the full catalog) was invalidated on every single
// deploy too, not just ones that actually changed the drug data's shape.
// The drugs cache schema version is now instead derived from the actual
// query that defines that shape (FLAT_DRUG_SCHEMA_VERSION in
// src/lib/queries.js) — decoupled from this build stamp entirely, so the
// VITE_BUILD_STAMP define that used to expose this value to the app bundle
// has been removed; it's no longer used anywhere.
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
})
