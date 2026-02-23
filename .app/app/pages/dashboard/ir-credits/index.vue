<script setup lang="ts">
import { useApi } from '~/composables/useAuth'
import { useSubscription } from '~/composables/useSubscription'

definePageMeta({
  title: 'Comprar Créditos de IR',
})

const router = useRouter()
const toaster = useNuiToasts()
const { useCustomFetch } = useApi()
const { user } = useAuth()
const { currentSubscription, fetchMySubscription, purchaseIrCredits, getIrPricing } = useSubscription()

// Owner guard — only account owner can purchase credits
const isOwner = computed(() => {
  const roleName = user.value?.role?.name?.toLowerCase()
  return roleName === 'master' || user.value?.isAdmin
})

onBeforeMount(() => {
  if (user.value && !isOwner.value) {
    router.replace('/dashboard')
  }
})

const isLoading = ref(true)
const isPurchasing = ref(false)
const quantity = ref(10)
const paymentMethod = ref<'PIX' | 'CREDIT_CARD'>('PIX')
const pricingTiers = ref<any[]>([])
const balance = ref<any>(null)
const pixResult = ref<any>(null)

const route = useRoute()

onMounted(async () => {
  if (!isOwner.value) return
  isLoading.value = true

  if (route.query.quantity) {
    quantity.value = parseInt(route.query.quantity as string) || 10
    localStorage.removeItem('pendingIrPurchase')
  }

  await Promise.all([fetchMySubscription(), loadPricing(), loadBalance()])
  isLoading.value = false
})

async function loadPricing() {
  const result = await getIrPricing()
  if (result.success) {
    pricingTiers.value = result.data as any[] || []
  }
}

async function loadBalance() {
  try {
    const { data } = await useCustomFetch('/credits/balance')
    balance.value = data
  } catch (err: any) {
    console.error(err)
  }
}

const isFreePlan = computed(() => {
  const slug = currentSubscription.value?.plan?.slug
  return slug === 'free' || !slug
})

const irPrepaid = computed(() => (currentSubscription.value as any)?.irPrepaidCredits || 0)
const irTotalPurchased = computed(() => (currentSubscription.value as any)?.irTotalPurchased || 0)

const currentTier = computed(() => {
  const resultingTotal = irTotalPurchased.value + quantity.value
  return pricingTiers.value.find(
    (t: any) => resultingTotal >= t.minQuantity && (t.maxQuantity === null || resultingTotal <= t.maxQuantity)
  ) || pricingTiers.value[0]
})

const unitPriceCents = computed(() => currentTier.value?.unitPriceCents || 790)
const totalPriceCents = computed(() => unitPriceCents.value * quantity.value)
const pixDiscount = computed(() => paymentMethod.value === 'PIX' ? Math.round(totalPriceCents.value * 0.05) : 0)
const finalTotal = computed(() => totalPriceCents.value - pixDiscount.value)

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function adjustQuantity(delta: number) {
  const newVal = quantity.value + delta
  if (newVal >= 1) quantity.value = newVal
}

const isExitingPage = ref(false)

async function handlePurchase() {
  if (isPurchasing.value || isFreePlan.value) return
  isPurchasing.value = true

  try {
    const result = await purchaseIrCredits(quantity.value, paymentMethod.value)

    if (result.success) {
      if (paymentMethod.value === 'CREDIT_CARD' && result.data?.paymentData?.checkoutUrl) {
        // Stripe checkout redirect (same pattern as plan subscription)
        toaster.add({
          title: 'Redirecionando...',
          description: 'Você será redirecionado para a Stripe para concluir o pagamento.',
          icon: 'logos:stripe-icon',
        })
        setTimeout(() => {
          isExitingPage.value = true
          window.location.href = result.data.paymentData.checkoutUrl
        }, 2000)
      } else {
        // PIX flow
        pixResult.value = result.data
        toaster.add({
          title: 'QR Code PIX gerado!',
          description: 'Escaneie o código para concluir a compra.',
          icon: 'solar:check-circle-bold-duotone',
        })
      }
    } else {
      toaster.add({
        title: 'Erro',
        description: result.error || 'Erro ao processar pagamento',
        icon: 'solar:danger-triangle-bold-duotone',
      })
    }
  } finally {
    isPurchasing.value = false
  }
}

function copyPix() {
  if (pixResult.value?.pix?.qrCode) {
    navigator.clipboard.writeText(pixResult.value.pix.qrCode)
    toaster.add({ title: 'Código PIX copiado!', description: 'Cole no app do seu banco.', icon: 'solar:copy-bold-duotone' })
  }
}

