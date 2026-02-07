<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Field, useForm } from 'vee-validate'
import { z } from 'zod'
import { vMaska } from 'maska/vue'

definePageMeta({
  layout: 'empty',
  title: 'Criar Conta',
})

// ===========================================================================
// TYPES
// ===========================================================================

interface Plan {
  id: string
  slug: string
  name: string
  description: string
  pricing: {
    monthly: number
    quarterly?: number
    semiannual?: number
    annual?: number
  }
  limits?: {
    storage_mb?: number
    sms_monthly?: number
    whatsapp_monthly?: number
    employees?: number
    tax_declarations_yearly?: number
  }
  features?: string[]
  allowTrial?: boolean
  trialDays?: number
}

// ===========================================================================
// STATE
// ===========================================================================

const step = ref(1)
const totalSteps = 3
const isLoading = ref(false)
const isSubmitting = ref(false)
const plans = ref<Plan[]>([])
const selectedPlan = ref<string>('free')
const billingCycle = ref<'MONTHLY' | 'ANNUAL'>('MONTHLY')
const paymentMethod = ref<'PIX' | 'CREDIT_CARD' | 'FREE'>('PIX')

// Form data (persists between steps)
const formData = ref({
  name: '',
  email: '',
  phone: '',
  password: '',
})

// Coupon state
const couponCode = ref('')
const appliedCoupon = ref<any>(null)
const couponError = ref('')
const isCouponLoading = ref(false)

// PIX payment state
const showPixCheckout = ref(false)
const pixCode = ref('')
const pixQrCodeUrl = ref('')
const pixExpiresAt = ref<Date | null>(null)
const pixTimeRemaining = ref(0)

// Exit retention modal state
const showExitModal = ref(false)
const isExitingPage = ref(false)
const pixInterval = ref<ReturnType<typeof setInterval> | null>(null)

const router = useRouter()
const toaster = useNuiToasts()
const config = useRuntimeConfig()
const { useCustomFetch } = useApi()

// Usar cookies diretamente para poder atribuir valores
const token = useCookie<string | null>('auth_token', {
  maxAge: 60 * 60 * 24 * 7, // 7 dias
  path: '/',
  sameSite: 'lax',
})
const userCookie = useCookie<any>('auth_user', { // Usar o mesmo nome que useAuth
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
  sameSite: 'lax',
})

// ===========================================================================
// FORM VALIDATION
// ===========================================================================

const userSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(14, 'Telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data: any) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
})

type UserFormData = z.infer<typeof userSchema>

const validationSchema = toTypedSchema(userSchema)

const { handleSubmit, values, errors, setValues } = useForm<UserFormData>({
  validationSchema,
  initialValues: {
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  },
})

// ===========================================================================
// COMPUTED
// ===========================================================================

const currentPlan = computed(() => {
  return plans.value.find(p => p.slug === selectedPlan.value)
})

const monthlyPrice = computed(() => {
  return currentPlan.value?.pricing?.monthly || 0
})

const annualPrice = computed(() => {
  return currentPlan.value?.pricing?.annual || (monthlyPrice.value * 10)
})

const currentPrice = computed(() => {
  if (!currentPlan.value?.pricing) return 0
  return billingCycle.value === 'ANNUAL' ? annualPrice.value : monthlyPrice.value
})

const discountAmount = computed(() => {
  if (!appliedCoupon.value) return 0
  if (appliedCoupon.value.discountType === 'PERCENTAGE') {
    return Math.round((currentPrice.value * appliedCoupon.value.discountValue) / 100)
  }
  return appliedCoupon.value.discountValue || 0
})

const priceAfterCoupon = computed(() => {
  return Math.max(0, currentPrice.value - discountAmount.value)
})

const pixDiscount = computed(() => {
  if (paymentMethod.value !== 'PIX') return 0
  return Math.round(priceAfterCoupon.value * 0.05)
})

const finalPrice = computed(() => {
  return Math.max(0, priceAfterCoupon.value - pixDiscount.value)
})

const cardPrice = computed(() => {
  return priceAfterCoupon.value
})

const isFreeFlow = computed(() => {
  return selectedPlan.value === 'free' || currentPrice.value === 0
})

// ===========================================================================
// METHODS
// ===========================================================================

async function fetchPlans() {
  isLoading.value = true
  try {
    const baseUrl = config.public.apiBase || 'http://localhost:3333'
    const response = await $fetch<Plan[]>(`${baseUrl}/subscriptions/public/plans`)
    plans.value = Array.isArray(response) ? response : []
  }
  catch (err) {
    console.error('Erro ao carregar planos:', err)
  }
  finally {
    isLoading.value = false
  }
}

function saveFormData() {
  formData.value = {
    name: values.name || '',
    email: values.email || '',
    phone: values.phone || '',
    password: values.password || '',
  }
}

function nextStep() {
  if (step.value === 1) {
    saveFormData()
  }
  if (step.value < totalSteps) {
    step.value++
  }
}

