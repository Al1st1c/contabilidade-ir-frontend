<script setup lang="ts">
import { useTenant } from '~/composables/useTenant'
import { useSubscription } from '~/composables/useSubscription'

const { tenant } = useTenant()
const { currentSubscription } = useSubscription()

const logoUrl = computed(() => {
  // Apenas mostra logo do tenant se tiver whitelabel ativo
  const hasWhitelabel = currentSubscription.value?.hasWhitelabel ?? false

  if (hasWhitelabel && tenant.value?.logo) {
    return tenant.value.logo
  }

  return '/img/logo.png'
})


const logoUrlWhite = computed(() => {
  // Apenas mostra logo do tenant se tiver whitelabel ativo
  const hasWhitelabel = currentSubscription.value?.hasWhitelabel ?? false

  if (hasWhitelabel && tenant.value?.logo) {
    return tenant.value.logo
  }

  return '/img/logo-white.png'
})
</script>

<template>
  <img style="width: 130px;" :src="logoUrl" alt="Logo" class="dark:hidden object-contain max-h-full max-w-full"
    @error="(e: any) => e.target.src = '/img/logo.png'">
  <img style="width: 130px;" :src="logoUrlWhite" alt="Logo"
    class="hidden dark:block object-contain max-h-full max-w-full"
    @error="(e: any) => e.target.src = '/img/logo-white.png'">
</template>
