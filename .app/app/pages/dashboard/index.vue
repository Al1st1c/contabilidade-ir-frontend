<script setup lang="ts">
import { useApi, useAuth } from '~/composables/useAuth'
import { useAppState } from '~/composables/useAppState'
import { useTenant } from '~/composables/useTenant'

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
const { selectedEmployeeId } = useAppState() // Global state
const { tenant, fetchTenant } = useTenant()
import { PanelsPanelDeclarationDetails, PanelsPanelWaitingDocs } from '#components'

// Tenant computed properties for whitelabel
const companyName = computed(() => tenant.value?.tradeName || tenant.value?.name || 'Seu Escritório')
const companyLogo = computed(() => tenant.value?.logo)
const companyLocation = computed(() => {
  if (tenant.value?.city && tenant.value?.state) {
    return `${tenant.value.city}, ${tenant.value.state}`
  }
  return null
})
const trialDaysLeft = computed(() => {
  if (tenant.value?.plan === 'trial' && tenant.value?.trialEndsAt) {
    const endDate = new Date(tenant.value.trialEndsAt)
    const today = new Date()
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }
  return null
})
const planLabel = computed(() => {
  const plan = tenant.value?.plan
  if (plan === 'trial') return 'Período de Avaliação'
  if (plan === 'starter') return 'Plano Starter'
  if (plan === 'professional') return 'Plano Professional'
  if (plan === 'enterprise') return 'Plano Enterprise'
  return plan
})

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

const activeFeedTab = ref('all')

const filteredAlerts = computed(() => {
  const alerts = [] as any[]

  // Adiciona retificações (erros)
  dashboardAlerts.value.errors.forEach(e => alerts.push({ ...e, type: 'error', icon: 'solar:danger-bold', iconColor: 'text-danger-500 bg-danger-500/10', title: 'Retificação Urgente', priority: 1 }))

  // Adiciona vencimentos próximos
  dashboardAlerts.value.nearDeadline.forEach(e => alerts.push({ ...e, type: 'deadline', icon: 'solar:alarm-bold', iconColor: 'text-orange-500 bg-orange-500/10', title: 'Vencendo Hoje', priority: 2 }))

  // Adiciona documentos pendentes
  dashboardAlerts.value.waitingDocs.forEach(e => alerts.push({ ...e, type: 'docs', icon: 'solar:document-add-bold', iconColor: 'text-amber-500 bg-amber-500/10', title: 'Documento Pendente', priority: 3 }))

  // Adiciona clientes travados
  dashboardAlerts.value.stuckClients.forEach(e => alerts.push({ ...e, type: 'stuck', icon: 'solar:hourglass-bold', iconColor: 'text-primary-500 bg-primary-500/10', title: 'Fluxo Travado', priority: 4 }))

  // Filtra por aba
  if (activeFeedTab.value === 'all') return alerts.sort((a, b) => a.priority - b.priority)
  return alerts.filter(a => a.type === activeFeedTab.value).sort((a, b) => a.priority - b.priority)
})

// Trend Data
const revenueTrend = ref<any[]>([])
const trendLabels = ref<string[]>([])

// Employee Filter
const teamMembers = ref<any[]>([])

const canViewAll = computed(() => {
  const roleName = user.value?.role?.name?.toLowerCase()
  return roleName === 'master' || roleName === 'admin' || user.value?.role?.canViewAllCards
})

const isViewingAdmin = computed(() => {
  // Se não há funcionário selecionado, usa o contexto do usuário logado
  if (!selectedEmployeeId.value) return canViewAll.value

  // Se há funcionário selecionado, verifica a role dele na lista de membros
  const member = teamMembers.value.find(m => m.id === selectedEmployeeId.value)
  if (!member) return false

  const roleName = member.role?.name?.toLowerCase()
  return roleName === 'master' || roleName === 'admin' || member.role?.canViewAllCards
})

// Formatters
const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

