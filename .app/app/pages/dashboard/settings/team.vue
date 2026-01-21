<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Equipe',
})

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

// State
const isLoading = ref(true)
const members = ref<any[]>([])
const showInviteModal = ref(false)

// Invite form
const inviteForm = ref({
  name: '',
  email: '',
  roleId: ''
})
const isInviting = ref(false)
const roles = ref<any[]>([])

// Fetch team members
async function fetchMembers() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant/members')
    if (data.success) {
      members.value = data.data
    }
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
    if (data.success) {
      roles.value = data.data
    }
  } catch (error) {
    console.error('Erro ao buscar roles:', error)
  }
}

// Invite member
async function inviteMember() {
  if (!inviteForm.value.name || !inviteForm.value.email) {
    toaster.add({
      title: 'Atenção',
      description: 'Preencha nome e e-mail',
      icon: 'ph:warning-circle-fill'
    })
    return
  }

  isInviting.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant/members/invite', {
      method: 'POST',
      body: inviteForm.value
    })

    if (data.success) {
      toaster.add({
        title: 'Sucesso',
        description: 'Convite enviado com sucesso!',
        icon: 'ph:check-circle-fill'
      })
      showInviteModal.value = false
      inviteForm.value = { name: '', email: '', roleId: '' }
      fetchMembers()
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao enviar convite',
      icon: 'ph:warning-circle-fill'
    })
  } finally {
    isInviting.value = false
  }
}

// Toggle member status
async function toggleMemberStatus(member: any) {
  try {
    const { data } = await useCustomFetch<any>(`/tenant/members/${member.id}`, {
      method: 'PATCH',
      body: { isActive: !member.isActive }
    })

    if (data.success) {
      member.isActive = !member.isActive
      toaster.add({
        title: 'Sucesso',
        description: member.isActive ? 'Membro ativado' : 'Membro desativado',
        icon: 'ph:check-circle-fill'
      })
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao atualizar status',
      icon: 'ph:warning-circle-fill'
    })
  }
}

// Role badge colors
function getRoleBadgeColor(roleName: string) {
  switch (roleName?.toLowerCase()) {
    case 'master': return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    case 'admin': return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
    case 'contador': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    case 'assistente': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    default: return 'bg-muted-100 text-muted-600 border-muted-200 dark:bg-muted-800 dark:text-muted-400 dark:border-muted-700'
  }
}

onMounted(() => {
  fetchMembers()
  fetchRoles()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header Actions -->
    <div class="flex items-center justify-between">
      <div>
        <BaseParagraph size="sm" class="text-muted-500">
          {{ members.length }} membro(s) na equipe
        </BaseParagraph>
      </div>
      <BaseButton variant="primary" size="sm" @click="showInviteModal = true">
        <Icon name="lucide:user-plus" class="size -4 mr-2" />
        Convidar Membro
      </BaseButton>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-4">
      <BasePlaceload v-for="i in 3" :key="i" class="h-20 w-full rounded-xl" />
    </div>

    <!-- Members List -->
    <div v-else class="space-y-3">
      <BaseCard v-for="member in members" :key="member.id" rounded="lg" class="p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center gap-4">
          <!-- Avatar -->
          <BaseAvatar :src="member.photo" :text="member.name?.charAt(0)" size="lg" class="shrink-0" />

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <BaseHeading as="h4" size="sm" weight="medium" class="truncate">
                {{ member.name }}
              </BaseHeading>
              <span class="px-2 py-0.5 text-[10px] uppercase font-bold rounded border"
                :class="getRoleBadgeColor(member.role?.name)">
                {{ member.role?.name }}
              </span>
              <span v-if="!member.isActive"
                class="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">
                Inativo
              </span>
            </div>
            <BaseParagraph size="xs" class="text-muted-500 truncate">
              {{ member.email }}
            </BaseParagraph>
            <BaseParagraph v-if="member.phone" size="xs" class="text-muted-400">
              {{ member.phone }}
            </BaseParagraph>
          </div>

          <!-- Stats -->
          <div class="hidden md:flex items-center gap-6 text-center">
            <div>
              <BaseParagraph size="xs" class="text-muted-400">Declarações</BaseParagraph>
              <BaseHeading as="span" size="sm" weight="medium">
                {{ member._count?.assignedDeclarations || 0 }}
              </BaseHeading>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <BaseButton v-if="member.role?.name !== 'master'" size="icon-sm"
              :variant="member.isActive ? 'destructive' : 'primary'" :title="member.isActive ? 'Desativar' : 'Ativar'"
              @click="toggleMemberStatus(member)">
              <Icon :name="member.isActive ? 'lucide:user-x' : 'lucide:user-check'" class="size-4" />
            </BaseButton>
          </div>
        </div>
      </BaseCard>

      <!-- Empty State -->
      <div v-if="members.length === 0" class="text-center py-12">
        <Icon name="lucide:users" class="size-16 text-muted-300 mx-auto mb-4" />
        <BaseHeading as="h3" size="md" weight="medium" class="mb-2">
          Nenhum membro ainda
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500 mb-4">
          Convide membros para sua equipe começar a trabalhar
        </BaseParagraph>
        <BaseButton variant="primary" @click="showInviteModal = true">
          <Icon name="lucide:user-plus" class="size-4 mr-2" />
          Convidar Primeiro Membro
        </BaseButton>
      </div>
    </div>

    <!-- Invite Modal -->
    <BaseModal v-model:open="showInviteModal">
      <BaseModalBackdrop />
      <BaseModalContent class="max-w-md">
        <BaseModalCard>
          <BaseModalCardHeader>
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Icon name="lucide:user-plus" class="size-5 text-primary-500" />
              </div>
              <div>
                <BaseModalCardTitle>Convidar Membro</BaseModalCardTitle>
                <BaseParagraph size="xs" class="text-muted-400">
                  Envie um convite por e-mail
                </BaseParagraph>
              </div>
            </div>
          </BaseModalCardHeader>

          <BaseModalCardBody class="p-6 space-y-4">
            <BaseInputWrapper label="Nome Completo">
              <BaseInput v-model="inviteForm.name" placeholder="Ex: Maria Silva" icon="lucide:user" />
            </BaseInputWrapper>

            <BaseInputWrapper label="E-mail">
              <BaseInput v-model="inviteForm.email" type="email" placeholder="maria@exemplo.com" icon="lucide:mail" />
            </BaseInputWrapper>

            <BaseInputWrapper label="Função">
              <BaseSelect v-model="inviteForm.roleId" icon="lucide:shield">
                <option value="" disabled>Selecione a função...</option>
                <option v-for="role in roles" :key="role.id" :value="role.id">
                  {{ role.name }}
                </option>
              </BaseSelect>
            </BaseInputWrapper>
          </BaseModalCardBody>

          <BaseModalCardFooter class="flex justify-end gap-3">
            <BaseButton @click="showInviteModal = false">Cancelar</BaseButton>
            <BaseButton variant="primary" :loading="isInviting" @click="inviteMember">
              <Icon name="lucide:send" class="size-4 mr-2" />
              Enviar Convite
            </BaseButton>
          </BaseModalCardFooter>
        </BaseModalCard>
      </BaseModalContent>
    </BaseModal>
  </div>
</template>
