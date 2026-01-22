import { useApi } from '~/composables/useAuth'
import type { TenantData } from '~/types/tenant'

const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const

export default defineNuxtPlugin((nuxtApp) => {
  const { useCustomFetch } = useApi()

  // Default colors
  const defaultPrimaryColor = 'amber'
  const defaultSecondaryColor = 'zinc'

  // Apply whitelabel colors using Tailwind color names
  function applyWhitelabelColors(primaryColor: string, secondaryColor: string) {
    if (!process.client) return

    const root = document.documentElement

    // Apply primary color shades
    for (const shade of shades) {
      root.style.setProperty(
        `--color-primary-${shade}`,
        `var(--color-${primaryColor}-${shade})`
      )
    }

    // Apply muted (secondary) color shades
    for (const shade of shades) {
      root.style.setProperty(
        `--color-muted-${shade}`,
        `var(--color-${secondaryColor}-${shade})`
      )
    }
  }

  // Load and apply tenant colors after app is mounted
  nuxtApp.hook('app:mounted', async () => {
    try {
      const { data } = await useCustomFetch<{ success: boolean; data: TenantData }>('/tenant')

      if (data?.success && data?.data) {
        const primaryColor = data.data.primaryColor || defaultPrimaryColor
        const secondaryColor = data.data.secondaryColor || defaultSecondaryColor

        applyWhitelabelColors(primaryColor, secondaryColor)
      } else {
        // Apply defaults if no tenant data
        applyWhitelabelColors(defaultPrimaryColor, defaultSecondaryColor)
      }
    } catch (error) {
      console.error('Failed to load tenant whitelabel settings:', error)
      // Apply defaults on error
      applyWhitelabelColors(defaultPrimaryColor, defaultSecondaryColor)
    }
  })
})
