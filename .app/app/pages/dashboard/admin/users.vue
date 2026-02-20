<script setup lang="ts">
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

definePageMeta({
  title: 'Gestão de Usuários - Admin',
})

const users = ref<any[]>([])
const loading = ref(true)
const page = ref(1)
const totalPages = ref(1)
const search = ref('')
const totalUsers = ref(0)

async function fetchUsers() {
  try {
    loading.value = true
    const { data } = await useCustomFetch<any>(`/admin/users?page=${page.value}&search=${search.value}`)
    users.value = data.users
    totalUsers.value = data.total
    totalPages.value = data.pages
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
  } finally {
    loading.value = false
  }
}

async function toggleAdmin(user: any) {
  try {
    const newIsAdmin = !user.isAdmin
    await useCustomFetch(`/admin/users/${user.id}/admin`, {
      method: 'PATCH',
      body: { isAdmin: newIsAdmin },
    })
    user.isAdmin = newIsAdmin
    toaster.add({
      title: 'Sucesso',
      description: `Usuário ${user.name} agora ${newIsAdmin ? 'é' : 'não é'} admin.`,
      icon: 'ph:check-circle-fill',
    })
  } catch (error) {
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível alterar permissão.',
      icon: 'ph:warning-circle-fill',
    })
  }
}

// --- Subscription Modal ---
const isModalOpen = ref(false)
const selectedUser = ref<any>(null)
const plans = ref<any[]>([])
const subForm = ref<{
  status: string
  currentPeriodEnd: string
  employeesLimit: number
  taxDeclarationsLimit: number
  storageMbLimit: number
  hasWhitelabel: boolean
  hasReports: boolean
  hasApi: boolean
  hasTeamManagement: boolean
  canViewAllFilesDrive: boolean
}>({
  status: 'ACTIVE',
  currentPeriodEnd: '',
  employeesLimit: 1,
  taxDeclarationsLimit: 0,
  storageMbLimit: 250,
  hasWhitelabel: false,
  hasReports: false,
  hasApi: false,
  hasTeamManagement: false,
  canViewAllFilesDrive: false,
})

async function fetchPlans() {
  const { data } = await useCustomFetch<any>('/admin/plans')
  plans.value = data
}

function openSubscriptionModal(user: any) {
  selectedUser.value = user
  const sub = user.subscription || {}

  subForm.value = {
    status: (sub.status as string) || 'ACTIVE',
    currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd as string).toISOString().split('T')[0] : '',
    employeesLimit: Number(sub.employeesLimit) || 1,
    taxDeclarationsLimit: Number(sub.taxDeclarationsLimit) || 0,
    storageMbLimit: Number(sub.storageMbLimit) || 250,
    hasWhitelabel: !!sub.hasWhitelabel,
    hasReports: !!sub.hasReports,
    hasApi: !!sub.hasApi,
    hasTeamManagement: !!sub.hasTeamManagement,
    canViewAllFilesDrive: !!sub.canViewAllFilesDrive,
  }

  if (plans.value.length === 0) fetchPlans()
  isModalOpen.value = true
}

async function updateSubscription() {
  try {
    await useCustomFetch(`/admin/users/${selectedUser.value.id}/subscription`, {
      method: 'PATCH',
      body: subForm.value,
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Assinatura atualizada com sucesso.',
      icon: 'ph:check-circle-fill',
    })

    isModalOpen.value = false
    fetchUsers()
  } catch (error) {
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível atualizar assinatura.',
      icon: 'ph:warning-circle-fill',
    })
  }
}

// --- Details Modal (on-demand) ---
const isDetailsOpen = ref(false)
const detailsLoading = ref(false)
const detailsUser = ref<any>(null)
const detailsStats = ref<any>(null)

async function openDetails(user: any) {
  isDetailsOpen.value = true
  detailsLoading.value = true
  detailsUser.value = null
  detailsStats.value = null
  try {
    const { data } = await useCustomFetch<any>(`/admin/users/${user.id}/details`)
    detailsUser.value = data.user
    detailsStats.value = data.tenantStats
  } catch (error) {
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível carregar detalhes.',
      icon: 'ph:warning-circle-fill',
    })
  } finally {
    detailsLoading.value = false
  }
}

onMounted(fetchUsers)

watch(search, useDebounceFn(() => {
  page.value = 1
  fetchUsers()
}, 500))

