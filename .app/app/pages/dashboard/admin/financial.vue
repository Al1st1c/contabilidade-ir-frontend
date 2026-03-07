<script setup lang="ts">
const { useCustomFetch } = useApi()
const { data, refresh, pending } = await useAsyncData('admin-financial', async () => {
  const { data } = await useCustomFetch<any>('/admin/financial')
  return data
})

const fmt = (v: number) => {
  if (v === undefined || v === null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const fmtDate = (d: string | Date) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

const fmtDateTime = (d: string | Date) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}



const statusColor = (status: string) => {
  const s = String(status || '').toUpperCase()
  switch (s) {
    case 'PAID':
    case 'COMPLETED': return 'success'
    case 'PENDING': return 'warning'
    case 'FAILED': return 'danger'
    case 'REFUNDED': return 'info'
    default: return 'muted'
  }
}

const paymentTypeLabel = (type: string) => {
  switch (type) {
    case 'SUBSCRIPTION': return 'Assinatura'
    case 'CREDIT_PURCHASE': return 'Pré-pago'
    default: return type
  }
}

// KPI Modal State
const isKpiModalOpen = ref(false)
const kpiModalTitle = ref('')
const kpiItems = ref<any[]>([])
const pendingKpi = ref(false)

const openKpiDetails = async (kpiCode: string, title: string) => {
  kpiModalTitle.value = title
  kpiItems.value = []
  isKpiModalOpen.value = true
  pendingKpi.value = true

  try {
    const { data: res } = await useCustomFetch<any[]>(`/admin/financial/kpi-details?kpi=${kpiCode}`)
    if (res) kpiItems.value = res as any[]
  } catch (err) {
    console.error(err)
  } finally {
    pendingKpi.value = false
  }
}

const activeTab = ref('dashboard')

const latestFivePayments = computed(() => {
  if (!data.value?.recentPayments) return []
  return data.value.recentPayments.slice(0, 5)
})
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <BaseHeading as="h2" size="2xl">Financeiro</BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500">Métricas completas de faturamento e comissões</BaseParagraph>
      </div>
      <div>
        <BaseButton color="default" variant="default" size="sm" @click="refresh" :loading="pending">
          <Icon name="lucide:refresh-cw" class="size-4 mr-2" />
          Atualizar Dados
        </BaseButton>
      </div>
    </div>

    <!-- Abas -->
    <div class="mb-6 border-b border-muted-200 dark:border-muted-800">
      <div class="flex gap-6">
        <button @click="activeTab = 'dashboard'" class="pb-3 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'dashboard' ? 'border-primary-500 text-primary-600' : 'border-transparent text-muted-500 hover:text-muted-700 dark:hover:text-muted-300'">
          Visão Geral
        </button>
        <button @click="activeTab = 'prepaid'" class="pb-3 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'prepaid' ? 'border-primary-500 text-primary-600' : 'border-transparent text-muted-500 hover:text-muted-700 dark:hover:text-muted-300'">
          Pré-pagos (IR)
        </button>
        <button @click="activeTab = 'transactions'" class="pb-3 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'transactions' ? 'border-primary-500 text-primary-600' : 'border-transparent text-muted-500 hover:text-muted-700 dark:hover:text-muted-300'">
          Transações
        </button>
      </div>
    </div>

    <!-- SKELETON LOADING -->
    <div v-if="pending" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <BaseCard v-for="i in 4" :key="i" class="p-6 h-28 animate-pulse bg-muted-100 dark:bg-muted-900"></BaseCard>
      </div>
      <BaseCard class="p-20 text-center animate-pulse bg-muted-100 dark:bg-muted-900"></BaseCard>
    </div>

    <!-- CONTEUDO -->
    <div v-else-if="data" class="space-y-6">

      <!-- ABA 1: VISÃO GERAL -->
      <div v-if="activeTab === 'dashboard'" class="space-y-6">

        <!-- KPIs Principais -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <BaseCard class="p-5 cursor-pointer hover:border-primary-500 transition-colors"
            @click="openKpiDetails('total_entradas', 'Total Geral Entradas')">
            <BaseText size="xs" class="text-muted-500 uppercase tracking-wider font-semibold mb-1">Total Geral
              Entradas</BaseText>
            <BaseHeading as="h3" size="2xl">{{ fmt(data.kpis.totalAllTime) }}</BaseHeading>
            <BaseText size="sm" class="text-muted-400 mt-2">Mês: {{ fmt(data.kpis.totalMonth) }}</BaseText>
          </BaseCard>

          <BaseCard class="p-5 border-l-4 border-success-500 cursor-pointer hover:border-success-400 transition-colors"
            @click="openKpiDetails('mrr', 'MRR (Mensal Recorrente)')">
            <BaseText size="xs" class="text-success-600 uppercase tracking-wider font-semibold mb-1">MRR (Mensal
              Recorrente)</BaseText>
            <BaseHeading as="h3" size="2xl" class="text-success-600">{{ fmt(data.kpis.mrr) }}</BaseHeading>
            <BaseText size="sm" class="text-muted-400 mt-2">Previsão baseada em ativos</BaseText>
          </BaseCard>

          <BaseCard class="p-5 cursor-pointer hover:border-primary-500 transition-colors"
            @click="openKpiDetails('pix', 'Total PIX')">
            <BaseText size="xs" class="text-muted-500 uppercase tracking-wider font-semibold mb-1">Total PIX</BaseText>
            <BaseHeading as="h3" size="2xl">{{ fmt(data.kpis.pixAllTime) }}</BaseHeading>
            <BaseText size="sm" class="text-muted-400 mt-2">Mês: {{ fmt(data.kpis.pixMonth) }}</BaseText>
          </BaseCard>

          <BaseCard class="p-5 cursor-pointer hover:border-primary-500 transition-colors"
            @click="openKpiDetails('cartao', 'Total Cartão / Boleto')">
            <BaseText size="xs" class="text-muted-500 uppercase tracking-wider font-semibold mb-1">Total Cartão / Boleto
            </BaseText>
            <BaseHeading as="h3" size="2xl">{{ fmt(data.kpis.cardAllTime) }}</BaseHeading>
            <BaseText size="sm" class="text-muted-400 mt-2">Mês: {{ fmt(data.kpis.cardMonth) }}</BaseText>
          </BaseCard>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Coluna Maior: Planos -->
          <div class="lg:col-span-2 space-y-6">
            <BaseCard class="p-6">
              <BaseHeading as="h4" size="md" class="mb-6">Performance por Plano</BaseHeading>

              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="text-xs uppercase text-muted-400 border-b border-muted-200 dark:border-muted-800">
                      <th class="py-3 px-4">Plano</th>
                      <th class="py-3 px-4 text-center">Assinaturas Ativas</th>
                      <th class="py-3 px-4 text-center">Pendentes/Não Pago</th>
                      <th class="py-3 px-4 text-right">Faturamento Total</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-muted-100 dark:divide-muted-800">
                    <tr v-for="plan in data.planStats" :key="plan.slug"
                      class="hover:bg-muted-50 dark:hover:bg-muted-900/50 transition-colors">
                      <td class="py-3 px-4">
                        <span class="font-medium text-muted-800 dark:text-muted-100">{{ plan.name }}</span>
                      </td>
                      <td class="py-3 px-4 text-center">
                        <span class="font-semibold text-muted-900 dark:text-white">{{ plan.activePaidCount }}</span>
                        <div class="text-[10px] text-muted-500">{{ plan.monthlyCount }} Mensal | {{ plan.annualCount }}
                          Anual</div>
                      </td>
                      <td class="py-3 px-4 text-center">
                        <span class="text-muted-600">{{ plan.unpaidCount }}</span>
                      </td>
                      <td class="py-3 px-4 text-right">
                        <span class="font-semibold text-success-600">{{ fmt(plan.totalRevenue) }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </BaseCard>

            <BaseCard class="p-6">
              <div class="flex items-center justify-between mb-6">
                <BaseHeading as="h4" size="md">Repasses de Comissões (Pagos)</BaseHeading>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="text-xs uppercase text-muted-400 border-b border-muted-200 dark:border-muted-800">
                      <th class="py-3 px-4">Afiliado</th>
                      <th class="py-3 px-4">Cliente (Venda)</th>
                      <th class="py-3 px-4 text-right">Data</th>
                      <th class="py-3 px-4 text-right">Valor Comissão</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-muted-100 dark:divide-muted-800">
                    <tr v-for="com in data.recentCommissions" :key="com.id"
                      class="hover:bg-muted-50 dark:hover:bg-muted-900/50">
                      <td class="py-3 px-4">
                        <div class="flex items-center gap-2">
                          <BaseAvatar :src="com.affiliatePhoto" :text="com.affiliateName?.charAt(0)" size="xs" />
                          <span class="text-sm font-medium">{{ com.affiliateName }}</span>
                        </div>
                      </td>
                      <td class="py-3 px-4">
                        <span class="text-sm text-muted-600">{{ com.clientName }}</span>
                      </td>
                      <td class="py-3 px-4 text-right">
                        <span class="text-xs text-muted-500">{{ fmtDateTime(com.date) }}</span>
                      </td>
                      <td class="py-3 px-4 text-right">
                        <span class="font-semibold text-success-600">{{ fmt(com.amount) }}</span>
                      </td>
                    </tr>
                    <tr v-if="!data.recentCommissions?.length">
                      <td colspan="4" class="py-4 text-center text-sm text-muted-500 italic">Nenhuma comissão paga
                        recentemente.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </BaseCard>
          </div>

          <!-- Coluna Menor: Side widgets -->
          <div class="space-y-6">
            <BaseCard class="p-6">
              <div class="flex items-center justify-between mb-6">
                <BaseHeading as="h4" size="md">Últimos Pedidos</BaseHeading>
                <BaseButton size="sm" variant="default" color="default" @click="activeTab = 'transactions'">Ver
                  Histórico
                </BaseButton>
              </div>
              <div class="space-y-3">
                <div v-for="p in latestFivePayments" :key="p.id"
                  class="p-3 border rounded-lg hover:bg-muted-50 dark:hover:bg-muted-900 transition-colors"
                  :class="['PAID', 'COMPLETED'].includes(p.status) ? 'border-success-500/30 bg-success-500/5' : 'border-muted-200 dark:border-muted-800'">
                  <div class="flex justify-between items-start mb-2">
                    <span class="text-sm font-bold truncate pr-4">{{ p.user?.name || 'Sistema' }}</span>
                    <span class="text-sm font-black"
                      :class="['PAID', 'COMPLETED'].includes(p.status) ? 'text-success-600' : 'text-muted-500'">{{
                        fmt(p.amount) }}</span>
                  </div>
                  <div v-if="p.description || p.plan" class="mb-2 text-xs text-muted-600 line-clamp-2">
                    {{ p.description || `Assinatura - ${p.plan}` }}
                  </div>
                  <div class="flex justify-between items-center text-xs text-muted-500">
                    <div class="flex items-center gap-2">
                      <BaseTag :color="statusColor(p.status)" size="sm" variant="muted"
                        class="font-bold !px-1.5 !py-0 uppercase text-[9px]">{{ p.status }}</BaseTag>
                      <span class="uppercase text-[10px]">{{ p.paymentMethod || '—' }}</span>
                    </div>
                    <span>{{ fmtDate(p.createdAt) }}</span>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>
        </div>
      </div>

      <!-- ABA 2: PRÉ-PAGOS -->
      <div v-else-if="activeTab === 'prepaid'" class="space-y-6">

        <!-- Resumo Pré-pagos e Top Buyers -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <BaseCard class="p-6 lg:col-span-1 border-t-4 border-info-500">
            <BaseHeading as="h4" size="md" class="mb-4">Resumo Mensal</BaseHeading>
            <div class="space-y-4">
              <div
                class="flex justify-between items-center p-3 rounded-md bg-muted-50 dark:bg-muted-900 border border-muted-200 dark:border-muted-800">
                <div class="flex items-center gap-2">
                  <Icon name="solar:qr-code-linear" class="size-4 text-primary-500" />
                  <span class="text-xs font-medium">Acumulado PIX</span>
                </div>
                <span class="font-bold text-muted-800 dark:text-white">{{ fmt(data.kpis.prepaidPixMonth) }}</span>
              </div>
              <div
                class="flex justify-between items-center p-3 rounded-md bg-muted-50 dark:bg-muted-900 border border-muted-200 dark:border-muted-800">
                <div class="flex items-center gap-2">
                  <Icon name="solar:card-linear" class="size-4 text-info-500" />
                  <span class="text-xs font-medium">Acumulado Cartão</span>
                </div>
                <span class="font-bold text-muted-800 dark:text-white">{{ fmt(data.kpis.prepaidCardMonth) }}</span>
              </div>
              <div class="pt-2 flex justify-between items-end">
                <span class="text-xs uppercase font-bold text-muted-400">Total Mês</span>
                <span class="text-xl font-black text-info-600">{{ fmt(data.kpis.prepaidMonth) }}</span>
              </div>
            </div>
          </BaseCard>

          <BaseCard class="p-6 lg:col-span-2">
            <BaseHeading as="h4" size="md" class="mb-4">Maiores Compradores</BaseHeading>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-for="(buyer, idx) in data.topBuyers.slice(0, 6)" :key="buyer.userId"
                class="flex items-center justify-between p-2 rounded-lg border border-muted-200 dark:border-muted-800 hover:bg-muted-50 dark:hover:bg-muted-900 transition-colors">
                <div class="flex items-center gap-3">
                  <div
                    class="size-6 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center text-[10px] font-bold text-muted-400">
                    {{ Number(idx) + 1 }}
                  </div>
                  <BaseAvatar :src="buyer.photo" :text="buyer.name?.charAt(0)" size="xs" />
                  <div class="min-w-0">
                    <p class="text-[11px] font-bold text-muted-800 dark:text-white truncate max-w-[130px]">{{ buyer.name
                    }}</p>
                    <p class="text-[9px] text-muted-400">{{ buyer.purchaseCount }} Compras</p>
                  </div>
                </div>
                <p class="text-xs font-bold text-success-600">{{ fmt(buyer.totalSpent) }}</p>
              </div>
            </div>
          </BaseCard>
        </div>

        <BaseCard class="p-6">
          <BaseHeading as="h4" size="md" class="mb-2">Lista de Pré-pagos</BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 mb-6">Registro sequencial de compras avulsas de IR.
          </BaseParagraph>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr
                  class="text-xs uppercase text-muted-400 border-b border-muted-200 dark:border-muted-800 bg-muted-50 dark:bg-muted-900">
                  <th class="py-3 px-4 text-center">Data</th>
                  <th class="py-3 px-4">Cliente / Escritório</th>
                  <th class="py-3 px-4 text-center">Quantidade de IRs</th>
                  <th class="py-3 px-4 text-right">Valor Pago</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-muted-100 dark:divide-muted-800">
                <tr v-for="cp in data.allPrepaid" :key="cp.id"
                  class="hover:bg-muted-50 dark:hover:bg-muted-900/50 transition-colors">
                  <td class="py-3 px-4 text-center text-sm text-muted-600">{{ fmtDateTime(cp.date) }}</td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <BaseAvatar :src="cp.user.photo" :text="cp.user.name?.charAt(0)" size="xs" />
                      <span class="font-medium text-muted-800 dark:text-muted-100">{{ cp.user.name }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center font-semibold text-muted-700 dark:text-muted-300">
                    {{ cp.credits }}
                  </td>
                  <td class="py-3 px-4 text-right font-semibold text-success-600">
                    {{ fmt(cp.amount) }}
                  </td>
                </tr>
                <tr v-if="!data.allPrepaid?.length">
                  <td colspan="4" class="py-6 text-center text-sm text-muted-500 italic">Nenhum crédito vendido.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>
      </div>

      <!-- ABA 3: TRANSAÇÕES -->
      <div v-else-if="activeTab === 'transactions'">
        <BaseCard class="p-6">
          <BaseHeading as="h4" size="md" class="mb-6">Histórico de Transações do Sistema</BaseHeading>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="text-xs uppercase text-muted-400 border-b border-muted-200 dark:border-muted-800">
                  <th class="py-3 px-4">Data/Hora</th>
                  <th class="py-3 px-4">Usuário</th>
                  <th class="py-3 px-4 text-center">Tipo</th>
                  <th class="py-3 px-4 text-center">Método</th>
                  <th class="py-3 px-4 text-center">Status</th>
                  <th class="py-3 px-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-muted-100 dark:divide-muted-800">
                <tr v-for="p in data.recentPayments" :key="p.id"
                  class="hover:bg-muted-50 dark:hover:bg-muted-900/50 transition-colors">
                  <td class="py-3 px-4 text-sm text-muted-500">
                    {{ fmtDateTime(p.paidAt || p.createdAt) }}
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <BaseAvatar :src="p.user?.photo" :text="p.user?.name?.charAt(0) || 'S'" size="xs" />
                      <div>
                        <span class="font-medium text-muted-800 dark:text-muted-100 block">{{ p.user?.name || 'Sistema'
                        }}</span>
                        <span class="text-xs text-muted-500 block">{{ p.user?.email || '—' }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span class="text-xs font-medium text-muted-600">{{ paymentTypeLabel(p.paymentType) }}</span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span class="text-xs uppercase px-2 py-1 rounded bg-muted-100 dark:bg-muted-800 text-muted-600">{{
                      p.paymentMethod || '—' }}</span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <BaseTag :color="statusColor(p.status)" size="sm" variant="muted"
                      class="font-bold !px-2 uppercase text-[10px]">{{ p.status }}</BaseTag>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <span class="font-bold"
                      :class="['PAID', 'COMPLETED'].includes(p.status) ? 'text-success-600' : 'text-muted-500'">
                      {{ fmt(p.amount) }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!data.recentPayments?.length">
                  <td colspan="7" class="py-6 text-center text-sm text-muted-500 italic">Nenhuma transação encontrada.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>
      </div>

    </div>

    <!-- MODAL DE DETALHES DE KPI -->
    <div v-if="isKpiModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-muted-900/50 backdrop-blur-sm">
      <BaseCard class="w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div class="flex items-center justify-between p-4 border-b border-muted-200 dark:border-muted-800">
          <BaseHeading as="h3" size="md">Detalhes: {{ kpiModalTitle }}</BaseHeading>
          <button @click="isKpiModalOpen = false" class="p-2 text-muted-400 hover:text-muted-600 transition-colors">
            <Icon name="lucide:x" class="size-5" />
          </button>
        </div>

        <div class="p-4 overflow-y-auto flex-1">
          <div v-if="pendingKpi" class="py-12 flex justify-center">
            <Icon name="lucide:loader-2" class="size-8 text-primary-500 animate-spin" />
          </div>
          <div v-else-if="kpiItems.length === 0" class="py-10 text-center text-muted-500">
            Nenhum registro encontrado.
          </div>
          <div v-else class="space-y-3">
            <div v-for="item in kpiItems" :key="item.id"
              class="flex justify-between items-center p-3 border rounded-lg border-muted-200 dark:border-muted-800 hover:bg-muted-50 dark:hover:bg-muted-900 transition-colors">
              <div class="flex items-center gap-3">
                <BaseAvatar :src="item.user?.photo" :text="item.user?.name?.charAt(0)" size="sm" />
                <div>
                  <p class="text-sm font-bold text-muted-800 dark:text-white">{{ item.user?.name || 'Sistema' }}</p>
                  <p class="text-xs text-muted-500">{{ item.plan ? `Assinatura - ${item.plan?.name}` :
                    (item.paymentMethod || '—') }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-bold text-success-600">{{ fmt((item.amount || item.payments?.[0]?.amount || 0) / 100) }}
                </p>
                <p class="text-[10px] text-muted-400">{{ fmtDateTime(item.createdAt) }}</p>
              </div>
            </div>
            <div v-if="kpiItems.length === 100" class="text-center text-xs text-muted-400 pt-2">
              Mostrando os 100 registros mais recentes para esta métrica.
            </div>
          </div>
        </div>
      </BaseCard>
    </div>

  </div>
</template>
