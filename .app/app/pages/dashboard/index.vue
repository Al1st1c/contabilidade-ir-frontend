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

const links = [
  {
    title: 'Profile',
    icon: 'solar:user-rounded-bold-duotone',
    url: '#',
  },
  {
    title: 'Settings',
    icon: 'solar:stopwatch-bold-duotone',
    url: '#',
  },
  {
    title: 'Messages',
    icon: 'solar:chat-line-bold-duotone',
    url: '#',
  },
  {
    title: 'Tasks',
    icon: 'solar:add-square-bold-duotone',
    url: '#',
  },
]


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



const filter = ref('')

const filteredMembers = computed(() => {
  if (!filter.value) {
    return recentDeclarations.value
  }
  const filterRe = new RegExp(filter.value, 'i')
  return recentDeclarations.value.filter((item) => {
    return [item.client.name, item.client.cpf].some(item =>
      item.match(filterRe),
    )
  })
})
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
              <div class="bg-primary-800 rounded-2xl px-6 py-8 h-full flex items-center">
                <div class="flex w-full flex-col items-center gap-y-6 sm:flex-row">
                  <!-- User Profile -->
                  <div class="flex flex-1 flex-col gap-y-2 px-4 border-muted-700/50">
                    <BaseAvatar :src="user?.photo" :text="user?.name?.charAt(0) || '?'" size="lg"
                      class="border-primary-200/50 ring-primary-200/50 ring-offset-primary-600 mb-2 border ring-2 ring-offset-4" />
                    <BaseHeading as="h2" size="2xl" weight="semibold" lead="none" class="text-white">
                      <span>Olá, {{ user?.name?.split(' ')[0] || 'Contador' }}! 👋</span>
                    </BaseHeading>
                    <BaseParagraph size="xs" class="text-primary-100 hidden sm:block">
                      Sua campanha de IR {{ new Date().getFullYear() }} está a todo vapor.
                    </BaseParagraph>
                  </div>

                  <!-- New Rookies (Team Members) -->
                  <div class="flex h-full flex-1 flex-col px-4 sm:px-6 border-muted-700/50 sm:border-l">
                    <BaseHeading as="h2" size="lg" weight="semibold" lead="tight" class="mb-1 text-white">
                      <span>Sua Equipe</span>
                    </BaseHeading>
                    <BaseParagraph size="xs" lead="tight" class="mb-3 text-primary-200">
                      Acompanhe a produtividade dos seus colaboradores em tempo real.
                    </BaseParagraph>
                    <div class="mt-auto flex items-center gap-2">
                      <div class="flex -space-x-2">
                        <BaseAvatar v-for="rookie in rookies" :key="rookie.name" size="sm" rounded="full"
                          :src="rookie.avatar" class="border-2 border-primary-800" />
                      </div>
                      <BaseButton size="icon-md" rounded="lg" to="/dashboard/settings/team">
                        <Icon name="lucide:plus" class="size-4" />
                      </BaseButton>
                    </div>
                  </div>

                  <!-- Job Feed (New IR Action) -->
                  <div class="flex h-full flex-1 flex-col px-4 sm:px-6 border-muted-700/50 sm:border-l">
                    <BaseHeading as="h2" size="lg" weight="semibold" lead="tight" class="mb-1 text-white">
                      <span>Novo Imposto de Renda</span>
                    </BaseHeading>
                    <BaseParagraph size="xs" lead="tight" class="mb-3 text-primary-200">
                      Cadastre um novo cliente ou declaração para iniciar o processo.
                    </BaseParagraph>
                    <div class="mt-auto">
                      <BaseButton class="w-full" variant="default" to="/imposto-de-renda">
                        <span>Cadastrar Agora</span>
                      </BaseButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Standing Orders (Timer) (Col 5/4) -->
            <div class="col-span-12 lg:col-span-5 2xl:col-span-4">
              <BaseCard rounded="md" variant="none"
                class="bg-primary-900 border-primary-900 h-full p-4 md:p-6 lg:p-10 relative">

                <!-- Clip illustration without clipping the clock tooltip -->
                <div class="absolute inset-0 overflow-hidden rounded-md pointer-events-none">
                  <!-- Background Illustration (Repositioned to Left) -->
                  <div class="absolute -left-12 -bottom-10 opacity-20 transform -rotate-12 z-0">
                    <VectorIllustrationCalendar class="size-64 text-primary-400" />
                  </div>
                </div>

                <div class="grid grid-cols-12 gap-4 h-full items-center relative z-10">
                  <!-- Text Area -->
                  <div class="col-span-12 sm:col-span-6">
                    <BaseHeading as="h3" size="xl" weight="semibold" class="text-white mb-2">
                      {{ isIrPeriodStarted ? 'Tempo Restante' : 'Campanha IR' }}
                    </BaseHeading>
                    <BaseParagraph size="xs" class="text-primary-100 mb-6 leading-relaxed opacity-90">
                      {{ isIrPeriodStarted
                        ? 'Fique atento aos prazos! Acompanhe o tempo restante para a entrega das declarações de 2026.'
                        : 'Prepare sua equipe! O período oficial de entrega das declarações do IR 2026 inicia em breve.'
                      }}
                    </BaseParagraph>
                    <BaseButton size="sm" variant="default" class="w-fit" to="/imposto-de-renda">
                      {{ isIrPeriodStarted ? 'Gerenciar IRs' : 'Ver Cronograma' }}
                    </BaseButton>
                  </div>

                  <!-- Visual Area (Interactive Clock) -->
                  <div class="col-span-12 sm:col-span-6 flex flex-col items-center justify-center min-h-[160px]">
                    <div class="transition-all duration-300 cursor-pointer" :class="[
                      isClockZoomed
                        ? 'z-[100] relative'
                        : 'scale-[0.8] sm:scale-90 lg:scale-100 z-10 relative'
                    ]" @click="isClockZoomed = !isClockZoomed">
                      <DashboardIRCanvasClock :start-date="irStartDate" :end-date="irEndDate" :size="140" />
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
        <div id="dashboard-alerts" class="mt-3 flex flex-col gap-4">
          <!-- Feed Settings / Tabs -->
          <div class="flex flex-col items-center justify-between gap-6 sm:flex-row mb-2">
            <div>
              <BaseHeading as="h3" size="lg" weight="medium" lead="tight" class="text-muted-900 dark:text-muted-100">
                <span>Alertas de Campanha</span>
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
                Documentos
              </BaseButton>
              <BaseButton rounded="md" size="sm" :variant="activeAlertTab === 'stuckClients' ? 'primary' : 'default'"
                @click="activeAlertTab = 'stuckClients'">
                Travados
              </BaseButton>
            </div>
          </div>

          <!-- Feed Content -->
          <div class="space-y-2 min-h-[200px]">
            <TransitionGroup enter-active-class="transform-gpu duration-300 ease-out"
              enter-from-class="opacity-0 -translate-x-4" enter-to-class="opacity-100 translate-x-0"
              leave-active-class="absolute transform-gpu duration-200 ease-in" leave-from-class="opacity-100"
              leave-to-class="opacity-0 translate-x-4">
              <DemoFlexTableRow v-for="(alert, index) in filteredAlerts" :key="alert.id" rounded="sm"
                class="hover:bg-muted-50 dark:hover:bg-muted-900 transition-colors cursor-pointer"
                @click="openDetails(alert.id)">
                <template #start>
                  <div class="flex items-center gap-3">
                    <div
                      :class="['size-10 rounded-xl flex items-center justify-center shrink-0 ml-2', alert.iconBg, alert.iconColor]">
                      <Icon :name="alert.icon" class="size-5" />
                    </div>
                    <div>
                      <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-800 dark:text-muted-100">
                        {{ alert.client?.name }}
                      </BaseHeading>
                      <BaseParagraph size="xs" class="text-muted-400">
                        {{ alert.column?.name || 'Etapa não definida' }}
                      </BaseParagraph>
                    </div>
                  </div>
                </template>
                <template #end>
                  <DemoFlexTableCell label="Prioridade" :hide-label="index > 0" class="w-full sm:w-24">
                    <BaseTag
                      :color="alert.type === 'error' ? 'danger' : alert.type === 'nearDeadline' ? 'warning' : 'muted'"
                      rounded="full" size="sm">
                      {{ alert.label }}
                    </BaseTag>
                  </DemoFlexTableCell>
                  <DemoFlexTableCell label="Ação" :hide-label="index > 0">
                    <BaseButton variant="link" size="sm" color="primary" class="p-0 h-auto font-medium">
                      Resolver
                    </BaseButton>
                  </DemoFlexTableCell>
                </template>
              </DemoFlexTableRow>

              <!-- Empty State -->
              <div v-if="filteredAlerts.length === 0" key="empty"
                class="py-12 flex flex-col items-center justify-center text-center">
                <div
                  class="size-16 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center text-muted-400 mb-4">
                  <Icon name="solar:check-circle-bold" class="size-8 text-success-500" />
                </div>
                <BaseHeading as="h4" size="md" weight="medium" class="text-muted-800 dark:text-muted-100">
                  Tudo em ordem por aqui!
                </BaseHeading>
                <BaseParagraph size="sm" class="text-muted-500">
                  Não existem alertas pendentes para esta categoria.
                </BaseParagraph>
              </div>
            </TransitionGroup>
          </div>

          <!-- Pipeline Chart -->
          <BaseCard rounded="md" class="p-4 md:p-5">
            <div class="mb-4 flex items-center justify-between">
              <BaseHeading as="h3" size="md" lead="tight" class="text-muted-900 dark:text-white">
                <span>Total de documentos por status</span>
              </BaseHeading>
            </div>

            <LazyAddonApexcharts v-bind="pipelineChart" />
          </BaseCard>
          <!-- Revenue Chart -->
          <BaseCard rounded="md" class="p-4 md:p-5">
            <div class="mb-4 flex items-center justify-between">
              <BaseHeading as="h3" size="md" lead="tight" class="text-muted-800 dark:text-white">
                <span>Honorários Projetados</span>
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
                <span class="text-[10px] uppercase  text-muted-400 mb-1">Receita Esperada</span>
                <span class="text-sm font-semibold text-muted-800 dark:text-muted-100">{{ showRevenue ?
                  formatCurrency(stats.revenue) : 'R$ ••••••' }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] uppercase  text-success-500 mb-1">Recebido</span>
                <span class="text-sm font-semibold text-success-600">{{ showRevenue ? formatCurrency(stats.received) :
                  'R$ ••••••' }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[10px] uppercase  text-danger-500 mb-1">Em Atraso</span>
                <span class="text-sm font-semibold text-danger-600">{{ showRevenue ? formatCurrency(stats.overdue) :
                  'R$ ••••••' }}</span>
              </div>
            </div>

            <div
              class="mt-4 p-3 rounded-lg bg-muted-50 dark:bg-muted-900/40 border border-muted-200 dark:border-muted-800 text-center transition-all duration-300"
              :class="{ 'blur-sm select-none pointer-events-none opacity-50': !showRevenue }">
              <span class="text-xs text-muted-500">
                Faltam <span class=" text-primary-500">{{ showRevenue ? formatCurrency(stats.revenue -
                  stats.received) : 'R$ ••••••' }}</span> para receber
              </span>
            </div>
          </BaseCard>
        </div>
      </div>
      <!-- Grid column -->
      <div class="lg:landscape:col-span-4 mt-3 col-span-12 xl:landscape:col-span-4">
        <!-- Inner grid -->
        <div class="grid gap-4 lg:flex lg:flex-col">
          <!-- Widget -->
          <!-- Project list widget -->
          <BaseCard rounded="md" class="p-4 md:p-6">
            <div class="mb-6 flex items-center justify-between">
              <BaseHeading as="h3" size="md" lead="tight" class="text-muted-900 dark:text-white">
                <span>Acesso Rápido</span>
              </BaseHeading>
            </div>
            <div class="pb-2">
              <div class="grid grid-cols-2 gap-4">
                <NuxtLink v-for="link in acessorapido" :key="link.name" :to="link.url"
                  class="dark:bg-muted-950 border-muted-200 hover:border-primary-500 dark:hover:border-primary-500 dark:border-muted-800 hover:shadow-muted-300/30 dark:hover:shadow-muted-900/30 group flex flex-col border bg-white py-5 transition-all duration-300 hover:shadow-xl"
                  :class="[
                    'rounded',
                  ]">
                  <div class="text-center">
                    <div class="mb-2">
                      <BaseIconBox variant="none"
                        class="bg-primary-500/20 text-primary-500 group-hover:bg-primary-500 transition-colors duration-300 group-hover:text-white"
                        rounded="none" mask="blob">
                        <Icon :name="link.icon" />
                      </BaseIconBox>
                    </div>
                    <p class="text-muted-600 dark:text-muted-200 font-sans text-sm font-medium">
                      {{ link.name }}
                    </p>
                  </div>
                </NuxtLink>
              </div>

            </div>
          </BaseCard>

          <!-- Widget: Últimos IRs -->
          <BaseCard rounded="md" class="p-4 md:p-6">
            <!-- Header -->
            <div class="mb-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <!-- <div class="size-9 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                  <Icon name="solar:document-text-bold-duotone" class="size-5" />
                </div> -->
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

            <div class="mb-2 space-y-1">
              <BaseField class="mb-4">
                <TairoInput v-model="filter" placeholder="Pesquisar..." :rounded="'md'" icon="lucide:search" />
              </BaseField>
              <div v-if="filteredMembers.length === 0">
                <div class="flex flex-col items-center py-10 text-center">
                  <Icon name="solar:user-rounded-linear" class="text-primary-500 size-10" />
                  <BaseHeading as="h4" size="md" weight="medium" lead="tight">
                    <span>Nenhum resultado encontrado</span>
                  </BaseHeading>
                  <BaseParagraph size="xs" class="text-muted-600 dark:text-muted-400 mx-auto max-w-[240px]">
                    <span>
                      Parece que não conseguimos encontrar nenhum resultado correspondente. Tente termos de
                      pesquisa diferentes.
                    </span>
                  </BaseParagraph>
                </div>
              </div>
              <div v-else>
                <div v-for="member in filteredMembers" :key="member.id"
                  class="hover:bg-muted-100 focus-within:bg-muted-100 dark:hover:bg-muted-700/70 dark:focus-within:bg-muted-700/70 group flex items-center gap-3 p-2"
                  :class="[
                    'rounded-md',
                  ]">
                  <BaseAvatar :src="member.client?.image" :text="member.client?.name?.charAt(0) || '?'" size="xs"
                    class="bg-primary-100 dark:bg-primary-500/20 text-primary-500 ms-1 shrink-0" />
                  <div>
                    <BaseHeading as="h4" size="xs" weight="medium" lead="tight" class="text-muted-900 dark:text-white">
                      <span>
                        {{ member.client?.name || '?' }}.
                      </span>
                    </BaseHeading>
                    <BaseParagraph size="xs">
                      <span class="text-muted-600 dark:text-muted-400">
                        {{ member.column?.name || 'Sem etapa' }} - IR {{ member.taxYear }}
                      </span>
                    </BaseParagraph>
                  </div>
                  <div
                    class="ms-auto flex -translate-x-1 items-center opacity-0 transition-all duration-300 group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:translate-x-0 group-hover:opacity-100">
                    <BaseButton @click="openDetails(member.id)" :rounded="'sm'" variant="default" size="icon-md"
                      class="scale-75">
                      <Icon name="lucide:arrow-right" class="size-4" />
                    </BaseButton>
                  </div>
                </div>
              </div>
            </div>

          </BaseCard>

          <!-- Widget: Produtividade da Equipe -->
          <BaseCard v-if="canViewAll" rounded="md" class="p-4 md:p-6">
            <!-- Header -->
            <div class="mb-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <!-- <div class="size-9 rounded-xl bg-success-500/10 flex items-center justify-center text-success-500">
                  <Icon name="solar:chart-2-bold-duotone" class="size-5" />
                </div> -->
                <BaseHeading as="h3" size="md" lead="tight" class="text-muted-900 dark:text-white">
                  Produtividade
                </BaseHeading>
              </div>
              <NuxtLink to="/dashboard/settings/team"
                class="text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors flex items-center gap-1">
                Ver equipe
                <Icon name="solar:arrow-right-linear" class="size-3" />
              </NuxtLink>
            </div>

            <!-- Chart (if data exists) -->
            <div v-if="teamProductivity.length > 0" class="mb-4">
              <LazyAddonApexcharts v-bind="productivityChart" />
            </div>
            <div class="space-y-2">
              <div v-for="user in teamProductivity" :key="user.id" class="flex items-center gap-2 mb-2">
                <BaseAvatar :src="user.photo || '/img/avatars/11.svg'" size="sm" :rounded="'md'" />
                <div>
                  <BaseHeading as="h3" size="sm" weight="medium" lead="tight"
                    class="text-muted-900 dark:text-muted-100">
                    <span>{{ user.name }}</span>
                  </BaseHeading>
                </div>
                <div>
                  <BaseProgress size="xs" variant="primary"
                    :model-value="user.count > 0 ? (user.completed / user.count) * 100 : 0" class="transition-all" />
                </div>
                <div class="ms-auto flex items-center justify-end gap-4">
                  <BaseParagraph size="sm" weight="semibold"
                    :class="user.count > 0 && user.completed === user.count ? 'text-success-500' : 'text-primary-500'">
                    <span>{{ user.count > 0 ? Math.round((user.completed / user.count) * 100) : 0 }}% </span>
                  </BaseParagraph>
                  <div class="text-sm font-bold text-muted-900 dark:text-white tabular-nums">
                    {{ user.completed }}<span class="text-muted-400 font-normal">/{{ user.count }}</span>
                  </div>
                </div>
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