function formatDate(date: string) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR')
}

function formatDateTime(date: string) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'primary',
    TRIAL: 'info',
    PAST_DUE: 'warning',
    CANCELED: 'danger',
    EXPIRED: 'danger',
    PENDING_INVITE: 'warning',
    PENDING: 'warning',
  }
  return map[status] || 'muted'
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'Ativo',
    TRIAL: 'Trial',
    PAST_DUE: 'Pendente',
    CANCELED: 'Cancelado',
    EXPIRED: 'Expirado',
    PENDING_INVITE: 'Convite Pendente',
    PENDING: 'Pendente',
  }
  return map[status] || status
}

function getDeclarationStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    submitted: 'Entregue',
    cancelled: 'Cancelada',
  }
  return map[status] || status
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <BaseHeading as="h2" size="2xl">Gestão de Usuários</BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500">
            Administre permissões e assinaturas · <strong>{{ totalUsers }}</strong> usuários cadastrados
          </BaseParagraph>
        </div>
      </div>

      <BaseCard class="p-4">
        <div class="flex items-center gap-4 mb-6">
          <div class="flex-1">
            <BaseInput v-model="search" placeholder="Buscar por nome, e-mail ou CPF..." icon="lucide:search"
              rounded="md" />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-xs uppercase text-muted-400 border-b border-muted-200 dark:border-muted-800">
                <th class="py-3 px-4">Usuário</th>
                <th class="py-3 px-4">Empresa</th>
                <th class="py-3 px-4 text-center">Clientes</th>
                <th class="py-3 px-4 text-center">IRs</th>
                <th class="py-3 px-4 text-center">Equipe</th>
                <th class="py-3 px-4">Plano</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Cargo</th>
                <th class="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-muted-200 dark:divide-muted-800">
              <tr v-if="loading" v-for="i in 5" :key="i" class="animate-pulse">
                <td colspan="10" class="py-4 px-4">
                  <div class="h-10 bg-muted-100 dark:bg-muted-800 rounded"></div>
                </td>
              </tr>
              <tr v-else v-for="user in users" :key="user.id"
                class="text-sm hover:bg-muted-50 dark:hover:bg-muted-900/50 transition-colors cursor-pointer"
                @click="openDetails(user)">
                <td class="py-4 px-4">
                  <div class="flex items-center gap-3">
                    <BaseAvatar :src="user.tenant?.logo || user.photo" size="sm" />
                    <div>
                      <p class="text-muted-900 dark:text-white font-medium">{{ user.name }}</p>
                      <p class="text-xs text-muted-500">{{ user.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <div v-if="user.tenant">
                    <p class="text-muted-900 dark:text-white text-sm">{{ user.tenant.name }}</p>
                    <p v-if="user.tenant.document" class="text-xs text-muted-400">{{ user.tenant.document }}</p>
                  </div>
                  <span v-else class="text-xs text-muted-400 italic">Sem empresa</span>
                </td>
                <td class="py-4 px-4 text-center">
                  <span class="inline-flex items-center gap-1 text-sm font-semibold text-muted-700 dark:text-muted-300">
                    <Icon name="ph:users" class="size-3.5 text-muted-400" />
                    {{ user.tenant?._count?.clients ?? '—' }}
                  </span>
                </td>
                <td class="py-4 px-4 text-center">
                  <span class="inline-flex items-center gap-1 text-sm font-semibold text-muted-700 dark:text-muted-300">
                    <Icon name="ph:files" class="size-3.5 text-muted-400" />
                    {{ user.tenant?._count?.taxDeclarations ?? '—' }}
                  </span>
                </td>
                <td class="py-4 px-4 text-center">
                  <span class="inline-flex items-center gap-1 text-sm font-semibold text-muted-700 dark:text-muted-300">
                    <Icon name="ph:user-circle" class="size-3.5 text-muted-400" />
                    {{ user.tenant?._count?.users ?? '—' }}
                  </span>
                </td>
                <td class="py-4 px-4">
                  <BaseButton size="sm" variant="muted" rounded="full" class="px-3"
                    @click.stop="openSubscriptionModal(user)">
                    {{ user.subscription?.plan?.name || 'Sem Plano' }}
                  </BaseButton>
                </td>
                <td class="py-4 px-4">
                  <BaseTag rounded="full" :variant="getStatusColor(user.subscription?.status || user.status)" size="sm">
                    {{ getStatusLabel(user.subscription?.status || user.status) }}
                  </BaseTag>
                </td>
                <td class="py-4 px-4">
                  <span class="text-xs text-muted-500">{{ user.role?.name || '—' }}</span>
                </td>
                <td class="py-4 px-4 text-right" @click.stop>
                  <div class="flex justify-end gap-2">
                    <BaseButton size="sm" variant="muted" rounded="md" @click="openDetails(user)" title="Detalhes">
                      <Icon name="ph:eye" class="size-3" />
                    </BaseButton>
                    <BaseButton size="sm" variant="muted" rounded="md" @click="openSubscriptionModal(user)"
                      title="Editar assinatura">
                      <Icon name="lucide:edit" class="size-3" />
                    </BaseButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="totalPages > 1" class="mt-6 flex justify-center">
          <BasePagination :total-items="totalUsers" :items-per-page="20" :current-page="page"
            @update:current-page="(p: number) => { page = p; fetchUsers(); }" rounded="md" />
        </div>
      </BaseCard>

      <!-- Details Modal (on-demand enrichment) -->
      <div v-if="isDetailsOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-muted-900/50 backdrop-blur-sm"
        @click.self="isDetailsOpen = false">
        <BaseCard class="w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl p-0">
          <!-- Loading state -->
          <div v-if="detailsLoading" class="p-12 flex flex-col items-center justify-center gap-4">
            <div class="size-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin">
            </div>
            <BaseText size="sm" class="text-muted-400">Carregando detalhes...</BaseText>
          </div>

          <!-- Content -->
          <template v-else-if="detailsUser">
            <!-- Header -->
            <div class="flex items-start justify-between p-6 border-b border-muted-200 dark:border-muted-800">
              <div class="flex items-center gap-4">
                <BaseAvatar :src="detailsUser.photo" size="lg" />
                <div>
                  <BaseHeading as="h3" size="lg">{{ detailsUser.name }}</BaseHeading>
                  <p class="text-sm text-muted-500">{{ detailsUser.email }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <BaseTag rounded="full"
                      :variant="getStatusColor(detailsUser.subscription?.status || detailsUser.status)" size="sm">
                      {{ getStatusLabel(detailsUser.subscription?.status || detailsUser.status) }}
                    </BaseTag>
                    <BaseTag v-if="detailsUser.isAdmin" rounded="full" variant="primary" size="sm">
                      Admin
                    </BaseTag>
                    <BaseTag rounded="full" variant="muted" size="sm">
                      {{ detailsUser.role?.name || 'Sem cargo' }}
                    </BaseTag>
                  </div>
                </div>
              </div>
              <BaseButton variant="muted" rounded="full" size="sm" @click="isDetailsOpen = false">
                <Icon name="lucide:x" class="size-4" />
              </BaseButton>
            </div>

            <!-- User Info -->
            <div class="p-6 space-y-6">
              <!-- Quick info row -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                  <p class="text-xs text-muted-400 mb-1">Cadastro</p>
                  <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{ formatDate(detailsUser.createdAt)
                  }}</p>
                </div>
                <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                  <p class="text-xs text-muted-400 mb-1">Último Login</p>
                  <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{
                    formatDateTime(detailsUser.lastLoginAt) }}</p>
                </div>
                <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                  <p class="text-xs text-muted-400 mb-1">CPF</p>
                  <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{ detailsUser.document || '—' }}
                  </p>
                </div>
                <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                  <p class="text-xs text-muted-400 mb-1">Telefone</p>
                  <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{ detailsUser.phone || '—' }}</p>
                </div>
              </div>

              <!-- Tenant / Company section -->
              <div v-if="detailsUser.tenant" class="space-y-4">
                <div class="flex items-center gap-2">
                  <Icon name="ph:buildings" class="size-5 text-primary-500" />
                  <BaseHeading as="h4" size="md">Empresa: {{ detailsUser.tenant.name }}</BaseHeading>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div v-if="detailsUser.tenant.tradeName" class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                    <p class="text-xs text-muted-400 mb-1">Nome Fantasia</p>
                    <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{ detailsUser.tenant.tradeName }}
                    </p>
                  </div>
                  <div v-if="detailsUser.tenant.document" class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                    <p class="text-xs text-muted-400 mb-1">CNPJ</p>
                    <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{ detailsUser.tenant.document }}
                    </p>
                  </div>
                  <div v-if="detailsUser.tenant.email" class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                    <p class="text-xs text-muted-400 mb-1">E-mail Empresa</p>
                    <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{ detailsUser.tenant.email }}</p>
                  </div>
                  <div v-if="detailsUser.tenant.phone || detailsUser.tenant.whatsapp"
                    class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                    <p class="text-xs text-muted-400 mb-1">Telefone/WhatsApp</p>
                    <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{ detailsUser.tenant.whatsapp ||
                      detailsUser.tenant.phone }}</p>
                  </div>
                  <div v-if="detailsUser.tenant.city" class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                    <p class="text-xs text-muted-400 mb-1">Localização</p>
                    <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{ detailsUser.tenant.city }}<span
                        v-if="detailsUser.tenant.state"> / {{ detailsUser.tenant.state }}</span></p>
                  </div>
                  <div v-if="detailsUser.tenant.domain || detailsUser.tenant.slug"
                    class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                    <p class="text-xs text-muted-400 mb-1">Domínio / Slug</p>
                    <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{ detailsUser.tenant.domain ||
                      detailsUser.tenant.slug || '—' }}</p>
                  </div>
                </div>

                <!-- Tenant counts -->
                <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div
                    class="text-center p-4 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/10">
                    <p class="text-2xl font-bold text-primary-600 dark:text-primary-400">{{
                      detailsUser.tenant._count?.clients ?? 0 }}</p>
                    <p class="text-xs text-muted-500 mt-1">Clientes</p>
                  </div>
                  <div
                    class="text-center p-4 rounded-xl bg-gradient-to-br from-info-500/10 to-info-600/5 border border-info-500/10">
                    <p class="text-2xl font-bold text-info-600 dark:text-info-400">{{
                      detailsUser.tenant._count?.taxDeclarations ?? 0 }}</p>
                    <p class="text-xs text-muted-500 mt-1">Declarações</p>
                  </div>
                  <div
                    class="text-center p-4 rounded-xl bg-gradient-to-br from-success-500/10 to-success-600/5 border border-success-500/10">
                    <p class="text-2xl font-bold text-success-600 dark:text-success-400">{{
                      detailsUser.tenant._count?.users ?? 0 }}</p>
                    <p class="text-xs text-muted-500 mt-1">Membros</p>
                  </div>
                  <div
                    class="text-center p-4 rounded-xl bg-gradient-to-br from-warning-500/10 to-warning-600/5 border border-warning-500/10">
                    <p class="text-2xl font-bold text-warning-600 dark:text-warning-400">{{
                      detailsUser.tenant._count?.collectionLinks ?? 0 }}</p>
                    <p class="text-xs text-muted-500 mt-1">Links de Coleta</p>
                  </div>
                  <div
                    class="text-center p-4 rounded-xl bg-gradient-to-br from-danger-500/10 to-danger-600/5 border border-danger-500/10">
                    <p class="text-2xl font-bold text-danger-600 dark:text-danger-400">{{
                      detailsUser.tenant._count?.payments ?? 0 }}</p>
                    <p class="text-xs text-muted-500 mt-1">Pagamentos</p>
                  </div>
                </div>
              </div>

              <!-- Subscription details -->
              <div v-if="detailsUser.subscription" class="space-y-4">
                <div class="flex items-center gap-2">
                  <Icon name="ph:credit-card" class="size-5 text-primary-500" />
                  <BaseHeading as="h4" size="md">Assinatura</BaseHeading>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                    <p class="text-xs text-muted-400 mb-1">Plano</p>
                    <p class="text-sm font-bold text-muted-800 dark:text-muted-200">{{
                      detailsUser.subscription.plan?.name }}</p>
                  </div>
                  <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                    <p class="text-xs text-muted-400 mb-1">Vencimento</p>
                    <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{
                      formatDate(detailsUser.subscription.currentPeriodEnd) }}</p>
                  </div>
                  <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                    <p class="text-xs text-muted-400 mb-1">Limite Funcionários</p>
                    <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{
                      detailsUser.subscription.employeesLimit }}</p>
                  </div>
                  <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                    <p class="text-xs text-muted-400 mb-1">Limite IRs</p>
                    <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{
                      detailsUser.subscription.taxDeclarationsLimit }}</p>
                  </div>
                </div>

                <!-- Features -->
                <div class="flex flex-wrap gap-2">
                  <BaseTag v-if="detailsUser.subscription.hasWhitelabel" rounded="full" variant="primary" size="sm">
                    <Icon name="ph:paint-brush" class="size-3 me-1" /> Whitelabel
                  </BaseTag>
                  <BaseTag v-if="detailsUser.subscription.hasReports" rounded="full" variant="primary" size="sm">
                    <Icon name="ph:chart-bar" class="size-3 me-1" /> Relatórios
                  </BaseTag>
                  <BaseTag v-if="detailsUser.subscription.hasApi" rounded="full" variant="primary" size="sm">
                    <Icon name="ph:code" class="size-3 me-1" /> API
                  </BaseTag>
                  <BaseTag v-if="detailsUser.subscription.hasTeamManagement" rounded="full" variant="primary" size="sm">
                    <Icon name="ph:users-three" class="size-3 me-1" /> Gestão Equipe
                  </BaseTag>
                  <BaseTag v-if="detailsUser.subscription.canViewAllFilesDrive" rounded="full" variant="primary"
                    size="sm">
                    <Icon name="ph:folder-open" class="size-3 me-1" /> Drive Completo
                  </BaseTag>
                </div>

                <!-- Storage bar -->
                <div v-if="detailsStats" class="space-y-1">
                  <div class="flex items-center justify-between text-xs text-muted-500">
                    <span>Storage</span>
                    <span>{{ detailsStats.storageUsedMb }} / {{ detailsStats.storageMbLimit }} MB</span>
                  </div>
                  <div class="h-2 bg-muted-200 dark:bg-muted-800 rounded-full overflow-hidden">
                    <div class="h-full bg-primary-500 rounded-full transition-all"
                      :style="{ width: Math.min((detailsStats.storageUsedMb / detailsStats.storageMbLimit) * 100, 100) + '%' }">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tenant Stats -->
              <div v-if="detailsStats" class="space-y-4">
                <div class="flex items-center gap-2">
                  <Icon name="ph:chart-pie" class="size-5 text-primary-500" />
                  <BaseHeading as="h4" size="md">Estatísticas da Empresa</BaseHeading>
                </div>

                <!-- Revenue -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    class="p-4 rounded-xl bg-gradient-to-br from-success-500/10 to-success-600/5 border border-success-500/10">
                    <p class="text-xs text-muted-500 mb-1">Receita Total Gerada</p>
                    <p class="text-xl font-bold text-success-600 dark:text-success-400">{{
                      formatCurrency(detailsStats.totalRevenue) }}</p>
                    <p class="text-xs text-muted-400 mt-1">{{ detailsStats.totalPayments }} pagamento(s)</p>
                  </div>
                  <div class="p-4 rounded-xl bg-muted-50 dark:bg-muted-900/50">
                    <p class="text-xs text-muted-500 mb-2">Declarações por Ano</p>
                    <div class="space-y-1.5">
                      <div v-for="item in detailsStats.declarationsByYear" :key="item.taxYear"
                        class="flex items-center justify-between text-sm">
                        <span class="text-muted-600 dark:text-muted-400">{{ item.taxYear }}</span>
                        <span class="font-semibold text-muted-800 dark:text-muted-200">{{ item._count }}</span>
                      </div>
                      <p v-if="!detailsStats.declarationsByYear?.length" class="text-xs text-muted-400 italic">Nenhuma
                        declaração</p>
                    </div>
                  </div>
                </div>

                <!-- Declarations by status -->
                <div v-if="detailsStats.declarationsByStatus?.length" class="space-y-2">
                  <p class="text-xs text-muted-400 uppercase font-medium">Declarações por Status</p>
                  <div class="flex flex-wrap gap-2">
                    <div v-for="item in detailsStats.declarationsByStatus" :key="item.status"
                      class="px-3 py-1.5 rounded-lg bg-muted-50 dark:bg-muted-900/50 text-sm">
                      <span class="text-muted-500">{{ getDeclarationStatusLabel(item.status) }}:</span>
                      <span class="font-semibold text-muted-800 dark:text-muted-200 ml-1">{{ item._count }}</span>
                    </div>
                  </div>
                </div>

                <!-- Recent Payments -->
                <div v-if="detailsStats.recentPayments?.length" class="space-y-2">
                  <p class="text-xs text-muted-400 uppercase font-medium">Últimos Pagamentos</p>
                  <div
                    class="divide-y divide-muted-100 dark:divide-muted-800 rounded-lg bg-muted-50 dark:bg-muted-900/50 overflow-hidden">
                    <div v-for="(payment, idx) in detailsStats.recentPayments" :key="idx"
                      class="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div>
                        <p class="text-muted-700 dark:text-muted-300">{{ payment.description || payment.paymentMethod ||
                          'Pagamento' }}</p>
                        <p class="text-xs text-muted-400">{{ formatDate(payment.paidAt) }}</p>
                      </div>
                      <span class="font-semibold text-success-600 dark:text-success-400">{{
                        formatCurrency(payment.amount) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="!detailsUser.tenant" class="text-center py-8">
                <Icon name="ph:buildings" class="size-12 text-muted-300 mx-auto mb-3" />
                <p class="text-sm text-muted-400">Este usuário não possui empresa vinculada.</p>
              </div>
            </div>
          </template>
        </BaseCard>
      </div>

      <!-- Subscription Modal -->
      <div v-if="isModalOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-muted-900/50 backdrop-blur-sm">
        <BaseCard class="w-full max-w-xl p-8 shadow-2xl">
          <div class="flex items-center justify-between mb-8">
            <div>
              <BaseHeading as="h3" size="lg">Editar Assinatura</BaseHeading>
              <BaseParagraph size="sm" class="text-muted-500">Alterar limites e status para {{ selectedUser?.name }}
              </BaseParagraph>
            </div>
            <BaseButton variant="muted" rounded="full" size="sm" @click="isModalOpen = false">
              <Icon name="lucide:x" class="size-4" />
            </BaseButton>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BaseField label="Status da Assinatura">
              <BaseSelect v-model="subForm.status" icon="ph:info" rounded="md">
                <BaseSelectItem value="ACTIVE">Ativo</BaseSelectItem>
                <BaseSelectItem value="TRIAL">Trial</BaseSelectItem>
                <BaseSelectItem value="PAST_DUE">Pagamento Pendente</BaseSelectItem>
                <BaseSelectItem value="CANCELED">Cancelado</BaseSelectItem>
                <BaseSelectItem value="EXPIRED">Expirado</BaseSelectItem>
              </BaseSelect>
            </BaseField>

            <BaseField label="Vencimento">
              <BaseInput v-model="subForm.currentPeriodEnd" type="date" icon="ph:calendar" rounded="md" />
            </BaseField>

            <BaseField label="Limite Funcionários">
              <BaseInput v-model="subForm.employeesLimit" type="number" icon="ph:users" rounded="md" />
            </BaseField>

            <BaseField label="Limite IRs (Ano)">
              <BaseInput v-model="subForm.taxDeclarationsLimit" type="number" icon="ph:files" rounded="md" />
            </BaseField>

            <BaseField label="Espaço Storage (MB)">
              <BaseInput v-model="subForm.storageMbLimit" type="number" icon="ph:database" rounded="md" />
            </BaseField>

            <div class="space-y-4 pt-4 border-t border-muted-200 dark:border-muted-800 md:col-span-2">
              <div class="flex items-center justify-between">
                <BaseText size="sm">Recurso Whitelabel</BaseText>
                <BaseCheckbox v-model="subForm.hasWhitelabel" color="primary" />
              </div>
              <div class="flex items-center justify-between">
                <BaseText size="sm">Relatórios Avançados</BaseText>
                <BaseCheckbox v-model="subForm.hasReports" color="primary" />
              </div>
              <div class="flex items-center justify-between">
                <BaseText size="sm">Acesso via API</BaseText>
                <BaseCheckbox v-model="subForm.hasApi" color="primary" />
              </div>
              <div class="flex items-center justify-between">
                <BaseText size="sm">Gestão de Equipe</BaseText>
                <BaseCheckbox v-model="subForm.hasTeamManagement" color="primary" />
              </div>
              <div class="flex items-center justify-between">
                <BaseText size="sm">Ver todos os arquivos do Drive</BaseText>
                <BaseCheckbox v-model="subForm.canViewAllFilesDrive" color="primary" />
              </div>
            </div>
          </div>

          <div class="mt-10 flex justify-end gap-3">
            <BaseButton variant="muted" @click="isModalOpen = false">Cancelar</BaseButton>
            <BaseButton variant="primary" @click="updateSubscription">Salvar Alterações</BaseButton>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
