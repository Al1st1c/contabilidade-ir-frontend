<script setup lang="ts">
import { useSubscription } from '~/composables/useSubscription'

definePageMeta({
  title: 'Pagamento da Assinatura',
})

const route = useRoute()
const router = useRouter()
const { plans, loading: plansLoading, fetchPlans, subscribe } = useSubscription()

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
        tax_declarations_yearly: 1000 // Fixo para personalizado ou ajustável futuramente
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
      paymentMethod: paymentMethod.value
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

    <form v-else action="" method="POST" class="w-full" @submit.prevent="handlePayment">
      <!-- Header -->
      <div class="mb-8 flex flex-col justify-between md:flex-row md:items-center">
        <div class="flex max-w-[425px] flex-col items-center gap-4 text-center md:flex-row md:text-start lg:max-w-full">
          <div>
            <BaseHeading as="h2" size="xl" weight="medium" lead="tight" class="text-muted-900 dark:text-white">
              <span>Gerenciar plano</span>
            </BaseHeading>
            <BaseParagraph size="sm">
              <span class="text-muted-600 dark:text-muted-400">
                Gerencie sua assinatura e informações de faturamento
              </span>
            </BaseParagraph>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-center gap-2 md:mt-0 md:justify-start">
          <BaseButton type="submit" variant="primary" :loading="isSubmitting">
            <span>Ativar por</span>
            <span class="font-semibold ml-1">{{ formatCurrency(currentCyclePrice) }}</span>
          </BaseButton>
        </div>
      </div>

      <!-- plans -->
      <div class="mb-4 grid gap-4 md:grid-cols-2">
        <BaseRadioGroup v-model="customRadio" class="grid grid-cols-2 gap-4">
          <TairoRadioCard value="free"
            class="data-[state=checked]:ring-success-500! data-[state=checked]:border-success-500!">
            <template #indicator>
              <div
                class="flex size-7 items-center justify-center rounded-full text-success-500 group-data-[state=unchecked]:opacity-0">
                <Icon name="solar:check-circle-bold-duotone" class="size-6" />
              </div>
            </template>
            <TairoLogo class="mx-auto mb-2 size-9 group-data-[state=checked]:text-success-500" />
            <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-800 dark:text-white">
              Gratuito
            </BaseHeading>
            <BaseText size="xs" lead="tight" class="text-muted-400">
              Ideal para quem está começando agora
            </BaseText>
          </TairoRadioCard>

          <TairoRadioCard value="basic"
            class="data-[state=checked]:ring-yellow-400! data-[state=checked]:border-yellow-400!">
            <template #indicator>
              <div
                class="flex size-7 items-center justify-center rounded-full text-yellow-500 group-data-[state=unchecked]:opacity-0">
                <Icon name="solar:check-circle-bold-duotone" class="size-6" />
              </div>
            </template>
            <TairoLogo class="mx-auto mb-2 size-9 group-data-[state=checked]:text-yellow-400" />
            <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-800 dark:text-white">
              Básico
            </BaseHeading>
            <BaseText size="xs" lead="tight" class="text-muted-400">
              Escritórios individuais e autônomos
            </BaseText>
          </TairoRadioCard>

          <TairoRadioCard value="pro"
            class="data-[state=checked]:ring-indigo-500! data-[state=checked]:border-indigo-500! relative overflow-hidden">
            <div
              class="absolute -right-6 top-3 rotate-45 bg-indigo-500 px-8 py-1 text-[10px] font-bold text-white shadow-lg">
              Mais Comum
            </div>
            <template #indicator>
              <div
                class="flex size-7 items-center justify-center rounded-full text-indigo-500 group-data-[state=unchecked]:opacity-0">
                <Icon name="solar:check-circle-bold-duotone" class="size-6" />
              </div>
            </template>
            <TairoLogo class="mx-auto mb-2 size-9 group-data-[state=checked]:text-indigo-500" />
            <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-800 dark:text-white">
              Profissional
            </BaseHeading>
            <BaseText size="xs" lead="tight" class="text-muted-400">
              Para times em pleno crescimento
            </BaseText>
          </TairoRadioCard>

          <TairoRadioCard value="enterprise"
            class="data-[state=checked]:ring-primary-500! data-[state=checked]:border-primary-500!">
            <template #indicator>
              <div
                class="flex size-7 items-center justify-center rounded-full text-primary-500 group-data-[state=unchecked]:opacity-0">
                <Icon name="solar:check-circle-bold-duotone" class="size-6" />
              </div>
            </template>
            <TairoLogo class="mx-auto mb-2 size-9 group-data-[state=checked]:text-primary-500" />
            <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-800 dark:text-white">
              Enterprise
            </BaseHeading>
            <BaseText size="xs" lead="tight" class="text-muted-400">
              Solução completa para grandes operações
            </BaseText>
          </TairoRadioCard>

          <TairoRadioCard v-if="customRadio === 'custom'" value="custom"
            class="data-[state=checked]:ring-purple-500! data-[state=checked]:border-purple-500!">
            <template #indicator>
              <div
                class="flex size-7 items-center justify-center rounded-full text-purple-500 group-data-[state=unchecked]:opacity-0">
                <Icon name="solar:check-circle-bold-duotone" class="size-6" />
              </div>
            </template>
            <TairoLogo class="mx-auto mb-2 size-9 group-data-[state=checked]:text-purple-500" />
            <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-800 dark:text-white">
              Personalizado
            </BaseHeading>
            <BaseText size="xs" lead="tight" class="text-muted-400">
              Plano com limites flexíveis sob medida
            </BaseText>
          </TairoRadioCard>
        </BaseRadioGroup>

        <div>
          <BaseCard rounded="md" class="flex h-full flex-col p-4 md:p-6 shadow-xl shadow-muted-200/50 dark:shadow-none">
            <div class="flex gap-12">
              <TairoLogo class="size-12 shrink-0" :class="planColor" />
              <div>
                <BaseText size="xl" lead="tight" weight="semibold">
                  {{ formatCurrency(
                    billingCycles === 'monthly' ? (selectedPlan?.pricing?.monthly || 0) :
                      billingCycles === 'quarterly' ? (selectedPlan?.pricing?.quarterly || 0) :
                        billingCycles === 'semiannual' ? (selectedPlan?.pricing?.semiannual || 0) :
                          (selectedPlan?.pricing?.annual || 0)
                  ) }}
                  <span class="text-sm text-muted-400 font-normal">/ {{
                    billingCycles === 'monthly' ? 'mês' :
                      billingCycles === 'quarterly' ? 'trimestre' :
                        billingCycles === 'semiannual' ? 'semestre' : 'ano'
                  }}</span>
                </BaseText>
                <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400">
                  {{ selectedPlan?.description }}
                </BaseParagraph>
              </div>
            </div>
            <div class="my-8">
              <BaseParagraph size="sm" lead="tight" class="text-muted-500 dark:text-muted-400">
                A Contabilidade IR oferece funcionalidades incríveis que se adaptam perfeitamente ao seu escritório,
                garantindo agilidade e segurança no processamento de suas declarações.
              </BaseParagraph>
            </div>
            <div class="grid grid-cols-2 gap-4 font-sans text-xs">
              <div>
                <ul class="space-y-2">
                  <li v-if="selectedPlan?.limits?.storage_mb" class="flex items-center gap-2" :class="planColor">
                    <Icon name="lucide:check" class="size-3 text-current shrink-0" />
                    <span class="text-muted-400">
                      {{ selectedPlan.limits.storage_mb >= 1024 ? Math.round(selectedPlan.limits.storage_mb / 1024) +
                        'GB' :
                        selectedPlan.limits.storage_mb + 'MB' }} de Drive
                    </span>
                  </li>
                  <li v-if="selectedPlan?.limits?.employees" class="flex items-center gap-2" :class="planColor">
                    <Icon name="lucide:check" class="size-3 text-current shrink-0" />
                    <span class="text-muted-400">{{ selectedPlan.limits.employees }} Usuários Liberados</span>
                  </li>
                  <li v-if="selectedPlan?.limits?.sms_monthly" class="flex items-center gap-2" :class="planColor">
                    <Icon name="lucide:check" class="size-3 text-current shrink-0" />
                    <span class="text-muted-400">{{ selectedPlan.limits.sms_monthly }} SMS Inicial/mês</span>
                  </li>
                </ul>
              </div>
              <div>
                <ul class="space-y-2">
                  <li v-if="selectedPlan?.features?.includes('KANBAN')" class="flex items-center gap-2"
                    :class="planColor">
                    <Icon name="lucide:check" class="size-3 text-current shrink-0" />
                    <span class="text-muted-400">Gestão Kanban</span>
                  </li>
                  <li class="flex items-center gap-2" :class="planColor">
                    <Icon name="lucide:check" class="size-3 text-current shrink-0" />
                    <span class="text-muted-400">Suporte prioritário</span>
                  </li>
                  <li class="flex items-center gap-2" :class="planColor">
                    <Icon name="lucide:check" class="size-3 text-current shrink-0" />
                    <span class="text-muted-400">Backups automáticos</span>
                  </li>
                </ul>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- Controls -->
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 sm:col-span-6 lg:col-span-7">
          <div class="flex flex-col gap-4">
            <!-- Usuários -->
            <BaseCard rounded="md" class="p-4 md:p-6 transition-all duration-300"
              :class="{ 'ring-1 ring-primary-500 border-primary-500': showUserCustomizer }">
              <div class="mb-4 flex items-center justify-between">
                <BaseHeading as="h4" size="sm" weight="medium">
                  Equipe e Usuários
                </BaseHeading>
                <div>
                  <BaseText size="xs" lead="tight" class="text-muted-400">
                    {{ selectedPlan?.limits?.employees || 0 }} usuários inclusos
                  </BaseText>
                </div>
              </div>
              <BaseParagraph size="xs" class="text-muted-500 mb-4">
                Colaboradores do seu escritório que podem acessar a plataforma simultaneamente.
              </BaseParagraph>
              <div class="flex items-center gap-2 lg:justify-between">
                <div class="flex items-center gap-2">
                  <BaseTooltip content="Usuário 1">
                    <BaseAvatar src="/img/custom/user-slot.png" size="sm" />
                  </BaseTooltip>
                  <BaseTooltip v-if="selectedPlan?.limits?.employees && selectedPlan.limits.employees > 1"
                    content="Usuário 2">
                    <BaseAvatar src="/img/custom/user-slot.png" size="sm" />
                  </BaseTooltip>
                  <BaseTooltip v-if="selectedPlan?.limits?.employees && selectedPlan.limits.employees > 2"
                    content="Usuário 3">
                    <BaseAvatar size="sm" src="/img/custom/user-slot.png" />
                  </BaseTooltip>
                  <div v-if="selectedPlan?.limits?.employees && selectedPlan.limits.employees > 3"
                    class="text-muted-400 text-xs font-medium ml-2">
                    +{{ selectedPlan.limits.employees - 3 }} extras
                  </div>
                </div>
                <div>
                  <BaseTooltip :content="showUserCustomizer ? 'Fechar' : 'Personalizar'">
                    <button type="button" @click="toggleUserCustomizer"
                      class="flex items-center justify-center border-muted-200 dark:border-muted-800 hover:border-primary-500 dark:hover:border-primary-500 text-muted-400 dark:text-muted-600 size-10 rounded-full border-2 border-dashed transition-all duration-300 hover:border-solid"
                      :class="{ 'border-primary-500 border-solid text-primary-500': showUserCustomizer }">
                      <Icon :name="showUserCustomizer ? 'solar:close-circle-linear' : 'solar:pen-2-linear'"
                        class="size-4" />
                    </button>
                  </BaseTooltip>
                </div>
              </div>
              <div v-if="showUserCustomizer" class="mt-4 pt-4 border-t border-muted-200 dark:border-muted-800">
                <BaseParagraph size="xs" class="text-muted-500 mb-4">
                  Quantidade de Usuários
                </BaseParagraph>
                <BaseInput v-model="customConfig.employees" type="number" min="1"
                  @update:model-value="convertToCustom" />
              </div>
            </BaseCard>

            <!-- Personalização de Recursos -->
            <BaseCard rounded="md" class="p-4 md:p-6 transition-all duration-300"
              :class="{ 'ring-1 ring-primary-500 border-primary-500': showResourceCustomizer }">
              <div class="mb-4 flex items-center justify-between">
                <BaseHeading as="h4" size="sm" weight="medium">
                  Personalização
                </BaseHeading>
                <div class="flex flex-col items-end">
                  <BaseText size="xs" lead="tight" class="text-muted-400">
                    + {{ selectedPlan?.limits?.storage_mb && selectedPlan.limits.storage_mb >= 1024 ?
                      Math.round(selectedPlan.limits.storage_mb / 1024) + 'GB' : selectedPlan?.limits?.storage_mb + 'MB'
                    }}
                    Drive
                  </BaseText>
                  <BaseText size="xs" lead="tight" class="text-muted-400">
                    + {{ selectedPlan?.limits?.sms_monthly || 0 }} SMS
                  </BaseText>
                </div>
              </div>
              <BaseParagraph size="xs" class="text-muted-500 mb-4">
                Adicione mais recursos conforme a necessidade de faturamento e comunicação do seu escritório.
              </BaseParagraph>
              <div class="flex items-center justify-between">
                <div class="flex gap-4">
                  <BaseAvatar src="/img/custom/drive-resource.png" class="size-10" alt="Drive" />
                  <BaseAvatar src="/img/custom/sms-resource.png" class="size-10" alt="SMS" />
                </div>
                <BaseTooltip :content="showResourceCustomizer ? 'Fechar' : 'Personalizar'">
                  <button type="button" @click="toggleResourceCustomizer"
                    class="flex items-center justify-center border-muted-200 dark:border-muted-800 hover:border-primary-500 dark:hover:border-primary-500 text-muted-400 dark:text-muted-600 size-10 rounded-full border-2 border-dashed transition-all duration-300 hover:border-solid"
                    :class="{ 'border-primary-500 border-solid text-primary-500': showResourceCustomizer }">
                    <Icon :name="showResourceCustomizer ? 'solar:close-circle-linear' : 'solar:pen-2-linear'"
                      class="size-4" />
                  </button>
                </BaseTooltip>
              </div>
              <div v-if="showResourceCustomizer"
                class="mt-4 pt-4 border-t border-muted-200 dark:border-muted-800 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <BaseParagraph size="xs" class="text-muted-500 mb-4">
                    Espaço DRIVE (GB)
                  </BaseParagraph>
                  <BaseInput v-model="customConfig.storage_gb" type="number" min="1"
                    @update:model-value="convertToCustom" />
                  <BaseParagraph size="xs" class="text-muted-500 mb-4">
                    Qtd. SMS
                  </BaseParagraph>
                  <BaseInput v-model="customConfig.sms_monthly" type="number" step="100" min="100"
                    @update:model-value="convertToCustom" />
                </div>
              </div>
            </BaseCard>

            <BaseCard rounded="md" class="p-4 md:p-6">
              <div class="mb-8 flex items-center justify-between">
                <BaseHeading as="h4" size="sm" weight="semibold">
                  Forma de Pagamento
                </BaseHeading>
              </div>
              <BaseRadioGroup v-model="paymentMethod" class="flex items-center gap-6">
                <BaseRadio label="Cartão de Crédito" value="CREDIT_CARD" />
                <div class="flex items-center gap-2">
                  <BaseRadio label="PIX" value="PIX" />
                  <img src="/img/custom/pix-logo.png" class="size-5 object-contain" alt="PIX" />
                  <BaseTag color="success" flavor="outline" rounded="full" size="sm"
                    class="h-5 px-2 text-[10px] font-bold uppercase tracking-wider">
                    -5% OFF
                  </BaseTag>
                </div>
                <BaseRadio label="Boleto" value="BOLETO" />
              </BaseRadioGroup>
            </BaseCard>

            <BaseCard rounded="md" class="p-4 md:p-6">
              <div class="mb-8 flex items-center justify-between">
                <BaseHeading as="h4" size="sm" weight="semibold">
                  Ciclo de faturamento
                </BaseHeading>
              </div>
              <BaseRadioGroup v-model="billingCycles" class="flex items-center gap-6">
                <BaseRadio label="Mensal" value="monthly" />
                <BaseRadio label="Trimestral" value="quarterly" />
                <BaseRadio label="Semestral" value="semiannual" />
                <BaseRadio label="Anual" value="annual" />
              </BaseRadioGroup>
            </BaseCard>
          </div>
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-5">
          <BaseCard rounded="md" class="p-4 md:p-6 h-full flex flex-col">
            <div class="mb-4">
              <BaseHeading as="h4" size="sm" weight="semibold">
                Informações de pagamento
              </BaseHeading>
            </div>

            <div :class="{ 'opacity-20 grayscale pointer-events-none select-none': paymentMethod !== 'CREDIT_CARD' }"
              class="transition-all duration-300">
              <DemoCreditCardReal :name="cardInfo.name || 'NOME NO CARTÃO'"
                :number="cardInfo.number || '0000 0000 0000 0000'" :expiry-month="cardInfo.expiryMonth || '01'"
                :expiry-year="cardInfo.expiryYear || '25'" :cvc="cardInfo.cvc || '123'" />
              <div class="mt-5 space-y-4">
                <BaseInput v-model="cardInfo.name" label="Nome no cartão" placeholder="Ex: João da Silva"
                  :disabled="paymentMethod !== 'CREDIT_CARD'" />
                <BaseInput v-model="cardInfo.number" label="Número do cartão" placeholder="0000 0000 0000 0000"
                  :disabled="paymentMethod !== 'CREDIT_CARD'" />
                <div class="grid grid-cols-3 gap-4">
                  <BaseInput v-model="cardInfo.expiryMonth" label="MM" placeholder="01"
                    :disabled="paymentMethod !== 'CREDIT_CARD'" />
                  <BaseInput v-model="cardInfo.expiryYear" label="AA" placeholder="25"
                    :disabled="paymentMethod !== 'CREDIT_CARD'" />
                  <BaseInput v-model="cardInfo.cvc" label="CVC" placeholder="123"
                    :disabled="paymentMethod !== 'CREDIT_CARD'" />
                </div>
              </div>
            </div>

            <div v-if="paymentMethod === 'PIX'"
              class="mt-8 p-4 bg-muted-100 dark:bg-muted-800 rounded-lg text-center border-2 border-dashed border-muted-200 dark:border-muted-700">
              <Icon name="simple-icons:pix" class="size-10 text-[#32BCAD] mx-auto mb-2" />
              <BaseText size="xs" weight="medium">Liberação Instantânea via PIX</BaseText>
            </div>
            <div v-if="paymentMethod === 'BOLETO'"
              class="mt-8 p-4 bg-muted-100 dark:bg-muted-800 rounded-lg text-center border-2 border-dashed border-muted-200 dark:border-muted-700">
              <Icon name="solar:barcode-bold-duotone" class="size-10 text-orange-500 mx-auto mb-2" />
              <BaseText size="xs" weight="medium">Vencimento em 3 dias úteis</BaseText>
            </div>
          </BaseCard>
        </div>
      </div>

      <TairoFormSave>
        <BaseButton type="submit" variant="primary" class="w-full h-12 shadow-xl shadow-primary-500/20"
          :loading="isSubmitting">
          <span>Finalizar assinatura por</span>
          <span class="font-bold ml-1">{{ formatCurrency(currentCyclePrice) }}</span>
          <span class="ml-1 opacity-70">/ {{ currentCycleLabel }}</span>
        </BaseButton>
      </TairoFormSave>
    </form>
  </div>
</template>
