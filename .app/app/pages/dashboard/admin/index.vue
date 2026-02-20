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

// --- Charts ---

const growthChart = computed(() => {
  if (!stats.value?.growthMetrics) return null

  return defineApexchartsProps({
    type: 'area',
    height: 250,
    series: [
      {
        name: 'Novos Escritórios',
        data: stats.value.growthMetrics.tenants,
      }
    ],
    options: {
      chart: { toolbar: { show: false }, sparkline: { enabled: false } },
      colors: ['var(--color-primary-500)'],
      xaxis: { categories: stats.value.growthMetrics.labels },
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.5,
          opacityTo: 0.1,
        }
      }
    }
  })
})

const revenueChart = computed(() => {
  if (!stats.value?.growthMetrics) return null

  return defineApexchartsProps({
    type: 'area',
    height: 250,
    series: [
      {
        name: 'Receita (R$)',
        data: stats.value.growthMetrics.revenue,
      }
    ],
    options: {
      chart: { toolbar: { show: false } },
      colors: ['var(--color-success-500)'],
      xaxis: { categories: stats.value.growthMetrics.labels },
      stroke: { curve: 'smooth', width: 2 },
      yaxis: { labels: { formatter: (val: number) => `R$ ${val.toFixed(0)}` } }
    }
  })
})

