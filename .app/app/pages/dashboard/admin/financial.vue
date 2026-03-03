<script setup lang="ts">
import { PanelsPanelAdminUserAnalytics } from '#components'

definePageMeta({ title: 'Financeiro — Admin' })

const { open } = usePanels()
const { useCustomFetch } = useApi()

const data = ref<any>(null)
const isLoading = ref(true)
const activeTab = ref<'overview' | 'overdue' | 'churn' | 'transactions'>('overview')

async function fetchData() {
  try {
    isLoading.value = true
    const { data: res } = await useCustomFetch<any>('/admin/financial')
    data.value = res
  }
  catch (e) {
    console.error('Erro ao buscar dados financeiros:', e)
  }
  finally {
    isLoading.value = false
  }
}

onMounted(fetchData)

function openUser(userId: string) {
  open(PanelsPanelAdminUserAnalytics, { userId })
}

function fmt(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function fmtCompact(val: number) {
  if (val >= 1000) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(val)
  }
  return fmt(val)
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function fmtDateTime(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusColor(status: string) {
  switch (status) {
    case 'PAID':
    case 'COMPLETED':
      return 'success'
    case 'PENDING':
      return 'warning'
    case 'FAILED':
    case 'CANCELLED':
      return 'danger'
    default:
      return 'muted'
  }
}

function paymentTypeLabel(type: string) {
  switch (type) {
    case 'SUBSCRIPTION':
      return 'Assinatura'
    case 'CREDIT_PURCHASE':
      return 'Compra IR'
    default:
      return type
  }
}

// ─── Charts ───

const timelineChart = computed(() => {
  if (!data.value?.timeline) return null
  return defineApexchartsProps({
    type: 'area',
    height: 350,
    series: [
      { name: 'Assinaturas', data: data.value.timeline.subscriptions },
      { name: 'Pré-pago (IRs)', data: data.value.timeline.prepaid },
      { name: 'Comissões', data: data.value.timeline.commissions },
      { name: 'Líquido', data: data.value.timeline.net },
    ],
    options: {
      chart: { toolbar: { show: false }, stacked: false },
      colors: ['#6366f1', '#06b6d4', '#f97316', '#10b981'],
      xaxis: { categories: data.value.timeline.labels },
      stroke: { curve: 'smooth', width: [2, 2, 2, 3] },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: [0.4, 0.3, 0.2, 0.5], opacityTo: [0.05, 0.05, 0.05, 0.1] },
      },
      yaxis: {
        labels: {
          formatter: (v: number) => fmtCompact(v),
        },
      },
      tooltip: { y: { formatter: (v: number) => fmt(v) } },
    },
  })
})

const planBarChart = computed(() => {
  if (!data.value?.revenueByPlan?.length) return null
  return defineApexchartsProps({
    type: 'bar',
    height: 280,
    series: [{ name: 'Receita', data: data.value.revenueByPlan.map((p: any) => p.revenue) }],
    options: {
      chart: { toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 8, horizontal: true, barHeight: '60%' } },
      colors: ['#6366f1'],
      xaxis: { categories: data.value.revenueByPlan.map((p: any) => p.name), labels: { formatter: (v: number) => fmtCompact(v) } },
      tooltip: { y: { formatter: (v: number) => fmt(v) } },
      dataLabels: { enabled: false },
    },
  })
})

