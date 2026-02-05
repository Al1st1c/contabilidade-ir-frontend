<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Detalhes do Membro',
})

const { useCustomFetch } = useApi()
const { user } = useAuth()
const route = useRoute()
const router = useRouter()
const toaster = useNuiToasts()

const slug = computed(() => route.params.slug as string)
const pending = ref(false)
const resendingInvite = ref(false)
const member = ref<any>(null)

// Fetch member details
async function fetchMember() {
  pending.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/tenant/members')

    if (response?.success && response?.data) {
      // Find the member by ID (slug is the ID)
      const found = response.data.find((m: any) => m.id === slug.value)
      if (found) {
        const roleName = found.role?.name || 'viewer'
        member.value = {
          id: found.id,
          name: found.name,
          email: found.email,
          picture: found.photo,
          phone: found.phone,
          position: found.role?.description,
          role: {
            label: getRoleLabel(roleName),
            value: roleName,
            details: getRoleDetails(found.role),
            apiRole: found.role, // Keep original role object for permissions
          },
          isActive: found.isActive,
          status: found.status || 'ACTIVE', // PENDING_INVITE, ACTIVE, INACTIVE
          createdAt: found.createdAt,
          lastLoginAt: found.lastLoginAt,
          assignedDeclarations: found.assignedDeclarations,
        }
      }
    }
  }
  catch (error) {
    console.error('Erro ao buscar membro:', error)
  }
  finally {
    pending.value = false
  }
}

// Helper to get role label
function getRoleLabel(roleName: string): string {
  const roles: Record<string, string> = {
    master: 'Administrador',
    admin: 'Gerente',
    accountant: 'Contador',
    contador: 'Contador',
    assistant: 'Assistente',
    assistente: 'Assistente',
    viewer: 'Visualizador',
  }
  return roles[roleName] || roleName || 'Membro'
}

// Permission groups for dynamic display (sync with roles.vue)
const permissionGroups = [
  {
    name: 'Administração',
    permissions: [
      { key: 'canManageTeam', label: 'Gerenciar Equipe' },
      { key: 'canManageSettings', label: 'Configurações da Empresa' },
      { key: 'canManageKanban', label: 'Gerenciar Kanban' },
      { key: 'canExportData', label: 'Exportar Dados' },
    ]
  },
  {
    name: 'Operação de IR',
    permissions: [
      { key: 'canCreateIR', label: 'Criar Novos Cards' },
      { key: 'canEditIR', label: 'Editar Informações' },
      { key: 'canMoveToFinalColumn', label: 'Concluir Declarações' },
      { key: 'canImportDocs', label: 'Importar Documentos Oficiais' },
      { key: 'canManageChecklist', label: 'Gerenciar Checklist' },
      { key: 'canDeleteRecords', label: 'Excluir Registros' },
    ]
  },
  {
    name: 'Acesso e Visualização',
    permissions: [
      { key: 'canManageClients', label: 'Gerenciar Clientes' },
      { key: 'canViewAllCards', label: 'Visualizar Todos os Cards' },
      { key: 'canViewDrive', label: 'Acessar Drive' },
      { key: 'canViewFinancialCharts', label: 'Dashboard Financeiro' },
    ]
  }
]

// Helper to get role details with granular permissions
function getRoleDetails(apiRole?: any): any[] {
  if (!apiRole) return []

  // Map database role flags to UI groups
  return permissionGroups.map(group => {
    // Determine access level based on permissions in group
    const groupPerms = group.permissions.map(p => ({
      label: p.label,
      status: apiRole[p.key] ?? false
    }))

    const activeCount = groupPerms.filter(p => p.status).length
    let access = 'Sem Acesso'
    if (activeCount === group.permissions.length) access = 'Acesso Total'
    else if (activeCount > 0) access = 'Acesso Parcial'

    // Special case for Master/Admin
    if (apiRole.name === 'master' || apiRole.name === 'admin') {
      access = 'Acesso Total'
      groupPerms.forEach(p => p.status = true)
    }

    return {
      label: group.name,
      access,
      permissions: groupPerms
    }
  })
}

// Format date
function formatDate(date: string): string {
  if (!date)
    return '-'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Edit member
function editMember() {
  router.push(`/dashboard/settings/team-edit/${member.value?.id}`)
}

// Resend invite
async function resendInvite() {
  if (!member.value?.id)
    return

  resendingInvite.value = true
  try {
    const { data } = await useCustomFetch<any>(`/tenant/members/${member.value.id}/resend-invite`, {
      method: 'POST',
    })

    if (data?.success) {
      toaster.add({
        title: 'Convite reenviado!',
        description: `Um novo link foi gerado para ${member.value.email}`,
        icon: 'lucide:mail',
        duration: 5000,
      })

      // Show invite link if available
      if (data.data?.inviteLink) {
        try {
          await navigator.clipboard.writeText(data.data.inviteLink)
          toaster.add({
            title: 'Link copiado!',
            description: 'O link de convite foi copiado para a área de transferência.',
            icon: 'lucide:clipboard-check',
            duration: 3000,
          })
        }
        catch (e) {
          console.log('Link:', data.data.inviteLink)
        }
      }
    }
  }
  catch (error: any) {
    console.error('Erro ao reenviar convite:', error)
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Não foi possível reenviar o convite',
      icon: 'lucide:alert-triangle',
      duration: 5000,
    })
  }
  finally {
    resendingInvite.value = false
  }
}

