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

  const fetchTenant = async () => {
    // If we have full data from API (not just cache) and not loading, we can skip
    if ((tenant.value?.name && !isLoading.value))
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
  }
}
