<script setup lang="ts">
import { useTenant } from '~/composables/useTenant'
const { tenant, fetchTenant } = useTenant()

// Fetch tenant data on mount if not already available
onMounted(() => {
  if (!tenant.value) {
    fetchTenant()
  }
})

const logoUrl = computed(() => {
  return tenant.value?.logo || '/img/logo.png'
})
</script>

<template>
  <img :src="logoUrl" alt="Logo" class="object-contain max-h-full max-w-full"
    @error="(e: any) => e.target.src = '/img/logo.png'" />
</template>
