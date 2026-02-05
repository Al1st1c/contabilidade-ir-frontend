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
    if (!to.path.startsWith('/onboarding')) {
      return navigateTo('/onboarding')
    }
  }

  // Se o onboarding já foi concluído e o usuário tenta acessar a página de onboarding
  if (onboardingStatus === 'COMPLETED' && to.path.startsWith('/onboarding')) {
    return navigateTo('/dashboard')
  }
})
