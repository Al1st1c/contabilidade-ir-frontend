<script setup lang="ts">
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

definePageMeta({
  layout: 'default',
  title: 'Gestão de Afiliados',
})

const activeTab = ref('affiliates')
const affiliates = ref<any[]>([])
const withdrawals = ref<any[]>([])
const isLoading = ref(false)

// Filters
const affiliateStatus = ref('')
const withdrawalStatus = ref('')

async function fetchAffiliates() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch('/affiliate/admin/list', {
      params: { status: affiliateStatus.value || undefined }
    })
    affiliates.value = data || []
  } catch (err) {
    toaster.add({ title: 'Erro ao carregar afiliados', color: 'danger' })
  } finally {
    isLoading.value = false
  }
}

async function fetchWithdrawals() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch('/affiliate/admin/withdrawals', {
      params: { status: withdrawalStatus.value || undefined }
    })
    withdrawals.value = data || []
  } catch (err) {
    toaster.add({ title: 'Erro ao carregar saques', color: 'danger' })
  } finally {
    isLoading.value = false
  }
}

// Actions
async function approveAffiliate(id: string) {
  if (!confirm('Aprovar este afiliado?')) return
  try {
    await useCustomFetch(`/affiliate/admin/${id}/approve`, { method: 'PATCH' })
    toaster.add({ title: 'Afiliado aprovado', color: 'success' })
    fetchAffiliates()
  } catch (err) {
    toaster.add({ title: 'Erro ao aprovar', color: 'danger' })
  }
}

async function rejectAffiliate(id: string) {
  if (!confirm('Rejeitar este afiliado?')) return
  try {
    await useCustomFetch(`/affiliate/admin/${id}/reject`, { method: 'PATCH' })
    toaster.add({ title: 'Afiliado rejeitado', color: 'info' })
    fetchAffiliates()
  } catch (err) {
    toaster.add({ title: 'Erro ao rejeitar', color: 'danger' })
  }
}

async function approveWithdrawal(id: string) {
  const txId = prompt('ID da Transação (opcional):')
  try {
    await useCustomFetch(`/affiliate/admin/withdrawals/${id}/approve`, {
      method: 'PATCH',
      body: { transactionId: txId }
    })
    toaster.add({ title: 'Saque marcado como PAGO', color: 'success' })
    fetchWithdrawals()
  } catch (err) {
    toaster.add({ title: 'Erro ao aprovar saque', color: 'danger' })
  }
}

async function rejectWithdrawal(id: string) {
  const reason = prompt('Motivo da rejeição:')
  if (!reason) return

  try {
    await useCustomFetch(`/affiliate/admin/withdrawals/${id}/reject`, {
      method: 'PATCH',
      body: { reason }
    })
    toaster.add({ title: 'Saque rejeitado', color: 'info' })
    fetchWithdrawals()
  } catch (err) {
    toaster.add({ title: 'Erro ao rejeitar saque', color: 'danger' })
  }
}

// --- Edit Modal ---
const isEditOpen = ref(false)
const editLoading = ref(false)
const editAffiliate = ref<any>(null)
const editForm = ref({
  commissionPercent: 10,
  discountPercent: 0,
  status: 'PENDING',
  couponCode: '',
  couponDiscountValue: 0,
})

function openEditModal(aff: any) {
  editAffiliate.value = aff
  const coupon = aff.user?.couponsCreated?.[0]
  editForm.value = {
    commissionPercent: Number(aff.commissionPercent) || 10,
    discountPercent: Number(aff.discountPercent) || 0,
    status: aff.status || 'PENDING',
    couponCode: coupon?.code || '',
    couponDiscountValue: coupon?.discountValue || 0,
  }
  isEditOpen.value = true
}

async function saveEdit() {
  if (!editAffiliate.value) return
  editLoading.value = true
  try {
    await useCustomFetch(`/affiliate/admin/${editAffiliate.value.id}/update`, {
      method: 'PATCH',
      body: editForm.value,
    })
    toaster.add({ title: 'Afiliado atualizado com sucesso', icon: 'ph:check-circle-fill' })
    isEditOpen.value = false
    fetchAffiliates()
  } catch (err) {
    toaster.add({ title: 'Erro ao atualizar afiliado', icon: 'ph:warning-circle-fill' })
  } finally {
    editLoading.value = false
  }
}

