<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Cargos e Permissões',
})

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

const roles = ref<any[]>([])
const selectedRole = ref<any>(null)
const isLoading = ref(true)
const isSaving = ref(false)

const permissionGroups = [
  {
    name: 'Administração',
    permissions: [
      { key: 'canManageTeam', label: 'Gerenciar Equipe', description: 'Convidar, editar e desativar funcionários' },
      { key: 'canManageSettings', label: 'Configurações da Empresa', description: 'Alterar logo, cores e dados do escritório' },
      { key: 'canManageKanban', label: 'Gerenciar Kanban', description: 'Criar, editar e reordenar colunas' },
      { key: 'canExportData', label: 'Exportar Dados', description: 'Exportar relatórios e planilhas de clientes' },
    ]
  },
  {
    name: 'Operação de IR',
    permissions: [
      { key: 'canCreateIR', label: 'Criar Novos Cards', description: 'Iniciar novas declarações para clientes' },
      { key: 'canEditIR', label: 'Editar Informações', description: 'Alterar dados de declarações existentes' },
      { key: 'canMoveToFinalColumn', label: 'Concluir Declarações', description: 'Mover cards para a coluna final (Transmitidas)' },
      { key: 'canImportDocs', label: 'Importar Documentos Oficiais', description: 'Realizar importações automáticas de órgãos oficiais' },
      { key: 'canManageChecklist', label: 'Gerenciar Checklist', description: 'Configurar itens obrigatórios para coleta' },
      { key: 'canDeleteRecords', label: 'Excluir Registros', description: 'Excluir declarações ou arquivos permanentemente' },
    ]
  },
  {
    name: 'Acesso e Visualização',
    permissions: [
      { key: 'canManageClients', label: 'Gerenciar Clientes', description: 'Acesso completo ao cadastro de clientes' },
      { key: 'canViewAllCards', label: 'Visualizar Todos os Cards', description: 'Ver declarações mesmo que não estejam atribuídas a ele' },
      { key: 'canViewDrive', label: 'Acessar Drive', description: 'Visualizar aba de arquivos centralizada' },
      { key: 'canViewFinancialCharts', label: 'Dashboard Financeiro', description: 'Visualizar gráficos de faturamento e produtividade' },
    ]
  }
]

async function fetchRoles() {
  isLoading.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/tenant/roles')
    if (response.success) {
      roles.value = response.data
      if (roles.value.length > 0 && !selectedRole.value) {
        selectedRole.value = { ...roles.value[0] }
      } else if (selectedRole.value) {
        // Refresh the selected role state
        const updated = roles.value.find(r => r.id === selectedRole.value.id || r.name === selectedRole.value.name)
        if (updated) selectedRole.value = { ...updated }
      }
    }
  } catch (error) {
    console.error('Erro ao buscar cargos:', error)
  } finally {
    isLoading.value = false
  }
}

function selectRole(role: any) {
  selectedRole.value = { ...role }
}

async function savePermissions() {
  if (!selectedRole.value) return

  isSaving.value = true
  try {
    const permissions: any = {}
    permissionGroups.forEach(group => {
      group.permissions.forEach(p => {
        permissions[p.key] = selectedRole.value[p.key]
      })
    })

    const { data: response } = await useCustomFetch<any>(`/tenant/roles/${selectedRole.value.id}`, {
      method: 'PATCH',
      body: permissions
    })

    if (response.success) {
      toaster.add({
        title: 'Sucesso',
        description: 'Permissões atualizadas com sucesso!',
        icon: 'ph:check-circle-duotone'
      })
      await fetchRoles()
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao salvar permissões',
      icon: 'ph:x-circle-duotone'
    })
  } finally {
    isSaving.value = false
  }
}

onMounted(fetchRoles)
</script>

<template>
  <div class="pb-10">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <BaseHeading as="h2" size="2xl">
          Cargos e Permissões
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
          Gerencie o que cada nível de funcionário pode acessar e fazer no sistema.
        </BaseParagraph>
      </div>
      <div v-if="selectedRole" class="flex gap-2">
        <BaseButton variant="primary" rounded="lg" :loading="isSaving" @click="savePermissions">
          Salvar Alterações
        </BaseButton>
      </div>
    </div>

    <div v-if="isLoading" class="flex h-64 items-center justify-center">
      <BasePlaceholderPage title="Carregando..." />
    </div>

    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <!-- Sidebar de Cargos -->
      <div class="lg:col-span-4 xl:col-span-3">
        <BaseCard rounded="lg" class="p-4">
          <BaseHeading as="h3" size="sm" class="mb-4 px-2">
            Funções Disponíveis
          </BaseHeading>
          <div class="flex flex-col gap-1">
            <button v-for="role in roles" :key="role.id"
              class="flex flex-col rounded-lg p-3 text-left transition-colors" :class="[
                selectedRole?.id === role.id
                  ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                  : 'hover:bg-muted-100 dark:hover:bg-muted-800'
              ]" @click="selectRole(role)">
              <span class="capitalize">{{ role.name }}</span>
              <span class="text-xs text-muted-500">{{ role.description || 'Sem descrição' }}</span>
            </button>
          </div>

          <div class="mt-6 border-t border-muted-200 p-2 dark:border-muted-700">
            <BaseParagraph size="xs" class="mt-2 text-muted-400 italic">
              * Roles marcadas com (sistema) serão clonadas automaticamente ao serem editadas.
            </BaseParagraph>
          </div>
        </BaseCard>
      </div>

      <!-- Grid de Permissões -->
      <div class="lg:col-span-8 xl:col-span-9">
        <div v-if="selectedRole" class="space-y-6">
          <div v-for="group in permissionGroups" :key="group.name">
            <BaseHeading as="h4" size="md" class="mb-4 flex items-center gap-2">
              <span class="h-1 w-4 rounded-full bg-primary-500"></span>
              {{ group.name }}
            </BaseHeading>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <BaseCard v-for="permission in group.permissions" :key="permission.key" rounded="lg"
                class="flex items-start gap-4 p-4">
                <div class="mt-1">
                  <BaseSwitchBall v-model="selectedRole[permission.key]" color="primary"
                    :disabled="selectedRole.name === 'master' || selectedRole.name === 'admin'" />
                </div>
                <div class="flex-1">
                  <BaseHeading as="h5" size="sm">
                    {{ permission.label }}
                  </BaseHeading>
                  <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400">
                    {{ permission.description }}
                  </BaseParagraph>
                </div>
              </BaseCard>
            </div>
          </div>

          <div v-if="selectedRole.name === 'master' || selectedRole.name === 'admin'"
            class="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
            <div class="flex items-center gap-3">
              <Icon name="ph:info-duotone" class="h-5 w-5 text-amber-500" />
              <BaseParagraph size="sm" class="text-amber-800 dark:text-amber-200">
                Os cargos <strong>Master</strong> e <strong>Admin</strong> possuem acesso total ao sistema e suas
                permissões não podem ser alteradas.
              </BaseParagraph>
            </div>
          </div>
        </div>

        <BasePlaceholderPage v-else title="Selecione um cargo"
          subtitle="Escolha um cargo à esquerda para visualizar e editar suas permissões." />
      </div>
    </div>
  </div>
</template>
