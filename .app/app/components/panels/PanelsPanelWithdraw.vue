<script setup lang="ts">
import { FocusTrap } from '@headlessui/vue'
import { useApi } from '~/composables/useAuth'

interface Payload {
  userId: string
  amount: number
  type: string
  fundId: string
  referenceId?: string
  observations?: string
}

interface FormErrors {
  amount?: string
  fundId?: string
  referenceId?: string
  observations?: string
}

// Props
const props = withDefaults(
  defineProps<{
    data?: { id: string }
    action?: 'create' | 'edit'
  }>(),
  {
    data: undefined,
    action: 'create',
  },
)

// Emits
const emits = defineEmits<{
  save: [payload: Payload]
}>()

// Composables
const { close } = usePanels()
const toaster = useNuiToasts()
const { useCustomFetch } = useApi()

// Reactive state
const isLoading = ref(false)
const errors = ref<FormErrors>({})
const fundBalanceWarning = ref('')

// Form state
const payload = ref<Payload>({
  userId: props.data?.id || '',
  amount: 0,
  type: 'WITHDRAW',
  fundId: '',
  referenceId: '',
  observations: '',
})

// Adicionar opção de correção
const transactionTypes = [
  { value: 'WITHDRAW', label: 'Saque' },
  { value: 'CORRECTION', label: 'Correção' },
]

// Fundos disponíveis
const fundSources = ref<any[]>([])
const isLoadingFunds = ref(true)

// Função para buscar fundos disponíveis
async function fetchAvailableFunds() {
  isLoadingFunds.value = true
  try {
    const { data } = await useCustomFetch<any>('/transactions/available-funds', {
      method: 'GET',
    })
    fundSources.value = data
  }
  catch (error) {
    console.error('Erro ao buscar fundos:', error)
    toaster.add({
      title: 'Erro!',
      description: 'Erro ao carregar fundos disponíveis',
      icon: 'ph:warning-circle-fill',
      duration: 4000,
    })
  }
  finally {
    isLoadingFunds.value = false
  }
}

