<script setup lang="ts">
import { useSubscription } from '~/composables/useSubscription'

const props = defineProps<{
  onClose?: () => void
}>()

const { fetchMySubscription, currentSubscription, getPaymentHistory, loading } = useSubscription()
const payments = ref<any[]>([])
const isLoadingPayments = ref(false)

async function loadData() {
  await fetchMySubscription()
  isLoadingPayments.value = true
  const res = await getPaymentHistory()
  if (res.success) {
    payments.value = res.data
  }
  isLoadingPayments.value = false
}

onMounted(() => {
  loadData()
})

const statusMap: Record<string, { label: string, color: string }> = {
  ACTIVE: { label: 'Ativo', color: 'text-success-500 bg-success-500/10' },
  TRIAL: { label: 'Período de Teste', color: 'text-primary-500 bg-primary-500/10' },
  PAST_DUE: { label: 'Atrasado', color: 'text-danger-500 bg-danger-500/10' },
  CANCELED: { label: 'Cancelado', color: 'text-muted-500 bg-muted-500/10' },
  EXPIRED: { label: 'Expirado', color: 'text-danger-500 bg-danger-500/10' },
}

const paymentStatusMap: Record<string, { label: string, color: string }> = {
  PAID: { label: 'Pago', color: 'text-success-500 bg-success-500/10' },
  PENDING: { label: 'Pendente', color: 'text-amber-500 bg-amber-500/10' },
  FAILED: { label: 'Falhou', color: 'text-danger-500 bg-danger-500/10' },
  PROCESSING: { label: 'Processando', color: 'text-primary-500 bg-primary-500/10' },
  REFUNDED: { label: 'Reembolsado', color: 'text-muted-500 bg-muted-500/10' },
}

const paymentMethodMap: Record<string, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
  BOLETO: 'Boleto Bancário',
}

function formatPaymentMethod(method: string) {
  return paymentMethodMap[method] || method
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount / 100)
}

function calculatePercentage(current: number | undefined, max: number | undefined) {
  if (!max || max <= 0)
    return 0
  const percent = ((current || 0) / max) * 100
  return Math.min(100, Math.max(0, percent))
}
</script>

