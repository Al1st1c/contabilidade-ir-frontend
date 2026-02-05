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
  roleId: 'placeholder',
})

const loading = ref(false)
const roles = ref<Role[]>([])
const loadingRoles = ref(false)

// Estado de sucesso (após enviar convite)
const inviteSent = ref(false)
const inviteData = ref<{
  name: string
  email: string
  inviteLink: string
  expiresAt: string
  emailSent?: boolean
} | null>(null)

// Validação
const errors = ref<Record<string, string>>({})

// Buscar roles disponíveis
async function fetchRoles() {
  loadingRoles.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/tenant/roles', {
      method: 'GET',
    })

    if (response?.success && response?.data) {
      roles.value = response.data
    }
  }
  catch (error) {
    console.error('Erro ao buscar roles:', error)
    toaster.add({
      title: 'Erro',
      description: 'Erro ao carregar cargos disponíveis',
      icon: 'lucide:alert-triangle',
      duration: 5000,
    })
  }
  finally {
    loadingRoles.value = false
  }
}

// Validar formulário
function validateForm(): boolean {
  errors.value = {}

  if (!form.value.name.trim()) {
    errors.value.name = 'Nome é obrigatório'
  }

  if (!form.value.phone.trim()) {
    errors.value.phone = 'Telefone é obrigatório'
  }

  if (!form.value.email.trim()) {
    errors.value.email = 'Email é obrigatório'
  }
  else if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Email deve ter um formato válido'
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
  }
  else if (cleanValue.length === 10) {
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

// Salvar usuário (enviar convite)
async function saveUser() {
  if (!validateForm())
    return

  loading.value = true

  try {
    const { data: response } = await useCustomFetch<any>('/tenant/members/invite', {
      method: 'POST',
      body: {
        name: form.value.name,
        email: form.value.email,
        phone: form.value.phone.replace(/\D/g, ''),
        roleId: form.value.roleId,
      },
    })

    if (response?.success) {
      // Mostrar tela de sucesso com link de convite
      inviteSent.value = true
      inviteData.value = {
        name: form.value.name,
        email: form.value.email,
        inviteLink: response.data?.inviteLink || '',
        expiresAt: response.data?.expiresAt || '',
        emailSent: response.data?.emailSent || false,
      }

      const emailSent = response.data?.emailSent
      toaster.add({
        title: emailSent ? '✅ Convite enviado!' : '⚠️ Convite criado',
        description: emailSent
          ? `Um e-mail foi enviado para ${form.value.email}`
          : `Copie o link abaixo e envie para ${form.value.email}`,
        icon: emailSent ? 'lucide:mail-check' : 'lucide:mail-warning',
        duration: 5000,
      })

      // Chamar callback de sucesso se fornecido
      if (props.onSuccess) {
        props.onSuccess()
      }
    }
  }
  catch (error: any) {
    console.error('Erro ao criar usuário:', error)

    let errorMessage = 'Erro ao convidar membro'

    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    }
    else if (error.data?.message) {
      errorMessage = error.data.message
    }

    toaster.add({
      title: 'Erro',
      description: errorMessage,
      icon: 'lucide:alert-triangle',
      duration: 5000,
    })
  }
  finally {
    loading.value = false
  }
}

// Copiar link para clipboard
async function copyInviteLink() {
  if (!inviteData.value?.inviteLink)
    return

  try {
    await navigator.clipboard.writeText(inviteData.value.inviteLink)
    toaster.add({
      title: 'Link copiado!',
      description: 'O link foi copiado para a área de transferência.',
      icon: 'lucide:clipboard-check',
      duration: 3000,
    })
  }
  catch (error) {
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível copiar o link.',
      icon: 'lucide:clipboard-x',
      duration: 3000,
    })
  }
}

// Convidar outro membro
function inviteAnother() {
  inviteSent.value = false
  inviteData.value = null
  form.value = {
    name: '',
    document: '',
    phone: '',
    email: '',
    roleId: 'placeholder',
  }
}

// Fechar painel
function closePanel() {
  inviteSent.value = false
  inviteData.value = null
  emits('close')
}

// Buscar roles ao montar o componente
onMounted(() => {
  fetchRoles()
})
</script>

