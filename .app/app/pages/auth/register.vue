<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Field, useForm } from 'vee-validate'
import { z } from 'zod'
import { vMaska } from 'maska/vue'
import { usePixel } from '~/composables/usePixel'

definePageMeta({
  layout: 'empty',
  title: 'Criar Conta',
})

useSeoMeta({
  title: 'Criar Conta - Gestor IRPF | Comece Agora Gratuitamente',
  ogTitle: 'Criar Conta - Gestor IRPF | Comece Agora Gratuitamente',
  description: 'Cadastre seu escritório de contabilidade no Gestor IRPF e transforme o caos do Imposto de Renda em um processo organizado e lucrativo.',
  ogDescription: 'Cadastre seu escritório de contabilidade no Gestor IRPF e transforme o caos do Imposto de Renda em um processo organizado e lucrativo.',
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
const billingCycle = ref<'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'>('MONTHLY')
const paymentMethod = ref<'PIX' | 'CREDIT_CARD' | 'FREE'>('PIX')

// Form data (persists between steps)
const formData = ref({
  name: '',
  email: '',
  phone: '',
  document: '',
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
const checkoutUrl = ref('')
const pixExpiresAt = ref<Date | null>(null)
const pixTimeRemaining = ref(0)

// Exit retention modal state
const showExitModal = ref(false)
const isExitingPage = ref(false)
const pixInterval = ref<ReturnType<typeof setInterval> | null>(null)
const checkPaymentInterval = ref<ReturnType<typeof setInterval> | null>(null)
const isCheckingPayment = ref(false)

// Upsell modal state
const showUpsellModal = ref(false)
const upsellTimer = ref(900) // 15 minutos em segundos
const upsellTimerInterval = ref<ReturnType<typeof setInterval> | null>(null)
const upsellTimerStarted = ref(false)
const upsellDismissed = ref(false) // só mostra 1 vez

const router = useRouter()
const route = useRoute()
const toaster = useNuiToasts()
const config = useRuntimeConfig()
const { useCustomFetch } = useApi()
const { token, user: authUser, fetchUser } = useAuth()
const { track } = usePixel()

// Mapear userCookie para o authUser do useAuth
const userCookie = authUser

// Availability checks
const isCheckingAvailability = ref({ email: false, document: false })
const availabilityErrors = ref({ email: '', document: '' })

// Terms Modal State
const showTermsModal = ref(false)
const termsModalType = ref<'terms' | 'lgpd'>('terms')

function openTerms(type: 'terms' | 'lgpd') {
  termsModalType.value = type
  showTermsModal.value = true
}

async function checkAvailability(type: 'email' | 'document', value: string) {
  if (!value || value.length < 5) return

  // Limpar mensagem anterior
  availabilityErrors.value[type] = ''

  const cleanValue = type === 'document' ? value.replace(/\D/g, '') : value.toLowerCase().trim()
  if (type === 'document' && cleanValue.length < 11) return

  isCheckingAvailability.value[type] = true
  try {
    const baseUrl = config.public.apiBase || 'http://localhost:3333'
    const query = type === 'email' ? `email=${cleanValue}` : `document=${cleanValue}`
    const response = await $fetch<any>(`${baseUrl}/public/availability?${query}`)

    if (!response.available) {
      availabilityErrors.value[type] = response.message
    }
  }
  catch (err) {
    console.error(`Erro ao verificar ${type}:`, err)
  }
  finally {
    isCheckingAvailability.value[type] = false
  }
}

// ===========================================================================
// FORM VALIDATION
// ===========================================================================

const userSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(14, 'Telefone é obrigatório'),
  document: z.string().min(11, 'CPF/CNPJ é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
  acceptedTerms: z.boolean().refine(val => val === true, 'Você precisa aceitar os termos'),
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
    document: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
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
  switch (billingCycle.value) {
    case 'QUARTERLY': return currentPlan.value.pricing.quarterly || (monthlyPrice.value * 3)
    case 'SEMIANNUAL': return currentPlan.value.pricing.semiannual || (monthlyPrice.value * 6)
    case 'ANNUAL': return currentPlan.value.pricing.annual || (monthlyPrice.value * 12)
    default: return monthlyPrice.value
  }
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

const isPaymentRequired = computed(() => {
  return !isFreeFlow.value && finalPrice.value > 0
})

const canRedirectToDashboard = computed(() => {
  // Se for grátis, pode. Se for pago, só se showPixCheckout for false (ou seja, já passou pela ativação)
  // Mas a regra principal é: se showPixCheckout está aberto, não sai dali até pagar.
  return !showPixCheckout.value
})

const upsellTimerFormatted = computed(() => {
  const mins = Math.floor(upsellTimer.value / 60)
  const secs = upsellTimer.value % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const upsellTimerExpired = computed(() => upsellTimer.value <= 0)

const upsellPlan = computed(() => {
  return plans.value.find(p => p.slug === 'pro')
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
    document: values.document || '',
    password: values.password || '',
  }
}

function nextStep() {
  if (step.value === 1) {
    saveFormData()
  }

  // Auto-apply coupon when moving to payment step if it was set via query
  if (step.value === 2 && couponCode.value && !appliedCoupon.value && !isFreeFlow.value) {
    applyCoupon()
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
        document: formData.value.document,
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
      document: formData.value.document,
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
function closePixCheckout() {
  showPixCheckout.value = false
  // Clear payment polling
  if (checkPaymentInterval.value) {
    clearInterval(checkPaymentInterval.value)
    checkPaymentInterval.value = null
  }
  // Clear PIX timer
  if (pixInterval.value) {
    clearInterval(pixInterval.value)
    pixInterval.value = null
  }
  // Reset PIX state
  pixCode.value = ''
  pixQrCodeUrl.value = ''
  checkoutUrl.value = ''
  pixTimeRemaining.value = 0
  pixExpiresAt.value = null
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
    // Clear interval FIRST to prevent repeated calls
    if (pixInterval.value) {
      clearInterval(pixInterval.value)
      pixInterval.value = null
    }
    // Only show toast if PIX checkout is still open
    if (showPixCheckout.value) {
      toaster.add({
        title: 'PIX expirado',
        description: 'Gere um novo código para continuar.',
        icon: 'ph:warning-circle-fill',
      })
    }
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

async function checkPaymentStatus() {
  if (isCheckingPayment.value) return
  isCheckingPayment.value = true

  try {
    const { data: sub } = await useCustomFetch<any>('/subscriptions/my-subscription')
    console.log('🔍 Status da assinatura:', sub?.status)

    if (sub?.status === 'ACTIVE') {
      if (checkPaymentInterval.value) clearInterval(checkPaymentInterval.value)

      toaster.add({
        title: 'Pagamento Confirmado!',
        description: 'Sua conta foi ativada com sucesso. Bem-vindo!',
        icon: 'ph:check-circle-fill',
      })

      // Buscar dados atualizados do usuário (importante para o onboardingStatus)
      await fetchUser()

      // Redirecionar após um breve delay para o usuário ver o sucesso
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }
  } catch (err) {
    console.error('Erro ao verificar status do pagamento:', err)
  } finally {
    isCheckingPayment.value = false
  }
}

function startPaymentPolling() {
  if (checkPaymentInterval.value) clearInterval(checkPaymentInterval.value)
  // Verificar a cada 7 segundos
  checkPaymentInterval.value = setInterval(checkPaymentStatus, 7000)
}

// Upsell timer functions
function startUpsellTimer() {
  if (upsellTimerStarted.value) return
  upsellTimerStarted.value = true
  upsellTimerInterval.value = setInterval(() => {
    if (upsellTimer.value > 0) {
      upsellTimer.value--
    } else {
      if (upsellTimerInterval.value) clearInterval(upsellTimerInterval.value)
    }
  }, 1000)
}

function acceptUpsell() {
  showUpsellModal.value = false
  selectedPlan.value = 'pro'
  paymentMethod.value = 'PIX'
  // Voltar para step 2 para o usuário ver o plano selecionado e seguir para pagamento
  step.value = 2
  toaster.add({
    title: 'Plano Profissional selecionado!',
    description: 'Continue para finalizar com bônus de +10 declarações.',
    icon: 'ph:rocket-launch-fill',
  })
}

function dismissUpsell() {
  showUpsellModal.value = false
  upsellDismissed.value = true
  // Continuar com o submit normal (plano grátis)
  doSubmit()
}

const onSubmit = (async () => {
  // Interceptar: se plano é free, não foi dispensado e timer não expirou → mostrar upsell
  if (selectedPlan.value === 'free' && !upsellDismissed.value && !upsellTimerExpired.value) {
    startUpsellTimer()
    showUpsellModal.value = true
    return
  }
  doSubmit()
})

const doSubmit = (async () => {
  isSubmitting.value = true

  try {


    const { data: response } = await useCustomFetch<any>('/auth/signup-with-plan', {
      method: 'POST',
      body: {
        name: formData.value.name,
        email: formData.value.email,
        password: formData.value.password,
        phone: formData.value.phone?.replace(/\D/g, '') || undefined,
        document: formData.value.document?.replace(/\D/g, '') || undefined,
        planSlug: selectedPlan.value,
        billingPeriod: billingCycle.value,
        paymentMethod: !isPaymentRequired.value ? 'FREE' : paymentMethod.value,
        couponCode: appliedCoupon.value?.code || couponCode.value,
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
        await fetchUser()

        console.log('✅ Dados do usuário carregados e salvos:', {
          id: userCookie.value?.id,
          name: userCookie.value?.name,
          email: userCookie.value?.email,
          onboardingStatus: userCookie.value?.onboardingStatus,
        })
      } catch (userError) {
        console.error('❌ Erro ao buscar dados do usuário:', userError)
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

    // Track registration success
    track('CompleteRegistration')

    // Fluxo gratuito ou cupom 100% - ir direto para dashboard
    if (!isPaymentRequired.value || !response.payment) {
      // For free plans, we can consider registration as the main conversion
      track('Purchase', {
        value: 0,
        currency: 'BRL',
        content_name: selectedPlan.value,
        content_type: 'product'
      })
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
      console.log('🔍 PIX Info recebido:', JSON.stringify(paymentInfo.pix))
      console.log('🔍 Checkout URL:', paymentInfo.checkoutUrl)
      pixCode.value = paymentInfo.pix.code || ''
      pixQrCodeUrl.value = paymentInfo.pix.qrCodeUrl || ''
      checkoutUrl.value = paymentInfo.checkoutUrl || ''
      showPixCheckout.value = true

      // Iniciar timer com tempo de expiração da API
      const expiresIn = paymentInfo.pix.expiresIn || 1800 // 30 minutos padrão
      pixTimeRemaining.value = expiresIn
      startPixTimer()

      toaster.add({
        title: 'PIX Gerado!',
        description: 'Código PIX gerado com sucesso. Complete o pagamento para entrar.',
        icon: 'ph:qr-code-duotone',
      })

      // Iniciar polling para detectar pagamento
      startPaymentPolling()

      track('InitiateCheckout', {
        value: finalPrice.value / 100,
        currency: 'BRL',
        content_name: selectedPlan.value,
        content_category: 'subscription'
      })
      return
    }

    // Pagamento via Stripe - redirecionar
    if (paymentInfo.method === 'CREDIT_CARD' && paymentInfo.checkoutUrl) {
      track('InitiateCheckout', {
        value: finalPrice.value / 100,
        currency: 'BRL',
        content_name: selectedPlan.value,
        content_category: 'subscription'
      })
      toaster.add({
        title: 'Redirecionando...',
        description: 'Você será redirecionado para a Stripe.',
        icon: 'ph:arrow-square-out-fill',
      })

      const redirectUrl = paymentInfo.checkoutUrl

      setTimeout(() => {
        isExitingPage.value = true
        window.location.href = redirectUrl
      }, 1500)
      return
    }

    // Fallback - algum erro na resposta ou pagamento pendente sem dados de PIX
    if (response.paymentPending) {
      toaster.add({
        title: 'Conta criada!',
        description: 'Aguardando confirmação do pagamento. Você será redirecionado assim que o sistema detectar o pagamento.',
        icon: 'ph:clock-clock-duotone',
      })
      showPixCheckout.value = true
      startPaymentPolling()
      return
    }

    toaster.add({
      title: 'Conta criada!',
      description: 'Verifique seu email para mais instruções.',
      icon: 'ph:check-circle-fill',
    })
    // Se não tem pagamento pendente, vai para login
    setTimeout(() => router.push('/auth'), 2000)
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
  if (step.value === 3 && isPaymentRequired.value && !isExitingPage.value && !isSubmitting.value) {
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

onMounted(async () => {
  fetchPlans()
  window.addEventListener('beforeunload', handleBeforeUnload)

  // Check for affiliate coupon in query
  if (route.query.r) {
    couponCode.value = route.query.r as string
  }

  // Se já estiver logado (ex: refresh na página de PIX), verificar status
  if (token.value) {
    try {
      const { data: sub } = await useCustomFetch<any>('/subscriptions/my-subscription')
      if (sub?.status === 'PENDING_PAYMENT') {
        const paymentInfo = sub.payment

        // Só mostra o checkout de PIX se o método for realmente PIX
        if (paymentInfo?.method === 'PIX' && paymentInfo.pix) {
          pixCode.value = paymentInfo.pix.code
          pixQrCodeUrl.value = paymentInfo.pix.qrCodeUrl
          checkoutUrl.value = sub.payment?.checkoutUrl || sub.payment?.paymentData?.checkout_url
          showPixCheckout.value = true
          startPaymentPolling()
        } else {
          // Se for Cartão/Stripe ou outro, o cadastro já foi feito (tem token).
          // Redireciona para o checkout seguro do dashboard para não ficar preso no Registro.
          toaster.add({
            title: 'Cadastro já realizado',
            description: 'Redirecionando para finalizar o pagamento de sua assinatura.',
            icon: 'ph:info-fill'
          })
          router.push('/dashboard/plans')
        }
      } else if (sub?.status === 'ACTIVE') {
        router.push('/dashboard')
      }
    } catch (e) {
      console.error('Erro ao verificar status inicial:', e)
    }
  }
})

onUnmounted(() => {
  if (pixInterval.value) clearInterval(pixInterval.value)
  if (checkPaymentInterval.value) clearInterval(checkPaymentInterval.value)
  if (upsellTimerInterval.value) clearInterval(upsellTimerInterval.value)
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
          <img src="assets/funil/free-trial-wh.png" alt="Gestor IRPF"
            class="dark:hidden mx-auto mb-2 max-w-sm rounded-[2.5rem]">
          <img src="assets/funil/free-trial.png" alt="Gestor IRPF"
            class="hidden dark:block mx-auto mb-2 max-w-sm rounded-[2.5rem]">
          <BaseHeading tag="h2" size="2xl" weight="bold" class="text-muted-800 dark:text-white mb-4">
            Comece sua jornada
          </BaseHeading>
          <BaseParagraph class="text-muted-500 dark:text-muted-400 max-w-sm mx-auto">
            Crie sua conta e tenha acesso a todas as ferramentas para gerenciar os IRs dos seus clientes.
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
                <Icon name="logos:pix" class="size-10" />
              </div>
              <BaseHeading tag="h1" size="xl" weight="bold" class="text-muted-800 dark:text-white mb-2">
                Pagamento via PIX
              </BaseHeading>
              <BaseParagraph class="text-muted-500 dark:text-muted-400">
                Escaneie o QR Code ou copie o código
              </BaseParagraph>
            </div>

            <BaseCard rounded="lg" class="p-6 text-center">
              <!-- QR Code + Copia e Cola (only when pixCode exists) -->
              <template v-if="pixCode">
                <img :src="`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${pixCode}`" alt="QR Code PIX"
                  class="mx-auto mb-4 rounded-lg border-4 border-muted-200 dark:border-muted-700 bg-white p-2"
                  width="200" height="200">

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

                <div v-if="checkoutUrl" class="mt-6 pt-6 border-t border-muted-200 dark:border-muted-700">
                  <BaseParagraph size="xs" class="text-muted-500 mb-3">
                    Ou se preferir, acesse o link de pagamento:
                  </BaseParagraph>
                  <BaseButton :to="checkoutUrl" target="_blank" variant="muted" color="primary" rounded="lg"
                    class="w-full h-10">
                    <Icon name="ph:link-bold" class="size-4 mr-2" />
                    Abrir Link de Pagamento
                  </BaseButton>
                </div>
              </template>

              <!-- Fallback: Only checkout URL available (no brCode) -->
              <template v-else-if="checkoutUrl">
                <div class="py-4">
                  <div
                    class="inline-flex items-center justify-center size-16 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
                    <Icon name="ph:link-bold" class="size-8 text-primary-500" />
                  </div>
                  <BaseHeading tag="h3" size="md" weight="semibold" class="text-muted-800 dark:text-white mb-2">
                    Link de Pagamento
                  </BaseHeading>
                  <BaseParagraph size="sm" class="text-muted-500 mb-6">
                    Clique no botão abaixo para completar o pagamento via PIX
                  </BaseParagraph>
                  <BaseButton :to="checkoutUrl" target="_blank" variant="primary" rounded="lg" class="w-full h-12">
                    <Icon name="logos:pix" class="size-5 mr-2" />
                    Pagar com PIX
                  </BaseButton>
                </div>
              </template>

              <!-- No PIX data at all -->
              <template v-else>
                <div class="py-4">
                  <BaseParagraph size="sm" class="text-muted-500">
                    Erro ao gerar o código PIX. Tente novamente ou escolha outra forma de pagamento.
                  </BaseParagraph>
                </div>
              </template>
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

            <div class="flex flex-col gap-3">
              <BaseButton variant="primary" rounded="lg" class="w-full h-12" :loading="isCheckingPayment"
                @click="checkPaymentStatus">
                <Icon name="ph:arrows-clockwise-fill" class="size-5 mr-2" />
                Já paguei, verificar agora
              </BaseButton>

              <BaseButton variant="muted" rounded="lg" class="w-full h-12" @click="closePixCheckout">
                Voltar e alterar forma de pagamento
              </BaseButton>
            </div>
          </div>

          <!-- Formulário Normal -->
          <template v-else>
            <!-- Steps Indicator -->
            <div class="mb-4 sm:mb-6">
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
                  <BaseField label="Email" :state="(errorMessage || availabilityErrors.email) ? 'error' : 'idle'"
                    :error="errorMessage || availabilityErrors.email" required>
                    <div class="relative">
                      <BaseInput :model-value="field.value" type="email" placeholder="seu@email.com" rounded="lg"
                        :classes="{ input: 'h-12' }" @update:model-value="handleChange"
                        @blur="(e: any) => { handleBlur(e); checkAvailability('email', field.value) }" />
                      <div v-if="isCheckingAvailability.email"
                        class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                        <Icon name="svg-spinners:180-ring" class="size-4 text-primary-500" />
                      </div>
                    </div>
                  </BaseField>
                </Field>

                <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="phone">
                  <BaseField label="Telefone" :state="errorMessage ? 'error' : 'idle'" :error="errorMessage" required>
                    <BaseInput v-maska="'(##) #####-####'" :model-value="field.value" type="tel"
                      placeholder="(00) 00000-0000" rounded="lg" :classes="{ input: 'h-12' }"
                      @update:model-value="handleChange" @blur="handleBlur" />
                  </BaseField>
                </Field>

                <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="document">
                  <BaseField label="CPF" :state="(errorMessage || availabilityErrors.document) ? 'error' : 'idle'"
                    :error="errorMessage || availabilityErrors.document" required>
                    <div class="relative">
                      <BaseInput v-maska="'###.###.###-##'" :model-value="field.value" type="text"
                        placeholder="000.000.000-00" rounded="lg" :classes="{ input: 'h-12' }"
                        @update:model-value="handleChange"
                        @blur="(e: any) => { handleBlur(e); checkAvailability('document', field.value) }" />
                      <div v-if="isCheckingAvailability.document"
                        class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                        <Icon name="svg-spinners:180-ring" class="size-4 text-primary-500" />
                      </div>
                    </div>
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
                <div class="mt-4">
                  <Field v-slot="{ field, errorMessage, handleChange }" name="acceptedTerms">
                    <div class="flex flex-col">
                      <div class="flex items-start gap-3">
                        <BaseCheckbox
                          :model-value="field.value"
                          color="primary"
                          dense
                          @update:model-value="handleChange"
                        />
                        <div class="text-xs leading-tight text-muted-500">
                          Li e concordo com os
                          <button
                            type="button"
                            class="text-primary-500 underline hover:text-primary-600"
                            @click="openTerms('terms')"
                          >
                            Termos de Uso
                          </button>
                          e a
                          <button
                            type="button"
                            class="text-primary-500 underline hover:text-primary-600"
                            @click="openTerms('lgpd')"
                          >
                            Política de Privacidade (LGPD)
                          </button>
                        </div>
                      </div>
                      <BaseText v-if="errorMessage" color="danger" size="xs" class="mt-1">
                        {{ errorMessage }}
                      </BaseText>
                    </div>
                  </Field>
                </div>

                <BaseButton type="button" variant="primary" rounded="lg" class="h-12! w-full mt-4"
                  :disabled="!values.name || !values.email || !values.password || !values.confirmPassword || !values.acceptedTerms || availabilityErrors.email !== '' || availabilityErrors.document !== ''"
                  @click="nextStep">
                  Continuar
                </BaseButton>
              </form>
            </div>

            <!-- Step 2: Escolha do Plano -->
            <div v-else-if="step === 2">
              <BaseHeading tag="h1" size="xl" weight="bold"
                class="text-muted-800 dark:text-white mb-2 sm:mb-2 text-lg sm:text-xl">
                Escolha seu plano
              </BaseHeading>
              <BaseParagraph class="text-muted-500 dark:text-muted-400 mb-4 sm:mb-4 text-xs sm:text-sm">
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
                        <div class="flex items-start gap-3 sm:gap-4">
                          <img :src="getPlanIcon(plan.slug)" class="size-10 sm:size-12 object-contain shrink-0 mt-0.5"
                            :alt="plan.name">

                          <div class="flex-1 min-w-0 pr-6 sm:pr-0 text-left">
                            <div class="flex items-center justify-between sm:block text-left">
                              <!-- Título -->
                              <BaseText weight="semibold"
                                class="text-muted-800 dark:text-white block text-sm sm:text-base">
                                {{ plan.name }}
                              </BaseText>

                              <!-- Preço Mobile -->
                              <div class="flex sm:hidden items-baseline gap-1 text-left">
                                <BaseText weight="bold" class="text-primary-500 text-sm text-left">
                                  {{ plan.pricing.monthly === 0 ? 'R$ 0,00' : formatCurrency(plan.pricing.monthly) }}
                                </BaseText>
                                <BaseText v-if="plan.pricing.monthly > 0" size="xs" class="text-muted-400 text-left">
                                  /mês
                                </BaseText>
                              </div>
                            </div>

                            <!-- Descrição -->
                            <BaseText size="xs"
                              class="text-muted-500 block mt-1 leading-tight text-[11px] sm:text-xs text-left">
                              {{ plan.description }}
                            </BaseText>

                            <!-- Micro Detalhes Mobile -->
                            <div v-if="plan.limits"
                              class="flex sm:hidden items-center justify-start gap-x-3 gap-y-1 mt-1.5 grayscale opacity-70 flex-wrap">
                              <div class="flex items-center gap-1 text-[10px] text-muted-500 text-left">
                                <Icon name="solar:users-group-rounded-linear" class="size-3 text-primary-500" />
                                <span class="whitespace-nowrap">{{ plan.limits.employees || 1 }} usuário(s)</span>
                              </div>

                              <div v-if="plan.slug === 'enterprise' || plan.slug === 'pro'"
                                class="flex items-center gap-1 text-[10px] text-muted-500 text-left">
                                <Icon name="solar:verified-check-linear" class="size-3 text-primary-500" />
                                <span class="whitespace-nowrap">Whitelabel incluso</span>
                              </div>
                            </div>
                          </div>

                          <!-- Preço Desktop (direita) -->
                          <div class="hidden sm:block text-right shrink-0">
                            <BaseText weight="bold" class="text-primary-500">
                              {{ plan.pricing.monthly === 0 ? 'R$ 0,00' : formatCurrency(plan.pricing.monthly) }}
                            </BaseText>
                            <BaseText v-if="plan.pricing.monthly > 0" size="xs" class="text-muted-400">
                              /mês
                            </BaseText>
                          </div>
                        </div>

                        <!-- Features do plano (Oculto no Mobile) -->
                        <div v-if="plan.limits"
                          class="hidden sm:grid mt-3 pt-3 border-t border-muted-100 dark:border-muted-800 grid-cols-2 gap-2">
                          <div class="flex items-center gap-1.5 text-xs text-muted-500">
                            <Icon name="solar:users-group-rounded-linear" class="size-3.5 text-primary-500 shrink-0" />
                            <span>{{ plan.limits.employees || 1 }} usuário(s)</span>
                          </div>
                          <div v-if="plan.slug === 'enterprise' || plan.slug === 'pro'"
                            class="flex items-center gap-1.5 text-xs text-muted-500">
                            <Icon name="solar:verified-check-linear" class="size-3.5 text-primary-500 shrink-0" />
                            <span>White Label incluso</span>
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
                  <div v-if="formData.document" class="flex justify-between">
                    <BaseText size="sm" class="text-muted-500">CPF</BaseText>
                    <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-white">{{ formData.document }}
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
                    <BaseText size="xs" class="text-muted-500 mt-0.5">
                      {{
                        billingCycle === 'MONTHLY' ? 'Mensal' :
                          billingCycle === 'QUARTERLY' ? 'Trimestral' :
                            billingCycle === 'SEMIANNUAL' ? 'Semestral' : 'Anual'
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
                <BaseRadioGroup v-model="billingCycle" class="grid grid-cols-2 gap-3">
                  <TairoRadioCard value="MONTHLY" class="p-4 data-[state=checked]:ring-primary-500!">
                    <div class="flex justify-between items-start">
                      <BaseText weight="semibold" class="text-muted-800 dark:text-white mr-1">Mensal</BaseText>
                    </div>
                    <BaseText weight="bold" class="text-primary-500 text-xs">{{ formatCurrency(monthlyPrice) }}
                    </BaseText>
                  </TairoRadioCard>

                  <TairoRadioCard value="ANNUAL"
                    class="p-4 data-[state=checked]:ring-primary-500! relative overflow-hidden">
                    <div
                      class="absolute -right-8 top-2 rotate-45 bg-success-500 px-10 py-0.5 text-[9px] font-bold text-white">
                      ECONOMIA
                    </div>
                    <div class="flex justify-between items-start">
                      <BaseText weight="semibold" class="text-muted-800 dark:text-white mr-1">Anual</BaseText>
                    </div>
                    <BaseText weight="bold" class="text-primary-500 text-xs">{{ formatCurrency(annualPrice) }}
                    </BaseText>
                    <BaseText size="xs" class="text-muted-400 line-through text-[10px]">{{ formatCurrency(monthlyPrice *
                      12) }}
                    </BaseText>
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
              <BaseCard v-if="isPaymentRequired" rounded="lg" class="p-4 mb-4">
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
                      <img src="https://img.icons8.com/color/512/pix.png" class="h-6 object-contain" alt="PIX">
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
                        <img src="https://cdn-icons-png.flaticon.com/512/2695/2695969.png" class="h-6 object-contain"
                          alt="PIX">
                      </div>
                      <div class="flex-1">
                        <BaseText weight="semibold" class="text-muted-800 dark:text-white block">Cartão
                        </BaseText>
                        <!-- <BaseText size="xs" class="text-muted-500 mt-0.5">Pagamento Seguro via Stripe</BaseText> -->
                      </div>
                      <BaseText weight="bold" class="text-muted-800 dark:text-white">{{ formatCurrency(cardPrice) }}
                      </BaseText>
                    </div>
                  </TairoRadioCard>
                </BaseRadioGroup>

                <!-- Info Pagamento -->
                <div v-if="paymentMethod === 'CREDIT_CARD'"
                  class="mt-3 p-3 rounded-lg bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800">
                  <div class="flex items-start gap-2">
                    <Icon name="ph:info-fill" class="size-4 text-info-500 shrink-0 mt-0.5" />
                    <BaseText size="xs" class="text-info-600 dark:text-info-400">
                      Ao continuar, você poderá pagar com seu cartão de crédito através do checkout seguro da Stripe.
                    </BaseText>
                  </div>
                </div>
              </BaseCard>

              <!-- Resumo Final -->
              <BaseCard v-if="!isFreeFlow" rounded="lg" class="p-4 mb-4"
                :class="finalPrice === 0 ? 'bg-success-50 dark:bg-success-900/10 border-success-200 dark:border-success-800' : 'bg-muted-50 dark:bg-muted-900'">
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
                  <Icon v-if="!isPaymentRequired" name="ph:check-circle-fill" class="size-5 mr-2" />
                  <Icon v-else-if="paymentMethod === 'PIX'" name="ph:qr-code-fill" class="size-5 mr-2" />
                  <Icon v-else name="ph:arrow-square-out-fill" class="size-5 mr-2" />
                  <template v-if="!isPaymentRequired">
                    {{ selectedPlan === 'free' ? 'Criar Conta Grátis' : 'Ativar Plano Agora' }}
                  </template>
                  <template v-else>
                    {{ paymentMethod === 'PIX' ? 'Gerar PIX' : 'Pagar Agora' }}
                  </template>
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

    <!-- Modal de Upsell -->
    <DialogRoot v-model:open="showUpsellModal">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-muted-900/50 backdrop-blur-sm" />
        <DialogContent
          class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-xl dark:bg-muted-900 border border-muted-200 dark:border-muted-800">

          <DialogTitle as="h3" class="text-lg font-semibold text-muted-800 dark:text-muted-100 mb-2">
            Antes de continuar...
          </DialogTitle>
          <DialogDescription class="text-sm text-muted-500 dark:text-muted-400 mb-4">
            Assinando o <strong class="text-muted-700 dark:text-muted-200">{{ upsellPlan?.name || 'Profissional'
            }}</strong>
            agora você ganha:
          </DialogDescription>

          <!-- Vantagens -->
          <div class="space-y-2.5 mb-4">
            <div class="flex items-center gap-2.5">
              <Icon name="ph:file-text-fill" class="size-4 text-primary-500 shrink-0" />
              <BaseText size="sm" class="text-muted-700 dark:text-muted-200">+10 declarações de IR de bônus</BaseText>
            </div>
            <div class="flex items-center gap-2.5">
              <Icon name="ph:paint-brush-fill" class="size-4 text-primary-500 shrink-0" />
              <BaseText size="sm" class="text-muted-700 dark:text-muted-200">App com a sua marca (White Label)
              </BaseText>
            </div>
            <div class="flex items-center gap-2.5">
              <Icon name="ph:users-three-fill" class="size-4 text-primary-500 shrink-0" />
              <BaseText size="sm" class="text-muted-700 dark:text-muted-200">Até 3 pessoas na equipe</BaseText>
            </div>
          </div>

          <!-- Timer + preço na mesma linha -->
          <div class="flex items-center justify-between mb-4 text-xs text-muted-400">
            <div v-if="!upsellTimerExpired" class="flex items-center gap-1">
              <Icon name="ph:clock-fill" class="size-3.5" />
              <span>Expira em {{ upsellTimerFormatted }}</span>
            </div>
            <span v-else />
            <span class="text-sm font-semibold text-primary-500">{{ upsellPlan ?
              formatCurrency(upsellPlan.pricing.monthly)
              : 'R$ 49,90' }}/mês</span>
          </div>

          <!-- Botões -->
          <div class="space-y-2">
            <BaseButton variant="primary" rounded="lg" class="w-full h-11" @click="acceptUpsell">
              Assinar o {{ upsellPlan?.name || 'Profissional' }}
            </BaseButton>
            <button type="button"
              class="w-full text-center text-xs text-muted-400 hover:text-muted-500 py-2 transition-colors"
              @click="dismissUpsell">
              Continuar com o grátis
            </button>
          </div>

          <DialogClose
            class="absolute right-3 top-3 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none">
            <Icon name="lucide:x" class="h-4 w-4 text-muted-400" />
            <span class="sr-only">Close</span>
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <TermsModal
      v-model:open="showTermsModal"
      :type="termsModalType"
    />
  </div>
</template>
