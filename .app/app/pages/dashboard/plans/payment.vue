<script setup lang="ts">
import { useSubscription } from '~/composables/useSubscription'

definePageMeta({
  title: 'Pagamento da Assinatura',
})

const route = useRoute()
const router = useRouter()
const toaster = useNuiToasts()
const { plans, currentSubscription, loading: plansLoading, fetchPlans, fetchMySubscription, subscribe, validateCoupon, getPaymentStatus } = useSubscription()

// Integração de estado com o layout original
const customRadio = ref((route.query.plan as string) || 'enterprise')
const billingCycles = ref('monthly')

// Customizer state
const showUserCustomizer = ref(false)
const showResourceCustomizer = ref(false)

const customConfig = ref({
  employees: 5,
  sms_monthly: 100,
  storage_gb: 5,
  tax_declarations_yearly: 50,
})

function calculateCustomPrice() {
  let total = 4900 // Preço base em centavos (R$ 49,00)

  // R$ 10,00 por usuário extra (acima de 1)
  if (customConfig.value.employees > 1) {
    total += (customConfig.value.employees - 1) * 1000
  }

  // R$ 5,00 por bloco de 100 SMS (acima de 100)
  if (customConfig.value.sms_monthly > 100) {
    total += Math.ceil((customConfig.value.sms_monthly - 100) / 100) * 500
  }

  // R$ 5,00 por GB extra (acima de 5GB)
  if (customConfig.value.storage_gb > 5) {
    total += (customConfig.value.storage_gb - 5) * 500
  }

  // R$ 2,00 por IR extra (acima de 50 IRs)
  if (customConfig.value.tax_declarations_yearly > 50) {
    total += (customConfig.value.tax_declarations_yearly - 50) * 200
  }

  return total
}

function convertToCustom() {
  customRadio.value = 'custom'
}

function toggleUserCustomizer() {
  showUserCustomizer.value = !showUserCustomizer.value
  if (showUserCustomizer.value && customRadio.value !== 'custom' && selectedPlan.value) {
    customConfig.value.employees = selectedPlan.value.limits?.employees || 1
  }
}

function toggleResourceCustomizer() {
  showResourceCustomizer.value = !showResourceCustomizer.value
  if (showResourceCustomizer.value && customRadio.value !== 'custom' && selectedPlan.value) {
    customConfig.value.sms_monthly = selectedPlan.value.limits?.sms_monthly || 100
    customConfig.value.storage_gb = (selectedPlan.value.limits?.storage_mb || 1024) / 1024
    customConfig.value.tax_declarations_yearly = selectedPlan.value.limits?.tax_declarations_yearly || 50
  }
}

// Mapeamento de planos reais para os slots do layout
// No seed temos: basic, pro, enterprise, free
const selectedPlan = computed(() => {
  // Caso venha do configurador customizado ou ativado via UI
  if (customRadio.value === 'custom') {
    const monthlyPrice = calculateCustomPrice()
    return {
      slug: 'custom',
      name: 'Personalizado',
      description: 'Configuração sob medida para seu escritório.',
      pricing: {
        monthly: monthlyPrice,
        quarterly: monthlyPrice * 3,
        semiannual: monthlyPrice * 6,
        annual: monthlyPrice * 12,
      },
      limits: {
        employees: customConfig.value.employees,
        storage_mb: customConfig.value.storage_gb * 1024,
        sms_monthly: customConfig.value.sms_monthly,
        tax_declarations_yearly: customConfig.value.tax_declarations_yearly,
      },
      features: ['Suporte Prioritário', 'Relatórios Automáticos', 'Multi-usuários', 'Gestão Customizada'],
    }
  }

  const p = plans.value.find(p => p.slug === customRadio.value)
  if (!p)
    return null

  return {
    ...p,
    pricing: {
      monthly: p.pricing.monthly,
      quarterly: p.pricing.monthly * 3,
      semiannual: p.pricing.monthly * 6,
      annual: p.pricing.monthly * 12, // No seed p.pricing.annual exists as yearly
    },
  }
})

const planColor = computed(() => {
  switch (customRadio.value) {
    case 'free':
      return 'text-success-500'
    case 'basic':
      return 'text-yellow-400'
    case 'professional':
    case 'pro':
      return 'text-indigo-500'
    case 'enterprise':
      return 'text-primary-500'
    case 'custom':
      return 'text-purple-500'
  }
  return 'text-primary-500'
})

// Dados de Pagamento
const paymentMethod = ref<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('CREDIT_CARD')
const cardInfo = ref({
  name: '',
  number: '',
  expiryYear: '',
  expiryMonth: '',
  cvc: '',
})

