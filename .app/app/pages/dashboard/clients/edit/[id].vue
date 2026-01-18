<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

const { useCustomFetch } = useApi()
const route = useRoute()
const router = useRouter()
const toaster = useNuiToasts()

definePageMeta({
  title: 'Editar Cliente',
  preview: {
    title: 'Editar Cliente',
    description: 'Para edição de informações do cliente',
    categories: ['layouts', 'forms'],
    src: '/img/screens/layouts-user-edit.png',
    srcDark: '/img/screens/layouts-user-edit-dark.png',
    order: 31,
  },
})

// Tipagem para o usuário
interface User {
  id: string
  name: string
  email?: string | null // Email pode ser null
  document?: string
  phone?: string
  photo?: string
  phoneValidated: boolean
  credits: number | string // Pode vir como string da API
  creditsInCashback: number | string // Pode vir como string da API
  createdAt: string
  invitedBy?: {
    id: string
    name: string
  }
  role: {
    id: string
    name: string
  }
}

// Estados do componente
const userId = route.params.id as string
const user = ref<User | null>(null)
const loading = ref(true)
const saving = ref(false)

// Dados do formulário
const form = ref({
  name: '',
  email: '',
  document: '',
  phone: '',
  phoneValidated: false,
})

// Erros do formulário
const errors = ref<Record<string, string>>({})

// Função para buscar dados do usuário
const fetchUser = async () => {
  if (!userId) return
  
  loading.value = true
  try {
    const response = await useCustomFetch<User>(`/users/${userId}`, {
      method: 'GET',
    })
    
    user.value = response.data
    
    // Preencher o formulário com os dados do usuário
    form.value = {
      name: response.data.name || '',
      email: response.data.email || '',
      document: response.data.document || '',
      phone: response.data.phone || '',
      phoneValidated: response.data.phoneValidated || false,
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    toaster.add({
      title: 'Erro',
      description: 'Erro ao carregar dados do usuário',
      icon: 'lucide:alert-triangle',
      duration: 3000,
    })
  } finally {
    loading.value = false
  }
}

// Função para salvar alterações
const saveUser = async () => {
  saving.value = true
  try {
    const payload: any = {
      name: form.value.name.trim(),
      phoneValidated: form.value.phoneValidated,
    }

    // Adicionar campos opcionais apenas se preenchidos
    const email = form.value.email.trim()
    if (email) {
      payload.email = email
    }

    const document = form.value.document.replace(/\D/g, '')
    if (document) {
      payload.document = document
    }

    const phone = form.value.phone.replace(/\D/g, '')
    if (phone) {
      payload.phone = phone
    }

    await useCustomFetch(`/users/${userId}`, {
      method: 'PATCH',
      body: payload,
      })

      toaster.add({
      title: 'Sucesso',
      description: 'Usuário atualizado com sucesso!',
      icon: 'ph:check-circle-fill',
      duration: 3000,
    })

    router.push('/dashboard/clients')
  } catch (error: any) {
    console.error('Erro ao salvar usuário:', error)
        toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao salvar alterações',
          icon: 'lucide:alert-triangle',
      duration: 3000,
    })
  } finally {
    saving.value = false
  }
}

// Buscar usuário ao montar o componente
onMounted(() => {
  fetchUser()
})

// Função para formatar CPF
const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, '')
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// Função para formatar telefone
const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="mx-auto max-w-4xl">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <BaseSpinner size="lg" />
      </div>

      <!-- User Edit Form -->
      <div v-else-if="user" class="space-y-8">
        <!-- Header -->
        <div class="flex items-center justify-between">
    <div>
            <BaseHeading as="h1" size="2xl" weight="bold">
              Editar Cliente
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500">
              Atualize as informações do cliente
            </BaseParagraph>
          </div>
          <BaseButton
            variant="ghost"
            to="/dashboard/clients"
            class="flex items-center gap-2"
          >
            <Icon name="lucide:arrow-left" class="size-4" />
            <span>Voltar</span>
          </BaseButton>
        </div>

        <!-- User Info Card -->
        <BaseCard rounded="lg" class="p-6">
          <div class="flex items-center gap-4 mb-6">
            <BaseAvatar
              size="xl"
              :src="user.photo"
              :text="user.name.charAt(0).toUpperCase()"
            />
            <div>
              <BaseHeading as="h2" size="lg" weight="semibold">
                {{ user.name }}
              </BaseHeading>
              <BaseParagraph size="sm" class="text-muted-500">
                Cliente desde {{ new Date(user.createdAt).toLocaleDateString('pt-BR') }}
              </BaseParagraph>
              <div class="flex items-center gap-4 mt-2">
                <BaseTag
                  size="sm"
                  :variant="user.phoneValidated ? 'primary' : 'muted'"
                  rounded="full"
                >
                  {{ user.phoneValidated ? 'Tel. Validado' : 'Tel. Não Validado' }}
                </BaseTag>
                <BaseParagraph size="xs" class="text-muted-400">
                  Créditos: R$ {{ Number(user.credits).toFixed(2) }}
                </BaseParagraph>
                        </div>
                      </div>
                    </div>

          <!-- Form -->
          <form @submit.prevent="saveUser" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Nome -->
              <BaseField label="Nome Completo" :error="errors.name">
                <BaseInput
                  v-model="form.name"
                  placeholder="Digite o nome completo"
                  :error="!!errors.name"
                          />
                        </BaseField>

              <!-- Email -->
              <BaseField label="Email (Opcional)" :error="errors.email">
                <BaseInput
                  v-model="form.email"
                            type="email"
                  placeholder="Digite o email"
                  :error="!!errors.email"
                          />
                        </BaseField>

              <!-- CPF -->
              <BaseField label="CPF (Opcional)" :error="errors.document">
                          <BaseInput
                  v-model="form.document"
                  placeholder="000.000.000-00"
                  :error="!!errors.document"
                  @input="(e) => form.document = formatCPF(e.target.value)"
                          />
                        </BaseField>

              <!-- Telefone -->
              <BaseField label="Telefone (Opcional)" :error="errors.phone">
                <BaseInput
                  v-model="form.phone"
                  placeholder="(00) 00000-0000"
                  :error="!!errors.phone"
                  @input="(e) => form.phone = formatPhone(e.target.value)"
                            />
                          </BaseField>
                    </div>

            <!-- Telefone Validado -->
            <BaseField>
              <BaseCheckbox
                v-model="form.phoneValidated"
                label="Telefone validado"
                color="primary"
                            />
                          </BaseField>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-3 pt-6 border-t border-muted-200 dark:border-muted-800">
                    <BaseButton
                      type="button"
                      variant="ghost"
                @click="router.push('/dashboard/clients')"
                    >
                Cancelar
                    </BaseButton>
                    <BaseButton
                      type="submit"
                      variant="primary"
                :loading="saving"
                :disabled="saving"
                    >
                Salvar Alterações
                    </BaseButton>
            </div>
          </form>
        </BaseCard>
        </div>
    </div>
  </div>
</template>