<template>
  <div class="flex h-full flex-col bg-white dark:bg-muted-900">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-muted-200 px-6 py-4 dark:border-muted-800">
      <BaseHeading as="h3" size="lg" weight="semibold">
        Meu Plano e Pagamentos
      </BaseHeading>
      <BaseButtonClose @click="props.onClose" />
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <!-- Loading State -->
      <div v-if="loading && !currentSubscription" class="flex h-40 items-center justify-center">
        <BaseLoader class="size-10 text-primary-500" />
      </div>

      <div v-else-if="currentSubscription" class="space-y-8">
        <!-- Current Plan Card -->
        <div class="rounded-2xl border border-muted-200 bg-muted-50/50 p-6 dark:border-muted-800 dark:bg-muted-800/50">
          <div class="flex items-start justify-between mb-4">
            <div>
              <BaseParagraph size="xs" weight="medium" class="uppercase tracking-wider text-muted-500 mb-1">
                Plano Atual
              </BaseParagraph>
              <BaseHeading as="h4" size="xl" weight="bold">
                {{ currentSubscription.plan?.name }}
              </BaseHeading>
            </div>
            <BaseTag
              :class="statusMap[currentSubscription.status]?.color"
              rounded="full"
              variant="none"
            >
              {{ statusMap[currentSubscription.status]?.label }}
            </BaseTag>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
              <BaseParagraph size="xs" class="text-muted-500">Próxima Cobrança</BaseParagraph>
              <BaseParagraph size="sm" weight="medium">
                {{ formatDate(currentSubscription.currentPeriodEnd) }}
              </BaseParagraph>
            </div>
            <div>
              <BaseParagraph size="xs" class="text-muted-500">Ciclo</BaseParagraph>
              <BaseParagraph size="sm" weight="medium">
                {{ currentSubscription.billingPeriod }}
              </BaseParagraph>
            </div>
          </div>

          <BaseButton
            to="/dashboard/plans"
            variant="primary"
            class="w-full"
            @click="props.onClose"
          >
            <span>Fazer Upgrade</span>
            <Icon name="lucide:arrow-up-right" class="ms-2 size-4" />
          </BaseButton>
        </div>

        <!-- Usage Limits -->
        <div>
          <BaseHeading as="h4" size="sm" weight="semibold" class="mb-4 flex items-center gap-2">
            <Icon name="lucide:bar-chart-3" class="size-4 text-primary-500" />
            Uso do Período
          </BaseHeading>
          <div class="space-y-4">
            <!-- Declarations -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-muted-500">Declarações de IR</span>
                <span class="font-medium">
                  {{ currentSubscription.yearlyUsage?.tax_declarations || 0 }} / {{ currentSubscription.plan?.limits?.tax_declarations_yearly || 0 }}
                </span>
              </div>
              <BaseProgress
                size="xs"
                variant="primary"
                :model-value="calculatePercentage(currentSubscription.yearlyUsage?.tax_declarations, currentSubscription.plan?.limits?.tax_declarations_yearly)"
              />
            </div>

            <!-- SMS -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-muted-500">SMS Enviados</span>
                <span class="font-medium">
                  {{ currentSubscription.monthlyUsage?.sms || 0 }} / {{ currentSubscription.plan?.limits?.sms_monthly || 0 }}
                </span>
              </div>
              <BaseProgress
                size="xs"
                variant="primary"
                :model-value="calculatePercentage(currentSubscription.monthlyUsage?.sms, currentSubscription.plan?.limits?.sms_monthly)"
              />
            </div>

            <!-- Storage -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-muted-500">Armazenamento</span>
                <span class="font-medium">
                  {{ currentSubscription.storageUsedMb || 0 }} MB / {{ currentSubscription.plan?.limits?.storage_mb || 0 }} MB
                </span>
              </div>
              <BaseProgress
                size="xs"
                variant="primary"
                :model-value="calculatePercentage(currentSubscription.storageUsedMb, currentSubscription.plan?.limits?.storage_mb)"
              />
            </div>
          </div>
        </div>

        <!-- Payment History -->
        <div>
          <BaseHeading as="h4" size="sm" weight="semibold" class="mb-4 flex items-center gap-2">
            <Icon name="lucide:history" class="size-4 text-primary-500" />
            Histórico de Pagamentos
          </BaseHeading>

          <div v-if="isLoadingPayments" class="flex justify-center py-4">
            <BaseLoader class="size-6 text-primary-500" />
          </div>

          <div v-else-if="payments.length === 0" class="text-center py-8 border-2 border-dashed border-muted-200 dark:border-muted-800 rounded-xl">
            <BaseParagraph size="xs" class="text-muted-500">
              Nenhum pagamento encontrado.
            </BaseParagraph>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="payment in payments"
              :key="payment.id"
              class="flex items-center justify-between p-3 rounded-xl border border-muted-200 dark:border-muted-800"
            >
              <div class="flex items-center gap-3">
                <div class="size-10 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center">
                  <Icon
                    :name="payment.paymentType === 'SUBSCRIPTION' ? 'lucide:refresh-cw' : 'lucide:plus-circle'"
                    class="size-5 text-muted-500"
                  />
                </div>
                <div>
                  <BaseParagraph size="sm" weight="medium">
                    {{ payment.description || 'Pagamento' }}
                  </BaseParagraph>
                  <BaseParagraph size="xs" class="text-muted-500">
                    {{ formatDate(payment.createdAt) }} • {{ formatPaymentMethod(payment.paymentMethod) }}
                  </BaseParagraph>
                </div>
              </div>
              <div class="text-right">
                <BaseParagraph size="sm" weight="bold">
                  {{ formatCurrency(payment.amount) }}
                </BaseParagraph>
                <BaseTag
                  :class="paymentStatusMap[payment.status]?.color"
                  rounded="full"
                  variant="none"
                  size="sm"
                  class="mt-1"
                >
                  {{ paymentStatusMap[payment.status]?.label }}
                </BaseTag>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col items-center justify-center h-full text-center py-12">
        <div class="size-20 bg-muted-100 dark:bg-muted-800 rounded-full flex items-center justify-center mb-4">
          <Icon name="lucide:alert-circle" class="size-10 text-muted-400" />
        </div>
        <BaseHeading as="h4" size="lg" weight="semibold" class="mb-2">
          Assinatura não encontrada
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500 mb-6 max-w-xs">
          Não conseguimos carregar os dados da sua assinatura. Por favor, tente novamente ou entre em contato com o suporte.
        </BaseParagraph>
        <BaseButton variant="primary" to="/dashboard/plans" @click="props.onClose">
          Ver Planos
        </BaseButton>
      </div>
    </div>
  </div>
</template>
