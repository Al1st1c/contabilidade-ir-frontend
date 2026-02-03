<script setup lang="ts">
definePageMeta({
  layout: 'empty',
})

const { tenant } = useTenant()
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
    ? 'Informe seu CPF para acessar seu painel.'
    : 'Enviamos um código por SMS para o seu celular.'
})

async function requestOtp() {
  if (cpf.value.length < 11)
    return

  isLoading.value = true
  try {
    const result = await $fetch<any>(getApiUrl('/auth/client/request-otp'), {
      method: 'POST',
      body: { cpf: cpf.value.replace(/\D/g, '') },
    })

    if (result.error || !result.success) {
      add({
        title: 'Código Enviado',
        description: `Enviamos um SMS para ${result.phone}`,
        icon: 'solar:check-circle-bold-duotone',
      })
      return
    }

    add({
      title: 'Sucesso!',
      description: 'Seja bem-vindo(a) de volta.',
      icon: 'solar:check-circle-bold-duotone',
    })
    step.value = 'otp'
  }
  catch (error: any) {
    add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao conectar com o servidor.',
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
        cpf: cpf.value.replace(/\D/g, ''),
        code: otp.value,
      },
    })

    if (result.error || !result.success) {
      add({
        title: 'Erro',
        description: result.message || 'Verifique seu CPF e tente novamente.',
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
      title: 'Bem-vindo!',
      description: `Olá ${result.user.name}, seu acesso foi validado.`,
      icon: 'solar:check-circle-bold-duotone',
    })

    navigateTo('/client')
  }
  catch (error: any) {
    add({
      title: 'Erro',
      description: error.data?.message || 'Falha na verificação',
      icon: 'solar:danger-circle-bold-duotone',
    })
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-muted-50 dark:bg-muted-950 flex flex-col items-center justify-center p-4">
    <div class="w-full max-w-[360px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <!-- Header -->
      <div class="text-center space-y-4">
        <TairoLogo class="size-16 mx-auto text-primary-500" />
        <div>
          <BaseHeading as="h1" size="2xl" weight="bold" class="text-muted-800 dark:text-white">
            {{ tenant?.tradeName || tenant?.name || 'Acesso ao IRPF' }}
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 mt-2">
            {{ authMessage }}
          </BaseParagraph>
        </div>
      </div>

      <!-- Auth Form -->
      <BaseCard class="p-6 md:p-8 border-none shadow-2xl">
        <!-- Step 1: CPF -->
        <div v-if="step === 'cpf'" class="space-y-6">
          <div class="space-y-4">
            <BaseInput
              v-model="cpf" label="Seu CPF" placeholder="000.000.000-00" icon="solar:user-id-linear"
              rounded="md" size="lg" class="!bg-muted-50 dark:!bg-muted-900"
            />
          </div>
          <BaseButton
            variant="primary" block size="lg" rounded="md" :loading="isLoading" :disabled="cpf.length < 11"
            @click="requestOtp"
          >
            Continuar
          </BaseButton>
        </div>

        <!-- Step 2: OTP -->
        <div v-else class="space-y-6">
          <div class="space-y-4">
            <BaseInput
              v-model="otp" label="Código de Acesso" placeholder="0000" icon="solar:shield-keyhole-linear"
              rounded="md" size="lg" class="!bg-muted-50 dark:!bg-muted-900 text-center tracking-[1em]" maxlength="6"
            />
            <div class="text-center">
              <button class="text-xs text-primary-500 font-medium hover:underline" @click="step = 'cpf'">
                Não recebi o código ou CPF incorreto
              </button>
            </div>
          </div>
          <BaseButton
            variant="primary" block size="lg" rounded="md" :loading="isLoading" :disabled="otp.length < 4"
            @click="verifyOtp"
          >
            Acessar Painel
          </BaseButton>
        </div>
      </BaseCard>

      <!-- Footer -->
      <div class="text-center space-y-4">
        <BaseParagraph size="xs" class="text-muted-400">
          Problemas com o acesso? <br>
          <a href="#" class="text-primary-500 font-medium hover:underline">Entre em contato com seu contador</a>
        </BaseParagraph>
        <div class="flex items-center justify-center gap-2 opacity-50">
          <Icon name="solar:shield-check-linear" class="size-4" />
          <span class="text-[10px] font-bold uppercase tracking-widest">Acesso Seguro</span>
        </div>
      </div>
    </div>
  </div>
</template>
