<script setup lang="ts">
import { PanelsPanelBillingCheckout } from '#components'
import { useSubscription } from '~/composables/useSubscription'
import { useAuth, useApi } from '~/composables/useAuth'

const { currentSubscription, fetchMySubscription } = useSubscription()
const { user, fetchUser } = useAuth()
const { useCustomFetch } = useApi()
const { open } = usePanels()
const toaster = useNuiToasts()

// Ensure we always have fresh subscription data
// The backend has a lazy check that marks ACTIVE subs with past nextBillingDate as PAST_DUE
onMounted(() => {
  fetchMySubscription()
})

// Status check
const hasIssue = computed(() => {
  if (!currentSubscription.value) return false
  const status = currentSubscription.value.status
  return status === 'PENDING_PAYMENT' || status === 'EXPIRED' || status === 'PAST_DUE' || status === 'CANCELED'
})

const isMaster = computed(() => user.value?.role?.name === 'master')
const isDismissed = ref(false)
const isChecking = ref(false)

// Banner config by status
const bannerConfig = computed(() => {
  const status = currentSubscription.value?.status
  switch (status) {
    case 'PAST_DUE':
    case 'EXPIRED':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-800/50',
        icon: 'lucide:alert-triangle',
        iconColor: 'text-amber-500',
        title: 'Cobrança pendente',
        message: isMaster.value
          ? 'Sua assinatura será cancelada caso a pendência não seja regularizada.'
          : 'Há uma pendência financeira na conta. Contate o administrador.',
        actionLabel: 'Regularizar',
        actionColor: 'warning' as const,
      }
    case 'PENDING_PAYMENT':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        border: 'border-blue-200 dark:border-blue-800/50',
        icon: 'lucide:clock',
        iconColor: 'text-blue-500',
        title: 'Aguardando pagamento',
        message: isMaster.value
          ? 'Sua assinatura será ativada assim que o pagamento for confirmado.'
          : 'Pagamento da assinatura está sendo processado.',
        actionLabel: 'Concluir Pagamento',
        actionColor: 'primary' as const,
      }
    case 'CANCELED':
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        border: 'border-rose-200 dark:border-rose-800/50',
        icon: 'lucide:x-circle',
        iconColor: 'text-rose-500',
        title: 'Plano cancelado',
        message: isMaster.value
          ? 'Seu plano foi cancelado. Reative para continuar usando todas as funcionalidades.'
          : 'O plano do escritório foi cancelado. Contate o administrador.',
        actionLabel: 'Reativar Plano',
        actionColor: 'primary' as const,
      }
    default:
      return null
  }
})

const showBanner = computed(() => hasIssue.value && !isDismissed.value && bannerConfig.value)

async function checkStatus() {
  if (isChecking.value) return
  isChecking.value = true
  try {
    await fetchMySubscription()
    if (currentSubscription.value?.status === 'ACTIVE' || currentSubscription.value?.status === 'TRIAL') {
      await fetchUser()
      toaster.add({
        title: 'Assinatura Ativa',
        description: 'Seu acesso foi restaurado com sucesso!',
        icon: 'ph:check-circle-fill',
      })
    } else {
      toaster.add({
        title: 'Ainda pendente',
        description: 'Não detectamos o pagamento ainda. Se já pagou, aguarde alguns instantes.',
        icon: 'ph:info-fill',
      })
    }
  } catch (err) {
    console.error('Erro ao verificar status:', err)
  } finally {
    isChecking.value = false
  }
}

function goToPayment() {
  open(PanelsPanelBillingCheckout, {}, {
    position: 'right',
    size: 'md',
    overlay: true,
  })
}

function dismiss() {
  isDismissed.value = true
}
</script>

<template>
  <Transition enter-active-class="transition-all duration-300 ease-out"
    leave-active-class="transition-all duration-200 ease-in" enter-from-class="opacity-0 -translate-y-full"
    leave-to-class="opacity-0 -translate-y-full">
    <div v-if="showBanner" class="fixed top-0 left-0 right-0 z-[100] border-b shadow-sm"
      :class="[bannerConfig!.bg, bannerConfig!.border]">
      <div class="px-4 py-2.5 flex items-center gap-3 max-w-screen-2xl mx-auto">
        <!-- Icon -->
        <Icon :name="bannerConfig!.icon" class="size-4 shrink-0" :class="bannerConfig!.iconColor" />

        <!-- Content -->
        <div class="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span class="text-xs font-bold text-muted-800 dark:text-white whitespace-nowrap">
            {{ bannerConfig!.title }}
          </span>
          <span class="text-xs text-muted-600 dark:text-muted-300 line-clamp-1">
            {{ bannerConfig!.message }}
          </span>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 shrink-0">
          <!-- Master: action button -->
          <template v-if="isMaster">
            <button type="button"
              class="text-[11px] font-semibold text-muted-500 hover:text-muted-700 dark:text-muted-400 dark:hover:text-muted-200 transition-colors"
              :class="{ 'opacity-50 pointer-events-none': isChecking }" @click="checkStatus">
              {{ isChecking ? 'Verificando...' : 'Já paguei' }}
            </button>
            <BaseButton size="sm" variant="primary" rounded="lg" class="h-7 px-3 text-[11px] font-bold"
              @click="goToPayment">
              {{ bannerConfig!.actionLabel }}
            </BaseButton>
          </template>

          <!-- Dismiss -->
          <button type="button"
            class="text-muted-400 hover:text-muted-600 dark:hover:text-muted-300 transition-colors p-0.5"
            @click="dismiss">
            <Icon name="lucide:x" class="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>