<script setup lang="ts">
// Importar composable para API
import { useApi } from '~/composables/useAuth'

interface FilterData {
  dateRange?: string
  dateFrom?: string
  dateTo?: string
  transactionType?: string
  userId?: string
  fundId?: string
  minAmount?: number
  maxAmount?: number
}

// Props
const props = defineProps<{
  modelValue: FilterData
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: FilterData]
  'apply': [filters: FilterData]
  'clear': []
  'mobile-filters': []
}>()

// Estado local dos filtros
const localFilters = ref<FilterData>({ ...props.modelValue })

// Opções de período
const dateRangeOptions = [
  { value: 'all', label: 'Todo o período' },
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last_7_days', label: 'Últimos 7 dias' },
  { value: 'last_30_days', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'this_year', label: 'Este ano' },
  { value: 'custom', label: 'Período personalizado' },
]

// Opções de tipo de transação
const transactionTypeOptions = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'DEPOSIT', label: 'Depósito' },
  { value: 'WITHDRAW', label: 'Saque' },
  { value: 'CASHBACK', label: 'Cashback' },
  { value: 'BONUS', label: 'Bônus' },
  { value: 'FREE_CREDITS', label: 'Créditos Grátis' },
]
const { useCustomFetch } = useApi()

// Estado para os fundos
const funds = ref<any[]>([])
const loadingFunds = ref(false)

// Função para buscar fundos
async function fetchFunds() {
  if (loadingFunds.value)
    return

  loadingFunds.value = true
  try {
    const { data } = await useCustomFetch<any>('/funds', {
      method: 'GET',
    })
    funds.value = data?.data || []
  }
  catch (error) {
    console.error('Erro ao buscar fundos:', error)
    funds.value = []
  }
  finally {
    loadingFunds.value = false
  }
}

// Buscar fundos ao montar o componente
onMounted(() => {
  fetchFunds()
})

// Estado do dropdown
const activeFilterTab = ref('filter-1')
const dropdownOpen = ref(false)

// Watch para sincronizar com o prop
watch(() => props.modelValue, (newValue) => {
  localFilters.value = { ...newValue }
}, { deep: true })

// Função para aplicar filtros
function applyFilters() {
  emit('update:modelValue', { ...localFilters.value })
  emit('apply', { ...localFilters.value })
  dropdownOpen.value = false
}

// Função para limpar filtros
function clearFilters() {
  localFilters.value = {}
  emit('update:modelValue', {})
  emit('clear')
  dropdownOpen.value = false
}

// Reset tab quando dropdown abre
function onOpenChange(open: boolean) {
  dropdownOpen.value = open
  if (open) {
    activeFilterTab.value = 'filter-1'
  }
}

// Computed para verificar se há filtros aplicados
const hasFilters = computed(() => {
  return Object.keys(localFilters.value).some((key) => {
    const value = localFilters.value[key as keyof FilterData]
    return value !== undefined && value !== '' && value !== null
  })
})

// Computed para texto dos filtros aplicados
const appliedFiltersText = computed(() => {
  const filters = []

  if (localFilters.value.dateRange && localFilters.value.dateRange !== 'all') {
    const option = dateRangeOptions.find(opt => opt.value === localFilters.value.dateRange)
    if (option)
      filters.push(option.label)
  }

  if (localFilters.value.transactionType && localFilters.value.transactionType !== 'all') {
    const option = transactionTypeOptions.find(opt => opt.value === localFilters.value.transactionType)
    if (option)
      filters.push(option.label)
  }

  if (localFilters.value.fundId && localFilters.value.fundId !== 'all') {
    const fund = funds.value.find((f: any) => f.id === localFilters.value.fundId)
    if (fund)
      filters.push(`Fundo: ${fund.name}`)
  }

  if (localFilters.value.minAmount !== undefined || localFilters.value.maxAmount !== undefined) {
    let amountText = 'Valor: '
    if (localFilters.value.minAmount !== undefined && localFilters.value.maxAmount !== undefined) {
      amountText += `R$ ${localFilters.value.minAmount} - R$ ${localFilters.value.maxAmount}`
    }
    else if (localFilters.value.minAmount !== undefined) {
      amountText += `≥ R$ ${localFilters.value.minAmount}`
    }
    else if (localFilters.value.maxAmount !== undefined) {
      amountText += `≤ R$ ${localFilters.value.maxAmount}`
    }
    filters.push(amountText)
  }

  return filters.length > 0 ? filters.join(', ') : 'Nenhum filtro aplicado'
})
</script>

