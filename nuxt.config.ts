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
  ],

  vite: {
    optimizeDeps: {
      include: [
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
  },
})
