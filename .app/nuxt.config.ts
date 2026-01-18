export default defineNuxtConfig({
  compatibilityDate: '2024-11-26',
  future: {
    compatibilityVersion: 4,
  },
  extends: [
    /**
     * This extends the base Tairo layer.
     *
     * Alternatively you can use the following:
     * ["gh:cssninjaStudio/tairo/layers/tairo#v1.4.0", {
     *    install: true,
     *    auth: import.meta.env.GITHUB_TOKEN,
     * }]
     *
     * @see https://github.com/unjs/c12#extending-config-layer-from-remote-sources
     *
     * This would allows you to create an empty git repository
     * with only your source code and no demo.
     */

    '../layers/tairo',
  ],

  modules: [
    'reka-ui/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/i18n',
    '@nuxt/image',
    '@nuxt/content',
    '@nuxt/fonts',
  ],

  plugins: [
    '~/plugins/api.ts',
    '~/plugins/recaptcha.client.ts',
  ],

  content: {
    build: {
      markdown: {
        toc: { depth: 3, searchDepth: 2 },
        highlight: {
          theme: {
            default: 'github-light',
            dark: 'github-dark',
          },
        },
      },
    },
    renderer: {
      anchorLinks: true,
    },
  },

  experimental: {
    viewTransition: true,
    // buildCache: true,
    sharedPrerenderData: true,
    defaults: {
      nuxtLink: {
        // Here we disable the prefetch for visibility and enable it for interaction.
        // This is a good balance between performance and user experience when having a lot of links.
        prefetchOn: {
          visibility: false,
          interaction: true,
        },
      },
    },
  },
  $development: {
    experimental: {
      // Disable prefetch for development, this will make the development faster.
      defaults: {
        nuxtLink: {
          prefetch: false,
        },
      },
    },
  },

  css: [
    /**
     * Load Tailwind CSS
     */
    '~/assets/main.css',
  ],
  fonts: {
    experimental: {
      processCSSVariables: true,
    },
  },

  i18n: {
    baseUrl: '/',
    // We use no_prefix strategy to avoid having the locale prefix in the URL,
    // This may not be the best strategy for SEO, but it's the best for the demo.
    // We recommend using the default prefix_except_default strategy for SEO.
    strategy: 'no_prefix',
    defaultLocale: 'pt-BR' as const,
    lazy: true,
    locales: [
      { code: 'pt-BR', dir: 'ltr', language: 'pt-BR', file: 'pt-BR.yaml', name: 'Português', isCatchallLocale: true },
    ],
    // Use i18n v10 features
    experimental: {
      generatedLocaleFilePathFormat: 'off',
    },
    bundle: {
      optimizeTranslationDirective: false,
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE || 'https://dolphin-app-945a9.ondigitalocean.app',
      recaptcha: {
        siteKey: '6LeaWz4rAAAAABMpDVUnge1SNvB2OtQ7JSwpQJSS',
      },
    },
  },

  app: {
    head: {
      script: [
        {
          src: `https://www.google.com/recaptcha/api.js?render=6LeaWz4rAAAAABMpDVUnge1SNvB2OtQ7JSwpQJSS`,
          async: true,
          defer: true,
        },
      ],
    },
  },

  vite: {
    define: {
      // Enable / disable Options API support. Disabling this will result in smaller bundles,
      // but may affect compatibility with 3rd party libraries if they rely on Options API.
      __VUE_OPTIONS_API__: false,
    },
    css: {
      // LightningCSS is a rust based CSS minifier that is faster than the default CSS minifier.
      // @see https://vite.dev/guide/features.html#lightning-css
      // @see https://lightningcss.dev/
      transformer: 'lightningcss',
    },
    build: {
      target: 'esnext',
      cssMinify: 'lightningcss',
      reportCompressedSize: false,
    },
    // Defining the optimizeDeps.include option prebuilds the dependencies, this avoid
    // some reloads when navigating between pages during development.
    // It's also useful to track them usage.
    optimizeDeps: {
      include: [
        // 'scule',
        'klona',
        // AddonDatepicker
        'v-calendar',
        // AddonApexcharts
        'vue3-apexcharts',
        // 'AddonInputPhone',
        'libphonenumber-js/max',
        'country-codes-list',
        // 'AddonInputPassword',
        // '@zxcvbn-ts/core',
        // '@zxcvbn-ts/language-common',
        // '@zxcvbn-ts/language-en',
        // '@zxcvbn-ts/language-fr',
        // AddonMapboxLocationPicker
        // 'ohash',
        // 'mapbox-gl',
        // '@mapbox/mapbox-gl-geocoder',
        // form validation
        '@vee-validate/zod',
        'vee-validate',
        'zod',
        // calendar app
        // 'vue3-smooth-dnd',
        // 'date-fns',
        // 'date-fns/locale',
        // profile edit page
        'imask',
        '@headlessui/vue',
      ],
    },
  },
})
