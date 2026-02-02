<script setup lang="ts">
definePageMeta({
  layout: 'client',
})

const { tenant } = useTenant()
const { user: authUser, logout } = useAuth()
const { useCustomFetch } = useApi()
const { add } = useNuiToasts()

const isLoading = ref(true)
const isSaving = ref(false)
const profile = ref<any>(null)

// Pix Editing State
const isEditingPix = ref(false)
const editedPixKey = ref('')

async function loadProfile() {
  if (!authUser.value?.id) return

  try {
    isLoading.value = true
    const { data } = await useCustomFetch(`/clients/${authUser.value.id}`)
    if (data.success) {
      profile.value = data.data
      editedPixKey.value = data.data.pixKey || ''
    }
  } catch (error) {
    console.error('Erro ao carregar perfil:', error)
  } finally {
    isLoading.value = false
  }
}

async function savePixKey() {
  if (!profile.value?.id) return

  try {
    isSaving.value = true
    const { data } = await useCustomFetch(`/clients/${profile.value.id}`, {
      method: 'PUT',
      body: {
        pixKey: editedPixKey.value
      }
    })

    if (data.success) {
      profile.value.pixKey = editedPixKey.value
      isEditingPix.value = false
      add({
        title: 'Sucesso',
        description: 'Chave PIX atualizada com sucesso!',
        icon: 'solar:check-circle-bold-duotone'
      })
    }
  } catch (error: any) {
    add({
      title: 'Erro',
      description: error.message || 'Não foi possível atualizar a chave PIX.',
      icon: 'solar:danger-circle-bold-duotone'
    })
  } finally {
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
    <div v-if="isLoading" class="space-y-6 pt-10 px-4">
      <div class="flex flex-col items-center">
        <BasePlaceload class="size-24 rounded-full mb-4" />
        <BasePlaceload class="h-6 w-48 rounded mb-2" />
        <BasePlaceload class="h-4 w-32 rounded" />
      </div>
      <BasePlaceload class="h-48 w-full rounded-2xl" />
      <BasePlaceload class="h-48 w-full rounded-2xl" />
    </div>

    <div v-else-if="profile">
      <!-- Profile Header -->
      <section class="flex flex-col items-center py-6 text-center">
        <BaseAvatar src="/img/avatars/placeholder.svg" size="xl"
          class="mb-4 ring-4 ring-white dark:ring-muted-900 shadow-xl" />
        <BaseHeading as="h2" size="xl" weight="bold" class="text-muted-800 dark:text-white px-4 leading-tight">
          {{ profile.name }}
        </BaseHeading>
        <BaseParagraph size="xs" class="text-muted-500 font-mono tracking-tighter mt-1">{{ profile.cpf }}
        </BaseParagraph>
      </section>

      <div class="px-4 space-y-6">
        <!-- Personal Info -->
        <BaseCard class="p-6 space-y-4 border-none shadow-sm bg-white dark:bg-muted-950">
          <BaseHeading as="h3" size="sm" weight="semibold" class="mb-2">Dados Pessoais</BaseHeading>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-[10px] text-muted-400 uppercase font-bold">E-mail</span>
              <p class="text-sm font-medium text-muted-700 dark:text-muted-300 truncate">{{ profile.email || '-' }}</p>
            </div>
            <div>
              <span class="text-[10px] text-muted-400 uppercase font-bold">Telefone</span>
              <p class="text-sm font-medium text-muted-700 dark:text-muted-300">{{ profile.whatsapp || profile.phone ||
                '-' }}</p>
            </div>
            <div>
              <span class="text-[10px] text-muted-400 uppercase font-bold">Data Nasc.</span>
              <p class="text-sm font-medium text-muted-700 dark:text-muted-300">{{ profile.birthDate ? new
                Date(profile.birthDate).toLocaleDateString('pt-BR') : '-' }}</p>
            </div>
            <div>
              <span class="text-[10px] text-muted-400 uppercase font-bold">Ocupação</span>
              <p class="text-sm font-medium text-muted-700 dark:text-muted-300">{{ profile.occupation || '-' }}</p>
            </div>
          </div>

          <div v-if="profile.employer" class="pt-2 border-t border-muted-100 dark:border-muted-800">
            <span class="text-[10px] text-muted-400 uppercase font-bold">Empregador</span>
            <p class="text-sm font-medium text-muted-700 dark:text-muted-300">{{ profile.employer }}</p>
          </div>
        </BaseCard>

        <!-- Address Info -->
        <BaseCard class="p-6 border-none shadow-sm bg-white dark:bg-muted-950">
          <BaseHeading as="h3" size="sm" weight="semibold" class="mb-4">Endereço Registrado</BaseHeading>

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
                <p class="text-xs text-muted-400 mt-1">CEP {{ profile.zipCode }}</p>
              </div>
            </div>
            <div v-else class="text-center py-2">
              <BaseParagraph size="xs" class="text-muted-400 italic">Endereço não informado.</BaseParagraph>
            </div>
          </div>
        </BaseCard>

        <!-- Bank Details -->
        <BaseCard class="p-6 border-none shadow-sm bg-white dark:bg-muted-950">
          <div class="flex items-center justify-between mb-4">
            <BaseHeading as="h3" size="sm" weight="semibold">Dados para Restituição</BaseHeading>
            <button v-if="!isEditingPix" @click="isEditingPix = true"
              class="text-[10px] text-primary-500 font-bold uppercase hover:underline">
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

        <!-- App Settings -->
        <BaseCard class="p-6 space-y-4 border-none shadow-sm bg-white dark:bg-muted-950">
          <BaseHeading as="h3" size="sm" weight="semibold" class="mb-2">Acesso e Segurança</BaseHeading>

          <div class="space-y-1">
            <button
              class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted-50 dark:hover:bg-muted-900 transition-colors group">
              <div class="flex items-center gap-3">
                <div
                  class="size-8 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors">
                  <Icon name="solar:lock-keyhole-linear" class="size-5" />
                </div>
                <span class="text-sm font-medium">Alterar CPF de Acesso</span>
              </div>
              <Icon name="solar:alt-arrow-right-linear" class="size-4 text-muted-400" />
            </button>
            <button @click="handleLogout"
              class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-danger-500/5 transition-colors group">
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
            <span class="text-xs font-bold text-muted-400 opacity-50 uppercase tracking-widest">{{ tenant?.tradeName ||
              tenant?.name || 'CONSTAR'
              }}</span>
          </div>
          <BaseParagraph size="xs" class="text-muted-400">Plataforma de Gestão IR • Versão 1.0.0</BaseParagraph>
        </div>
      </div>
    </div>
  </div>
</template>
