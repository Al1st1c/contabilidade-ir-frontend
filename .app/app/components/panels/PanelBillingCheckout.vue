<script setup lang="ts">
import { useSubscription } from '~/composables/useSubscription'
import { useAuth } from '~/composables/useAuth'

const props = defineProps<{
  onClose?: () => void
}>()

const { close } = usePanels()
const { fetchMySubscription, currentSubscription, getPaymentHistory, getPaymentStatus, subscribe, loading } = useSubscription()
const { fetchUser } = useAuth()
const toaster = useNuiToasts()

const payments = ref<any[]>([])
const isLoadingPayments = ref(false)
const isGeneratingPayment = ref(false)
const selectedPayment = ref<any>(null)
const isCheckingStatus = ref(false)

async function generatePayment(method: 'PIX' | 'CREDIT_CARD' | 'BOLETO') {
  if (!currentSubscription.value || isGeneratingPayment.value) return

  isGeneratingPayment.value = true
  isLoadingPayments.value = true

  try {
    const params: any = {
      planSlug: currentSubscription.value.plan.slug,
      billingPeriod: currentSubscription.value.billingPeriod,
      paymentMethod: method,
    }

    const res = await subscribe(params)
    if (res.success) {
      await loadData()

      if (method === 'CREDIT_CARD' && res.data?.paymentData?.checkoutUrl) {
        window.open(res.data.paymentData.checkoutUrl, '_blank')
      }
    } else {
      toaster.add({
        title: 'Erro ao gerar pagamento',
        description: res.error || 'Ocorreu um erro inesperado',
        icon: 'ph:warning-circle-fill'
      })
    }
  } catch (err) {
    console.error('Erro ao gerar pagamento:', err)
  } finally {
    isGeneratingPayment.value = false
    isLoadingPayments.value = false
  }
}

// PIX Timer
const pixTimeRemaining = ref(900) // 15 min default
let timerInterval: any = null

function startTimer() {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (pixTimeRemaining.value > 0) {
      pixTimeRemaining.value--
    }
  }, 1000)
}

function formatPixTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

async function loadData() {
  isLoadingPayments.value = true
  await fetchMySubscription()
  const res = await getPaymentHistory()
  if (res.success) {
    payments.value = res.data

    // Filtra e seleciona a cobrança pendente mais recente
    const pending = pendingPayments.value
    if (pending.length === 1) {
      selectedPayment.value = pending[0]
      startTimer()
    }
  }
  isLoadingPayments.value = false
}

async function checkPaymentStatus() {
  if (!selectedPayment.value || isCheckingStatus.value) return

  isCheckingStatus.value = true
  try {
    const res = await getPaymentStatus(selectedPayment.value.id)
    if (res.success && res.status === 'PAID') {
      toaster.add({
        title: 'Pagamento Confirmado',
        description: 'Seu acesso foi liberado com sucesso!',
        icon: 'ph:check-circle-fill',
      })
      await fetchUser()
      await fetchMySubscription()
      close()
    } else {
      toaster.add({
        title: 'Ainda pendente',
        description: 'Não detectamos o pagamento ainda. Pix demora alguns segundos.',
        icon: 'ph:clock-fill',
      })
    }
  } catch (e) {
    console.error('Erro ao checar pagamento:', e)
  } finally {
    isCheckingStatus.value = false
  }
}

function copyPixCode() {
  const code = pixCode.value
  if (!code) return

  navigator.clipboard.writeText(code)
  toaster.add({
    title: 'Copiado!',
    description: 'Código PIX copiado com sucesso.',
    icon: 'ph:copy-fill'
  })
}

