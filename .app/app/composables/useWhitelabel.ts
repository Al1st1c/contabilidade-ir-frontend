export function useWhitelabel() {
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const
  const settings = useCookie<any>('whitelabel-settings', {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    sameSite: 'lax',
  })

  // Helper to convert hex to rgb array [r, g, b]
  function hexToRgb(hex: string) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b)
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex)
    return result ? [
      parseInt(result[1] as string, 16),
      parseInt(result[2] as string, 16),
      parseInt(result[3] as string, 16)
    ] : [0, 0, 0]
  }

  // Mix two RGB arrays by a percentage (weight 0 to 1)
  function mixColors(color1: number[], color2: number[], weight: number) {
    return [
      Math.round((color1[0] as number) * weight + (color2[0] as number) * (1 - weight)),
      Math.round((color1[1] as number) * weight + (color2[1] as number) * (1 - weight)),
      Math.round((color1[2] as number) * weight + (color2[2] as number) * (1 - weight)),
    ]
  }

  // Generate 11 shades for Tailwind (50, 100... 950) from a base HEX color
  function generateShades(baseHex: string) {
    const baseRgb = hexToRgb(baseHex)
    const white = [255, 255, 255]
    const black = [0, 0, 0]

    // Calculate light shades (mixing with white)
    const shade50 = mixColors(baseRgb, white, 0.1)
    const shade100 = mixColors(baseRgb, white, 0.2)
    const shade200 = mixColors(baseRgb, white, 0.4)
    const shade300 = mixColors(baseRgb, white, 0.6)
    const shade400 = mixColors(baseRgb, white, 0.8)

    // Base shade
    const shade500 = baseRgb

    // Calculate dark shades (mixing with black)
    const shade600 = mixColors(baseRgb, black, 0.8)
    const shade700 = mixColors(baseRgb, black, 0.6)
    const shade800 = mixColors(baseRgb, black, 0.45)
    const shade900 = mixColors(baseRgb, black, 0.3)
    const shade950 = mixColors(baseRgb, black, 0.15)

    // Return array matching standard shades index
    return [
      `rgb(${shade50.join(', ')})`,
      `rgb(${shade100.join(', ')})`,
      `rgb(${shade200.join(', ')})`,
      `rgb(${shade300.join(', ')})`,
      `rgb(${shade400.join(', ')})`,
      `rgb(${shade500.join(', ')})`,
      `rgb(${shade600.join(', ')})`,
      `rgb(${shade700.join(', ')})`,
      `rgb(${shade800.join(', ')})`,
      `rgb(${shade900.join(', ')})`,
      `rgb(${shade950.join(', ')})`
    ]
  }

  // Apply whitelabel colors using Tailwind color names
  function applyColors(primaryColor: string = '', secondaryColor: string = '', logo?: string | null, name?: string, tradeName?: string, persist = true) {
    if (process.client) {
      const root = document.documentElement

      // Apply primary color shades
      if (primaryColor && primaryColor.startsWith('#')) {
        const generatedPrimaryShades = generateShades(primaryColor)
        shades.forEach((shade, i) => {
          root.style.setProperty(
            `--color-primary-${shade}`,
            generatedPrimaryShades[i],
          )
        })
      } else {
        for (const shade of shades) {
          root.style.setProperty(
            `--color-primary-${shade}`,
            `var(--color-${primaryColor}-${shade})`,
          )
        }
      }

      // Apply muted (secondary) color shades
      if (secondaryColor && secondaryColor.startsWith('#')) {
        const generatedSecondaryShades = generateShades(secondaryColor)
        shades.forEach((shade, i) => {
          root.style.setProperty(
            `--color-muted-${shade}`,
            generatedSecondaryShades[i],
          )
        })
      } else {
        for (const shade of shades) {
          root.style.setProperty(
            `--color-muted-${shade}`,
            `var(--color-${secondaryColor}-${shade})`,
          )
        }
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
          ...(primaryColor ? { primaryColor } : {}),
          ...(secondaryColor ? { secondaryColor } : {}),
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
