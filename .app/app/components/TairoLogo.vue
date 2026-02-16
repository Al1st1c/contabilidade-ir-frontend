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
  <div class="flex items-center w-full max-w-[140px] h-10 overflow-hidden">
    <img :src="logoUrl" alt="Logo" class="dark:hidden object-contain max-h-full max-w-full w-auto h-auto"
      @error="(e: any) => e.target.src = '/img/logo.png'">
    <img :src="logoUrlWhite" alt="Logo" class="hidden dark:block object-contain max-h-full max-w-full w-auto h-auto"
      @error="(e: any) => e.target.src = '/img/logo-white.png'">
  </div>
</template>