onMounted(() => {
  loadData()
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

const pendingPayments = computed(() => payments.value.filter(p => p.status === 'PENDING'))

function selectPayment(payment: any) {
  selectedPayment.value = payment
  pixTimeRemaining.value = 900
  startTimer()
}

// PIX Computeds
const pixCode = computed(() =>
  selectedPayment.value?.paymentData?.qr_code ||
  selectedPayment.value?.paymentData?.brCode ||
  selectedPayment.value?.paymentData?.pix?.code
)

const pixQrCode = computed(() => {
  const code = selectedPayment.value?.paymentData?.qr_code ||
    selectedPayment.value?.paymentData?.brCode ||
    selectedPayment.value?.paymentData?.pix?.code

  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(code)}`
})

const pixQrCodeUrl = computed(() => {
  const url = selectedPayment.value?.paymentData?.qr_code_url ||
    selectedPayment.value?.paymentData?.qrCodeImage ||
    selectedPayment.value?.paymentData?.qrCode ||
    selectedPayment.value?.paymentData?.pix?.qrCodeUrl

  if (url) return url

  // Fallback para gerador de QR Code se tivermos o código mas não a URL da imagem
  const code = pixCode.value
  if (code) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(code)}`
  }

  return null
})

const checkoutUrl = computed(() =>
  selectedPayment.value?.paymentData?.checkoutUrl ||
  selectedPayment.value?.paymentData?.checkout_url ||
  selectedPayment.value?.paymentData?.paymentLinkUrl
)

