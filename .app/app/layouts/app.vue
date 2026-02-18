<script setup lang="ts">
/**
 * Layout do App (Portal Público)
 * Versão simplificada para clientes acessando via link público
 */
const { tenant, fetchTenant } = useTenant()
const route = useRoute()
const branding = ref<any>(null)
const token = computed(() => route.query.token as string | undefined)

const isReady = ref(!!tenant.value?.name)

onMounted(async () => {
  if (token.value) {
    try {
      const config = useRuntimeConfig()
      const apiBaseUrl = (config.public.apiBase as string || '').replace(/\/$/, '')
      const res = await fetch(`${apiBaseUrl}/public/${token.value}`)
      const result = await res.json()
      if (result?.success) {
        branding.value = result.data?.branding
      }
    }
    catch { /* noop */ }
  }
  else {
    await fetchTenant()
  }
  isReady.value = true
})
</script>

<template>
  <AppPageLoading v-if="!isReady" message="Preparando seu portal..." />

  <div v-else class="min-h-screen bg-muted-50 dark:bg-muted-950">
    <!-- Header Simples -->
    <header
      class="sticky top-0 z-30 bg-white/80 dark:bg-muted-900/80 backdrop-blur-md border-b border-muted-200 dark:border-muted-800 px-4 py-3">
      <div class="flex items-center justify-between max-w-lg mx-auto">
        <div class="flex items-center gap-3">
          <img v-if="(branding?.logo || tenant?.logo)" :src="branding?.logo || tenant?.logo"
            class="size-8 object-contain" alt="Logo">
          <TairoLogo v-else class="size-8 text-primary-500" />
          <div class="flex flex-col">
            <BaseHeading as="h1" size="xs" weight="bold" class="text-muted-800 dark:text-muted-100 leading-none">
              {{ branding?.companyName || tenant?.tradeName || tenant?.name || 'Contabilidade' }}
            </BaseHeading>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main
      class="max-w-lg mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 text-muted-800 dark:text-muted-200">
      <slot />
    </main>
  </div>
</template>