function prevStep() {
  if (step.value > 1) {
    step.value--
    // Restore form data when going back to step 1
    if (step.value === 1 && formData.value.name) {
      setValues({
        name: formData.value.name,
        email: formData.value.email,
        phone: formData.value.phone,
        password: formData.value.password,
        confirmPassword: formData.value.password,
      })
    }
  }
}

function editUserData() {
  step.value = 1
  // Restore form values
  if (formData.value.name) {
    setValues({
      name: formData.value.name,
      email: formData.value.email,
      phone: formData.value.phone,
      password: formData.value.password,
      confirmPassword: formData.value.password,
    })
  }
}

function selectPlan(slug: string) {
  selectedPlan.value = slug
  if (slug === 'free') {
    paymentMethod.value = 'FREE'
  }
  else if (paymentMethod.value === 'FREE') {
    paymentMethod.value = 'PIX'
  }
}

function formatCurrency(value: number) {
  return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getPlanIcon(slug: string) {
  switch (slug) {
    case 'free': return '/img/illustrations/onboarding/pricing-1.svg'
    case 'pro': return '/img/illustrations/onboarding/pricing-2.svg'
    case 'enterprise': return '/img/illustrations/onboarding/pricing-3.svg'
    default: return '/img/illustrations/onboarding/pricing-1.svg'
  }
}

async function applyCoupon() {
  if (!couponCode.value.trim()) return

  isCouponLoading.value = true
  couponError.value = ''

  try {
    const baseUrl = config.public.apiBase || 'http://localhost:3333'
    const response = await $fetch<any>(`${baseUrl}/subscriptions/public/coupons/validate?code=${couponCode.value}&amount=${currentPrice.value}`)
    appliedCoupon.value = response
    toaster.add({
      title: 'Cupom aplicado!',
      description: `Desconto de ${response.discountType === 'PERCENTAGE' ? response.discountValue + '%' : formatCurrency(response.discountValue)}`,
      icon: 'ph:check-circle-fill',
    })
  }
  catch {
    couponError.value = 'Cupom inválido ou expirado'
    appliedCoupon.value = null
  }
  finally {
    isCouponLoading.value = false
  }
}

function removeCoupon() {
  appliedCoupon.value = null
  couponCode.value = ''
  couponError.value = ''
}

function startPixTimer() {
  pixExpiresAt.value = new Date(Date.now() + 15 * 60 * 1000)
  updatePixTimer()
  pixInterval.value = setInterval(updatePixTimer, 1000)
}

function updatePixTimer() {
  if (!pixExpiresAt.value) return
  const remaining = Math.max(0, pixExpiresAt.value.getTime() - Date.now())
  pixTimeRemaining.value = Math.floor(remaining / 1000)

  if (remaining <= 0) {
    if (pixInterval.value) clearInterval(pixInterval.value)
    toaster.add({
      title: 'PIX expirado',
      description: 'Gere um novo código para continuar.',
      icon: 'ph:warning-circle-fill',
    })
  }
}

function formatPixTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

async function copyPixCode() {
  try {
    await navigator.clipboard.writeText(pixCode.value)
    toaster.add({
      title: 'Copiado!',
      description: 'Código PIX copiado para a área de transferência.',
      icon: 'ph:check-circle-fill',
    })
  }
  catch {
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível copiar o código.',
      icon: 'ph:warning-circle-fill',
    })
  }
}