const totalAmount = computed(() => {
  if (selectedPayment.value) return selectedPayment.value.amount

  if (currentSubscription.value?.plan?.pricing) {
    const period = currentSubscription.value.billingPeriod?.toLowerCase() || 'monthly'
    const pricing = currentSubscription.value.plan.pricing as any
    return pricing[period] || pricing['monthly'] || 0
  }

  return 0
})

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount / 100)
}
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-800 dark:bg-muted-950 border-l bg-white w-full max-w-lg shadow-2xl flex flex-col h-screen overflow-hidden">

    <!-- Loading Overlay interno -->
    <div v-if="isLoadingPayments"
      class="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white/90 dark:bg-muted-950/90 backdrop-blur-sm">
      <AppPageLoading :message="isGeneratingPayment ? 'Processando...' : 'Aguarde...'" />
    </div>

    <!-- Header Compacto -->
    <div
      class="flex h-14 shrink-0 w-full items-center justify-between px-6 bg-white dark:bg-muted-900 border-b border-muted-200 dark:border-muted-800">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center size-8 rounded-lg bg-primary-500/10 text-primary-500">
          <Icon name="ph:shield-check-duotone" class="size-4" />
        </div>
        <BaseHeading as="h3" size="md" weight="semibold" class="text-muted-800 dark:text-white">
          Checkout Seguro
        </BaseHeading>
      </div>
      <BaseButtonClose :on-close="onClose || close" class="hover:bg-muted-100 dark:hover:bg-muted-800" />
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-6 py-6">
      <div v-if="payments.length || !isLoadingPayments" class="max-w-md mx-auto space-y-5">

        <!-- Card Resumo Horizontal Compacto -->
        <div v-if="selectedPayment || currentSubscription"
          class="rounded-2xl bg-muted-50 dark:bg-muted-900 border border-muted-200 dark:border-muted-800 p-4">
          <div class="flex items-center justify-between gap-4">
            <div class="flex-1 min-w-0">
              <p class="text-[9px] font-semibold uppercase tracking-wider text-muted-400 mb-0.5">Assinatura</p>
              <p class="font-semibold text-sm text-muted-800 dark:text-white truncate">
                {{ currentSubscription?.plan?.name || selectedPayment?.description || 'Plano Profissional' }}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <p class="text-[9px] uppercase tracking-wider text-muted-400 mb-0.5">Total</p>
                <p class="text-xl font-bold text-muted-900 dark:text-white leading-none">
                  {{ formatCurrency(totalAmount) }}
                </p>
              </div>
              <div
                class="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-bold uppercase tracking-wide">
                Pendente
              </div>
            </div>
          </div>
        </div>

        <!-- Lista de Pendências Compacta -->
        <div v-if="pendingPayments.length > 1 && !selectedPayment" class="space-y-3">
          <h4 class="text-[9px] font-semibold uppercase tracking-wider text-muted-500">
            Faturas em Aberto
          </h4>
          <div class="space-y-2">
            <button v-for="p in pendingPayments" :key="p.id" @click="selectPayment(p)"
              class="w-full flex items-center justify-between p-3.5 rounded-xl border border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-900 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-colors">
              <div class="flex items-center gap-3 text-left min-w-0">
                <div class="size-8 rounded-lg bg-muted-100 dark:bg-muted-800 flex items-center justify-center shrink-0">
                  <Icon name="ph:receipt-fill" class="size-4 text-muted-400" />
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-xs text-muted-800 dark:text-white truncate">{{ p.description ||
                    'Renovação' }}</p>
                  <p class="text-[10px] text-muted-500">{{ new Date(p.createdAt).toLocaleDateString('pt-BR') }}</p>
                </div>
              </div>
              <span class="font-bold text-sm text-muted-900 dark:text-white shrink-0">{{ formatCurrency(p.amount)
                }}</span>
            </button>
          </div>
        </div>

        <!-- Checkout Direto (Caso não haja pagamento mas a assinatura esteja pendente) -->
        <div v-if="!selectedPayment && !pendingPayments.length && currentSubscription?.status === 'PENDING_PAYMENT'"
          class="space-y-6 pt-2">
          <div class="text-center bg-primary-500/5 border border-primary-500/10 rounded-2xl p-6">
            <div class="size-14 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="ph:wallet-fill" class="size-7 text-primary-500" />
            </div>
            <h4 class="text-base font-bold text-muted-800 dark:text-white mb-1">Finalizar Pagamento</h4>
            <p class="text-xs text-muted-500 leading-relaxed max-w-[240px] mx-auto">Sua assinatura está aguardando o
              pagamento. Escolha um método para liberar seu acesso.</p>
          </div>

          <div class="grid gap-3">
            <button @click="generatePayment('PIX')"
              class="flex items-center gap-4 p-4 rounded-xl border border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-900 hover:border-emerald-500/50 hover:bg-emerald-50/5 dark:hover:bg-emerald-500/5 transition-all text-left group">
              <div
                class="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Icon name="ph:qr-code-bold" class="size-6 text-emerald-600" />
              </div>
              <div class="flex-1">
                <p class="font-bold text-sm text-muted-800 dark:text-white leading-tight">Pagamento via Pix</p>
                <p class="text-[10px] text-muted-500 mt-0.5">Liberação imediata com 5% de desconto</p>
              </div>
              <Icon name="ph:caret-right-bold"
                class="size-4 text-muted-300 group-hover:text-emerald-500 transition-colors" />
            </button>

            <button @click="generatePayment('CREDIT_CARD')"
              class="flex items-center gap-4 p-4 rounded-xl border border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-900 hover:border-indigo-500/50 hover:bg-indigo-50/5 dark:hover:bg-indigo-500/5 transition-all text-left group">
              <div
                class="size-10 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <Icon name="ph:credit-card-bold" class="size-6 text-indigo-600" />
              </div>
              <div class="flex-1">
                <p class="font-bold text-sm text-muted-800 dark:text-white leading-tight">Cartão de Crédito</p>
                <p class="text-[10px] text-muted-500 mt-0.5">Parcele sua assinatura com segurança</p>
              </div>
              <Icon name="ph:caret-right-bold"
                class="size-4 text-muted-300 group-hover:text-indigo-500 transition-colors" />
            </button>
          </div>
        </div>

        <!-- Checkout Multi-Método -->
        <div v-if="selectedPayment" class="space-y-4">

          <!-- Caso PIX -->
          <div v-if="selectedPayment.paymentMethod === 'PIX' || selectedPayment.method === 'PIX'" class="space-y-4">
            <!-- QR Code e Timer em Grid -->
            <div class="grid grid-cols-[auto_1fr] gap-4 items-start">
              <!-- QR Code -->
              <div class="bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-800 rounded-xl p-3">
                <img :src="pixQrCodeUrl" alt="QR Code PIX" class="w-32 h-32">
              </div>

              <!-- Info lado direito -->
              <div class="space-y-3 pt-1">
                <div>
                  <h5 class="text-sm font-bold text-muted-900 dark:text-white mb-1">Pagamento via Pix</h5>
                  <p class="text-[11px] text-muted-500 leading-relaxed">Aponte a câmera do seu banco para o QR Code ao
                    lado</p>
                </div>

                <!-- Timer -->
                <div
                  class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40">
                  <Icon name="ph:clock-fill" class="size-3.5 text-amber-600 dark:text-amber-500" />
                  <span class="text-[10px] font-bold text-amber-700 dark:text-amber-400">{{
                    formatPixTime(pixTimeRemaining) }}</span>
                </div>

                <!-- Link externo -->
                <a v-if="checkoutUrl" :href="checkoutUrl" target="_blank"
                  class="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                  <Icon name="ph:arrow-square-out" class="size-3.5" />
                  Abrir no navegador
                </a>
              </div>
            </div>

            <!-- Código PIX Copia e Cola -->
            <div class="space-y-2">
              <label class="text-[9px] font-semibold uppercase tracking-wider text-muted-500">Código Pix</label>
              <div
                class="flex items-center gap-2 border border-muted-200 dark:border-muted-800 rounded-lg bg-white dark:bg-muted-950 p-1">
                <input type="text" :value="pixCode" readonly
                  class="flex-1 bg-transparent px-3 py-2 text-[11px] font-mono text-muted-600 dark:text-muted-400 focus:outline-none truncate" />
                <BaseButton variant="primary" rounded="lg" size="sm" class="px-4 font-semibold" @click="copyPixCode">
                  Copiar
                </BaseButton>
              </div>
            </div>

            <div class="space-y-2.5 pt-1">
              <BaseButton variant="primary" rounded="lg" size="lg"
                class="w-full h-12 font-semibold shadow-lg shadow-primary-500/20" :loading="isCheckingStatus"
                @click="checkPaymentStatus">
                <Icon name="ph:check-circle-fill" class="size-4 mr-2" />
                Confirmar Pagamento
              </BaseButton>
            </div>
          </div>

          <!-- Caso Cartão / Stripe -->
          <div
            v-else-if="selectedPayment.paymentMethod === 'CREDIT_CARD' || selectedPayment.method === 'CREDIT_CARD' || selectedPayment.paymentMethod === 'STRIPE' || selectedPayment.method === 'STRIPE'"
            class="space-y-4">
            <div class="p-6 bg-primary-500/5 border border-primary-500/20 rounded-xl text-center">
              <Icon name="logos:stripe" class="h-8 mx-auto mb-4" />
              <h5 class="text-sm font-bold text-muted-900 dark:text-white mb-2">Pagamento via Cartão de Crédito</h5>
              <p class="text-[11px] text-muted-500 leading-relaxed mb-6">
                Para sua segurança, o pagamento é processado através do checkout criptografado da Stripe.
                Você será redirecionado para concluir o pagamento com segurança.
              </p>

              <BaseButton :to="checkoutUrl" target="_blank" variant="primary" rounded="lg" size="lg"
                class="w-full h-12 shadow-lg shadow-primary-500/20 font-bold">
                <Icon name="ph:credit-card-fill" class="size-4 mr-2" />
                Ir para Pagamento Seguro
              </BaseButton>
            </div>

            <div
              class="p-4 rounded-xl bg-muted-50 dark:bg-muted-900 border border-muted-200 dark:border-muted-800 flex items-start gap-3">
              <Icon name="ph:info-fill" class="size-4 text-primary-500 shrink-0 mt-0.5" />
              <p class="text-[10px] text-muted-500">
                Após completar o pagamento na Stripe, sua assinatura será ativada automaticamente em alguns instantes.
              </p>
            </div>

            <BaseButton variant="muted" rounded="lg" size="md" class="w-full font-semibold" :loading="isCheckingStatus"
              @click="checkPaymentStatus">
              <Icon name="ph:arrows-clockwise-bold" class="size-4 mr-2" />
              Já paguei, verificar acesso
            </BaseButton>
          </div>

          <!-- Caso Boleto -->
          <div v-else-if="selectedPayment.paymentMethod === 'BOLETO' || selectedPayment.method === 'BOLETO'"
            class="space-y-4">
            <div class="p-6 bg-primary-500/5 border border-primary-500/20 rounded-xl text-center">
              <Icon name="ph:barcode-fill" class="size-12 text-primary-500 mx-auto mb-4" />
              <h5 class="text-sm font-bold text-muted-900 dark:text-white mb-2">Pagamento via Boleto</h5>
              <p class="text-[11px] text-muted-500 leading-relaxed mb-6">
                O boleto foi gerado e uma cópia foi enviada para seu e-mail.
                A compensação pode levar até 48h úteis.
              </p>

              <BaseButton :to="checkoutUrl" target="_blank" variant="primary" rounded="lg" size="lg"
                class="w-full h-12 shadow-lg shadow-primary-500/20 font-bold">
                <Icon name="ph:file-pdf-fill" class="size-4 mr-2" />
                Visualizar Boleto (PDF)
              </BaseButton>
            </div>

            <BaseButton variant="muted" rounded="lg" size="md" class="w-full font-semibold" :loading="isCheckingStatus"
              @click="checkPaymentStatus">
              <Icon name="ph:arrows-clockwise-bold" class="size-4 mr-2" />
              Verificar Compensação
            </BaseButton>
          </div>

          <!-- Fallback / Desconhecido -->
          <div v-else
            class="p-6 bg-muted-100 dark:bg-muted-900 border border-muted-200 dark:border-muted-800 rounded-xl text-center">
            <Icon name="ph:question-fill" class="size-12 text-muted-400 mx-auto mb-4" />
            <h5 class="text-sm font-bold text-muted-900 dark:text-white mb-2">Processando Pagamento</h5>
            <p class="text-[11px] text-muted-500 leading-relaxed mb-6">
              Detectamos uma fatura pendente, mas ainda estamos processando os detalhes.
              Por favor, aguarde alguns instantes ou entre em contato com o suporte.
            </p>
            <BaseButton variant="muted" rounded="lg" size="md" class="w-full font-semibold" :loading="isCheckingStatus"
              @click="checkPaymentStatus">
              <Icon name="ph:arrows-clockwise-bold" class="size-4 mr-2" />
              Verificar agora
            </BaseButton>
          </div>

          <button v-if="pendingPayments.length > 1" @click="selectedPayment = null"
            class="w-full text-[11px] font-semibold text-muted-400 hover:text-muted-600 dark:hover:text-muted-300 py-2">
            ← Trocar fatura
          </button>
        </div>

      </div>

      <!-- Estado Vazio (Sucesso) -->
      <div
        v-else-if="!pendingPayments.length && currentSubscription?.status !== 'PENDING_PAYMENT' && !isLoadingPayments"
        class="h-full flex flex-col items-center justify-center text-center px-8 -mt-8">

        <div class="size-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
          <Icon name="ph:check-circle-fill" class="size-10 text-emerald-600" />
        </div>

        <BaseHeading size="xl" weight="bold" class="text-muted-900 dark:text-white mb-2">
          Tudo em Ordem!
        </BaseHeading>

        <BaseParagraph class="text-muted-500 dark:text-muted-400 max-w-xs mx-auto text-sm leading-relaxed mb-6">
          Não há pendências financeiras. Sua assinatura está ativa.
        </BaseParagraph>

        <BaseButton variant="muted" rounded="lg" size="md" class="px-8" @click="onClose ? onClose() : close()">
          Fechar
        </BaseButton>
      </div>

    </div>

    <!-- Footer Minimalista -->
    <div class="shrink-0 border-t border-muted-200 dark:border-muted-800 px-6 py-3 bg-muted-50/50 dark:bg-muted-900/50">
      <div class="flex items-center justify-center gap-3 text-[9px] text-muted-400 dark:text-muted-500">
        <Icon name="ph:shield-check-fill" class="size-3.5 text-emerald-500" />
        <span class="font-medium uppercase tracking-wider">Ambiente Seguro e Criptografado</span>
      </div>
    </div>

  </FocusScope>
</template>