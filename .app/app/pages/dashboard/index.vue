<script setup lang="ts">
import { useApi, useAuth } from '~/composables/useAuth'

definePageMeta({
  title: 'My Projects',
  preview: {
    title: 'Personal dashboard v2',
    description: 'For personal usage and reports',
    categories: ['dashboards'],
    src: '/img/screens/dashboards-personal-2.png',
    srcDark: '/img/screens/dashboards-personal-2-dark.png',
    order: 2,
  },
})


const { useCustomFetch } = useApi()
const { user } = useAuth()
const { open } = usePanels()
import { PanelsPanelDeclarationDetails, PanelsPanelWaitingDocs } from '#components'
// State
const isLoading = ref(true)
const stats = ref({
  total: 0,
  completed: 0,
  pending: 0,
  docsWaiting: 0,
  revenue: 0,
  received: 0,
  overdue: 0,
  completedToday: 0,
  stuckRevenue: 0,
})

const pipelineData = ref<any[]>([])
const teamProductivity = ref<any[]>([])
const recentDeclarations = ref<any[]>([])
const showRevenue = ref(true)
const dashboardAlerts = ref({
  waitingDocs: [] as any[],
  nearDeadline: [] as any[],
  stuckClients: [] as any[],
  errors: [] as any[],
})

// Trend Data
const revenueTrend = ref<any[]>([])
const trendLabels = ref<string[]>([])

// Formatters
const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

async function fetchDashboard() {
  isLoading.value = true
  try {
    const year = new Date().getFullYear()
    const response = await useCustomFetch<any>(`/declarations/dashboard-stats?taxYear=${year}`)

    console.log('Dashboard Data Received:', response)

    if (response && response.data && response.data.success) {
      const payload = response.data.data

      // Update stats with explicit number coercion for safety
      stats.value = {
        total: Number(payload.stats.total || 0),
        completed: Number(payload.stats.completed || 0),
        pending: Number(payload.stats.pending || 0),
        docsWaiting: Number(payload.stats.docsWaiting || 0),
        revenue: Number(payload.stats.revenue || 0),
        received: Number(payload.stats.received || 0),
        overdue: Number(payload.stats.overdue || 0),
        completedToday: Number(payload.stats.completedToday || 0),
        stuckRevenue: Number(payload.stats.stuckRevenue || 0),
      }

      // Update arrays
      pipelineData.value = (payload.pipeline || []).map((p: any) => ({
        ...p,
        count: Number(p.count || 0)
      }))

      teamProductivity.value = (payload.productivity || []).map((p: any) => ({
        ...p,
        count: Number(p.count || 0),
        completed: Number(p.completed || 0)
      }))

      recentDeclarations.value = payload.recent || []

      // Update trend data
      if (payload.trend && payload.trend.series) {
        revenueTrend.value = payload.trend.series.map((s: any) => ({
          ...s,
          data: s.data.map((v: any) => Number(v || 0))
        }))
        trendLabels.value = payload.trend.labels || []
      }

      // Update alerts
      dashboardAlerts.value = payload.alerts || {
        waitingDocs: [],
        nearDeadline: [],
        stuckClients: [],
        errors: []
      }
    }
  } catch (e) {
    console.error('Dash error:', e)
  } finally {
    isLoading.value = false
  }
}

function openDetails(declarationId: string) {
  open(PanelsPanelDeclarationDetails, {
    declarationId,
    onSaved: () => {
      fetchDashboard()
    }
  })
}

function openWaitingDocs() {
  open(PanelsPanelWaitingDocs, {
    cards: dashboardAlerts.value.waitingDocs
  })
}

const pipelineChart = computed(() => ({
  type: 'bar' as const,
  height: 280,
  series: [{
    name: 'IRs',
    data: pipelineData.value.map(d => d.count)
  }],
  options: {
    chart: { toolbar: { show: false } },
    colors: ['var(--color-primary-500)'],
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, barHeight: '60%' }
    },
    xaxis: { categories: pipelineData.value.map(d => d.name) },
    grid: { show: false }
  }
}))

