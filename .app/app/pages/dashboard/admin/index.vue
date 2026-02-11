<script setup lang="ts">
const { useCustomFetch } = useApi()

definePageMeta({
  title: 'Admin Dashboard',
})

const stats = ref<any>(null)
const isLoading = ref(true)

async function fetchStats() {
  try {
    isLoading.value = true
    const { data } = await useCustomFetch<any>('/admin/stats')
    stats.value = data
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchStats()
})

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <BaseHeading as="h2" size="2xl">Painel Administrativo</BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500">Visão geral do sistema e métricas principais</BaseParagraph>
        </div>
        <div class="flex items-center gap-2">
          <BaseButton rounded="md" @click="fetchStats" :loading="isLoading">
            <Icon name="lucide:refresh-cw" class="size-4 mr-1" />
            Atualizar
          </BaseButton>
        </div>
      </div>

      <!-- Stats Grid -->
      <div v-if="stats" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BaseCard class="p-6">
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Icon name="solar:users-group-rounded-bold-duotone" class="size-6 text-primary-500" />
            </div>
            <div>
              <BaseText size="xs" class="text-muted-400 uppercase tracking-widest">Total Usuários</BaseText>
              <BaseHeading as="h3" size="xl">{{ stats.totalUsers }}</BaseHeading>
            </div>
          </div>
        </BaseCard>

        <BaseCard class="p-6">
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-xl bg-success-500/10 flex items-center justify-center">
              <Icon name="solar:buildings-bold-duotone" class="size-6 text-success-500" />
            </div>
            <div>
              <BaseText size="xs" class="text-muted-400 uppercase tracking-widest">Tenants</BaseText>
              <BaseHeading as="h3" size="xl">{{ stats.totalTenants }}</BaseHeading>
            </div>
          </div>
        </BaseCard>

        <BaseCard class="p-6">
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-xl bg-info-500/10 flex items-center justify-center">
              <Icon name="solar:calculator-minimalistic-bold-duotone" class="size-6 text-info-500" />
            </div>
            <div>
              <BaseText size="xs" class="text-muted-400 uppercase tracking-widest">Total IRs</BaseText>
              <BaseHeading as="h3" size="xl">{{ stats.totalDeclarations }}</BaseHeading>
            </div>
          </div>
        </BaseCard>

        <BaseCard class="p-6">
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Icon name="solar:wallet-money-bold-duotone" class="size-6 text-amber-500" />
            </div>
            <div>
              <BaseText size="xs" class="text-muted-400 uppercase tracking-widest">Receita Total</BaseText>
              <BaseHeading as="h3" size="xl">{{ formatCurrency(stats.totalRevenue) }}</BaseHeading>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Charts/Details Placeholder -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <BaseCard class="p-6">
          <BaseHeading as="h4" size="md" class="mb-6">Status dos Usuários</BaseHeading>
          <div class="space-y-4">
            <div v-for="item in stats?.usersByStatus" :key="item.status" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="size-2 rounded-full bg-primary-500"></span>
                <BaseText size="sm">{{ item.status }}</BaseText>
              </div>
              <BaseTag rounded="full" variant="muted">{{ item._count }}</BaseTag>
            </div>
          </div>
        </BaseCard>

        <BaseCard class="p-6">
          <BaseHeading as="h4" size="md" class="mb-6">Assinaturas por Status</BaseHeading>
          <div class="space-y-4">
            <div v-for="item in stats?.subscriptionsByStatus" :key="item.status"
              class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="size-2 rounded-full bg-success-500"></span>
                <BaseText size="sm">{{ item.status }}</BaseText>
              </div>
              <BaseTag rounded="full" variant="muted">{{ item._count }}</BaseTag>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Admin Quick Links -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <NuxtLink to="/dashboard/admin/users" class="group">
          <BaseCard class="p-6 border-dashed hover:border-primary-500 transition-colors">
            <div class="flex flex-col items-center gap-3">
              <Icon name="solar:users-group-two-rounded-bold-duotone"
                class="size-8 text-muted-400 group-hover:text-primary-500" />
              <BaseHeading as="h3" size="sm">Gerir Usuários</BaseHeading>
            </div>
          </BaseCard>
        </NuxtLink>
        <NuxtLink to="/dashboard/admin/plans" class="group">
          <BaseCard class="p-6 border-dashed hover:border-primary-500 transition-colors">
            <div class="flex flex-col items-center gap-3">
              <Icon name="solar:card-2-bold-duotone" class="size-8 text-muted-400 group-hover:text-primary-500" />
              <BaseHeading as="h3" size="sm">Gerir Planos</BaseHeading>
            </div>
          </BaseCard>
        </NuxtLink>
        <NuxtLink to="/dashboard/admin/checklist" class="group">
          <BaseCard class="p-6 border-dashed hover:border-primary-500 transition-colors">
            <div class="flex flex-col items-center gap-3">
              <Icon name="solar:clipboard-list-bold-duotone"
                class="size-8 text-muted-400 group-hover:text-primary-500" />
              <BaseHeading as="h3" size="sm">Checklist Padrão</BaseHeading>
            </div>
          </BaseCard>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
