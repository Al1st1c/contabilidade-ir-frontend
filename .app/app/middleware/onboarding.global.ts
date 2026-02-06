export default defineNuxtRouteMiddleware((to) => {
  const { user, isAuthenticated } = useAuth()
  const { currentSubscription } = useSubscription()

  // Se não estiver autenticado, deixa o auth middleware lidar
  if (!isAuthenticated.value || !user.value) {
    return
  }

  const onboardingStatus = user.value.onboardingStatus
  const hasActivePlan = currentSubscription.value?.status === 'ACTIVE' || currentSubscription.value?.status === 'TRIAL'

  // Se o onboarding está pendente e o usuário tem um plano ativo
  if (onboardingStatus === 'PENDING' && hasActivePlan) {
    // Evita loop de redirecionamento
    if (!to.path.startsWith('/dashboard')) {
      return navigateTo('/dashboard')
    }
  }

  // Não precisa de lógica adicional para COMPLETED
  // O dashboard já controla a exibição do modal baseado no onboardingStatus
})
