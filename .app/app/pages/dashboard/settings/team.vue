<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Gestão de Equipe',
})

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

// State
const members = ref<any[]>([])
const roles = ref<any[]>([])
const isLoading = ref(true)
const isInviting = ref(false)
const showInviteModal = ref(false)
const filter = ref('')

// Invite form
const inviteForm = ref({
  name: '',
  email: '',
  roleId: '',
})

// Filtered members
const filteredMembers = computed(() => {
  if (!filter.value) return members.value
  const search = filter.value.toLowerCase()
  return members.value.filter(m =>
    m.name?.toLowerCase().includes(search) ||
    m.email?.toLowerCase().includes(search)
  )
})

// Fetch team members
async function fetchMembers() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant/members')
    members.value = (data.data || data) || []
  } catch (error) {
    console.error('Erro ao buscar membros:', error)
  } finally {
    isLoading.value = false
  }
}

// Fetch roles
async function fetchRoles() {
  try {
    const { data } = await useCustomFetch<any>('/roles')
    roles.value = (data.data || data) || []
  } catch (error) {
    console.error('Erro ao buscar roles:', error)
  }
}

// Invite member
async function inviteMember() {
  if (!inviteForm.value.email || !inviteForm.value.roleId) return

  isInviting.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant/members/invite', {
      method: 'POST',
      body: inviteForm.value,
    })

    if (data.success || data) {
      toaster.add({
        title: 'Sucesso',
        description: 'Convite enviado com sucesso!',
        icon: 'solar:check-circle-linear'
      })
      showInviteModal.value = false
      inviteForm.value = { name: '', email: '', roleId: '' }
      fetchMembers()
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao enviar convite',
      icon: 'solar:danger-circle-linear'
    })
  } finally {
    isInviting.value = false
  }
}

// Toggle status
async function toggleStatus(member: any) {
  try {
    await useCustomFetch<any>(`/tenant/members/${member.id}/toggle-status`, {
      method: 'PATCH'
    })
    member.isActive = !member.isActive
    toaster.add({
      title: 'Atualizado',
      description: `Membro ${member.isActive ? 'ativado' : 'desativado'} com sucesso.`,
      icon: 'solar:check-circle-linear'
    })
  } catch (error) {
    toaster.add({
      title: 'Erro',
      description: 'Erro ao alterar status',
      icon: 'solar:danger-circle-linear'
    })
  }
}

onMounted(() => {
  fetchMembers()
  fetchRoles()
})
</script>

