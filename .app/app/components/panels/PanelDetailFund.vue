<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

const props = withDefaults(
  defineProps<{
    card?: any
  }>(),
  {
    card: undefined,
  },
)

const emits = defineEmits<{
  close: []
}>()

onKeyStroke('Escape', () => emits('close'))

const { useCustomFetch } = useApi()
const detailsExpanded = ref(false)
const fundDetails = ref<any>({})
const loading = ref(true)

// Computed para acessar os dados do fundo
const fund = computed(() => fundDetails.value || {})

// Funções helper
function formatCurrency(value: number): string {
  if (!value)
    return '0,00'
  return Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(dateString: string): string {
  if (!dateString)
    return 'N/A'
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Ativo',
    disabled: 'Desabilitado',
    locked: 'Bloqueado',
  }
  return labels[status] || status
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    money: 'Dinheiro',
    bank: 'Banco',
  }
  return labels[type] || type
}

function getAveragePerOperation(): number {
  if (!fund.value.stats?.totalOperations || fund.value.stats.totalOperations === 0) {
    return 0
  }
  return fund.value.stats.totalAmount / fund.value.stats.totalOperations
}

function getProgressPercentage(): number {
  // Calcula um percentual baseado no saldo atual
  const amount = getCurrentBalance()
  return Math.max(0, Math.min(100, amount > 0 ? 75 : 25))
}

function getCurrentBalance(): number {
  // Se há um dia operacional atual, usar o saldo atual do dia
  if (fund.value.currentDay?.fundOperation?.currentAmount !== undefined) {
    return fund.value.currentDay.fundOperation.currentAmount
  }

  // Caso contrário, usar o saldo histórico total
  return fund.value.stats?.totalAmount || 0
}

// Função para buscar detalhes do fundo
async function fetchFundDetails() {
  console.log('Props card received:', props.card)

  if (!props.card?.id) {
    console.warn('ID do fundo não fornecido. Props.card:', props.card)
    loading.value = false
    return
  }

  try {
    loading.value = true
    console.log('Fetching fund details for ID:', props.card.id)

    const { data } = await useCustomFetch<any>(`/funds/${props.card.id}`, {
      method: 'GET',
    })

    console.log('API response:', data)

    if (data.success) {
      fundDetails.value = data.data
      console.log('Fund details set:', fundDetails.value)
    }
    else {
      console.error('Erro ao buscar detalhes do fundo:', data)
    }
  }
  catch (error) {
    console.error('Erro na requisição de detalhes do fundo:', error)
  }
  finally {
    loading.value = false
  }
}

// Buscar detalhes quando o componente for montado
onMounted(() => {
  fetchFundDetails()
})

// Observar mudanças no card para recarregar os dados
watch(() => props.card?.id, (newId) => {
  if (newId) {
    fetchFundDetails()
  }
})
</script>