<template>
  <FocusScope class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white" trapped loop>
    <div class="border-muted-200 dark:border-muted-700 flex h-20 w-full items-center justify-between border-b px-6">
      <BaseHeading as="h3" size="xs" weight="semibold" class="text-muted-500 dark:text-muted-100 uppercase">
        {{ inviteSent ? 'Convite Enviado' : 'Convidar Membro' }}
      </BaseHeading>

      <!-- Close button -->
      <button type="button"
        class="nui-mask nui-mask-blob hover:bg-muted-100 focus:bg-muted-100 dark:hover:bg-muted-700 dark:focus:bg-muted-700 text-muted-700 dark:text-muted-400 flex size-10 cursor-pointer items-center justify-center outline-transparent transition-colors duration-300"
        @click="closePanel">
        <Icon name="lucide:arrow-right" class="size-4" />
      </button>
    </div>

    <div class="nui-slimscroll relative h-[calc(100dvh_-_80px)] w-full overflow-y-auto p-6">
      <!-- Estado de Sucesso -->
      <div v-if="inviteSent && inviteData" class="space-y-6">
        <!-- Ícone de sucesso -->
        <div class="flex flex-col items-center justify-center py-8">
          <div :class="inviteData.emailSent
            ? 'bg-success-100 dark:bg-success-900/30'
            : 'bg-warning-100 dark:bg-warning-900/30'"
            class="mb-4 flex size-20 items-center justify-center rounded-full">
            <Icon :name="inviteData.emailSent ? 'lucide:mail-check' : 'lucide:mail-warning'"
              :class="inviteData.emailSent ? 'text-success-500' : 'text-warning-500'" class="size-10" />
          </div>
          <BaseHeading as="h4" size="lg" weight="semibold" class="text-center">
            {{ inviteData.emailSent ? 'Convite enviado!' : 'Convite criado!' }}
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400 mt-2 text-center">
            {{ inviteData.emailSent
              ? `${inviteData.name} receberá um e-mail com instruções para ativar sua conta.`
              : `Copie o link abaixo e envie para ${inviteData.name}.` }}
          </BaseParagraph>
        </div>

        <!-- Dados do convite -->
        <div class="bg-muted-50 dark:bg-muted-900/50 space-y-4 rounded-xl p-4">
          <div>
            <label class="text-muted-400 text-xs font-medium uppercase">Nome</label>
            <p class="text-muted-800 dark:text-muted-100 font-medium">
              {{ inviteData.name }}
            </p>
          </div>
          <div>
            <label class="text-muted-400 text-xs font-medium uppercase">Email</label>
            <p class="text-muted-800 dark:text-muted-100 font-medium">
              {{ inviteData.email }}
            </p>
          </div>
          <div>
            <label class="text-muted-400 text-xs font-medium uppercase">Validade do Convite</label>
            <p class="text-muted-800 dark:text-muted-100 font-medium">
              {{ inviteData.expiresAt ? new Date(inviteData.expiresAt).toLocaleString('pt-BR') : '48 horas' }}
            </p>
          </div>
        </div>

        <!-- Link de convite -->
        <div v-if="inviteData.inviteLink" class="space-y-2">
          <label class="text-muted-500 dark:text-muted-400 text-sm">
            {{ inviteData.emailSent ? 'Caso o e-mail não chegue, copie o link abaixo:' : 'Link de convite:' }}
          </label>
          <div class="flex gap-2">
            <BaseInput :model-value="inviteData.inviteLink" readonly class="flex-1" :classes="{ input: 'text-xs' }" />
            <BaseButton variant="muted" size="sm" @click="copyInviteLink">
              <Icon name="lucide:copy" class="size-4" />
            </BaseButton>
          </div>
        </div>

        <!-- Botões -->
        <div class="flex items-center gap-3 pt-4">
          <BaseButton type="button" variant="muted" class="w-full" @click="closePanel">
            Fechar
          </BaseButton>
          <BaseButton type="button" variant="primary" class="w-full" @click="inviteAnother">
            <Icon name="lucide:user-plus" class="mr-2 size-4" />
            Convidar Outro
          </BaseButton>
        </div>
      </div>

      <!-- Formulário -->
      <form v-else class="space-y-6" @submit.prevent="saveUser">
        <!-- Info box -->
        <div
          class="bg-info-50 dark:bg-info-900/20 border-info-200 dark:border-info-800/50 flex items-start gap-3 rounded-lg border p-4">
          <Icon name="lucide:info" class="text-info-500 mt-0.5 size-5 shrink-0" />
          <div class="text-sm">
            <p class="text-info-700 dark:text-info-300 font-medium">
              Como funciona?
            </p>
            <p class="text-info-600 dark:text-info-400 mt-1">
              O membro receberá um e-mail com um link para ativar sua conta e criar sua própria senha.
            </p>
          </div>
        </div>

        <!-- Nome -->
        <BaseField label="Nome completo *" :error="errors.name">
          <BaseInput v-model="form.name" placeholder="Nome do funcionário" :disabled="loading" :classes="{
            input: errors.name ? 'border-red-500' : '',
          }" />
        </BaseField>

        <!-- Email -->
        <BaseField label="Email *" :error="errors.email">
          <BaseInput v-model="form.email" type="email" placeholder="email@exemplo.com" :disabled="loading" :classes="{
            input: errors.email ? 'border-red-500' : '',
          }" />
        </BaseField>

        <!-- Telefone -->
        <BaseField label="Telefone *" :error="errors.phone">
          <BaseInput v-model="form.phone" placeholder="(00) 00000-0000" maxlength="15" :disabled="loading" :classes="{
            input: errors.phone ? 'border-red-500' : '',
          }" />
        </BaseField>

        <!-- CPF (opcional) -->
        <BaseField label="CPF (opcional)" :error="errors.document">
          <BaseInput v-model="form.document" placeholder="000.000.000-00" maxlength="14" :disabled="loading" />
        </BaseField>

        <!-- Cargo -->
        <BaseField label="Cargo *" :error="errors.roleId">
          <BaseSelect v-model="form.roleId" :disabled="loading || loadingRoles"
            :class="errors.roleId ? 'border-red-500' : ''">
            <BaseSelectItem value="placeholder" disabled>
              {{ loadingRoles ? 'Carregando...' : 'Selecione um cargo' }}
            </BaseSelectItem>
            <BaseSelectItem v-for="role in roles" :key="role.id" :value="role.id">
              {{ role.name }}
            </BaseSelectItem>
          </BaseSelect>
        </BaseField>

        <!-- Botões -->
        <div class="flex items-center gap-3 pt-4">
          <BaseButton type="button" variant="muted" class="w-full" :disabled="loading" @click="closePanel">
            Cancelar
          </BaseButton>
          <BaseButton type="submit" variant="primary" class="w-full" :loading="loading" :disabled="loading">
            <Icon v-if="!loading" name="lucide:send" class="mr-2 size-4" />
            {{ loading ? 'Enviando...' : 'Enviar Convite' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </FocusScope>
</template>
