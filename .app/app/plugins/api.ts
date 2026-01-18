// plugins/api.ts
import { ofetch } from 'ofetch'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = ofetch.create({
    baseURL: process.env.API_BASE || 'http://dolphin-app-945a9.ondigitalocean.app', // Ex: http://localhost:8080
    credentials: 'include', // inclui cookies HTTP-only
  })

  return {
    provide: {
      api,
    },
  }
})