async function fetchDashboard() {
  isLoading.value = true
  try {
    const year = new Date().getFullYear()
    let url = `/declarations/dashboard-stats?taxYear=${year}`

    if (selectedEmployeeId.value) {
      url += `&assignedToId=${selectedEmployeeId.value}`
    }

    const response = await useCustomFetch<any>(url)

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

      recentDeclarations.value = (payload.recent || []).slice(0, 3)

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

async function fetchTeam() {
  if (!canViewAll.value) return
  try {
    const { data } = await useCustomFetch<any>('/tenant/members')
    teamMembers.value = data.data || data || []
  } catch (e) {
    console.error('Error fetching team:', e)
  }
}

onMounted(() => {
  fetchDashboard()
  fetchTeam()
  // Fetch tenant data for whitelabel if not already loaded
  if (!tenant.value) {
    fetchTenant()
  }
})

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

// Refresh dashboard when employee filter changes
watch(selectedEmployeeId, () => {
  fetchDashboard()
})

const campaignProgress = computed(() => {
  if (!stats.value.total) return 0
  return Math.round((stats.value.completed / stats.value.total) * 100)
})

const selectedMemberName = computed(() => {
  if (!selectedEmployeeId.value) return null
  return teamMembers.value.find(m => m.id === selectedEmployeeId.value)?.name || '...'
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

const acessorapido = computed(() => {
  const base = [
    {
      id: 1,
      name: 'Imposto de Renda',
      description: 'Cadastrar um novo IR',
      icon: 'solar:document-text-bold-duotone',
      iconColor: 'text-primary-500 bg-primary-500/10',
      url: '/imposto-de-renda',
    },
    {
      id: 3,
      name: 'Clientes',
      description: 'Gestão de clientes',
      icon: 'solar:users-group-rounded-bold-duotone',
      iconColor: 'text-info-500 bg-info-500/10',
      url: '/dashboard/clients',
    }
  ]

  if (isViewingAdmin.value) {
    base.push(
      {
        id: 2,
        name: 'Minha Empresa',
        description: 'Personalizar marca e cores',
        icon: 'solar:settings-minimalistic-bold-duotone',
        iconColor: 'text-violet-500 bg-violet-500/10',
        url: '/dashboard/settings',
      },
      {
        id: 4,
        name: 'Equipe',
        description: 'Gerenciar funcionários',
        icon: 'solar:user-plus-bold-duotone',
        iconColor: 'text-success-500 bg-success-500/10',
        url: '/dashboard/settings/team',
      }
    )
  }

  return base
})

const productivityChart = computed(() => ({
  type: 'bar' as const,
  height: Math.max(160, teamProductivity.value.length * 45),
  series: [
    {
      name: 'Total',
      data: teamProductivity.value.map(m => m.count)
    },
    {
      name: 'Concluídos',
      data: teamProductivity.value.map(m => m.completed)
    }
  ],
  options: {
    chart: {
      stacked: false,
      toolbar: { show: false },
      sparkline: { enabled: false }
    },
    colors: ['var(--color-muted-200)', 'var(--color-primary-500)'],
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '60%',
        borderRadius: 2,
        dataLabels: { position: 'top' }
      }
    },
    dataLabels: {
      enabled: true,
      offsetX: -6,
      style: { fontSize: '10px', colors: ['#fff'] }
    },
    xaxis: {
      categories: teamProductivity.value.map(m => m.name),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { show: false }
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', fontWeight: 600 }
      }
    },
    grid: { show: false },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '10px',
      offsetY: -10
    }
  }
}))

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
    <!-- Loading State (Skeleton) -->
    <div v-if="isLoading" class="grid grid-cols-12 gap-4 animate-pulse">
      <div class="col-span-12">
        <BasePlaceload class="h-32 w-full rounded-2xl" />
      </div>
      <div class="col-span-12 lg:col-span-8 space-y-4">
        <BasePlaceload class="h-64 w-full rounded-2xl" />
        <BasePlaceload class="h-80 w-full rounded-2xl" />
      </div>
      <div class="col-span-12 lg:col-span-4 space-y-4">
        <BasePlaceload class="h-48 w-full rounded-2xl" />
        <BasePlaceload class="h-64 w-full rounded-2xl" />
        <BasePlaceload class="h-64 w-full rounded-2xl" />
      </div>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-12 gap-4">
      <!-- Header Section (Referência: 2-Cards Layout) -->

      <!-- Card 1: Saudação + Equipe (Branco / Estilo HR original) -->
      <div class="col-span-12 lg:col-span-8 mb-2">
        <BaseCard rounded="md" class="p-8 h-full border-muted-200 dark:border-muted-800 shadow-sm flex items-center">
          <div class="flex w-full flex-col sm:flex-row items-center gap-y-8 h-full">

            <!-- Coluna 1: Usuário -->
            <div class="flex flex-1 flex-col gap-y-2 px-4 border-muted-200 dark:border-muted-700">
              <BaseAvatar :src="user?.photo?.replace('https://gestorx-files.s3.us-east-1.amazonaws.com/', '')"
                :text="user?.name?.charAt(0) || '?'" size="lg"
                class="border-muted-200 dark:border-muted-800 ring-muted-100 dark:ring-muted-800 border ring-2 ring-offset-4 dark:ring-offset-muted-900 mb-2" />
              <BaseHeading as="h2" size="2xl" weight="medium" lead="none" class="text-muted-900 dark:text-white">
                <span>Bem-vindo, {{ user?.name?.split(' ')[0] || 'Contador' }}.</span>
              </BaseHeading>
              <BaseParagraph size="xs" weight="medium" class="text-muted-500 mt-1">
                {{ gamificationMessage || 'Sua campanha de IR ' + new Date().getFullYear() + ' está ativa.' }}
              </BaseParagraph>
            </div>

            <!-- Coluna 2: Equipe (Divisor vertical) -->
            <div
              class="flex flex-1 flex-col px-4 sm:px-8 border-muted-200 dark:border-muted-700 sm:border-l h-full justify-center">
              <BaseHeading as="h3" size="md" weight="medium" lead="tight" class="mb-1 text-muted-900 dark:text-white">
                <span>Sua Equipe</span>
              </BaseHeading>
              <BaseParagraph size="xs" weight="medium" lead="tight" class="mb-4 text-muted-500">
                <span>Gerencie o progresso do seu time em tempo real.</span>
              </BaseParagraph>
              <div class="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
                <template v-for="member in teamMembers.slice(0, 4)" :key="member.id">
                  <BaseAvatar size="sm" rounded="full"
                    :src="member?.photo?.replace('https://gestorx-files.s3.us-east-1.amazonaws.com/', '')"
                    :text="member.name?.charAt(0)"
                    class="ring-2 ring-white dark:ring-muted-900 hover:scale-110 transition-all cursor-pointer shadow-sm"
                    @click="selectedEmployeeId = member.id"
                    :class="{ 'ring-primary-500 z-10': selectedEmployeeId === member.id }" />
                </template>
                <BaseButton size="icon-xs" rounded="full" to="/dashboard/settings/team" variant="ghost"
                  class="hover:bg-muted-100 dark:hover:bg-muted-800 border-2 border-dashed border-muted-200 dark:border-muted-700">
                  <Icon name="lucide:plus" class="size-3" />
                </BaseButton>
              </div>
            </div>

          </div>
        </BaseCard>
      </div>

      <!-- Card 2: Prazo IR (Roxo Premium) -->
      <div class="col-span-12 lg:col-span-4 mb-2">
        <BaseCard rounded="md" variant="none"
          class="bg-primary-600 p-8 h-full flex flex-col relative overflow-hidden shadow-xl shadow-primary-500/20">
          <div class="relative z-10 flex flex-col h-full">
            <div class="flex items-center justify-between mb-2">
              <BaseHeading weight="medium" size="md" class="text-white uppercase tracking-[0.2em]">
                Prazo IR
              </BaseHeading>
              <div class="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10">
                <div class="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span class="text-[9px] font-medium text-white/80 uppercase tracking-widest">Ativo</span>
              </div>
            </div>

            <div class="flex items-center gap-6 flex-1 mt-2">
              <div class="flex flex-col gap-3 min-w-0">
                <BaseParagraph size="xs" weight="medium"
                  class="text-primary-100/80 leading-relaxed uppercase tracking-widest text-[10px]">
                  Contagem regressiva oficial para o encerramento do período.
                </BaseParagraph>
                <BaseButton color="white" rounded="md" size="sm" class="w-fit !px-6 !text-[11px] h-9 shadow-lg"
                  @click="handleNextAction">
                  Ver Prioridades
                </BaseButton>
              </div>

              <div class="relative shrink-0 ms-auto">
                <div class="absolute inset-0 bg-primary-400/20 blur-2xl rounded-full scale-150 animate-pulse" />
                <DashboardIRCanvasClock start-date="2026-03-01T08:00:00" end-date="2026-05-31T23:59:59" :size="100"
                  :show-details="false" class="relative z-10" />
              </div>
            </div>
          </div>
          <!-- Decorative Background Icon -->
          <div class="absolute -bottom-6 -end-6 opacity-10 pointer-events-none scale-150 rotate-12">
            <Icon name="solar:alarm-bold" class="size-48 text-white" />
          </div>
        </BaseCard>
      </div>

      <!-- Main Column -->
      <div class="lg:landscape:col-span-8 col-span-12 xl:landscape:col-span-8 space-y-4">

        <!-- Feed de Alertas -->
        <div id="dashboard-alerts" class="flex flex-col gap-4">
          <div class="flex flex-col items-center justify-between gap-6 sm:flex-row mb-2">
            <div>
              <BaseHeading as="h3" size="lg" weight="medium" lead="tight"
                class="text-muted-900 dark:text-muted-100 mb-1">
                <span>Alertas e Pendências</span>
              </BaseHeading>
              <BaseParagraph size="xs" weight="medium" class="text-muted-400">Ações críticas que requerem atenção
                imediata.
              </BaseParagraph>
            </div>
            <div class="flex gap-2 sm:justify-end">
              <BaseButton rounded="md" size="sm" :variant="activeFeedTab === 'all' ? 'primary' : 'default'"
                @click="activeFeedTab = 'all'">
                Tudo
              </BaseButton>
              <BaseButton rounded="md" size="sm" :variant="activeFeedTab === 'error' ? 'primary' : 'default'"
                @click="activeFeedTab = 'error'">
                Críticos
              </BaseButton>
              <BaseButton rounded="md" size="sm" :variant="activeFeedTab === 'docs' ? 'primary' : 'default'"
                @click="activeFeedTab = 'docs'">
                Documentos
              </BaseButton>
            </div>
          </div>

          <div class="space-y-2">
            <template v-for="(alert, index) in filteredAlerts.slice(0, 8)" :key="alert.id">
              <DemoFlexTableRow rounded="sm" class="group hover:border-primary-500/50 transition-colors">
                <template #start>
                  <DemoFlexTableStart label="cliente" :hide-label="index > 0"
                    :title="alert.client?.name || 'Cliente Indisponível'"
                    :subtitle="alert.column?.name || 'Etapa desconhecida'" :icon="alert.icon" />
                </template>
                <template #end>
                  <DemoFlexTableCell label="ano" :hide-label="index > 0" class="w-full sm:w-20">
                    <span class="text-muted-400 font-sans text-[10px] font-medium uppercase tracking-widest">
                      IR {{ alert.taxYear }}
                    </span>
                  </DemoFlexTableCell>
                  <DemoFlexTableCell label="prioridade" :hide-label="index > 0" class="w-full sm:w-24">
                    <BaseTag :variant="alert.type === 'error' ? 'danger' : 'primary'" rounded="full" size="sm"
                      class="uppercase text-[9px] font-medium tracking-widest">
                      {{ alert.title }}
                    </BaseTag>
                  </DemoFlexTableCell>
                  <DemoFlexTableCell label="ação" :hide-label="index > 0">
                    <button @click="openDetails(alert.id)"
                      class="text-primary-500 font-sans font-medium uppercase text-[10px] tracking-widest hover:underline underline-offset-4 sm:pe-2">
                      Resolver
                    </button>
                  </DemoFlexTableCell>
                </template>
              </DemoFlexTableRow>
            </template>

            <div v-if="filteredAlerts.length === 0"
              class="py-12 text-center bg-muted-50 dark:bg-muted-950/20 border border-dashed border-muted-200 dark:border-muted-800 rounded-xl">
              <BaseHeading size="sm" weight="medium" class="text-muted-500">Nenhum alerta pendente</BaseHeading>
            </div>
          </div>
        </div>

        <!-- Gráficos (Empilhados Verticalmente) -->
        <div class="flex flex-col gap-6">
          <!-- Gráfico de Faturamento -->
          <BaseCard rounded="md" class="flex flex-col p-6 border-muted-200 dark:border-muted-800 shadow-sm">
            <div class="mb-4 items-center justify-between sm:flex">
              <BaseHeading as="h4" size="xs" weight="medium" lead="none"
                class="text-muted-400 uppercase tracking-widest">
                Faturamento
              </BaseHeading>
              <div class="flex items-center gap-2">
                <BaseButton rounded="full" size="icon-xs" variant="ghost" @click="showRevenue = !showRevenue">
                  <Icon :name="showRevenue ? 'solar:eye-broken' : 'solar:eye-closed-broken'"
                    class="size-3 text-muted-400" />
                </BaseButton>
              </div>
            </div>
            <div class="border-muted-200 dark:border-muted-800 mb-6 flex justify-between border-b pb-4 transition-all"
              :class="{ 'blur-md opacity-30': !showRevenue }">
              <div>
                <BaseParagraph size="xs" weight="medium"
                  class="text-muted-500 mb-1 uppercase tracking-widest text-[9px]">Hoje
                </BaseParagraph>
                <BaseHeading as="h5" size="md" weight="medium">
                  {{ showRevenue ? formatCurrency(stats.completedToday * 150) : 'R$ •••' }}
                </BaseHeading>
              </div>
              <div>
                <BaseParagraph size="xs" weight="medium"
                  class="text-muted-500 mb-1 uppercase tracking-widest text-[9px]">A
                  Receber</BaseParagraph>
                <BaseHeading as="h5" size="md" weight="medium">
                  {{ showRevenue ? formatCurrency(stats.revenue - stats.received) : 'R$ •••' }}
                </BaseHeading>
              </div>
              <div>
                <BaseParagraph size="xs" weight="medium"
                  class="text-muted-500 mb-1 uppercase tracking-widest text-[9px]">
                  Total</BaseParagraph>
                <BaseHeading as="h5" size="md" weight="medium">
                  {{ showRevenue ? formatCurrency(stats.revenue) : 'R$ •••' }}
                </BaseHeading>
              </div>
            </div>
            <div class="h-[280px] transition-all" :class="{ 'blur-lg opacity-20': !showRevenue }">
              <LazyAddonApexcharts v-bind="revenueAreaChart" />
            </div>
          </BaseCard>

          <!-- Gráfico de Pipeline -->
          <BaseCard rounded="md" class="flex flex-col p-6 border-muted-200 dark:border-muted-800 shadow-sm">
            <div class="mb-4 items-center justify-between sm:flex">
              <BaseHeading as="h4" size="xs" weight="medium" lead="none"
                class="text-muted-400 uppercase tracking-widest">
                Fluxo de Trabalho
              </BaseHeading>
            </div>
            <div class="border-muted-200 dark:border-muted-800 mb-6 flex justify-between border-b pb-4">
              <div>
                <BaseParagraph size="xs" weight="medium"
                  class="text-muted-500 mb-1 uppercase tracking-widest text-[9px]">
                  Abertos</BaseParagraph>
                <BaseHeading as="h5" size="md" weight="medium">
                  {{ stats.total - stats.completed }}
                </BaseHeading>
              </div>
              <div>
                <BaseParagraph size="xs" weight="medium"
                  class="text-muted-500 mb-1 uppercase tracking-widest text-[9px]">
                  Concluídos</BaseParagraph>
                <BaseHeading as="h5" size="md" weight="medium" class="text-emerald-500">
                  {{ stats.completed }}
                </BaseHeading>
              </div>
              <div>
                <BaseParagraph size="xs" weight="medium"
                  class="text-muted-500 mb-1 uppercase tracking-widest text-[9px]">
                  Progresso</BaseParagraph>
                <BaseHeading as="h5" size="md" weight="medium" class="text-primary-500">
                  {{ campaignProgress }}%
                </BaseHeading>
              </div>
            </div>
            <div class="h-[280px]">
              <LazyAddonApexcharts v-bind="pipelineChart" />
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- Side Column (Widgets Secundários) -->
      <div class="lg:landscape:col-span-4 col-span-12 xl:landscape:col-span-4 space-y-4">

        <!-- Acesso Rápido -->
        <BaseCard rounded="md" class="p-6 h-fit border-muted-200 dark:border-muted-800 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <BaseHeading as="h3" size="sm" weight="medium"
              class="text-muted-900 dark:text-white uppercase tracking-widest">
              Acesso Rápido
            </BaseHeading>
            <BaseButton rounded="md" size="sm" to="/imposto-de-renda" variant="primary" class="!px-4">
              Novo IR
            </BaseButton>
          </div>
          <div class="grid gap-1">
            <NuxtLink v-for="item in acessorapido" :key="item.id" :to="item.url" class="group block">
              <div
                class="flex items-center gap-3 p-2 rounded-xl hover:bg-muted-50 dark:hover:bg-muted-900 transition-colors border border-transparent">
                <div
                  class="size-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-sm"
                  :class="item.iconColor">
                  <Icon :name="item.icon" class="size-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <BaseHeading as="h5" size="xs" weight="medium"
                    class="truncate group-hover:text-primary-500 transition-colors">
                    {{ item.name }}
                  </BaseHeading>
                </div>
                <Icon name="solar:arrow-right-linear"
                  class="size-3 text-muted-300 group-hover:text-primary-500 transition-colors" />
              </div>
            </NuxtLink>
          </div>
        </BaseCard>

        <!-- Produtividade da Equipe -->
        <BaseCard v-if="canViewAll" rounded="md" class="p-6 h-fit border-muted-200 dark:border-muted-800 shadow-sm">
          <div class="mb-6 flex items-center justify-between">
            <BaseHeading as="h3" size="sm" weight="medium"
              class="text-muted-900 dark:text-white uppercase tracking-widest">
              Produtividade
            </BaseHeading>
            <NuxtLink to="/dashboard/settings/team"
              class="text-[9px] font-medium uppercase text-primary-500 hover:underline tracking-widest">
              Ver Detalhes</NuxtLink>
          </div>

          <div class="space-y-4">
            <div v-for="member in teamProductivity.slice(0, 4)" :key="member.id" class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <BaseAvatar :src="member?.photo?.replace('https://gestorx-files.s3.us-east-1.amazonaws.com/', '')"
                    :text="member.name?.charAt(0)" size="xs" rounded="full" />
                  <span class="text-xs font-medium text-muted-500 dark:text-muted-400 truncate">{{ member.name }}</span>
                </div>
                <span class="text-[10px] font-medium text-muted-400">{{ member.count > 0 ? Math.round((member.completed
                  /
                  member.count) * 100) : 0 }}%</span>
              </div>
              <div class="h-1 w-full bg-muted-100 dark:bg-muted-800 rounded-full overflow-hidden">
                <div class="h-full bg-primary-500 rounded-full transition-all duration-1000"
                  :style="{ width: `${member.count > 0 ? Math.round((member.completed / member.count) * 100) : 0}%` }" />
              </div>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>

    <!-- Whitelabel Footer -->
    <div class="mt-12 py-12 border-t border-muted-200 dark:border-muted-800">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <img v-if="companyLogo" :src="companyLogo" :alt="companyName"
            class="h-6 opacity-40 grayscale hover:grayscale-0 transition-all" />
          <span class="text-[11px] font-medium uppercase tracking-[0.4em] text-muted-400">{{ companyName }}</span>
        </div>
        <div class="text-[10px] font-medium text-muted-400 uppercase tracking-[0.3em]">
          &copy; {{ new Date().getFullYear() }} • Gestão Premium de IR
        </div>
      </div>
    </div>
  </div>
</template>