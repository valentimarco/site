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
    '@compodium/nuxt',
    '@nuxt/eslint',
    '@nuxt/hints',
    'nitro-cloudflare-dev'
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
        external: ['sharp'],
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
    enabled: false,
  },

  schemaOrg: {
    enabled: false,
  },

  sitemap: {
    enabled: false,
  },

  colorMode: {
    disableTransition: false,
  },

  routeRules: {
    '/cv': {
      headers: {
        'X-Frame-Options': 'SAMEORIGIN',
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
    '/api/github': {
      cache: {
        maxAge: 3600 // Cache at edge for 1 hour
      }
    }
  },

  nitro: {
    preset: "cloudflare_module",

    cloudflare: {
      deployConfig: true,
      nodeCompat: true
    }
  }
})