const isInitialLoading = ref(true)
const isSubmitting = ref(false)
const isCouponLoading = ref(false)
const isCheckingStatus = ref(false)
const paymentResult = ref<any>(null)
const isExitingPage = ref(false)

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (paymentMethod.value === 'CREDIT_CARD' && !isExitingPage.value && !isSubmitting.value) {
    e.preventDefault()
    return (e.returnValue = 'Deseja realmente sair? Sua assinatura ainda não foi concluída.')
  }
}

onMounted(async () => {
  isInitialLoading.value = true
  if (!plans.value.length) {
    await fetchPlans()
  }
  await fetchMySubscription()
  // Sincronizar ciclo de faturamento se vier da query ou default
  if (route.query.billing) {
    billingCycles.value = (route.query.billing as string).toLowerCase()
  }
  isInitialLoading.value = false
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

const currentCyclePrice = computed(() => {
  if (!selectedPlan.value?.pricing)
    return 0
  switch (billingCycles.value) {
    case 'monthly': return selectedPlan.value.pricing.monthly || 0
    case 'quarterly': return selectedPlan.value.pricing.quarterly || (selectedPlan.value.pricing.monthly * 3) || 0
    case 'semiannual': return selectedPlan.value.pricing.semiannual || (selectedPlan.value.pricing.monthly * 6) || 0
    case 'annual': return selectedPlan.value.pricing.annual || (selectedPlan.value.pricing.monthly * 12) || 0
  }
  return 0
})

const couponCode = ref('')
const appliedCoupon = ref<any>(null)
const couponError = ref('')

async function applyCoupon() {
  if (!couponCode.value)
    return
  couponError.value = ''
  isCouponLoading.value = true

  const result = await validateCoupon(couponCode.value, currentCyclePrice.value)
  if (result.success) {
    appliedCoupon.value = result.data
  }
  else {
    appliedCoupon.value = null
    couponError.value = result.error || 'Erro ao validar cupom'
  }
  isCouponLoading.value = false
}

const discountAmount = computed(() => {
  if (!appliedCoupon.value)
    return 0

  if (appliedCoupon.value.discountType === 'PERCENTAGE') {
    return Math.round((currentCyclePrice.value * appliedCoupon.value.discountValue) / 100)
  }
  else {
    return appliedCoupon.value.discountValue
  }
})

const finalTotal = computed(() => {
  let total = currentCyclePrice.value - discountAmount.value
  if (paymentMethod.value === 'PIX') {
    total = total * 0.95
  }
  return Math.max(0, total)
})

const currentCycleLabel = computed(() => {
  switch (billingCycles.value) {
    case 'monthly': return 'mês'
    case 'quarterly': return 'trimestre'
    case 'semiannual': return 'semestre'
    case 'annual': return 'ano'
  }
  return 'mês'
})

async function handlePayment() {
  if (isSubmitting.value)
    return
  isSubmitting.value = true
  try {
    const params: any = {
      planSlug: customRadio.value,
      billingPeriod: billingCycles.value.toUpperCase(),
      paymentMethod: paymentMethod.value,
      couponCode: appliedCoupon.value?.code || undefined,
    }

    if (customRadio.value === 'custom') {
      params.customLimits = {
        storage_mb: customConfig.value.storage_gb * 1024,
        sms_monthly: customConfig.value.sms_monthly,
        employees: customConfig.value.employees,
      }
      params.customPrice = calculateCustomPrice()
    }

    const result = await subscribe(params)
    if (result.success) {
      paymentResult.value = result.data

      // Redirecionamento automático para PayPal se for cartão/paypal
      if (paymentMethod.value === 'CREDIT_CARD' && result.data?.paymentData?.checkoutUrl) {
        toaster.add({
          title: 'Redirecionando...',
          description: 'Você será redirecionado para o PayPal para concluir sua assinatura.',
          icon: 'logos:paypal',
        })

        setTimeout(() => {
          isExitingPage.value = true
          window.location.href = result.data.paymentData.checkoutUrl
        }, 2000)
      }
    }
    else {
      toaster.add({
        title: 'Erro no Pagamento',
        description: result.error || 'Erro ao processar pagamento',
        icon: 'solar:danger-triangle-bold-duotone',
      })
    }
  }
  finally {
    isSubmitting.value = false
  }
}

async function checkPaymentStatus() {
  if (!paymentResult.value?.paymentId || isCheckingStatus.value)
    return

  isCheckingStatus.value = true
  try {
    const result = await getPaymentStatus(paymentResult.value.paymentId)

    if (result.success && result.status === 'PAID') {
      toaster.add({
        title: 'Pagamento Confirmado!',
        description: 'Sua assinatura foi ativada com sucesso.',
        icon: 'solar:check-circle-bold-duotone',
      })

      // Atualizar estado local
      paymentResult.value.status = 'PAID'

      // Redirecionar após sucesso
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }
    else {
      toaster.add({
        title: 'Aguardando Pagamento',
        description: 'Ainda não recebemos a confirmação do seu banco. Tente novamente em alguns instantes.',
        icon: 'solar:info-circle-bold-duotone',
      })
    }
  }
  catch (err) {
    console.error('Erro ao verificar status:', err)
  }
  finally {
    isCheckingStatus.value = false
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

function formatCurrency(value: number) {
  return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <!-- Overlay de Carregamento Inicial -->
    <AppPageLoading v-if="isInitialLoading" min-height="60vh" message="Preparando seu checkout seguro..." />

    <form v-else class="mx-auto max-w-7xl" @submit.prevent="handlePayment">
      <!-- Header -->
      <div class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <NuxtLink to="/dashboard/plans"
            class="text-primary-500 hover:opacity-75 transition-opacity flex items-center gap-2 mb-2 font-medium">
            <Icon name="solar:alt-arrow-left-linear" class="size-4" />
            Voltar para Planos
          </NuxtLink>
          <BaseHeading as="h1" size="2xl" weight="bold" class="text-muted-800 dark:text-white">
            Finalizar Assinatura
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
            Confirme os detalhes do seu plano e ative sua conta.
          </BaseParagraph>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-8">
        <!-- Coluna Esquerda: Configuração -->
        <div class="col-span-12 lg:col-span-7 space-y-6">
          <!-- Seleção de Planos (Compacta) -->
          <BaseRadioGroup v-model="customRadio" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TairoRadioCard value="free" class="data-[state=checked]:ring-primary-500!">
              <template #indicator>
                <Icon name="solar:check-circle-bold-duotone"
                  class="size-5 group-data-[state=unchecked]:opacity-0 text-primary-500" />
              </template>
              <div class="p-2 text-center">
                <BaseText size="xs" weight="bold">
                  Gratuito
                </BaseText>
              </div>
            </TairoRadioCard>
            <TairoRadioCard value="basic" class="data-[state=checked]:ring-yellow-400!">
              <template #indicator>
                <Icon name="solar:check-circle-bold-duotone"
                  class="size-5 group-data-[state=unchecked]:opacity-0 text-yellow-500" />
              </template>
              <div class="p-2 text-center">
                <BaseText size="xs" weight="bold">
                  Básico
                </BaseText>
              </div>
            </TairoRadioCard>
            <TairoRadioCard value="pro" class="data-[state=checked]:ring-indigo-500! relative overflow-hidden">
              <div
                class="absolute -right-6 top-2 rotate-45 bg-indigo-500 px-6 py-0.5 text-[8px] font-bold text-white uppercase">
                TOP
              </div>
              <template #indicator>
                <Icon name="solar:check-circle-bold-duotone"
                  class="size-5 group-data-[state=unchecked]:opacity-0 text-indigo-500" />
              </template>
              <div class="p-2 text-center">
                <BaseText size="xs" weight="bold">
                  Profissional
                </BaseText>
              </div>
            </TairoRadioCard>
            <TairoRadioCard value="enterprise" class="data-[state=checked]:ring-primary-500!">
              <template #indicator>
                <Icon name="solar:check-circle-bold-duotone"
                  class="size-5 group-data-[state=unchecked]:opacity-0 text-primary-500" />
              </template>
              <div class="p-2 text-center">
                <BaseText size="xs" weight="bold">
                  Empresa
                </BaseText>
              </div>
            </TairoRadioCard>
          </BaseRadioGroup>

          <!-- Detalhes do Plano Selecionado (Igual estava antes) -->
          <BaseCard rounded="md" class="p-6 relative overflow-hidden">
            <div v-if="currentSubscription?.plan.slug === selectedPlan?.slug"
              class="absolute -right-10 top-5 rotate-45 bg-success-500 px-12 py-1 text-[10px] font-bold text-white shadow-lg z-10 font-sans">
              Seu Plano Atual
            </div>
            <div class="flex items-center gap-6 mb-6">
              <TairoLogo class="size-16 shrink-0" :class="planColor" />
              <div>
                <div class="flex items-baseline gap-2">
                  <BaseHeading as="h3" size="xl" weight="bold" class="text-muted-800 dark:text-white">
                    {{ formatCurrency(currentCyclePrice) }}
                  </BaseHeading>
                  <BaseText size="sm" class="text-muted-400">
                    / {{ currentCycleLabel }}
                  </BaseText>
                </div>
                <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400 mt-1">
                  {{ selectedPlan?.description }}
                </BaseParagraph>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-y-3 gap-x-8 pt-6 border-t border-muted-100 dark:border-muted-800">
              <div class="flex items-center gap-2" :class="planColor">
                <Icon name="solar:check-circle-bold-duotone" class="size-4" />
                <BaseText size="xs" class="text-muted-500 dark:text-muted-400">
                  {{ (selectedPlan?.limits?.storage_mb || 0) >= 1024 ? `${Math.round((selectedPlan?.limits?.storage_mb
                    ||
                    0)
                    / 1024)
                    }GB` : `${selectedPlan?.limits?.storage_mb || 0}MB` }} de Drive
                </BaseText>
              </div>
              <div class="flex items-center gap-2" :class="planColor">
                <Icon name="solar:check-circle-bold-duotone" class="size-4" />
                <BaseText size="xs" class="text-muted-500 dark:text-muted-400">
                  {{ selectedPlan?.limits?.employees || 0
                  }} Usuários
                  inclusos
                </BaseText>
              </div>
              <div class="flex items-center gap-2" :class="planColor">
                <Icon name="solar:check-circle-bold-duotone" class="size-4" />
                <BaseText size="xs" class="text-muted-500 dark:text-muted-400">
                  {{ selectedPlan?.limits?.tax_declarations_yearly || 0 }} Declarações/ano
                </BaseText>
              </div>
              <div class="flex items-center gap-2" :class="planColor">
                <Icon name="solar:check-circle-bold-duotone" class="size-4" />
                <BaseText size="xs" class="text-muted-500 dark:text-muted-400">
                  {{ selectedPlan?.limits?.sms_monthly || 0
                  }} SMS
                  /mês
                </BaseText>
              </div>
              <div class="flex items-center gap-2" :class="planColor">
                <Icon name="solar:check-circle-bold-duotone" class="size-4" />
                <BaseText size="xs" class="text-muted-500 dark:text-muted-400">
                  Gestão Kanban
                </BaseText>
              </div>
              <div class="flex items-center gap-2" :class="planColor">
                <Icon name="solar:check-circle-bold-duotone" class="size-4" />
                <BaseText size="xs" class="text-muted-500 dark:text-muted-400">
                  Suporte prioritário
                </BaseText>
              </div>
              <div class="flex items-center gap-2" :class="planColor">
                <Icon name="solar:check-circle-bold-duotone" class="size-4" />
                <BaseText size="xs" class="text-muted-500 dark:text-muted-400">
                  Backups diários
                </BaseText>
              </div>
            </div>
          </BaseCard>

          <!-- Usuários -->
          <BaseCard rounded="md" class="p-4 md:p-6 transition-all duration-300"
            :class="{ 'ring-1 ring-primary-500 border-primary-500': showUserCustomizer }">
            <div class="mb-4 flex items-center justify-between">
              <BaseHeading as="h4" size="sm" weight="medium">
                Equipe e Usuários
              </BaseHeading>
              <BaseTag rounded="full" color="muted" size="sm">
                {{ selectedPlan?.limits?.employees || 0 }} inclusos
              </BaseTag>
            </div>
            <BaseParagraph size="xs" class="text-muted-500 mb-6">
              Colaboradores que podem acessar a plataforma simultaneamente.
            </BaseParagraph>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <BaseAvatar src="/img/custom/user-slot.png" size="sm" />
                <BaseAvatar v-if="(selectedPlan?.limits?.employees || 0) > 1" src="/img/custom/user-slot.png"
                  size="sm" />
                <div v-if="(selectedPlan?.limits?.employees || 0) > 2" class="text-muted-400 text-xs font-medium ml-2">
                  +{{ (selectedPlan?.limits?.employees || 0) - 2 }} extras
                </div>
              </div>
              <BaseButton type="button" size="sm" variant="muted" class="h-8" @click="toggleUserCustomizer">
                <Icon name="solar:pen-2-linear" class="size-3 mr-1" />
                Ajustar
              </BaseButton>
            </div>
            <div v-if="showUserCustomizer"
              class="mt-6 pt-6 border-t border-muted-200 dark:border-muted-800 animate-in fade-in slide-in-from-top-2">
              <BaseText size="xs" class="text-muted-500 mb-2">
                Quantidade de Usuários
              </BaseText>
              <BaseInput v-model="customConfig.employees" type="number" min="1" label="Quantidade de Usuários"
                @update:model-value="convertToCustom" />
            </div>
          </BaseCard>

          <!-- Personalização (Drive/SMS) -->
          <BaseCard rounded="md" class="p-4 md:p-6 transition-all duration-300"
            :class="{ 'ring-1 ring-primary-500 border-primary-500': showResourceCustomizer }">
            <div class="mb-4 flex items-center justify-between">
              <BaseHeading as="h4" size="sm" weight="medium">
                Personalização
              </BaseHeading>
              <div class="flex gap-2">
                <BaseTag rounded="full" color="muted" size="sm">
                  {{ Math.round((selectedPlan?.limits?.storage_mb || 0)
                    / 1024) }}GB
                </BaseTag>
                <BaseTag rounded="full" color="muted" size="sm">
                  {{ selectedPlan?.limits?.sms_monthly || 0 }} SMS
                </BaseTag>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex gap-4">
                <BaseAvatar src="/img/custom/drive-resource.png" size="sm" class="bg-muted-100 dark:bg-muted-800 p-1" />
                <BaseAvatar src="/img/custom/sms-resource.png" size="sm" class="bg-muted-100 dark:bg-muted-800 p-1" />
                <BaseAvatar src="/img/illustrations/onboarding/pricing-1.svg" size="sm"
                  class="bg-muted-100 dark:bg-muted-800 p-1" />
              </div>
              <BaseButton type="button" size="sm" variant="muted" class="h-8" @click="toggleResourceCustomizer">
                <Icon name="solar:pen-2-linear" class="size-3 mr-1" />
                Personalizar
              </BaseButton>
            </div>
            <div v-if="showResourceCustomizer"
              class="mt-6 pt-6 border-t border-muted-200 dark:border-muted-800 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div class="grid grid-cols-2 gap-4">
                <BaseText size="xs" class="text-muted-500 mb-2">
                  Espaço DRIVE (GB)
                </BaseText>
                <BaseInput v-model="customConfig.storage_gb" type="number" min="1" label="Espaço DRIVE (GB)"
                  @update:model-value="convertToCustom" />
                <BaseText size="xs" class="text-muted-500 mb-2">
                  Qtd. SMS
                </BaseText>
                <BaseInput v-model="customConfig.sms_monthly" type="number" step="100" min="100" label="Qtd. SMS"
                  @update:model-value="convertToCustom" />
                <BaseText size="xs" class="text-muted-500 mb-2">
                  Declarações IR/ano
                </BaseText>
                <BaseInput v-model="customConfig.tax_declarations_yearly" type="number" step="10" min="1"
                  label="Declarações IR/ano" @update:model-value="convertToCustom" />
              </div>
            </div>
          </BaseCard>

          <!-- Pagamento Seguro (Novo) -->
          <BaseCard rounded="md"
            class="p-8 bg-muted-50/50 dark:bg-muted-900/50 border-dashed border-2 border-muted-200 dark:border-muted-800 flex flex-col items-center justify-center text-center">
            <div class="mb-4 p-4 bg-white dark:bg-muted-800 rounded-2xl shadow-sm">
              <Icon name="solar:shield-check-bold-duotone" class="size-16 text-success-500" />
            </div>
            <BaseHeading as="h4" size="lg" weight="bold" class="mb-2">
              Pagamento 100% Seguro
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-500 max-w-sm mx-auto">
              Seus dados financeiros são processados em ambiente seguro e criptografado. Não armazenamos os dados do seu
              cartão em
              nossos servidores.
            </BaseParagraph>
            <div
              class="flex items-center gap-4 mt-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
              <img src="/img/custom/pix-logo.png" class="h-6" alt="PIX">
              <Icon name="logos:visa" class="h-4" />
              <Icon name="logos:mastercard" class="h-6" />
              <Icon name="solar:lock-bold-duotone" class="size-5 text-muted-400" />
            </div>
          </BaseCard>
        </div>

        <div class="col-span-12 lg:col-span-5">
          <div class="sticky top-6 space-y-4">
            <BaseCard rounded="md"
              class="p-6 shadow-xl shadow-muted-200/50 dark:shadow-none border-t-4 border-t-primary-500">
              <BaseHeading as="h3" size="lg" weight="bold" class="mb-6 flex items-center justify-between">
                Resumo do Pedido
                <Icon name="solar:bill-list-bold-duotone" class="size-6 text-primary-500" />
              </BaseHeading>

              <template v-if="!paymentResult">
                <!-- Opções de Cobrança (Integradas no resumo) -->
                <div class="space-y-6 mb-8 pb-8 border-b border-muted-100 dark:border-muted-800">
                  <div class="space-y-4">
                    <div>
                      <BaseHeading as="h4" size="xs" weight="semibold"
                        class="mb-3 uppercase text-muted-500 text-center font-sans tracking-[0.1em]">
                        Ciclo de Cobrança
                      </BaseHeading>
                      <BaseRadioGroup v-model="billingCycles" class="grid grid-cols-2 gap-2">
                        <TairoRadioCard value="monthly" class="p-2 text-center data-[state=checked]:ring-primary-500!">
                          <BaseText size="xs" weight="bold" class="font-sans">
                            Mensal
                          </BaseText>
                        </TairoRadioCard>
                        <TairoRadioCard value="quarterly"
                          class="p-2 text-center data-[state=checked]:ring-primary-500!">
                          <BaseText size="xs" weight="bold" class="font-sans">
                            Trimestral
                          </BaseText>
                        </TairoRadioCard>
                        <TairoRadioCard value="semiannual"
                          class="p-2 text-center data-[state=checked]:ring-primary-500!">
                          <BaseText size="xs" weight="bold" class="font-sans">
                            Semestral
                          </BaseText>
                        </TairoRadioCard>
                        <TairoRadioCard value="annual" class="p-2 text-center data-[state=checked]:ring-primary-500!">
                          <BaseText size="xs" weight="bold" class="font-sans">
                            Anual
                          </BaseText>
                        </TairoRadioCard>
                      </BaseRadioGroup>
                    </div>

                    <div>
                      <BaseHeading as="h4" size="xs" weight="semibold"
                        class="mb-3 uppercase text-muted-500 text-center font-sans tracking-[0.1em]">
                        Forma de Pagamento
                      </BaseHeading>
                      <BaseRadioGroup v-model="paymentMethod" class="grid grid-cols-2 gap-2">
                        <TairoRadioCard value="CREDIT_CARD"
                          class="flex flex-col items-center justify-center p-3 h-20 gap-2 data-[state=checked]:ring-primary-500!">
                          <Icon name="logos:paypal" class="h-5 group-data-[state=checked]:grayscale-0 grayscale" />
                          <BaseText size="xs" weight="bold" class="font-sans">
                            Cartão de Crédito
                          </BaseText>
                        </TairoRadioCard>
                        <TairoRadioCard value="PIX"
                          class="flex flex-col items-center justify-center p-3 h-20 gap-2 data-[state=checked]:ring-success-500! relative overflow-hidden">
                          <div
                            class="absolute -right-5 top-1 rotate-45 bg-success-500 px-5 py-0.5 text-[8px] font-bold text-white uppercase">
                            5% OFF
                          </div>
                          <img src="/img/custom/pix-logo.png"
                            class="h-6 object-contain grayscale group-data-[state=checked]:grayscale-0" alt="PIX">
                          <BaseText size="xs" weight="bold" class="font-sans">
                            PIX
                          </BaseText>
                        </TairoRadioCard>
                      </BaseRadioGroup>
                    </div>
                  </div>
                </div>

                <!-- Itens do Plano -->
                <div class="space-y-4 mb-8">
                  <div class="flex justify-between items-start">
                    <div>
                      <BaseText weight="semibold" class="text-muted-800 dark:text-white font-sans">
                        {{
                          selectedPlan?.name }}
                      </BaseText>
                      <BaseParagraph size="xs" class="text-muted-400 font-sans">
                        Assinatura {{ currentCycleLabel
                        }}
                      </BaseParagraph>
                    </div>
                    <BaseText weight="bold" class="font-sans">
                      {{ formatCurrency(currentCyclePrice) }}
                    </BaseText>
                  </div>

                  <div class="pt-4 border-t border-muted-100 dark:border-muted-800 space-y-3 font-sans text-xs">
                    <div class="flex items-center justify-between text-muted-500">
                      <span class="flex items-center gap-2">
                        <Icon name="solar:users-group-rounded-linear" class="size-4" />
                        Usuários ativos
                      </span>
                      <span class="font-medium text-muted-800 dark:text-white">{{
                        selectedPlan?.limits?.employees
                        }}</span>
                    </div>
                    <div class="flex items-center justify-between text-muted-500">
                      <span class="flex items-center gap-2">
                        <Icon name="solar:database-linear" class="size-4" />
                        Armazenamento Drive
                      </span>
                      <span class="font-medium text-muted-800 dark:text-white">{{
                        Math.round((selectedPlan?.limits?.storage_mb || 0) / 1024) }} GB</span>
                    </div>
                    <div class="flex items-center justify-between text-muted-500">
                      <span class="flex items-center gap-2">
                        <Icon name="solar:document-bold-duotone" class="size-4" />
                        Franquia de IR
                      </span>
                      <span class="font-medium text-muted-800 dark:text-white">{{
                        selectedPlan?.limits?.tax_declarations_yearly
                        || 0 }} /ano</span>
                    </div>
                    <div class="flex items-center justify-between text-muted-500">
                      <span class="flex items-center gap-2">
                        <Icon name="solar:letter-bold-duotone" class="size-4" />
                        Franquia de SMS
                      </span>
                      <span class="font-medium text-muted-800 dark:text-white">{{
                        selectedPlan?.limits?.sms_monthly || 0
                        }}
                        /mês</span>
                    </div>
                  </div>
                </div>

                <!-- Cupom de Desconto -->
                <div class="mb-8 pt-6 border-t border-muted-100 dark:border-muted-800">
                  <BaseParagraph size="xs" weight="medium"
                    class="text-muted-500 mb-2 uppercase tracking-wider font-sans">
                    Possui um
                    cupom?
                  </BaseParagraph>
                  <div class="flex gap-2">
                    <BaseInput v-model="couponCode" placeholder="Código do cupom" class="flex-1 overflow-hidden h-10"
                      :disabled="!!appliedCoupon" />
                    <BaseButton v-if="!appliedCoupon" variant="muted" class="h-10 px-4" :loading="isCouponLoading"
                      @click="applyCoupon">
                      Aplicar
                    </BaseButton>
                    <BaseButton v-else variant="muted" color="danger" class="h-10 px-4"
                      @click="appliedCoupon = null; couponCode = ''">
                      Remover
                    </BaseButton>
                  </div>
                  <BaseText v-if="couponError" color="danger" size="xs" class="mt-1 block font-sans text-[10px]">
                    {{
                      couponError }}
                  </BaseText>
                  <BaseText v-if="appliedCoupon" color="success" size="xs" class="mt-1 block font-sans text-[10px]">
                    Cupom aplicado com sucesso!
                  </BaseText>
                </div>

                <!-- Totais -->
                <div class="space-y-2 bg-muted-50 dark:bg-muted-900 p-4 rounded-lg">
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-500 font-sans">Subtotal</span>
                    <span class="text-muted-800 dark:text-white font-medium font-sans">{{
                      formatCurrency(currentCyclePrice)
                      }}</span>
                  </div>
                  <div v-if="appliedCoupon" class="flex justify-between text-sm text-primary-500">
                    <span class="font-sans italic">Cupom ({{ appliedCoupon.code }})</span>
                    <span class="font-medium font-sans">- {{ formatCurrency(discountAmount) }}</span>
                  </div>
                  <div v-if="paymentMethod === 'PIX'" class="flex justify-between text-sm text-success-500">
                    <span class="font-sans italic">Desconto PIX (5%)</span>
                    <span class="font-medium font-sans">- {{ formatCurrency((currentCyclePrice - discountAmount)
                      * 0.05) }}</span>
                  </div>
                  <div
                    class="flex justify-between items-center pt-2 border-t border-muted-200 dark:border-muted-700 mt-2">
                    <BaseText size="lg" weight="bold" class="text-muted-800 dark:text-white font-sans">
                      Total
                    </BaseText>
                    <BaseText size="2xl" weight="bold" class="text-primary-500 font-sans">
                      {{ formatCurrency(finalTotal) }}
                    </BaseText>
                  </div>
                  <BaseParagraph size="xs" class="text-muted-400 text-right font-sans italic opacity-70">
                    {{ paymentMethod === 'CREDIT_CARD' ? 'Assinatura Recorrente' : 'Pagamento' }} via {{ paymentMethod
                      === 'CREDIT_CARD' ? 'Cartão (PayPal)' : paymentMethod }}
                  </BaseParagraph>
                </div>

                <!-- Botão Final (Sempre desabilitado se já pagou) -->
                <BaseButton
                  v-if="!paymentResult || (paymentMethod !== 'PIX' && paymentMethod !== 'BOLETO' && paymentResult.status !== 'PAID')"
                  type="submit" variant="primary" color="primary"
                  class="w-full h-12 mt-8 shadow-xl shadow-primary-500/20 text-lg font-bold font-sans"
                  :loading="isSubmitting">
                  Finalizar Assinatura
                </BaseButton>
              </template>

              <!-- Área de Resultado (Integrada no lugar do cartão de totais quando houver resultado) -->
              <div v-if="paymentResult" class="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4">
                <!-- Caso PIX -->
                <div v-if="paymentMethod === 'PIX'"
                  class="p-6 bg-success-500/5 border-2 border-dashed border-success-500/20 rounded-xl text-center">
                  <BaseHeading as="h4" size="md" weight="bold" class="mb-4 text-success-600 font-sans">
                    Aguardando
                    Pagamento PIX
                  </BaseHeading>

                  <div class="flex justify-center mb-6 p-4 bg-white rounded-lg shadow-inner border border-muted-200">
                    <img
                      :src="paymentResult.paymentData?.qr_code ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${paymentResult.paymentData.qr_code}` : '/img/custom/pix-logo.png'"
                      class="size-48 object-contain" alt="QR Code PIX">
                  </div>

                  <BaseParagraph size="xs" class="text-muted-500 mb-4 font-sans leading-relaxed">
                    Escaneie o código acima com o app do seu banco ou copie a chave abaixo.
                  </BaseParagraph>

                  <div class="flex gap-2 mb-4">
                    <BaseInput :model-value="paymentResult.paymentData?.qr_code" readonly
                      class="flex-1 text-[10px] h-10 font-mono" />
                    <BaseButton color="success" class="h-10 px-4"
                      @click="copyToClipboard(paymentResult.paymentData?.qr_code)">
                      <Icon name="solar:copy-bold-duotone" class="size-4" />
                    </BaseButton>
                  </div>

                  <div class="flex items-center justify-center gap-2 text-success-600 mb-6">
                    <BaseLoader v-if="isCheckingStatus" class="size-4" />
                    <Icon v-else name="solar:reorder-bold-duotone" class="size-4" />
                    <BaseText size="xs" weight="medium" class="font-sans">
                      {{ isCheckingStatus ? 'Verificando...' : 'Aguardando confirmação...' }}
                    </BaseText>
                  </div>

                  <BaseButton type="button" variant="primary" color="success"
                    class="w-full h-10 shadow-lg shadow-success-500/20 font-bold" :loading="isCheckingStatus"
                    @click="checkPaymentStatus">
                    Já paguei! Conferir agora
                  </BaseButton>
                </div>

                <!-- Caso Boleto -->
                <div v-else-if="paymentMethod === 'BOLETO'"
                  class="p-6 bg-primary-500/5 border-2 border-dashed border-primary-500/20 rounded-xl text-center">
                  <Icon name="solar:bill-list-bold-duotone" class="size-12 text-primary-500 mx-auto mb-2" />
                  <BaseHeading as="h4" size="md" weight="bold" class="mb-2 font-sans">
                    Boleto pronto!
                  </BaseHeading>
                  <BaseParagraph size="xs" class="text-muted-500 mb-6 font-sans">
                    Uma cópia foi enviada ao seu e-mail.
                  </BaseParagraph>
                  <BaseButton :to="paymentResult.paymentData?.pdf_url" target="_blank" variant="primary" class="w-full">
                    Visualizar Boleto
                  </BaseButton>
                </div>

                <!-- Caso Confirmado (Cartão) -->
                <div v-else-if="paymentResult.status === 'PAID' || paymentMethod === 'CREDIT_CARD'"
                  class="p-6 bg-success-500/5 border-2 border-dashed border-success-500/20 rounded-xl text-center">
                  <Icon name="solar:verified-check-bold-duotone" class="size-16 text-success-500 mx-auto mb-2" />
                  <BaseHeading as="h4" size="md" weight="bold" class="mb-2 text-success-600 font-sans">
                    Redirecionando...
                  </BaseHeading>
                  <BaseParagraph size="xs" class="text-muted-500 mb-6 font-sans">
                    Seja bem-vindo. Você será redirecionado para o PayPal.
                  </BaseParagraph>
                  <BaseButton :to="paymentResult.paymentData?.checkoutUrl" variant="primary" color="success"
                    class="w-full">
                    Pagar com PayPal
                  </BaseButton>
                </div>
              </div>

              <BaseParagraph v-if="!paymentResult" size="xs" class="text-muted-400 text-center mt-4">
                Ao confirmar, você concorda com nossos <NuxtLink class="underline">
                  Termos de Uso
                </NuxtLink>.
              </BaseParagraph>
            </BaseCard>

            <!-- Help Card -->
            <BaseCard rounded="md" class="p-4 bg-primary-500/5 border-primary-500/10 border flex items-center gap-4">
              <div class="size-10 rounded-full bg-primary-500/10 flex items-center justify-center shrink-0">
                <Icon name="solar:question-square-bold-duotone" class="size-6 text-primary-500" />
              </div>
              <div>
                <BaseText size="xs" weight="bold">
                  Dúvidas com o pagamento?
                </BaseText>
                <BaseParagraph size="xs" class="text-muted-500">
                  Chame nosso suporte no WhatsApp.
                </BaseParagraph>
              </div>
            </BaseCard>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>