const revenueAreaChart = computed(() => ({
  type: 'area' as const,
  height: 280,
  series: revenueTrend.value,
  options: {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ['var(--color-primary-500)', 'var(--color-amber-400)'],
    legend: { position: 'top' },
    dataLabels: { enabled: false },
    stroke: {
      width: [2, 2],
      curve: 'smooth',
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0,
        opacityFrom: 0.6,
        opacityTo: 0.2,
      },
    },
    xaxis: {
      categories: trendLabels.value,
    },
    tooltip: {
      y: {
        formatter: (val: number) => formatCurrency(val)
      }
    }
  }
}))


onMounted(fetchDashboard)

const campaignProgress = computed(() => {
  if (!stats.value.total) return 0
  return Math.round((stats.value.completed / stats.value.total) * 100)
})

const gamificationMessage = computed(() => {
  if (stats.value.completedToday > 0) {
    return `🔥 Mandou bem! +${stats.value.completedToday} entregues hoje.`
  }
  return ''
})

const nextAction = computed(() => {
  if (dashboardAlerts.value.errors.length > 0) {
    return { text: 'Resolver retificações (Crítico)', icon: 'solar:danger-bold', color: 'text-danger-500' }
  }
  if (dashboardAlerts.value.nearDeadline.length > 0) {
    return { text: 'Enviar declarações próximas do prazo', icon: 'solar:clock-circle-bold', color: 'text-warning-500' }
  }
  if (dashboardAlerts.value.waitingDocs.length > 0) {
    return { text: 'Cobrar documentos pendentes', icon: 'solar:document-add-bold', color: 'text-primary-500' }
  }
  return { text: 'Cadastrar novo cliente', icon: 'solar:user-plus-bold', color: 'text-success-500' }
})

const acessorapido = [
  {
    id: 1,
    name: 'Imposto de Renda',
    description: 'Cadastrar um novo Imposto de Renda',
    logo: 'https://gestorx-files.s3.us-east-1.amazonaws.com/tenants/71694926-2a4d-4e09-8d66-c2d9933e40a8/logo/1769039090118-ox3umt.webp',
    url: '/imposto-de-renda',
  },
  {
    id: 2,
    name: 'Whitelabel',
    description: 'Configurar minha empresa',
    logo: 'https://gestorx-files.s3.us-east-1.amazonaws.com/tenants/71694926-2a4d-4e09-8d66-c2d9933e40a8/logo/1769039090118-ox3umt.webp',
    url: '/whitelabel',
  },
  {
    id: 1,
    name: 'Clientes',
    description: 'Acessar lista de clientes',
    logo: 'https://gestorx-files.s3.us-east-1.amazonaws.com/tenants/71694926-2a4d-4e09-8d66-c2d9933e40a8/logo/1769039090118-ox3umt.webp',
    url: '/imposto-de-renda',
  },
  {
    id: 1,
    name: 'Funcionários',
    description: 'Gerenciar usuários do sistema',
    logo: 'https://gestorx-files.s3.us-east-1.amazonaws.com/tenants/71694926-2a4d-4e09-8d66-c2d9933e40a8/logo/1769039090118-ox3umt.webp',
    url: '/funcionarios',
  },
]

