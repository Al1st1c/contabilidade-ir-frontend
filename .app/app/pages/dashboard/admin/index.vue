<script setup lang="ts">
import { PanelsPanelAdminUserAnalytics } from '#components'
const { open } = usePanels()
const { useCustomFetch } = useApi()
const router = useRouter()

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

function openUserAnalytics(userId: string) {
  open(PanelsPanelAdminUserAnalytics, {
    userId: userId,
  })
}

function filterUsersByPlan(planId: string) {
  router.push({
    path: '/dashboard/admin/users',
    query: { planId },
  })
}

function filterUsersByCoupon(couponId: string) {
  router.push({
    path: '/dashboard/admin/users',
    query: { couponId },
  })
}

function filterUsersByPartner() {
  router.push({
    path: '/dashboard/admin/users',
    query: { isPartner: 'true' },
  })
}

function filterUsersByRole(roleName: string) {
  router.push({
    path: '/dashboard/admin/users',
    query: { roleName: roleName }
  })
}

function filterUsersByMembers() {
  router.push({
    path: '/dashboard/admin/users',
    query: { isMember: 'true' }
  })
}

onMounted(() => {
  fetchStats()
})

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatDate(date: string) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR')
}

function formatDateTime(date: string) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

const financialChart = computed(() => {
  if (!stats.value?.growthMetrics) return null

  return defineApexchartsProps({
    type: 'area',
    height: 300,
    series: [
      {
        name: 'Assinaturas',
        data: stats.value.growthMetrics.revenue,
      },
      {
        name: 'Pré-pago',
        data: stats.value.growthMetrics.prepaidRevenue,
      },
      {
        name: 'Comissões',
        data: stats.value.growthMetrics.commissions,
      },
      {
        name: 'Faturamento Líquido',
        data: stats.value.growthMetrics.netRevenue,
      }
    ],
    options: {
      chart: {
        toolbar: { show: false },
        stacked: false
      },
      colors: ['var(--color-primary-500)', 'var(--color-info-500)', 'var(--color-orange-500)', 'var(--color-success-500)'],
      xaxis: { categories: stats.value.growthMetrics.labels },
      stroke: { curve: 'smooth', width: [2, 2, 2, 3] },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: [0.4, 0.3, 0.2, 0.6],
          opacityTo: [0.1, 0.05, 0.05, 0.2],
        }
      },
      yaxis: {
        labels: {
          formatter: (val: number) => {
            return new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0
            }).format(val)
          }
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => formatCurrency(val)
        }
      }
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
              total: { show: true, label: 'Total', formatter: () => stats.value.totalSubscriptions }
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
      <div v-if="stats" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-fade-in">
        <BaseCard class="p-6 cursor-pointer hover:bg-muted-50 dark:hover:bg-muted-900/40 transition-colors group"
          @click="filterUsersByRole('master')">
          <div class="flex items-center gap-4">
            <div
              class="size-12 rounded-xl bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
              <Icon name="solar:users-group-rounded-bold-duotone" class="size-6 text-primary-500" />
            </div>
            <div>
              <BaseText size="xs" class="text-muted-400 uppercase tracking-widest font-bold">Total Usuários</BaseText>
              <div class="flex items-center gap-2">
                <BaseHeading as="h3" size="xl">
                  {{ stats.totalUsers }}
                  <span class="text-sm font-normal text-muted-400 ml-1">({{ stats.totalMembers }} externos)</span>
                </BaseHeading>
                <Icon name="lucide:chevron-right"
                  class="size-4 text-muted-300 group-hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            </div>
          </div>
        </BaseCard>

        <BaseCard class="p-6">
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-xl bg-success-500/10 flex items-center justify-center">
              <Icon name="solar:buildings-bold-duotone" class="size-6 text-success-500" />
            </div>
            <div>
              <BaseText size="xs" class="text-muted-400 uppercase tracking-widest font-bold">Escritórios
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
              <BaseText size="xs" class="text-muted-400 uppercase tracking-widest font-bold">Faturamento
              </BaseText>
              <BaseHeading as="h3" size="lg">
                {{ formatCurrency(stats.totalRevenue) }}
                <div class="text-xs font-normal text-muted-400 flex items-center gap-1 mt-0.5">
                  <span class="text-success-500 font-bold">{{ formatCurrency(stats.totalNetRevenue) }}</span>
                  <span>líquido</span>
                </div>
              </BaseHeading>
            </div>
          </div>
        </BaseCard>

        <BaseCard class="p-6 cursor-pointer hover:bg-muted-50 dark:hover:bg-muted-900/40 transition-colors group"
          @click="router.push('/dashboard/admin/prepaid')">
          <div class="flex items-center gap-4">
            <div
              class="size-12 rounded-xl bg-info-500/10 flex items-center justify-center group-hover:bg-info-500/20 transition-colors">
              <Icon name="solar:tag-price-bold-duotone" class="size-6 text-info-500" />
            </div>
            <div>
              <BaseText size="xs" class="text-muted-400 uppercase tracking-widest font-bold">Faturamento Pré-pago
              </BaseText>
              <BaseHeading as="h3" size="lg">
                {{ formatCurrency(stats.totalPrepaidRevenue) }}
              </BaseHeading>
            </div>
          </div>
        </BaseCard>

        <BaseCard class="p-6 cursor-pointer hover:bg-muted-50 dark:hover:bg-muted-900/40 transition-colors group"
          @click="filterUsersByPartner">
          <div class="flex items-center gap-4">
            <div
              class="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <Icon name="solar:star-fall-bold-duotone" class="size-6 text-purple-500" />
            </div>
            <div>
              <BaseText size="xs" class="text-muted-400 uppercase tracking-widest font-bold">Total Parceiros</BaseText>
              <div class="flex items-center gap-2">
                <BaseHeading as="h3" size="xl">{{ stats.totalPartners }}</BaseHeading>
                <Icon name="lucide:chevron-right"
                  class="size-4 text-muted-300 group-hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-all" />
              </div>
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
            <BaseHeading as="h4" size="md">Desempenho Financeiro</BaseHeading>
            <div class="flex items-center gap-3 text-[10px] uppercase font-bold tracking-wider">
              <div class="flex items-center gap-1 text-primary-500">
                <div class="size-2 rounded-full bg-current"></div>
                <span>Assinaturas</span>
              </div>
              <div class="flex items-center gap-1 text-info-500">
                <div class="size-2 rounded-full bg-current"></div>
                <span>Pré-pago</span>
              </div>
              <div class="flex items-center gap-1 text-orange-500">
                <div class="size-2 rounded-full bg-current"></div>
                <span>Comissões</span>
              </div>
              <div class="flex items-center gap-1 text-success-500">
                <div class="size-2 rounded-full bg-current"></div>
                <span>Líquido</span>
              </div>
            </div>
          </div>
          <LazyAddonApexcharts v-if="financialChart" v-bind="financialChart" />
        </BaseCard>
      </div>

      <!-- Charts Row 2 -->
      <div v-if="stats" class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in delay-200">
        <BaseCard class="p-6 lg:col-span-1">
          <BaseHeading as="h4" size="md" class="mb-6">Mix de Planos</BaseHeading>
          <LazyAddonApexcharts v-if="plansChart" v-bind="plansChart" />
        </BaseCard>

        <BaseCard class="p-6">
          <div class="flex items-center justify-between mb-6">
            <BaseHeading as="h4" size="md" weight="semibold">Usuários por Plano</BaseHeading>
            <BaseTag rounded="full" color="primary" variant="muted" size="sm">{{ stats?.totalSubscriptions }} Usuários
            </BaseTag>
          </div>
          <div class="space-y-4">
            <div v-for="item in stats?.subscriptionsByPlan" :key="item.planId"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-muted-50 dark:hover:bg-muted-900/40 transition-colors cursor-pointer group"
              @click="filterUsersByPlan(item.planId)">
              <div class="flex items-center gap-3">
                <Icon name="solar:card-2-bold-duotone"
                  class="size-4 text-muted-400 group-hover:text-primary-500 transition-colors" />
                <BaseText size="sm" weight="medium">{{ item.name }}</BaseText>
              </div>
              <div class="flex items-center gap-3">
                <BaseText size="xs" class="text-muted-500">{{ item.count }}</BaseText>
                <BaseTag rounded="full" variant="muted" size="sm" class="font-bold">
                  {{ Math.round((item.count / (stats?.totalSubscriptions || 1)) * 100) }}%
                </BaseTag>
              </div>
            </div>
          </div>
        </BaseCard>

        <BaseCard class="p-6">
          <div class="flex items-center justify-between mb-6">
            <BaseHeading as="h4" size="md" weight="semibold">Top 5 Cupons</BaseHeading>
            <Icon name="solar:ticket-sale-bold-duotone" class="size-5 text-warning-500" />
          </div>
          <div class="space-y-4">
            <div v-for="coupon in stats?.topCoupons" :key="coupon.id"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-muted-50 dark:hover:bg-muted-900/40 transition-colors cursor-pointer group"
              @click="filterUsersByCoupon(coupon.id)">
              <div class="flex items-center gap-3">
                <div
                  class="size-8 rounded-lg bg-warning-500/10 flex items-center justify-center text-warning-600 font-bold text-xs uppercase">
                  {{ coupon.code.substring(0, 2) }}
                </div>
                <BaseText size="sm" weight="medium" class="group-hover:text-primary-500 transition-colors">{{
                  coupon.code }}</BaseText>
              </div>
              <div class="flex items-center gap-2">
                <BaseText size="xs" class="text-muted-500">{{ coupon.usedCount }} usos</BaseText>
                <Icon name="lucide:chevron-right" class="size-3 text-muted-300 group-hover:text-primary-500" />
              </div>
            </div>
            <div v-if="!stats?.topCoupons?.length" class="text-center py-4 opacity-50 italic text-xs">
              Nenhum cupom utilizado ainda.
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Recent Activity Section -->
      <div v-if="stats" class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in delay-300">
        <!-- Recent Subscriptions -->
        <BaseCard class="p-6 h-full flex flex-col">
          <div class="flex items-center justify-between mb-6">
            <BaseHeading as="h4" size="md" weight="semibold">Novas Assinaturas</BaseHeading>
            <Icon name="solar:star-bold-duotone" class="size-5 text-primary-500" />
          </div>
          <div class="space-y-4 flex-1">
            <div v-for="sub in stats.recentSubscriptions" :key="sub.id"
              class="flex items-center justify-between p-3 rounded-xl bg-muted-50/50 dark:bg-muted-900/40 border border-muted-100 dark:border-muted-800 cursor-pointer hover:border-primary-500/50 transition-colors"
              @click="openUserAnalytics(sub.user.id)">
              <div class="flex items-center gap-3">
                <BaseAvatar :src="sub.user.photo" :text="sub.user.name.charAt(0)" size="xs" rounded="full" />
                <div class="overflow-hidden">
                  <p class="text-xs font-bold text-muted-800 dark:text-muted-100 truncate leading-tight">{{
                    sub.user.name }}</p>
                  <p class="text-[10px] text-muted-500 truncate mt-0.5">{{ sub.plan?.name || 'Manual' }}</p>
                </div>
              </div>
              <div class="text-right">
                <BaseTag size="sm" color="success" variant="muted"
                  class="!px-2 !py-0.5 !text-[9px] uppercase font-bold">
                  {{ sub.status }}
                </BaseTag>
                <p class="text-[9px] text-muted-400 mt-1">{{ formatDate(sub.createdAt) }}</p>
              </div>
            </div>
            <div v-if="!stats.recentSubscriptions?.length" class="text-center py-8 opacity-50">
              <p class="text-xs text-muted-500 italic">Nenhuma assinatura recente.</p>
            </div>
          </div>
          <BaseButton variant="muted" size="sm" rounded="md" block class="mt-4" to="/dashboard/admin/users">
            Ver Todos
          </BaseButton>
        </BaseCard>

        <!-- Recent Companies (Tenants) -->
        <BaseCard class="p-6 h-full flex flex-col">
          <div class="flex items-center justify-between mb-6">
            <BaseHeading as="h4" size="md" weight="semibold">Novas Empresas</BaseHeading>
            <Icon name="solar:buildings-bold-duotone" class="size-5 text-success-500" />
          </div>
          <div class="space-y-4 flex-1">
            <div v-for="tenant in stats.recentTenants" :key="tenant.id"
              class="flex items-center justify-between p-3 rounded-xl bg-muted-50/50 dark:bg-muted-900/40 border border-muted-100 dark:border-muted-800">
              <div>
                <p class="text-xs font-bold text-muted-800 dark:text-muted-100 truncate leading-tight">{{ tenant.name }}
                </p>
                <p class="text-[10px] text-muted-500 truncate mt-0.5">{{ tenant.document || 'Sem doc' }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs font-bold text-muted-700 dark:text-muted-300">{{ formatDate(tenant.createdAt) }}</p>
                <p class="text-[9px] text-muted-400 mt-1 uppercase">REGISTRADA</p>
              </div>
            </div>
            <div v-if="!stats.recentTenants?.length" class="text-center py-8 opacity-50">
              <p class="text-xs text-muted-500 italic">Nenhuma empresa recente.</p>
            </div>
          </div>
          <BaseButton variant="muted" size="sm" rounded="md" block class="mt-4" to="/dashboard/admin/users">
            Acessar Gestão
          </BaseButton>
        </BaseCard>

        <!-- System Usage (Recent Clients created by users) -->
        <BaseCard class="p-6 h-full flex flex-col">
          <div class="flex items-center justify-between mb-6">
            <BaseHeading as="h4" size="md" weight="semibold">Logs de Uso (Clientes)</BaseHeading>
            <Icon name="solar:history-bold-duotone" class="size-5 text-info-500" />
          </div>
          <div class="space-y-4 flex-1">
            <div v-for="client in stats.recentClients" :key="client.id"
              class="flex flex-col p-3 rounded-xl bg-muted-50/50 dark:bg-muted-900/40 border border-muted-100 dark:border-muted-800 hover:border-primary-500/30 transition-colors">
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs font-bold text-muted-800 dark:text-muted-100 truncate">{{ client.name }}</p>
                <span class="text-[9px] text-muted-400">{{ formatDate(client.createdAt) }}</span>
              </div>
              <p class="text-[10px] text-muted-500 italic truncate group">
                Criado por: <span class="font-bold text-primary-600 dark:text-primary-400">{{ client.tenant?.name ||
                  'Escritório' }}</span>
              </p>
            </div>
            <div v-if="!stats.recentClients?.length" class="text-center py-8 opacity-50">
              <p class="text-xs text-muted-500 italic">Nenhum uso recente registrado.</p>
            </div>
          </div>
          <BaseParagraph size="xs" class="text-muted-400 mt-4 text-center">
            Monitorando engajamento em tempo real
          </BaseParagraph>
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
