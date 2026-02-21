import { useApi } from './useAuth'

export interface PlanPricing {
  monthly: number
  quarterly: number
  semiannual: number
  annual: number
}

export interface PlanLimits {
  storage_mb: number
  sms_monthly: number
  whatsapp_monthly: number
  employees: number
  ir_bonus_credits: number
  hasWhitelabel: boolean
  hasReports: boolean
  hasApi: boolean
  hasTeamManagement: boolean
}

export interface Plan {
  id: string
  name: string
  slug: string
  description: string
  pricing: PlanPricing
  limits: PlanLimits
  features: string[]
  allowTrial: boolean
  trialDays: number
}

export interface Subscription {
  id: string
  tenantId: string
  planId: string
  plan: Plan
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'PENDING_PAYMENT'
  billingPeriod: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'
  currentPeriodStart: string
  currentPeriodEnd: string
  trialStart?: string
  trialEnd?: string
  cancelAtPeriodEnd: boolean
  canceledAt?: string

  // Campos de limites
  employeesLimit: number
  smsMonthlyLimit: number
  emailsMonthlyLimit: number
  storageMbLimit: number
  whatsappMonthlyLimit: number
  hasWhitelabel: boolean
  hasReports: boolean
  hasApi: boolean
  hasTeamManagement: boolean

  storageUsedMb: number
  monthlyUsage: any
  yearlyUsage: any

  // Créditos pré-pagos
  smsPrepaidCredits: number
  emailPrepaidCredits: number

  // Créditos de IR
  irPrepaidCredits: number
  irTotalPurchased: number
}

const plans = ref<Plan[]>([])
const currentSubscription = ref<Subscription | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

export function useSubscription() {
  const { useCustomFetch } = useApi()

  const fetchPlans = async () => {
    loading.value = true
    error.value = null
    try {
      const { data } = await useCustomFetch<any>('/subscriptions/plans')
      if (Array.isArray(data)) {
        plans.value = data
      }
      else if (data && Array.isArray(data.data)) {
        plans.value = data.data
      }
      else {
        plans.value = []
        console.error('Formato de resposta de planos inválido:', data)
      }
    }
    catch (err: any) {
      error.value = err.message || 'Erro ao carregar planos'
    }
    finally {
      loading.value = false
    }
  }

  const fetchMySubscription = async () => {
    loading.value = true
    error.value = null
    console.log('[Subscription] Iniciando busca da assinatura...')
    try {
      const response = await useCustomFetch<any>('/subscriptions/my-subscription')
      // Handle both { data: { ... } } and { ... }
      const subData = response.data?.data || response.data || response

      console.log('[Subscription] Dados recebidos:', subData)

      if (subData && typeof subData === 'object' && ('id' in subData || 'storageMbLimit' in subData)) {
        currentSubscription.value = subData
        console.log('[Subscription] Assinatura ativa:', subData.id)
      } else {
        console.warn('[Subscription] Nenhum dado de assinatura válido encontrado')
        currentSubscription.value = null
      }
    }
    catch (err: any) {
      console.error('[Subscription] Erro ao buscar assinatura:', err)
      error.value = err.message || 'Erro ao carregar sua assinatura'
      currentSubscription.value = null
    }
    finally {
      loading.value = false
    }
  }

  const startTrial = async (planSlug: string) => {
    loading.value = true
    error.value = null
    try {
      const { data } = await useCustomFetch<Subscription>('/subscriptions/start-trial', {
        method: 'POST',
        body: { planSlug },
      })
      currentSubscription.value = data
      return { success: true, data }
    }
    catch (err: any) {
      error.value = err.message || 'Erro ao iniciar período de teste'
      return { success: false, error: error.value }
    }
    finally {
      loading.value = false
    }
  }

  const subscribe = async (params: {
    planSlug: string
    billingPeriod: string
    paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'STRIPE'
    customLimits?: any
    customPrice?: number
  }) => {
    loading.value = true
    error.value = null
    try {
      const { data } = await useCustomFetch<any>('/subscriptions/subscribe', {
        method: 'POST',
        body: params,
      })
      return { success: true, data }
    }
    catch (err: any) {
      error.value = err.data?.message || err.message || 'Erro ao processar assinatura'
      return { success: false, error: error.value }
    }
    finally {
      loading.value = false
    }
  }
  const selectFreePlan = async () => {
    loading.value = true
    error.value = null
    try {
      const { data } = await useCustomFetch<any>('/subscriptions/select-free-plan', {
        method: 'POST',
      })
      return { success: true, data }
    }
    catch (err: any) {
      error.value = err.message || 'Erro ao selecionar plano gratuito'
      return { success: false, error: error.value }
    }
    finally {
      loading.value = false
    }
  }

  const getPaymentStatus = async (paymentId: string) => {
    try {
      const { data } = await useCustomFetch<any>(`/payments/${paymentId}/status`)
      return { success: true, status: data.status }
    }
    catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const getPrepaidBalance = async () => {
    try {
      const { data } = await useCustomFetch<any>('/subscriptions/prepaid/balance')
      return { success: true, data }
    }
    catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const getPaymentHistory = async () => {
    try {
      const { data } = await useCustomFetch<any>('/payments/history')
      return { success: true, data }
    }
    catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const purchaseCredits = async (amount: number, paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'STRIPE') => {
    loading.value = true
    error.value = null
    try {
      const { data } = await useCustomFetch<any>('/subscriptions/prepaid/purchase', {
        method: 'POST',
        body: { amount, paymentMethod },
      })
      return { success: true, data }
    }
    catch (err: any) {
      error.value = err.message || 'Erro ao comprar créditos'
      return { success: false, error: error.value }
    }
    finally {
      loading.value = false
    }
  }

  const getIrPricing = async () => {
    try {
      const { data } = await useCustomFetch<any>('/credits/ir/pricing')
      return { success: true, data }
    }
    catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const purchaseIrCredits = async (quantity: number, paymentMethod: 'PIX' | 'CREDIT_CARD' = 'PIX') => {
    loading.value = true
    error.value = null
    try {
      const { data } = await useCustomFetch<any>('/credits/ir/purchase', {
        method: 'POST',
        body: { quantity, paymentMethod },
      })
      return { success: true, data }
    }
    catch (err: any) {
      error.value = err.data?.message || err.message || 'Erro ao comprar créditos de IR'
      return { success: false, error: error.value }
    }
    finally {
      loading.value = false
    }
  }

  const validateCoupon = async (code: string, amount?: number) => {
    loading.value = true
    error.value = null
    try {
      const query = amount ? `?code=${code}&amount=${amount}` : `?code=${code}`
      const { data } = await useCustomFetch<any>(`/subscriptions/coupons/validate${query}`)
      return { success: true, data }
    }
    catch (err: any) {
      if (err.statusCode === 404 || err.status === 404 || err.message?.includes('404')) {
        error.value = 'Cupom não encontrado ou inválido'
      }
      else {
        error.value = err.data?.message || err.message || 'Erro ao validar cupom'
      }
      return { success: false, error: error.value }
    }
    finally {
      loading.value = false
    }
  }

  return {
    plans,
    currentSubscription,
    loading,
    error,
    fetchPlans,
    fetchMySubscription,
    startTrial,
    subscribe,
    selectFreePlan,
    getPaymentStatus,
    getPrepaidBalance,
    getPaymentHistory,
    purchaseCredits,
    getIrPricing,
    purchaseIrCredits,
    validateCoupon,
  }
}
