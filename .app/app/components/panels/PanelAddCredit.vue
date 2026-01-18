<script setup lang="ts">
import { FocusTrap } from '@headlessui/vue'

interface Payload {
  userId: string
  amount: number
  type: string
  fundId: string
  referenceId?: string
  rollover?: boolean
  rolloverMultiplier?: number
  observations?: string
}

interface FormErrors {
  userId?: string
  amount?: string
  type?: string
  fundId?: string
  rolloverMultiplier?: string
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
import { useApi } from '~/composables/useAuth'
const { useCustomFetch } = useApi()

// Reactive state
const isLoading = ref(false)
const errors = ref<FormErrors>({})

// Form state
const payload = ref<Payload>({
  userId: props.data?.id || '',
  amount: 0,
  type: 'DEPOSIT',
  fundId: '',
  referenceId: '',
  rollover: false,
  rolloverMultiplier: 1,
  observations: '',
})

// Fundos disponíveis
const fundSources = ref<any[]>([])
const isLoadingFunds = ref(true)

// Função para buscar fundos disponíveis
async function fetchAvailableFunds() {
  isLoadingFunds.value = true
  try {
    const { data } = await useCustomFetch<any>('/transactions/available-funds', {
      method: 'GET'
    })
    fundSources.value = data
  } catch (error) {
    console.error('Erro ao buscar fundos:', error)
    toaster.add({
      title: 'Erro!',
      description: 'Erro ao carregar fundos disponíveis',
      icon: 'ph:warning-circle-fill',
      duration: 4000,
    })
  } finally {
    isLoadingFunds.value = false
  }
}

// Validation rules
const validateForm = (): boolean => {
  const newErrors: FormErrors = {}
  
  // Valor obrigatório
  if (!payload.value.amount || payload.value.amount <= 0) {
    newErrors.amount = 'Valor deve ser maior que zero'
  }
  
  // Tipo obrigatório
  if (!payload.value.type) {
    newErrors.type = 'Tipo da transação é obrigatório'
  }
  
  // Fundo obrigatório
  if (!payload.value.fundId) {
    newErrors.fundId = 'Fonte do fundo é obrigatória'
  }
  
  // Multiplicador de rollover se rollover estiver ativo
  if (payload.value.rollover && (!payload.value.rolloverMultiplier || payload.value.rolloverMultiplier <= 0)) {
    newErrors.rolloverMultiplier = 'Multiplicador de rollover é obrigatório quando rollover está ativo'
  }
  
  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

// Reset form
const resetForm = () => {
  payload.value = {
    userId: props.data?.id || '',
    amount: 0,
    type: 'DEPOSIT',
    fundId: '',
    referenceId: '',
    rollover: false,
    rolloverMultiplier: 1,
    observations: '',
  }
  errors.value = {}
}

// Clear specific error
const clearError = (field: keyof FormErrors) => {
  if (errors.value[field]) {
    delete errors.value[field]
  }
}


const showToast = (title: string, description: string, type: 'error' | 'success' = 'error') => {
  toaster.add({
    title,
    description,
    icon: type === 'error' ? 'lucide:alert-triangle' : 'lucide:check-circle',
    duration: 3000,
  })
}

const completeValidation = async () => {
  if (isLoading.value) return
  
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
      rollover: payload.value.rollover || false,
      rolloverMultiplier: payload.value.rollover ? payload.value.rolloverMultiplier : undefined,
      observations: payload.value.observations || undefined,
    }

    const { data } = await useCustomFetch<any>('/transactions', {
      method: 'POST',
      body: cleanPayload
    })

    if (data.id) {
      showToast('Sucesso!', 'Transação adicionada com sucesso', 'success')
      emits('save', cleanPayload)
      resetForm()
      close()
    } else {
      throw new Error(data.message || 'Erro ao criar transação')
    }
  } catch (err: any) {
    console.error('Erro ao criar transação:', err)
    showToast('Erro!', err.message || 'Ocorreu um erro ao salvar a transação', 'error')
  } finally {
    isLoading.value = false
  }
}
// Keyboard shortcuts
onKeyStroke('Escape', close)

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
          Adicionar Nova Transação
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
            <!-- Informações Pessoais -->
            <div class="space-y-4">
              <BaseHeading as="h4" size="sm" weight="semibold" class="text-muted-600 dark:text-muted-300">
                Informações da Transação
              </BaseHeading>
              
              <BaseField 
                label="Valor (R$)" 
                :error="errors.amount"
                required
              >
                <BaseInput
                  v-model="payload.amount"
                  type="number"
                  step="0.01"
                  min="0"
                  rounded="md"
                  placeholder="Digite o valor da transação"
                  :error="!!errors.amount"
                  @input="clearError('amount')"
                />
              </BaseField>
              
              <BaseField 
                label="Tipo da Transação" 
                :error="errors.type"
                required
              >
                <BaseSelect
                  v-model="payload.type"
                  rounded="md"
                  placeholder="Selecione o tipo da transação"
                  :error="!!errors.type"
                  @input="clearError('type')"
                >
                  <BaseSelectItem value="DEPOSIT">
                    Depósito
                  </BaseSelectItem>
                  <BaseSelectItem value="CORRECTION">
                    Correção
                  </BaseSelectItem>
                  <BaseSelectItem value="CASHBACK">
                    Cashback
                  </BaseSelectItem>
                  <BaseSelectItem value="BONUS">
                    Bônus
                  </BaseSelectItem>
                  <BaseSelectItem value="FREE_CREDITS">
                    Créditos Grátis
                  </BaseSelectItem>
                </BaseSelect>
              </BaseField>

              <BaseField 
                label="ROLLOVER"
                v-if="payload.type === 'DEPOSIT' || payload.type === 'CORRECTION'"
              >
                <BaseCheckbox v-model="payload.rollover" label="Ativar rollover" />
              </BaseField>
              <BaseField v-if="payload.rollover" 
                label="Multiplicador de ROLLOVER" 
                :error="errors.rolloverMultiplier"
                required
              >
                <BaseInput 
                  v-model="payload.rolloverMultiplier" 
                  type="number"
                  min="1"
                  max="100"
                  rounded="md" 
                  placeholder="Digite o multiplicador de ROLLOVER" 
                  :error="!!errors.rolloverMultiplier" 
                  @input="clearError('rolloverMultiplier')" 
                />
              </BaseField>

              <BaseField 
                label="Método de Pagamento" 
                v-if="payload.type === 'DEPOSIT' || payload.type === 'CORRECTION'"
              >
                <BaseSelect
                  v-model="payload.referenceId"
                  rounded="md"
                  placeholder="Selecione o método de pagamento"
                >
                  <BaseSelectItem value="DINHEIRO">
                    Dinheiro
                  </BaseSelectItem>
                  <BaseSelectItem value="CARTAO_CREDITO">
                    Cartão de Crédito
                  </BaseSelectItem>
                  <BaseSelectItem value="CARTAO_DEBITO">
                    Cartão de Débito
                  </BaseSelectItem>
                  <BaseSelectItem value="PIX">
                    PIX
                  </BaseSelectItem>
                </BaseSelect>
              </BaseField>

              <BaseField 
                label="Fonte do Fundo" 
                :error="errors.fundId"
                v-if="payload.type === 'DEPOSIT' || payload.type === 'CORRECTION'"
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
                  placeholder="Digite as observações" 
                  :error="!!errors.observations" 
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
              @click="resetForm"
              :disabled="isLoading"
            >
              <Icon name="lucide:refresh-cw" class="size-4 me-2" />
              Limpar
            </BaseButton>
            
            <div class="flex gap-3">
              <BaseButton 
                variant="muted" 
                size="sm" 
                @click="close"
                :disabled="isLoading"
              >
                <Icon name="lucide:x" class="size-4 me-2" />
                Cancelar
              </BaseButton>
              
              <BaseButton 
                variant="primary" 
                size="sm" 
                @click="completeValidation"
                :loading="isLoading"
                :disabled="isLoading"
              >
                <Icon name="lucide:plus" class="size-4 me-2" />
                {{ isLoading ? 'Processando...' : 'Adicionar Transação' }}
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </div>
    </FocusTrap>
  </div>
</template>