<template>
  <div>
    <TairoContentWrapper>
      <template #left>
        <TairoInput v-model="filter" icon="solar:magnifer-linear" rounded="full"
          placeholder="Buscar por nome ou e-mail..." class="w-full sm:w-80" />
      </template>
      <template #right>
        <BaseButton color="primary" rounded="full" class="w-full sm:w-auto" @click="showInviteModal = true">
          <Icon name="solar:user-plus-linear" class="size-4 mr-2" />
          Convidar Membro
        </BaseButton>
      </template>

      <!-- Content Grid -->
      <div v-if="isLoading" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <BaseCard v-for="i in 8" :key="i" rounded="lg" class="p-6">
          <div class="flex flex-col items-center">
            <BasePlaceload class="size-20 rounded-full mb-4" />
            <BasePlaceload class="h-4 w-32 mb-2" />
            <BasePlaceload class="h-3 w-40" />
          </div>
        </BaseCard>
      </div>

      <div v-else-if="filteredMembers.length === 0" class="py-20">
        <BasePlaceholderPage title="Nenhum membro encontrado"
          subtitle="Sua equipe está vazia ou nenhum membro corresponde à sua busca.">
          <template #image>
            <Icon name="solar:users-group-two-rounded-linear" class="size-24 text-muted-300 mx-auto" />
          </template>
          <BaseButton variant="none"
            class="bg-primary-500/20 text-primary-500 hover:bg-primary-500/30 transition-colors mt-4"
            @click="showInviteModal = true">
            Convidar agora
          </BaseButton>
        </BasePlaceholderPage>
      </div>

      <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <TransitionGroup enter-active-class="transition-all duration-300" enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100">
          <BaseCard v-for="member in filteredMembers" :key="member.id" rounded="lg"
            class="group relative overflow-hidden h-full flex flex-col p-6 hover:shadow-xl hover:shadow-muted-500/10 transition-all duration-300">
            <!-- Status Badge -->
            <div class="absolute top-4 right-4">
              <BaseTag variant="none" rounded="full" :class="[
                'text-[10px] font-bold uppercase tracking-wider px-3 py-1',
                member.isActive ? 'bg-success-500/20 text-success-500' : 'bg-muted-500/20 text-muted-500 dark:bg-muted-400/10 dark:text-muted-400'
              ]">
                {{ member.isActive ? 'Ativo' : 'Inativo' }}
              </BaseTag>
            </div>

            <div class="flex flex-col items-center text-center">
              <BaseAvatar :src="member.photo" :text="member.name?.charAt(0) || '?'" size="xl" rounded="full"
                class="bg-primary-500/10 text-primary-600 mb-4" />

              <BaseHeading as="h3" size="md" weight="semibold" class="text-muted-800 dark:text-white line-clamp-1">
                {{ member.name || 'Sem nome' }}
              </BaseHeading>

              <BaseParagraph size="xs" class="text-muted-400 mb-6 truncate w-full">
                {{ member.email || 'Sem e-mail' }}
              </BaseParagraph>

              <div class="flex flex-col gap-2 w-full mt-auto">
                <div class="flex items-center justify-center gap-2 mb-4">
                  <BaseTag variant="none" rounded="lg"
                    class="text-[11px] font-semibold flex items-center gap-1.5 py-1 px-3 bg-primary-500/20 text-primary-500">
                    <Icon name="solar:shield-check-linear" class="size-3.5" />
                    {{ member.role?.name || 'Membro' }}
                  </BaseTag>
                </div>

                <div class="flex items-center gap-2 pt-4 border-t border-muted-100 dark:border-muted-800">
                  <BaseButton rounded="lg" class="flex-1" size="sm" variant="muted" @click="toggleStatus(member)">
                    <Icon :name="member.isActive ? 'solar:user-block-linear' : 'solar:user-check-linear'"
                      class="size-4 mr-2" />
                    {{ member.isActive ? 'Suspender' : 'Ativar' }}
                  </BaseButton>
                  <BaseButton rounded="lg" size="sm" variant="muted" class="px-2.5">
                    <Icon name="solar:pen-2-linear" class="size-4" />
                  </BaseButton>
                </div>
              </div>
            </div>
          </BaseCard>
        </TransitionGroup>
      </div>
    </TairoContentWrapper>

    <!-- Invite Modal (using DialogRoot instead of TairoModal) -->
    <DialogRoot v-model:open="showInviteModal">
      <DialogPortal>
        <DialogOverlay class="bg-muted-800/70 dark:bg-muted-900/80 fixed inset-0 z-50" />
        <DialogContent
          class="fixed starting:opacity-0 starting:top-[8%] top-[10%] start-[50%] max-h-[85vh] w-[90vw] max-w-[32rem] translate-x-[-50%] rounded-lg overflow-hidden border border-muted-200 dark:border-muted-700 bg-white dark:bg-muted-800 focus:outline-none z-[100] transition-discrete transition-all duration-200 ease-out flex flex-col">

          <div class="flex w-full items-center justify-between p-6 border-b border-muted-200 dark:border-muted-800">
            <DialogTitle class="font-heading text-muted-900 text-lg font-medium dark:text-white">
              Convidar Novo Membro
            </DialogTitle>
            <BaseButtonIcon @click="showInviteModal = false" rounded="full" variant="ghost">
              <Icon name="solar:close-circle-linear" class="size-5" />
            </BaseButtonIcon>
          </div>

          <div class="nui-slimscroll overflow-y-auto p-8 space-y-6">
            <DialogDescription class="text-sm text-muted-500">
              Envie um convite por e-mail para seu assistente ou sócio. Eles receberão um link para criar a senha.
            </DialogDescription>

            <BaseField label="Nome Completo">
              <TairoInput v-model="inviteForm.name" placeholder="Maria Silva" icon="solar:user-rounded-linear" />
            </BaseField>

            <BaseField label="E-mail" required>
              <TairoInput v-model="inviteForm.email" type="email" placeholder="maria@exemplo.com"
                icon="solar:letter-linear" />
            </BaseField>

            <BaseField label="Função / Nível de Acesso" required>
              <TairoSelect v-model="inviteForm.roleId" icon="solar:shield-check-linear"
                placeholder="Selecione uma função...">
                <BaseSelectItem v-for="role in roles" :key="role.id" :value="role.id">
                  {{ role.name }}
                </BaseSelectItem>
              </TairoSelect>
            </BaseField>

            <div class="p-4 rounded-xl bg-primary-500/5 border border-primary-500/10 flex gap-4 mt-4 text-xs">
              <Icon name="solar:info-circle-linear" class="size-6 text-primary-500 shrink-0" />
              <BaseParagraph size="xs" class="text-primary-800 dark:text-primary-200">
                <strong>Dica:</strong> Funções de Admin podem ver faturamento e convidar outros membros. Assistentes
                focam
                apenas na entrega das declarações.
              </BaseParagraph>
            </div>
          </div>

          <div
            class="p-6 border-t border-muted-200 dark:border-muted-800 flex justify-end gap-3 bg-muted-50/50 dark:bg-muted-900/50">
            <BaseButton @click="showInviteModal = false">Cancelar</BaseButton>
            <BaseButton color="primary" rounded="lg" :loading="isInviting" @click="inviteMember">
              Enviar Convite
            </BaseButton>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