const onSubmit = (async () => {
  isSubmitting.value = true

  try {


    const { data: response } = await useCustomFetch<any>('/auth/signup-with-plan', {
      method: 'POST',
      body: {
        name: formData.value.name,
        email: formData.value.email,
        password: formData.value.password,
        phone: formData.value.phone?.replace(/\D/g, '') || undefined,
        planSlug: selectedPlan.value,
        billingPeriod: billingCycle.value,
        paymentMethod: isFreeFlow.value ? 'FREE' : paymentMethod.value,
        couponCode: appliedCoupon.value?.code,
      },
    })

    console.log('📦 Resposta do signup:', response)

    // Salvar token e dados do usuário
    if (response.access_token) {
      console.log('🔑 Token recebido:', response.access_token.substring(0, 20) + '...')

      // Salvar token
      token.value = response.access_token
      console.log('💾 Token salvo no cookie')

      // Aguardar um momento para garantir que o token foi salvo
      await new Promise(resolve => setTimeout(resolve, 500))

      // Buscar dados completos do usuário via /auth/me
      try {
        console.log('🔍 Buscando dados do usuário...')
        const { data: userData } = await useCustomFetch<any>('/auth/me', {
          method: 'GET',
        })

        // Salvar dados do usuário no cookie
        userCookie.value = userData

        console.log('✅ Dados do usuário carregados e salvos:', {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          onboardingStatus: userData.onboardingStatus,
        })
      } catch (userError) {
        console.error('❌ Erro ao buscar dados do usuário:', userError)
        // Se falhar, usar os dados básicos retornados pelo signup
        if (response.user) {
          userCookie.value = response.user
          console.log('⚠️ Usando dados básicos do signup:', response.user)
        }
      }

      // Verificar se tudo foi salvo antes de redirecionar
      console.log('🔍 Verificação final antes de redirecionar:')
      console.log('  - Token salvo?', !!token.value)
      console.log('  - User salvo?', !!userCookie.value)
      console.log('  - User name:', userCookie.value?.name)
      console.log('  - Onboarding status:', userCookie.value?.onboardingStatus)
    } else {
      console.error('❌ Nenhum token recebido do backend!')
    }

    // Fluxo gratuito - ir direto para dashboard
    if (isFreeFlow.value || !response.payment) {
      toaster.add({
        title: 'Sucesso!',
        description: 'Conta criada com sucesso!',
        icon: 'ph:check-circle-fill',
      })

      console.log('🚀 Redirecionando para dashboard em 1 segundo...')
      setTimeout(() => router.push('/dashboard'), 1000)
      return
    }

    // Processar informações de pagamento da API
    const paymentInfo = response.payment

    // Pagamento via PIX - mostrar checkout com dados da API
    if (paymentInfo.method === 'PIX' && paymentInfo.pix) {
      pixCode.value = paymentInfo.pix.code
      pixQrCodeUrl.value = paymentInfo.pix.qrCodeUrl
      showPixCheckout.value = true

      // Iniciar timer com tempo de expiração da API
      const expiresIn = paymentInfo.pix.expiresIn || 1800 // 30 minutos padrão
      pixTimeRemaining.value = expiresIn
      startPixTimer()

      toaster.add({
        title: 'PIX Gerado!',
        description: 'Código PIX gerado com sucesso. Complete o pagamento.',
        icon: 'ph:qr-code-duotone',
      })
      return
    }

    // Pagamento via cartão - redirecionar para Mercado Pago
    if (paymentInfo.method === 'CREDIT_CARD' && paymentInfo.checkoutUrl) {
      toaster.add({
        title: 'Redirecionando...',
        description: 'Você será redirecionado para a página de pagamento.',
        icon: 'ph:arrow-square-out-fill',
      })

      // Redirecionar para checkout do Mercado Pago
      setTimeout(() => {
        window.location.href = paymentInfo.checkoutUrl
      }, 1500)
      return
    }

    // Fallback - algum erro na resposta
    toaster.add({
      title: 'Conta criada!',
      description: 'Entre em contato para completar o pagamento.',
      icon: 'ph:check-circle-fill',
    })
    setTimeout(() => router.push('/dashboard'), 2000)
  }
  catch (err: any) {
    console.error('Erro no signup:', err)

    // Extrair mensagem de erro da API
    const errorMessage = err.data?.message || err.message || 'Erro ao criar conta. Tente novamente.'

    toaster.add({
      title: 'Erro ao criar conta',
      description: errorMessage,
      icon: 'ph:warning-circle-fill',
    })
  }
  finally {
    isSubmitting.value = false
  }
})

function switchToFreePlan() {
  selectedPlan.value = 'free'
  paymentMethod.value = 'FREE'
  showExitModal.value = false
  isExitingPage.value = false

  toaster.add({
    title: 'Plano alterado',
    description: 'Agora você está usando o plano gratuito. Continue o cadastro!',
    icon: 'ph:check-circle-fill',
  })
}

function confirmExit() {
  showExitModal.value = false
  isExitingPage.value = true
  // Permitir saída da página
  window.removeEventListener('beforeunload', handleBeforeUnload)
  // Redirecionar ou permitir navegação
  router.push('/auth')
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  // Apenas interceptar se estiver na step 3, com plano pago e não estiver já saindo
  if (step.value === 3 && !isFreeFlow.value && !isExitingPage.value && !isSubmitting.value) {
    e.preventDefault()
    // Mostrar modal customizado (o navegador pode não mostrar a mensagem customizada)
    showExitModal.value = true
    // Padrão para navegadores modernos
    return (e.returnValue = 'Você tem um plano pago selecionado. Deseja mudar para o plano gratuito ao invés de sair?')
  }
}

// ===========================================================================
// LIFECYCLE
// ===========================================================================

