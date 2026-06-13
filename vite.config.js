import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// ─── Service Worker build-stamp plugin ───────────────────────────────────────
// Replaces __BUILD_SHA__ in public/sw.js with a unique timestamp at build time
// so the SW cache key changes on every deploy, forcing old caches to be evicted.

function swBuildStampPlugin() {
  const stamp = Date.now().toString(36) // e.g. "lq3k8f2" — short, unique per build

  return {
    name: 'sw-build-stamp',

    // During dev: patch sw.js on the fly when requested
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/capsula/sw.js' || req.url === '/sw.js') {
          const swPath = path.resolve(__dirname, 'public/sw.js')
          const content = fs.readFileSync(swPath, 'utf8')
            .replace(/__BUILD_SHA__/g, `dev-${stamp}`)
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
        .replace(/__BUILD_SHA__/g, stamp)
      fs.writeFileSync(swDest, content, 'utf8')
      console.log(`[sw-build-stamp] CACHE_VERSION stamped: capsula-v${stamp}`)
    },
  }
}

export default defineConfig({
  plugins: [react(), swBuildStampPlugin()],
  base: '/capsula/',
})
