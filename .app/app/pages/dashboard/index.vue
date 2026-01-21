<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Dashboard Executiva',
})

const { useCustomFetch } = useApi()

// Data States
const isLoading = ref(true)
const kanbanData = ref<any>(null)
const financialKPIs = ref({
  projected: 0,
  received: 0,
  pending: 0
})
const pipelineData = ref<any[]>([])
const productivityData = ref<any[]>([])

// Fetch dashboard data
async function fetchDashboardData() {
  isLoading.value = true
  try {
    const year = new Date().getFullYear()
    const { data } = await useCustomFetch<any>(`/declarations/kanban?taxYear=${year}`)

    if (data.success) {
      kanbanData.value = data

      // Calculate Financial KPIs
      let totalProjected = 0
      let totalReceived = 0
      let totalPending = 0

      // Flatten all cards from all columns
      const allCards = data.data.flatMap((col: any) => col.cards || [])

      allCards.forEach((card: any) => {
        const value = Number(card.serviceValue) || 0
        totalProjected += value

        if (card.paymentStatus === 'paid') {
          totalReceived += value
        } else if (card.paymentStatus === 'pending' || card.paymentStatus === 'partial') {
          totalPending += value
        }
      })

      financialKPIs.value = {
        projected: totalProjected,
        received: totalReceived,
        pending: totalPending
      }

      // Prepare Pipeline Data (columns with card counts)
      pipelineData.value = data.data.map((col: any) => ({
        name: col.name,
        count: col.cards?.length || 0,
        color: col.color
      }))

      // Calculate Productivity by Assignee
      const assigneeMap = new Map()
      allCards.forEach((card: any) => {
        if (card.assignedTo) {
          const name = card.assignedTo.name
          assigneeMap.set(name, (assigneeMap.get(name) || 0) + 1)
        }
      })

      productivityData.value = Array.from(assigneeMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5) // Top 5
    }
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchDashboardData)

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// Chart configuration for pipeline funnel
const pipelineChart = computed(() => {
  if (!pipelineData.value.length) return null

  return {
    type: 'bar' as const,
    height: 320,
    series: [{
      name: 'Declarações',
      data: pipelineData.value.map(d => d.count)
    }],
    options: {
      chart: {
        toolbar: { show: false }
      },
      colors: ['var(--color-primary-500)'],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          dataLabels: {
            position: 'top'
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val} IRs`,
        offsetX: -10,
        style: {
          fontSize: '12px',
          colors: ['#fff']
        }
      },
      xaxis: {
        categories: pipelineData.value.map(d => d.name),
        labels: {
          style: {
            fontSize: '12px'
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '13px',
            fontWeight: 500
          }
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val} declarações`
        }
      }
    }
  }
})