// --- Details Modal (on-demand) ---
const isDetailsOpen = ref(false)
const detailsLoading = ref(false)
const detailsData = ref<any>(null)

async function openDetails(aff: any) {
  isDetailsOpen.value = true
  detailsLoading.value = true
  detailsData.value = null
  try {
    const { data } = await useCustomFetch<any>(`/affiliate/admin/${aff.id}/details`)
    detailsData.value = data
  } catch (err) {
    toaster.add({ title: 'Erro ao carregar detalhes', icon: 'ph:warning-circle-fill' })
  } finally {
    detailsLoading.value = false
  }
}

function formatCurrency(val: any) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(date: string) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR')
}

function getStatusColor(status: string): 'primary' | 'muted' | 'none' | 'default' | 'dark' | undefined {
  const map: Record<string, 'primary' | 'muted'> = {
    ACTIVE: 'primary',
    PENDING: 'muted',
    REJECTED: 'muted',
    PAID: 'primary',
  }
  return map[status] || 'muted'
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'Ativo',
    PENDING: 'Pendente',
    REJECTED: 'Rejeitado',
    PAID: 'Pago',
    AVAILABLE: 'Disponível',
  }
  return map[status] || status
}

watch(activeTab, (val) => {
  if (val === 'affiliates') fetchAffiliates()
  else fetchWithdrawals()
}, { immediate: true })