const methodDonut = computed(() => {
  if (!data.value?.revenueByMethod?.length) return null
  return defineApexchartsProps({
    type: 'donut',
    height: 280,
    series: data.value.revenueByMethod.map((m: any) => m.revenue),
    options: {
      labels: data.value.revenueByMethod.map((m: any) => m.method),
      legend: { position: 'bottom' },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                formatter: () => fmt(data.value.revenueByMethod.reduce((s: number, m: any) => s + m.revenue, 0)),
              },
            },
          },
        },
      },
    },
  })
})
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <AppPageLoading v-if="isLoading" min-height="60vh" message="Carregando dados financeiros..." />

    <div v-else-if="data" class="space-y-8 animate-fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <NuxtLink to="/dashboard/admin"
            class="text-primary-500 hover:opacity-75 transition-opacity flex items-center gap-1 mb-2 text-sm font-medium">
            <Icon name="solar:alt-arrow-left-linear" class="size-4" />
            Admin
          </NuxtLink>
          <BaseHeading as="h1" size="2xl" weight="bold" class="text-muted-800 dark:text-white">
            Financeiro
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500">
            Visão completa de receita, assinaturas e pagamentos
          </BaseParagraph>
        </div>
        <BaseButton rounded="md" :loading="isLoading" @click="fetchData">
          <Icon name="lucide:refresh-cw" class="size-4 mr-1" />
          Atualizar
        </BaseButton>
      </div>

      <!-- ── KPI Cards ── -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <!-- MRR -->
        <BaseCard class="p-4 sm:p-5">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Icon name="solar:graph-up-bold-duotone" class="size-5 text-indigo-500" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest text-muted-400">MRR</p>
              <p class="text-lg font-bold text-muted-800 dark:text-white truncate">{{ fmtCompact(data.kpis.mrr) }}</p>
            </div>
          </div>
        </BaseCard>

        <!-- ARR -->
        <BaseCard class="p-4 sm:p-5">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <Icon name="solar:chart-2-bold-duotone" class="size-5 text-purple-500" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest text-muted-400">ARR</p>
              <p class="text-lg font-bold text-muted-800 dark:text-white truncate">{{ fmtCompact(data.kpis.arr) }}</p>
            </div>
          </div>
        </BaseCard>

        <!-- Revenue This Month -->
        <BaseCard class="p-4 sm:p-5">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
              <Icon name="solar:wallet-money-bold-duotone" class="size-5 text-primary-500" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest text-muted-400">Este Mês</p>
              <p class="text-lg font-bold text-muted-800 dark:text-white truncate">
                {{ fmtCompact(data.kpis.revenueThisMonth) }}</p>
              <div v-if="data.kpis.momGrowth !== 0" class="flex items-center gap-1 mt-0.5">
                <Icon :name="data.kpis.momGrowth > 0 ? 'lucide:trending-up' : 'lucide:trending-down'" class="size-3"
                  :class="data.kpis.momGrowth > 0 ? 'text-success-500' : 'text-danger-500'" />
                <span class="text-[10px] font-bold"
                  :class="data.kpis.momGrowth > 0 ? 'text-success-500' : 'text-danger-500'">
                  {{ data.kpis.momGrowth > 0 ? '+' : '' }}{{ data.kpis.momGrowth }}%
                </span>
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- Prepaid This Month -->
        <BaseCard class="p-4 sm:p-5">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
              <Icon name="solar:tag-price-bold-duotone" class="size-5 text-cyan-500" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest text-muted-400">Pré-pago</p>
              <p class="text-lg font-bold text-muted-800 dark:text-white truncate">
                {{ fmtCompact(data.kpis.prepaidThisMonth) }}</p>
            </div>
          </div>
        </BaseCard>

        <!-- Commissions This Month -->
        <BaseCard class="p-4 sm:p-5">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Icon name="solar:hand-money-bold-duotone" class="size-5 text-orange-500" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest text-muted-400">Comissões</p>
              <p class="text-lg font-bold text-muted-800 dark:text-white truncate">
                {{ fmtCompact(data.kpis.commissionsThisMonth) }}</p>
            </div>
          </div>
        </BaseCard>

        <!-- Net Revenue -->
        <BaseCard class="p-4 sm:p-5 border-success-500/20 bg-success-500/5">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-success-500/10 flex items-center justify-center shrink-0">
              <Icon name="solar:dollar-minimalistic-bold-duotone" class="size-5 text-success-500" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest text-success-500">Líquido</p>
              <p class="text-lg font-bold text-success-600 dark:text-success-400 truncate">
                {{ fmtCompact(data.kpis.netThisMonth) }}</p>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- ── All-Time Summary Bar ── -->
      <BaseCard class="p-4 sm:p-5 flex flex-wrap items-center gap-6 sm:gap-10">
        <div class="flex items-center gap-2">
          <Icon name="solar:safe-2-bold-duotone" class="size-5 text-muted-400" />
          <div>
            <p class="text-[10px] text-muted-400 uppercase font-bold">Total Geral</p>
            <p class="text-sm font-bold text-muted-700 dark:text-muted-200">{{ fmt(data.kpis.totalRevenue) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Icon name="solar:hand-money-bold-duotone" class="size-5 text-orange-400" />
          <div>
            <p class="text-[10px] text-muted-400 uppercase font-bold">Comissões Totais</p>
            <p class="text-sm font-bold text-orange-500">{{ fmt(data.kpis.totalCommissions) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Icon name="solar:dollar-minimalistic-bold-duotone" class="size-5 text-success-500" />
          <div>
            <p class="text-[10px] text-muted-400 uppercase font-bold">Líquido Total</p>
            <p class="text-sm font-bold text-success-600">{{ fmt(data.kpis.totalNet) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Icon name="solar:users-group-rounded-bold-duotone" class="size-5 text-primary-400" />
          <div>
            <p class="text-[10px] text-muted-400 uppercase font-bold">Assinaturas Ativas</p>
            <p class="text-sm font-bold text-primary-500">{{ data.kpis.activeSubscriptions }}</p>
          </div>
        </div>
      </BaseCard>

      <!-- ── Tabs ── -->
      <div class="flex items-center gap-2 border-b border-muted-200 dark:border-muted-800 overflow-x-auto">
        <button v-for="tab in [
          { id: 'overview', label: 'Visão Geral', icon: 'solar:chart-square-bold-duotone' },
          { id: 'overdue', label: `Em Atraso (${data.overduePayments?.length || 0})`, icon: 'solar:alarm-bold-duotone' },
          { id: 'churn', label: `Cancelamentos (${data.churn?.length || 0})`, icon: 'solar:forbidden-circle-bold-duotone' },
          { id: 'transactions', label: 'Transações', icon: 'solar:list-check-bold-duotone' },
        ]" :key="tab.id"
          class="flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap"
          :class="activeTab === tab.id
            ? 'border-primary-500 text-primary-500'
            : 'border-transparent text-muted-400 hover:text-muted-600'" @click="activeTab = tab.id as any">
          <Icon :name="tab.icon" class="size-4" />
          {{ tab.label }}
        </button>
      </div>

      <!-- ═══ Tab: Overview ═══ -->
      <div v-if="activeTab === 'overview'" class="space-y-6">
        <!-- Revenue Timeline -->
        <BaseCard class="p-6">
          <div class="flex items-center justify-between mb-6">
            <BaseHeading as="h4" size="md">Evolução de Receita</BaseHeading>
            <div class="flex items-center gap-3 text-[10px] uppercase font-bold tracking-wider">
              <div class="flex items-center gap-1 text-indigo-500">
                <div class="size-2 rounded-full bg-current" />
                <span>Assinaturas</span>
              </div>
              <div class="flex items-center gap-1 text-cyan-500">
                <div class="size-2 rounded-full bg-current" />
                <span>Pré-pago</span>
              </div>
              <div class="flex items-center gap-1 text-orange-500">
                <div class="size-2 rounded-full bg-current" />
                <span>Comissões</span>
              </div>
              <div class="flex items-center gap-1 text-success-500">
                <div class="size-2 rounded-full bg-current" />
                <span>Líquido</span>
              </div>
            </div>
          </div>
          <LazyAddonApexcharts v-if="timelineChart" v-bind="timelineChart" />
        </BaseCard>

        <!-- Revenue by Plan & Method -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- By Plan -->
          <BaseCard class="p-6">
            <BaseHeading as="h4" size="md" class="mb-6">Receita por Plano</BaseHeading>
            <LazyAddonApexcharts v-if="planBarChart" v-bind="planBarChart" />

            <!-- Plan Details Table -->
            <div class="mt-6 space-y-3 border-t border-muted-200 dark:border-muted-800 pt-4">
              <div v-for="plan in data.revenueByPlan" :key="plan.name"
                class="flex items-center justify-between p-2 rounded-lg hover:bg-muted-50 dark:hover:bg-muted-900/40 transition-colors">
                <div>
                  <p class="text-sm font-bold text-muted-700 dark:text-muted-200">{{ plan.name }}</p>
                  <p class="text-[10px] text-muted-400">{{ plan.activeSubscribers }} ativos • {{ plan.payments }}
                    pgtos</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold text-muted-800 dark:text-muted-100">{{ fmt(plan.revenue) }}</p>
                  <p class="text-[10px] text-muted-400">Ticket médio: {{ fmt(plan.avgTicket) }}</p>
                </div>
              </div>
              <div v-if="!data.revenueByPlan?.length" class="text-center py-4 text-xs text-muted-400 italic">
                Nenhum dado de plano disponível.
              </div>
            </div>
          </BaseCard>

          <!-- By Method -->
          <BaseCard class="p-6">
            <BaseHeading as="h4" size="md" class="mb-6">Receita por Forma de Pagamento</BaseHeading>
            <LazyAddonApexcharts v-if="methodDonut" v-bind="methodDonut" />

            <div class="mt-6 space-y-3 border-t border-muted-200 dark:border-muted-800 pt-4">
              <div v-for="m in data.revenueByMethod" :key="m.method"
                class="flex items-center justify-between p-2 rounded-lg">
                <div class="flex items-center gap-2">
                  <Icon
                    :name="m.method.includes('PIX') ? 'simple-icons:pix' : m.method.includes('Cartão') ? 'solar:card-bold-duotone' : 'solar:bill-list-bold-duotone'"
                    class="size-4 text-muted-400" />
                  <p class="text-sm font-medium text-muted-700 dark:text-muted-200">{{ m.method }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold text-muted-800 dark:text-muted-100">{{ fmt(m.revenue) }}</p>
                  <p class="text-[10px] text-muted-400">{{ m.count }} pagamentos</p>
                </div>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- ═══ Tab: Overdue ═══ -->
      <div v-if="activeTab === 'overdue'" class="space-y-4">
        <BaseCard v-if="!data.overduePayments?.length"
          class="p-10 text-center flex flex-col items-center justify-center">
          <div class="size-16 bg-success-500/10 rounded-full flex items-center justify-center mb-4">
            <Icon name="solar:check-circle-bold-duotone" class="size-8 text-success-500" />
          </div>
          <BaseHeading as="h3" size="md" class="text-success-600">Sem atrasos!</BaseHeading>
          <BaseParagraph size="xs" class="text-muted-500 mt-1">Todos os pagamentos estão em dia.</BaseParagraph>
        </BaseCard>

        <BaseCard v-for="item in data.overduePayments" :key="item.id"
          class="p-4 flex items-center justify-between hover:bg-muted-50/50 dark:hover:bg-muted-900/30 cursor-pointer transition-colors"
          @click="openUser(item.user.id)">
          <div class="flex items-center gap-3 min-w-0">
            <BaseAvatar :src="item.user.photo" :text="item.user.name?.charAt(0)" size="sm" rounded="full" />
            <div class="min-w-0">
              <p class="text-sm font-bold text-muted-800 dark:text-muted-100 truncate">{{ item.user.name }}</p>
              <p class="text-[10px] text-muted-400 truncate">{{ item.user.email }}</p>
            </div>
          </div>
          <div class="flex items-center gap-4 shrink-0">
            <div class="text-right">
              <BaseTag :color="item.daysOverdue > 7 ? 'danger' : 'warning'" variant="muted" rounded="full" size="sm"
                class="font-bold">
                {{ item.daysOverdue }}d atraso
              </BaseTag>
              <p class="text-[10px] text-muted-400 mt-1">{{ item.plan }} • {{ item.billingPeriod }}</p>
            </div>
            <Icon name="lucide:chevron-right" class="size-4 text-muted-300" />
          </div>
        </BaseCard>
      </div>

      <!-- ═══ Tab: Churn ═══ -->
      <div v-if="activeTab === 'churn'" class="space-y-4">
        <BaseCard v-if="!data.churn?.length" class="p-10 text-center flex flex-col items-center justify-center">
          <div class="size-16 bg-success-500/10 rounded-full flex items-center justify-center mb-4">
            <Icon name="solar:heart-pulse-bold-duotone" class="size-8 text-success-500" />
          </div>
          <BaseHeading as="h3" size="md" class="text-success-600">Sem cancelamentos!</BaseHeading>
          <BaseParagraph size="xs" class="text-muted-500 mt-1">Nenhum cancelamento nos últimos 30 dias.
          </BaseParagraph>
        </BaseCard>

        <BaseCard v-for="item in data.churn" :key="item.id"
          class="p-4 flex items-center justify-between hover:bg-muted-50/50 dark:hover:bg-muted-900/30 cursor-pointer transition-colors"
          @click="openUser(item.user.id)">
          <div class="flex items-center gap-3 min-w-0">
            <BaseAvatar :src="item.user.photo" :text="item.user.name?.charAt(0)" size="sm" rounded="full" />
            <div class="min-w-0">
              <p class="text-sm font-bold text-muted-800 dark:text-muted-100 truncate">{{ item.user.name }}</p>
              <p class="text-[10px] text-muted-400 truncate">{{ item.user.email }}</p>
            </div>
          </div>
          <div class="flex items-center gap-4 shrink-0">
            <div class="text-right">
              <BaseTag :color="item.status === 'CANCELLED' ? 'danger' : 'warning'" variant="muted" rounded="full"
                size="sm" class="font-bold uppercase">
                {{ item.cancelAtPeriodEnd ? 'Cancelará' : 'Cancelado' }}
              </BaseTag>
              <p class="text-[10px] text-muted-400 mt-1">
                {{ item.plan }} ·
                {{ item.canceledAt ? fmtDate(item.canceledAt) : `Até ${fmtDate(item.currentPeriodEnd)}` }}
              </p>
              <p v-if="item.cancellationReason"
                class="text-[10px] text-danger-400 italic mt-0.5 truncate max-w-[200px]">
                "{{ item.cancellationReason }}"
              </p>
            </div>
            <Icon name="lucide:chevron-right" class="size-4 text-muted-300" />
          </div>
        </BaseCard>
      </div>

      <!-- ═══ Tab: Transactions ═══ -->
      <div v-if="activeTab === 'transactions'">
        <BaseCard class="overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="bg-muted-50/50 dark:bg-muted-900/50 text-muted-400 uppercase text-[10px] tracking-wider">
                  <th class="px-4 py-3 font-bold">Usuário</th>
                  <th class="px-4 py-3 font-bold">Tipo</th>
                  <th class="px-4 py-3 font-bold">Valor</th>
                  <th class="px-4 py-3 font-bold">Status</th>
                  <th class="px-4 py-3 font-bold">Método</th>
                  <th class="px-4 py-3 font-bold">Plano/Detalhe</th>
                  <th class="px-4 py-3 font-bold">Data</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-muted-100 dark:divide-muted-800">
                <tr v-for="p in data.recentPayments" :key="p.id"
                  class="hover:bg-muted-50/50 dark:hover:bg-muted-900/20 cursor-pointer transition-colors"
                  @click="openUser(p.user.id)">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <BaseAvatar :src="p.user.photo" :text="p.user.name?.charAt(0)" size="xxs" rounded="full" />
                      <span class="font-medium text-muted-700 dark:text-muted-200 truncate max-w-[120px]">{{
                        p.user.name }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <BaseTag :color="p.paymentType === 'SUBSCRIPTION' ? 'primary' : 'info'" variant="muted"
                      rounded="full" size="sm" class="font-bold !text-[9px]">
                      {{ paymentTypeLabel(p.paymentType) }}
                    </BaseTag>
                  </td>
                  <td class="px-4 py-3 font-bold text-muted-800 dark:text-muted-100">{{ fmt(p.amount) }}</td>
                  <td class="px-4 py-3">
                    <BaseTag :color="statusColor(p.status)" rounded="full" size="sm" variant="muted"
                      class="font-bold !text-[9px] uppercase">
                      {{ p.status }}
                    </BaseTag>
                  </td>
                  <td class="px-4 py-3 text-muted-500">{{ p.paymentMethod || '—' }}</td>
                  <td class="px-4 py-3 text-muted-500">
                    <span v-if="p.plan">{{ p.plan }}</span>
                    <span v-else-if="p.creditPurchase">{{ p.creditPurchase.creditsAmount }} IRs</span>
                    <span v-else>—</span>
                  </td>
                  <td class="px-4 py-3 text-muted-400 whitespace-nowrap">{{ fmtDateTime(p.paidAt || p.createdAt) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="!data.recentPayments?.length" class="text-center py-10 text-xs text-muted-400 italic">
            Nenhuma transação encontrada.
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
