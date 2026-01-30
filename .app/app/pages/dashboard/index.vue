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

const isClockZoomed = ref(false)

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

const activeAlertTab = ref('all')

function handleAlertAction(alert: any) {
  if (alert.type === 'waitingDocs') {
    openWaitingDocs()
  } else {
    openDetails(alert.id)
  }
}
const irStartDate = ref("2026-03-01T08:00:00")
const irEndDate = ref("2026-05-31T23:59:59")

const isIrPeriodStarted = computed(() => {
  return new Date() >= new Date(irStartDate.value)
})

const filteredAlerts = computed(() => {
  const all = [
    ...dashboardAlerts.value.errors.map(a => ({ ...a, type: 'error', icon: 'solar:danger-bold', iconColor: 'text-danger-500', iconBg: 'bg-danger-500/10', priority: 1, label: 'Erro' })),
    ...dashboardAlerts.value.nearDeadline.map(a => ({ ...a, type: 'nearDeadline', icon: 'solar:clock-circle-bold', iconColor: 'text-warning-500', iconBg: 'bg-warning-500/10', priority: 2, label: 'Vencimento' })),
    ...dashboardAlerts.value.waitingDocs.map(a => ({ ...a, type: 'waitingDocs', icon: 'solar:document-add-bold', iconColor: 'text-primary-500', iconBg: 'bg-primary-500/10', priority: 3, label: 'Documentos' })),
    ...dashboardAlerts.value.stuckClients.map(a => ({ ...a, type: 'stuckClients', icon: 'solar:hourglass-line-linear', iconColor: 'text-muted-400', iconBg: 'bg-muted-500/10', priority: 4, label: 'Travado' })),
  ]

  if (activeAlertTab.value === 'all') return all
  return all.filter(a => a.type === activeAlertTab.value)
})

