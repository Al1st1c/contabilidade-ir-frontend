<script setup lang="ts">
import { vMaska } from 'maska/vue'

definePageMeta({
  layout: 'empty',
})

useSeoMeta({
  title: 'Área do Cliente',
  ogTitle: 'Área do Cliente',
  description: 'Acesse seus documentos e gerencie sua declaração de imposto de renda.',
  ogDescription: 'Acesse seus documentos e gerencie sua declaração de imposto de renda.',
  robots: 'noindex, nofollow', // Client area might not need indexing
})

const { tenant, checkSubdomain } = useTenant()

// Check for subdomain whitelabel on mount
onMounted(() => {
  checkSubdomain()
})

const step = ref<'cpf' | 'method' | 'otp'>('cpf')
const cpf = ref('')
const otp = ref('')
const isLoading = ref(false)
const isInitialLoading = ref(true)
const availableMethods = ref<Array<{ method: string; destination: string }>>([])
const selectedMethod = ref<'SMS' | 'EMAIL' | null>(null)
const sentDestination = ref('')

const { add } = useNuiToasts()

const { token, user } = useAuth()

// Check for subdomain whitelabel on mount
onMounted(async () => {
  await checkSubdomain()
  // Small delay for smooth transition and ensure images are ready
  setTimeout(() => {
    isInitialLoading.value = false
  }, 600)
})

