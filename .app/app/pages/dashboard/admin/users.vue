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

onMounted(fetchUsers)

watch(search, useDebounceFn(() => {
  page.value = 1
  fetchUsers()
}, 500))

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <BaseHeading as="h2" size="2xl">Gestão de Usuários</BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500">Administre permissões e assinaturas</BaseParagraph>
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
                <th class="py-3 px-4">Empresa (Tenant)</th>
                <th class="py-3 px-4">Plano</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Admin?</th>
                <th class="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-muted-200 dark:divide-muted-800">
              <tr v-if="loading" v-for="i in 5" :key="i" class="animate-pulse">
                <td colspan="6" class="py-4 px-4">
                  <div class="h-10 bg-muted-100 dark:bg-muted-800 rounded"></div>
                </td>
              </tr>
              <tr v-else v-for="user in users" :key="user.id"
                class="text-sm hover:bg-muted-50 dark:hover:bg-muted-900/50 transition-colors">
                <td class="py-4 px-4">
                  <div class="flex items-center gap-3">
                    <BaseAvatar :src="user.photo" size="sm" />
                    <div>
                      <p class="text-muted-900 dark:text-white">{{ user.name }}</p>
                      <p class="text-xs text-muted-500">{{ user.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <BaseText size="sm">{{ user.tenant?.name || 'Sem empresa' }}</BaseText>
                </td>
                <td class="py-4 px-4">
                  <BaseButton size="sm" variant="muted" rounded="full" class="px-3"
                    @click="openSubscriptionModal(user)">
                    {{ user.subscription?.plan?.name || 'Sem Plano' }}
                  </BaseButton>
                </td>
                <td class="py-4 px-4">
                  <BaseTag rounded="full" :variant="user.status === 'ACTIVE' ? 'primary' : 'muted'" size="sm">
                    {{ user.status }}
                  </BaseTag>
                </td>
                <td class="py-4 px-4">
                  <BaseSwitch v-model="user.isAdmin" @change="toggleAdmin(user)" />
                </td>
                <td class="py-4 px-4 text-right">
                  <div class="flex justify-end gap-2">
                    <BaseButton size="sm" variant="muted" rounded="md">
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
              <BaseSelect v-model="subForm.status">
                <option value="ACTIVE">Ativo</option>
                <option value="TRIAL">Trial</option>
                <option value="PAST_DUE">Pagamento Pendente</option>
                <option value="CANCELED">Cancelado</option>
                <option value="EXPIRED">Expirado</option>
              </BaseSelect>
            </BaseField>

            <BaseField label="Vencimento">
              <BaseInput v-model="subForm.currentPeriodEnd" type="date" />
            </BaseField>

            <BaseField label="Limite Funcionários">
              <BaseInput v-model="subForm.employeesLimit" type="number" />
            </BaseField>

            <BaseField label="Limite IRs (Ano)">
              <BaseInput v-model="subForm.taxDeclarationsLimit" type="number" />
            </BaseField>

            <BaseField label="Espaço Storage (MB)">
              <BaseInput v-model="subForm.storageMbLimit" type="number" />
            </BaseField>

            <div class="space-y-4 pt-4 border-t border-muted-200 dark:border-muted-800 md:col-span-2">
              <div class="flex items-center justify-between">
                <BaseText size="sm">Recurso Whitelabel</BaseText>
                <BaseSwitch v-model="subForm.hasWhitelabel" />
              </div>
              <div class="flex items-center justify-between">
                <BaseText size="sm">Relatórios Avançados</BaseText>
                <BaseSwitch v-model="subForm.hasReports" />
              </div>
              <div class="flex items-center justify-between">
                <BaseText size="sm">Acesso via API</BaseText>
                <BaseSwitch v-model="subForm.hasApi" />
              </div>
              <div class="flex items-center justify-between">
                <BaseText size="sm">Gestão de Equipe</BaseText>
                <BaseSwitch v-model="subForm.hasTeamManagement" />
              </div>
              <div class="flex items-center justify-between">
                <BaseText size="sm">Ver todos os arquivos do Drive</BaseText>
                <BaseSwitch v-model="subForm.canViewAllFilesDrive" />
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