<template>
  <FocusScope class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white" trapped loop>
    <div class="border-muted-200 dark:border-muted-700 flex h-20 w-full items-center justify-between border-b px-6">
      <BaseHeading as="h3" size="xs" weight="semibold" class="text-muted-500 dark:text-muted-100 uppercase">
        Detalhes do Fundo
      </BaseHeading>

      <!-- Close button -->
      <button
        type="button"
        class="nui-mask nui-mask-blob hover:bg-muted-100 focus:bg-muted-100 dark:hover:bg-muted-700 dark:focus:bg-muted-700 text-muted-700 dark:text-muted-400 flex size-10 cursor-pointer items-center justify-center outline-transparent transition-colors duration-300"
        @click="() => emits('close')"
      >
        <Icon name="lucide:arrow-right" class="size-4" />
      </button>
    </div>

    <div class="nui-slimscroll relative h-[calc(100dvh_-_80px)] w-full overflow-y-auto p-6">
      <!-- Loading state -->
      <div v-if="loading" class="flex items-center justify-center py-8">
        <div class="flex items-center gap-3">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
          <span class="text-muted-500">Carregando detalhes do fundo...</span>
        </div>
      </div>

      <!-- Content -->
      <div v-else class="mb-3">
        <!-- Info -->
        <div class="flex items-center justify-between">
          <div>
            <BaseHeading as="h4" size="sm" class="text-muted-900 dark:text-muted-100">
              {{ fund.name || 'Nome não informado' }}
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-400">
              {{ getTypeLabel(fund.type) }} • {{ getStatusLabel(fund.status) }}
            </BaseParagraph>
          </div>
          <div class="text-end">
            <BaseHeading
              as="h4" size="sm" :class="[
                getCurrentBalance() >= 0
                  ? 'text-muted-900 dark:text-muted-100'
                  : 'text-red-600 dark:text-red-400',
              ]"
            >
              R$ {{ formatCurrency(getCurrentBalance()) }}
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-400">
              Saldo Atual
            </BaseParagraph>
          </div>
        </div>
        <!-- Progress -->
        <BaseProgress
          :model-value="getProgressPercentage()" size="xs"
          :variant="getCurrentBalance() >= 0 ? 'primary' : 'dark'" class="my-2"
        />

        <!-- Card details -->
        <div class="pt-2">
          <button
            type="button" class="focus-visible:nui-focus mb-3 flex w-full items-center"
            @click="detailsExpanded = !detailsExpanded"
          >
            <span class="text-muted-500 dark:text-muted-400 flex w-full items-center justify-between">
              <span class="flex items-center gap-1">
                <Icon
                  name="lucide:chevron-down" class="size-3 transition-transform duration-300"
                  :class="detailsExpanded ? 'rotate-180' : ''"
                />
                <BaseText v-if="!detailsExpanded" size="xs">
                  Mostrar detalhes
                </BaseText>
                <BaseText v-if="detailsExpanded" size="xs">
                  Ocultar detalhes
                </BaseText>
              </span>

              <BaseText v-if="!detailsExpanded" size="xs">
                {{ fund.stats?.totalOperations || 0 }} operações
              </BaseText>
            </span>
          </button>
          <!-- Collapse -->
          <div v-if="detailsExpanded" class="bg-muted-100 dark:bg-muted-900 rounded-xl p-6">
            <!-- Head -->
            <div class="border-muted-200 dark:border-muted-700 mb-3 flex items-center justify-between border-b pb-3">
              <BaseHeading as="h5" size="xs" class="text-muted-600 dark:text-muted-300">
                Resumo das Operações
              </BaseHeading>
              <BaseText
                size="sm" :class="[
                  getCurrentBalance() >= 0
                    ? 'text-muted-800 dark:text-muted-100'
                    : 'text-red-600 dark:text-red-400',
                ]"
              >
                R$ {{ formatCurrency(getCurrentBalance()) }}
              </BaseText>
            </div>
            <!-- Content -->
            <div class="space-y-4">
              <!-- Item -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="bg-success-500 size-2 rounded-full" />
                  <BaseParagraph size="sm" class="text-muted-700 dark:text-muted-400">
                    Total de Operações
                  </BaseParagraph>
                  <BaseTooltip content="Número total de operações realizadas neste fundo">
                    <Icon name="lucide:help-circle" class="text-muted-400 size-3" />
                  </BaseTooltip>
                </div>
                <BaseText size="sm" class="text-muted-800 dark:text-muted-100">
                  {{ fund.stats?.totalOperations || 0 }}
                </BaseText>
              </div>
              <!-- Item -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="bg-primary-500 size-2 rounded-full" />
                  <BaseParagraph size="sm" class="text-muted-700 dark:text-muted-400">
                    Média por Operação
                  </BaseParagraph>
                  <BaseTooltip content="Valor médio por operação realizada">
                    <Icon name="lucide:help-circle" class="text-muted-400 size-3" />
                  </BaseTooltip>
                </div>
                <BaseText size="sm" class="text-muted-800 dark:text-muted-100">
                  R$ {{ formatCurrency(getAveragePerOperation()) }}
                </BaseText>
              </div>
              <!-- Item -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div
                    class="size-2 rounded-full" :class="[
                      fund.status === 'active' ? 'bg-success-500'
                      : fund.status === 'disabled' ? 'bg-muted-400' : 'bg-destructive-500',
                    ]"
                  />
                  <BaseParagraph size="sm" class="text-muted-700 dark:text-muted-400">
                    Status do Fundo
                  </BaseParagraph>
                  <BaseTooltip content="Status atual de operação do fundo">
                    <Icon name="lucide:help-circle" class="text-muted-400 size-3" />
                  </BaseTooltip>
                </div>
                <BaseText size="sm" class="text-muted-800 dark:text-muted-100">
                  {{ getStatusLabel(fund.status) }}
                </BaseText>
              </div>
              <!-- Item -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div
                    class="size-2 rounded-full" :class="[
                      getCurrentBalance() >= 0 ? 'bg-success-500' : 'bg-destructive-500',
                    ]"
                  />
                  <BaseParagraph size="sm" class="text-muted-700 dark:text-muted-400">
                    Situação Financeira
                  </BaseParagraph>
                </div>
                <BaseText
                  size="sm" :class="[
                    getCurrentBalance() >= 0
                      ? 'text-success-600 dark:text-success-400'
                      : 'text-red-600 dark:text-red-400',
                  ]"
                >
                  {{ getCurrentBalance() >= 0 ? 'Positivo' : 'NEGATIVO' }}
                </BaseText>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 w-full space-y-5">
          <!-- Current Day Operation Info -->
          <div
            v-if="fund.currentDay"
            class="border-muted-200 dark:border-muted-700 border rounded-lg p-4 bg-primary-50 dark:bg-primary-900/10"
          >
            <div class="mb-3">
              <BaseHeading as="h5" size="xs" class="text-primary-600 dark:text-primary-400 mb-2">
                Operação do Dia Atual
              </BaseHeading>
              <BaseParagraph size="xs" class="text-muted-500">
                {{ formatDate(fund.currentDay.operationDay.date_opened) }} • Aberto por {{
                  fund.currentDay.operationDay.user.name }}
              </BaseParagraph>
            </div>

            <!-- Fund Operation Details -->
            <div v-if="fund.currentDay.fundOperation" class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-muted-600 dark:text-muted-300">Valor de Abertura:</span>
                <span class="text-sm font-mono text-success-600 dark:text-success-400">
                  R$ {{ formatCurrency(fund.currentDay.fundOperation.initialAmount) }}
                </span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-sm text-muted-600 dark:text-muted-300">Saldo Atual:</span>
                <span
                  class="text-sm font-mono" :class="[
                    fund.currentDay.fundOperation.currentAmount >= 0
                      ? 'text-success-600 dark:text-success-400'
                      : 'text-red-600 dark:text-red-400',
                  ]"
                >
                  R$ {{ formatCurrency(fund.currentDay.fundOperation.currentAmount) }}
                </span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-sm text-muted-600 dark:text-muted-300">Transações Hoje:</span>
                <span class="text-sm text-muted-800 dark:text-muted-200">
                  {{ fund.currentDay.transactions.totalCount }} (R$ {{
                    formatCurrency(fund.currentDay.transactions.totalAmount) }})
                </span>
              </div>
            </div>

            <div v-else class="text-center py-2">
              <BaseParagraph size="xs" class="text-muted-500">
                Este fundo não foi aberto no dia operacional atual
              </BaseParagraph>
            </div>
          </div>

          <!-- No Current Day -->
          <div
            v-else
            class="border-muted-200 dark:border-muted-700 border rounded-lg p-4 bg-muted-50 dark:bg-muted-900/50"
          >
            <div class="text-center py-2">
              <Icon name="lucide:calendar-x" class="size-6 text-muted-400 mx-auto mb-2" />
              <BaseParagraph size="xs" class="text-muted-500">
                Nenhum dia operacional aberto hoje
              </BaseParagraph>
            </div>
          </div>

          <!-- Fund info / actions -->
          <div class="space-y-4 px-2">
            <BaseParagraph size="xs" class="text-muted-400 text-center">
              Fundo criado em {{ formatDate(fund.createdAt) }}
            </BaseParagraph>

            <!-- Action Button -->
            <div class="flex justify-center pt-2">
              <BaseButton
                :to="`/dashboard/transactions?fundId=${fund.id}`" variant="primary" size="sm" rounded="md"
                class="w-full"
              >
                <Icon name="lucide:list" class="size-4 me-2" />
                Ver Transações deste Fundo
              </BaseButton>
            </div>
          </div>
          <!-- Fund Information -->
          <div class="border-muted-200 dark:border-muted-700 border-t">
            <div class="pt-6">
              <BaseParagraph size="xs" class="text-muted-400 mb-2">
                Informações do Fundo
              </BaseParagraph>
              <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300">
                ID: {{ fund.id }}
              </BaseParagraph>
              <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300">
                Última atualização: {{ formatDate(fund.updatedAt) }}
              </BaseParagraph>
            </div>
          </div>
          <!-- Week Summary -->
          <div v-if="fund.currentWeek" class="border-muted-200 dark:border-muted-700 border-t">
            <div class="space-y-4 py-6">
              <div class="flex items-center justify-between mb-4">
                <BaseParagraph size="xs" class="text-muted-400">
                  Resumo da Semana Atual
                </BaseParagraph>
                <BaseParagraph size="xs" class="text-muted-500">
                  {{ formatDate(fund.currentWeek.period.startDate) }} - {{ formatDate(fund.currentWeek.period.endDate)
                  }}
                </BaseParagraph>
              </div>

              <div class="flex items-center justify-between mb-3">
                <BaseParagraph size="xs" class="text-muted-500">
                  {{ fund.currentWeek.period.daysCount }} {{ fund.currentWeek.period.daysCount === 1 ? 'dia operacional'
                    : 'dias operacionais' }} na semana
                </BaseParagraph>
              </div>

              <!-- Deposits -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="bg-success-500 size-2 rounded-full" />
                  <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300">
                    Total Depósitos
                  </BaseParagraph>
                </div>
                <BaseParagraph size="sm" class="text-success-600 dark:text-success-400">
                  R$ {{ formatCurrency(fund.currentWeek.totals.total_deposit) }}
                </BaseParagraph>
              </div>

              <!-- Withdrawals -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="bg-destructive-500 size-2 rounded-full" />
                  <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300">
                    Total Saques
                  </BaseParagraph>
                </div>
                <BaseParagraph size="sm" class="text-destructive-600 dark:text-destructive-400">
                  R$ {{ formatCurrency(fund.currentWeek.totals.total_withdraw) }}
                </BaseParagraph>
              </div>

              <!-- Cashback -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="bg-primary-500 size-2 rounded-full" />
                  <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300">
                    Total Cashback
                  </BaseParagraph>
                </div>
                <BaseParagraph size="sm" class="text-primary-600 dark:text-primary-400">
                  R$ {{ formatCurrency(fund.currentWeek.totals.total_cashback) }}
                </BaseParagraph>
              </div>

              <!-- Bonus -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="bg-warning-500 size-2 rounded-full" />
                  <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300">
                    Total Bônus
                  </BaseParagraph>
                </div>
                <BaseParagraph size="sm" class="text-warning-600 dark:text-warning-400">
                  R$ {{ formatCurrency(fund.currentWeek.totals.total_bonus) }}
                </BaseParagraph>
              </div>

              <!-- New Clients -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="bg-info-500 size-2 rounded-full" />
                  <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300">
                    Novos Clientes
                  </BaseParagraph>
                </div>
                <BaseParagraph size="sm" class="text-muted-800 dark:text-muted-200">
                  {{ fund.currentWeek.totals.total_new_clients }}
                </BaseParagraph>
              </div>

              <!-- Week Fund Summary -->
              <div class="border-t border-muted-200 dark:border-muted-700 pt-3 mt-4">
                <div class="flex items-center justify-between">
                  <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300">
                    Valor Inicial da Semana
                  </BaseParagraph>
                  <BaseParagraph size="sm" class="text-success-600 dark:text-success-400">
                    R$ {{ formatCurrency(fund.currentWeek.fundOperation.initialAmount) }}
                  </BaseParagraph>
                </div>

                <div class="flex items-center justify-between mt-2">
                  <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300">
                    Saldo Atual da Semana
                  </BaseParagraph>
                  <BaseParagraph
                    size="sm" :class="[
                      fund.currentWeek.fundOperation.currentAmount >= 0
                        ? 'text-success-600 dark:text-success-400'
                        : 'text-red-600 dark:text-red-400',
                    ]"
                  >
                    R$ {{ formatCurrency(fund.currentWeek.fundOperation.currentAmount) }}
                  </BaseParagraph>
                </div>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="border-muted-200 dark:border-muted-700 border-t">
            <div class="space-y-4 py-6">
              <BaseParagraph size="xs" class="text-muted-400 mb-4">
                Informações Gerais do Fundo
              </BaseParagraph>

              <!-- item -->
              <div class="flex items-center justify-between">
                <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300">
                  Saldo Histórico Total
                </BaseParagraph>
                <BaseParagraph
                  size="sm" :class="[
                    fund.stats?.totalAmount >= 0
                      ? 'text-muted-600 dark:text-muted-300'
                      : 'text-red-600 dark:text-red-400',
                  ]"
                >
                  R$ {{ formatCurrency(fund.stats?.totalAmount || 0) }}
                </BaseParagraph>
              </div>
              <!-- item -->
              <div class="flex items-center justify-between">
                <div>
                  <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300">
                    Operações Históricas
                  </BaseParagraph>
                  <BaseParagraph size="xs" class="text-muted-400 mb-1">
                    Todas as operações já realizadas
                  </BaseParagraph>
                </div>
                <div>
                  <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300 mb-1">
                    {{ fund.stats?.totalOperations || 0 }}
                  </BaseParagraph>
                  <BaseParagraph size="xs" class="text-muted-400 mb-1">
                    R$ {{ formatCurrency(getAveragePerOperation()) }} média
                  </BaseParagraph>
                </div>
              </div>
              <!-- item -->
              <div class="flex items-center justify-between">
                <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300">
                  Status
                </BaseParagraph>

                <BaseTooltip content="Status atual do fundo">
                  <span
                    class="text-sm" :class="[
                      fund.status === 'active'
                        ? 'text-success-600 dark:text-success-400'
                        : fund.status === 'disabled'
                          ? 'text-muted-600 dark:text-muted-400'
                          : 'text-destructive-600 dark:text-destructive-400',
                    ]"
                  >
                    {{ getStatusLabel(fund.status) }}
                  </span>
                </BaseTooltip>
              </div>
              <!-- item -->
              <div class="flex items-center justify-between">
                <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300">
                  Tipo de Fundo
                </BaseParagraph>
                <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-300 capitalize">
                  {{ getTypeLabel(fund.type) }}
                </BaseParagraph>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </FocusScope>
</template>
