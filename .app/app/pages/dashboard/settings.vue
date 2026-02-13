<script setup lang="ts">
definePageMeta({
  title: 'Configurações',
})

import type { ComputedRef } from 'vue'

const { user } = useAuth()
const route = useRoute()

const isOwner = computed(() => {
  const roleName = user.value?.role?.name?.toLowerCase()
  return roleName === 'master' || user.value?.isAdmin
})

const currentSection = computed(() => {
  if (route.path.includes('/dashboard/settings/profile'))
    return 'profile'
  if (route.path.includes('/dashboard/settings/account'))
    return 'account'
  if (route.path.includes('/dashboard/settings/team'))
    return 'team'
  if (route.path.includes('/dashboard/settings/checklist'))
    return 'checklist'
  if (route.path.includes('/dashboard/settings/roles'))
    return 'roles'
  if (route.path.includes('/dashboard/settings/logs'))
    return 'logs'
  return 'whitelabel'
}) as ComputedRef<'whitelabel' | 'account' | 'team' | 'checklist' | 'roles' | 'profile' | 'logs'>

const sectionTitles: Record<string, { title: string, description: string }> = {
  whitelabel: {
    title: 'Personalização',
    description: 'Configure o logo e as cores do seu sistema',
  },
  profile: {
    title: 'Meu Perfil',
    description: 'Gerencie suas informações pessoais e segurança',
  },
  account: {
    title: 'Dados da Empresa',
    description: 'Informações cadastrais e de contato do escritório',
  },
  team: {
    title: 'Equipe',
    description: 'Gerencie os membros do seu escritório',
  },
  checklist: {
    title: 'Checklist',
    description: 'Gerencie os checklists do seu escritório',
  },
  roles: {
    title: 'Cargos',
    description: 'Gerencie os cargos do seu escritório',
  },
  logs: {
    title: 'Logs de Atividade',
    description: 'Histórico de uso de recursos e ações no sistema',
  },
}

const allTabs = [
  { id: 'profile', label: 'Meu Perfil', icon: 'lucide:user', to: '/dashboard/settings/profile' },
  { id: 'whitelabel', label: 'Whitelabel', icon: 'lucide:palette', to: '/dashboard/settings' },
  { id: 'account', label: 'Empresa', icon: 'lucide:building-2', to: '/dashboard/settings/account' },
  { id: 'team', label: 'Equipe', icon: 'lucide:users', to: '/dashboard/settings/team' },
  { id: 'checklist', label: 'Checklist', icon: 'lucide:list-checks', to: '/dashboard/settings/checklist' },
  { id: 'roles', label: 'Cargos', icon: 'lucide:briefcase', to: '/dashboard/settings/roles' },
  { id: 'logs', label: 'Logs', icon: 'lucide:activity', to: '/dashboard/settings/logs' },
]

const tabs = computed(() => {
  return allTabs.filter((tab) => {
    if (tab.id === 'whitelabel') return isOwner.value
    if (tab.id === 'team') return user.value?.role?.canManageTeam || isOwner.value
    if (tab.id === 'roles') return user.value?.role?.canManageTeam || isOwner.value
    if (tab.id === 'checklist') return user.value?.role?.canManageChecklist || isOwner.value
    if (tab.id === 'logs') return isOwner.value
    return true
  })
})
</script>

<template>
  <div class="pb-20">
    <!-- Header -->
    <div class="px-4 md:px-6 lg:px-8 mb-6">
      <div class="flex items-center gap-2 text-sm text-muted-400 mb-2">
        <NuxtLink to="/dashboard" class="hover:text-primary-500 transition-colors">
          Dashboard
        </NuxtLink>
        <Icon name="lucide:chevron-right" class="size-4" />
        <span>Configurações</span>
        <Icon name="lucide:chevron-right" class="size-4" />
        <span class="text-muted-800 dark:text-muted-100">{{ sectionTitles[currentSection as string]?.title }}</span>
      </div>
      <BaseHeading as="h1" size="2xl" weight="medium">
        {{ sectionTitles[currentSection as string]?.title }}
      </BaseHeading>
      <BaseParagraph size="sm" class="text-muted-500">
        {{ sectionTitles[currentSection as string]?.description }}
      </BaseParagraph>
    </div>

    <!-- Horizontal Tab Navigation -->
    <div class="border-b border-muted-200 dark:border-muted-800 px-4 md:px-6 lg:px-8 mb-8">
      <nav class="flex gap-1 -mb-px">
        <NuxtLink v-for="tab in tabs" :key="tab.id" :to="tab.to"
          class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors" :class="[
            currentSection === tab.id
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-muted-500 hover:text-muted-700 dark:hover:text-muted-300 hover:border-muted-300 dark:hover:border-muted-600',
          ]">
          <Icon :name="tab.icon" class="size-4" />
          {{ tab.label }}
        </NuxtLink>
      </nav>
    </div>

    <!-- Content Area -->
    <div class="px-4 md:px-6 lg:px-8">
      <NuxtPage />
    </div>
  </div>
</template>
