import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()

  const executeRecaptcha = async (action: string) => {
    try {
      // @ts-ignore
      const grecaptcha = window.grecaptcha
      if (!grecaptcha) {
        console.error('reCAPTCHA não está carregado')
        return null
      }

      return await grecaptcha.execute(config.public.recaptcha.siteKey, { action })
    }
    catch (error) {
      console.error('Erro ao executar reCAPTCHA:', error)
      return null
    }
  }

  return {
    provide: {
      recaptchaV3: {
        execute: executeRecaptcha,
      },
    },
  }
})
