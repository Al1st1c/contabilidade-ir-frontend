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

import { permissionGroups } from '~/utils/permissions'

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
      <AppPageLoading message="Carregando cargos..." />
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
              <div class="flex items-center gap-2">
                <span class="capitalize">{{ role.name }}</span>
                <BaseTag v-if="role.name === 'admin'" size="sm" variant="muted" color="warning">
                  Admin
                </BaseTag>
                <BaseTag v-else-if="!role.tenantId" size="sm" variant="muted">
                  Sistema
                </BaseTag>
                <BaseTag v-else size="sm" variant="muted" color="primary">
                  Personalizado
                </BaseTag>
              </div>
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
            <BaseHeading as="h4" size="md" class="mb-4 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="h-1 w-4 rounded-full bg-primary-500"></span>
                {{ group.name }}
              </div>
              <div v-if="group.name === 'Administração' && !selectedRole.tenantId"
                class="flex items-center gap-1.5 rounded-full bg-muted-100 px-2.5 py-1 text-[10px]  uppercase tracking-wider text-muted-500 dark:bg-muted-800">
                <Icon name="ph:seal-check-duotone" class="size-3.5" />
                Cargos do Sistema
              </div>
              <div v-else-if="group.name === 'Administração' && selectedRole.tenantId && selectedRole.name !== 'admin'"
                class="flex items-center gap-1.5 rounded-full bg-primary-500/10 px-2.5 py-1 text-[10px]  uppercase tracking-wider text-primary-600 dark:bg-primary-400/10 dark:text-primary-400">
                <Icon name="ph:user-circle-gear-duotone" class="size-3.5" />
                Personalizado
              </div>
            </BaseHeading>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <BaseCard v-for="permission in group.permissions" :key="permission.key" rounded="lg"
                class="flex items-start gap-4 p-4">
                <div class="mt-1">
                  <BaseSwitchBall v-model="selectedRole[permission.key]" color="primary"
                    :disabled="selectedRole.name === 'admin'" />
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <BaseHeading as="h5" size="sm">
                      {{ permission.label }}
                    </BaseHeading>
                    <BaseTooltip :content="permission.explanation">
                      <Icon name="ph:info" class="size-4 text-primary-500 cursor-help" />
                    </BaseTooltip>
                  </div>
                  <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400">
                    {{ permission.description }}
                  </BaseParagraph>
                </div>
              </BaseCard>
            </div>
          </div>

          <div v-if="!selectedRole.tenantId" class="rounded-lg bg-info-50 p-4 dark:bg-info-900/20">
            <div class="flex items-center gap-3">
              <Icon name="ph:info-duotone" class="h-5 w-5 text-info-500" />
              <BaseParagraph size="sm" class="text-info-800 dark:text-info-200">
                Este é um cargo <strong>padrão do sistema</strong>. Ao realizar qualquer alteração, uma versão
                personalizada exclusiva para sua empresa será criada automaticamente.
              </BaseParagraph>
            </div>
          </div>
          <div v-else-if="selectedRole.name === 'admin'" class="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
            <div class="flex items-center gap-3">
              <Icon name="ph:shield-warning-duotone" class="h-5 w-5 text-amber-500" />
              <BaseParagraph size="sm" class="text-amber-800 dark:text-amber-200">
                O cargo <strong>Admin</strong> é reservado para o suporte do sistema e suas permissões não podem ser
                alteradas.
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