// Fetch on mount and route change
onMounted(() => {
  fetchMember()
})

watch(slug, () => {
  fetchMember()
})

// Delete / Deactivate Logic
const deleteDialog = ref(false)
const deleting = ref(false)

async function confirmDelete() {
  if (!member.value?.id) return

  deleting.value = true
  try {
    const { data } = await useCustomFetch<any>(`/tenant/members/${member.value.id}`, {
      method: 'DELETE'
    })

    if (data?.success) {
      toaster.add({
        title: 'Sucesso',
        description: data.message || (member.value.isActive ? 'Membro desativado' : 'Membro removido'),
        icon: 'lucide:check-circle',
        duration: 5000
      })

      deleteDialog.value = false

      // If was pending or inactive, it was likely deleted or we want to go back
      if (member.value.status === 'PENDING_INVITE' || !member.value.isActive) {
        router.push('/dashboard/settings/team')
      } else {
        // Just refresh if it was a soft delete (active -> inactive)
        fetchMember()
      }
    }
  } catch (error: any) {
    console.error('Erro ao excluir/desativar:', error)
    toaster.add({
      title: 'Erro',
      description: error.data?.message || error.message || 'Erro ao processar solicitação',
      icon: 'lucide:alert-triangle',
      duration: 5000
    })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <!-- Loading -->
    <BaseCard v-if="pending" rounded="lg">
      <div class="p-10 flex items-center justify-center">
        <Icon name="svg-spinners:blocks-shuffle-3" class="size-8 text-primary-500" />
      </div>
    </BaseCard>

    <!-- Member Details -->
    <BaseCard v-else-if="member" rounded="lg">
      <!-- Pending Invite Alert -->
      <div v-if="member.status === 'PENDING_INVITE'"
        class="bg-warning-50 dark:bg-warning-900/20 border-b border-warning-200 dark:border-warning-800/50 p-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <Icon name="lucide:clock" class="text-warning-500 size-5" />
          <div>
            <BaseText size="sm" weight="medium" class="text-warning-700 dark:text-warning-300">
              Convite pendente
            </BaseText>
            <BaseText size="xs" class="text-warning-600 dark:text-warning-400">
              Este membro ainda não ativou sua conta.
            </BaseText>
          </div>
        </div>
        <BaseButton size="sm" variant="muted" :loading="resendingInvite" :disabled="resendingInvite"
          @click="resendInvite">
          <Icon v-if="!resendingInvite" name="lucide:send" class="size-4 mr-1" />
          {{ resendingInvite ? 'Enviando...' : 'Reenviar Convite' }}
        </BaseButton>
      </div>

      <!-- Header -->
      <div class="border-muted-200 dark:border-muted-800 flex flex-col sm:flex-row gap-4 border-b p-6 sm:p-8">
        <BaseAvatar :src="member.picture" :text="member.name?.charAt(0) || 'U'" size="xl" rounded="lg" />
        <div class="flex-1">
          <div class="flex items-start justify-between gap-4">
            <div>
              <BaseHeading size="xl" lead="none" class="text-muted-800 dark:text-muted-100 mb-1">
                {{ member.name }}
              </BaseHeading>
              <BaseParagraph size="sm" class="text-muted-500 mb-3">
                {{ member.email }}
              </BaseParagraph>
              <div class="flex items-center gap-2 flex-wrap">
                <BaseTag rounded="lg" :color="member.role.value === 'master' ? 'primary' : 'muted'" size="sm">
                  {{ member.role.label }}
                </BaseTag>
                <BaseTag v-if="member.position" rounded="lg" variant="primary" size="sm">
                  {{ member.position }}
                </BaseTag>
                <!-- Status Badge -->
                <BaseTag v-if="member.status === 'PENDING_INVITE'" rounded="lg" color="warning" size="sm">
                  Pendente
                </BaseTag>
                <BaseTag v-else rounded="lg"
                  :class="member.isActive ? 'bg-success-500 text-white' : 'bg-red-500 text-white'" variant="none"
                  size="sm">
                  {{ member.isActive ? 'Ativo' : 'Inativo' }}
                </BaseTag>
              </div>
            </div>
            <BaseButton v-if="user?.role?.canManageTeam" rounded="lg" size="sm" @click="editMember">
              <Icon name="solar:pen-2-linear" class="size-4" />
              <span>Editar</span>
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Info -->
      <div class="p-6 sm:p-8 border-b border-muted-200 dark:border-muted-800">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <BaseText size="xs" class="text-muted-400 uppercase mb-1">
              Telefone
            </BaseText>
            <br>
            <BaseText size="sm" class="text-muted-700 dark:text-muted-200">
              {{ member.phone || 'Não informado' }}
            </BaseText>
          </div>
          <div>
            <BaseText size="xs" class="text-muted-400 uppercase mb-1">
              Membro desde
            </BaseText>
            <br>
            <BaseText size="sm" class="text-muted-700 dark:text-muted-200">
              {{ formatDate(member.createdAt) }}
            </BaseText>
          </div>
          <div>
            <BaseText size="xs" class="text-muted-400 uppercase mb-1">
              Status
            </BaseText> <br>
            <BaseText size="sm" class="text-muted-700 dark:text-muted-200">
              {{ member.isActive ? 'Conta ativa' : 'Conta desativada' }}
            </BaseText>
          </div>
          <div>
            <BaseText size="xs" class="text-muted-400 uppercase mb-1">
              Função
            </BaseText>
            <br>
            <BaseText size="sm" class="text-muted-700 dark:text-muted-200">
              {{ member.role.label }}
            </BaseText>
          </div>
        </div>
      </div>

      <!-- Permissions -->
      <div class="p-6 sm:p-8">
        <BaseHeading size="md" weight="medium" class="mb-6 text-muted-800 dark:text-muted-100">
          Permissões
        </BaseHeading>

        <div class="space-y-6">
          <div v-for="roleDetail in member.role.details" :key="roleDetail.label"
            class="border-muted-200 dark:border-muted-800 grid grid-cols-12 border-b pb-6 last:border-0">
            <div class="col-span-12 sm:col-span-4 mb-4 sm:mb-0">
              <BaseParagraph size="sm" class="text-muted-500">
                {{ roleDetail.label }}
              </BaseParagraph>
              <BaseHeading size="sm" weight="medium" class="text-muted-800 dark:text-muted-100">
                {{ roleDetail.access }}
              </BaseHeading>
            </div>
            <div class="col-span-12 sm:col-span-8">
              <ul class="space-y-2">
                <li v-for="permission in roleDetail.permissions" :key="permission.label" class="flex gap-2 items-start">
                  <Icon v-if="permission.status" name="lucide:check"
                    class="text-success-500 relative top-0.5 size-4 shrink-0" />
                  <Icon v-else name="lucide:x" class="text-danger-500 relative top-0.5 size-4 shrink-0" />
                  <BaseParagraph size="sm" class="text-muted-500">
                    {{ permission.label }}
                  </BaseParagraph>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <!-- Actions Footer -->
      <div v-if="member?.id !== user?.id && user?.role?.canManageTeam"
        class="border-t border-muted-200 dark:border-muted-800 p-6 flex justify-end gap-3 bg-muted-50/50 dark:bg-muted-950/50 rounded-b-lg">
        <BaseButton class="w-full sm:w-auto" :variant="member.isActive ? 'destructive' : 'muted'"
          @click="deleteDialog = true">
          <Icon :name="member.isActive ? 'lucide:ban' : 'lucide:trash-2'" class="size-4 mr-2" />
          {{ member.status === 'PENDING_INVITE' ? 'Remover Convite' :
            (member.isActive ? 'Desativar Membro' : 'Excluir Membro') }}
        </BaseButton>
      </div>
    </BaseCard>

    <!-- Not Found -->
    <BaseCard v-else rounded="lg">
      <div class="p-6 text-center py-10">
        <Icon name="solar:user-cross-bold-duotone" class="size-16 text-muted-300 dark:text-muted-700 mx-auto mb-4" />
        <BaseHeading weight="medium" size="lg" class="mb-2 text-muted-800 dark:text-muted-100">
          Membro não encontrado
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-400 mb-4">
          O membro selecionado não foi encontrado.
        </BaseParagraph>
        <BaseButton variant="primary" @click="router.push('/dashboard/settings/team')">
          Voltar para a lista
        </BaseButton>
      </div>
    </BaseCard>

    <!-- Confirmation Dialog -->
    <DialogRoot v-model:open="deleteDialog">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-muted-900/50 backdrop-blur-sm" />
        <DialogContent
          class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl dark:bg-muted-900 border border-muted-200 dark:border-muted-800 transition-all duration-200">
          <div class="flex items-center gap-4 text-warning-500 mb-4">
            <div
              class="size-12 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center shrink-0">
              <Icon name="lucide:alert-triangle" class="size-6" />
            </div>
            <div>
              <DialogTitle as="h3" class="text-lg font-medium text-muted-800 dark:text-muted-100">
                Tem certeza?
              </DialogTitle>
              <DialogDescription class="text-sm text-muted-500 dark:text-muted-400 mt-1">
                {{
                  member?.status === 'PENDING_INVITE'
                    ? 'Isso irá remover permanentemente o convite e liberar a vaga no seu plano.'
                    : (member?.isActive
                      ? 'Isso irá revogar o acesso deste usuário ao sistema. O histórico será mantido.'
                      : 'Isso irá remover permanentemente este membro do histórico.')
                }}
              </DialogDescription>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <BaseButton :disabled="deleting" @click="deleteDialog = false">
              Cancelar
            </BaseButton>
            <BaseButton variant="destructive" :loading="deleting" @click="confirmDelete">
              Confirmar
            </BaseButton>
          </div>

          <DialogClose
            class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <Icon name="lucide:x" class="h-4 w-4" />
            <span class="sr-only">Close</span>
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
