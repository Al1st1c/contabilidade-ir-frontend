<script setup lang="ts">
import { useSubscription } from '~/composables/useSubscription'

definePageMeta({
  title: 'Pagamento da Assinatura',
})

const route = useRoute()
const router = useRouter()
const { plans, currentSubscription, loading: plansLoading, fetchPlans, fetchMySubscription, subscribe, validateCoupon } = useSubscription()

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

const calculateCustomPrice = () => {
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

const convertToCustom = () => {
  customRadio.value = 'custom'
}

const toggleUserCustomizer = () => {
  showUserCustomizer.value = !showUserCustomizer.value
  if (showUserCustomizer.value && customRadio.value !== 'custom' && selectedPlan.value) {
    customConfig.value.employees = selectedPlan.value.limits?.employees || 1
  }
}

const toggleResourceCustomizer = () => {
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
      name: 'Personalizado',
      description: 'Configuração sob medida para seu escritório.',
      pricing: {
        monthly: monthlyPrice,
        quarterly: monthlyPrice * 3,
        semiannual: monthlyPrice * 6,
        annual: monthlyPrice * 12
      },
      limits: {
        employees: customConfig.value.employees,
        storage_mb: customConfig.value.storage_gb * 1024,
        sms_monthly: customConfig.value.sms_monthly,
        tax_declarations_yearly: customConfig.value.tax_declarations_yearly
      },
      features: ['Suporte Prioritário', 'Relatórios Automáticos', 'Multi-usuários', 'Gestão Customizada']
    }
  }

  const p = plans.value.find(p => p.slug === customRadio.value)
  if (!p) return null

  return {
    ...p,
    pricing: {
      monthly: p.pricing.monthly,
      quarterly: p.pricing.monthly * 3,
      semiannual: p.pricing.monthly * 6,
      annual: p.pricing.monthly * 12 // No seed p.pricing.annual exists as yearly
    }
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

const isSubmitting = ref(false)
const paymentResult = ref<any>(null)

onMounted(async () => {
  if (!plans.value.length) {
    await fetchPlans()
  }
  await fetchMySubscription()
  // Sincronizar ciclo de faturamento se vier da query ou default
  if (route.query.billing) {
    billingCycles.value = (route.query.billing as string).toLowerCase()
  }
})

const currentCyclePrice = computed(() => {
  if (!selectedPlan.value?.pricing) return 0
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

const applyCoupon = async () => {
  if (!couponCode.value) return
  couponError.value = ''

  const result = await validateCoupon(couponCode.value, currentCyclePrice.value)
  if (result.success) {
    appliedCoupon.value = result.data
  } else {
    appliedCoupon.value = null
    couponError.value = result.error || 'Erro ao validar cupom'
  }
}

const discountAmount = computed(() => {
  if (!appliedCoupon.value) return 0

  if (appliedCoupon.value.discountType === 'PERCENTAGE') {
    return Math.round((currentCyclePrice.value * appliedCoupon.value.discountValue) / 100)
  } else {
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

const handlePayment = async () => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const params: any = {
      planSlug: customRadio.value,
      billingPeriod: billingCycles.value.toUpperCase(),
      paymentMethod: paymentMethod.value,
      couponCode: appliedCoupon.value?.code || undefined
    }

    if (customRadio.value === 'custom') {
      params.customLimits = {
        storage_mb: customConfig.value.storage_gb * 1024,
        sms_monthly: customConfig.value.sms_monthly,
        employees: customConfig.value.employees
      }
      params.customPrice = calculateCustomPrice()
    }

    const result = await subscribe(params)
    if (result.success) {
      paymentResult.value = result.data
    } else {
      alert(result.error)
    }
  } finally {
    isSubmitting.value = false
  }
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
}

const formatCurrency = (value: number) => {
  return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <!-- Overlay de Carregamento -->
    <div v-if="plansLoading" class="flex flex-col items-center justify-center py-20">
      <BaseLoader class="mb-4 size-10 text-primary-500" />
      <BaseText>Carregando detalhes do plano...</BaseText>
    </div>

    <!-- Tela de Resultado -->
    <div v-else-if="paymentResult" class="max-w-2xl mx-auto py-10">
      <BaseCard rounded="md" class="p-8 text-center">
        <div v-if="paymentMethod === 'PIX'">
          <div class="flex justify-center mb-6">
            <div class="p-4 bg-white rounded-xl shadow-inner border border-muted-200 dark:border-muted-800">
              <img
                :src="paymentResult.paymentData?.pixQrCode || 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MOCK_PIX_PAYMENT'"
                class="size-48">
            </div>
          </div>
          <BaseHeading size="xl" weight="bold">Aguardando Pagamento PIX</BaseHeading>
          <BaseParagraph class="mb-6 text-muted-500">
            Escaneie o código acima ou copie a chave abaixo para pagar no seu banco.
          </BaseParagraph>
          <div class="flex items-center gap-2 p-3 bg-muted-100 dark:bg-muted-800 rounded-lg my-6">
            <code class="text-xs break-all flex-1 text-left">{{ paymentResult.paymentData?.pixCopyPaste }}</code>
            <BaseButton size="sm" @click="copyToClipboard(paymentResult.paymentData?.pixCopyPaste)">Copiar</BaseButton>
          </div>
        </div>
        <div v-else-if="paymentMethod === 'BOLETO'">
          <Icon name="solar:bill-list-bold-duotone" class="size-20 text-primary-500 mx-auto mb-4" />
          <BaseHeading size="xl" weight="bold">Boleto Gerado!</BaseHeading>
          <BaseParagraph class="mb-6 text-muted-500 text-sm">
            Seu boleto foi gerado e está pronto para pagamento.
          </BaseParagraph>
          <BaseButton :to="paymentResult.paymentData?.boletoUrl" target="_blank" variant="primary"
            class="w-full mt-6 h-12">Visualizar Boleto</BaseButton>
        </div>
        <div v-else>
          <Icon name="solar:verified-check-bold-duotone" class="size-20 text-success-500 mx-auto mb-4" />
          <BaseHeading size="xl" weight="bold">Pagamento Confirmado!</BaseHeading>
          <BaseParagraph class="mb-6 text-muted-500 text-sm">
            Sua assinatura do plano {{ selectedPlan?.name }} foi ativada com sucesso.
          </BaseParagraph>
          <BaseButton to="/dashboard" variant="primary" class="w-full mt-6 h-12">Ir para Dashboard</BaseButton>
        </div>
        <BaseButton @click="paymentResult = null" variant="ghost" class="mt-4">Voltar</BaseButton>
      </BaseCard>
    </div>

    <form v-else @submit.prevent="handlePayment" class="mx-auto max-w-7xl">
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
                <BaseText size="xs" weight="bold">Gratuito</BaseText>
              </div>
            </TairoRadioCard>
            <TairoRadioCard value="basic" class="data-[state=checked]:ring-yellow-400!">
              <template #indicator>
                <Icon name="solar:check-circle-bold-duotone"
                  class="size-5 group-data-[state=unchecked]:opacity-0 text-yellow-500" />
              </template>
              <div class="p-2 text-center">
                <BaseText size="xs" weight="bold">Básico</BaseText>
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
                <BaseText size="xs" weight="bold">Profissional</BaseText>
              </div>
            </TairoRadioCard>
            <TairoRadioCard value="enterprise" class="data-[state=checked]:ring-primary-500!">
              <template #indicator>
                <Icon name="solar:check-circle-bold-duotone"
                  class="size-5 group-data-[state=unchecked]:opacity-0 text-primary-500" />
              </template>
              <div class="p-2 text-center">
                <BaseText size="xs" weight="bold">Empresa</BaseText>
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
                  <BaseText size="sm" class="text-muted-400">/ {{ currentCycleLabel }}</BaseText>
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
                  {{ (selectedPlan?.limits?.storage_mb || 0) >= 1024 ? Math.round((selectedPlan.limits.storage_mb || 0)
                    / 1024) +
                    'GB' : (selectedPlan?.limits?.storage_mb || 0) + 'MB' }} de Drive
                </BaseText>
              </div>
              <div class="flex items-center gap-2" :class="planColor">
                <Icon name="solar:check-circle-bold-duotone" class="size-4" />
                <BaseText size="xs" class="text-muted-500 dark:text-muted-400">{{ selectedPlan?.limits?.employees || 0
                  }} Usuários
                  inclusos</BaseText>
              </div>
              <div class="flex items-center gap-2" :class="planColor">
                <Icon name="solar:check-circle-bold-duotone" class="size-4" />
                <BaseText size="xs" class="text-muted-500 dark:text-muted-400">
                  {{ selectedPlan?.limits?.tax_declarations_yearly || 0 }} Declarações/ano
                </BaseText>
              </div>
              <div class="flex items-center gap-2" :class="planColor">
                <Icon name="solar:check-circle-bold-duotone" class="size-4" />
                <BaseText size="xs" class="text-muted-500 dark:text-muted-400">{{ selectedPlan?.limits?.sms_monthly || 0
                  }} SMS
                  /mês</BaseText>
              </div>
              <div class="flex items-center gap-2" :class="planColor">
                <Icon name="solar:check-circle-bold-duotone" class="size-4" />
                <BaseText size="xs" class="text-muted-500 dark:text-muted-400">Gestão Kanban</BaseText>
              </div>
              <div class="flex items-center gap-2" :class="planColor">
                <Icon name="solar:check-circle-bold-duotone" class="size-4" />
                <BaseText size="xs" class="text-muted-500 dark:text-muted-400">Suporte prioritário</BaseText>
              </div>
              <div class="flex items-center gap-2" :class="planColor">
                <Icon name="solar:check-circle-bold-duotone" class="size-4" />
                <BaseText size="xs" class="text-muted-500 dark:text-muted-400">Backups diários</BaseText>
              </div>
            </div>
          </BaseCard>

          <!-- Usuários -->
          <BaseCard rounded="md" class="p-4 md:p-6 transition-all duration-300"
            :class="{ 'ring-1 ring-primary-500 border-primary-500': showUserCustomizer }">
            <div class="mb-4 flex items-center justify-between">
              <BaseHeading as="h4" size="sm" weight="medium">Equipe e Usuários</BaseHeading>
              <BaseTag rounded="full" color="muted" size="sm">{{ selectedPlan?.limits?.employees || 0 }} inclusos
              </BaseTag>
            </div>
            <BaseParagraph size="xs" class="text-muted-500 mb-6">
              Colaboradores que podem acessar a plataforma simultaneamente.
            </BaseParagraph>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <BaseAvatar src="/img/custom/user-slot.png" size="sm" />
                <BaseAvatar src="/img/custom/user-slot.png" size="sm"
                  v-if="(selectedPlan?.limits?.employees || 0) > 1" />
                <div v-if="(selectedPlan?.limits?.employees || 0) > 2" class="text-muted-400 text-xs font-medium ml-2">
                  +{{ (selectedPlan?.limits?.employees || 0) - 2 }} extras
                </div>
              </div>
              <BaseButton type="button" size="sm" variant="muted" @click="toggleUserCustomizer" class="h-8">
                <Icon name="solar:pen-2-linear" class="size-3 mr-1" />
                Ajustar
              </BaseButton>
            </div>
            <div v-if="showUserCustomizer"
              class="mt-6 pt-6 border-t border-muted-200 dark:border-muted-800 animate-in fade-in slide-in-from-top-2">
              <BaseText size="xs" class="text-muted-500 mb-2">Quantidade de Usuários</BaseText>
              <BaseInput v-model="customConfig.employees" type="number" min="1" label="Quantidade de Usuários"
                @update:model-value="convertToCustom" />
            </div>
          </BaseCard>

          <!-- Personalização (Drive/SMS) -->
          <BaseCard rounded="md" class="p-4 md:p-6 transition-all duration-300"
            :class="{ 'ring-1 ring-primary-500 border-primary-500': showResourceCustomizer }">
            <div class="mb-4 flex items-center justify-between">
              <BaseHeading as="h4" size="sm" weight="medium">Personalização</BaseHeading>
              <div class="flex gap-2">
                <BaseTag rounded="full" color="muted" size="sm">{{ Math.round((selectedPlan?.limits?.storage_mb || 0) /
                  1024) }}GB</BaseTag>
                <BaseTag rounded="full" color="muted" size="sm">{{ selectedPlan?.limits?.sms_monthly || 0 }} SMS
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
              <BaseButton type="button" size="sm" variant="muted" @click="toggleResourceCustomizer" class="h-8">
                <Icon name="solar:pen-2-linear" class="size-3 mr-1" />
                Personalizar
              </BaseButton>
            </div>
            <div v-if="showResourceCustomizer"
              class="mt-6 pt-6 border-t border-muted-200 dark:border-muted-800 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div class="grid grid-cols-2 gap-4">
                <BaseText size="xs" class="text-muted-500 mb-2">Espaço DRIVE (GB)</BaseText>
                <BaseInput v-model="customConfig.storage_gb" type="number" min="1" label="Espaço DRIVE (GB)"
                  @update:model-value="convertToCustom" />
                <BaseText size="xs" class="text-muted-500 mb-2">Qtd. SMS</BaseText>
                <BaseInput v-model="customConfig.sms_monthly" type="number" step="100" min="100" label="Qtd. SMS"
                  @update:model-value="convertToCustom" />
                <BaseText size="xs" class="text-muted-500 mb-2">Declarações IR/ano</BaseText>
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
            <BaseHeading as="h4" size="lg" weight="bold" class="mb-2">Pagamento 100% Seguro</BaseHeading>
            <BaseParagraph size="xs" class="text-muted-500 max-w-sm mx-auto">
              Seus dados estão protegidos por criptografia de ponta a ponta. Utilizamos os mesmos padrões de segurança
              dos
              maiores bancos brasileiros.
            </BaseParagraph>
            <div
              class="flex items-center gap-4 mt-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
              <img src="/img/custom/pix-logo.png" class="h-6" alt="PIX" />
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

              <!-- Opções de Cobrança (Integradas no resumo) -->
              <div class="space-y-6 mb-8 pb-8 border-b border-muted-100 dark:border-muted-800">
                <div class="space-y-4">
                  <div>
                    <BaseHeading as="h4" size="xs" weight="semibold"
                      class="mb-3 uppercase tracking-wider text-muted-500 text-center">Ciclo de Cobrança</BaseHeading>
                    <BaseRadioGroup v-model="billingCycles" class="grid grid-cols-2 gap-2">
                      <TairoRadioCard value="monthly" class="p-2 text-center data-[state=checked]:ring-primary-500!">
                        <BaseText size="xs" weight="bold">Mensal</BaseText>
                      </TairoRadioCard>
                      <TairoRadioCard value="quarterly" class="p-2 text-center data-[state=checked]:ring-primary-500!">
                        <BaseText size="xs" weight="bold">Trimestral</BaseText>
                      </TairoRadioCard>
                      <TairoRadioCard value="semiannual" class="p-2 text-center data-[state=checked]:ring-primary-500!">
                        <BaseText size="xs" weight="bold">Semestral</BaseText>
                      </TairoRadioCard>
                      <TairoRadioCard value="annual" class="p-2 text-center data-[state=checked]:ring-primary-500!">
                        <BaseText size="xs" weight="bold">Anual</BaseText>
                      </TairoRadioCard>
                    </BaseRadioGroup>
                  </div>

                  <div>
                    <BaseHeading as="h4" size="xs" weight="semibold"
                      class="mb-3 uppercase tracking-wider text-muted-500 text-center">Forma de Pagamento</BaseHeading>
                    <BaseRadioGroup v-model="paymentMethod" class="grid grid-cols-2 gap-2">
                      <TairoRadioCard value="CREDIT_CARD"
                        class="flex flex-col items-center justify-center p-3 h-20 gap-2 data-[state=checked]:ring-primary-500!">
                        <Icon name="solar:card-2-bold-duotone"
                          class="size-6 text-muted-400 group-data-[state=checked]:text-primary-500" />
                        <BaseText size="xs" weight="bold">Cartão</BaseText>
                      </TairoRadioCard>
                      <TairoRadioCard value="PIX"
                        class="flex flex-col items-center justify-center p-3 h-20 gap-2 data-[state=checked]:ring-success-500! relative overflow-hidden">
                        <div
                          class="absolute -right-5 top-1 rotate-45 bg-success-500 px-5 py-0.5 text-[8px] font-bold text-white uppercase">
                          5% OFF</div>
                        <img src="/img/custom/pix-logo.png"
                          class="h-6 object-contain grayscale group-data-[state=checked]:grayscale-0" alt="PIX" />
                        <BaseText size="xs" weight="bold">PIX</BaseText>
                      </TairoRadioCard>
                    </BaseRadioGroup>
                  </div>
                </div>
              </div>

              <!-- Itens do Plano -->
              <div class="space-y-4 mb-8">
                <div class="flex justify-between items-start">
                  <div>
                    <BaseText weight="semibold" class="text-muted-800 dark:text-white">{{ selectedPlan?.name }}
                    </BaseText>
                    <BaseParagraph size="xs" class="text-muted-400">Assinatura {{ currentCycleLabel }}</BaseParagraph>
                  </div>
                  <BaseText weight="bold">{{ formatCurrency(currentCyclePrice) }}</BaseText>
                </div>

                <div class="pt-4 border-t border-muted-100 dark:border-muted-800 space-y-3 font-sans text-xs">
                  <div class="flex items-center justify-between text-muted-500">
                    <span class="flex items-center gap-2">
                      <Icon name="solar:users-group-rounded-linear" class="size-4" />
                      Usuários ativos
                    </span>
                    <span class="font-medium text-muted-800 dark:text-white">{{ selectedPlan?.limits?.employees
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
                      selectedPlan?.limits?.tax_declarations_yearly ||
                      0 }} /ano</span>
                  </div>
                  <div class="flex items-center justify-between text-muted-500">
                    <span class="flex items-center gap-2">
                      <Icon name="solar:letter-bold-duotone" class="size-4" />
                      Franquia de SMS
                    </span>
                    <span class="font-medium text-muted-800 dark:text-white">{{ selectedPlan?.limits?.sms_monthly || 0
                      }}
                      /mês</span>
                  </div>
                </div>
              </div>

              <!-- Cupom de Desconto -->
              <div class="mb-8 pt-6 border-t border-muted-100 dark:border-muted-800">
                <BaseParagraph size="xs" weight="medium" class="text-muted-500 mb-2 uppercase tracking-wider">Possui um
                  cupom?</BaseParagraph>
                <div class="flex gap-2">
                  <BaseInput v-model="couponCode" placeholder="Código do cupom" class="flex-1 overflow-hidden h-10"
                    :disabled="!!appliedCoupon" />
                  <BaseButton v-if="!appliedCoupon" variant="muted" class="h-10 px-4" @click="applyCoupon"
                    :loading="plansLoading">Aplicar</BaseButton>
                  <BaseButton v-else variant="muted" color="danger" class="h-10 px-4"
                    @click="appliedCoupon = null; couponCode = ''">Remover</BaseButton>
                </div>
                <BaseText v-if="couponError" color="danger" size="xs" class="mt-1 block">{{ couponError }}</BaseText>
                <BaseText v-if="appliedCoupon" color="success" size="xs" class="mt-1 block">Cupom aplicado com sucesso!
                </BaseText>
              </div>

              <!-- Totais -->
              <div class="space-y-2 bg-muted-50 dark:bg-muted-900 p-4 rounded-lg">
                <div class="flex justify-between text-sm">
                  <span class="text-muted-500 font-sans">Subtotal</span>
                  <span class="text-muted-800 dark:text-white font-medium">{{ formatCurrency(currentCyclePrice)
                    }}</span>
                </div>
                <div v-if="appliedCoupon" class="flex justify-between text-sm text-primary-500">
                  <span class="font-sans italic">Cupom ({{ appliedCoupon.code }})</span>
                  <span class="font-medium">- {{ formatCurrency(discountAmount) }}</span>
                </div>
                <div v-if="paymentMethod === 'PIX'" class="flex justify-between text-sm text-success-500">
                  <span class="font-sans italic">Desconto PIX (5%)</span>
                  <span class="font-medium">- {{ formatCurrency((currentCyclePrice - discountAmount) * 0.05) }}</span>
                </div>
                <div
                  class="flex justify-between items-center pt-2 border-t border-muted-200 dark:border-muted-700 mt-2">
                  <BaseText size="lg" weight="bold" class="text-muted-800 dark:text-white">Total</BaseText>
                  <BaseText size="2xl" weight="bold" class="text-primary-500">
                    {{ formatCurrency(finalTotal) }}
                  </BaseText>
                </div>
                <BaseParagraph size="xs" class="text-muted-400 text-right font-sans">
                  Cobrança única via {{ paymentMethod === 'CREDIT_CARD' ? 'Cartão' : paymentMethod }}
                </BaseParagraph>
              </div>

              <!-- Botão Final -->
              <BaseButton type="submit" variant="primary" color="primary"
                class="w-full h-12 mt-8 shadow-xl shadow-primary-500/20 text-lg font-bold" :loading="isSubmitting">
                Finalizar Assinatura
              </BaseButton>
              <BaseParagraph size="xs" class="text-muted-400 text-center mt-4">
                Ao confirmar, você concorda com nossos <NuxtLink class="underline">Termos de Uso</NuxtLink>.
              </BaseParagraph>
            </BaseCard>

            <!-- Help Card -->
            <BaseCard rounded="md" class="p-4 bg-primary-500/5 border-primary-500/10 border flex items-center gap-4">
              <div class="size-10 rounded-full bg-primary-500/10 flex items-center justify-center shrink-0">
                <Icon name="solar:question-square-bold-duotone" class="size-6 text-primary-500" />
              </div>
              <div>
                <BaseText size="xs" weight="bold">Dúvidas com o pagamento?</BaseText>
                <BaseParagraph size="xs" class="text-muted-500">Chame nosso suporte no WhatsApp.</BaseParagraph>
              </div>
            </BaseCard>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>