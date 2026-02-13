import { useApi } from '~/composables/useAuth'

export function useTenant() {
  const { useCustomFetch } = useApi()
  const { applyColors, settings } = useWhitelabel()

  // Initialize tenant data from cached settings if available
  const tenant = useState<any>('tenant-data', () => {
    if (settings.value) {
      return {
        primaryColor: settings.value.primaryColor,
        secondaryColor: settings.value.secondaryColor,
        logo: settings.value.logo,
        name: settings.value.name,
        tradeName: settings.value.tradeName,
      }
    }
    return null
  })

  const isLoading = ref(false)
  const config = useRuntimeConfig()
  const apiBaseUrl = (config.public.apiBase as string || '').replace(/\/$/, '')

  const fetchTenant = async (force = false) => {
    // If we have full data from API (not just cache) and not loading, we can skip
    if ((tenant.value?.name && !isLoading.value && !force))
      return tenant.value

    isLoading.value = true
    try {
      const { data } = await useCustomFetch<any>('/tenant')
      const source = data.data || data

      // Update the tenant state - this will trigger the watchEffect below
      tenant.value = source

      // Apply and persist whitelabel colors if available - this will update the cookie
      if (source?.primaryColor && source?.secondaryColor) {
        applyColors(
          source.primaryColor,
          source.secondaryColor,
          source.logo,
          source.name,
          source.tradeName,
        )
      }

      return source
    }
    catch (error) {
      console.error('Error fetching tenant metadata:', error)
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  const checkSubdomain = async () => {
    if (!process.client) return

    const hostname = window.location.hostname
    const parts = hostname.split('.')

    // Ignore common subdomains or localhost
    const ignore = ['app', 'www', 'localhost', '127']

    let slug = parts.length > 2 ? parts[0] : null

    // For testing/dev if on localhost with a slug in query
    const route = useRoute()
    if (!slug && route.query.slug) {
      slug = route.query.slug as string
    }

    if (slug && !ignore.includes(slug)) {
      try {
        isLoading.value = true
        const res = await fetch(`${apiBaseUrl}/public/tenant/${slug}`)
        const result = await res.json()

        if (result.success && result.data) {
          const source = result.data
          tenant.value = source

          if (source.primaryColor && source.secondaryColor) {
            applyColors(
              source.primaryColor,
              source.secondaryColor,
              source.logo,
              source.name || source.tradeName,
              source.tradeName,
              true // Persist in cookie
            )
          }
        }
      } catch (error) {
        console.error('Error checking subdomain whitelabel:', error)
      } finally {
        isLoading.value = false
      }
    }
  }

  // Sync tenant state with whitelabel settings cookie
  if (process.client) {
    // Sync tenant state with whitelabel settings cookie
    // This ensures that when applyColors is called (which updates the cookie),
    // the global tenant state also updates, reflecting changes in all components.
    watch(settings, (newSettings) => {
      if (!newSettings)
        return

      const t = tenant.value || {}
      if (
        t.primaryColor !== newSettings.primaryColor
        || t.secondaryColor !== newSettings.secondaryColor
        || t.logo !== newSettings.logo
        || t.name !== newSettings.name
        || t.tradeName !== newSettings.tradeName
      ) {
        tenant.value = {
          ...(tenant.value || {}),
          primaryColor: newSettings.primaryColor,
          secondaryColor: newSettings.secondaryColor,
          logo: newSettings.logo,
          name: newSettings.name,
          tradeName: newSettings.tradeName,
        }
      }
    }, { deep: true, immediate: true })

    // When color or logo state changes, apply the CSS variables.
    // We pass 'persist: false' when applying from this watcher to avoid
    // circular updates back to the cookie if it was the cookie that triggered this change.
    watch(
      [
        () => tenant.value?.primaryColor,
        () => tenant.value?.secondaryColor,
        () => tenant.value?.logo,
        () => tenant.value?.name,
        () => tenant.value?.tradeName,
      ],
      ([p, s, l, n, tn]) => {
        if (p && s) {
          applyColors(p, s, l, n, tn, false) // Apply to DOM but don't re-save to cookie
        }
      },
    )
  }

  return {
    tenant,
    isLoading,
    fetchTenant,
    checkSubdomain,
  }
}
