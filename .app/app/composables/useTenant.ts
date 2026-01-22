import { useApi } from '~/composables/useAuth'

export const useTenant = () => {
  const { useCustomFetch } = useApi()
  const tenant = useState<any>('tenant-data', () => null)
  const isLoading = ref(false)

  const fetchTenant = async () => {
    // If already fetching or already have data, don't fetch again
    if (tenant.value || isLoading.value) return tenant.value

    isLoading.value = true
    try {
      const { data } = await useCustomFetch<any>('/tenant')
      // The API usually returns { data: { ... } }
      const source = data.data || data
      tenant.value = source

      // Apply whitelabel colors if available
      if (source?.primaryColor && source?.secondaryColor) {
        try {
          const { applyColors } = useWhitelabel()
          applyColors(source.primaryColor, source.secondaryColor)
        } catch (e) {
          console.error('Error applying whitelabel colors:', e)
        }
      }

      return source
    } catch (error) {
      console.error('Error fetching tenant metadata:', error)
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    tenant,
    isLoading,
    fetchTenant
  }
}
