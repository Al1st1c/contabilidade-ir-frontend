<script setup lang="ts">
definePageMeta({
  layout: 'client',
})

const { tenant } = useTenant()
const { user: authUser, logout } = useAuth()
const { useCustomFetch } = useApi()
const { add } = useNuiToasts()
const route = useRoute()
const config = useRuntimeConfig()
const apiBaseUrl = (config.public.apiBase as string || '').replace(/\/$/, '')
const token = computed(() => route.query.token as string | undefined)
const isPublicMode = computed(() => Boolean(token.value))

const isLoading = ref(true)
const isSaving = ref(false)
const profile = ref<any>(null)

// Editing States
const isEditingPix = ref(false)
const editedPixKey = ref('')

const isEditingGov = ref(false)
const editedGovPassword = ref('')
const isGovVisible = ref(false)

async function loadProfile() {
  try {
    isLoading.value = true

    if (isPublicMode.value) {
      // Public mode: load limited data from public API
      const res = await fetch(`${apiBaseUrl}/public/${token.value}`)
      const result = await res.json()
      if (result?.success) {
        profile.value = {
          name: result.data?.client?.name || 'Cliente',
          isPublic: true,
        }
      }
    } else {
      // Authenticated mode: load full profile
      if (!authUser.value?.id) return

      const { data } = await useCustomFetch(`/clients/${authUser.value.id}`)
      if (data.success) {
        profile.value = data.data
        editedPixKey.value = data.data.pixKey || ''
        editedGovPassword.value = data.data.govPassword || ''
      }
    }
  }
  catch (error) {
    console.error('Erro ao carregar perfil:', error)
  }
  finally {
    isLoading.value = false
  }
}

async function savePixKey() {
  if (!profile.value?.id)
    return

  try {
    isSaving.value = true
    const { data } = await useCustomFetch(`/clients/${profile.value.id}`, {
      method: 'PUT',
      body: {
        pixKey: editedPixKey.value,
      },
    })

    if (data.success) {
      profile.value.pixKey = editedPixKey.value
      isEditingPix.value = false
      add({
        title: 'Sucesso',
        description: 'Chave PIX atualizada com sucesso!',
        icon: 'solar:check-circle-bold-duotone',
      })
    }
  }
  catch (error: any) {
    add({
      title: 'Erro',
      description: error.message || 'Não foi possível atualizar a chave PIX.',
      icon: 'solar:danger-circle-bold-duotone',
    })
  }
  finally {
    isSaving.value = false
  }
}

async function handleRevealGovPassword() {
  if (!isGovVisible.value && editedGovPassword.value === '********') {
    if (!profile.value?.id)
      return

    try {
      const { data } = await useCustomFetch<any>(`/clients/${profile.value.id}/reveal-password`)
      if (data.success) {
        editedGovPassword.value = data.data.govPassword || ''
      }
    }
    catch (error: any) {
      console.error('Erro ao revelar senha:', error)
      add({
        title: 'Erro',
        description: error.data?.message || 'Não foi possível revelar a senha.',
        icon: 'solar:danger-circle-bold-duotone',
      })
    }
  }
  isGovVisible.value = !isGovVisible.value
}

async function saveGovPassword() {
  if (!profile.value?.id)
    return

  try {
    isSaving.value = true
    const { data } = await useCustomFetch(`/clients/${profile.value.id}`, {
      method: 'PUT',
      body: {
        govPassword: editedGovPassword.value,
      },
    })

    if (data.success) {
      profile.value.govPassword = editedGovPassword.value
      isEditingGov.value = false
      add({
        title: 'Sucesso',
        description: 'Senha Gov.br atualizada com segurança!',
        icon: 'solar:shield-check-bold-duotone',
      })
    }
  }
  catch (error: any) {
    add({
      title: 'Erro',
      description: error.message || 'Não foi possível atualizar a senha.',
      icon: 'solar:danger-circle-bold-duotone',
    })
  }
  finally {
    isSaving.value = false
  }
}

onMounted(loadProfile)

function handleLogout() {
  logout()
}
</script>

