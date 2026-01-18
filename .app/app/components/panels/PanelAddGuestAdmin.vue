<script setup lang="ts">
import { FocusTrap } from '@headlessui/vue'
import { useApi } from '~/composables/useAuth'

interface Payload {
  name: string
  document: string
  invitedById: string
  observations: string
  day_id: string
}

interface FormErrors {
  name?: string
  document?: string
  invitedById?: string
}

interface User {
  id: string
  name: string
  email?: string
}

// Props
const props = withDefaults(
  defineProps<{
    data?: {
      dayId: string
      date: string
    }
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
const isLoadingUsers = ref(false)
const errors = ref<FormErrors>({})
const users = ref<User[]>([])

// Form state
const payload = ref<Payload>({
  name: '',
  document: '',
  invitedById: '',
  observations: '',
  day_id: props.data?.dayId || '',
})

const masks = ref({
  time: 'HH:mm',
  document: '###.###.###-##',
})

// Função para buscar usuários da API
const fetchUsers = async () => {
  if (isLoadingUsers.value) return
  
  isLoadingUsers.value = true
  
  try {
    const response = await useCustomFetch<any>('/users?limit=100', {
      method: 'GET',
    })
    
    if (response.data) {
      users.value = response.data.data || []
    } else {
      throw new Error(response.data.message || 'Erro ao carregar usuários')
    }
  } catch (error: any) {
    users.value = []
  } finally {
    isLoadingUsers.value = false
  }
}

// Carregar usuários quando o componente for montado
onMounted(() => {
  fetchUsers()
})

// Validation rules
const validateForm = (): boolean => {
  const newErrors: FormErrors = {}
  
  // Nome obrigatório
  if (!payload.value.name.trim()) {
    newErrors.name = 'Nome é obrigatório'
  } else if (payload.value.name.trim().length < 2) {
    newErrors.name = 'Nome deve ter pelo menos 2 caracteres'
  }
  
  // Documento opcional, mas se preenchido deve ter formato válido
  if (payload.value.document.trim()) {
    const cleanDoc = payload.value.document.replace(/\D/g, '')
    if (cleanDoc.length !== 11) {
      newErrors.document = 'CPF deve ter 11 dígitos quando preenchido'
    }
  }
  
  // Day ID obrigatório
  if (!payload.value.day_id.trim()) {
    newErrors.invitedById = 'ID do dia é obrigatório'
  }
  
  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

// Reset form
const resetForm = () => {
  payload.value = {
    name: '',
    document: '',
    invitedById: '',
    observations: '',
    day_id: props.data?.dayId || '',
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
    // Prepare payload with trimmed values
    const cleanPayload: any = {
      name: payload.value.name.trim(),
      day_id: payload.value.day_id.trim(),
    }

    // Adicionar campos opcionais apenas se preenchidos
    const document = payload.value.document.replace(/\D/g, '').trim()
    if (document) {
      cleanPayload.document = document
    }

    const invitedById = payload.value.invitedById.trim()
    if (invitedById) {
      cleanPayload.invitedById = invitedById
    }

    const observations = payload.value.observations.trim()
    if (observations) {
      cleanPayload.observations = observations
    }

    // Chamar API para criar convidado
    const response = await useCustomFetch<any>('/guests', {
      method: 'POST',
      body: cleanPayload,
    })
    
    if (response.data.success) {
      showToast('Sucesso!', 'Convidado adicionado com sucesso', 'success')
      emits('save', cleanPayload)
      resetForm()
      close()
    } else {
      throw new Error(response.data.message || 'Erro ao criar convidado')
    }
  } catch (error: any) {
    console.error('Erro ao salvar convidado:', error)
    showToast('Erro!', error.message || 'Ocorreu um erro ao salvar o convidado', 'error')
  } finally {
    isLoading.value = false
  }
}
// Keyboard shortcuts
onKeyStroke('Escape', close)

</script>

<template>
  <div class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white w-200">
    <FocusTrap>
      <!-- Header -->
      <div class="border-muted-200 dark:border-muted-700 flex h-20 w-full items-center justify-between border-b px-6">
        <BaseHeading as="h3" size="xs" weight="semibold" class="text-muted-500 dark:text-muted-100 uppercase">
          Adicionar Convidado
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
                Informações Pessoais
              </BaseHeading>
              
              <BaseField 
                label="Nome Completo" 
                :error="errors.name"
                required
              >
                <BaseInput
                  v-model="payload.name"
                  rounded="md"
                  placeholder="Digite o nome completo"
                  :error="!!errors.name"
                  @input="clearError('name')"
                />
              </BaseField>
              
              <BaseField 
                label="CPF (Opcional)" 
                :error="errors.document"
              >
                <BaseInput
                  v-model="payload.document"
                  rounded="md"
                  placeholder="000.000.000-00 (opcional)"
                  :masks="masks"
                  :error="!!errors.document"
                  @input="clearError('document')"
                />
              </BaseField>
            </div>

            <!-- Informações da Visita -->
            <div class="space-y-4">
              <BaseHeading as="h4" size="sm" weight="semibold" class="text-muted-600 dark:text-muted-300">
                Informações da Visita
              </BaseHeading>
              
              <BaseField 
                label="Convidado por (Opcional)" 
                :error="errors.invitedById"
              >
                <BaseSelect
                  v-model="payload.invitedById"
                  rounded="md"
                  placeholder="Selecione quem convidou (opcional)"
                  :error="!!errors.invitedById"
                  @update:model-value="clearError('invitedById')"
                >
                  <BaseSelectItem value="system" disabled>
                    <span class="text-muted-400">
                      {{ isLoadingUsers ? 'Carregando usuários...' : 'Selecione um usuário' }}
                    </span>
                  </BaseSelectItem>
                  <BaseSelectItem 
                    v-for="user in users" 
                    :key="user.id" 
                    :value="user.id"
                    class="py-2"
                  >
                    <div class="flex items-center gap-2">
                      <BaseAvatar 
                        :text="user.name.charAt(0).toUpperCase()" 
                        size="xs"
                        class="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
                      />
                      <div>
                        <span class="font-medium">{{ user.name }}</span>
                        <p v-if="user.email" class="text-xs text-muted-500">{{ user.email }}</p>
                      </div>
                    </div>
                  </BaseSelectItem>
                </BaseSelect>
              </BaseField>
              
              <BaseField label="Observações (Opcional)">
                <BaseTextarea
                  v-model="payload.observations"
                  rounded="md"
                  placeholder="Observações adicionais sobre o convidado..."
                  rows="3"
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
                <Icon name="lucide:user-plus" class="size-4 me-2" />
                {{ isLoading ? 'Salvando...' : 'Adicionar Convidado' }}
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </div>
    </FocusTrap>
  </div>
</template>

