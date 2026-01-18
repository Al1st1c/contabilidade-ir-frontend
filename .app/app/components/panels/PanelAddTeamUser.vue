<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

interface Role {
  id: string
  name: string
  description: string
}

const props = withDefaults(
  defineProps<{
    onSuccess?: () => void
  }>(),
  {
    onSuccess: undefined,
  },
)

const emits = defineEmits<{
  close: []
}>()

onKeyStroke('Escape', () => emits('close'))

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

// Estado do formulário
const form = ref({
  name: '',
  document: '',
  phone: '',
  email: '',
  password: '',
  roleId: 'placeholder'
})

const loading = ref(false)
const roles = ref<Role[]>([])
const loadingRoles = ref(false)

// Validação
const errors = ref<Record<string, string>>({})

// Buscar roles disponíveis
async function fetchRoles() {
  loadingRoles.value = true
  try {
    const { data } = await useCustomFetch<any>('/users/team-roles', {
      method: 'GET'
    })
    
    if (data.success) {
      roles.value = data.data
    }
  } catch (error) {
    console.error('Erro ao buscar roles:', error)
    toaster.add({
      title: 'Erro',
      description: 'Erro ao carregar cargos disponíveis',
      icon: 'lucide:alert-triangle',
      duration: 5000,
    })
  } finally {
    loadingRoles.value = false
  }
}

// Validar formulário
function validateForm(): boolean {
  errors.value = {}
  
  if (!form.value.name.trim()) {
    errors.value.name = 'Nome é obrigatório'
  }
  
  if (!form.value.document.trim()) {
    errors.value.document = 'Documento é obrigatório'
  }
  
  if (!form.value.phone.trim()) {
    errors.value.phone = 'Telefone é obrigatório'
  }
  
  if (!form.value.email.trim()) {
    errors.value.email = 'Email é obrigatório'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Email deve ter um formato válido'
  }
  
  if (!form.value.password.trim()) {
    errors.value.password = 'Senha é obrigatória'
  } else if (form.value.password.length < 6) {
    errors.value.password = 'Senha deve ter pelo menos 6 caracteres'
  }
  
  if (!form.value.roleId || form.value.roleId === 'placeholder') {
    errors.value.roleId = 'Cargo é obrigatório'
  }
  
  return Object.keys(errors.value).length === 0
}

// Formatar CPF
function formatCPF(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// Formatar telefone
function formatPhone(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  if (cleanValue.length === 11) {
    return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (cleanValue.length === 10) {
    return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return value
}

// Aplicar máscaras em tempo real
watch(() => form.value.document, (newValue) => {
  const cleanValue = newValue.replace(/\D/g, '')
  if (cleanValue.length <= 11) {
    form.value.document = formatCPF(newValue)
  }
})

watch(() => form.value.phone, (newValue) => {
  const cleanValue = newValue.replace(/\D/g, '')
  if (cleanValue.length <= 11) {
    form.value.phone = formatPhone(newValue)
  }
})

// Salvar usuário
async function saveUser() {
  if (!validateForm()) return
  
  loading.value = true
  
  try {
    const { data } = await useCustomFetch<any>('/users/team', {
      method: 'POST',
      body: form.value
    })
    
    if (data.success) {
      toaster.add({
        title: 'Sucesso',
        description: 'Usuário da equipe criado com sucesso!',
        icon: 'lucide:check-circle',
        duration: 3000,
      })
      
      // Resetar formulário
      form.value = {
        name: '',
        document: '',
        phone: '',
        email: '',
        password: '',
        roleId: 'placeholder'
      }
      
      // Chamar callback de sucesso se fornecido
      if (props.onSuccess) {
        props.onSuccess()
      }
      
      // Fechar painel
      emits('close')
    }
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    
    let errorMessage = 'Erro ao criar usuário da equipe'
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    }
    
    toaster.add({
      title: 'Erro',
      description: errorMessage,
      icon: 'lucide:alert-triangle',
      duration: 5000,
    })
  } finally {
    loading.value = false
  }
}

// Buscar roles ao montar o componente
onMounted(() => {
  fetchRoles()
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
        Adicionar Usuário da Equipe
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
      <form @submit.prevent="saveUser" class="space-y-6">
        <!-- Nome -->
        <BaseField label="Nome *" :error="errors.name">
          <BaseInput
            v-model="form.name"
            placeholder="Nome completo"
            :disabled="loading"
            :classes="{
              input: errors.name ? 'border-red-500' : ''
            }"
          />
        </BaseField>

        <!-- Documento -->
        <BaseField label="CPF *" :error="errors.document">
          <BaseInput
            v-model="form.document"
            placeholder="000.000.000-00"
            maxlength="14"
            :disabled="loading"
            :classes="{
              input: errors.document ? 'border-red-500' : ''
            }"
          />
        </BaseField>

        <!-- Telefone -->
        <BaseField label="Telefone *" :error="errors.phone">
          <BaseInput
            v-model="form.phone"
            placeholder="(00) 00000-0000"
            maxlength="15"
            :disabled="loading"
            :classes="{
              input: errors.phone ? 'border-red-500' : ''
            }"
          />
        </BaseField>

        <!-- Email -->
        <BaseField label="Email *" :error="errors.email">
          <BaseInput
            v-model="form.email"
            type="email"
            placeholder="usuario@exemplo.com"
            :disabled="loading"
            :classes="{
              input: errors.email ? 'border-red-500' : ''
            }"
          />
        </BaseField>

        <!-- Senha -->
        <BaseField label="Senha *" :error="errors.password">
          <BaseInput
            v-model="form.password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            :disabled="loading"
            :classes="{
              input: errors.password ? 'border-red-500' : ''
            }"
          />
        </BaseField>

        <!-- Cargo -->
        <BaseField label="Cargo *" :error="errors.roleId">
          <BaseSelect
            v-model="form.roleId"
            :disabled="loading || loadingRoles"
            :class="errors.roleId ? 'border-red-500' : ''"
          >
            <BaseSelectItem value="placeholder" disabled>
              {{ loadingRoles ? 'Carregando...' : 'Selecione um cargo' }}
            </BaseSelectItem>
            <BaseSelectItem
              v-for="role in roles"
              :key="role.id"
              :value="role.id"
            >
              {{ role.name }}
            </BaseSelectItem>
          </BaseSelect>
        </BaseField>

        <!-- Botões -->
        <div class="flex items-center gap-3 pt-4">
          <BaseButton
            type="button"
            variant="muted"
            class="w-full"
            :disabled="loading"
            @click="emits('close')"
          >
            Cancelar
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            class="w-full"
            :loading="loading"
            :disabled="loading"
          >
            {{ loading ? 'Criando...' : 'Criar Usuário' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </FocusScope>
</template>
