import { version } from './package.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    'motion-v/nuxt',
    'nuxt-vitalizer',
    '@formkit/auto-animate/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/seo',
    '@nuxt/content',
    '@nuxt/ui',
    '@nuxt/image',
    ...(process.env.NODE_ENV === 'development' ? ['@compodium/nuxt'] : []),
    '@nuxt/eslint',
    '@nuxt/hints',
  ],

  vite: {
    optimizeDeps: {
      include: [
        '@octokit/rest',
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ],
    },
    // NOTE: `build.rollupOptions.output.experimentalMinChunkSize` was tried here and had no effect —
    // the ~57 first-paint `modulepreload`s are async (lazily imported) UI/reka chunks that Rollup
    // will not merge. Cutting first-paint JS needs component-level lazy loading, not a size threshold.
  },

  ssr: true,
  css: ['~/assets/css/main.css'],
  compatibilityDate: 'latest',
  spaLoadingTemplate: './loading.html',

  experimental: {
    typedPages: true,
    payloadExtraction: true,
    emitRouteChunkError: 'automatic-immediate',
    asyncContext: true,
  },

  runtimeConfig: {
    githubToken: process.env.GITHUB_TOKEN || '',
    // Server-only: /api/github takes no client input and always queries this account.
    // Set via `wrangler secret put GITHUB_USERNAME` (or a Worker var) in production.
    githubUsername: process.env.GITHUB_USERNAME || '',
    public: {
      version,
      // Evaluated once per build process: a build-scoped id used by /api/github to key its KV
      // cache, so every deploy starts a fresh entry even without a version bump.
      buildId: Date.now().toString(36),
    },
  },

  hooks: {
    'prerender:routes': ({ routes }) => {
      routes.clear()
    },
  },

  ogImage: {
    enabled: false, // profile.md ships a static ogImage via useSeoMeta; module generation is intentionally off
  },

  schemaOrg: {
    enabled: true,
  },

  sitemap: {
    enabled: true,
  },
  site: { url: 'valentimarco.it' },

  // @nuxt/fonts does not preload subsetted (unicode-range) fonts by default, so the body-text LCP
  // waited for Space Grotesk to be discovered only after the inlined CSS parsed. Restrict to the
  // latin subset and preload it: one file, started with the document instead of ~500ms later.
  fonts: {
    families: [
      { name: 'Space Grotesk', preload: true, subsets: ['latin'] },
    ],
  },

  colorMode: {
    disableTransition: false,
  },

  // Styles are already inlined into the SSR HTML; the standalone `entry.<hash>.css` <link> only
  // duplicates them and render-blocks first paint, so drop it (Lighthouse LCP/FCP).
  vitalizer: {
    disableStylesheets: 'entry',
  },

  routeRules: {
    // The homepage is the only page with a live SSR pass and no isolate-cached render, so a cold
    // isolate re-rendered it (~1.2 s TTFB) on every fresh isolate. Cache it like the blog routes:
    // the GitHub-backed API payload refreshes at most hourly (`/api/github` KV cache) and is
    // invalidated on every deploy by the build-scoped cache key, so 5 min of HTML is fine. `swr`
    // serves the stale copy instantly while revalidating.
    '/': {
      cache: {
        maxAge: 300, // 5 min
        swr: true,
      },
    },
    '/blog': {
      cache: {
        maxAge: 300, // 5 min at edge
      },
    },
    '/blog/**': {
      cache: {
        maxAge: 3600, // 1 hour for individual posts
      },
    },
    // /api/github is intentionally NOT cached here: a plain routeRule cache cannot tell a healthy
    // response from a degraded one, so a single GitHub failure (bad token, rate limit, network blip)
    // would pin an empty `source: 'fallback'` payload at the edge. server/api/github.ts instead
    // caches healthy payloads in the KV-backed Nitro `cache` storage (see `nitro.storage` below).
    '/api/cv-pdf': {
      // Set NUXT_CV_PDF_DISABLE_CACHE=1 (e.g. in local .env) to bypass the edge cache while iterating on the PDF
      cache: ['1', 'true', 'yes', 'on'].includes((process.env.NUXT_CV_PDF_DISABLE_CACHE || '').toLowerCase())
        ? false
        : { maxAge: 3600 }, // Cache at edge for 1 hour (PDF is static personal data; protects GitHub rate limit)
    },
  },

  nitro: {
    preset: 'cloudflare_module',
    tracingChannel: true,

    // Persist the Nitro `cache` storage in Workers KV so values survive isolate cold starts. The
    // default driver is in-memory (per isolate), so a fresh isolate re-ran the whole Octokit chain
    // inline in SSR (~3.6s TTFB on `/`). `CACHE` is bound in wrangler.jsonc.
    storage: {
      cache: {
        driver: 'cloudflare-kv-binding',
        binding: 'CACHE',
      },
    },

    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },
})
