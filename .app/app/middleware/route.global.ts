import { API_CONFIG } from '~/utils/config'

export default defineNuxtRouteMiddleware((to) => {
  const { token, user } = useAuth()
  const requestURL = useRequestURL()

  // Rotas que não precisam de autenticação
  const publicRoutes = ['/', '/auth/login', '/auth/register', '/regulamento']
  const isClientPublic = to.path.startsWith('/client') && to.query.token
  if (isClientPublic) {
    to.meta.layout = 'app'
  }

  // Redirecionamento para whitelabel (*.irpf26.com)
  if (requestURL.hostname.endsWith('irpf26.com')) {
    if (to.path === '/' || to.path === '/auth/login') {
      return navigateTo('/auth/client')
    }
  }

  if (publicRoutes.includes(to.path) || to.path.startsWith('/invite') || isClientPublic) {
    // Se logado e tentando ir pro login, redireciona pro dashboard
    if (token.value && (to.path === '/' || to.path === '/auth/login')) {
      return navigateTo('/dashboard')
    }
    return
  }

  // Se não estiver autenticado e tentar acessar rotas protegidas
  if (!token.value && (to.path.startsWith('/dashboard') || to.path.startsWith('/client') || to.path.startsWith('/affiliate/dashboard'))) {
    return navigateTo('/')
  }

  // Redirecionamento baseado no tipo de usuário
  if (to.path.startsWith('/dashboard') && user.value?.userType === 'client') {
    return navigateTo('/client')
  }

  // Se o usuário for um afiliado tentando acessar o dashboard principal
  if (to.path.startsWith('/dashboard') && user.value?.affiliateProfile && !user.value?.tenantId) {
    return navigateTo('/affiliate/dashboard')
  }

  if (to.path.startsWith('/client') && user.value?.userType !== 'client' && !to.query.token) {
    return navigateTo('/dashboard')
  }
})
