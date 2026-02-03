import { useApi } from '~/composables/useAuth'

const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const

export default defineNuxtPlugin((nuxtApp) => {
  const { useCustomFetch } = useApi()

  // Default colors
  const defaultPrimaryColor = 'amber'
  const defaultSecondaryColor = 'zinc'

  // Apply whitelabel colors using Tailwind color names
  function applyWhitelabelColors(primaryColor: string, secondaryColor: string) {
    if (!process.client)
      return

    const root = document.documentElement

    // Apply primary color shades
    for (const shade of shades) {
      root.style.setProperty(
        `--color-primary-${shade}`,
        `var(--color-${primaryColor}-${shade})`,
      )
    }

    // Apply muted (secondary) color shades
    for (const shade of shades) {
      root.style.setProperty(
        `--color-muted-${shade}`,
        `var(--color-${secondaryColor}-${shade})`,
      )
    }
  }

  // Load settings from cookie
  const settings = useCookie<any>('whitelabel-settings')

  // Apply whitelabel colors on startup if cached
  if (settings.value?.primaryColor && settings.value?.secondaryColor) {
    applyWhitelabelColors(settings.value.primaryColor, settings.value.secondaryColor)
  }
  else {
    // Apply defaults if no cache
    applyWhitelabelColors(defaultPrimaryColor, defaultSecondaryColor)
  }

  // We no longer need to fetch /tenant here on every mount because
  // useTenant.ts handles it when needed and updates the cache.
  // This prevents double fetching and ensures colors are applied early.
})
