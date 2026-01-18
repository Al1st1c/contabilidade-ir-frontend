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

// Validação do formulário
const VALIDATION_TEXT = {
  NAME_REQUIRED: 'Nome é obrigatório',
  NAME_MIN: 'Nome deve ter pelo menos 2 caracteres',
  NAME_MAX: 'Nome deve ter no máximo 100 caracteres',
  TYPE_REQUIRED: 'Tipo é obrigatório',
}

const zodSchema = z.object({
  name: z.string()
    .min(1, VALIDATION_TEXT.NAME_REQUIRED)
    .min(2, VALIDATION_TEXT.NAME_MIN)
    .max(100, VALIDATION_TEXT.NAME_MAX),
  type: z.enum(['money', 'bank'], {
    errorMap: () => ({ message: VALIDATION_TEXT.TYPE_REQUIRED })
  }),
})

type FormInput = z.infer<typeof zodSchema>

const validationSchema = toTypedSchema(zodSchema)
const initialValues = {
  name: '',
  type: 'money' as const,
} satisfies FormInput

const {
  handleSubmit,
  isSubmitting,
  setFieldError,
  resetForm,
} = useForm({
  validationSchema,
  initialValues,
})

// Opções de tipo de fundo
const fundTypes = [
  { value: 'money', label: 'Dinheiro' },
  { value: 'bank', label: 'Banco' },
]

// Função para enviar o formulário
const onSubmit = handleSubmit(async (values) => {
  try {
    const { data } = await useCustomFetch<any>('/funds', {
      method: 'POST',
      body: {
        name: values.name,
        type: values.type,
      },
    })

    if (data.success) {
      toaster.add({
        title: 'Sucesso',
        description: 'Fundo criado com sucesso!',
        icon: 'ph:check-circle-fill',
        progress: true,
      })
      
      resetForm()
      emits('success')
      emits('close')
    } else {
      throw new Error(data.message || 'Erro ao criar fundo')
    }
  } catch (error: any) {
    console.error('Erro ao criar fundo:', error)
    
    // Verifica se é erro de validação específico
    if (error.message?.includes('já existe') || error.message?.includes('nome')) {
      setFieldError('name', error.message)
    } else {
      toaster.add({
        title: 'Erro',
        description: error.message || 'Erro ao criar fundo. Tente novamente.',
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
    }
  }
})

</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white"
    trapped
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
        Adicionar Fundo
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
            Novo Fundo
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
            Crie um novo fundo para gerenciar recursos financeiros
          </BaseParagraph>
        </div>

        <!-- Nome do Fundo -->
        <Field
          v-slot="{ field, errorMessage, handleChange, handleBlur }"
          name="name"
        >
          <BaseField
            v-slot="{ inputAttrs, inputRef }"
            label="Nome do Fundo"
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
              placeholder="Ex: Caixa Principal, Banco Itaú..."
              rounded="lg"
              :classes="{
                input: 'h-12',
              }"
              @update:model-value="handleChange"
              @blur="handleBlur"
            />
          </BaseField>
        </Field>

        <!-- Tipo do Fundo -->
        <Field
          v-slot="{ field, errorMessage, handleChange }"
          name="type"
        >
          <BaseField
            v-slot="{ inputAttrs }"
            label="Tipo do Fundo"
            :state="errorMessage ? 'error' : 'idle'"
            :error="errorMessage"
            :disabled="isSubmitting"
            required
          >
            <BaseSelect
              v-bind="inputAttrs"
              v-model="field.value"
              rounded="lg"
              @update:model-value="handleChange"
            >
              <BaseSelectItem
                v-for="type in fundTypes"
                :key="type.value"
                :value="type.value"
              >
                {{ type.label }}
              </BaseSelectItem>
            </BaseSelect>
          </BaseField>
        </Field>

        <!-- Informações sobre tipos -->
        <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4">
          <BaseHeading
            as="h5"
            size="xs"
            weight="medium"
            class="text-muted-700 dark:text-muted-300 mb-2"
          >
            Tipos de Fundo
          </BaseHeading>
          <div class="space-y-2">
            <div class="flex items-start gap-2">
              <div class="bg-primary-500 size-2 rounded-full mt-2" />
              <div>
                <BaseParagraph
                  size="sm"
                  weight="medium"
                  class="text-muted-700 dark:text-muted-300"
                >
                  Dinheiro
                </BaseParagraph>
                <BaseParagraph size="xs" class="text-muted-500">
                  Para fundos em espécie, caixa físico
                </BaseParagraph>
              </div>
            </div>
            <div class="flex items-start gap-2">
              <div class="bg-success-500 size-2 rounded-full mt-2" />
              <div>
                <BaseParagraph
                  size="sm"
                  weight="medium"
                  class="text-muted-700 dark:text-muted-300"
                >
                  Banco
                </BaseParagraph>
                <BaseParagraph size="xs" class="text-muted-500">
                  Para contas bancárias, cartões
                </BaseParagraph>
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
            <span>Criar Fundo</span>
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
            O fundo será criado e ficará disponível imediatamente para operações
          </BaseParagraph>
        </div>
      </form>
    </div>
  </FocusScope>
</template>
