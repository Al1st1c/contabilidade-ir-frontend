<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Field, useForm } from 'vee-validate'
import { z } from 'zod'
import { useApi } from '~/composables/useAuth'

const emits = defineEmits<{
  close: []
  success: []
}>()

onKeyStroke('Escape', () => emits('close'))

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

// Estados reativos
const operationDays = ref([])
const loadingOperationDays = ref(false)
const prizes = ref([{ name: '', type: 'PHYSICAL', value: 0, quantity: 1 }])

// Validação do formulário
const VALIDATION_TEXT = {
  NAME_REQUIRED: 'Nome é obrigatório',
  NAME_MIN: 'Nome deve ter pelo menos 2 caracteres',
  NAME_MAX: 'Nome deve ter no máximo 100 caracteres',
  DESCRIPTION_MAX: 'Descrição deve ter no máximo 500 caracteres',
  OPERATION_DAY_REQUIRED: 'Dia de operação é obrigatório',
  HOURS_PER_TICKET_REQUIRED: 'Horas por bilhete é obrigatório',
  HOURS_PER_TICKET_MIN: 'Horas por bilhete deve ser maior que 0',
  TICKETS_PER_CYCLE_REQUIRED: 'Bilhetes por ciclo é obrigatório',
  TICKETS_PER_CYCLE_MIN: 'Bilhetes por ciclo deve ser pelo menos 1',
  TICKETS_PER_CYCLE_MAX: 'Bilhetes por ciclo deve ser no máximo 10',
  PRIZE_NAME_REQUIRED: 'Nome do prêmio é obrigatório',
  PRIZE_QUANTITY_REQUIRED: 'Quantidade do prêmio é obrigatória',
  PRIZE_QUANTITY_MIN: 'Quantidade deve ser pelo menos 1',
}

const zodSchema = z.object({
  name: z.string()
    .min(1, VALIDATION_TEXT.NAME_REQUIRED)
    .min(2, VALIDATION_TEXT.NAME_MIN)
    .max(100, VALIDATION_TEXT.NAME_MAX),
  description: z.string()
    .max(500, VALIDATION_TEXT.DESCRIPTION_MAX)
    .optional(),
  operationDayId: z.string()
    .min(1, VALIDATION_TEXT.OPERATION_DAY_REQUIRED),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  hoursPerTicket: z.string()
    .min(1, 'Horas por bilhete é obrigatório')
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val >= 0.1, 'Deve ser pelo menos 0.1 horas'),
  ticketsPerCycle: z.string()
    .min(1, 'Bilhetes por ciclo é obrigatório')
    .transform((val) => parseInt(val))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 10, 'Deve ser entre 1 e 10 bilhetes'),
  allowMultipleWins: z.boolean(),
})

type FormInput = {
  name: string
  description: string
  operationDayId: string
  startDate: string
  endDate: string
  hoursPerTicket: string
  ticketsPerCycle: string
  allowMultipleWins: boolean
}

const validationSchema = toTypedSchema(zodSchema)
const initialValues = {
  name: '',
  description: '',
  operationDayId: '',
  startDate: '',
  endDate: '',
  hoursPerTicket: '2',
  ticketsPerCycle: '1',
  allowMultipleWins: false,
} satisfies FormInput

const {
  handleSubmit,
  isSubmitting,
  setFieldError,
  resetForm,
  values,
} = useForm({
  validationSchema,
  initialValues,
})

// Opções de tipo de prêmio
const prizeTypes = [
  { value: 'PHYSICAL', label: 'Físico' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'BONUS', label: 'Bônus' },
  { value: 'CREDITS', label: 'Créditos' },
]