</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <!-- Header -->
    <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <BaseHeading as="h1" size="2xl" weight="medium">
          Dashboard Executiva
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500">
          Panorama Financeiro e Operacional da Campanha IR {{ new Date().getFullYear() }}
        </BaseParagraph>
      </div>
      <BaseButton to="/dashboard/ir" variant="primary">
        <Icon name="lucide:layout-dashboard" class="size-4 mr-1" />
        Ir para o Kanban
      </BaseButton>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <BasePlaceload class="h-32 w-full rounded-xl" v-for="i in 3" :key="i" />
      </div>
      <BasePlaceload class="h-80 w-full rounded-xl" />
    </div>

    <!-- Content -->
    <div v-else class="space-y-8">
      <!-- Financial KPIs -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <!-- Projected Revenue -->
        <BaseCard rounded="lg" class="p-6 border-2 border-primary-500/20 bg-primary-500/5">
          <div class="flex items-center gap-4">
            <div class="size-14 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Icon name="lucide:trending-up" class="size-7 text-primary-500" />
            </div>
            <div class="flex-1">
              <BaseParagraph size="xs" class="text-muted-400 uppercase tracking-wider font-medium mb-1">
                Faturamento Projetado
              </BaseParagraph>
              <BaseHeading as="h3" size="2xl" weight="medium" class="text-primary-600 dark:text-primary-400">
                {{ formatCurrency(financialKPIs.projected) }}
              </BaseHeading>
              <BaseParagraph size="xs" class="text-muted-500 mt-1">
                Total de honorários
              </BaseParagraph>
            </div>
          </div>
        </BaseCard>

        <!-- Received -->
        <BaseCard rounded="lg" class="p-6 border-2 border-success-500/20 bg-success-500/5">
          <div class="flex items-center gap-4">
            <div class="size-14 rounded-xl bg-success-500/10 flex items-center justify-center">
              <Icon name="lucide:check-circle-2" class="size-7 text-success-500" />
            </div>
            <div class="flex-1">
              <BaseParagraph size="xs" class="text-muted-400 uppercase tracking-wider font-medium mb-1">
                Recebido
              </BaseParagraph>
              <BaseHeading as="h3" size="2xl" weight="medium" class="text-success-600 dark:text-success-400">
                {{ formatCurrency(financialKPIs.received) }}
              </BaseHeading>
              <BaseParagraph size="xs" class="text-muted-500 mt-1">
                {{ financialKPIs.projected > 0 ? Math.round((financialKPIs.received / financialKPIs.projected) * 100) :
                0 }}% do total
              </BaseParagraph>
            </div>
          </div>
        </BaseCard>

        <!-- Pending -->
        <BaseCard rounded="lg" class="p-6 border-2 border-amber-500/20 bg-amber-500/5">
          <div class="flex items-center gap-4">
            <div class="size-14 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Icon name="lucide:clock" class="size-7 text-amber-500" />
            </div>
            <div class="flex-1">
              <BaseParagraph size="xs" class="text-muted-400 uppercase tracking-wider font-medium mb-1">
                Pendente
              </BaseParagraph>
              <BaseHeading as="h3" size="2xl" weight="medium" class="text-amber-600 dark:text-amber-400">
                {{ formatCurrency(financialKPIs.pending) }}
              </BaseHeading>
              <BaseParagraph size="xs" class="text-muted-500 mt-1">
                A receber
              </BaseParagraph>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Pipeline & Productivity Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Pipeline Funnel (2/3 width) -->
        <BaseCard rounded="lg" class="p-6 lg:col-span-2">
          <div class="mb-6">
            <BaseHeading as="h3" size="lg" weight="medium" class="mb-1">
              Funil de Declarações
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500">
              Veja onde estão concentrados os IRs e identifique gargalos
            </BaseParagraph>
          </div>

          <div v-if="pipelineChart">
            <LazyAddonApexcharts v-bind="pipelineChart" />
          </div>
          <div v-else class="flex items-center justify-center h-80 text-muted-400">
            <Icon name="lucide:bar-chart-3" class="size-12 mr-3" />
            <span>Sem dados para exibir</span>
          </div>
        </BaseCard>

        <!-- Productivity Widget (1/3 width) -->
        <BaseCard rounded="lg" class="p-6">
          <div class="mb-6">
            <BaseHeading as="h3" size="lg" weight="medium" class="mb-1">
              Produtividade
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500">
              IRs por responsável
            </BaseParagraph>
          </div>

          <div v-if="productivityData.length > 0" class="space-y-4">
            <div v-for="(item, idx) in productivityData" :key="idx" class="flex items-center gap-3">
              <div class="size-10 rounded-lg flex items-center justify-center text-sm font-bold" :class="[
                idx === 0 ? 'bg-primary-500/10 text-primary-600' :
                  idx === 1 ? 'bg-info-500/10 text-info-600' :
                    'bg-muted-100 text-muted-600 dark:bg-muted-800 dark:text-muted-400'
              ]">
                {{ idx + 1 }}º
              </div>
              <div class="flex-1">
                <BaseParagraph size="sm" weight="medium" class="text-muted-800 dark:text-muted-100">
                  {{ item.name }}
                </BaseParagraph>
                <div class="flex items-center gap-2 mt-1">
                  <div class="flex-1 h-2 bg-muted-200 dark:bg-muted-800 rounded-full overflow-hidden">
                    <div class="h-full bg-primary-500 rounded-full"
                      :style="{ width: `${(item.count / productivityData[0].count) * 100}%` }"></div>
                  </div>
                  <BaseParagraph size="xs" class="text-muted-500 font-bold w-8 text-right">
                    {{ item.count }}
                  </BaseParagraph>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center h-64 text-muted-400">
            <Icon name="lucide:users" class="size-12 mb-2" />
            <BaseParagraph size="sm">Sem dados de produtividade</BaseParagraph>
          </div>
        </BaseCard>
      </div>

      <!-- Quick Actions -->
      <BaseCard rounded="lg"
        class="p-6 bg-gradient-to-br from-primary-900 to-primary-800 border-none relative overflow-hidden group">
        <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div class="flex-1">
            <BaseHeading as="h3" size="xl" weight="medium" class="text-white mb-2">
              Campanha de IR {{ new Date().getFullYear() }}
            </BaseHeading>
            <BaseParagraph class="text-primary-100 mb-6 max-w-2xl">
              Gerencie todo o processo de declarações com nosso sistema Kanban. Gere links de coleta, acompanhe
              pagamentos e envie documentos com um clique.
            </BaseParagraph>
            <div class="flex flex-wrap gap-3">
              <BaseButton to="/dashboard/clients/create" color="white" rounded="md">
                <Icon name="lucide:user-plus" class="size-4 mr-2" />
                Cadastrar Cliente
              </BaseButton>
              <BaseButton to="/dashboard/ir" variant="ghost" class="text-white hover:bg-white/10 border border-white/20"
                rounded="md">
                <Icon name="lucide:layout-dashboard" class="size-4 mr-2" />
                Ver Kanban
              </BaseButton>
            </div>
          </div>
          <Icon name="lucide:calculator"
            class="absolute -right-10 -bottom-10 size-64 text-primary-800/30 rotate-12 group-hover:scale-110 transition-transform duration-500" />
        </div>
      </BaseCard>
    </div>
  </div>
</template>
