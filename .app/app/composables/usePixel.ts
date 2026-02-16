export const usePixel = () => {
  const config = useRuntimeConfig()
  const pixelId = config.public.fbPixelId

  /**
   * Tracks a standard Facebook Pixel event
   * @param eventName Standard event name (e.g., 'PageView', 'Purchase', 'CompleteRegistration')
   * @param data Optional event data object
   */
  const track = (eventName: string, data?: any) => {
    if (process.client && (window as any).fbq) {
      if (data) {
        (window as any).fbq('track', eventName, data)
      } else {
        (window as any).fbq('track', eventName)
      }
    } else if (process.dev) {
      console.log(`[Pixel] would track standard event: ${eventName}`, data)
    }
  }

  /**
   * Tracks a custom Facebook Pixel event
   * @param eventName Custom event name
   * @param data Optional event data object
   */
  const trackCustom = (eventName: string, data?: any) => {
    if (process.client && (window as any).fbq) {
      (window as any).fbq('trackCustom', eventName, data)
    } else if (process.dev) {
      console.log(`[Pixel] would track custom event: ${eventName}`, data)
    }
  }

  return {
    pixelId,
    track,
    trackCustom,
  }
}
