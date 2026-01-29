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

// State
const isLoading = ref(true)
const stats = ref({
  total: 0,
  completed: 0,
  pending: 0,
  docsWaiting: 0,
  revenue: 0,
  received: 0,
})

const pipelineData = ref<any[]>([])
const teamProductivity = ref<any[]>([])
const recentDeclarations = ref<any[]>([])

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
    const { data } = await useCustomFetch<any>(`/declarations/kanban?taxYear=${year}`)

    if (data.success) {
      const columns = data.data || []
      const allCards = columns.flatMap((c: any) => c.cards || [])

      // Calculate Stats
      stats.value.total = allCards.length
      stats.value.revenue = allCards.reduce((acc: number, c: any) => acc + (Number(c.serviceValue) || 0), 0)
      stats.value.received = allCards.reduce((acc: number, c: any) =>
        c.paymentStatus === 'paid' ? acc + (Number(c.serviceValue) || 0) : acc, 0)

      // Find "Completed" column (usually last or by name)
      const completedCol = columns.find((c: any) =>
        c.name.toLowerCase().includes('conclu') || c.name.toLowerCase().includes('transmit')
      )
      stats.value.completed = completedCol?.cards?.length || 0

      // Declarations waiting for docs (assuming we can identify this, maybe by column)
      const waitingDocsCol = columns.find((c: any) => c.name.toLowerCase().includes('doc'))
      stats.value.docsWaiting = waitingDocsCol?.cards?.length || 0
      stats.value.pending = stats.value.total - stats.value.completed

      // Pipeline Data
      pipelineData.value = columns.map((c: any) => ({
        name: c.name,
        count: c.cards?.length || 0,
        color: c.color || 'primary'
      }))

      // Team Productivity
      const productivityMap = new Map()
      allCards.forEach((c: any) => {
        if (c.assignedTo) {
          const name = c.assignedTo.name
          const current = productivityMap.get(name) || { count: 0, completed: 0, photo: c.assignedTo.photo }
          current.count++
          if (c.columnId === completedCol?.id) current.completed++
          productivityMap.set(name, current)
        }
      })
      teamProductivity.value = Array.from(productivityMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)

      // Recent Items
      recentDeclarations.value = allCards
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)

      // Trend Calculation
      const monthsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      const currentMonth = new Date().getMonth()
      const revData = new Array(currentMonth + 1).fill(0)
      const recData = new Array(currentMonth + 1).fill(0)

      allCards.forEach((c: any) => {
        const date = new Date(c.createdAt || c.updatedAt)
        if (date.getFullYear() === year) {
          const m = date.getMonth()
          if (m <= currentMonth) {
            const val = Number(c.serviceValue) || 0
            revData[m] += val
            if (c.paymentStatus === 'paid') recData[m] += val
          }
        }
      })

      revenueTrend.value = [
        { name: 'Honorários Totais', data: revData },
        { name: 'Recebido', data: recData }
      ]
      trendLabels.value = monthsShort.slice(0, currentMonth + 1)
    }
  } catch (e) {
    console.error('Dash error:', e)
  } finally {
    isLoading.value = false
  }
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
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <!-- Grid -->
    <div class="grid grid-cols-12 gap-4">
      <!-- Grid column -->
      <div class="col-span-12">
        <!-- Header -->
        <BaseCard rounded="md" class="p-4 md:p-6">
          <div class="flex flex-col items-center md:flex-row">
            <div
              class="lg:landscape:flex-row lg:landscape:items-center flex flex-col items-center gap-4 text-center md:items-start md:text-start xl:landscape::flex-row xl:landscape::items-center">
              <BaseAvatar src="/img/avatars/10.svg" size="xl"
                badge-src="/img/icons/flags/united-states-of-america.svg" />
              <div class="text-center md:text-start">
                <BaseHeading as="h2" size="xl" weight="medium" lead="tight" class="text-muted-900 dark:text-white">
                  <span>Olá, {{ user?.name?.split(' ')[0] || 'Contador' }}! 👋</span>
                </BaseHeading>
                <BaseParagraph>
                  <span class="text-muted-600 dark:text-muted-400">Campanha de IR {{ new Date().getFullYear() }} • <span
                      class="capitalize">{{ new Intl.DateTimeFormat('pt-BR',
                        { dateStyle: 'long' }).format(new Date()) }}</span></span>
                </BaseParagraph>
              </div>
            </div>

            <div
              class="w-full md:w-auto lg:landscape:flex-row lg:landscape:items-center md:ms-auto flex flex-col gap-6 text-center md:text-start xl:landscape:flex-row xl:landscape:items-center">
              <div class="flex-1">
                <BaseHeading as="h3" size="3xl" weight="semibold" lead="tight" class="text-muted-900 dark:text-white">
                  <span>
                    {{ stats.total }}
                    <small class="text-base font-medium">IRs</small>
                  </span>
                </BaseHeading>
                <BaseParagraph>
                  <span class="text-muted-600 dark:text-muted-400 text-sm">
                    Total de Declarações
                  </span>
                </BaseParagraph>
              </div>
              <DashboardIRCanvasClock start-date="2026-01-01T08:00:00" end-date="2026-02-08T23:59:59" :size="160"
                :show-details="false" />
            </div>
          </div>
        </BaseCard>
      </div>
      <!-- Grid column -->
      <div class="lg:landscape:col-span-8 col-span-12 xl:landscape:col-span-8">
        <!-- Inner grid -->
        <div class="flex flex-col gap-4">
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
                <span>Progresso de recebimento vs honorários
                  projetados</span>
              </BaseHeading>
            </div>
            <LazyAddonApexcharts v-bind="revenueAreaChart" />

            <div class="w-full mt-6 space-y-4 pt-6 border-t border-muted-100 dark:border-muted-800">
              <div class="flex justify-between items-center text-sm">
                <span class="text-muted-500">Total Recebido</span>
                <span class="font-bold text-success-600">{{ formatCurrency(stats.received) }}</span>
              </div>
              <div class="flex justify-between items-center text-sm text-muted-500 italic">
                <span>Restante a Receber</span>
                <span>{{ formatCurrency(stats.revenue - stats.received) }}</span>
              </div>
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

            <div class="mb-2 space-y-5">
              <div v-for="item in recentDeclarations" :key="item.id" class="flex items-center gap-3">
                <BaseAvatar :src="item.client?.photo" :text="item.client?.name?.charAt(0)" size="xs"
                  class="bg-primary-100 dark:bg-primary-500/20 text-primary-500 shrink-0" />
                <div>
                  <BaseHeading as="h4" size="sm" weight="medium" lead="tight" class="text-muted-900 dark:text-white">
                    <span>{{ item.client?.name || 'Sem nome' }}</span>
                  </BaseHeading>
                  <div class="flex items-center gap-2 mt-1">
                    <BaseTag rounded="full" variant="none" :class="{
                      'bg-danger-500/10 text-danger-600 dark:text-danger-400': item.priority?.toLowerCase() === 'high',
                      'bg-warning-500/10 text-warning-600 dark:text-warning-400': item.priority?.toLowerCase() === 'medium',
                      'bg-success-500/10 text-success-600 dark:text-success-400': item.priority?.toLowerCase() === 'low',
                      'bg-muted-100 dark:bg-muted-800 text-muted-600 dark:text-muted-400': !['high', 'medium', 'low'].includes(item.priority?.toLowerCase())
                    }" class="px-2 py-0.5 text-[10px] font-bold uppercase">
                      {{ item.priority == 'high' ? 'Alta' : item.priority == 'medium' ? 'Media' : item.priority == 'low'
                        ? 'Baixa' : 'N/A' }}
                    </BaseTag>
                    <span class="text-muted-400">•</span>
                    <BaseParagraph size="xs" class="text-muted-600 dark:text-muted-400 font-medium">
                      {{ formatCurrency(item.serviceValue || 0) }}
                    </BaseParagraph>
                  </div>
                </div>
                <div class="ms-auto flex items-center">
                  <BaseButton rounded="lg" variant="muted" size="icon-md" class="scale-75">
                    <Icon name="solar:eye-linear" class="size-6" />
                  </BaseButton>
                </div>
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
                  <BaseParagraph size="xs" weight="bold" class="text-primary-500">{{ member.completed }}/{{ member.count
                  }}
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
