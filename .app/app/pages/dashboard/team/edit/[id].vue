<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Editar Usuário da Equipe',
  preview: {
    title: 'Editar Usuário da Equipe',
    description: 'Edição de dados do usuário da equipe',
    categories: ['layouts'],
    src: '/img/screens/layouts-user-grid-1.png',
    srcDark: '/img/screens/layouts-user-grid-1-dark.png',
    order: 65,
  },
})

const { useCustomFetch } = useApi()
const route = useRoute()
const router = useRouter()
const toaster = useNuiToasts()

const userId = route.params.id as string

// Estado
const loading = ref(false)
const loadingRoles = ref(false)
const user = ref<any>({
  name: '',
  email: '',
  document: '',
  phone: '',
  roleId: 'placeholder'
})
const roles = ref<any[]>([])
const errors = ref<any>({})

// Interfaces
interface Role {
  id: string
  name: string
  description?: string
}

interface User {
  id: string
  name: string
  email?: string | null
  document?: string | null
  phone?: string | null
  roleId: string
  role?: Role
  createdAt: string
  updatedAt: string
}

// Buscar dados do usuário
async function fetchUser() {
  loading.value = true
  try {
    const { data } = await useCustomFetch<User>(`/users/${userId}`)
    
    if (data) {
      user.value = {
        name: data.name || '',
        email: data.email || '',
        document: data.document || '',
        phone: data.phone || '',
        roleId: data.roleId || 'placeholder'
      }
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    toaster.add({
      title: 'Erro',
      description: 'Erro ao carregar dados do usuário',
      icon: 'lucide:x-circle',
      duration: 3000,
    })
  } finally {
    loading.value = false
  }
}

// Buscar roles disponíveis
async function fetchRoles() {
  loadingRoles.value = true
  try {
    console.log('Buscando roles...')
    const { data } = await useCustomFetch<any>('/users/team-roles', {
      method: 'GET'
    })
    
    console.log('Resposta da API de roles:', data)
    
    if (data && data.success) {
      roles.value = data.data || []
    } else {
      roles.value = []
    }
    
    console.log('Roles carregadas:', roles.value)
  } catch (error) {
    console.error('Erro ao buscar roles:', error)
    roles.value = []
    toaster.add({
      title: 'Erro',
      description: 'Erro ao carregar cargos disponíveis',
      icon: 'lucide:alert-triangle',
      duration: 3000,
    })
  } finally {
    loadingRoles.value = false
  }
}

// Validação
function validateForm(): boolean {
  errors.value = {}

  if (!user.value.name?.trim()) {
    errors.value.name = 'Nome é obrigatório'
  }

  if (!user.value.document?.trim()) {
    errors.value.document = 'Documento é obrigatório'
  }

  if (!user.value.phone?.trim()) {
    errors.value.phone = 'Telefone é obrigatório'
  }

  if (!user.value.email?.trim()) {
    errors.value.email = 'Email é obrigatório'
  }

  if (!user.value.roleId || user.value.roleId === 'placeholder') {
    errors.value.roleId = 'Cargo é obrigatório'
  }

  return Object.keys(errors.value).length === 0
}

// Salvar usuário
async function saveUser() {
  if (!validateForm()) return

  loading.value = true
  try {
    const payload: any = {
      name: user.value.name.trim(),
      roleId: user.value.roleId
    }

    // Só incluir campos opcionais se não estiverem vazios
    if (user.value.email && user.value.email.trim()) {
      payload.email = user.value.email.trim()
    }

    if (user.value.document && user.value.document.trim()) {
      payload.document = user.value.document.trim()
    }

    if (user.value.phone && user.value.phone.trim()) {
      payload.phone = user.value.phone.trim()
    }

    await useCustomFetch(`/users/${userId}`, {
      method: 'PATCH',
      body: payload
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Usuário atualizado com sucesso!',
      icon: 'lucide:check-circle',
      duration: 3000,
    })

    // Voltar para a lista
    router.push('/dashboard/team')
  } catch (error: any) {
    console.error('Erro ao salvar usuário:', error)
    toaster.add({
      title: 'Erro',
      description: error?.data?.message || 'Erro ao salvar usuário',
      icon: 'lucide:x-circle',
      duration: 3000,
    })
  } finally {
    loading.value = false
  }
}

// Formatação
function formatCPF(value: string) {
  const cleaned = value.replace(/\D/g, '')
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatPhone(value: string) {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

// Watchers para formatação
watch(() => user.value.document, (newValue) => {
  if (newValue) {
    user.value.document = formatCPF(newValue)
  }
})

watch(() => user.value.phone, (newValue) => {
  if (newValue) {
    user.value.phone = formatPhone(newValue)
  }
})

// Carregar dados ao montar
onMounted(() => {
  fetchUser()
  fetchRoles()
})
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <TairoContentWrapper>
      <template #left>
        <BaseButton
          variant="muted"
          rounded="full"
          @click="router.push('/dashboard/team')"
        >
          <Icon name="lucide:arrow-left" class="size-4" />
          <span>Voltar</span>
        </BaseButton>
      </template>
      <template #right>
        <BaseButton
          variant="primary"
          rounded="full"
          :loading="loading"
          @click="saveUser"
        >
          <Icon name="lucide:save" class="size-4" />
          <span>Salvar</span>
        </BaseButton>
      </template>

      <div class="mx-auto max-w-2xl">
        <BaseCard rounded="lg" class="p-6">
          <div class="mb-6">
            <BaseHeading tag="h2" size="xl" weight="medium">
              Editar Usuário da Equipe
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-400">
              Edite as informações do usuário da equipe
            </BaseParagraph>
          </div>

          <form @submit.prevent="saveUser" class="space-y-6">
            <!-- Nome -->
            <BaseField label="Nome *" :error="errors.name">
              <BaseInput
                v-model="user.name"
                :disabled="loading"
                placeholder="Nome completo"
                :classes="{
                  input: errors.name ? 'border-red-500' : ''
                }"
              />
            </BaseField>

            <!-- Email -->
            <BaseField label="Email *" :error="errors.email">
              <BaseInput
                v-model="user.email"
                type="email"
                :disabled="loading"
                placeholder="email@exemplo.com"
                :classes="{
                  input: errors.email ? 'border-red-500' : ''
                }"
              />
            </BaseField>

            <!-- Documento -->
            <BaseField label="CPF *" :error="errors.document">
              <BaseInput
                v-model="user.document"
                :disabled="loading"
                placeholder="000.000.000-00"
                maxlength="14"
                :classes="{
                  input: errors.document ? 'border-red-500' : ''
                }"
              />
            </BaseField>

            <!-- Telefone -->
            <BaseField label="Telefone *" :error="errors.phone">
              <BaseInput
                v-model="user.phone"
                :disabled="loading"
                placeholder="(00) 00000-0000"
                maxlength="15"
                :classes="{
                  input: errors.phone ? 'border-red-500' : ''
                }"
              />
            </BaseField>

            <!-- Cargo -->
            <BaseField label="Cargo *" :error="errors.roleId">
              <BaseSelect
                v-model="user.roleId"
                :disabled="loading || loadingRoles"
                :class="errors.roleId ? 'border-red-500' : ''"
              >
                <BaseSelectItem value="placeholder" disabled>
                  {{ loadingRoles ? 'Carregando cargos...' : 'Selecione um cargo' }}
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
          </form>
        </BaseCard>
      </div>
    </TairoContentWrapper>
  </div>
</template>