const authMessage = computed(() => {
  if (step.value === 'cpf') return 'Informe seu CPF para acessar seu painel de documentos.'
  if (step.value === 'method') return 'Escolha como deseja receber seu código de segurança.'
  return selectedMethod.value === 'EMAIL'
    ? 'Enviamos um código de segurança para seu e-mail.'
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

    // Se o backend retorna opções para escolher
    if (result.requiresMethodSelection) {
      availableMethods.value = result.availableMethods
      step.value = 'method'
      return
    }

    // Enviou direto (só tem um método disponível)
    selectedMethod.value = result.method || 'SMS'
    sentDestination.value = result.phone || result.email || ''
    add({
      title: 'Código Enviado',
      description: result.method === 'EMAIL'
        ? `Enviamos um código para ${result.email}`
        : `Enviamos um SMS para o final ${result.phone}`,
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

async function sendOtpWithMethod(method: 'SMS' | 'EMAIL') {
  selectedMethod.value = method
  isLoading.value = true
  try {
    const result = await $fetch<any>(getApiUrl('/auth/client/request-otp'), {
      method: 'POST',
      body: { cpf: unmaskedCpf.value, method },
    })

    if (result.error || !result.success) {
      add({
        title: 'Erro',
        description: result.message || 'Não foi possível enviar o código.',
        icon: 'solar:danger-circle-bold-duotone',
      })
      return
    }

    sentDestination.value = result.phone || result.email || ''
    add({
      title: 'Código Enviado',
      description: method === 'EMAIL'
        ? `Enviamos um código para ${result.email}`
        : `Enviamos um SMS para o final ${result.phone}`,
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
        method: selectedMethod.value,
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

    // Salvar no estado e cookies usando useAuth
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

    // Pequeno delay para garantir que os cookies e o estado foram processados
    setTimeout(() => {
      navigateTo('/client')
    }, 100)
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
  <!-- Full-page Initial Loader -->
  <div v-if="isInitialLoading"
    class="min-h-screen flex items-center justify-center bg-muted-50 dark:bg-muted-950 font-sans">
    <div class="flex flex-col items-center gap-6 animate-pulse">
      <div class="relative size-20">
        <div class="absolute inset-0 rounded-full border-4 border-primary-500/20" />
        <div class="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
      </div>
      <BaseParagraph size="sm" weight="medium" class="text-muted-500 dark:text-muted-400">
        Preparando seu acesso seguro...
      </BaseParagraph>
    </div>
  </div>

  <div v-else
    class="min-h-screen flex flex-col items-center justify-center p-4 bg-muted-50 dark:bg-muted-950 font-sans relative overflow-hidden">
    <!-- Mesh Gradient Background Elements -->
    <div class="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
      <div
        class="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-500/10 dark:bg-primary-500/5 blur-[120px] animate-pulse" />
      <div
        class="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary-600/10 dark:bg-primary-600/5 blur-[120px] animate-pulse transition-duration-3000" />
    </div>

    <!-- Main Content Container -->
    <div class="w-full max-w-sm space-y-8 relative z-10">
      <!-- Header / Logo Section -->
      <div class="text-center space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
        <div class="inline-flex justify-center h-20 items-center">
          <Transition name="scale-fade" mode="out-in">
            <img v-if="tenant?.logo" :key="tenant.logo" :src="tenant.logo" :alt="tenant?.tradeName || tenant?.name"
              class="h-16 w-auto object-contain drop-shadow-sm" />
            <TairoLogo v-else class="h-12 w-auto" />
          </Transition>
        </div>

        <div class="space-y-2">
          <BaseHeading as="h1" size="3xl" weight="bold"
            class="text-muted-900 dark:text-white tracking-tight leading-tight">
            {{ tenant?.tradeName || tenant?.name || 'Acesso ao IRPF' }}
          </BaseHeading>
          <BaseParagraph size="md" class="text-muted-500 dark:text-muted-300 font-medium">
            {{ authMessage }}
          </BaseParagraph>
        </div>
      </div>

      <!-- Auth Form Card with Glassmorphism -->
      <BaseCard
        class="p-8 shadow-2xl rounded-2xl bg-white/80 dark:bg-muted-900/80 backdrop-blur-xl border border-white/20 dark:border-muted-800/50 animate-in zoom-in-95 fade-in duration-500 delay-200">

        <div class="relative z-20">
          <Transition name="fade-slide" mode="out-in">
            <!-- Step 1: CPF -->
            <div v-if="step === 'cpf'" key="cpf" class="space-y-8">
              <div class="space-y-5">
                <div class="group/input">
                  <BaseInput v-model="cpf" v-maska data-maska="###.###.###-##" label="Seu CPF"
                    placeholder="000.000.000-00" icon="solar:user-id-bold-duotone" rounded="lg" size="lg"
                    class="transition-all duration-300 group-focus-within/input:ring-4 group-focus-within/input:ring-primary-500/10 !bg-white/50 dark:!bg-muted-950/50"
                    autofocus @keyup.enter="requestOtp" />
                </div>
              </div>

              <BaseButton variant="primary" block size="xl" rounded="lg" :loading="isLoading"
                :disabled="unmaskedCpf.length < 11"
                class="shadow-xl shadow-primary-500/30 hover:shadow-primary-500/40 hover:-translate-y-1 active:translate-y-0 active:shadow-lg transition-all transform duration-300 font-bold tracking-wide h-14"
                @click="requestOtp">
                Solicitar Código
                <Icon name="solar:arrow-right-bold-duotone" class="ml-2 size-5" />
              </BaseButton>
            </div>

            <!-- Step 1.5: Method Selection -->
            <div v-else-if="step === 'method'" key="method" class="space-y-8">
              <div class="space-y-4">
                <div class="flex items-center justify-between px-1">
                  <span class="text-[10px] font-bold text-muted-400 uppercase tracking-[0.2em]">Como receber o código</span>
                  <button
                    class="text-xs text-primary-500 font-bold hover:text-primary-600 transition-colors flex items-center gap-1.5"
                    @click="step = 'cpf'">
                    <Icon name="solar:undo-left-round-bold-duotone" class="size-3.5" />
                    Trocar CPF
                  </button>
                </div>

                <button
                  v-for="opt in availableMethods"
                  :key="opt.method"
                  :disabled="isLoading"
                  class="w-full flex items-center gap-4 p-4 rounded-xl border border-muted-200 dark:border-muted-700 bg-white/50 dark:bg-muted-950/50 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all duration-300 text-left group"
                  @click="sendOtpWithMethod(opt.method as 'SMS' | 'EMAIL')"
                >
                  <div class="flex items-center justify-center size-12 rounded-xl bg-primary-500/10 text-primary-500 group-hover:bg-primary-500/20 transition-colors">
                    <Icon
                      :name="opt.method === 'SMS' ? 'solar:smartphone-bold-duotone' : 'solar:letter-bold-duotone'"
                      class="size-6"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <span class="block text-sm font-bold text-muted-800 dark:text-muted-100">
                      {{ opt.method === 'SMS' ? 'SMS' : 'E-mail' }}
                    </span>
                    <span class="block text-xs text-muted-400 truncate">
                      {{ opt.destination }}
                    </span>
                  </div>
                  <Icon name="solar:arrow-right-bold-duotone" class="size-5 text-muted-300 group-hover:text-primary-500 transition-colors" />
                </button>
              </div>
            </div>

            <!-- Step 2: OTP -->
            <div v-else key="otp" class="space-y-8">
              <div class="space-y-6">
                <div class="flex items-center justify-between px-1">
                  <span class="text-[10px] font-bold text-muted-400 uppercase tracking-[0.2em]">Código de
                    Segurança</span>
                  <button
                    class="text-xs text-primary-500 font-bold hover:text-primary-600 transition-colors flex items-center gap-1.5"
                    @click="step = 'cpf'; selectedMethod = null; otp = ''">
                    <Icon name="solar:undo-left-round-bold-duotone" class="size-3.5" />
                    Trocar CPF
                  </button>
                </div>

                <div class="group/otp relative">
                  <BaseInput v-model="otp" v-maska data-maska="######" placeholder="••••••"
                    icon="solar:shield-keyhole-bold-duotone" rounded="lg" size="xl"
                    class="text-center tracking-[0.5em] font-mono text-2xl !bg-muted-50/50 dark:!bg-muted-950/50 focus:!bg-white dark:focus:!bg-muted-950 transition-colors"
                    maxlength="6" autofocus @keyup.enter="verifyOtp" />
                </div>

                <div class="text-center">
                  <BaseParagraph size="xs" class="text-muted-400 leading-relaxed">
                    {{ selectedMethod === 'EMAIL'
                      ? 'O código foi enviado para seu e-mail. Verifique também a caixa de spam.'
                      : 'O código SMS pode levar até 2 minutos para chegar em seu aparelho.'
                    }}
                  </BaseParagraph>
                </div>
              </div>

              <div class="space-y-4">
                <BaseButton variant="primary" block size="xl" rounded="lg" :loading="isLoading"
                  :disabled="otp.length < 4"
                  class="shadow-xl shadow-primary-500/30 hover:-translate-y-1 active:translate-y-0 transition-all font-bold tracking-wide h-14"
                  @click="verifyOtp">
                  Confirmar Acesso
                  <Icon name="solar:lock-unlocked-bold-duotone" class="ml-2 size-5" />
                </BaseButton>

                <BaseButton variant="ghost" block size="md" rounded="lg"
                  class="text-muted-500 hover:text-primary-500 hover:bg-primary-500/5 transition-all"
                  @click="selectedMethod ? sendOtpWithMethod(selectedMethod) : requestOtp()">
                  Reenviar Código
                </BaseButton>
              </div>
            </div>
          </Transition>
        </div>
      </BaseCard>

      <footer class="text-center space-y-8 animate-in fade-in duration-1000 delay-500">
        <div class="space-y-4">
          <BaseParagraph size="sm" class="text-muted-400 dark:text-muted-500 font-medium">
            Dúvidas ou dificuldades?
          </BaseParagraph>
          <a href="https://wa.me/5511999999999" target="_blank"
            class="inline-flex items-center gap-2.5 px-6 py-2.5 bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-800 text-muted-600 dark:text-muted-300 rounded-full text-xs font-bold hover:border-primary-500/50 hover:bg-primary-500/5 hover:text-primary-500 transition-all duration-300 shadow-sm">
            <Icon name="fa6-brands:whatsapp" class="size-3.5 text-green-500" />
            Canal de Suporte
          </a>
        </div>

        <div v-if="!tenant" class="pt-8 border-t border-muted-200/50 dark:border-muted-800/50">
          <BaseParagraph size="xs" class="text-muted-400/80 mb-3 leading-relaxed">
            Painel exclusivo para clientes de contabilidades parceiras.
          </BaseParagraph>
          <a href="https://gestorirpf.com.br" target="_blank"
            class="text-xs text-primary-500/70 hover:text-primary-500 font-bold transition-colors">
            gestorirpf.com.br
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