const rookies = computed(() => {
  if (teamMembers.value.length === 0) return []
  return teamMembers.value.slice(0, 3).map(m => ({
    name: m.name,
    role: m.role?.name || 'Membro',
    avatar: m.photo || `/img/avatars/${Math.floor(Math.random() * 20) + 1}.svg`,
    stack: '/img/stacks/js.svg'
  }))
})

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
        <div class="grid grid-cols-3 gap-4">
          <BasePlaceload class="h-32 w-full rounded-2xl" />
          <BasePlaceload class="h-32 w-full rounded-2xl" />
          <BasePlaceload class="h-32 w-full rounded-2xl" />
        </div>
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
      <!-- Grid column -->
      <div class="col-span-12">
        <!-- Header Row -->
        <div class="col-span-12">
          <div class="grid grid-cols-12 gap-4">
            <!-- Left: User Profile & Rookies & Job Feed (Col 7/8) -->
            <div class="col-span-12 lg:col-span-7 2xl:col-span-8">
              <div
                class="bg-primary-800 rounded-2xl px-6 py-10 h-full flex items-center shadow-xl shadow-primary-500/10 border border-primary-700/50">
                <div class="flex w-full flex-col items-center gap-y-6 sm:flex-row">
                  <!-- User Profile -->
                  <div class="flex flex-1 flex-col gap-y-2 px-4 border-muted-700/50">
                    <BaseAvatar :src="user?.photo" :text="user?.name?.charAt(0) || '?'" size="lg"
                      class="border-primary-200/50 ring-primary-200/50 ring-offset-primary-600 mb-2 border ring-2 ring-offset-4 shadow-lg shadow-black/20" />
                    <BaseHeading as="h2" size="2xl" weight="bold" lead="none" class="text-white">
                      <span>Olá, {{ user?.name?.split(' ')[0] || 'Contador' }}! 👋</span>
                    </BaseHeading>
                    <BaseParagraph size="xs" class="text-primary-100 hidden sm:block">
                      Sua campanha de IR {{ new Date().getFullYear() }} está a todo vapor.
                    </BaseParagraph>
                  </div>

                  <!-- New Rookies (Team Members) -->
                  <div class="flex h-full flex-1 flex-col px-4 sm:px-6 border-primary-700/50 sm:border-l">
                    <BaseHeading as="h2" size="md" weight="bold" lead="tight" class="mb-1 text-white">
                      <span>Sua Equipe</span>
                    </BaseHeading>
                    <BaseParagraph size="xs" lead="tight" class="mb-3 text-primary-50">
                      Acompanhe a produtividade dos seus colaboradores.
                    </BaseParagraph>
                    <div class="mt-auto flex items-center gap-2">
                      <div class="flex -space-x-2">
                        <BaseAvatar v-for="rookie in rookies" :key="rookie.name" size="sm" rounded="full"
                          :src="rookie.avatar" class="border-2 border-primary-800 ring-1 ring-primary-500/30" />
                      </div>
                      <BaseButton size="icon-md" rounded="lg" to="/dashboard/settings/team"
                        class="hover:bg-primary-700 transition-colors">
                        <Icon name="lucide:plus" class="size-4" />
                      </BaseButton>
                    </div>
                  </div>

                  <!-- Job Feed (New IR Action) -->
                  <div class="flex h-full flex-1 flex-col px-4 sm:px-6 border-primary-700/50 sm:border-l">
                    <BaseHeading as="h2" size="md" weight="bold" lead="tight" class="mb-1 text-white">
                      <span>Nova Declaração</span>
                    </BaseHeading>
                    <BaseParagraph size="xs" lead="tight" class="mb-3 text-primary-50">
                      Cadastre um novo cliente ou declaração de IR.
                    </BaseParagraph>
                    <div class="mt-auto">
                      <BaseButton class="w-full shadow-lg shadow-primary-900/40" variant="default"
                        to="/imposto-de-renda">
                        <span>Cadastrar Agora</span>
                      </BaseButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Standing Orders (Timer) (Col 5/4) -->
            <div class="col-span-12 lg:col-span-5 2xl:col-span-4 h-full">
              <BaseCard rounded="md" variant="none"
                class="bg-primary-900 border-primary-800 h-full p-6 md:p-8 lg:p-6 relative overflow-hidden group shadow-xl shadow-primary-950/20">

                <!-- Background Illustration -->
                <div class="absolute inset-0 overflow-hidden rounded-md pointer-events-none">
                  <div
                    class="absolute -left-12 -bottom-10 opacity-10 transform -rotate-12 group-hover:rotate-0 transition-transform duration-700">
                    <VectorIllustrationCalendar class="size-64 text-primary-400" />
                  </div>
                </div>

                <div class="grid grid-cols-12 gap-4 h-full items-center relative z-10">
                  <!-- Text Area -->
                  <div class="col-span-12 sm:col-span-6">
                    <BaseHeading as="h3" size="xl" weight="bold" class="text-white mb-2 drop-shadow-sm">
                      {{ isIrPeriodStarted ? 'Tempo Restante' : 'Campanha IR' }}
                    </BaseHeading>
                    <BaseParagraph size="xs" class="text-primary-50 mb-6 leading-relaxed opacity-90">
                      {{ isIrPeriodStarted
                        ? 'Acompanhe o tempo restante para a entrega das declarações de 2026.'
                        : 'O período de entrega das declarações do IR inicia em breve.'
                      }}
                    </BaseParagraph>
                    <BaseButton size="sm" variant="default" class="w-fit shadow-md shadow-black/20"
                      to="/imposto-de-renda">
                      {{ isIrPeriodStarted ? 'Gerenciar' : 'Cronograma' }}
                    </BaseButton>
                  </div>

                  <!-- Visual Area (Interactive Clock) -->
                  <div class="col-span-12 sm:col-span-6 flex flex-col items-center justify-center min-h-[160px]">
                    <div class="transition-all duration-500 cursor-pointer hover:scale-105 active:scale-95" :class="[
                      isClockZoomed
                        ? 'z-[100] relative scale-125 md:scale-150'
                        : 'scale-[0.9] sm:scale-100 z-10 relative shadow-2xl shadow-black/40 rounded-full'
                    ]" @click="isClockZoomed = !isClockZoomed">
                      <div v-if="!isClockZoomed"
                        class="absolute inset-0 rounded-full ring-4 ring-primary-500/20 group-hover:ring-primary-400/40 transition-all duration-300 animate-pulse">
                      </div>
                      <DashboardIRCanvasClock :start-date="irStartDate" :end-date="irEndDate"
                        :size="isClockZoomed ? 160 : 130" />
                    </div>
                  </div>
                </div>
              </BaseCard>
            </div>
          </div>
        </div>
      </div>
      <!-- Grid column -->
      <div class="lg:landscape:col-span-8 col-span-12 xl:landscape:col-span-8">
        <!-- Inner grid -->
        <!-- Alerts Feed Section -->
        <div id="dashboard-alerts" class="mt-6">
          <div class="flex flex-col items-center justify-between gap-6 sm:flex-row mb-6">
            <div>
              <BaseHeading as="h3" size="lg" weight="bold" lead="tight" class="text-muted-900 dark:text-muted-100">
                <span>Resumo da Campanha</span>
              </BaseHeading>
            </div>
            <div class="flex gap-2 sm:justify-end">
              <BaseButton rounded="md" size="sm" :variant="activeAlertTab === 'all' ? 'primary' : 'default'"
                @click="activeAlertTab = 'all'">
                Todos
              </BaseButton>
              <BaseButton rounded="md" size="sm" :variant="activeAlertTab === 'error' ? 'primary' : 'default'"
                @click="activeAlertTab = 'error'">
                Urgentes
              </BaseButton>
              <BaseButton rounded="md" size="sm" :variant="activeAlertTab === 'waitingDocs' ? 'primary' : 'default'"
                @click="activeAlertTab = 'waitingDocs'">
                Docs
              </BaseButton>
              <BaseButton rounded="md" size="sm" :variant="activeAlertTab === 'stuckClients' ? 'primary' : 'default'"
                @click="activeAlertTab = 'stuckClients'">
                Parados
              </BaseButton>
            </div>
          </div>

          <div class="grid grid-cols-12 gap-6 mt-6">
            <!-- Left: Campaign Summary (Acesso Rápido) -->
            <div class="col-span-12 xl:col-span-4">
              <div class="flex flex-col gap-8">

                <!-- Quick Access Section -->
                <div>
                  <div class="grid grid-cols-1 gap-2">
                    <NuxtLink v-for="item in acessorapido" :key="item.id" :to="item.url" class="group">
                      <div
                        class="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-muted-800 border border-muted-200 dark:border-muted-700 hover:border-primary-500 transition-all duration-300">
                        <div
                          class="size-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                          :class="item.iconColor">
                          <Icon :name="item.icon" class="size-5" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <BaseHeading tag="h5" size="sm" weight="medium"
                            class="text-muted-800 dark:text-muted-100 line-clamp-1">
                            {{ item.name }}
                          </BaseHeading>
                          <BaseParagraph size="xs" class="text-muted-400 line-clamp-1">
                            {{ item.description }}
                          </BaseParagraph>
                        </div>
                        <Icon name="lucide:chevron-right"
                          class="size-4 text-muted-300 group-hover:text-primary-500 transition-colors" />
                      </div>
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Feed -->
            <div class="col-span-12 xl:col-span-8">
              <div class="space-y-2 min-h-[240px]">
                <TransitionGroup enter-active-class="transform-gpu duration-300 ease-out"
                  enter-from-class="opacity-0 -translate-x-4" enter-to-class="opacity-100 translate-x-0"
                  leave-active-class="absolute transform-gpu duration-200 ease-in" leave-from-class="opacity-100"
                  leave-to-class="opacity-0 translate-x-4">
                  <DemoFlexTableRow v-for="(alert, index) in filteredAlerts" :key="alert.id" rounded="sm" condensed
                    class="hover:bg-muted-50 dark:hover:bg-muted-900 transition-all cursor-pointer border-transparent hover:border-primary-500/30"
                    @click="openDetails(alert.id)">
                    <template #start>
                      <DemoFlexTableStart :title="alert.client?.name || 'Cliente'"
                        :subtitle="alert.column?.name || 'Etapa não definida'" :icon="alert.icon"
                        :icon-color="alert.iconColor" :icon-bg="alert.iconBg" label="Cliente" :hide-label="index > 0" />
                    </template>
                    <template #end>
                      <DemoFlexTableCell label="Alerta" :hide-label="index > 0" class="w-full sm:w-24">
                        <BaseTag
                          :color="alert.type === 'error' ? 'danger' : alert.type === 'nearDeadline' ? 'warning' : 'muted'"
                          rounded="full" size="sm" class="capitalize">
                          {{ alert.label }}
                        </BaseTag>
                      </DemoFlexTableCell>
                      <DemoFlexTableCell label="Ação" :hide-label="index > 0">
                        <BaseButton variant="link" size="sm" color="primary"
                          class="p-0 h-auto font-medium hover:underline">
                          Ver Detalhes
                        </BaseButton>
                      </DemoFlexTableCell>
                    </template>
                  </DemoFlexTableRow>

                  <!-- Empty State -->
                  <div v-if="filteredAlerts.length === 0" key="empty"
                    class="py-12 flex flex-col items-center justify-center text-center bg-muted-50 dark:bg-muted-900/40 rounded-2xl border-2 border-dashed border-muted-200 dark:border-muted-800">
                    <div
                      class="size-14 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center text-muted-400 mb-4">
                      <Icon name="solar:check-circle-bold" class="size-7 text-success-500" />
                    </div>
                    <BaseHeading as="h4" size="md" weight="medium" class="text-muted-800 dark:text-muted-100">
                      Tudo em ordem!
                    </BaseHeading>
                    <BaseParagraph size="xs" class="text-muted-500">
                      Não existem alertas pendentes para esta categoria.
                    </BaseParagraph>
                  </div>
                </TransitionGroup>
              </div>
            </div>
          </div>

          <!-- Charts Section -->
          <!-- Charts Section: Stacked Vertically -->
          <div class="flex flex-col gap-6 mt-8">
            <!-- Pipeline Chart -->
            <BaseCard rounded="md" class="flex flex-col p-6">
              <div class="mb-6 flex items-center justify-between">
                <BaseHeading as="h4" size="sm" weight="bold" lead="none"
                  class="text-muted-800 dark:text-muted-100 uppercase tracking-wider">
                  Processamento IR
                </BaseHeading>
              </div>
              <div class="border-muted-100 dark:border-muted-800 mb-6 flex justify-between border-b pb-4">
                <div>
                  <BaseParagraph size="xs" weight="medium" class="text-muted-500 dark:text-muted-400 mb-1">Total
                  </BaseParagraph>
                  <BaseHeading as="h5" size="lg" weight="bold">{{ stats.total }}</BaseHeading>
                </div>
                <div>
                  <BaseParagraph size="xs" weight="medium" class="text-muted-500 dark:text-muted-400 mb-1">Aguardando
                  </BaseParagraph>
                  <BaseHeading as="h5" size="lg" weight="bold">{{ stats.pending }}</BaseHeading>
                </div>
                <div>
                  <BaseParagraph size="xs" weight="medium" class="text-muted-500 dark:text-muted-400 mb-1">Finalizados
                  </BaseParagraph>
                  <BaseHeading as="h5" size="lg" weight="bold" class="text-success-600">{{ stats.completed }}
                  </BaseHeading>
                </div>
              </div>
              <div class="mt-auto pt-4">
                <LazyAddonApexcharts v-bind="pipelineChart" :height="350" />
              </div>
            </BaseCard>

            <!-- Revenue Chart -->
            <BaseCard rounded="md" class="flex flex-col p-6">
              <div class="mb-6 flex items-center justify-between">
                <BaseHeading as="h4" size="sm" weight="bold" lead="none"
                  class="text-muted-800 dark:text-muted-100 uppercase tracking-wider">
                  Faturamento Projetado
                </BaseHeading>
                <BaseButton rounded="full" size="icon-sm" variant="muted" @click="showRevenue = !showRevenue"
                  class="size-7">
                  <Icon :name="showRevenue ? 'solar:eye-broken' : 'solar:eye-closed-broken'" class="size-3.5" />
                </BaseButton>
              </div>
              <div class="border-muted-100 dark:border-muted-800 mb-6 flex justify-between border-b pb-4">
                <div>
                  <BaseParagraph size="xs" weight="medium" class="text-muted-500 dark:text-muted-400 mb-1">Total
                  </BaseParagraph>
                  <BaseHeading as="h5" size="lg" weight="bold">
                    {{ showRevenue ? formatCurrency(stats.revenue) : 'R$ •••••' }}
                  </BaseHeading>
                </div>
                <div>
                  <BaseParagraph size="xs" weight="medium" class="text-muted-500 dark:text-muted-400 mb-1">Recebido
                  </BaseParagraph>
                  <BaseHeading as="h5" size="lg" weight="bold" class="text-success-600">
                    {{ showRevenue ? formatCurrency(stats.received) : 'R$ •••••' }}
                  </BaseHeading>
                </div>
                <div>
                  <BaseParagraph size="xs" weight="medium" class="text-muted-500 dark:text-muted-400 mb-1">Pendente
                  </BaseParagraph>
                  <BaseHeading as="h5" size="lg" weight="bold" class="text-danger-600">
                    {{ showRevenue ? formatCurrency(stats.revenue - stats.received) : 'R$ •••••' }}
                  </BaseHeading>
                </div>
              </div>
              <div class="mt-auto pt-4" :class="{ 'blur-md opacity-20 select-none': !showRevenue }">
                <LazyAddonApexcharts v-bind="revenueAreaChart" :height="350" />
              </div>
            </BaseCard>
          </div>

          <div v-if="canViewAll" class="mt-8">
            <BaseCard rounded="md" class="p-6">
              <!-- Header -->
              <div class="mb-6 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="size-10 rounded-xl bg-success-500/10 flex items-center justify-center text-success-500">
                    <Icon name="solar:chart-2-bold-duotone" class="size-6" />
                  </div>
                  <div>
                    <BaseHeading as="h3" size="lg" weight="semibold" lead="tight"
                      class="text-muted-900 dark:text-white">
                      Produtividade da Equipe
                    </BaseHeading>
                    <BaseParagraph size="xs" class="text-muted-400">
                      Desempenho e entregas dos seus colaboradores no período
                    </BaseParagraph>
                  </div>
                </div>
                <NuxtLink to="/dashboard/settings/team"
                  class="text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-1 bg-primary-500/5 px-3 py-1.5 rounded-lg">
                  Ver Equipe Completa
                  <Icon name="solar:arrow-right-linear" class="size-3" />
                </NuxtLink>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <!-- Chart Area -->
                <div v-if="teamProductivity.length > 0" class="lg:col-span-4">
                  <div
                    class="h-full flex flex-col justify-center border-muted-100 dark:border-muted-800 lg:border-r lg:pr-8">
                    <AddonApexchart v-bind="productivityChart" />
                  </div>
                </div>

                <!-- Members List Area -->
                <div :class="teamProductivity.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div v-for="member in teamProductivity" :key="member.id" class="group">
                      <BaseCard rounded="sm" class="p-6 transition-all hover:shadow-md hover:border-primary-500/30">
                        <div class="flex items-center gap-3 mb-3">
                          <!-- Avatar -->
                          <div
                            class="size-12 rounded-xl bg-gradient-to-br from-success-500/20 to-success-500/5 flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-muted-100 dark:ring-muted-800">
                            <BaseAvatar v-if="member.photo" :src="member.photo" size="md" rounded="lg" />
                            <span v-else class="text-lg font-bold text-success-500">
                              {{ member.name?.charAt(0) || '?' }}
                            </span>
                          </div>

                          <!-- Content -->
                          <div class="flex-1 min-w-0">
                            <BaseHeading as="h4" size="md" weight="semibold"
                              class="truncate text-muted-800 dark:text-muted-100">
                              {{ member.name }}
                            </BaseHeading>
                            <div class="flex items-center gap-2 mt-0.5">
                              <span
                                class="text-[10px] font-bold text-muted-400 uppercase tracking-widest bg-muted-100 dark:bg-muted-800 px-1.5 py-0.5 rounded">
                                {{ member.count }} IRs
                              </span>
                            </div>
                          </div>

                          <!-- Stats Badge -->
                          <div class="text-right shrink-0">
                            <div class="text-base font-bold text-muted-900 dark:text-white tabular-nums">
                              {{ member.completed }}<span class="text-muted-400 font-normal text-xs">/{{ member.count
                                }}</span>
                            </div>
                            <div class="text-[10px] font-bold uppercase"
                              :class="member.count > 0 && member.completed === member.count ? 'text-success-500' : 'text-primary-500'">
                              {{ member.count > 0 ? Math.round((member.completed / member.count) * 100) : 0 }}%
                            </div>
                          </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="space-y-1">
                          <div class="flex justify-between items-center text-[10px] font-medium text-muted-400">
                            <span>Progresso</span>
                            <span>{{ member.count > 0 ? Math.round((member.completed / member.count) * 100) : 0
                              }}%</span>
                          </div>
                          <BaseProgress size="xs" variant="primary"
                            :model-value="member.count > 0 ? (member.completed / member.count) * 100 : 0"
                            class="transition-all duration-700" />
                        </div>
                      </BaseCard>
                    </div>

                    <!-- Empty State -->
                    <div v-if="teamProductivity.length === 0"
                      class="col-span-full py-12 text-center bg-muted-50/50 dark:bg-muted-900/20 rounded-2xl border-2 border-dashed border-muted-200 dark:border-muted-800">
                      <div
                        class="size-16 mx-auto mb-4 rounded-2xl bg-muted-100 dark:bg-muted-800 flex items-center justify-center text-muted-400">
                        <Icon name="solar:users-group-two-rounded-linear" class="size-8" />
                      </div>
                      <BaseHeading as="h4" size="md" weight="medium" class="text-muted-700 dark:text-muted-200">Sem
                        atividade na
                        equipe</BaseHeading>
                      <BaseParagraph size="xs" class="text-muted-400 mt-2 max-w-[260px] mx-auto leading-relaxed">
                        Não há funcionários com declarações de IR atribuídas para exibição de métricas.
                      </BaseParagraph>
                    </div>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>
        </div>
      </div>
      <!-- Grid column -->
      <div class="lg:landscape:col-span-4 col-span-12 xl:landscape:col-span-4">
        <!-- Inner grid -->
        <div class="grid gap-4 lg:flex lg:flex-col">
          <!-- Plan Status Widget (Trial or Premium) -->
          <BaseCard v-if="isViewingAdmin && tenant" rounded="md"
            class="p-6 relative overflow-hidden min-h-[125px] flex flex-col justify-center">
            <!-- Decorative gradient orb -->
            <div
              class="absolute -top-12 -right-12 size-32 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-full blur-2xl" />

            <div class="relative">
              <!-- Trial Warning -->
              <template v-if="trialDaysLeft !== null">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="size-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Icon name="solar:clock-circle-bold-duotone" class="size-5" />
                  </div>
                  <div>
                    <BaseHeading as="h4" size="sm" weight="bold" class="text-muted-900 dark:text-white">
                      {{ planLabel }}
                    </BaseHeading>
                    <BaseParagraph size="xs" class="text-muted-400">
                      <span v-if="trialDaysLeft > 0">{{ trialDaysLeft }} dias restantes</span>
                      <span v-else class="text-danger-500 font-semibold">Período expirado!</span>
                    </BaseParagraph>
                  </div>
                </div>

                <!-- Progress bar for trial -->
                <div class="mb-4">
                  <div class="flex justify-between text-[10px] uppercase font-semibold text-muted-400 mb-1">
                    <span>Período de teste</span>
                    <span class="text-primary-500">{{ Math.max(0, trialDaysLeft) }}/14 dias</span>
                  </div>
                  <div class="h-2 bg-muted-100 dark:bg-muted-800 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500 rounded-full"
                      :style="{ width: `${Math.max(0, (trialDaysLeft / 14) * 100)}%` }" />
                  </div>
                </div>

                <BaseButton to="/dashboard/settings" color="primary" size="sm" rounded="md" shadow class="w-full">
                  <Icon name="solar:star-bold" class="size-4 me-2" />
                  Escolher um Plano
                </BaseButton>
              </template>

              <!-- Active Plan (Not Trial) -->
              <template v-else-if="tenant?.plan">
                <div class="flex items-center gap-3">
                  <div
                    class="size-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/20">
                    <Icon name="solar:verified-check-bold-duotone" class="size-5" />
                  </div>
                  <div>
                    <BaseHeading as="h4" size="sm" weight="bold" class="text-muted-900 dark:text-white">
                      {{ planLabel }}
                    </BaseHeading>
                    <BaseParagraph size="xs" class="text-success-500 font-medium flex items-center gap-1">
                      <Icon name="solar:check-circle-bold" class="size-3" />
                      Plano ativo
                    </BaseParagraph>
                  </div>
                </div>
              </template>
            </div>
          </BaseCard>


          <!-- Widget: Últimos IRs -->
          <BaseCard rounded="md" class="p-6">
            <!-- Header -->
            <div class="mb-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="size-9 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                  <Icon name="solar:document-text-bold-duotone" class="size-5" />
                </div>
                <BaseHeading as="h3" size="md" lead="tight" class="text-muted-900 dark:text-white">
                  Últimos IRs
                </BaseHeading>
              </div>
              <NuxtLink to="/imposto-de-renda"
                class="text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-1">
                Ver tudo
                <Icon name="solar:arrow-right-linear" class="size-3" />
              </NuxtLink>
            </div>

            <!-- List -->
            <div class="space-y-2">
              <div v-for="item in recentDeclarations" :key="item.id" class="group cursor-pointer"
                @click="openDetails(item.id)">
                <BaseCard rounded="sm" elevated-hover class="p-4 group-hover:border-primary-500! transition-all">
                  <div class="flex items-center gap-3">
                    <!-- Avatar/Icon -->
                    <div
                      class="size-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-500/5 flex items-center justify-center text-primary-500 shrink-0 transition-transform group-hover:scale-105">
                      <span class="text-sm font-bold">{{ item.client?.name?.charAt(0) || '?' }}</span>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <BaseHeading as="h4" size="sm" weight="medium" class="truncate text-muted-900 dark:text-white">
                        {{ item.client?.name || 'Sem nome' }}
                      </BaseHeading>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span
                          class="inline-flex items-center text-[10px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded uppercase">
                          IR {{ item.taxYear }}
                        </span>
                        <span class="text-[10px] text-muted-400 font-medium truncate">
                          {{ item.column?.name || 'Sem etapa' }}
                        </span>
                      </div>
                    </div>

                    <!-- Arrow -->
                    <Icon name="solar:arrow-right-linear"
                      class="size-4 text-muted-300 group-hover:text-primary-500 transition-colors shrink-0" />
                  </div>
                </BaseCard>
              </div>

              <!-- Empty State -->
              <div v-if="recentDeclarations.length === 0"
                class="py-8 text-center bg-muted-50 dark:bg-muted-900/40 rounded-xl border border-dashed border-muted-200 dark:border-muted-800">
                <div
                  class="size-12 mx-auto mb-3 rounded-xl bg-muted-100 dark:bg-muted-800 flex items-center justify-center">
                  <Icon name="solar:document-add-linear" class="size-6 text-muted-400" />
                </div>
                <BaseHeading as="h4" size="sm" class="text-muted-500">Nenhum IR recente</BaseHeading>
                <BaseParagraph size="xs" class="text-muted-400 mt-1 max-w-[200px] mx-auto">
                  Ainda não há atividades registradas.
                </BaseParagraph>
              </div>
            </div>
          </BaseCard>


        </div>
      </div>
    </div>

    <!-- Whitelabel Footer - Company Branding -->
    <div class="mt-8 pb-4 text-center">
      <div class="flex items-center justify-center gap-2 text-[10px] text-muted-400">
        <img v-if="companyLogo" :src="companyLogo" :alt="companyName"
          class="h-4 object-contain opacity-40 grayscale hover:opacity-60 hover:grayscale-0 transition-all duration-300"
          @error="(e: any) => e.target.style.display = 'none'" />
        <span class="font-medium">{{ companyName }}</span>
        <span class="text-muted-300 dark:text-muted-600">•</span>
        <span>{{ new Date().getFullYear() }}</span>
      </div>
    </div>
  </div>
</template>