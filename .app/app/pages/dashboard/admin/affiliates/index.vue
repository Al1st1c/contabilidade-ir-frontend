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

function formatCurrency(val: any) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
  <div class="p-6 space-y-6">
    <BaseHeading tag="h1" size="2xl" weight="bold">Gestão de Afiliados</BaseHeading>

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
        <table class="w-full text-left">
          <thead class="bg-muted-50 dark:bg-muted-800">
            <tr>
              <th class="p-4 text-xs font-semibold uppercase text-muted-500">Nome/Email</th>
              <th class="p-4 text-xs font-semibold uppercase text-muted-500">Status</th>
              <th class="p-4 text-xs font-semibold uppercase text-muted-500">Indicações</th>
              <th class="p-4 text-xs font-semibold uppercase text-muted-500">Saldo</th>
              <th class="p-4 text-xs font-semibold uppercase text-muted-500">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-muted-100 dark:divide-muted-700">
            <tr v-for="aff in affiliates" :key="aff.id">
              <td class="p-4">
                <div class="font-medium text-muted-800 dark:text-muted-100">{{ aff.user.name }}</div>
                <div class="text-xs text-muted-500">{{ aff.user.email }}</div>
                <div class="text-xs text-muted-500">{{ aff.user.phone }}</div>
              </td>
              <td class="p-4">
                <BaseTag :color="aff.status === 'ACTIVE' ? 'success' : aff.status === 'PENDING' ? 'warning' : 'danger'"
                  size="sm" variant="muted">
                  {{ aff.status }}
                </BaseTag>
              </td>
              <td class="p-4 text-sm">{{ aff.user._count.referralsSent }}</td>
              <td class="p-4 text-sm font-semibold">{{ formatCurrency(aff.balance) }}</td>
              <td class="p-4">
                <div class="flex gap-2">
                  <BaseButton v-if="aff.status === 'PENDING'" size="sm" color="success"
                    @click="approveAffiliate(aff.id)">
                    Aprovar
                  </BaseButton>
                  <BaseButton v-if="aff.status === 'PENDING'" size="sm" color="danger" variant="ghost"
                    @click="rejectAffiliate(aff.id)">
                    Rejeitar
                  </BaseButton>
                </div>
              </td>
            </tr>
            <tr v-if="affiliates.length === 0">
              <td colspan="5" class="p-8 text-center text-muted-500">Nenhum afiliado encontrado.</td>
            </tr>
          </tbody>
        </table>
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
              <td class="p-4 text-sm">{{ new Date(w.createdAt).toLocaleDateString() }}</td>
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
                <BaseTag :color="w.status === 'PAID' ? 'success' : w.status === 'PENDING' ? 'warning' : 'danger'"
                  size="sm" variant="muted">
                  {{ w.status }}
                </BaseTag>
              </td>
              <td class="p-4">
                <div class="flex gap-2">
                  <BaseButton v-if="w.status === 'PENDING'" size="sm" color="success" @click="approveWithdrawal(w.id)">
                    Pagar
                  </BaseButton>
                  <BaseButton v-if="w.status === 'PENDING'" size="sm" color="danger" variant="ghost"
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
  </div>
</template>
