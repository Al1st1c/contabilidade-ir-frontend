<script setup lang="ts">
import { vMaska } from 'maska/vue'

definePageMeta({
  layout: 'empty',
})

const { tenant, checkSubdomain } = useTenant()

// Check for subdomain whitelabel on mount
onMounted(() => {
  checkSubdomain()
})

const step = ref<'cpf' | 'otp'>('cpf')
const cpf = ref('')
const otp = ref('')
const isLoading = ref(false)

const { add } = useNuiToasts()

// Acessar os cookies diretamente para evitar erros de read-only do composable useAuth
const token = useCookie(API_CONFIG.TOKEN.COOKIE_NAME)
const user = useCookie(API_CONFIG.TOKEN.USER_COOKIE_NAME)

const authMessage = computed(() => {
  return step.value === 'cpf'
    ? 'Informe seu CPF para acessar seu painel de documentos.'
    : 'Enviamos um código de segurança via SMS.'
})

const unmaskedCpf = computed(() => cpf.value.replace(/\D/g, ''))

async function requestOtp() {
  if (unmaskedCpf.value.length < 11) {
    add({
      title: 'CPF Inválido',
      description: 'Por favor, informe seu CPF completo.',
      icon: 'solar:danger-circle-bold-duotone',
    })
    return
  }

  isLoading.value = true
  try {
    const result = await $fetch<any>(getApiUrl('/auth/client/request-otp'), {
      method: 'POST',
      body: { cpf: unmaskedCpf.value },
    })

    if (result.error || !result.success) {
      add({
        title: 'Erro no Acesso',
        description: result.message || 'Verifique se você possui uma declaração vinculada a este CPF.',
        icon: 'solar:danger-circle-bold-duotone',
      })
      return
    }

    add({
      title: 'Código Enviado',
      description: `Enviamos um SMS para o final ${result.phone}`,
      icon: 'solar:check-circle-bold-duotone',
    })
    step.value = 'otp'
  }
  catch (error: any) {
    add({
      title: 'Erro',
      description: error.data?.message || 'Algo deu errado. Tente novamente em instantes.',
      icon: 'solar:danger-circle-bold-duotone',
    })
  }
  finally {
    isLoading.value = false
  }
}

