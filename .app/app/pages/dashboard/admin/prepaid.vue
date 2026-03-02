<script setup lang="ts">
const { useCustomFetch } = useApi()

definePageMeta({
  title: 'Faturamento Pré-pago - Admin',
})

const payments = ref<any[]>([])
const loading = ref(true)
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const search = ref('')

async function fetchPayments() {
  try {
    loading.value = true
    const params = new URLSearchParams()
    params.append('page', page.value.toString())
    if (search.value) params.append('search', search.value)

    const { data } = await useCustomFetch<any>(`/admin/prepaid-transactions?${params.toString()}`)
    payments.value = data.payments
    total.value = data.total
    totalPages.value = data.pages
  } catch (error) {
    console.error('Erro ao buscar transações:', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchPayments)

watch(search, useDebounceFn(() => {
  page.value = 1
  fetchPayments()
}, 500))

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
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
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3">
            <NuxtLink to="/dashboard/admin"
              class="size-8 rounded-lg bg-muted-100 dark:bg-muted-800 flex items-center justify-center hover:bg-primary-500/10 transition-colors">
              <Icon name="lucide:arrow-left" class="size-4 text-muted-500" />
            </NuxtLink>
            <div>
              <BaseHeading as="h2" size="2xl">Faturamento Pré-pago</BaseHeading>
              <BaseParagraph size="sm" class="text-muted-500">
                <strong>{{ total }}</strong> transações de créditos avulsos
              </BaseParagraph>
            </div>
          </div>
        </div>
      </div>

      <BaseCard class="p-4">
        <div class="mb-6">
          <BaseInput v-model="search" placeholder="Buscar por nome, e-mail ou escritório..." icon="lucide:search"
            rounded="md" />
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-xs uppercase text-muted-400 border-b border-muted-200 dark:border-muted-800">
                <th class="py-3 px-4">Usuário</th>
                <th class="py-3 px-4">Escritório</th>
                <th class="py-3 px-4">Descrição</th>
                <th class="py-3 px-4 text-center">Créditos</th>
                <th class="py-3 px-4 text-right">Valor</th>
                <th class="py-3 px-4 text-right">Data</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-muted-200 dark:divide-muted-800">
              <tr v-if="loading" v-for="i in 5" :key="i" class="animate-pulse">
                <td colspan="6" class="py-4 px-4">
                  <div class="h-10 bg-muted-100 dark:bg-muted-800 rounded"></div>
                </td>
              </tr>
              <tr v-else v-for="payment in payments" :key="payment.id"
                class="text-sm hover:bg-muted-50 dark:hover:bg-muted-900/50 transition-colors">
                <td class="py-4 px-4">
                  <div class="flex items-center gap-3">
                    <BaseAvatar :src="payment.user?.photo" :text="payment.user?.name?.charAt(0)" size="sm" />
                    <div>
                      <p class="text-muted-900 dark:text-white font-medium">{{ payment.user?.name }}</p>
                      <p class="text-xs text-muted-500">{{ payment.user?.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4">
                  <p v-if="payment.user?.tenant" class="text-sm text-muted-900 dark:text-white">
                    {{ payment.user.tenant.name }}
                  </p>
                  <span v-else class="text-xs text-muted-400 italic">Sem escritório</span>
                </td>
                <td class="py-4 px-4">
                  <p class="text-sm text-muted-700 dark:text-muted-300">
                    {{ payment.description || 'Compra de créditos' }}
                  </p>
                  <p v-if="payment.creditPurchase" class="text-xs text-muted-400">
                    {{ payment.creditPurchase.resourceType }}
                  </p>
                </td>
                <td class="py-4 px-4 text-center">
                  <BaseTag v-if="payment.creditPurchase" rounded="full" color="info" variant="muted" size="sm"
                    class="font-bold">
                    +{{ payment.creditPurchase.creditsAmount }}
                  </BaseTag>
                  <span v-else class="text-muted-400">—</span>
                </td>
                <td class="py-4 px-4 text-right">
                  <span class="font-semibold text-muted-900 dark:text-white">
                    {{ formatCurrency(payment.amount / 100) }}
                  </span>
                </td>
                <td class="py-4 px-4 text-right">
                  <span class="text-xs text-muted-500">{{ formatDateTime(payment.paidAt) }}</span>
                </td>
              </tr>
              <tr v-if="!loading && payments.length === 0">
                <td colspan="6" class="py-12 text-center">
                  <div class="flex flex-col items-center gap-2">
                    <Icon name="solar:wallet-money-bold-duotone" class="size-10 text-muted-300" />
                    <p class="text-sm text-muted-400">Nenhuma transação pré-paga encontrada</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="totalPages > 1" class="mt-6 flex justify-center">
          <BasePagination :total-items="total" :items-per-page="30" :current-page="page"
            @update:current-page="(p: number) => { page = p; fetchPayments(); }" rounded="md" />
        </div>
      </BaseCard>
    </div>
  </div>
</template>