// Buscar dias de operação
async function getOperationDays() {
  try {
    loadingOperationDays.value = true
    const { data } = await useCustomFetch<any>('/operations/days', {
      method: 'GET',
    })
    operationDays.value = data?.data || []
  } catch (error) {
    console.error('Erro ao buscar dias de operação:', error)
    toaster.add({
      title: 'Erro',
      description: 'Erro ao carregar dias de operação',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  } finally {
    loadingOperationDays.value = false
  }
}

// Adicionar prêmio
function addPrize() {
  prizes.value.push({ name: '', type: 'PHYSICAL', value: 0, quantity: 1 })
}

// Remover prêmio
function removePrize(index: number) {
  if (prizes.value.length > 1) {
    prizes.value.splice(index, 1)
  }
}

// Validar prêmios
function validatePrizes() {
  for (let i = 0; i < prizes.value.length; i++) {
    const prize = prizes.value[i]
    if (!prize?.name.trim()) {
      toaster.add({
        title: 'Erro',
        description: `Nome do prêmio ${i + 1} é obrigatório`,
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
      return false
    }
    if (prize.quantity < 1) {
      toaster.add({
        title: 'Erro',
        description: `Quantidade do prêmio ${i + 1} deve ser pelo menos 1`,
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
      return false
    }
  }
  return true
}

// Função para enviar o formulário
const onSubmit = handleSubmit(async (values) => {
  try {
    // Validar prêmios
    if (!validatePrizes()) {
      return
    }

    const { data } = await useCustomFetch<any>('/raffles', {
      method: 'POST',
      body: {
        name: values.name,
        description: values.description || undefined,
        operationDayId: values.operationDayId,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        hoursPerTicket: Number(values.hoursPerTicket),
        ticketsPerCycle: Number(values.ticketsPerCycle),
        allowMultipleWins: values.allowMultipleWins,
        prizes: prizes.value.map(prize => ({
          name: prize.name,
          type: prize.type,
          value: prize.value || undefined,
          quantity: prize.quantity,
        })),
      },
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Sorteio criado com sucesso!',
      icon: 'ph:check-circle-fill',
      progress: true,
    })
    
    resetForm()
    prizes.value = [{ name: '', type: 'PHYSICAL', value: 0, quantity: 1 }]
    emits('success')
    emits('close')
  } catch (error: any) {
    console.error('Erro ao criar sorteio:', error)
    
    // Verifica se é erro de validação específico
    if (error.message?.includes('nome') || error.message?.includes('já existe')) {
      setFieldError('name', error.message)
    } else {
      toaster.add({
        title: 'Erro',
        description: error.message || 'Erro ao criar sorteio. Tente novamente.',
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
    }
  }
})

onMounted(() => {
  getOperationDays()
})
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white"
    trapped
    style="width: 40%"
    loop
  >
    <div
      class="border-muted-200 dark:border-muted-700 flex h-20 w-full items-center justify-between border-b px-6"
    >
      <BaseHeading
        as="h3"
        size="xs"
        weight="semibold"
        class="text-muted-500 dark:text-muted-100 uppercase"
      >
        Criar Sorteio
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

    <div
      class="nui-slimscroll relative h-[calc(100dvh_-_80px)] w-full overflow-y-auto p-6"
    >
      <!-- Form -->
      <form
        method="POST"
        action=""
        class="space-y-6"
        novalidate
        @submit.prevent="onSubmit"
      >
        <!-- Header -->
        <div class="mb-6">
          <BaseHeading
            as="h4"
            size="lg"
            weight="medium"
            class="text-muted-900 dark:text-muted-100 mb-2"
          >
            Novo Sorteio
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
            Configure um novo sorteio com prêmios e regras específicas
          </BaseParagraph>
        </div>

        <!-- Informações Básicas -->
        <div class="space-y-6">
          <BaseHeading
            as="h5"
            size="sm"
            weight="medium"
            class="text-muted-700 dark:text-muted-300"
          >
            Informações Básicas
          </BaseHeading>

          <!-- Nome do Sorteio -->
          <Field
            v-slot="{ field, errorMessage, handleChange, handleBlur }"
            name="name"
          >
            <BaseField
              v-slot="{ inputAttrs, inputRef }"
              label="Nome do Sorteio"
              :state="errorMessage ? 'error' : 'idle'"
              :error="errorMessage"
              :disabled="isSubmitting"
              required
            >
              <BaseInput
                :ref="inputRef"
                v-bind="inputAttrs"
                :model-value="field.value"
                type="text"
                placeholder="Ex: Sorteio de Natal, Promoção Especial..."
                rounded="lg"
                :classes="{
                  input: 'h-12',
                }"
                @update:model-value="handleChange"
                @blur="handleBlur"
              />
            </BaseField>
          </Field>

          <!-- Descrição -->
          <Field
            v-slot="{ field, errorMessage, handleChange, handleBlur }"
            name="description"
          >
            <BaseField
              v-slot="{ inputAttrs, inputRef }"
              label="Descrição (Opcional)"
              :state="errorMessage ? 'error' : 'idle'"
              :error="errorMessage"
              :disabled="isSubmitting"
            >
              <BaseTextarea
                :ref="inputRef"
                v-bind="inputAttrs"
                :model-value="field.value"
                placeholder="Descreva o sorteio, regras especiais, etc..."
                rounded="lg"
                rows="3"
                @update:model-value="handleChange"
                @blur="handleBlur"
              />
            </BaseField>
          </Field>

          <!-- Dia de Operação -->
          <Field
            v-slot="{ field, errorMessage, handleChange }"
            name="operationDayId"
          >
            <BaseField
              v-slot="{ inputAttrs }"
              label="Dia de Operação"
              :state="errorMessage ? 'error' : 'idle'"
              :error="errorMessage"
              :disabled="isSubmitting || loadingOperationDays"
              required
            >
              <BaseSelect
                v-bind="inputAttrs"
                v-model="field.value"
                rounded="lg"
                placeholder="Selecione o dia de operação"
                @update:model-value="handleChange"
              >
                <BaseSelectItem
                  v-for="day in operationDays"
                  :key="day.id"
                  :value="day.id"
                >
                  {{ new Date(day.date_opened).toLocaleDateString('pt-BR') }} 
                  - {{ day.user?.name }}
                  <span v-if="!day.date_closed" class="text-success-600 font-medium"> (Aberto)</span>
                  <span v-else class="text-muted-500"> (Fechado)</span>
                </BaseSelectItem>
              </BaseSelect>
            </BaseField>
          </Field>
        </div>

        <!-- Configurações de Tempo -->
        <div class="space-y-6">
          <BaseHeading
            as="h5"
            size="sm"
            weight="medium"
            class="text-muted-700 dark:text-muted-300"
          >
            Configurações de Tempo
          </BaseHeading>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Data de Início -->
            <Field
              v-slot="{ field, errorMessage, handleChange, handleBlur }"
              name="startDate"
            >
              <BaseField
                v-slot="{ inputAttrs, inputRef }"
                label="Data de Início (Opcional)"
                :state="errorMessage ? 'error' : 'idle'"
                :error="errorMessage"
                :disabled="isSubmitting"
              >
                <BaseInput
                  :ref="inputRef"
                  v-bind="inputAttrs"
                  :model-value="field.value"
                  type="datetime-local"
                  rounded="lg"
                  :classes="{
                    input: 'h-12',
                  }"
                  @update:model-value="handleChange"
                  @blur="handleBlur"
                />
              </BaseField>
            </Field>

            <!-- Data de Fim -->
            <Field
              v-slot="{ field, errorMessage, handleChange, handleBlur }"
              name="endDate"
            >
              <BaseField
                v-slot="{ inputAttrs, inputRef }"
                label="Data de Fim (Opcional)"
                :state="errorMessage ? 'error' : 'idle'"
                :error="errorMessage"
                :disabled="isSubmitting"
              >
                <BaseInput
                  :ref="inputRef"
                  v-bind="inputAttrs"
                  :model-value="field.value"
                  type="datetime-local"
                  rounded="lg"
                  :classes="{
                    input: 'h-12',
                  }"
                  @update:model-value="handleChange"
                  @blur="handleBlur"
                />
              </BaseField>
            </Field>
          </div>
        </div>

        <!-- Configurações de Bilhetes -->
        <div class="space-y-6">
          <BaseHeading
            as="h5"
            size="sm"
            weight="medium"
            class="text-muted-700 dark:text-muted-300"
          >
            Configurações de Bilhetes
          </BaseHeading>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Horas por Bilhete -->
            <Field
              v-slot="{ field, errorMessage, handleChange, handleBlur }"
              name="hoursPerTicket"
            >
              <BaseField
                v-slot="{ inputAttrs, inputRef }"
                label="Horas para Ganhar 1 Bilhete"
                :state="errorMessage ? 'error' : 'idle'"
                :error="errorMessage"
                :disabled="isSubmitting"
                required
              >
                <BaseInput
                  :ref="inputRef"
                  v-bind="inputAttrs"
                  :model-value="field.value"
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="2.0"
                  rounded="lg"
                  :classes="{
                    input: 'h-12',
                  }"
                  @update:model-value="handleChange"
                  @blur="handleBlur"
                />
              </BaseField>
            </Field>

            <!-- Bilhetes por Ciclo -->
            <Field
              v-slot="{ field, errorMessage, handleChange, handleBlur }"
              name="ticketsPerCycle"
            >
              <BaseField
                v-slot="{ inputAttrs, inputRef }"
                label="Bilhetes por Ciclo"
                :state="errorMessage ? 'error' : 'idle'"
                :error="errorMessage"
                :disabled="isSubmitting"
                required
              >
                <BaseInput
                  :ref="inputRef"
                  v-bind="inputAttrs"
                  :model-value="field.value"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="1"
                  rounded="lg"
                  :classes="{
                    input: 'h-12',
                  }"
                  @update:model-value="handleChange"
                  @blur="handleBlur"
                />
              </BaseField>
            </Field>
          </div>

          <!-- Permitir Múltiplas Vitórias -->
          <Field
            v-slot="{ field, handleChange }"
            name="allowMultipleWins"
          >
            <BaseField
              v-slot="{ inputAttrs }"
              label="Permitir Múltiplas Vitórias"
              :disabled="isSubmitting"
            >
              <div class="flex items-center gap-3">
                <input
                  v-bind="inputAttrs"
                  v-model="field.value"
                  type="checkbox"
                  class="size-4 rounded border-muted-300 text-primary-600 focus:ring-primary-500"
                  @change="handleChange"
                />
                <span class="text-sm text-muted-600 dark:text-muted-400">
                  Permitir que um mesmo cliente ganhe mais de uma vez
                </span>
              </div>
            </BaseField>
          </Field>
        </div>

        <!-- Prêmios -->
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <BaseHeading
              as="h5"
              size="sm"
              weight="medium"
              class="text-muted-700 dark:text-muted-300"
            >
              Prêmios
            </BaseHeading>
            <BaseButton
              type="button"
              variant="muted"
              size="sm"
              rounded="lg"
              @click="addPrize"
            >
              <Icon name="lucide:plus" class="size-4" />
              <span>Adicionar Prêmio</span>
            </BaseButton>
          </div>

          <div
            v-for="(prize, index) in prizes"
            :key="index"
            class="border border-muted-200 dark:border-muted-700 rounded-lg p-4 space-y-4"
          >
            <div class="flex items-center justify-between">
              <BaseHeading
                as="h6"
                size="xs"
                weight="medium"
                class="text-muted-600 dark:text-muted-400"
              >
                Prêmio {{ index + 1 }}
              </BaseHeading>
              <BaseButton
                v-if="prizes.length > 1"
                type="button"
                variant="destructive"
                size="xs"
                rounded="lg"
                @click="removePrize(index)"
              >
                <Icon name="lucide:trash-2" class="size-3" />
              </BaseButton>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Nome do Prêmio -->
              <div>
                <BaseField
                  label="Nome do Prêmio"
                  :disabled="isSubmitting"
                  required
                >
                  <BaseInput
                    v-model="prize.name"
                    type="text"
                    placeholder="Ex: iPhone 15, R$ 1000..."
                    rounded="lg"
                    :classes="{
                      input: 'h-10',
                    }"
                  />
                </BaseField>
              </div>

              <!-- Tipo do Prêmio -->
              <div>
                <BaseField
                  label="Tipo"
                  :disabled="isSubmitting"
                  required
                >
                  <BaseSelect
                    v-model="prize.type"
                    rounded="lg"
                  >
                    <BaseSelectItem
                      v-for="type in prizeTypes"
                      :key="type.value"
                      :value="type.value"
                    >
                      {{ type.label }}
                    </BaseSelectItem>
                  </BaseSelect>
                </BaseField>
              </div>

              <!-- Valor do Prêmio -->
              <div>
                <BaseField
                  label="Valor (Opcional)"
                  :disabled="isSubmitting"
                >
                  <BaseInput
                    v-model="prize.value"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    rounded="lg"
                    :classes="{
                      input: 'h-10',
                    }"
                  />
                </BaseField>
              </div>

              <!-- Quantidade -->
              <div>
                <BaseField
                  label="Quantidade"
                  :disabled="isSubmitting"
                  required
                >
                  <BaseInput
                    v-model="prize.quantity"
                    type="number"
                    min="1"
                    placeholder="1"
                    rounded="lg"
                    :classes="{
                      input: 'h-10',
                    }"
                  />
                </BaseField>
              </div>
            </div>
          </div>
        </div>

        <!-- Botões de Ação -->
        <div class="flex items-center gap-3 pt-4">
          <BaseButton
            :disabled="isSubmitting"
            :loading="isSubmitting"
            type="submit"
            variant="primary"
            rounded="lg"
            class="flex-1"
          >
            <Icon name="lucide:plus" class="size-4" />
            <span>Criar Sorteio</span>
          </BaseButton>
          
          <BaseButton
            type="button"
            variant="muted"
            rounded="lg"
            class="flex-1"
            @click="emits('close')"
          >
            <Icon name="lucide:x" class="size-4" />
            <span>Cancelar</span>
          </BaseButton>
        </div>

        <!-- Aviso -->
        <div class="border-muted-200 dark:border-muted-700 border-t pt-4">
          <BaseParagraph size="xs" class="text-muted-400 text-center">
            O sorteio será criado e ficará disponível para ativação
          </BaseParagraph>
        </div>
      </form>
    </div>
  </FocusScope>
</template>
