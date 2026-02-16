<script setup lang="ts">
const { locale } = useI18n()
const head = useLocaleHead()
const route = useRoute()

/**
 * Global head configuration
 * @see https://nuxt.com/docs/getting-started/seo-meta
 */
const { checkSubdomain } = useTenant()
const config = useRuntimeConfig()

onMounted(() => {
  checkSubdomain()
})

const siteDescription = computed(() => (route?.meta?.description as string) || 'O Gestor IRPF é a plataforma definitiva para contadores dominarem a temporada de Imposto de Renda. Organize, automatize e escale seu escritório com segurança.')
const siteTitle = computed(() => route?.meta?.title ? `${route.meta.title} - Gestor IRPF` : 'Gestor IRPF - A Plataforma de Gestão do Contador Moderno')

useHead({
  title: () => route?.meta?.title as string ?? '',
  titleTemplate: (titleChunk) => {
    return titleChunk
      ? `${titleChunk} - Gestor IRPF`
      : `Gestor IRPF - A Plataforma de Gestão do Contador Moderno`
  },
  htmlAttrs: {
    lang: () => head.value.htmlAttrs!.lang || 'pt-BR',
    dir: () => (head.value.htmlAttrs!.dir as any) || 'ltr',
  },
  link: () => [
    ...(head.value.link || []),
    {
      rel: 'icon',
      type: 'image/png',
      href: '/img/logo-icon.png',
    },
    {
      rel: 'canonical',
      href: `https://gestorirpf.com.br${route.path}`,
    },
  ],
  meta: () => [
    ...(head.value.meta || []),
    {
      name: 'keywords',
      content: 'imposto de renda, irpf 2026, gestão para contadores, contabilidade digital, automação irpf, software para contadores, declaração de imposto de renda, gestor irpf',
    },
    {
      name: 'author',
      content: 'Gestor IRPF',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Gestor IRPF',
        url: 'https://gestorirpf.com.br',
        logo: 'https://gestorirpf.com.br/img/logo.png',
        sameAs: [
          'https://www.instagram.com/gestorirpf',
          // 'https://www.linkedin.com/company/gestorirpf',
        ],
        description: 'Plataforma líder em gestão de declarações de Imposto de Renda para profissionais contábeis.',
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Gestor IRPF',
        url: 'https://gestorirpf.com.br',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://gestorirpf.com.br/search?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      }),
    },
    ...(config.public.fbPixelId ? [
      {
        innerHTML: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${config.public.fbPixelId}');
          fbq('track', 'PageView');
        `,
        type: 'text/javascript',
      }
    ] : []),
  ],
  noscript: config.public.fbPixelId ? [
    {
      innerHTML: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${config.public.fbPixelId}&ev=PageView&noscript=1" />`,
      tagPosition: 'bodyClose'
    }
  ] : [],
})

useSeoMeta({
  description: siteDescription,
  ogType: 'website',
  ogSiteName: 'Gestor IRPF',
  ogUrl: computed(() => `https://gestorirpf.com.br${route.path}`),
  ogTitle: siteTitle,
  ogDescription: siteDescription,
  ogImage: 'https://gestorirpf.com.br/img/og-image.png',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
  twitterTitle: siteTitle,
  twitterDescription: siteDescription,
  twitterImage: 'https://gestorirpf.com.br/img/og-image.png',
})



</script>

<template>
  <BaseProviders :config="{ dir: head.htmlAttrs!.dir as any, locale }" :toast="{ position: 'top-center' }">
    <!--
      Global app search modal
      @see .demo/components/DemoAppSearch.vue
    -->
    <!-- <DemoAppSearch /> -->
    <!--
      Global app layout switcher
      @see .demo/components/DemoAppLayoutSwitcher.vue
    -->
    <!-- <DemoAppLayoutSwitcher /> -->

    <NuxtLayout>
      <NuxtLoadingIndicator color="var(--color-primary-500)" />
      <NuxtPage />
    </NuxtLayout>

    <TairoPanels />
    <MarketingBalloon />
  </BaseProviders>
</template>