<template>
  <div class="group relative hidden md:block">
    <DropdownMenuRoot :open="dropdownOpen" @update:open="onOpenChange">
      <DropdownMenuTrigger as-child>
        <BaseButton
          rounded="md"
          size="sm"
          :variant="hasFilters ? 'primary' : 'default'"
        >
          <Icon name="solar:filter-linear" class="size-4" />
          <span>Filtros</span>
          <BaseBadge v-if="hasFilters" variant="primary" size="xs" class="ml-2">
            {{ Object.keys(localFilters).filter(key => localFilters[key as keyof FilterData]).length }}
          </BaseBadge>
        </BaseButton>
      </DropdownMenuTrigger>

      <DropdownMenuPortal>
        <DropdownMenuContent
          align="start"
          side="bottom"
          :side-offset="5"
          class="dark:bg-muted-800 border-muted-200 dark:border-muted-700 shadow-muted-400/20 dark:shadow-muted-800/20 grid w-[660px] grid-cols-12 overflow-hidden rounded-lg border bg-white shadow-xl origin-top-left starting:scale-95 starting:opacity-0 transition-all duration-100"
        >
          <div class="bg-muted-50 dark:bg-muted-900 col-span-4 space-y-2 p-6">
            <!-- Menu item - Data -->
            <button
              type="button"
              class="tw-accessibility click-blur flex w-full cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 font-sans text-sm transition-all duration-300"
              :class="
                activeFilterTab === 'filter-1'
                  ? 'text-primary-500 border-primary-500 bg-primary-500/10'
                  : 'text-muted-500 hover:text-muted-600 dark:hover:text-muted-300 border-muted-50 dark:border-muted-900 hover:bg-muted-200 dark:hover:bg-muted-800'
              "
              @click.prevent.stop="activeFilterTab = 'filter-1'"
            >
              <Icon name="solar:calendar-linear" class="size-5" />
              <span>Data</span>
              <Icon name="lucide:chevron-right" class="ms-auto size-4" />
            </button>

            <!-- Menu item - Tipo -->
            <button
              type="button"
              class="tw-accessibility click-blur flex w-full cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 font-sans text-sm transition-all duration-300"
              :class="
                activeFilterTab === 'filter-2'
                  ? 'text-primary-500 border-primary-500 bg-primary-500/10'
                  : 'text-muted-500 hover:text-muted-600 dark:hover:text-muted-300 border-muted-50 dark:border-muted-900 hover:bg-muted-200 dark:hover:bg-muted-800'
              "
              @click.prevent.stop="activeFilterTab = 'filter-2'"
            >
              <Icon name="solar:tag-linear" class="size-5" />
              <span>Tipo</span>
              <Icon name="lucide:chevron-right" class="ms-auto size-4" />
            </button>

            <!-- Menu item - Valor -->
            <button
              type="button"
              class="tw-accessibility click-blur flex w-full cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 font-sans text-sm transition-all duration-300"
              :class="
                activeFilterTab === 'filter-3'
                  ? 'text-primary-500 border-primary-500 bg-primary-500/10'
                  : 'text-muted-500 hover:text-muted-600 dark:hover:text-muted-300 border-muted-50 dark:border-muted-900 hover:bg-muted-200 dark:hover:bg-muted-800'
              "
              @click.prevent.stop="activeFilterTab = 'filter-3'"
            >
              <Icon name="solar:dollar-linear" class="size-5" />
              <span>Valor</span>
              <Icon name="lucide:chevron-right" class="ms-auto size-4" />
            </button>

            <!-- Menu item - Fundo -->
            <button
              type="button"
              class="tw-accessibility click-blur flex w-full cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 font-sans text-sm transition-all duration-300"
              :class="
                activeFilterTab === 'filter-4'
                  ? 'text-primary-500 border-primary-500 bg-primary-500/10'
                  : 'text-muted-500 hover:text-muted-600 dark:hover:text-muted-300 border-muted-50 dark:border-muted-900 hover:bg-muted-200 dark:hover:bg-muted-800'
              "
              @click.prevent.stop="activeFilterTab = 'filter-4'"
            >
              <Icon name="solar:safe-square-linear" class="size-5" />
              <span>Fundo</span>
              <Icon name="lucide:chevron-right" class="ms-auto size-4" />
            </button>
          </div>

          <!-- Filtros -->
          <div class="col-span-8 min-h-[350px] p-6">
            <!-- Filter 1 - Data -->
            <div v-if="activeFilterTab === 'filter-1'">
              <div class="flex flex-col space-y-4">
                <BaseField label="Período">
                  <BaseSelect v-model="localFilters.dateRange" rounded="md">
                    <BaseSelectItem
                      v-for="option in dateRangeOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </BaseSelectItem>
                  </BaseSelect>
                </BaseField>

                <div v-if="localFilters.dateRange === 'custom'" class="grid grid-cols-2 gap-4">
                  <BaseField label="Data inicial">
                    <BaseInput
                      v-model="localFilters.dateFrom"
                      type="date"
                      rounded="md"
                    />
                  </BaseField>
                  <BaseField label="Data final">
                    <BaseInput
                      v-model="localFilters.dateTo"
                      type="date"
                      rounded="md"
                    />
                  </BaseField>
                </div>
              </div>
            </div>

            <!-- Filter 2 - Tipo -->
            <div v-else-if="activeFilterTab === 'filter-2'">
              <div class="flex flex-col space-y-4">
                <BaseField label="Tipo de transação">
                  <BaseSelect v-model="localFilters.transactionType" rounded="md">
                    <BaseSelectItem
                      v-for="option in transactionTypeOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </BaseSelectItem>
                  </BaseSelect>
                </BaseField>
              </div>
            </div>

            <!-- Filter 3 - Valor -->
            <div v-else-if="activeFilterTab === 'filter-3'">
              <div class="flex flex-col space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <BaseField label="Valor mínimo (R$)">
                    <BaseInput
                      v-model="localFilters.minAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      rounded="md"
                      placeholder="0,00"
                    />
                  </BaseField>
                  <BaseField label="Valor máximo (R$)">
                    <BaseInput
                      v-model="localFilters.maxAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      rounded="md"
                      placeholder="0,00"
                    />
                  </BaseField>
                </div>
              </div>
            </div>

            <!-- Filter 4 - Fundo -->
            <div v-else-if="activeFilterTab === 'filter-4'">
              <div class="flex flex-col space-y-4">
                <BaseField label="Selecionar fundo">
                  <BaseSelect v-model="localFilters.fundId" rounded="md" :disabled="loadingFunds">
                    <BaseSelectItem value="all">
                      {{ loadingFunds ? 'Carregando...' : 'Todos os fundos' }}
                    </BaseSelectItem>
                    <BaseSelectItem
                      v-for="fund in funds"
                      :key="fund.id"
                      :value="fund.id"
                    >
                      {{ fund.name }} ({{ fund.type }})
                    </BaseSelectItem>
                  </BaseSelect>
                </BaseField>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-between items-center pt-6 mt-6 border-t border-muted-200 dark:border-muted-700">
              <BaseButton
                variant="muted"
                size="sm"
                @click.prevent.stop="clearFilters"
              >
                <Icon name="lucide:x" class="size-4 me-2" />
                Limpar
              </BaseButton>

              <BaseButton
                variant="primary"
                size="sm"
                @click.prevent.stop="applyFilters"
              >
                <Icon name="lucide:check" class="size-4 me-2" />
                Aplicar Filtros
              </BaseButton>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  </div>

  <!-- Mobile filters placeholder -->
  <div class="md:hidden">
    <BaseButton
      rounded="md"
      size="sm"
      :variant="hasFilters ? 'primary' : 'default'"
      @click="$emit('mobile-filters')"
    >
      <Icon name="solar:filter-linear" class="size-4" />
      <span>Filtros</span>
      <BaseBadge v-if="hasFilters" variant="primary" size="xs" class="ml-2">
        {{ Object.keys(localFilters).filter(key => localFilters[key as keyof FilterData]).length }}
      </BaseBadge>
    </BaseButton>
  </div>
</template>