function handleNextAction() {
  if (dashboardAlerts.value.errors.length > 0) {
    openDetails(dashboardAlerts.value.errors[0].id)
    return
  }

  if (dashboardAlerts.value.waitingDocs.length > 0) {
    openWaitingDocs()
    return
  }

  if (dashboardAlerts.value.nearDeadline.length > 0 || dashboardAlerts.value.stuckClients.length > 0) {
    const el = document.getElementById('dashboard-alerts')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  navigateTo('/imposto-de-renda')
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[500px]">
      <div class="text-center">
        <BaseSpinner size="xl" class="text-primary-500 mx-auto" />
        <BaseHeading as="h3" size="lg" weight="medium" class="mt-4">Carregando Dashboard...</BaseHeading>
        <BaseParagraph size="sm" class="text-muted-400">Preparando seus indicadores estratégicos</BaseParagraph>
      </div>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-12 gap-4">
      <!-- Grid column -->
      <div class="col-span-12">
        <!-- Header -->
        <BaseCard rounded="md" class="py-2 px-6">
          <div class="flex flex-col items-center md:flex-row justify-between">
            <div
              class="lg:landscape:flex-row lg:landscape:items-center flex flex-col items-center gap-4 text-center md:items-start md:text-start xl:landscape::flex-row xl:landscape::items-center">
              <BaseAvatar src="/img/avatars/10.svg" size="xl"
                badge-src="/img/icons/flags/united-states-of-america.svg" />
              <div class="text-center md:text-start">
                <BaseHeading as="h2" size="xl" weight="medium" lead="tight" class="text-muted-900 dark:text-white">
                  <span>Olá, {{ user?.name?.split(' ')[0] || 'Contador' }}! 👋</span>
                </BaseHeading>
                <BaseParagraph>
                  <span class="text-muted-600 dark:text-muted-400 font-medium">Campanha de IR {{ new
                    Date().getFullYear() }} • <span class="capitalize">{{ new Intl.DateTimeFormat('pt-BR',
                      { dateStyle: 'long' }).format(new Date()) }}</span></span>
                </BaseParagraph>

                <div class="mt-3 flex flex-wrap items-center gap-3">
                  <div
                    class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500 text-[10px] font-bold uppercase tracking-wider">
                    <Icon name="solar:crown-minimalistic-bold-duotone" class="size-3" />
                    <span>{{ campaignProgress }}% da Campanha</span>
                  </div>
                  <span v-if="gamificationMessage" class="text-xs text-muted-400 italic">{{ gamificationMessage
                  }}</span>

                  <div class="flex items-center gap-2 ps-3 border-s border-muted-200 dark:border-muted-800">
                    <span class="text-[10px] uppercase font-bold text-muted-400">Próxima Ação:</span>
                    <BaseButton variant="link" size="sm" :class="nextAction.color"
                      class="p-0 h-auto font-bold flex items-center gap-1" @click="handleNextAction">
                      <Icon :name="nextAction.icon" class="size-3" />
                      {{ nextAction.text }}
                    </BaseButton>
                  </div>
                </div>
              </div>
            </div>

            <div class="w-full md:w-auto flex flex-col md:flex-row items-center gap-8 md:ms-auto">
              <div class="text-center md:text-right">
                <BaseHeading as="h3" size="3xl" weight="semibold" lead="tight" class="text-muted-900 dark:text-white">
                  <span>
                    {{ stats.total }}
                    <small class="text-base font-medium">IRs</small>
                  </span>
                </BaseHeading>
                <BaseParagraph>
                  <span class="text-muted-600 dark:text-muted-400 text-xs font-medium uppercase tracking-wider">
                    Total de Declarações
                  </span>
                </BaseParagraph>
              </div>

              <div class="shrink-0 -my-4">
                <DashboardIRCanvasClock start-date="2026-01-01T08:00:00" end-date="2026-02-08T23:59:59" :size="180"
                  :show-details="false" />
              </div>
            </div>
          </div>
        </BaseCard>
      </div>
      <!-- Grid column -->
      <div class="lg:landscape:col-span-8 col-span-12 xl:landscape:col-span-8">
        <!-- Inner grid -->
        <!-- Error Alert (Pegando Fogo) -->
        <Transition enter-active-class="duration-300 ease-out" enter-from-class="transform opacity-0 -translate-y-4"
          enter-to-class="opacity-100 translate-y-0">
          <div v-if="dashboardAlerts.errors.length > 0" class="mb-4">
            <BaseCard rounded="md" class="p-4 border-l-4 border-danger-500 bg-danger-500/5 flex items-center gap-4">
              <div
                class="size-10 rounded-full bg-danger-500 text-white flex items-center justify-center shadow-lg shadow-danger-500/20 shrink-0">
                <Icon name="solar:danger-bold" class="size-6" />
              </div>
              <div class="flex-1">
                <BaseHeading as="h4" size="sm" weight="bold" class="text-danger-800 dark:text-danger-200">
                  🚨 Existem {{ dashboardAlerts.errors.length }} retificações urgentes!
                </BaseHeading>
                <BaseParagraph size="xs" class="text-danger-600/80 dark:text-danger-400/80">
                  Declarações com erros críticos que precisam de correção imediata para evitar malha fina.
                </BaseParagraph>
              </div>
              <BaseButton color="danger" size="sm" rounded="md" @click="openDetails(dashboardAlerts.errors[0].id)">
                Resolver agora
              </BaseButton>
            </BaseCard>
          </div>
        </Transition>

        <div id="dashboard-alerts" class="flex flex-col gap-4">
          <!-- Executive Summary: Resumo do Dia -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Alert 1: Pendências Documentais -->
            <BaseCard rounded="md"
              class="p-4 border-l-4 border-amber-400 relative overflow-hidden group hover:shadow-lg transition-shadow bg-amber-500/5 cursor-pointer"
              @click="openWaitingDocs">
              <div class="flex items-center gap-3 mb-3">
                <div class="size-9 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-500">
                  <Icon name="solar:document-add-linear" class="size-5" />
                </div>
                <div>
                  <BaseHeading as="h4" size="xs" weight="semibold">Falta Documentos</BaseHeading>
                  <BaseParagraph size="xs" class="text-muted-400">Críticos/Urgentes</BaseParagraph>
                </div>
                <div class="ms-auto text-end">
                  <BaseTag rounded="full" color="warning" size="sm" weight="bold">
                    {{ dashboardAlerts.waitingDocs.length }}
                  </BaseTag>
                  <div class="text-[10px] text-amber-600 font-bold mt-1 uppercase tracking-tighter">Cobrar Todos</div>
                </div>
              </div>
              <div class="space-y-2">
                <div v-for="c in dashboardAlerts.waitingDocs" :key="c.id" @click.stop="openDetails(c.id)"
                  class="flex items-center justify-between text-xs p-2 rounded-lg bg-muted-50 dark:bg-muted-900/40 border border-muted-200 dark:border-muted-800 cursor-pointer hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors">
                  <span class="truncate font-medium text-muted-700 dark:text-muted-200">{{ c.client?.name }}</span>
                  <Icon name="solar:arrow-right-up-linear"
                    class="size-3 text-muted-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <BaseParagraph v-if="dashboardAlerts.waitingDocs.length === 0" size="xs"
                  class="text-muted-400 italic py-2 text-center">
                  Tudo sob controle 🎉
                </BaseParagraph>
              </div>
            </BaseCard>

            <!-- Alert 2: Próximos Vencimentos -->
            <BaseCard rounded="md"
              class="p-4 border-l-4 border-danger-500 relative overflow-hidden group hover:shadow-lg transition-shadow bg-danger-500/5">
              <div class="flex items-center gap-3 mb-3">
                <div class="size-9 rounded-xl bg-danger-500/10 flex items-center justify-center text-danger-500">
                  <Icon name="solar:alarm-linear" class="size-5" />
                </div>
                <div>
                  <BaseHeading as="h4" size="xs" weight="semibold">Próximos Vencimentos</BaseHeading>
                  <BaseParagraph size="xs" class="text-muted-400">Janela de 5 dias</BaseParagraph>
                </div>
                <div class="ms-auto">
                  <BaseTag rounded="full" color="danger" size="sm" weight="bold">
                    {{ dashboardAlerts.nearDeadline.length }}
                  </BaseTag>
                </div>
              </div>
              <div class="space-y-2">
                <div v-for="c in dashboardAlerts.nearDeadline" :key="c.id" @click="openDetails(c.id)"
                  class="flex items-center justify-between text-xs p-2 rounded-lg bg-muted-50 dark:bg-muted-900/40 border border-muted-200 dark:border-muted-800 cursor-pointer hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors">
                  <span class="truncate font-medium text-muted-700 dark:text-muted-200">{{ c.client?.name }}</span>
                  <span class="text-[10px] text-danger-500 font-bold">HOJE</span>
                </div>
                <BaseParagraph v-if="dashboardAlerts.nearDeadline.length === 0" size="xs"
                  class="text-muted-400 italic py-2 text-center">
                  Nenhum IR vencendo nos próximos 5 dias
                </BaseParagraph>
              </div>
            </BaseCard>

            <!-- Alert 3: Clientes Travados -->
            <BaseCard rounded="md"
              class="p-4 border-l-4 relative overflow-hidden group hover:shadow-lg transition-all duration-300"
              :class="dashboardAlerts.stuckClients.length > 0 ? 'border-danger-500 bg-danger-500/5' : 'border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-950'">
              <div class="flex items-center gap-3 mb-3">
                <div class="size-9 rounded-xl flex items-center justify-center transition-colors"
                  :class="dashboardAlerts.stuckClients.length > 0 ? 'bg-danger-500/10 text-danger-500' : 'bg-muted-100 dark:bg-muted-800 text-muted-400'">
                  <Icon name="solar:hourglass-line-linear" class="size-5" />
                </div>
                <div>
                  <BaseHeading as="h4" size="xs" weight="semibold">Fluxo Travado</BaseHeading>
                  <BaseParagraph size="xs" class="text-muted-400">> 7 dias sem ação</BaseParagraph>
                </div>
                <div class="ms-auto">
                  <BaseTag rounded="full" :color="dashboardAlerts.stuckClients.length > 0 ? 'danger' : 'muted'"
                    size="sm" weight="bold">
                    {{ dashboardAlerts.stuckClients.length }}
                  </BaseTag>
                </div>
              </div>
              <div class="space-y-2">
                <div v-for="c in dashboardAlerts.stuckClients" :key="c.id" @click="openDetails(c.id)"
                  class="flex items-center justify-between text-xs p-2 rounded-lg bg-muted-50 dark:bg-muted-900/40 border border-muted-200 dark:border-muted-800 cursor-pointer hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors">
                  <span class="truncate font-medium text-muted-700 dark:text-muted-200">{{ c.client?.name }}</span>
                  <span class="text-[10px] text-primary-400 font-medium">{{ c.column?.name }}</span>
                </div>
                <BaseParagraph v-if="dashboardAlerts.stuckClients.length === 0" size="xs"
                  class="text-muted-400 italic py-2 text-center">
                  Fluxo rodando perfeitamente
                </BaseParagraph>
              </div>
            </BaseCard>
          </div>
          <!-- Project list widget -->
          <BaseCard rounded="md" class="p-4 md:p-6">
            <div class="mb-8 flex items-center justify-between">
              <BaseHeading as="h3" size="md" weight="semibold" lead="tight" class="text-muted-900 dark:text-white">
                <span>Acesso Rápido</span>
              </BaseHeading>
            </div>
            <div class="pb-2">
              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <TransitionGroup enter-active-class="transform-gpu" enter-from-class="opacity-0 -translate-x-full"
                  enter-to-class="opacity-100 translate-x-0" leave-active-class="absolute transform-gpu"
                  leave-from-class="opacity-100 translate-x-0" leave-to-class="opacity-0 -translate-x-full">
                  <NuxtLink class="group block" v-for="item in acessorapido" :key="item.id" :to="item.url">
                    <BaseCard rounded="sm" elevated-hover class="group-hover:border-primary-500! p-5">
                      <div class="mb-1 flex gap-2">
                        <BaseTooltip :content="item.name">
                          <BaseAvatar :src="item.logo" size="sm" class="bg-muted-100 dark:bg-muted-700" />
                        </BaseTooltip>
                        <div>
                          <BaseHeading tag="h5" size="sm" weight="medium" class="line-clamp-1">
                            {{ item.name }}
                          </BaseHeading>
                          <BaseParagraph size="xs" class="text-muted-400">
                            {{ item.description }}
                          </BaseParagraph>
                        </div>
                      </div>
                      <div>
                        <BaseButton variant="link" class="text-primary-500 hover:text-primary-600">
                          Acessar
                        </BaseButton>
                      </div>
                    </BaseCard>
                  </NuxtLink>
                </TransitionGroup>
              </div>
            </div>
          </BaseCard>
          <!-- Chart -->
          <BaseCard rounded="md" class="p-4 md:p-6">
            <div class="mb-6 flex items-center justify-between">
              <BaseHeading as="h3" size="md" weight="semibold" lead="tight" class="text-muted-900 dark:text-white">
                <span>Distribuição das declarações por etapa do Kanban</span>
              </BaseHeading>
            </div>
            <LazyAddonApexcharts v-bind="pipelineChart" />
          </BaseCard>
          <!-- Chart -->
          <BaseCard rounded="md" class="p-4 md:p-6">
            <div class="mb-6 flex items-center justify-between">
              <BaseHeading as="h3" size="md" weight="semibold" lead="tight" class="text-muted-800 dark:text-white">
                <span>Progresso de recebimento vs honorários projetados</span>
              </BaseHeading>
              <BaseButton rounded="full" size="icon-sm" variant="muted" @click="showRevenue = !showRevenue">
                <Icon :name="showRevenue ? 'solar:eye-broken' : 'solar:eye-closed-broken'" class="size-4" />
              </BaseButton>
            </div>
            <div class="transition-all duration-500">
              <LazyAddonApexcharts v-bind="revenueAreaChart" />
            </div>

            <div
              class="w-full mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-muted-100 dark:border-muted-800 transition-all duration-300"
              :class="{ 'blur-md select-none pointer-events-none': !showRevenue }">
              <div class="flex flex-col">
                <span class="text-[10px] uppercase font-bold text-muted-400 mb-1">Receita Esperada</span>
                <span class="text-sm font-semibold text-muted-800 dark:text-muted-100">{{ showRevenue ?
                  formatCurrency(stats.revenue) : 'R$ ••••••' }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] uppercase font-bold text-success-500 mb-1">Recebido</span>
                <span class="text-sm font-semibold text-success-600">{{ showRevenue ? formatCurrency(stats.received) :
                  'R$ ••••••' }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] uppercase font-bold text-danger-500 mb-1">Em Atraso</span>
                <span class="text-sm font-semibold text-danger-600">{{ showRevenue ? formatCurrency(stats.overdue) :
                  'R$ ••••••' }}</span>
              </div>
            </div>

            <div
              class="mt-4 p-3 rounded-lg bg-muted-50 dark:bg-muted-900/40 border border-muted-200 dark:border-muted-800 text-center transition-all duration-300"
              :class="{ 'blur-sm select-none pointer-events-none opacity-50': !showRevenue }">
              <span class="text-xs text-muted-500">
                Faltam <span class="font-bold text-primary-500">{{ showRevenue ? formatCurrency(stats.revenue -
                  stats.received) : 'R$ ••••••' }}</span> para receber
              </span>
            </div>
          </BaseCard>
        </div>
      </div>
      <!-- Grid column -->
      <div class="lg:landscape:col-span-4 col-span-12 xl:landscape:col-span-4">
        <!-- Inner grid -->
        <div class="grid gap-4 lg:flex lg:flex-col">
          <!-- Widget -->
          <DemoActionText title="Upgrade to Pro"
            text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quid censes in Latino fore? Nam ante Aristippus, et ille melius."
            label="Upgrade Now" to="#" rounded="md" />
          <!-- Widget -->
          <!-- Widget -->
          <BaseCard class="p-4 md:p-6">
            <!-- Title -->
            <div class="mb-8 flex items-center justify-between">
              <BaseHeading as="h3" size="md" weight="semibold" lead="tight" class="text-muted-900 dark:text-white">
                <span>Últimos IRs</span>
              </BaseHeading>
              <BaseText size="sm">
                <BaseLink to="/dashboard/ir" class="not-hover:text-muted-400">
                  Ver tudo
                </BaseLink>
              </BaseText>
            </div>

            <div class="mb-6 space-y-4">
              <div v-for="item in recentDeclarations" :key="item.id"
                class="flex items-center gap-3 p-2 rounded-xl hover:bg-muted-50 dark:hover:bg-muted-900 transition-colors cursor-pointer group"
                @click="openDetails(item.id)">
                <BaseAvatar :src="item.client?.photo" :text="item.client?.name?.charAt(0)" size="sm"
                  class="bg-primary-500/10 text-primary-500 shrink-0" />
                <div class="flex-1 min-w-0">
                  <BaseHeading as="h4" size="sm" weight="semibold" lead="tight"
                    class="text-muted-900 dark:text-white truncate">
                    <span>{{ item.client?.name || 'Sem nome' }}</span>
                  </BaseHeading>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span
                      class="text-[10px] font-bold text-primary-500 bg-primary-500/10 px-1.5 py-0.5 rounded uppercase">
                      IR {{ item.taxYear }}
                    </span>
                    <span class="text-[10px] text-muted-400 font-medium truncate">
                      • {{ item.column?.name || 'Sem etapa' }}
                    </span>
                  </div>
                </div>
                <div class="ms-auto flex items-center">
                  <Icon name="solar:alt-arrow-right-linear"
                    class="size-4 text-muted-300 group-hover:text-primary-500 transition-colors" />
                </div>
              </div>

              <div v-if="recentDeclarations.length === 0"
                class="py-8 text-center bg-muted-50 dark:bg-muted-900/40 rounded-xl border border-dashed border-muted-200 dark:border-muted-800">
                <Icon name="solar:document-add-linear" class="size-8 mx-auto mb-2 text-muted-400 opacity-50" />
                <BaseHeading as="h4" size="xs" weight="medium" class="text-muted-500">Nenhum IR recente</BaseHeading>
                <BaseParagraph size="xs" class="text-muted-400 mt-1">Comece criando uma nova declaração</BaseParagraph>
              </div>
            </div>
          </BaseCard>
          <!-- Widget -->
          <BaseCard class="p-6">
            <BaseHeading as="h3" size="md" weight="semibold" class="mb-6">Produtividade da Equipe</BaseHeading>
            <div class="space-y-6">
              <div v-for="member in teamProductivity" :key="member.name" class="group">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-3">
                    <BaseAvatar :src="member.photo" :text="member.name.charAt(0)" size="xs" rounded="full" />
                    <BaseParagraph size="sm" weight="bold" class="text-muted-800 dark:text-muted-100">{{ member.name }}
                    </BaseParagraph>
                  </div>
                  <BaseParagraph size="xs" weight="bold" class="text-primary-500">
                    {{ member.completed }}/{{ member.count }}
                  </BaseParagraph>
                </div>
                <BaseProgress size="xs" variant="primary" :model-value="(member.completed / member.count) * 100"
                  class="group-hover:opacity-80 transition-opacity" />
              </div>
            </div>
            <div v-if="teamProductivity.length === 0" class="py-10 text-center text-muted-400">
              <Icon name="solar:users-group-two-rounded-linear" class="size-10 mx-auto mb-2 opacity-50" />
              <BaseParagraph size="xs">Ninguém atribuído ainda</BaseParagraph>
            </div>
          </BaseCard>

        </div>
      </div>
    </div>
  </div>
</template>
