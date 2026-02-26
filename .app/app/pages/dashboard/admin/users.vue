<script setup lang="ts">
import { PanelsPanelAdminUserAnalytics } from '#components'
const { open } = usePanels()
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

definePageMeta({
  title: 'Gestão de Usuários - Admin',
})

const route = useRoute()
const router = useRouter()
const users = ref<any[]>([])
const loading = ref(true)
const page = ref(1)
const totalPages = ref(1)
const search = ref('')
const planId = ref(route.query.planId as string || '')
const couponId = ref(route.query.couponId as string || '')
const isPartner = ref(route.query.isPartner === 'true')
const roleName = ref(route.query.roleName as string || '')
const isMember = ref(route.query.isMember === 'true')
const totalUsers = ref(0)

async function fetchUsers() {
  try {
    loading.value = true
    const params = new URLSearchParams()
    params.append('page', page.value.toString())
    if (search.value) params.append('search', search.value)
    if (planId.value) params.append('planId', planId.value)
    if (couponId.value) params.append('couponId', couponId.value)
    if (isPartner.value) params.append('isPartner', 'true')
    if (roleName.value) params.append('roleName', roleName.value)
    if (isMember.value) params.append('isMember', 'true')

    const { data } = await useCustomFetch<any>(`/admin/users?${params.toString()}`)
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
    status: (sub.status as any) || 'ACTIVE',
    currentPeriodEnd: sub.currentPeriodEnd ? (new Date(sub.currentPeriodEnd as any).toISOString().split('T')[0] as string) : '',
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

// --- Analytics Panel ---
function openAnalytics(userId: string) {
  open(PanelsPanelAdminUserAnalytics, {
    userId: userId,
  })
}

async function openDetails(user: any) {
  openAnalytics(user.id)
}

onMounted(fetchUsers)

watch(search, useDebounceFn(() => {
  page.value = 1
  fetchUsers()
}, 500))

watch(() => route.query.planId, (newVal) => {
  planId.value = newVal as string || ''
})

watch(() => route.query.couponId, (newVal) => {
  couponId.value = newVal as string || ''
})

watch(() => route.query.isPartner, (newVal) => {
  isPartner.value = newVal === 'true'
})

// Single watch for any relevant filter change to trigger fetch
watch([planId, couponId, isPartner], () => {
  page.value = 1
  fetchUsers()
})

function clearFilter() {
  planId.value = ''
  couponId.value = ''
  isPartner.value = false
  router.push({ query: { ...route.query, planId: undefined, couponId: undefined, isPartner: undefined } })
}

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

function getStatusColor(status: string): any {
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
        <div class="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div class="flex-1">
            <BaseInput v-model="search" placeholder="Buscar por nome, e-mail ou CPF..." icon="lucide:search"
              rounded="md" />
          </div>
          <div v-if="planId || couponId || isPartner"
            class="flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 text-primary-600 rounded-lg border border-primary-500/20">
            <Icon name="solar:filter-bold-duotone" class="size-4" />
            <span class="text-xs font-semibold uppercase tracking-wider">
              Filtrando por {{ planId ? 'Plano' : couponId ? 'Cupom' : 'Parceiros' }}
            </span>
            <button @click="clearFilter" class="hover:bg-primary-500/20 rounded p-0.5">
              <Icon name="lucide:x" class="size-3" />
            </button>
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
                      <div class="flex items-center gap-2">
                        <p class="text-muted-900 dark:text-white font-medium">{{ user.name }}</p>
                        <BaseTag v-show="user.isPartner" rounded="full" variant="primary" size="sm" class="px-2 py-0">
                          Parceiro</BaseTag>
                      </div>
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
                  <BaseTag rounded="full" :color="getStatusColor(user.subscription?.status || user.status)"
                    variant="muted" size="sm">
                    {{ getStatusLabel(user.subscription?.status || user.status) }}
                  </BaseTag>
                </td>
                <td class="py-4 px-4">
                  <span class="text-xs text-muted-500">{{ user.role?.name || '—' }}</span>
                </td>
                <td class="py-4 px-4 text-right" @click.stop>
                  <div class="flex justify-end gap-2">
                    <BaseButton size="sm" variant="muted" rounded="md" @click="openAnalytics(user.id)"
                      title="Ver Analítico">
                      <Icon name="solar:chart-square-bold-duotone" class="size-4 text-primary-500" />
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
