export const useWhitelabel = () => {
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const

  // Apply whitelabel colors using Tailwind color names
  function applyColors(primaryColor: string, secondaryColor: string) {
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

  return {
    applyColors,
  }
}
