import { defineUnlighthouseConfig } from 'unlighthouse/config'

// Audits the local production preview by default. Start it first with `bun run preview`
// (`bun run build && wrangler dev`, http://localhost:8787), then run `bun run lighthouse`.
// Override the target with `UNLIGHTHOUSE_SITE=https://example.com bun run lighthouse`.
export default defineUnlighthouseConfig({
  site: process.env.UNLIGHTHOUSE_SITE || 'http://localhost:8787',
  scanner: {
    device: 'desktop',
    samples: 3,
    throttle: true,
    maxRoutes: 100,
  },
})
