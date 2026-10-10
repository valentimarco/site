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
    build: {
      rollupOptions: {
        output: {
          // The app is a single, statically-imported page + a blog. Nuxt/Vite otherwise emits a
          // separate tiny chunk (and a matching `modulepreload`) per component, which turns the
          // first paint into ~57 request waves on throttled connections. Merge them back together.
          experimentalMinChunkSize: 60_000,
        },
      },
    },
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

  colorMode: {
    disableTransition: false,
  },

  // Styles are already inlined into the SSR HTML; the standalone `entry.<hash>.css` <link> only
  // duplicates them and render-blocks first paint, so drop it (Lighthouse LCP/FCP).
  vitalizer: {
    disableStylesheets: 'entry',
  },

  routeRules: {
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
    // Caching for /api/github is defined in server/api/github.ts via defineCachedEventHandler,
    // not here: a plain routeRule cache cannot tell a healthy response from a degraded one, so a
    // single GitHub failure (bad token, rate limit, network blip) would pin an empty
    // `source: 'fallback'` payload at the edge for the full maxAge.
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

    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },
})
