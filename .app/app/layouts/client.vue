<script setup lang="ts">
const { tenant, fetchTenant } = useTenant()
const route = useRoute()
const config = useRuntimeConfig()
const apiBaseUrl = (config.public.apiBase as string || '').replace(/\/$/, '')
const token = computed(() => route.query.token as string | undefined)
const branding = ref<any>(null)
const { selectedTaxYear, availableYears } = useClientSession()

const isReady = ref(!!tenant.value?.name)

onMounted(async () => {
  if (token.value) {
    try {
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

function withToken(to: string) {
  return token.value ? { path: to, query: { token: token.value } } : to
}

const menuItems = [
  {
    label: 'Início',
    to: '/client',
    icon: 'solar:home-smile-angle-bold-duotone',
  },
  {
    label: 'Documentos',
    to: '/client/documentos',
    icon: 'solar:document-bold-duotone',
  },
  {
    label: 'Histórico',
    to: '/client/historico',
    icon: 'solar:history-bold-duotone',
  },
  {
    label: 'Perfil',
    to: '/client/perfil',
    icon: 'solar:user-circle-bold-duotone',
  },
]
</script>

<template>
  <AppPageLoading v-if="!isReady" message="Preparando seu portal..." />

  <div v-else class="min-h-screen bg-muted-50 dark:bg-muted-950 pb-20">
    <!-- Header/Logo -->
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

            <!-- Year Selector -->
            <div class="flex items-center gap-1 mt-1">
              <span class="text-[10px] uppercase font-bold text-muted-400">Exercício</span>
              <select v-model="selectedTaxYear"
                class="bg-transparent text-[10px] font-bold text-primary-500 border-none p-0 focus:ring-0 cursor-pointer outline-none">
                <option v-for="year in availableYears" :key="year" :value="year">
                  IR {{ year }} (Ano-Calendário {{ year - 1 }})
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main
      class="max-w-lg mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 text-muted-800 dark:text-muted-200">
      <slot />
    </main>

    <!-- Bottom Navigation -->
    <nav
      class="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-muted-900 border-t border-muted-200 dark:border-muted-800 px-2 py-1 safe-area-pb">
      <div class="flex items-center justify-around max-w-lg mx-auto">
        <NuxtLink v-for="item in menuItems" :key="item.to" v-slot="{ isActive }" :to="withToken(item.to)"
          class="flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 min-w-[64px]"
          active-class="text-primary-500">
          <div class="relative flex items-center justify-center size-10 rounded-xl transition-all duration-300"
            :class="isActive ? 'bg-primary-500/10' : 'text-muted-400 hover:text-muted-500'">
            <Icon :name="item.icon" class="size-6" />
            <div v-if="isActive" class="absolute -bottom-1 size-1 rounded-full bg-primary-500" />
          </div>
          <span class="text-[10px] font-medium leading-none" :class="isActive ? 'text-primary-500' : 'text-muted-400'">
            {{ item.label }}
          </span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