async function checkPaymentStatus() {
  if (!pixResult.value?.paymentId) return
  try {
    const { data } = await useCustomFetch<any>(`/payments/${pixResult.value.paymentId}/status`)
    if (data?.status === 'PAID') {
      toaster.add({
        title: 'Pagamento confirmado!',
        description: `${quantity.value} créditos de IR adicionados à sua conta.`,
        icon: 'solar:check-circle-bold-duotone',
      })
      pixResult.value = null
      await Promise.all([fetchMySubscription(), loadBalance()])
    } else {
      toaster.add({
        title: 'Aguardando',
        description: 'Pagamento ainda não confirmado. Tente novamente em instantes.',
        icon: 'solar:info-circle-bold-duotone',
      })
    }
  } catch (err) {
    console.error(err)
  }
}

function resetPurchase() {
  pixResult.value = null
  loadBalance()
  fetchMySubscription()
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <AppPageLoading v-if="isLoading" min-height="60vh" message="Carregando..." />

    <div v-else class="mx-auto max-w-6xl">
      <!-- Header -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <NuxtLink to="/dashboard"
            class="text-muted-400 hover:text-primary-500 transition-colors flex items-center gap-1 mb-1 text-xs font-medium">
            <Icon name="solar:alt-arrow-left-linear" class="size-3" />
            Dashboard
          </NuxtLink>
          <BaseHeading as="h1" size="2xl" weight="bold" class="text-muted-800 dark:text-white">
            Declarações de IR
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-400 mt-0.5">
            Compre créditos para criar novas declarações.
          </BaseParagraph>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted-100 dark:bg-muted-800">
            <span class="text-muted-400 text-xs">Disponíveis</span>
            <span class="font-bold text-muted-800 dark:text-white tabular-nums">{{ irPrepaid }}</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted-100 dark:bg-muted-800">
            <span class="text-muted-400 text-xs">Comprados</span>
            <span class="font-bold text-muted-800 dark:text-white tabular-nums">{{ irTotalPurchased }}</span>
          </div>
        </div>
      </div>

      <!-- Free Plan Block -->
      <div v-if="isFreePlan"
        class="flex items-center justify-between gap-4 rounded-xl bg-primary-500/10 border border-primary-500/20 px-4 py-2.5 shadow-sm mb-6">
        <div class="flex items-center gap-3">
          <div
            class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-white shadow-sm shadow-primary-500/20">
            <Icon name="solar:crown-minimalistic-bold" class="size-4" />
          </div>
          <p class="text-sm font-semibold text-primary-900 dark:text-primary-50">
            Faça upgrade para comprar créditos de IR
            <span class="hidden sm:inline font-normal opacity-70">— no plano gratuito você utiliza apenas os créditos de
              bônus.</span>
          </p>
        </div>
        <BaseButton to="/dashboard/plans/payment?plan=basic" size="sm" variant="primary" shadow="primary" rounded="lg"
          class="h-9 px-5 text-xs font-bold uppercase tracking-wider shrink-0">
          <span>Ver Planos</span>
          <Icon name="lucide:arrow-right" class="ms-1.5 size-3" />
        </BaseButton>
      </div>

      <div v-else class="grid grid-cols-12 gap-6">
        <!-- Left Column -->
        <div class="col-span-12 lg:col-span-7 space-y-6">
          <!-- PIX Result -->
          <BaseCard v-if="pixResult" rounded="md" class="p-6 text-center">
            <div class="flex flex-col items-center">
              <div class="size-12 rounded-full bg-success-500/10 flex items-center justify-center mb-3">
                <Icon name="solar:check-circle-bold-duotone" class="size-7 text-success-500" />
              </div>
              <BaseHeading as="h3" size="md" weight="semibold" class="text-muted-800 dark:text-white mb-1">
                PIX gerado
              </BaseHeading>
              <BaseParagraph size="xs" class="text-muted-400 mb-5">
                Escaneie o QR Code abaixo para pagar
                <strong class="text-muted-700 dark:text-muted-200">{{ pixResult.pricing?.quantity || quantity }}
                  IRs</strong>.
              </BaseParagraph>
            </div>

            <div class="max-w-[200px] mx-auto mb-5">
              <div class="bg-white p-3 rounded-lg border border-muted-200">
                <img v-if="pixResult.pix?.qrCodeImage" :src="pixResult.pix.qrCodeImage" alt="QR Code PIX"
                  class="w-full" />
              </div>
            </div>

            <div class="flex justify-center gap-2 mb-4">
              <BaseButton size="sm" variant="primary" color="primary" @click="copyPix" class="gap-1.5">
                <Icon name="solar:copy-bold-duotone" class="size-3.5" />
                Copiar código
              </BaseButton>
              <BaseButton size="sm" variant="primary" color="success" @click="checkPaymentStatus" class="gap-1.5">
                <Icon name="solar:check-read-bold-duotone" class="size-3.5" />
                Já paguei
              </BaseButton>
            </div>

            <button class="text-xs text-muted-400 hover:text-muted-600 transition-colors" @click="resetPurchase">
              ← Voltar
            </button>
          </BaseCard>

          <template v-else>
            <!-- Quantity Selector -->
            <BaseCard rounded="md" class="p-5">
              <div class="flex items-center justify-between mb-4">
                <BaseHeading as="h3" size="sm" weight="semibold" class="text-muted-800 dark:text-white">
                  Quantidade
                </BaseHeading>
                <BaseText size="xs" class="text-muted-400">
                  {{ formatCurrency(unitPriceCents) }}/unidade
                </BaseText>
              </div>

              <div class="flex items-center justify-center gap-3 mb-5">
                <button type="button"
                  class="size-8 rounded-lg bg-muted-100 dark:bg-muted-800 hover:bg-muted-200 dark:hover:bg-muted-700 flex items-center justify-center transition-colors text-muted-500"
                  @click="adjustQuantity(-10)">
                  <span class="text-xs font-bold">-10</span>
                </button>
                <button type="button"
                  class="size-8 rounded-lg bg-muted-100 dark:bg-muted-800 hover:bg-muted-200 dark:hover:bg-muted-700 flex items-center justify-center transition-colors text-muted-500"
                  @click="adjustQuantity(-1)">
                  <Icon name="lucide:minus" class="size-3.5" />
                </button>
                <input v-model.number="quantity" type="number" min="1"
                  class="w-20 text-center text-2xl font-bold bg-transparent border-b-2 border-muted-200 dark:border-muted-700 text-muted-800 dark:text-white outline-none focus:border-primary-500 transition-colors tabular-nums" />
                <button type="button"
                  class="size-8 rounded-lg bg-muted-100 dark:bg-muted-800 hover:bg-muted-200 dark:hover:bg-muted-700 flex items-center justify-center transition-colors text-muted-500"
                  @click="adjustQuantity(1)">
                  <Icon name="lucide:plus" class="size-3.5" />
                </button>
                <button type="button"
                  class="size-8 rounded-lg bg-muted-100 dark:bg-muted-800 hover:bg-muted-200 dark:hover:bg-muted-700 flex items-center justify-center transition-colors text-muted-500"
                  @click="adjustQuantity(10)">
                  <span class="text-xs font-bold">+10</span>
                </button>
              </div>

              <div class="flex flex-wrap justify-center gap-1.5">
                <button v-for="q in [5, 10, 25, 50, 100, 250]" :key="q" type="button"
                  class="px-3 py-1 rounded-md text-xs font-medium transition-all" :class="quantity === q
                    ? 'bg-primary-500 text-white'
                    : 'bg-muted-100 dark:bg-muted-800 text-muted-500 hover:bg-muted-200 dark:hover:bg-muted-700'"
                  @click="quantity = q">
                  {{ q }}
                </button>
              </div>
            </BaseCard>

            <!-- Pricing Tiers -->
            <BaseCard rounded="md" class="p-5">
              <div class="flex items-center justify-between mb-4">
                <BaseHeading as="h3" size="sm" weight="semibold" class="text-muted-800 dark:text-white">
                  Tabela de preços
                </BaseHeading>
                <BaseText size="xs" class="text-muted-400">
                  Baseado no total comprado
                </BaseText>
              </div>

              <div class="divide-y divide-muted-100 dark:divide-muted-800">
                <div v-for="tier in pricingTiers" :key="tier.minQuantity"
                  class="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-md transition-colors" :class="currentTier?.minQuantity === tier.minQuantity
                    ? 'bg-primary-500/5'
                    : ''">
                  <div class="flex items-center gap-2.5">
                    <div class="size-1.5 rounded-full"
                      :class="currentTier?.minQuantity === tier.minQuantity ? 'bg-primary-500' : 'bg-muted-300 dark:bg-muted-600'" />
                    <BaseText size="sm" :class="currentTier?.minQuantity === tier.minQuantity
                      ? 'text-primary-600 dark:text-primary-400 font-medium'
                      : 'text-muted-500'">
                      {{ tier.label }}
                    </BaseText>
                  </div>
                  <div class="flex items-center gap-2">
                    <BaseText size="sm" weight="semibold" :class="currentTier?.minQuantity === tier.minQuantity
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-muted-700 dark:text-muted-300'">
                      {{ formatCurrency(tier.unitPriceCents) }}
                    </BaseText>
                    <BaseTag v-if="currentTier?.minQuantity === tier.minQuantity" rounded="full" color="primary"
                      size="sm" class="text-[9px]">
                      atual
                    </BaseTag>
                  </div>
                </div>
              </div>
            </BaseCard>
          </template>
        </div>

        <!-- Right Column: Order Summary -->
        <div class="col-span-12 lg:col-span-5">
          <div class="sticky top-6 space-y-4">
            <BaseCard v-if="!pixResult" rounded="md" class="p-5">
              <BaseHeading as="h3" size="sm" weight="semibold" class="mb-5 text-muted-800 dark:text-white">
                Resumo
              </BaseHeading>

              <!-- Payment Method -->
              <div class="mb-5 pb-5 border-b border-muted-100 dark:border-muted-800">
                <BaseText size="xs" class="text-muted-400 mb-2 block uppercase tracking-wider font-semibold">
                  Pagamento
                </BaseText>
                <BaseRadioGroup v-model="paymentMethod" class="grid grid-cols-2 gap-2">
                  <TairoRadioCard value="PIX"
                    class="flex flex-col items-center justify-center p-3 h-16 gap-1.5 data-[state=checked]:ring-primary-500! relative overflow-hidden">
                    <div
                      class="absolute -right-5 top-0.5 rotate-45 bg-success-500 px-5 py-0.5 text-[7px] font-bold text-white uppercase">
                      5% OFF
                    </div>
                    <img src="/img/custom/pix-logo.png"
                      class="h-5 object-contain grayscale group-data-[state=checked]:grayscale-0" alt="PIX">
                    <BaseText size="xs" weight="semibold">PIX</BaseText>
                  </TairoRadioCard>
                  <TairoRadioCard value="CREDIT_CARD"
                    class="flex flex-col items-center justify-center p-3 h-16 gap-1.5 data-[state=checked]:ring-primary-500!">
                    <Icon name="logos:stripe" class="h-4 group-data-[state=checked]:grayscale-0 grayscale" />
                    <BaseText size="xs" weight="semibold">Cartão</BaseText>
                  </TairoRadioCard>
                </BaseRadioGroup>
              </div>

              <!-- Line items -->
              <div class="space-y-3 mb-5 pb-5 border-b border-muted-100 dark:border-muted-800 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted-500">{{ quantity }}× IR</span>
                  <span class="text-muted-800 dark:text-white font-medium">{{ formatCurrency(totalPriceCents) }}</span>
                </div>
                <div class="flex justify-between text-muted-400 text-xs">
                  <span>Preço unitário</span>
                  <span>{{ formatCurrency(unitPriceCents) }}</span>
                </div>
                <div class="flex justify-between text-muted-400 text-xs">
                  <span>Faixa</span>
                  <span class="text-primary-500">{{ currentTier?.label }}</span>
                </div>
                <div v-if="pixDiscount > 0" class="flex justify-between text-success-500 text-xs">
                  <span>Desconto PIX (5%)</span>
                  <span>- {{ formatCurrency(pixDiscount) }}</span>
                </div>
              </div>

              <!-- Total -->
              <div class="flex justify-between items-center mb-6">
                <BaseText size="sm" weight="semibold" class="text-muted-800 dark:text-white">Total</BaseText>
                <BaseText size="xl" weight="bold" class="text-primary-500 tabular-nums">
                  {{ formatCurrency(finalTotal) }}
                </BaseText>
              </div>

              <!-- Submit -->
              <BaseButton type="button" variant="primary" color="primary" class="w-full h-11 font-semibold"
                :loading="isPurchasing" :disabled="isFreePlan" @click="handlePurchase">
                Comprar {{ quantity }} IRs
              </BaseButton>

              <BaseParagraph size="xs" class="text-muted-400 text-center mt-3">
                Pagamento único via {{ paymentMethod === 'PIX' ? 'PIX' : 'Cartão (Stripe)' }}
              </BaseParagraph>
            </BaseCard>

            <!-- Help -->
            <div class="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted-50 dark:bg-muted-800/50">
              <Icon name="solar:question-square-bold-duotone" class="size-5 text-muted-400 shrink-0" />
              <div>
                <BaseText size="xs" weight="semibold" class="text-muted-600 dark:text-muted-300">Dúvidas?</BaseText>
                <BaseText size="xs" class="text-muted-400">Chame nosso suporte no WhatsApp.</BaseText>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
