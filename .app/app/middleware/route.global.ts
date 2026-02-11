import { API_CONFIG } from '~/utils/config'

export default defineNuxtRouteMiddleware((to) => {
  const { token, user } = useAuth()

  // Rotas que não precisam de autenticação
  const publicRoutes = ['/', '/auth/login', '/auth/register', '/regulamento']
  if (publicRoutes.includes(to.path) || to.path.startsWith('/invite')) {
    // Se logado e tentando ir pro login, redireciona pro dashboard
    if (token.value && (to.path === '/' || to.path === '/auth/login')) {
      return navigateTo('/dashboard')
    }
    return
  }

  // Se não estiver autenticado e tentar acessar rotas protegidas
  if (!token.value && (to.path.startsWith('/dashboard') || to.path.startsWith('/client'))) {
    return navigateTo('/')
  }

  // Redirecionamento baseado no tipo de usuário
  if (to.path.startsWith('/dashboard') && user.value?.userType === 'client') {
    return navigateTo('/client')
  }

  if (to.path.startsWith('/client') && user.value?.userType !== 'client') {
    return navigateTo('/dashboard')
  }
})