async function verifyOtp() {
  if (otp.value.length < 4)
    return

  isLoading.value = true
  try {
    const result = await $fetch<any>(getApiUrl('/auth/client/verify-otp'), {
      method: 'POST',
      body: {
        cpf: unmaskedCpf.value,
        code: otp.value,
      },
    })

    if (result.error || !result.success) {
      add({
        title: 'Código Inválido',
        description: result.message || 'O código informado está incorreto ou expirou.',
        icon: 'solar:danger-circle-bold-duotone',
      })
      return
    }

    // Salvar nos cookies seguindo o padrão do useAuth
    token.value = result.access_token
    user.value = {
      ...result.user,
      userType: 'client',
    }

    add({
      title: 'Acesso Autorizado',
      description: `Olá ${result.user.name}, bem-vindo(a)!`,
      icon: 'solar:check-circle-bold-duotone',
    })

    navigateTo('/client')
  }
  catch (error: any) {
    add({
      title: 'Falha na Verificação',
      description: error.data?.message || 'Não foi possível validar seu código.',
      icon: 'solar:danger-circle-bold-duotone',
    })
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-muted-50 dark:bg-muted-950 font-sans">

    <div class="w-full max-w-sm space-y-8">
      <!-- Header / Logo -->
      <div class="text-center space-y-6">
        <div class="inline-flex justify-center">
          <img v-if="tenant?.logo" :src="tenant.logo" :alt="tenant?.tradeName || tenant?.name"
            class="h-16 w-auto object-contain" />
          <TairoLogo v-else class="h-10 w-auto" />
        </div>

        <div class="space-y-2">
          <BaseHeading as="h1" size="3xl" weight="bold"
            class="text-muted-900 dark:text-white tracking-tight leading-tight">
            {{ tenant?.tradeName || tenant?.name || 'Acesso ao IRPF' }}
          </BaseHeading>
          <BaseParagraph size="md" class="text-muted-500 dark:text-muted-400 font-medium">
            {{ authMessage }}
          </BaseParagraph>
        </div>
      </div>

      <!-- Auth Form Card -->
      <BaseCard
        class="p-8 shadow-xl rounded-2xl bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-800">

        <div class="relative z-20">
          <Transition name="fade-slide" mode="out-in">
            <!-- Step 1: CPF -->
            <div v-if="step === 'cpf'" key="cpf" class="space-y-8">
              <div class="space-y-5">
                <div class="group/input">
                  <BaseInput v-model="cpf" v-maska data-maska="###.###.###-##" label="Seu CPF"
                    placeholder="000.000.000-00" icon="solar:user-id-bold-duotone" rounded="lg" size="lg"
                    class="transition-all duration-300 group-focus-within/input:ring-2 group-focus-within/input:ring-primary-500/20"
                    autofocus @keyup.enter="requestOtp" />
                </div>
              </div>

              <BaseButton variant="primary" block size="xl" rounded="lg" :loading="isLoading"
                :disabled="unmaskedCpf.length < 11"
                class="shadow-lg shadow-primary-500/25 hover:translate-y-[-2px] active:translate-y-0 transition-all font-bold tracking-wide"
                @click="requestOtp">
                Solicitar Código
                <Icon name="solar:arrow-right-bold-duotone" class="ml-2 size-5" />
              </BaseButton>
            </div>

            <!-- Step 2: OTP -->
            <div v-else key="otp" class="space-y-8">
              <div class="space-y-6">
                <div class="flex items-center justify-between px-1">
                  <span class="text-xs font-semibold text-muted-400 uppercase tracking-widest">Código SMS</span>
                  <button
                    class="text-xs text-primary-500 font-bold hover:text-primary-600 transition-colors flex items-center gap-1"
                    @click="step = 'cpf'">
                    <Icon name="solar:undo-left-round-bold-duotone" class="size-3" />
                    Alterar CPF
                  </button>
                </div>

                <div class="group/otp relative">
                  <BaseInput v-model="otp" v-maska data-maska="######" placeholder="— — — — — —"
                    icon="solar:shield-keyhole-bold-duotone" rounded="lg" size="xl"
                    class="text-center tracking-[0.8em] font-mono text-xl !bg-muted-50 dark:!bg-muted-800" maxlength="6"
                    autofocus @keyup.enter="verifyOtp" />
                </div>

                <div class="text-center">
                  <BaseParagraph size="xs" class="text-muted-400">
                    O código pode levar até 2 minutos para chegar.
                  </BaseParagraph>
                </div>
              </div>

              <div class="space-y-4">
                <BaseButton variant="primary" block size="xl" rounded="lg" :loading="isLoading"
                  :disabled="otp.length < 4" class="shadow-lg shadow-primary-500/25 font-bold tracking-wide"
                  @click="verifyOtp">
                  Confirmar Acesso
                  <Icon name="solar:lock-unlocked-bold-duotone" class="ml-2 size-5" />
                </BaseButton>

                <BaseButton variant="ghost" block size="md" rounded="lg" class="text-muted-500 hover:text-primary-500"
                  @click="requestOtp">
                  Reenviar Código
                </BaseButton>
              </div>
            </div>
          </Transition>
        </div>
      </BaseCard>

      <footer class="text-center space-y-6">
        <div class="space-y-2">
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
            Dúvidas ou dificuldades?
          </BaseParagraph>
          <a href="https://wa.me/5511999999999" target="_blank"
            class="inline-flex items-center gap-2 px-4 py-2 bg-muted-100 dark:bg-muted-800 text-muted-700 dark:text-muted-200 rounded-full text-xs font-bold hover:bg-primary-500 hover:text-white transition-all duration-300">
            <Icon name="fa6-brands:whatsapp" class="size-3" />
            Suporte ao Cliente
          </a>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
