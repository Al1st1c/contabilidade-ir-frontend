import { API_CONFIG } from '~/utils/config'

export default defineNuxtRouteMiddleware((to) => {
  if (!to.path.startsWith('/dashboard')) {
    return
  }

  const user = useCookie<any>(API_CONFIG.TOKEN.USER_COOKIE_NAME)
  if (user.value?.userType === 'client') {
    return navigateTo('/client')
  }
})