onMounted(() => {
  fetchPlans()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  if (pixInterval.value) clearInterval(pixInterval.value)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

// Watch para adicionar/remover o event listener baseado no step
watch([step, isFreeFlow, isSubmitting], () => {
  // O listener já está sempre ativo, mas só age na condição correta
}, { immediate: true })
</script>

<template>
  <div class="dark:bg-muted-800 min-h-screen bg-white">
    <div class="relative mx-auto flex min-h-screen max-w-10xl">
      <!-- Coluna Esquerda -->
      <div class="relative hidden w-1/2 items-center justify-center p-12 lg:flex bg-muted-100 dark:bg-muted-900">
        <div class="text-center">
          <img src="/img/illustrations/onboarding/pricing-2.svg" alt="Registro" class="mx-auto mb-8 max-w-xs">
          <BaseHeading tag="h2" size="2xl" weight="bold" class="text-muted-800 dark:text-white mb-4">
            Comece sua jornada
          </BaseHeading>
          <BaseParagraph class="text-muted-500 dark:text-muted-400 max-w-sm mx-auto">
            Crie sua conta e tenha acesso a todas as ferramentas para gerenciar o IR dos seus clientes.
          </BaseParagraph>
        </div>
      </div>

      <!-- Coluna Direita -->
      <div class="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-12">
        <div class="mx-auto w-full max-w-md">
          <!-- Header -->
          <div class="mb-6 flex items-center justify-between">
            <NuxtLink to="/auth"
              class="text-muted-400 hover:text-primary-500 flex items-center gap-2 transition-colors">
              <Icon name="solar:alt-arrow-left-linear" class="size-5" />
              <span>Voltar</span>
            </NuxtLink>
            <BaseThemeToggle />
          </div>

          <!-- PIX Checkout -->
          <div v-if="showPixCheckout" class="space-y-6">
            <div class="text-center">
              <div
                class="inline-flex items-center justify-center size-16 rounded-full bg-success-100 dark:bg-success-900/30 mb-4">
                <Icon name="ph:qr-code-fill" class="size-8 text-success-500" />
              </div>
              <BaseHeading tag="h1" size="xl" weight="bold" class="text-muted-800 dark:text-white mb-2">
                Pagamento via PIX
              </BaseHeading>
              <BaseParagraph class="text-muted-500 dark:text-muted-400">
                Escaneie o QR Code ou copie o código
              </BaseParagraph>
            </div>

            <BaseCard rounded="lg" class="p-6 text-center">
              <img :src="pixQrCodeUrl" alt="QR Code PIX"
                class="mx-auto mb-4 rounded-lg border-4 border-muted-200 dark:border-muted-700">

              <div class="flex items-center justify-center gap-2 mb-4">
                <Icon name="ph:timer-fill" class="size-5 text-warning-500" />
                <BaseText weight="bold" class="text-warning-500">
                  Expira em {{ formatPixTime(pixTimeRemaining) }}
                </BaseText>
              </div>

              <BaseProgress :value="(pixTimeRemaining / 900) * 100" size="xs" color="warning" class="mb-4" />

              <div class="space-y-2">
                <BaseText size="xs" class="text-muted-500 uppercase tracking-wider">
                  Código Copia e Cola
                </BaseText>
                <div class="flex gap-2">
                  <BaseInput :model-value="pixCode" readonly rounded="lg"
                    :classes="{ input: 'h-10 text-xs font-mono' }" />
                  <BaseButton variant="primary" rounded="lg" class="h-10 px-4" @click="copyPixCode">
                    <Icon name="ph:copy-fill" class="size-4" />
                  </BaseButton>
                </div>
              </div>
            </BaseCard>

            <BaseCard rounded="lg" class="p-4">
              <div class="flex justify-between items-center">
                <BaseText class="text-muted-500">Valor a pagar</BaseText>
                <BaseText size="xl" weight="bold" class="text-success-500">
                  {{ formatCurrency(finalPrice) }}
                </BaseText>
              </div>
            </BaseCard>

            <BaseParagraph size="xs" class="text-muted-400 text-center">
              Após o pagamento, sua conta será ativada automaticamente.
            </BaseParagraph>

            <BaseButton variant="muted" rounded="lg" class="w-full h-12" @click="showPixCheckout = false">
              Voltar e alterar forma de pagamento
            </BaseButton>
          </div>

          <!-- Formulário Normal -->
          <template v-else>
            <!-- Steps Indicator -->
            <div class="mb-6">
              <div class="flex items-center justify-between">
                <div v-for="s in totalSteps" :key="s" class="flex items-center" :class="{ 'flex-1': s < totalSteps }">
                  <div class="flex size-8 items-center justify-center rounded-full font-medium transition-all" :class="{
                    'bg-primary-500 text-white': step >= s,
                    'bg-muted-200 dark:bg-muted-700 text-muted-500': step < s,
                  }">
                    <Icon v-if="step > s" name="solar:check-circle-bold" class="size-5" />
                    <span v-else>{{ s }}</span>
                  </div>
                  <div v-if="s < totalSteps" class="mx-2 h-0.5 flex-1 transition-all" :class="{
                    'bg-primary-500': step > s,
                    'bg-muted-200 dark:bg-muted-700': step <= s,
                  }" />
                </div>
              </div>
              <div class="mt-2 flex justify-between text-xs text-muted-500">
                <span>Dados</span>
                <span>Plano</span>
                <span>Pagamento</span>
              </div>
            </div>

            <!-- Step 1: Dados Pessoais -->
            <div v-if="step === 1">
              <BaseHeading tag="h1" size="xl" weight="bold" class="text-muted-800 dark:text-white mb-2">
                Crie sua conta
              </BaseHeading>
              <BaseParagraph class="text-muted-500 dark:text-muted-400 mb-6">
                Preencha seus dados para começar
              </BaseParagraph>

              <form class="space-y-4" @submit.prevent="nextStep">
                <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="name">
                  <BaseField label="Nome Completo" :state="errorMessage ? 'error' : 'idle'" :error="errorMessage"
                    required>
                    <BaseInput :model-value="field.value" type="text" placeholder="Seu nome completo" rounded="lg"
                      :classes="{ input: 'h-12' }" @update:model-value="handleChange" @blur="handleBlur" />
                  </BaseField>
                </Field>

                <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="email">
                  <BaseField label="Email" :state="errorMessage ? 'error' : 'idle'" :error="errorMessage" required>
                    <BaseInput :model-value="field.value" type="email" placeholder="seu@email.com" rounded="lg"
                      :classes="{ input: 'h-12' }" @update:model-value="handleChange" @blur="handleBlur" />
                  </BaseField>
                </Field>

                <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="phone">
                  <BaseField label="Telefone" :state="errorMessage ? 'error' : 'idle'" :error="errorMessage" required>
                    <BaseInput v-maska="'(##) #####-####'" :model-value="field.value" type="tel"
                      placeholder="(00) 00000-0000" rounded="lg" :classes="{ input: 'h-12' }"
                      @update:model-value="handleChange" @blur="handleBlur" />
                  </BaseField>
                </Field>

                <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="password">
                  <BaseField label="Senha" :state="errorMessage ? 'error' : 'idle'" :error="errorMessage" required>
                    <BaseInput :model-value="field.value" type="password" placeholder="Mínimo 6 caracteres" rounded="lg"
                      :classes="{ input: 'h-12' }" @update:model-value="handleChange" @blur="handleBlur" />
                  </BaseField>
                </Field>

                <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="confirmPassword">
                  <BaseField label="Confirmar Senha" :state="errorMessage ? 'error' : 'idle'" :error="errorMessage"
                    required>
                    <BaseInput :model-value="field.value" type="password" placeholder="Repita a senha" rounded="lg"
                      :classes="{ input: 'h-12' }" @update:model-value="handleChange" @blur="handleBlur" />
                  </BaseField>
                </Field>

                <BaseButton type="button" variant="primary" rounded="lg" class="h-12! w-full"
                  :disabled="!values.name || !values.email || !values.password || !values.confirmPassword"
                  @click="nextStep">
                  Continuar
                </BaseButton>
              </form>
            </div>

            <!-- Step 2: Escolha do Plano -->
            <div v-else-if="step === 2">
              <BaseHeading tag="h1" size="xl" weight="bold" class="text-muted-800 dark:text-white mb-2">
                Escolha seu plano
              </BaseHeading>
              <BaseParagraph class="text-muted-500 dark:text-muted-400 mb-4">
                Selecione o plano ideal para você
              </BaseParagraph>

              <div v-if="isLoading" class="flex items-center justify-center py-12">
                <AppPageLoading class="size-8" />
              </div>

              <div v-else class="space-y-4">
                <!-- Lista de Planos com Scroll -->
                <div class="max-h-[520px] overflow-y-auto pr-1 space-y-3">
                  <BaseRadioGroup v-model="selectedPlan">
                    <TairoRadioCard v-for="plan in plans" :key="plan.id" :value="plan.slug" rounded="lg"
                      class="group relative overflow-hidden mb-3" @click="selectPlan(plan.slug)">
                      <div v-if="plan.slug === 'pro'"
                        class="absolute -right-6 top-3 rotate-45 bg-indigo-500 px-8 py-1 text-[10px] font-bold text-white z-10">
                        Popular
                      </div>

                      <template #indicator>
                        <Icon name="solar:check-circle-bold-duotone"
                          class="size-6 group-data-[state=unchecked]:opacity-0 text-primary-500" />
                      </template>

                      <div class="p-3">
                        <div class="flex items-start gap-4">
                          <img :src="getPlanIcon(plan.slug)" class="size-12 object-contain" :alt="plan.name">
                          <div class="flex-1 min-w-0">
                            <BaseText weight="semibold" class="text-muted-800 dark:text-white block">
                              {{ plan.name }}
                            </BaseText>
                            <BaseText size="xs" class="text-muted-500 block mt-1">
                              {{ plan.description }}
                            </BaseText>
                          </div>
                          <div class="text-right shrink-0">
                            <BaseText weight="bold" class="text-primary-500">
                              {{ plan.pricing.monthly === 0 ? 'Grátis' : formatCurrency(plan.pricing.monthly) }}
                            </BaseText>
                            <BaseText v-if="plan.pricing.monthly > 0" size="xs" class="text-muted-400">
                              /mês
                            </BaseText>
                          </div>
                        </div>

                        <!-- Features do plano -->
                        <div v-if="plan.limits"
                          class="mt-3 pt-3 border-t border-muted-100 dark:border-muted-800 grid grid-cols-2 gap-2">
                          <div class="flex items-center gap-1.5 text-xs text-muted-500">
                            <Icon name="solar:users-group-rounded-linear" class="size-3.5 text-primary-500 shrink-0" />
                            <span>{{ plan.limits.employees || 1 }} usuário(s)</span>
                          </div>
                          <div class="flex items-center gap-1.5 text-xs text-muted-500">
                            <Icon name="solar:document-text-linear" class="size-3.5 text-primary-500 shrink-0" />
                            <span>{{ plan.limits.tax_declarations_yearly || 0 }} IRs/ano</span>
                          </div>
                          <div class="flex items-center gap-1.5 text-xs text-muted-500">
                            <Icon name="solar:database-linear" class="size-3.5 text-primary-500 shrink-0" />
                            <span>{{ Math.round((plan.limits.storage_mb || 0) / 1024) }}GB drive</span>
                          </div>
                          <div class="flex items-center gap-1.5 text-xs text-muted-500">
                            <Icon name="solar:letter-linear" class="size-3.5 text-primary-500 shrink-0" />
                            <span>{{ plan.limits.sms_monthly || 0 }} SMS/mês</span>
                          </div>
                        </div>
                      </div>
                    </TairoRadioCard>
                  </BaseRadioGroup>
                </div>


                <div class="flex gap-3 pt-4">
                  <BaseButton variant="muted" rounded="lg" class="h-12 flex-1" @click="prevStep">
                    Voltar
                  </BaseButton>
                  <BaseButton variant="primary" rounded="lg" class="h-12 flex-1" @click="nextStep">
                    Continuar
                  </BaseButton>
                </div>
              </div>
            </div>

            <!-- Step 3: Pagamento -->
            <div v-else-if="step === 3">
              <BaseHeading tag="h1" size="xl" weight="bold" class="text-muted-800 dark:text-white mb-2">
                Finalizar Pedido
              </BaseHeading>
              <BaseParagraph class="text-muted-500 dark:text-muted-400 mb-4">
                Confira os dados e escolha a forma de pagamento
              </BaseParagraph>

              <!-- Resumo dos Dados -->
              <BaseCard rounded="lg" class="p-4 mb-4">
                <div class="flex items-center justify-between mb-3">
                  <BaseText size="xs" weight="medium" class="text-muted-500 uppercase tracking-wider">
                    Seus Dados
                  </BaseText>
                  <button type="button" class="text-xs text-primary-500 hover:underline" @click="editUserData">
                    Editar
                  </button>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <BaseText size="sm" class="text-muted-500">Nome</BaseText>
                    <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-white">{{ formData.name }}
                    </BaseText>
                  </div>
                  <div class="flex justify-between">
                    <BaseText size="sm" class="text-muted-500">Email</BaseText>
                    <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-white">{{ formData.email }}
                    </BaseText>
                  </div>
                  <div v-if="formData.phone" class="flex justify-between">
                    <BaseText size="sm" class="text-muted-500">Telefone</BaseText>
                    <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-white">{{ formData.phone }}
                    </BaseText>
                  </div>
                </div>
              </BaseCard>

              <!-- Plano Selecionado -->
              <BaseCard rounded="lg" class="p-4 mb-4">
                <div class="flex items-center justify-between mb-3">
                  <BaseText size="xs" weight="medium" class="text-muted-500 uppercase tracking-wider">
                    Plano Selecionado
                  </BaseText>
                  <button type="button" class="text-xs text-primary-500 hover:underline" @click="step = 2">
                    Alterar
                  </button>
                </div>
                <div class="flex items-center gap-3">
                  <img :src="getPlanIcon(selectedPlan)" class="size-10 object-contain" :alt="currentPlan?.name">
                  <div class="flex-1">
                    <BaseText weight="semibold" class="text-muted-800 dark:text-white block">{{ currentPlan?.name }}
                    </BaseText>
                    <BaseText size="xs" class="text-muted-500 mt-0.5">{{ billingCycle === 'MONTHLY' ? 'Mensal' : 'Anual'
                      }}
                    </BaseText>
                  </div>
                  <BaseText weight="bold" class="text-primary-500">{{ formatCurrency(currentPrice) }}</BaseText>
                </div>
              </BaseCard>

              <!-- Ciclo de Cobrança -->
              <BaseCard v-if="!isFreeFlow" rounded="lg" class="p-4 mb-4">
                <BaseText size="xs" weight="medium" class="text-muted-500 uppercase tracking-wider mb-3">
                  Ciclo de Cobrança
                </BaseText>
                <BaseRadioGroup v-model="billingCycle" class="space-y-3">
                  <TairoRadioCard value="MONTHLY" class="p-4 data-[state=checked]:ring-primary-500!">
                    <div class="flex justify-between items-start">
                      <BaseText weight="semibold" class="text-muted-800 dark:text-white mr-1">Mensal</BaseText>
                      <BaseText weight="bold" class="text-primary-500">{{ formatCurrency(monthlyPrice) }}</BaseText>
                    </div>
                    <BaseText size="xs" class="text-muted-500 mt-1">Faturado mensalmente</BaseText>
                  </TairoRadioCard>

                  <TairoRadioCard value="ANNUAL"
                    class="p-4 data-[state=checked]:ring-primary-500! relative overflow-hidden">
                    <div
                      class="absolute -right-8 top-2 rotate-45 bg-success-500 px-10 py-0.5 text-[9px] font-bold text-white">
                      ECONOMIA
                    </div>
                    <div class="flex justify-between items-start">
                      <BaseText weight="semibold" class="text-muted-800 dark:text-white mr-1">Anual</BaseText>
                      <BaseText weight="bold" class="text-primary-500">{{ formatCurrency(annualPrice) }}</BaseText>
                    </div>
                    <BaseText size="xs" class="text-muted-400 line-through">{{ formatCurrency(monthlyPrice * 12) }}
                    </BaseText>
                    <BaseText size="xs" class="text-muted-500 mt-2">Pagamento único anual</BaseText>
                  </TairoRadioCard>
                </BaseRadioGroup>
              </BaseCard>

              <!-- Cupom de Desconto -->
              <BaseCard v-if="!isFreeFlow" rounded="lg" class="p-4 mb-4">
                <BaseText size="xs" weight="medium" class="text-muted-500 uppercase tracking-wider mb-3">
                  Cupom de Desconto
                </BaseText>
                <div v-if="!appliedCoupon" class="flex gap-2">
                  <BaseInput v-model="couponCode" placeholder="Digite o cupom" rounded="lg"
                    :classes="{ input: 'h-10 uppercase' }" />
                  <BaseButton variant="muted" rounded="lg" class="h-10 px-4" :loading="isCouponLoading"
                    @click="applyCoupon">
                    Aplicar
                  </BaseButton>
                </div>
                <div v-else class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Icon name="ph:ticket-fill" class="size-5 text-success-500" />
                    <BaseText class="text-success-500 font-medium">{{ appliedCoupon.code }}</BaseText>
                  </div>
                  <button type="button" class="text-xs text-danger-500 hover:underline" @click="removeCoupon">
                    Remover
                  </button>
                </div>
                <BaseText v-if="couponError" size="xs" class="text-danger-500 mt-2">{{ couponError }}</BaseText>
              </BaseCard>

              <!-- Forma de Pagamento -->
              <BaseCard v-if="!isFreeFlow" rounded="lg" class="p-4 mb-4">
                <BaseText size="xs" weight="medium" class="text-muted-500 uppercase tracking-wider mb-3">
                  Forma de Pagamento
                </BaseText>
                <BaseRadioGroup v-model="paymentMethod" class="space-y-3">
                  <TairoRadioCard value="PIX"
                    class="p-3 data-[state=checked]:ring-success-500! relative overflow-hidden">
                    <div
                      class="absolute -right-6 top-1 rotate-45 bg-success-500 px-8 py-0.5 text-[9px] font-bold text-white">
                      5% OFF
                    </div>
                    <div class="flex items-center gap-3">
                      <img src="/img/custom/pix-logo.png" class="h-6 object-contain" alt="PIX">
                      <div class="flex-1">
                        <BaseText weight="semibold" class="text-muted-800 dark:text-white block">PIX</BaseText>
                        <!-- <BaseText size="xs" class="text-success-500 mt-0.5">5% de desconto
                        </BaseText> -->
                      </div>
                      <div class="text-right">
                        <BaseText weight="bold" class="text-success-500 mr-1">{{ formatCurrency(finalPrice) }}
                        </BaseText>
                        <BaseText size="xs" class="text-muted-400 line-through">{{ formatCurrency(priceAfterCoupon) }}
                        </BaseText>
                      </div>
                    </div>
                  </TairoRadioCard>

                  <TairoRadioCard value="CREDIT_CARD" class="p-3 data-[state=checked]:ring-primary-500!">
                    <div class="flex items-center gap-3">
                      <div class="flex items-center gap-1">
                        <Icon name="logos:visa" class="h-4" />
                        <Icon name="logos:mastercard" class="h-5" />
                      </div>
                      <div class="flex-1">
                        <BaseText weight="semibold" class="text-muted-800 dark:text-white block">Cartão de Crédito
                        </BaseText>
                        <BaseText size="xs" class="text-muted-500 mt-0.5">Via Mercado Pago</BaseText>
                      </div>
                      <BaseText weight="bold" class="text-muted-800 dark:text-white">{{ formatCurrency(cardPrice) }}
                      </BaseText>
                    </div>
                  </TairoRadioCard>
                </BaseRadioGroup>

                <!-- Info Mercado Pago -->
                <div v-if="paymentMethod === 'CREDIT_CARD'"
                  class="mt-3 p-3 rounded-lg bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800">
                  <div class="flex items-start gap-2">
                    <Icon name="ph:info-fill" class="size-4 text-info-500 shrink-0 mt-0.5" />
                    <BaseText size="xs" class="text-info-600 dark:text-info-400">
                      Ao continuar, você será redirecionado para o checkout seguro do Mercado Pago.
                    </BaseText>
                  </div>
                </div>
              </BaseCard>

              <!-- Resumo Final -->
              <BaseCard v-if="!isFreeFlow" rounded="lg" class="p-4 mb-4 bg-muted-50 dark:bg-muted-900">
                <div class="space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-muted-500">Subtotal</span>
                    <span class="text-muted-800 dark:text-white">{{ formatCurrency(currentPrice) }}</span>
                  </div>
                  <div v-if="discountAmount > 0" class="flex justify-between text-sm text-success-500">
                    <span>Cupom ({{ appliedCoupon?.code }})</span>
                    <span>- {{ formatCurrency(discountAmount) }}</span>
                  </div>
                  <div v-if="paymentMethod === 'PIX'" class="flex justify-between text-sm text-success-500">
                    <span>Desconto PIX (5%)</span>
                    <span>- {{ formatCurrency(pixDiscount) }}</span>
                  </div>
                  <div class="flex justify-between pt-2 border-t border-muted-200 dark:border-muted-800">
                    <BaseText weight="bold" class="text-muted-800 dark:text-white">Total</BaseText>
                    <BaseText size="lg" weight="bold" class="text-primary-500">
                      {{ formatCurrency(paymentMethod === 'PIX' ? finalPrice : cardPrice) }}
                    </BaseText>
                  </div>
                </div>
              </BaseCard>

              <div class="flex gap-3">
                <BaseButton variant="muted" rounded="lg" class="h-12 flex-1" @click="prevStep">
                  Voltar
                </BaseButton>
                <BaseButton variant="primary" rounded="lg" class="h-12 flex-1" :loading="isSubmitting"
                  @click="onSubmit">
                  <Icon v-if="isFreeFlow" name="ph:check-circle-fill" class="size-5 mr-2" />
                  <Icon v-else-if="paymentMethod === 'PIX'" name="ph:qr-code-fill" class="size-5 mr-2" />
                  <Icon v-else name="ph:arrow-square-out-fill" class="size-5 mr-2" />
                  {{ isFreeFlow ? 'Criar Conta Grátis' : (paymentMethod === 'PIX' ? 'Gerar PIX' :
                    'Ir para Mercado Pago') }}
                </BaseButton>
              </div>
            </div>

            <!-- Footer -->
            <div class="mt-6 text-center">
              <BaseText size="xs" class="text-muted-400">
                Já tem uma conta?
                <NuxtLink to="/auth" class="text-primary-500 hover:underline font-medium">
                  Fazer login
                </NuxtLink>
              </BaseText>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Modal de Retenção - Oferecer Plano Grátis -->
    <DialogRoot v-model:open="showExitModal">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-muted-900/50 backdrop-blur-sm" />
        <DialogContent
          class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl dark:bg-muted-900 border border-muted-200 dark:border-muted-800">

          <div class="flex items-start gap-4 mb-4">
            <div
              class="size-12 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center shrink-0">
              <Icon name="lucide:alert-circle" class="size-6 text-warning-500" />
            </div>
            <div class="flex-1">
              <DialogTitle as="h3" class="text-lg font-medium text-muted-800 dark:text-muted-100 mb-1">
                Quer mesmo sair?
              </DialogTitle>
              <DialogDescription class="text-sm text-muted-500 dark:text-muted-400">
                Você selecionou o plano <strong>{{ currentPlan?.name }}</strong>, mas ainda não finalizou.
              </DialogDescription>
            </div>
          </div>


          <div class="border-t border-muted-200 dark:border-muted-800 pt-4 mb-4">
            <div class="flex items-start gap-3 p-3 rounded-lg bg-muted-50 dark:bg-muted-800/50">
              <Icon name="lucide:lightbulb" class="size-5 text-primary-500 shrink-0 mt-0.5" />
              <div>
                <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-muted-100 mb-1">
                  Experimente o plano gratuito primeiro
                </BaseText>
                <BaseText size="sm" class="text-muted-500 dark:text-muted-400">
                  Seus dados já estão salvos. Você pode começar grátis e fazer upgrade depois.
                </BaseText>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <BaseButton variant="muted" rounded="lg" class="flex-1" @click="confirmExit">
              Sair mesmo assim
            </BaseButton>
            <BaseButton variant="primary" rounded="lg" class="flex-1" @click="switchToFreePlan">
              <Icon name="lucide:rocket" class="size-4 mr-1.5" />
              Começar grátis
            </BaseButton>
          </div>

          <DialogClose
            class="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none">
            <Icon name="lucide:x" class="h-4 w-4 text-muted-400" />
            <span class="sr-only">Close</span>
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
