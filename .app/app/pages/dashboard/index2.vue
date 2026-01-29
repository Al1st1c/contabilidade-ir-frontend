<script setup lang="ts">
import { useApi, useAuth } from '~/composables/useAuth'

definePageMeta({
  title: 'Dashboard Executiva',
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

const revenueChart = computed(() => ({
  type: 'radialBar' as const,
  height: 220,
  series: [stats.value.revenue > 0 ? Math.round((stats.value.received / stats.value.revenue) * 100) : 0],
  options: {
    chart: { sparkline: { enabled: true } },
    colors: ['var(--color-success-500)'],
    plotOptions: {
      radialBar: {
        hollow: { size: '70%' },
        dataLabels: {
          name: { show: false },
          value: { offsetY: 10, fontSize: '22px', fontWeight: '700' }
        }
      }
    },
    stroke: { lineCap: 'round' }
  }
}))

onMounted(fetchDashboard)
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-10">
    <!-- Header: Premium Welcome -->
    <div class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <BaseAvatar :src="user?.photo || '/img/avatars/placeholder.jpg'" size="xl" class="ring-4 ring-primary-500/10" />
        <div>
          <BaseHeading as="h1" size="2xl" weight="bold" class="text-muted-900 dark:text-white mb-1">
            Olá, {{ user?.name?.split(' ')[0] || 'Contador' }}! 👋
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500">
            Campanha de IR {{ new Date().getFullYear() }} • <span class="capitalize">{{ new Intl.DateTimeFormat('pt-BR',
              { dateStyle: 'long' }).format(new Date()) }}</span>
          </BaseParagraph>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <BaseButton variant="none"
          class="bg-muted-100 dark:bg-muted-800 text-muted-600 dark:text-muted-400 hover:bg-muted-200" rounded="lg">
          <Icon name="solar:printer-minimalistic-linear" class="size-4 mr-2" />
          Relatórios
        </BaseButton>
        <BaseButton to="/dashboard/ir" variant="none"
          class="bg-primary-500 text-white shadow-lg shadow-primary-500/20 hover:bg-primary-600" rounded="lg">
          <Icon name="solar:widget-2-linear" class="size-4 mr-2" />
          Gerenciar Kanban
        </BaseButton>
      </div>
    </div>

    <div v-if="isLoading" class="grid grid-cols-12 gap-6">
      <div v-for="i in 4" :key="i" class="col-span-12 md:col-span-3">
        <BasePlaceload class="h-32 w-full rounded-2xl" />
      </div>
      <div class="col-span-12 md:col-span-8">
        <BasePlaceload class="h-[400px] w-full rounded-2xl" />
      </div>
      <div class="col-span-12 md:col-span-4">
        <BasePlaceload class="h-[400px] w-full rounded-2xl" />
      </div>
    </div>

    <div v-else class="grid grid-cols-12 gap-6">
      <!-- Top Stats Tiles -->
      <div class="col-span-12 md:col-span-3">
        <BaseCard rounded="lg" class="p-6 relative overflow-hidden group">
          <div class="relative z-10">
            <BaseParagraph size="xs" weight="medium" class="text-muted-400 uppercase tracking-widest mb-1">Total
              Declarantes</BaseParagraph>
            <div class="flex items-end gap-2">
              <BaseHeading as="h3" size="3xl" weight="bold">{{ stats.total }}</BaseHeading>
              <BaseTag variant="none" class="bg-success-500/10 text-success-500 mb-1.5 text-[10px]">+12%</BaseTag>
            </div>
          </div>
          <Icon name="solar:users-group-two-rounded-bold-duotone"
            class="absolute -right-4 -bottom-4 size-24 text-muted-100 dark:text-muted-800/40 group-hover:scale-110 transition-transform duration-500" />
        </BaseCard>
      </div>

      <div class="col-span-12 md:col-span-3">
        <BaseCard rounded="lg" class="p-6 relative overflow-hidden group">
          <div class="relative z-10">
            <BaseParagraph size="xs" weight="medium" class="text-muted-400 uppercase tracking-widest mb-1">Finalizados
            </BaseParagraph>
            <div class="flex items-end gap-2">
              <BaseHeading as="h3" size="3xl" weight="bold">{{ stats.completed }}</BaseHeading>
              <BaseParagraph size="xs" class="text-muted-500 mb-1.5">{{ Math.round((stats.completed / (stats.total ||
                1)) * 100) }}% da meta</BaseParagraph>
            </div>
          </div>
          <Icon name="solar:check-circle-bold-duotone"
            class="absolute -right-4 -bottom-4 size-24 text-success-500/10 group-hover:scale-110 transition-transform duration-500" />
        </BaseCard>
      </div>

      <div class="col-span-12 md:col-span-3">
        <BaseCard rounded="lg" class="p-6 relative overflow-hidden group border-2 border-primary-500/10">
          <div class="relative z-10">
            <BaseParagraph size="xs" weight="medium" class="text-primary-500 uppercase tracking-widest mb-1 font-bold">
              Aguardando Documentos</BaseParagraph>
            <div class="flex items-end gap-2 text-primary-600 dark:text-primary-400">
              <BaseHeading as="h3" size="3xl" weight="bold">{{ stats.docsWaiting }}</BaseHeading>
              <Icon name="solar:map-arrow-square-linear" class="size-5 mb-2 animate-bounce" />
            </div>
          </div>
          <Icon name="solar:document-add-bold-duotone"
            class="absolute -right-4 -bottom-4 size-24 text-primary-500/10 group-hover:scale-110 transition-transform duration-500" />
        </BaseCard>
      </div>

      <div class="col-span-12 md:col-span-3">
        <BaseCard rounded="lg" class="p-6 relative overflow-hidden group bg-muted-900 dark:bg-muted-950">
          <div class="relative z-10">
            <BaseParagraph size="xs" weight="medium" class="text-muted-400 uppercase tracking-widest mb-1">Faturamento
              Bruto</BaseParagraph>
            <BaseHeading as="h3" size="2xl" weight="bold" class="text-white">{{ formatCurrency(stats.revenue) }}
            </BaseHeading>
            <BaseParagraph size="xs" class="text-primary-400 mt-1 font-semibold">{{ formatCurrency(stats.received) }}
              recebidos</BaseParagraph>
          </div>
          <Icon name="solar:wad-of-money-bold-duotone"
            class="absolute -right-4 -bottom-4 size-24 text-white/5 group-hover:scale-110 transition-transform duration-500" />
        </BaseCard>
      </div>

      <!-- Main Section: Charts and Activity -->
      <div class="col-span-12 lg:col-span-8 space-y-6">
        <!-- Pipeline Funnel -->
        <BaseCard rounded="lg" class="p-8">
          <div class="flex items-center justify-between mb-8">
            <div>
              <BaseHeading as="h3" size="lg" weight="semibold">Fluxo de Processamento</BaseHeading>
              <BaseParagraph size="sm" class="text-muted-500">Distribuição das declarações por etapa do Kanban
              </BaseParagraph>
            </div>
            <BaseButton variant="none" size="sm" class="bg-primary-500/10 text-primary-600 hover:bg-primary-500/20 px-4"
              rounded="full">
              Detalhes
            </BaseButton>
          </div>
          <LazyAddonApexcharts v-bind="pipelineChart" />
        </BaseCard>

        <!-- Recent Activity Table -->
        <BaseCard rounded="lg" class="p-8">
          <div class="flex items-center justify-between mb-6">
            <BaseHeading as="h3" size="lg" weight="semibold">Últimas Atualizações</BaseHeading>
            <NuxtLink to="/dashboard/ir" class="text-primary-500 text-sm hover:underline font-medium">Ver tudo
            </NuxtLink>
          </div>
          <TairoTable>
            <template #header>
              <TairoTableHeading
                class="bg-muted-50 dark:bg-muted-900 px-4 py-3 text-[11px] uppercase font-bold text-muted-400">Cliente
              </TairoTableHeading>
              <TairoTableHeading
                class="bg-muted-50 dark:bg-muted-900 px-4 py-3 text-[11px] uppercase font-bold text-muted-400">Status
              </TairoTableHeading>
              <TairoTableHeading
                class="bg-muted-50 dark:bg-muted-900 px-4 py-3 text-[11px] uppercase font-bold text-muted-400 text-right">
                Valor</TairoTableHeading>
            </template>
            <TairoTableRow v-for="item in recentDeclarations" :key="item.id">
              <TairoTableCell class="p-4">
                <div class="flex items-center gap-3">
                  <BaseAvatar :src="item.client?.photo" :text="item.client?.name?.charAt(0)" size="xs" rounded="full"
                    class="bg-primary-500/10 text-primary-600 font-bold" />
                  <div>
                    <BaseParagraph size="sm" weight="medium" class="text-muted-800 dark:text-muted-100">
                      {{ item.client?.name || 'Sem nome' }}
                    </BaseParagraph>
                    <BaseParagraph size="xs" class="text-muted-400">{{ item.client?.cpf || '---' }}</BaseParagraph>
                  </div>
                </div>
              </TairoTableCell>
              <TairoTableCell class="p-4">
                <BaseTag variant="none" rounded="full"
                  class="bg-muted-100 dark:bg-muted-800 text-muted-600 dark:text-muted-400 text-[10px] font-bold uppercase px-2 py-0.5">
                  {{ item.paymentStatus === 'paid' ? 'Pago' : 'Pendente' }}
                </BaseTag>
              </TairoTableCell>
              <TairoTableCell class="p-4 text-right font-medium text-muted-700 dark:text-muted-200">
                {{ formatCurrency(item.serviceValue || 0) }}
              </TairoTableCell>
            </TairoTableRow>
          </TairoTable>
        </BaseCard>
      </div>

      <!-- Side Section: Goals and Team -->
      <div class="col-span-12 lg:col-span-4 space-y-6">
        <!-- Goal Overview -->
        <BaseCard rounded="lg" class="p-8 flex flex-col items-center">
          <BaseHeading as="h3" size="md" weight="semibold" class="mb-2 self-start">Saúde da Campanha</BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 mb-8 self-start">Progresso de recebimento vs honorários
            projetados
          </BaseParagraph>

          <LazyAddonApexcharts v-bind="revenueChart" />

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

        <!-- Team Productivity -->
        <BaseCard rounded="lg" class="p-8">
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

        <!-- Integration Ad/Card -->
        <BaseCard rounded="lg"
          class="p-6 bg-primary-600 text-white border-none shadow-xl shadow-primary-500/30 overflow-hidden relative">
          <div class="relative z-10">
            <BaseHeading as="h4" size="md" weight="bold" class="mb-2">Novos Documentos?</BaseHeading>
            <BaseParagraph size="xs" class="text-primary-100 mb-4 opacity-90">
              Gere links de coleta e automatize o recebimento de informes dos seus clientes.
            </BaseParagraph>
            <BaseButton variant="none" class="bg-white text-primary-600 hover:bg-primary-50 w-full" size="sm"
              rounded="md">
              Criar Link de Coleta
            </BaseButton>
          </div>
          <Icon name="solar:link-circle-bold" class="absolute -right-8 -bottom-8 size-32 text-primary-500 opacity-20" />
        </BaseCard>
      </div>
    </div>
  </div>
</template>