const plansChart = computed(() => {
  if (!stats.value?.subscriptionsByPlan) return null

  return defineApexchartsProps({
    type: 'donut',
    height: 280,
    series: stats.value.subscriptionsByPlan.map((s: any) => s.count),
    options: {
      labels: stats.value.subscriptionsByPlan.map((s: any) => s.name),
      legend: { position: 'bottom' },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: { show: true, label: 'Total', formatter: () => stats.value.totalTenants }
            }
          }
        }
      }
    }
  })
})
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <BaseHeading as="h2" size="2xl">Painel Administrativo</BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500">Métricas reais e escala do sistema</BaseParagraph>
        </div>
        <div class="flex items-center gap-2">
          <BaseButton rounded="md" @click="fetchStats" :loading="isLoading">
            <Icon name="lucide:refresh-cw" class="size-4 mr-1" />
            Atualizar
          </BaseButton>
        </div>
      </div>

      <!-- Stats Grid -->
      <div v-if="stats" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <BaseCard class="p-6">
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Icon name="solar:users-group-rounded-bold-duotone" class="size-6 text-primary-500" />
            </div>
            <div>
              <BaseText size="xs" class="text-muted-400 uppercase tracking-widest font-bold">Total Usuários</BaseText>
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
              <BaseText size="xs" class="text-muted-400 uppercase tracking-widest font-bold">Escritórios (Tenants)
              </BaseText>
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
              <BaseText size="xs" class="text-muted-400 uppercase tracking-widest font-bold">Total Declarações
              </BaseText>
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
              <BaseText size="xs" class="text-muted-400 uppercase tracking-widest font-bold">Receita Acumulada
              </BaseText>
              <BaseHeading as="h3" size="xl">{{ formatCurrency(stats.totalRevenue) }}</BaseHeading>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Charts Row 1 -->
      <div v-if="stats" class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in delay-100">
        <BaseCard class="p-6">
          <div class="flex items-center justify-between mb-6">
            <BaseHeading as="h4" size="md">Crescimento de Atendimento</BaseHeading>
            <BaseTag variant="muted" rounded="full">Últimos 6 meses</BaseTag>
          </div>
          <LazyAddonApexcharts v-if="growthChart" v-bind="growthChart" />
        </BaseCard>

        <BaseCard class="p-6">
          <div class="flex items-center justify-between mb-6">
            <BaseHeading as="h4" size="md">Evolução Financeira (R$)</BaseHeading>
            <BaseTag variant="muted" rounded="full">Receita por Mês</BaseTag>
          </div>
          <LazyAddonApexcharts v-if="revenueChart" v-bind="revenueChart" />
        </BaseCard>
      </div>

      <!-- Charts Row 2 -->
      <div v-if="stats" class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in delay-200">
        <BaseCard class="p-6 lg:col-span-1">
          <BaseHeading as="h4" size="md" class="mb-6">Mix de Planos</BaseHeading>
          <LazyAddonApexcharts v-if="plansChart" v-bind="plansChart" />
        </BaseCard>

        <BaseCard class="p-6">
          <BaseHeading as="h4" size="md" class="mb-6">Status dos Usuários</BaseHeading>
          <div class="space-y-4">
            <div v-for="item in stats?.usersByStatus" :key="item.status"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-muted-50 dark:hover:bg-muted-900/40 transition-colors">
              <div class="flex items-center gap-3">
                <span class="size-2.5 rounded-full"
                  :class="item.status === 'ACTIVE' ? 'bg-success-500' : 'bg-muted-300'"></span>
                <BaseText size="sm" weight="medium">{{ item.status }}</BaseText>
              </div>
              <BaseTag rounded="full" variant="muted" class="font-bold">{{ item._count }}</BaseTag>
            </div>
          </div>
        </BaseCard>

        <BaseCard class="p-6">
          <BaseHeading as="h4" size="md" class="mb-6">Estado das Assinaturas</BaseHeading>
          <div class="space-y-4">
            <div v-for="item in stats?.subscriptionsByStatus" :key="item.status"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-muted-50 dark:hover:bg-muted-900/40 transition-colors">
              <div class="flex items-center gap-3">
                <span class="size-2.5 rounded-full"
                  :class="item.status === 'ACTIVE' ? 'bg-primary-500' : item.status === 'TRIAL' ? 'bg-amber-500' : 'bg-danger-500'"></span>
                <BaseText size="sm" weight="medium">{{ item.status }}</BaseText>
              </div>
              <BaseTag rounded="full" variant="muted" class="font-bold">{{ item._count }}</BaseTag>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Admin Quick Links -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <NuxtLink to="/dashboard/admin/users" class="group">
          <BaseCard class="p-6 border-dashed border-2 hover:border-primary-500 hover:bg-primary-500/5 transition-all">
            <div class="flex flex-col items-center gap-3 text-center">
              <div
                class="size-14 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors">
                <Icon name="solar:users-group-two-rounded-bold-duotone" class="size-8" />
              </div>
              <div>
                <BaseHeading as="h3" size="sm">Gerir Usuários</BaseHeading>
                <BaseText size="xs" class="text-muted-500">Acessos e permissões</BaseText>
              </div>
            </div>
          </BaseCard>
        </NuxtLink>
        <NuxtLink to="/dashboard/admin/affiliates" class="group">
          <BaseCard class="p-6 border-dashed border-2 hover:border-primary-500 hover:bg-primary-500/5 transition-all">
            <div class="flex flex-col items-center gap-3 text-center">
              <div
                class="size-14 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors">
                <Icon name="solar:medal-star-bold-duotone" class="size-8" />
              </div>
              <div>
                <BaseHeading as="h3" size="sm">Afiliados</BaseHeading>
                <BaseText size="xs" class="text-muted-500">Gestão e comissões</BaseText>
              </div>
            </div>
          </BaseCard>
        </NuxtLink>
        <NuxtLink to="/dashboard/admin/plans" class="group">
          <BaseCard class="p-6 border-dashed border-2 hover:border-primary-500 hover:bg-primary-500/5 transition-all">
            <div class="flex flex-col items-center gap-3 text-center">
              <div
                class="size-14 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors">
                <Icon name="solar:card-2-bold-duotone" class="size-8" />
              </div>
              <div>
                <BaseHeading as="h3" size="sm">Gerir Planos</BaseHeading>
                <BaseText size="xs" class="text-muted-500">Preços e limites</BaseText>
              </div>
            </div>
          </BaseCard>
        </NuxtLink>
        <NuxtLink to="/dashboard/admin/checklist" class="group">
          <BaseCard class="p-6 border-dashed border-2 hover:border-primary-500 hover:bg-primary-500/5 transition-all">
            <div class="flex flex-col items-center gap-3 text-center">
              <div
                class="size-14 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors">
                <Icon name="solar:clipboard-list-bold-duotone" class="size-8" />
              </div>
              <div>
                <BaseHeading as="h3" size="sm">Checklist Padrão</BaseHeading>
                <BaseText size="xs" class="text-muted-500">Documentos globais</BaseText>
              </div>
            </div>
          </BaseCard>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
