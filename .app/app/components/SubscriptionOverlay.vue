<script setup lang="ts">
import { PanelsPanelBillingCheckout } from '#components'
import { useSubscription } from '~/composables/useSubscription'
import { useAuth, useApi } from '~/composables/useAuth'

const { currentSubscription, fetchMySubscription } = useSubscription()
const { user, fetchUser } = useAuth()
const { useCustomFetch } = useApi()
const { open } = usePanels()
const router = useRouter()
const toaster = useNuiToasts()

const isBlocked = computed(() => {
  if (!currentSubscription.value) return false
  const status = currentSubscription.value.status
  return status === 'PENDING_PAYMENT' || status === 'EXPIRED' || status === 'PAST_DUE' || status === 'CANCELED'
})

const isMaster = computed(() => user.value?.role?.name === 'master')

const isChecking = ref(false)
const isPreparing = ref(false)

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
        description: 'Não detectamos o pagamento ainda. Se você já pagou, aguarde alguns instantes.',
        icon: 'ph:info-fill',
      })
    }
  } catch (err) {
    console.error('Erro ao verificar status:', err)
  } finally {
    isChecking.value = false
  }
}

async function goToPayment() {
  open(PanelsPanelBillingCheckout, {}, {
    position: 'right',
    size: 'md',
    overlay: true
  })
}
</script>

<template>
  <div class="relative z-[70]">
    <!-- Block overlay -->
    <div v-if="isBlocked"
      class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-muted-900/70 backdrop-blur-md">

      <BaseCard rounded="lg"
        class="max-w-md w-full p-6 shadow-2xl border-muted-200 dark:border-muted-800 text-center relative z-[81]">

        <div v-if="isMaster">
          <!-- Status Icon Compacto -->
          <div class="inline-flex items-center justify-center mb-4 mx-auto">
            <div class="size-16 rounded-2xl bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center">
              <Icon
                :name="currentSubscription?.status === 'PENDING_PAYMENT' ? 'ph:qr-code-fill' : 'ph:warning-circle-fill'"
                class="size-8 text-primary-600 dark:text-primary-400" />
            </div>
          </div>

          <!-- Título -->
          <BaseHeading tag="h2" size="xl" weight="bold" class="text-muted-900 dark:text-white mb-2">
            Acesso Restrito
          </BaseHeading>

          <!-- Descrição -->
          <BaseParagraph class="text-muted-500 dark:text-muted-400 mb-6 leading-relaxed text-sm max-w-sm mx-auto">
            <template v-if="currentSubscription?.status === 'PENDING_PAYMENT'">
              Sua assinatura aguarda confirmação de pagamento. Finalize o processo para liberar seu acesso.
            </template>
            <template v-else>
              Sua assinatura expirou. Reative seu plano para continuar operando no sistema.
            </template>
          </BaseParagraph>

          <!-- Ações -->
          <div class="space-y-2.5">
            <BaseButton variant="primary" rounded="lg" size="lg" class="w-full h-11 font-semibold"
              :loading="isPreparing || isChecking" @click="goToPayment">
              {{ currentSubscription?.status === 'PENDING_PAYMENT' ? 'Concluir Pagamento' : 'Reativar Plano' }}
            </BaseButton>

            <BaseButton variant="muted" rounded="lg" size="md" class="w-full h-10 font-medium" :loading="isChecking"
              @click="checkStatus">
              Já realizei o pagamento
            </BaseButton>

            <BaseButton to="https://wa.me/551132808396" target="_blank" variant="muted" rounded="lg" size="md"
              class="w-full h-10 font-medium border-dashed border-muted-200 dark:border-muted-700">
              <Icon name="ph:whatsapp-logo-fill" class="size-4 mr-2 text-emerald-500" />
              Falar com o suporte
            </BaseButton>
          </div>

          <!-- Footer -->
          <div class="mt-6 pt-4 border-t border-muted-100 dark:border-muted-800">
            <div class="flex items-center justify-center gap-2">
              <Icon name="ph:shield-check-fill" class="size-3.5 text-emerald-500" />
              <span class="text-[10px] font-medium text-muted-400 uppercase tracking-wider">Ambiente Seguro</span>
            </div>
          </div>
        </div>

        <!-- View para usuários não-master -->
        <div v-else>
          <div class="inline-flex items-center justify-center mb-4 mx-auto">
            <div class="size-16 rounded-2xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
              <Icon name="ph:lock-key-fill" class="size-8 text-rose-500" />
            </div>
          </div>

          <BaseHeading tag="h2" size="xl" weight="bold" class="text-muted-900 dark:text-white mb-2">
            Acesso Bloqueado
          </BaseHeading>

          <BaseParagraph class="text-muted-500 dark:text-muted-400 mb-6 leading-relaxed text-sm max-w-sm mx-auto">
            Detectamos uma pendência financeira na conta administrativa.
            <span class="block mt-2 font-semibold text-muted-700 dark:text-muted-300">
              Contate o administrador para regularizar o acesso.
            </span>
          </BaseParagraph>

          <div class="space-y-2.5">
            <BaseButton variant="muted" rounded="lg" size="md" class="w-full h-10" @click="checkStatus"
              :loading="isChecking">
              Verificar novamente
            </BaseButton>

            <BaseButton to="https://wa.me/551132808396" target="_blank" variant="muted" rounded="lg" size="md"
              class="w-full h-10 font-medium border-dashed border-muted-200 dark:border-muted-700 text-xs">
              <Icon name="ph:whatsapp-logo-fill" class="size-4 mr-2 text-emerald-500" />
              Falar com o suporte
            </BaseButton>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>