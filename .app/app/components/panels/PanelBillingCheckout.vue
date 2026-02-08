<script setup lang="ts">
import { useSubscription } from '~/composables/useSubscription'
import { useAuth } from '~/composables/useAuth'

const props = defineProps<{
  onClose?: () => void
}>()

const { close } = usePanels()
const { fetchMySubscription, currentSubscription, getPaymentHistory, getPaymentStatus, loading } = useSubscription()
const { fetchUser } = useAuth()
const toaster = useNuiToasts()

const payments = ref<any[]>([])
const isLoadingPayments = ref(false)
const selectedPayment = ref<any>(null)
const isCheckingStatus = ref(false)

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
      <AppPageLoading message="Gerando PIX..." />
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
                  {{ formatCurrency(selectedPayment?.amount || 0) }}
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

        <!-- Checkout PIX Compacto -->
        <div v-if="selectedPayment" class="space-y-4">
          <!-- QR Code e Timer em Grid -->
          <div class="grid grid-cols-[auto_1fr] gap-4 items-start">
            <!-- QR Code -->
            <div class="bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-800 rounded-xl p-3">
              <img :src="pixQrCode" alt="QR Code PIX" class="w-32 h-32">
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

          <!-- Botões -->
          <div class="space-y-2.5 pt-1">
            <BaseButton variant="primary" rounded="lg" size="lg"
              class="w-full h-12 font-semibold shadow-lg shadow-primary-500/20" :loading="isCheckingStatus"
              @click="checkPaymentStatus">
              <Icon name="ph:check-circle-fill" class="size-4 mr-2" />
              Confirmar Pagamento
            </BaseButton>

            <button v-if="pendingPayments.length > 1" @click="selectedPayment = null"
              class="w-full text-[11px] font-semibold text-muted-400 hover:text-muted-600 dark:hover:text-muted-300 py-2">
              ← Trocar fatura
            </button>
          </div>
        </div>

      </div>

      <!-- Estado Vazio (Sucesso) -->
      <div v-else-if="!pendingPayments.length && !isLoadingPayments"
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