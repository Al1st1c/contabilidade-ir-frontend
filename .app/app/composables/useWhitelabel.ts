export function useWhitelabel() {
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const
  const settings = useCookie<any>('whitelabel-settings', {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    sameSite: 'lax',
  })

  // Apply whitelabel colors using Tailwind color names
  function applyColors(primaryColor: string, secondaryColor: string, logo?: string, name?: string, tradeName?: string, persist = true) {
    if (process.client) {
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

    // Persist settings in cookie only if requested and values actually changed
    // We ignore 'updatedAt' in the comparison to break potential loops
    if (persist) {
      const current = settings.value || {}
      const hasChanged
        = current.primaryColor !== primaryColor
          || current.secondaryColor !== secondaryColor
          || (logo !== undefined && current.logo !== logo)
          || (name !== undefined && current.name !== name)
          || (tradeName !== undefined && current.tradeName !== tradeName)

      if (hasChanged) {
        settings.value = {
          ...current,
          primaryColor,
          secondaryColor,
          ...(logo !== undefined ? { logo } : {}),
          ...(name !== undefined ? { name } : {}),
          ...(tradeName !== undefined ? { tradeName } : {}),
          updatedAt: new Date().toISOString(),
        }
      }
    }
  }

  return {
    applyColors,
    settings,
  }
}