// Watch filters
watch(affiliateStatus, () => { if (activeTab.value === 'affiliates') fetchAffiliates() })
watch(withdrawalStatus, () => { if (activeTab.value === 'withdrawals') fetchWithdrawals() })
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <BaseHeading as="h2" size="2xl">Gestão de Afiliados</BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500">Gerencie afiliados, comissões e cupons</BaseParagraph>
        </div>
      </div>

      <div class="flex gap-4 border-b border-muted-200 dark:border-muted-700">
        <button @click="activeTab = 'affiliates'" class="px-4 py-2 border-b-2 font-medium transition-colors"
          :class="activeTab === 'affiliates' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted-500 hover:text-muted-700'">
          Afiliados
        </button>
        <button @click="activeTab = 'withdrawals'" class="px-4 py-2 border-b-2 font-medium transition-colors"
          :class="activeTab === 'withdrawals' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted-500 hover:text-muted-700'">
          Solicitações de Saque
        </button>
      </div>

      <!-- AFFILIATES TAB -->
      <div v-if="activeTab === 'affiliates'" class="space-y-4">
        <div class="flex justify-end">
          <BaseListbox v-model="affiliateStatus" placeholder="Filtrar Status" :items="['PENDING', 'ACTIVE', 'REJECTED']"
            class="w-48" />
        </div>

        <BaseCard class="overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead class="bg-muted-50 dark:bg-muted-800">
                <tr>
                  <th class="p-4 text-xs font-semibold uppercase text-muted-500">Afiliado</th>
                  <th class="p-4 text-xs font-semibold uppercase text-muted-500">Status</th>
                  <th class="p-4 text-xs font-semibold uppercase text-muted-500 text-center">Indicações</th>
                  <th class="p-4 text-xs font-semibold uppercase text-muted-500">Cupom</th>
                  <th class="p-4 text-xs font-semibold uppercase text-muted-500 text-center">Comissão %</th>
                  <th class="p-4 text-xs font-semibold uppercase text-muted-500 text-right">Saldo</th>
                  <th class="p-4 text-xs font-semibold uppercase text-muted-500 text-right">Total Comissões</th>
                  <th class="p-4 text-xs font-semibold uppercase text-muted-500 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-muted-100 dark:divide-muted-700">
                <tr v-for="aff in affiliates" :key="aff.id"
                  class="hover:bg-muted-50 dark:hover:bg-muted-900/50 transition-colors cursor-pointer"
                  @click="openDetails(aff)">
                  <td class="p-4">
                    <div class="flex items-center gap-3">
                      <BaseAvatar :src="aff.user?.photo" size="sm" />
                      <div>
                        <p class="font-medium text-muted-800 dark:text-muted-100">{{ aff.user.name }}</p>
                        <p class="text-xs text-muted-500">{{ aff.user.email }}</p>
                        <p v-if="aff.user.phone" class="text-xs text-muted-400">{{ aff.user.phone }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="p-4">
                    <BaseTag :variant="getStatusColor(aff.status)" size="sm" rounded="full">
                      {{ getStatusLabel(aff.status) }}
                    </BaseTag>
                  </td>
                  <td class="p-4 text-center">
                    <span
                      class="inline-flex items-center gap-1 text-sm font-semibold text-muted-700 dark:text-muted-300">
                      <Icon name="ph:users" class="size-3.5 text-muted-400" />
                      {{ aff.user._count?.referralsSent ?? 0 }}
                    </span>
                  </td>
                  <td class="p-4">
                    <div v-if="aff.user.couponsCreated?.length" class="space-y-1">
                      <div v-for="coupon in aff.user.couponsCreated" :key="coupon.id"
                        class="inline-flex items-center gap-1.5">
                        <span
                          class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary-500/10 text-primary-600 dark:text-primary-400">
                          {{ coupon.code }}
                        </span>
                        <span class="text-xs text-muted-400">({{ coupon.discountValue }}% off · {{ coupon.usedCount }}
                          usos)</span>
                      </div>
                    </div>
                    <span v-else class="text-xs text-muted-400 italic">Nenhum cupom</span>
                  </td>
                  <td class="p-4 text-center">
                    <span class="text-sm font-semibold text-muted-700 dark:text-muted-300">{{
                      Number(aff.commissionPercent) }}%</span>
                  </td>
                  <td class="p-4 text-right">
                    <span class="text-sm font-semibold text-success-600 dark:text-success-400">{{
                      formatCurrency(aff.balance) }}</span>
                  </td>
                  <td class="p-4 text-right">
                    <span class="text-sm font-medium text-muted-600 dark:text-muted-300">{{
                      formatCurrency(aff.totalCommissions) }}</span>
                  </td>
                  <td class="p-4 text-right" @click.stop>
                    <div class="flex justify-end gap-2">
                      <BaseButton v-if="aff.status === 'PENDING'" size="sm" color="success"
                        @click="approveAffiliate(aff.id)">
                        Aprovar
                      </BaseButton>
                      <BaseButton v-if="aff.status === 'PENDING'" size="sm" color="danger" variant="pastel"
                        @click="rejectAffiliate(aff.id)">
                        Rejeitar
                      </BaseButton>
                      <BaseButton size="sm" variant="muted" rounded="md" @click="openDetails(aff)" title="Ver detalhes">
                        <Icon name="ph:eye" class="size-3" />
                      </BaseButton>
                      <BaseButton size="sm" variant="muted" rounded="md" @click="openEditModal(aff)" title="Editar">
                        <Icon name="lucide:edit" class="size-3" />
                      </BaseButton>
                    </div>
                  </td>
                </tr>
                <tr v-if="affiliates.length === 0 && !isLoading">
                  <td colspan="8" class="p-8 text-center text-muted-500">Nenhum afiliado encontrado.</td>
                </tr>
                <tr v-if="isLoading" v-for="i in 3" :key="i" class="animate-pulse">
                  <td colspan="8" class="py-4 px-4">
                    <div class="h-10 bg-muted-100 dark:bg-muted-800 rounded"></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>
      </div>

      <!-- WITHDRAWALS TAB -->
      <div v-if="activeTab === 'withdrawals'" class="space-y-4">
        <div class="flex justify-end">
          <BaseListbox v-model="withdrawalStatus" placeholder="Filtrar Status" :items="['PENDING', 'PAID', 'REJECTED']"
            class="w-48" />
        </div>

        <BaseCard class="overflow-hidden">
          <table class="w-full text-left">
            <thead class="bg-muted-50 dark:bg-muted-800">
              <tr>
                <th class="p-4 text-xs font-semibold uppercase text-muted-500">Data</th>
                <th class="p-4 text-xs font-semibold uppercase text-muted-500">Afiliado</th>
                <th class="p-4 text-xs font-semibold uppercase text-muted-500">Valor</th>
                <th class="p-4 text-xs font-semibold uppercase text-muted-500">Chave PIX</th>
                <th class="p-4 text-xs font-semibold uppercase text-muted-500">Status</th>
                <th class="p-4 text-xs font-semibold uppercase text-muted-500">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-muted-100 dark:divide-muted-700">
              <tr v-for="w in withdrawals" :key="w.id">
                <td class="p-4 text-sm">{{ formatDate(w.createdAt) }}</td>
                <td class="p-4">
                  <div class="font-medium text-sm">{{ w.affiliate.user.name }}</div>
                  <div class="text-xs text-muted-500">{{ w.affiliate.user.email }}</div>
                </td>
                <td class="p-4 text-sm font-bold text-success-500">{{ formatCurrency(w.amount) }}</td>
                <td class="p-4 text-xs">
                  <div>{{ w.pixKeyType }}</div>
                  <div class="font-mono">{{ w.pixKey }}</div>
                </td>
                <td class="p-4">
                  <BaseTag :variant="getStatusColor(w.status)" size="sm" rounded="full">
                    {{ getStatusLabel(w.status) }}
                  </BaseTag>
                </td>
                <td class="p-4">
                  <div class="flex gap-2">
                    <BaseButton v-if="w.status === 'PENDING'" size="sm" color="success"
                      @click="approveWithdrawal(w.id)">
                      Pagar
                    </BaseButton>
                    <BaseButton v-if="w.status === 'PENDING'" size="sm" color="danger" variant="pastel"
                      @click="rejectWithdrawal(w.id)">
                      Rejeitar
                    </BaseButton>
                  </div>
                </td>
              </tr>
              <tr v-if="withdrawals.length === 0">
                <td colspan="6" class="p-8 text-center text-muted-500">Nenhum saque encontrado.</td>
              </tr>
            </tbody>
          </table>
        </BaseCard>
      </div>

      <!-- Edit Modal -->
      <div v-if="isEditOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-muted-900/50 backdrop-blur-sm"
        @click.self="isEditOpen = false">
        <BaseCard class="w-full max-w-lg p-8 shadow-2xl">
          <div class="flex items-center justify-between mb-6">
            <div>
              <BaseHeading as="h3" size="lg">Editar Afiliado</BaseHeading>
              <BaseParagraph size="sm" class="text-muted-500">{{ editAffiliate?.user?.name }}</BaseParagraph>
            </div>
            <BaseButton variant="muted" rounded="full" size="sm" @click="isEditOpen = false">
              <Icon name="lucide:x" class="size-4" />
            </BaseButton>
          </div>

          <div class="space-y-5">
            <BaseField label="Status">
              <BaseSelect v-model="editForm.status" icon="ph:info" rounded="md">
                <option value="PENDING">Pendente</option>
                <option value="ACTIVE">Ativo</option>
                <option value="REJECTED">Rejeitado</option>
              </BaseSelect>
            </BaseField>

            <div class="grid grid-cols-2 gap-4">
              <BaseField label="Comissão do Afiliado (%)">
                <BaseInput v-model="editForm.commissionPercent" type="number" icon="ph:percent" rounded="md" />
              </BaseField>
              <BaseField label="Desconto do Afiliado (%)">
                <BaseInput v-model="editForm.discountPercent" type="number" icon="ph:tag" rounded="md" />
              </BaseField>
            </div>

            <div class="border-t border-muted-200 dark:border-muted-800 pt-5">
              <BaseHeading as="h4" size="sm" class="mb-3">Cupom de Desconto</BaseHeading>
              <div class="grid grid-cols-2 gap-4">
                <BaseField label="Código do Cupom">
                  <BaseInput v-model="editForm.couponCode" icon="ph:ticket" rounded="md" placeholder="Ex: JOAO1234" />
                </BaseField>
                <BaseField label="Desconto do Cupom (%)">
                  <BaseInput v-model="editForm.couponDiscountValue" type="number" icon="ph:percent" rounded="md" />
                </BaseField>
              </div>
            </div>
          </div>

          <div class="mt-8 flex justify-end gap-3">
            <BaseButton variant="muted" @click="isEditOpen = false">Cancelar</BaseButton>
            <BaseButton variant="primary" :loading="editLoading" @click="saveEdit">Salvar Alterações</BaseButton>
          </div>
        </BaseCard>
      </div>

      <!-- Details Modal (on-demand) -->
      <div v-if="isDetailsOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-muted-900/50 backdrop-blur-sm"
        @click.self="isDetailsOpen = false">
        <BaseCard class="w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl p-0">
          <!-- Loading -->
          <div v-if="detailsLoading" class="p-12 flex flex-col items-center justify-center gap-4">
            <div class="size-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
            <BaseText size="sm" class="text-muted-400">Carregando detalhes...</BaseText>
          </div>

          <template v-else-if="detailsData">
            <!-- Header -->
            <div class="flex items-start justify-between p-6 border-b border-muted-200 dark:border-muted-800">
              <div class="flex items-center gap-4">
                <BaseAvatar :src="detailsData.profile?.user?.photo" size="lg" />
                <div>
                  <BaseHeading as="h3" size="lg">{{ detailsData.profile?.user?.name }}</BaseHeading>
                  <p class="text-sm text-muted-500">{{ detailsData.profile?.user?.email }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <BaseTag rounded="full" :variant="getStatusColor(detailsData.profile?.status)" size="sm">
                      {{ getStatusLabel(detailsData.profile?.status) }}
                    </BaseTag>
                  </div>
                </div>
              </div>
              <BaseButton variant="muted" rounded="full" size="sm" @click="isDetailsOpen = false">
                <Icon name="lucide:x" class="size-4" />
              </BaseButton>
            </div>

            <div class="p-6 space-y-6">
              <!-- Stat cards -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div
                  class="text-center p-4 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/10">
                  <p class="text-2xl font-bold text-primary-600 dark:text-primary-400">{{
                    detailsData.profile?.user?._count?.referralsSent ?? 0 }}</p>
                  <p class="text-xs text-muted-500 mt-1">Indicações</p>
                </div>
                <div
                  class="text-center p-4 rounded-xl bg-gradient-to-br from-success-500/10 to-success-600/5 border border-success-500/10">
                  <p class="text-2xl font-bold text-success-600 dark:text-success-400">{{
                    formatCurrency(detailsData.totalCommissions) }}</p>
                  <p class="text-xs text-muted-500 mt-1">Total Comissões</p>
                </div>
                <div
                  class="text-center p-4 rounded-xl bg-gradient-to-br from-warning-500/10 to-warning-600/5 border border-warning-500/10">
                  <p class="text-2xl font-bold text-warning-600 dark:text-warning-400">{{
                    formatCurrency(detailsData.pendingCommissions) }}</p>
                  <p class="text-xs text-muted-500 mt-1">Comissões Pendentes</p>
                </div>
                <div
                  class="text-center p-4 rounded-xl bg-gradient-to-br from-info-500/10 to-info-600/5 border border-info-500/10">
                  <p class="text-2xl font-bold text-info-600 dark:text-info-400">{{
                    formatCurrency(detailsData.profile?.balance) }}</p>
                  <p class="text-xs text-muted-500 mt-1">Saldo Disponível</p>
                </div>
              </div>

              <!-- Config -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                  <p class="text-xs text-muted-400 mb-1">Comissão</p>
                  <p class="text-sm font-bold text-muted-800 dark:text-muted-200">{{
                    Number(detailsData.profile?.commissionPercent) }}%</p>
                </div>
                <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                  <p class="text-xs text-muted-400 mb-1">Desconto</p>
                  <p class="text-sm font-bold text-muted-800 dark:text-muted-200">{{
                    Number(detailsData.profile?.discountPercent) }}%</p>
                </div>
                <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                  <p class="text-xs text-muted-400 mb-1">PIX</p>
                  <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{ detailsData.profile?.pixKey ||
                    '—' }}</p>
                </div>
                <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                  <p class="text-xs text-muted-400 mb-1">Desde</p>
                  <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{
                    formatDate(detailsData.profile?.createdAt) }}</p>
                </div>
              </div>

              <!-- Coupons -->
              <div v-if="detailsData.profile?.user?.couponsCreated?.length" class="space-y-3">
                <div class="flex items-center gap-2">
                  <Icon name="ph:ticket" class="size-5 text-primary-500" />
                  <BaseHeading as="h4" size="md">Cupons</BaseHeading>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div v-for="coupon in detailsData.profile.user.couponsCreated" :key="coupon.id"
                    class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900/50 flex items-center justify-between">
                    <div>
                      <span class="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">{{ coupon.code
                        }}</span>
                      <p class="text-xs text-muted-400 mt-0.5">{{ coupon.discountValue }}% de desconto</p>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-semibold text-muted-700 dark:text-muted-300">{{ coupon.usedCount }} usos
                      </p>
                      <p class="text-xs text-muted-400">{{ coupon.maxUses ? `Máx: ${coupon.maxUses}` : 'Ilimitado' }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Referrals -->
              <div v-if="detailsData.referrals?.length" class="space-y-3">
                <div class="flex items-center gap-2">
                  <Icon name="ph:users-three" class="size-5 text-primary-500" />
                  <BaseHeading as="h4" size="md">Indicações ({{ detailsData.referrals.length }})</BaseHeading>
                </div>
                <div
                  class="divide-y divide-muted-100 dark:divide-muted-800 rounded-lg bg-muted-50 dark:bg-muted-900/50 overflow-hidden">
                  <div v-for="ref in detailsData.referrals" :key="ref.id"
                    class="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <p class="font-medium text-muted-700 dark:text-muted-300">{{ ref.referredUser?.name }}</p>
                      <p class="text-xs text-muted-400">{{ ref.referredUser?.email }} · {{ formatDate(ref.createdAt) }}
                      </p>
                    </div>
                    <div class="text-right">
                      <BaseTag rounded="full"
                        :variant="ref.referredUser?.subscription?.status === 'ACTIVE' ? 'primary' : 'muted'" size="sm">
                        {{ ref.referredUser?.subscription?.plan?.name || 'Sem plano' }}
                      </BaseTag>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Recent Commissions -->
              <div v-if="detailsData.profile?.commissions?.length" class="space-y-3">
                <div class="flex items-center gap-2">
                  <Icon name="ph:currency-circle-dollar" class="size-5 text-primary-500" />
                  <BaseHeading as="h4" size="md">Últimas Comissões</BaseHeading>
                </div>
                <div
                  class="divide-y divide-muted-100 dark:divide-muted-800 rounded-lg bg-muted-50 dark:bg-muted-900/50 overflow-hidden">
                  <div v-for="comm in detailsData.profile.commissions" :key="comm.id"
                    class="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div>
                      <BaseTag rounded="full" :variant="getStatusColor(comm.status)" size="sm">
                        {{ getStatusLabel(comm.status) }}
                      </BaseTag>
                      <span class="text-xs text-muted-400 ml-2">{{ formatDate(comm.createdAt) }}</span>
                    </div>
                    <span class="font-semibold text-success-600 dark:text-success-400">{{ formatCurrency(comm.amount)
                      }}</span>
                  </div>
                </div>
              </div>

              <!-- Recent Withdrawals -->
              <div v-if="detailsData.profile?.withdrawals?.length" class="space-y-3">
                <div class="flex items-center gap-2">
                  <Icon name="ph:money" class="size-5 text-primary-500" />
                  <BaseHeading as="h4" size="md">Últimos Saques</BaseHeading>
                </div>
                <div
                  class="divide-y divide-muted-100 dark:divide-muted-800 rounded-lg bg-muted-50 dark:bg-muted-900/50 overflow-hidden">
                  <div v-for="wd in detailsData.profile.withdrawals" :key="wd.id"
                    class="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div>
                      <BaseTag rounded="full" :variant="getStatusColor(wd.status)" size="sm">
                        {{ getStatusLabel(wd.status) }}
                      </BaseTag>
                      <span class="text-xs text-muted-400 ml-2">{{ formatDate(wd.createdAt) }}</span>
                    </div>
                    <span class="font-semibold text-muted-700 dark:text-muted-300">{{ formatCurrency(wd.amount)
                      }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