<template>
  <div class="space-y-6 pb-24">
    <AppPageLoading v-if="isLoading" message="Carregando seu perfil..." />

    <div v-else-if="profile">
      <!-- Profile Header -->
      <section class="flex flex-col items-center py-6 text-center">
        <BaseAvatar :src="profile.photoUrl || '/img/avatars/placeholder.svg'" size="xl"
          class="mb-4 ring-4 ring-white dark:ring-muted-900 shadow-xl" />
        <BaseHeading as="h2" size="xl" weight="bold" class="text-muted-800 dark:text-white px-4 leading-tight">
          {{ profile.name }}
        </BaseHeading>
        <BaseParagraph v-if="profile.cpf" size="xs" class="text-muted-500 font-mono tracking-tighter mt-1">
          {{ profile.cpf }}
        </BaseParagraph>
      </section>

      <!-- Public Mode Notice -->
      <div v-if="profile.isPublic" class="px-4 space-y-6">
        <BaseCard class="p-6 border-none shadow-sm bg-white dark:bg-muted-950 text-center">
          <div class="inline-flex p-4 rounded-full bg-primary-500/10 mb-4">
            <Icon name="solar:lock-keyhole-minimalistic-bold-duotone" class="size-10 text-primary-500" />
          </div>
          <BaseHeading as="h3" size="md" weight="bold" class="text-muted-800 dark:text-white mb-2">
            Acesso Limitado
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 max-w-sm mx-auto mb-4">
            Você está acessando via link público. Para ver seu perfil completo, dados bancários e editar suas
            informações, faça login na sua conta.
          </BaseParagraph>
          <NuxtLink to="/auth/client">
            <BaseButton color="primary" size="sm" rounded="lg" class="gap-2 font-bold">
              <Icon name="solar:login-3-bold-duotone" class="size-4" />
              Fazer Login
            </BaseButton>
          </NuxtLink>
        </BaseCard>

        <!-- Footer -->
        <div class="text-center py-6">
          <div class="flex items-center justify-center gap-2 mb-2">
            <TairoLogo class="size-5 text-muted-400" />
            <span class="text-xs font-bold text-muted-400 opacity-50 uppercase tracking-widest">{{ tenant?.tradeName ||
              tenant?.name || 'CONSTAR' }}</span>
          </div>
          <BaseParagraph size="xs" class="text-muted-400">
            Plataforma de Gestão IR • Versão 1.0.0
          </BaseParagraph>
        </div>
      </div>

      <div v-if="!profile.isPublic" class="px-4 space-y-6">
        <!-- Personal Info -->
        <BaseCard class="p-6 space-y-4 border-none shadow-sm bg-white dark:bg-muted-950">
          <BaseHeading as="h3" size="sm" weight="semibold" class="mb-2">
            Dados Pessoais
          </BaseHeading>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-[10px] text-muted-400 uppercase font-bold">E-mail</span>
              <p class="text-sm font-medium text-muted-700 dark:text-muted-300 truncate">
                {{ profile.email || '-' }}
              </p>
            </div>
            <div>
              <span class="text-[10px] text-muted-400 uppercase font-bold">Telefone</span>
              <p class="text-sm font-medium text-muted-700 dark:text-muted-300">
                {{ profile.whatsapp || profile.phone
                  || '-' }}
              </p>
            </div>
            <div>
              <span class="text-[10px] text-muted-400 uppercase font-bold">Data Nasc.</span>
              <p class="text-sm font-medium text-muted-700 dark:text-muted-300">
                {{ profile.birthDate ? new
                  Date(profile.birthDate).toLocaleDateString('pt-BR') : '-' }}
              </p>
            </div>
            <div>
              <span class="text-[10px] text-muted-400 uppercase font-bold">Ocupação</span>
              <p class="text-sm font-medium text-muted-700 dark:text-muted-300">
                {{ profile.occupation || '-' }}
              </p>
            </div>
          </div>

          <div v-if="profile.employer" class="pt-2 border-t border-muted-100 dark:border-muted-800">
            <span class="text-[10px] text-muted-400 uppercase font-bold">Empregador</span>
            <p class="text-sm font-medium text-muted-700 dark:text-muted-300">
              {{ profile.employer }}
            </p>
          </div>
        </BaseCard>

        <!-- Address Info -->
        <BaseCard class="p-6 border-none shadow-sm bg-white dark:bg-muted-950">
          <BaseHeading as="h3" size="sm" weight="semibold" class="mb-4">
            Endereço Registrado
          </BaseHeading>

          <div class="space-y-3">
            <div v-if="profile.zipCode" class="flex items-start gap-3">
              <Icon name="solar:map-point-bolt-bold-duotone" class="size-5 text-muted-400 shrink-0" />
              <div class="flex-1">
                <p class="text-sm font-medium text-muted-800 dark:text-muted-200">
                  {{ profile.address }}, {{ profile.addressNumber }}
                </p>
                <p v-if="profile.addressComplement" class="text-xs text-muted-500">
                  {{ profile.addressComplement }}
                </p>
                <p class="text-xs text-muted-500">
                  {{ profile.neighborhood }} - {{ profile.city }}/{{ profile.state }}
                </p>
                <p class="text-xs text-muted-400 mt-1">
                  CEP {{ profile.zipCode }}
                </p>
              </div>
            </div>
            <div v-else class="text-center py-2">
              <BaseParagraph size="xs" class="text-muted-400 italic">
                Endereço não informado.
              </BaseParagraph>
            </div>
          </div>
        </BaseCard>

        <!-- Bank Details -->
        <BaseCard class="p-6 border-none shadow-sm bg-white dark:bg-muted-950">
          <div class="flex items-center justify-between mb-4">
            <BaseHeading as="h3" size="sm" weight="semibold">
              Dados para Restituição
            </BaseHeading>
            <button v-if="!isEditingPix" class="text-[10px] text-primary-500 font-bold uppercase hover:underline"
              @click="isEditingPix = true">
              Editar PIX
            </button>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-500">Banco</span>
              <span class="text-sm font-bold text-muted-700 dark:text-muted-300">{{ profile.bankName || profile.bankCode
                || '-' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-500">Agência / Conta</span>
              <span class="text-sm font-bold text-muted-700 dark:text-muted-300">{{ profile.bankAgency || '-' }} / {{
                profile.bankAccount || '-' }}</span>
            </div>

            <div class="pt-2 border-t border-muted-50 dark:border-muted-900">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-muted-500">Chave PIX</span>
                <span v-if="!isEditingPix" class="text-sm font-mono font-bold text-primary-500">{{ profile.pixKey || '-'
                  }}</span>
              </div>

              <div v-if="isEditingPix" class="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                <BaseInput v-model="editedPixKey" placeholder="Sua chave PIX" size="sm" rounded="lg" />
                <div class="flex gap-2">
                  <BaseButton color="primary" size="sm" rounded="lg" class="flex-1" :loading="isSaving"
                    @click="savePixKey">
                    Salvar
                  </BaseButton>
                  <BaseButton color="muted" size="sm" rounded="lg" @click="isEditingPix = false">
                    Cancelar
                  </BaseButton>
                </div>
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- Gov.br Access -->
        <BaseCard class="p-6 border-none shadow-sm bg-white dark:bg-muted-950 overflow-hidden relative">
          <!-- Security Badge -->
          <div class="absolute -top-1 -right-1">
            <div
              class="bg-success-500/10 text-success-500 text-[8px] font-bold uppercase py-1 px-3 rounded-bl-xl border-b border-l border-success-500/20 flex items-center gap-1">
              <Icon name="solar:shield-check-bold" class="size-2.5" />
              Criptografado
            </div>
          </div>

          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <BaseHeading as="h3" size="sm" weight="semibold">
                Acesso Gov.br
              </BaseHeading>
              <BaseTag color="success" variant="muted" rounded="full" class="text-[9px] px-2 font-bold uppercase">
                Seguro
              </BaseTag>
            </div>
            <button v-if="!isEditingGov" class="text-[10px] text-primary-500 font-bold uppercase hover:underline"
              @click="isEditingGov = true">
              Atualizar Senha
            </button>
          </div>

          <BaseParagraph size="xs" class="text-muted-500 mb-4 leading-tight">
            Sua senha do portal Gov.br é necessária para que possamos consultar pendências e realizar a transmissão do
            seu IRPF.
          </BaseParagraph>

          <div class="space-y-4">
            <div v-if="!isEditingGov"
              class="flex items-center justify-between p-3 rounded-xl bg-muted-50 dark:bg-muted-900/50 border border-muted-100 dark:border-muted-800">
              <div class="flex items-center gap-3">
                <div class="size-8 rounded-lg bg-white dark:bg-muted-800 flex items-center justify-center shadow-sm">
                  <Icon name="solar:lock-password-bold-duotone" class="size-5 text-muted-400" />
                </div>
                <div class="flex flex-col">
                  <span class="text-[10px] text-muted-400 uppercase font-bold leading-none mb-1">Sua Senha</span>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-mono font-bold tracking-widest text-muted-700 dark:text-muted-300">
                      {{ profile.govPassword ? (isGovVisible ? profile.govPassword : '••••••••') : 'Não informada' }}
                    </span>
                    <button v-if="profile.govPassword" class="text-muted-400 hover:text-primary-500"
                      @click="handleRevealGovPassword">
                      <Icon :name="isGovVisible ? 'solar:eye-closed-linear' : 'solar:eye-linear'" class="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="isEditingGov" class="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div class="space-y-1">
                <BaseParagraph size="xs" class="text-muted-500 font-bold uppercase ml-1">
                  Nova Senha Gov.br
                </BaseParagraph>
                <BaseInput v-model="editedGovPassword" type="password" placeholder="Digite sua senha do Gov.br"
                  size="sm" rounded="lg" icon="solar:key-linear" />
              </div>

              <div class="p-3 rounded-lg bg-primary-500/5 border border-primary-500/10 flex gap-2">
                <Icon name="solar:shield-warning-bold-duotone" class="size-4 text-primary-500 shrink-0 mt-0.5" />
                <p class="text-[10px] text-primary-700 dark:text-primary-300 font-medium leading-tight">
                  Seus dados são protegidos por criptografia de ponta a ponta e acessíveis apenas pela sua equipe
                  contábil.
                </p>
              </div>

              <div class="flex gap-2">
                <BaseButton color="primary" size="sm" rounded="lg" class="flex-1 font-bold" :loading="isSaving"
                  @click="saveGovPassword">
                  Confirmar e Salvar
                </BaseButton>
                <BaseButton color="muted" size="sm" rounded="lg" @click="isEditingGov = false">
                  Cancelar
                </BaseButton>
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- App Settings -->
        <BaseCard class="p-6 space-y-4 border-none shadow-sm bg-white dark:bg-muted-950">
          <BaseHeading as="h3" size="sm" weight="semibold" class="mb-2">
            Acesso e Segurança
          </BaseHeading>

          <div class="space-y-1">
            <button
              class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-danger-500/5 transition-colors group"
              @click="handleLogout">
              <div class="flex items-center gap-3 text-danger-500">
                <div
                  class="size-8 rounded-lg bg-danger-500/10 flex items-center justify-center group-hover:bg-danger-500 group-hover:text-white transition-colors">
                  <Icon name="solar:logout-linear" class="size-5" />
                </div>
                <span class="text-sm font-bold">Sair do Aplicativo</span>
              </div>
            </button>
          </div>
        </BaseCard>

        <!-- Footer -->
        <div class="text-center py-6">
          <div class="flex items-center justify-center gap-2 mb-2">
            <TairoLogo class="size-5 text-muted-400" />
            <span class="text-xs font-bold text-muted-400 opacity-50 uppercase tracking-widest">{{ tenant?.tradeName
              || tenant?.name || 'CONSTAR'
              }}</span>
          </div>
          <BaseParagraph size="xs" class="text-muted-400">
            Plataforma de Gestão IR • Versão 1.0.0
          </BaseParagraph>
        </div>
      </div>
    </div>
  </div>
</template>