// Validation rules
function validateForm(): boolean {
  const newErrors: FormErrors = {}

  // Valor obrigatório
  if (!payload.value.amount || payload.value.amount <= 0) {
    newErrors.amount = 'Valor deve ser maior que zero'
  }

  // Fundo obrigatório
  if (!payload.value.fundId) {
    newErrors.fundId = 'Fonte do fundo é obrigatória'
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

// Reset form
function resetForm() {
  payload.value = {
    userId: props.data?.id || '',
    amount: 0,
    type: 'WITHDRAW',
    fundId: '',
    referenceId: '',
    observations: '',
  }
  errors.value = {}
  fundBalanceWarning.value = ''
}

// Clear specific error
function clearError(field: keyof FormErrors) {
  if (errors.value[field]) {
    delete errors.value[field]
  }
}

// Verificar saldo do fundo selecionado
function checkFundBalance() {
  fundBalanceWarning.value = ''

  if (payload.value.fundId && payload.value.amount > 0) {
    const selectedFund = fundSources.value.find(fund => fund.id === payload.value.fundId)

    if (selectedFund && payload.value.amount > selectedFund.availableAmount) {
      const deficit = payload.value.amount - selectedFund.availableAmount
      fundBalanceWarning.value = `⚠️ Atenção: Este saque excede o saldo disponível do fundo em R$ ${deficit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. O fundo ficará negativo após esta operação.`
    }
  }
}

function showToast(title: string, description: string, type: 'error' | 'success' = 'error') {
  toaster.add({
    title,
    description,
    icon: type === 'error' ? 'lucide:alert-triangle' : 'lucide:check-circle',
    duration: 3000,
  })
}

async function completeValidation() {
  if (isLoading.value)
    return

  // Validate form before proceeding
  if (!validateForm()) {
    showToast('Erro de Validação', 'Por favor, corrija os erros no formulário', 'error')
    return
  }

  isLoading.value = true

  try {
    // Prepare payload
    const cleanPayload: Payload = {
      userId: payload.value.userId,
      amount: payload.value.amount,
      type: payload.value.type,
      fundId: payload.value.fundId,
      referenceId: payload.value.referenceId || undefined,
      observations: payload.value.observations || undefined,
    }

    const { data } = await useCustomFetch<any>('/transactions', {
      method: 'POST',
      body: cleanPayload,
    })

    if (data.id) {
      showToast('Sucesso!', 'Saque processado com sucesso', 'success')
      emits('save', cleanPayload)
      resetForm()
      close()
    }
    else {
      throw new Error(data.message || 'Erro ao processar saque')
    }
  }
  catch (err: any) {
    console.error('Erro ao processar saque:', err)
    showToast('Erro!', err.message || 'Ocorreu um erro ao processar o saque', 'error')
  }
  finally {
    isLoading.value = false
  }
}
// Keyboard shortcuts
onKeyStroke('Escape', close)

// Watchers para verificar saldo quando valor ou fundo mudarem
watch(() => payload.value.amount, checkFundBalance)
watch(() => payload.value.fundId, checkFundBalance)

// Load funds on mount
onMounted(() => {
  fetchAvailableFunds()
})
</script>

<template>
  <div class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white w-200">
    <FocusTrap>
      <!-- Header -->
      <div class="border-muted-200 dark:border-muted-700 flex h-20 w-full items-center justify-between border-b px-6">
        <BaseHeading as="h3" size="xs" weight="semibold" class="text-muted-500 dark:text-muted-100 uppercase">
          Processar Saque
        </BaseHeading>

        <button
          type="button"
          class="nui-mask nui-mask-blob hover:bg-muted-100 focus:bg-muted-100 dark:hover:bg-muted-700 dark:focus:bg-muted-700 text-muted-700 dark:text-muted-400 flex size-10 cursor-pointer items-center justify-center outline-transparent transition-colors duration-300"
          @click="close"
        >
          <Icon name="lucide:arrow-right" class="size-4" />
        </button>
      </div>

      <!-- Content -->
      <div class="nui-slimscroll relative h-[calc(100dvh_-_5rem)] w-full overflow-y-auto overflow-x-hidden p-6">
        <BaseCard rounded="md" class="p-6 relative">
          <div class="space-y-6">
            <!-- Informações do Saque -->
            <div class="space-y-4">
              <BaseHeading as="h4" size="sm" weight="semibold" class="text-muted-600 dark:text-muted-300">
                Informações do Saque
              </BaseHeading>

              <BaseField
                label="Tipo da Transação"
                required
              >
                <BaseSelect
                  v-model="payload.type"
                  rounded="md"
                  placeholder="Selecione o tipo"
                >
                  <BaseSelectItem
                    v-for="type in transactionTypes"
                    :key="type.value"
                    :value="type.value"
                  >
                    {{ type.label }}
                  </BaseSelectItem>
                </BaseSelect>
              </BaseField>

              <BaseField
                label="Valor do Saque (R$)"
                :error="errors.amount"
                required
              >
                <BaseInput
                  v-model="payload.amount"
                  type="number"
                  step="0.01"
                  min="0"
                  rounded="md"
                  placeholder="Digite o valor do saque"
                  :error="!!errors.amount"
                  @input="clearError('amount')"
                />

                <!-- Aviso de saldo insuficiente -->
                <div v-if="fundBalanceWarning" class="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div class="flex">
                    <div class="flex-shrink-0">
                      <Icon name="lucide:alert-triangle" class="size-5 text-yellow-400" />
                    </div>
                    <div class="ml-3">
                      <p class="text-sm text-yellow-700">
                        {{ fundBalanceWarning }}
                      </p>
                    </div>
                  </div>
                </div>
              </BaseField>

              <BaseField
                label="Método de Pagamento"
                :error="errors.referenceId"
              >
                <BaseSelect
                  v-model="payload.referenceId"
                  rounded="md"
                  placeholder="Selecione o método de pagamento"
                  :error="!!errors.referenceId"
                  @input="clearError('referenceId')"
                >
                  <BaseSelectItem value="DINHEIRO">
                    Dinheiro
                  </BaseSelectItem>
                  <BaseSelectItem value="PIX">
                    PIX
                  </BaseSelectItem>
                  <BaseSelectItem value="TRANSFERENCIA">
                    Transferência Bancária
                  </BaseSelectItem>
                  <BaseSelectItem value="CARTAO">
                    Cartão
                  </BaseSelectItem>
                </BaseSelect>
              </BaseField>

              <BaseField
                label="Fonte do Fundo"
                :error="errors.fundId"
                required
              >
                <BaseSelect
                  v-model="payload.fundId"
                  rounded="md"
                  placeholder="Selecione a fonte do fundo"
                  :error="!!errors.fundId"
                  :disabled="isLoadingFunds"
                  @input="clearError('fundId')"
                >
                  <BaseSelectItem
                    v-for="fund in fundSources"
                    :key="fund.id"
                    :value="fund.id"
                  >
                    <span>
                      {{ fund.name }} ({{ fund.type }}) -
                      <span :class="fund.availableAmount < 0 ? 'text-red-500' : ''">
                        R$ {{ fund.availableAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
                      </span>
                    </span>
                  </BaseSelectItem>
                </BaseSelect>
                <div v-if="isLoadingFunds" class="text-sm text-muted-500 mt-1">
                  Carregando fundos disponíveis...
                </div>
              </BaseField>

              <BaseField
                label="Observações"
                :error="errors.observations"
              >
                <BaseTextarea
                  v-model="payload.observations"
                  rounded="md"
                  placeholder="Observações sobre o saque (opcional)"
                  :error="!!errors.observations"
                  rows="3"
                  @input="clearError('observations')"
                />
              </BaseField>
            </div>
          </div>
          <!-- Actions -->
          <div class="flex justify-between items-center pt-6 border-t border-muted-200 dark:border-muted-700">
            <BaseButton
              variant="muted"
              size="sm"
              :disabled="isLoading"
              @click="resetForm"
            >
              <Icon name="lucide:refresh-cw" class="size-4 me-2" />
              Limpar
            </BaseButton>

            <div class="flex gap-3">
              <BaseButton
                variant="muted"
                size="sm"
                :disabled="isLoading"
                @click="close"
              >
                <Icon name="lucide:x" class="size-4 me-2" />
                Cancelar
              </BaseButton>

              <BaseButton
                variant="primary"
                size="sm"
                :loading="isLoading"
                :disabled="isLoading"
                @click="completeValidation"
              >
                <Icon name="lucide:credit-card" class="size-4 me-2" />
                {{ isLoading ? 'Processando...' : 'Processar Saque' }}
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </div>
    </FocusTrap>
  </div>
</template>
