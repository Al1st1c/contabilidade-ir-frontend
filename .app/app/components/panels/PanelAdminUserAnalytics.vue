<script setup lang="ts">
const props = defineProps<{
  userId: string
}>()

const emit = defineEmits(['close'])
const { useCustomFetch } = useApi()

const isLoading = ref(true)
const data = ref<any>(null)

async function fetchAnalytics() {
  isLoading.value = true
  try {
    const res = await useCustomFetch<any>(`/admin/users/${props.userId}/analytics`)
    data.value = res.data
  } catch (error) {
    console.error('Error fetching analytics:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchAnalytics)

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatDate(date: string) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR')
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    PAID: 'success',
    PENDING: 'warning',
    FAILED: 'danger',
    ACTIVE: 'primary',
    TRIAL: 'info',
    CANCELED: 'danger',
  }
  return map[status] || 'muted'
}
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-700 dark:bg-muted-950 border-l bg-white w-full max-w-2xl shadow-2xl"
    trapped loop>
    <!-- Header -->
    <div class="border-muted-200 dark:border-muted-800 flex h-20 w-full items-center justify-between border-b px-8">
      <div class="flex items-center gap-3">
        <BaseIconBox size="sm" rounded="lg" color="primary" variant="muted">
          <Icon name="solar:chart-square-bold-duotone" class="size-5" />
        </BaseIconBox>
        <BaseHeading as="h3" size="sm" weight="semibold"
          class="text-muted-800 dark:text-muted-100 uppercase tracking-wider">
          Visão Analítica do Usuário
        </BaseHeading>
      </div>

      <button type="button"
        class="hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-500 rounded-full p-2 transition-colors duration-300"
        @click="() => emit('close')">
        <Icon name="lucide:x" class="size-5" />
      </button>
    </div>

    <!-- Content -->
    <div class="nui-slimscroll h-[calc(100dvh-80px)] overflow-y-auto p-8">
      <div v-if="isLoading" class="flex flex-col items-center justify-center h-[calc(100dvh-200px)]">
        <AppPageLoading message="Cruzando dados e gerando relatório..." />
      </div>

      <div v-else-if="data" class="space-y-10 pb-10">
        <!-- User & Global Stats -->
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-4">
            <BaseAvatar size="xl" :src="data.user.photo" :text="data.user.name.charAt(0)"
              class="ring-4 ring-primary-500/10 rounded-2xl" />
            <div>
              <BaseHeading as="h2" size="xl" weight="bold" class="leading-tight">
                {{ data.user.name }}
              </BaseHeading>
              <BaseParagraph size="sm" class="text-muted-400">
                {{ data.user.email }}
              </BaseParagraph>
              <div class="flex items-center gap-2 mt-2">
                <BaseTag rounded="full" color="primary" variant="muted" size="sm">
                  {{ data.user.role?.name || 'Cliente' }}
                </BaseTag>
                <BaseTag v-if="data.user.isAdmin" rounded="full" color="danger" variant="muted" size="sm">
                  Admin
                </BaseTag>
              </div>
            </div>
          </div>
          <div class="text-right">
            <BaseParagraph size="xs" weight="bold" class="text-muted-400 uppercase tracking-widest mb-1">
              Investimento Total
            </BaseParagraph>
            <BaseHeading as="h3" size="2xl" weight="bold" class="text-success-600 dark:text-success-400">
              {{ formatCurrency(data.user.totalSpent) }}
            </BaseHeading>
          </div>
        </div>

        <!-- Company / Tenant Section -->
        <div v-if="data.user.tenant" class="space-y-4">
          <div class="flex items-center gap-2 mb-2">
            <Icon name="solar:buildings-bold-duotone" class="size-5 text-primary-500" />
            <BaseHeading as="h4" size="md" weight="semibold">Dados da Empresa</BaseHeading>
          </div>
          <BaseCard rounded="lg"
            class="p-6 border-muted-200 dark:border-muted-800 shadow-sm bg-muted-50/50 dark:bg-muted-900/20">
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-1">
                <p class="text-[10px] uppercase font-bold text-muted-400">Razão Social / Nome</p>
                <p class="text-sm font-semibold text-muted-800 dark:text-muted-100">{{ data.user.tenant.name }}</p>
              </div>
              <div class="space-y-1">
                <p class="text-[10px] uppercase font-bold text-muted-400">Documento (CNPJ/CPF)</p>
                <p class="text-sm font-mono text-muted-800 dark:text-muted-100">{{ data.user.tenant.document || '—' }}
                </p>
              </div>
              <div class="space-y-1">
                <p class="text-[10px] uppercase font-bold text-muted-400">Membros na Equipe</p>
                <p class="text-sm font-semibold text-muted-800 dark:text-muted-100">{{ data.user.tenant._count.users }}
                  usuários</p>
              </div>
              <div class="space-y-1">
                <p class="text-[10px] uppercase font-bold text-muted-400">Criada em</p>
                <p class="text-sm font-semibold text-muted-800 dark:text-muted-100">{{
                  formatDate(data.user.tenant.createdAt) }}</p>
              </div>
            </div>
          </BaseCard>

          <!-- Usage Metrics -->
          <div class="grid grid-cols-3 gap-4">
            <div
              class="p-4 rounded-xl bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-800 text-center">
              <BaseHeading as="h5" size="xl" weight="bold" class="text-primary-600">{{ data.user.tenant._count.clients
              }}</BaseHeading>
              <p class="text-[10px] uppercase text-muted-400 font-bold mt-1">Clientes CRM</p>
            </div>
            <div
              class="p-4 rounded-xl bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-800 text-center">
              <BaseHeading as="h5" size="xl" weight="bold" class="text-info-600">{{
                data.user.tenant._count.taxDeclarations }}</BaseHeading>
              <p class="text-[10px] uppercase text-muted-400 font-bold mt-1">Total de IRs</p>
            </div>
            <div
              class="p-4 rounded-xl bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-800 text-center">
              <BaseHeading as="h5" size="xl" weight="bold" class="text-warning-600">{{
                data.user.tenant._count.collectionLinks }}</BaseHeading>
              <p class="text-[10px] uppercase text-muted-400 font-bold mt-1">Links de Coleta</p>
            </div>
          </div>
        </div>

        <!-- Subscription Section -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-2">
            <Icon name="solar:plugin-bold-duotone" class="size-5 text-primary-500" />
            <BaseHeading as="h4" size="md" weight="semibold">Assinatura & Plano</BaseHeading>
          </div>
          <div v-if="data.user.subscription" class="grid grid-cols-2 gap-4">
            <BaseCard rounded="lg" class="p-4 bg-primary-500/5 border-primary-500/20">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <p class="text-[10px] uppercase font-bold text-primary-600 mb-1">Plano Atual</p>
                  <BaseHeading as="h4" size="md" weight="bold" class="text-primary-700 dark:text-primary-400">
                    {{ data.user.subscription.plan?.name || 'Manual/Custom' }}
                  </BaseHeading>
                </div>
                <BaseTag rounded="full" :color="getStatusColor(data.user.subscription.status)" variant="muted">
                  {{ data.user.subscription.status }}
                </BaseTag>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-500 font-medium">Próximo Vencimento:</span>
                <span class="font-bold text-muted-800 dark:text-muted-200">{{
                  formatDate(data.user.subscription.currentPeriodEnd) }}</span>
              </div>
            </BaseCard>

            <BaseCard rounded="lg"
              class="p-4 bg-muted-50/50 dark:bg-muted-900/20 border-muted-200 dark:border-muted-800">
              <p class="text-[10px] uppercase font-bold text-muted-400 mb-3">Limites do Sistema</p>
              <div class="space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-muted-500">Funcionários:</span>
                  <span class="font-bold text-muted-800 dark:text-muted-200">{{ data.user.subscription.employeesLimit }}
                    slots</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-muted-500">Créditos Avulsos:</span>
                  <span class="font-bold text-muted-800 dark:text-muted-200">{{ data.user.subscription.irPrepaidCredits
                  }} un</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-muted-500">Storage:</span>
                  <span class="font-bold text-muted-800 dark:text-muted-200">{{ data.user.subscription.storageMbLimit }}
                    MB</span>
                </div>
              </div>
            </BaseCard>
          </div>
          <div v-else
            class="p-8 text-center bg-muted-50 dark:bg-muted-900 rounded-xl border-2 border-dashed border-muted-200 dark:border-muted-800">
            <Icon name="solar:card-search-bold-duotone" class="size-10 text-muted-300 mx-auto mb-2" />
            <p class="text-sm text-muted-500 italic">Nenhuma assinatura ativa encontrada.</p>
          </div>
        </div>

        <!-- Payments Section -->
        <div class="space-y-4">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <Icon name="solar:bomb-emoji-bold-duotone" class="size-5 text-primary-500" />
              <BaseHeading as="h4" size="md" weight="semibold">Histórico Financeiro</BaseHeading>
            </div>
            <BaseTag variant="muted" rounded="full" class="font-mono text-[10px]">
              {{ data.analytics.payments.length }} transações
            </BaseTag>
          </div>

          <div class="space-y-3">
            <div v-for="payment in data.analytics.payments" :key="payment.id"
              class="group flex items-center justify-between p-4 bg-white dark:bg-muted-950 rounded-xl border border-muted-200 dark:border-muted-800 hover:shadow-lg hover:shadow-muted-500/5 transition-all duration-300">
              <div class="flex items-center gap-4">
                <div class="size-10 rounded-full flex items-center justify-center"
                  :class="[payment.status === 'PAID' ? 'bg-success-500/10 text-success-500' : 'bg-warning-500/10 text-warning-500']">
                  <Icon
                    :name="payment.paymentMethod === 'PIX' ? 'solar:qr-code-bold-duotone' : 'solar:card-bold-duotone'"
                    class="size-5" />
                </div>
                <div>
                  <BaseParagraph size="sm" weight="semibold"
                    class="text-muted-800 dark:text-muted-100 leading-none mb-1">
                    {{ payment.description || 'Assinatura do Plano' }}
                  </BaseParagraph>
                  <div class="flex items-center gap-2 text-[10px] font-medium text-muted-400">
                    <span class="uppercase">{{ payment.paymentMethod }}</span>
                    <span>•</span>
                    <span>{{ formatDate(payment.paidAt || payment.createdAt) }}</span>
                    <span v-if="payment.coupon" class="text-primary-500 font-bold">Cupom: {{ payment.coupon.code
                    }}</span>
                  </div>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm font-bold text-muted-800 dark:text-muted-100 mb-1">{{ formatCurrency(payment.amount)
                }}</p>
                <BaseTag size="sm" :color="getStatusColor(payment.status)" variant="muted"
                  class="!px-2 !py-0.5 !text-[9px] uppercase font-bold tracking-widest leading-none">
                  {{ payment.status }}
                </BaseTag>
              </div>
            </div>
            <div v-if="data.analytics.payments.length === 0" class="text-center py-10 opacity-50">
              <Icon name="solar:bill-list-bold-duotone" class="size-10 text-muted-300 mx-auto mb-2" />
              <p class="text-xs text-muted-500 italic">Sem registros de pagamento.</p>
            </div>
          </div>
        </div>

        <!-- Affiliate / Referral Info -->
        <div v-if="data.analytics.referralSource || data.user.affiliateProfile"
          class="space-y-4 pt-10 border-t border-muted-200 dark:border-muted-800">
          <div class="flex items-center gap-2 mb-2">
            <Icon name="solar:medal-star-bold-duotone" class="size-5 text-primary-500" />
            <BaseHeading as="h4" size="md" weight="semibold">Parceria & Origem</BaseHeading>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <BaseCard v-if="data.analytics.referralSource" rounded="lg"
              class="p-4 border-muted-200 dark:border-muted-800 shadow-none">
              <p class="text-[10px] uppercase font-bold text-muted-400 mb-2">Indicado por (Afiliado)</p>
              <div class="flex items-center gap-3">
                <BaseAvatar size="xs" :text="data.analytics.referralSource.name.charAt(0)"
                  class="bg-primary-500/10 text-primary-500" />
                <div>
                  <p class="text-xs font-bold text-muted-800 dark:text-muted-100">{{ data.analytics.referralSource.name
                  }}</p>
                  <p class="text-[10px] text-muted-500">{{ data.analytics.referralSource.email }}</p>
                </div>
              </div>
            </BaseCard>

            <BaseCard v-if="data.user.affiliateProfile" rounded="lg"
              class="p-4 border-primary-500/20 bg-primary-500/5 shadow-none">
              <p class="text-[10px] uppercase font-bold text-primary-600 mb-2">Perfil de Afiliado Ativo</p>
              <div class="space-y-1">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-muted-500">Saldo Atual:</span>
                  <span class="font-bold text-primary-600">{{ formatCurrency(data.user.affiliateProfile.balance)
                  }}</span>
                </div>
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-muted-500">Comissão setada:</span>
                  <span class="font-bold text-muted-800 dark:text-muted-200">{{
                    data.user.affiliateProfile.commissionPercent }}%</span>
                </div>
              </div>
            </BaseCard>
          </div>
        </div>
      </div>
    </div>
  </FocusScope>
</template>
