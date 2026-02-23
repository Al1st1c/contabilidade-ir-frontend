<script setup lang="ts">
definePageMeta({
  layout: 'empty',
  title: 'Pagamento Confirmado',
})

const route = useRoute()
const router = useRouter()
const { useCustomFetch } = useApi()
const { fetchUser } = useAuth()

const isVerifying = ref(true)
const verificationStatus = ref<'PENDING' | 'SUCCESS' | 'ERROR'>('PENDING')
const errorMessage = ref('')

async function verifyPayment() {
  const paymentId = route.query.paymentId as string
  const sessionId = route.query.session_id as string

  // Tenta verificar pelo paymentId se disponível
  if (paymentId) {
    try {
      const res = await useCustomFetch<any>(`/payments/${paymentId}/status`)
      if (res.data?.status === 'PAID') {
        verificationStatus.value = 'SUCCESS'
        await fetchUser()
        setTimeout(() => {
          const pendingIr = localStorage.getItem('pendingIrPurchase')
          if (pendingIr) {
            router.push(`/dashboard/ir-credits?quantity=${pendingIr}`)
          } else {
            router.push('/dashboard')
          }
        }, 5000)
        return
      }
    } catch (e) {
      console.error('Erro ao verificar status por ID:', e)
    }
  }

  // Fallback: Verificar se a assinatura do usuário já está ativa
  try {
    await fetchUser()
    const { data: sub } = await useCustomFetch<any>('/subscriptions/my-subscription')

    if (sub?.status === 'ACTIVE') {
      verificationStatus.value = 'SUCCESS'
      setTimeout(() => {
        const pendingIr = localStorage.getItem('pendingIrPurchase')
        if (pendingIr) {
          router.push(`/dashboard/ir-credits?quantity=${pendingIr}`)
        } else {
          router.push('/dashboard')
        }
      }, 5000)
    } else {
      // Se ainda não está ativa, tenta novamente em alguns segundos (pode ser delay do webhook)
      verificationStatus.value = 'PENDING'
      errorMessage.value = 'Aguardando confirmação do pagamento pela Stripe...'
      setTimeout(verifyPayment, 4000)
    }
  }
  catch (err: any) {
    console.error('Erro ao verificar pagamento:', err)
    verificationStatus.value = 'ERROR'
    errorMessage.value = err.data?.message || err.message || 'Ocorreu um erro ao validar seu pagamento.'
  }
  finally {
    isVerifying.value = false
  }
}


// Redirecionar para o dashboard após alguns segundos (apenas se sucesso)
onMounted(() => {
  verifyPayment()
})
</script>

<template>
  <div class="min-h-screen bg-muted-50 dark:bg-muted-950 flex items-center justify-center p-4">
    <BaseCard rounded="lg" class="max-w-md w-full p-8 text-center shadow-2xl shadow-muted-200/50 dark:shadow-none">

      <!-- Estado: Verificando -->
      <div v-if="verificationStatus === 'PENDING'" class="py-8">
        <div class="size-16 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <BaseLoader class="size-10 text-primary-500" />
        </div>
        <BaseHeading as="h1" size="xl" weight="bold" class="mb-4 text-muted-800 dark:text-white font-sans">
          Validando Pagamento
        </BaseHeading>
        <BaseParagraph size="md" class="text-muted-500 dark:text-muted-400 mb-4 font-sans italic">
          {{ errorMessage || 'Estamos confirmando os detalhes com a Stripe...' }}
        </BaseParagraph>
      </div>

      <!-- Estado: Erro -->
      <div v-else-if="verificationStatus === 'ERROR'" class="py-8">
        <div class="size-20 bg-danger-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon name="solar:danger-triangle-bold-duotone" class="size-12 text-danger-500" />
        </div>
        <BaseHeading as="h1" size="xl" weight="bold" class="mb-4 text-muted-800 dark:text-white font-sans">
          Ops! Algo deu errado
        </BaseHeading>
        <BaseParagraph size="md" class="text-muted-500 dark:text-muted-400 mb-8 font-sans">
          {{ errorMessage }}
        </BaseParagraph>
        <BaseButton variant="primary" color="primary" class="w-full" @click="verifyPayment">
          Tentar Novamente
        </BaseButton>
      </div>

      <!-- Estado: Sucesso -->
      <template v-else>
        <div class="mb-6 relative">
          <div class="size-24 bg-success-500/10 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <Icon name="solar:verified-check-bold-duotone" class="size-16 text-success-500" />
          </div>
          <!-- Efeito de confetti simples com CSS -->
          <div class="absolute inset-0 pointer-events-none overflow-hidden">
            <div v-for="n in 12" :key="n" class="absolute size-2 rounded-full animate-ping opacity-20"
              :class="n % 2 === 0 ? 'bg-primary-500' : 'bg-success-500'" :style="{
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                animationDelay: n * 200 + 'ms'
              }"></div>
          </div>
        </div>

        <BaseHeading as="h1" size="2xl" weight="bold" class="mb-4 text-muted-800 dark:text-white font-sans">
          Pagamento Confirmado!
        </BaseHeading>

        <BaseParagraph size="md" class="text-muted-500 dark:text-muted-400 mb-8 font-sans">
          Sua assinatura foi ativada com sucesso. Prepare-se para transformar a gestão do seu escritório.
        </BaseParagraph>

        <div class="space-y-4">
          <BaseButton to="/dashboard" variant="primary" color="primary" class="w-full h-12 text-lg font-bold">
            Ir para o Dashboard
          </BaseButton>

          <BaseText size="xs" class="text-muted-400 block animate-pulse">
            Redirecionando automaticamente em 5 segundos...
          </BaseText>
        </div>
      </template>

      <!-- Detalhes Extras Premium -->
      <div
        class="mt-12 pt-8 border-t border-muted-100 dark:border-muted-800 flex justify-center gap-8 opacity-50 grayscale">
        <Icon name="logos:stripe" class="h-5" />
        <Icon name="solar:shield-check-bold-duotone" class="size-5 text-success-500" />
        <Icon name="solar:lock-bold-duotone" class="size-5 text-muted-400" />
      </div>

    </BaseCard>
  </div>
</template>

<style scoped>
@keyframes ping {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }

  100% {
    transform: scale(3);
    opacity: 0;
  }
}
</style>
