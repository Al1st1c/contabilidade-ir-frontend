<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useDebounceFn } from '@vueuse/core'
import { Field, useForm } from 'vee-validate'
import { z } from 'zod'
import { API_CONFIG } from '~/utils/config'

definePageMeta({
  layout: 'empty',
  title: 'Entrar',
})

useSeoMeta({
  title: 'Entrar - Gestor IRPF | A Plataforma do Contador Moderno',
  ogTitle: 'Entrar - Gestor IRPF | A Plataforma do Contador Moderno',
  description: 'Acesse seu painel do Gestor IRPF e domine sua temporada de imposto de renda com organização e automação.',
  ogDescription: 'Acesse seu painel do Gestor IRPF e domine sua temporada de imposto de renda com organização e automação.',
})

const VALIDATION_TEXT = {
  EMAIL_REQUIRED: 'Um email válido é obrigatório',
  PASSWORD_REQUIRED: 'Uma senha é obrigatória',
  PASSWORD_MIN: 'A senha deve ter pelo menos 8 caracteres',
}

// Modes: 'login', 'recovery-request', 'recovery-method', 'recovery-verify', 'recovery-reset'
const mode = ref<'login' | 'recovery-request' | 'recovery-method' | 'recovery-verify' | 'recovery-reset'>('login')

const zodSchema = z.object({
  email: z.string().email(VALIDATION_TEXT.EMAIL_REQUIRED),
  senha: z.string().min(1, VALIDATION_TEXT.PASSWORD_REQUIRED),
  trustDevice: z.boolean().optional(),
})

type FormInput = z.infer<typeof zodSchema>

const validationSchema = toTypedSchema(zodSchema)
const initialValues = {
  email: '',
  senha: '',
  trustDevice: false,
} satisfies FormInput

const {
  handleSubmit,
  isSubmitting,
  setFieldError,
} = useForm({
  validationSchema,
  initialValues,
})

const router = useRouter()
const toaster = useNuiToasts()
const { login, verifyTwoFactor, isAuthenticated, token, debugCookies } = useAuth()
const { useCustomFetch } = useApi()

// Recovery specific state
const recoveryForm = reactive({
  email: '',
  maskedEmail: '',
  maskedPhone: '',
  hasPhone: false,
  method: '' as 'EMAIL' | 'SMS',
  code: '',
  newPassword: '',
  confirmPassword: '',
})

// PIN Input Logic (Generic)
const pinLength = computed(() => mode.value === 'recovery-verify' || isTwoFactor.value ? 6 : 4)
const pinInput = ref<Array<number | undefined>>([])
const pinInputElements = ref<HTMLInputElement[]>([])

function focusPinField(n: number) {
  if (!n || n > pinLength.value) n = 1
  if (pinInputElements.value[n]) {
    pinInputElements.value[n]?.focus()
  }
}

function handlePinPaste(event: ClipboardEvent) {
  event.preventDefault()
  const pasted = event.clipboardData?.getData('text')?.replace(/\D/g, '')?.substring(0, pinLength.value)
  if (pasted) {
    pinInput.value = pasted.split('').map(Number)
  }
}

function handlePinType(event: KeyboardEvent, index: number) {
  if (event.code === 'ArrowRight') {
    event.preventDefault()
    nextTick(() => focusPinField(Math.min(pinLength.value, index + 1)))
    return
  }
  if (event.code === 'ArrowLeft') {
    event.preventDefault()
    nextTick(() => focusPinField(Math.max(1, index - 1)))
    return
  }
  if (event.code === 'Backspace') {
    event.preventDefault()
    pinInput.value[index - 1] = undefined
    nextTick(() => focusPinField(Math.max(1, index - 1)))
    return
  }
  const key = event.key.replace(/\D/g, '')
  if (key !== '') {
    pinInput.value[index - 1] = Number(key)
    nextTick(() => focusPinField(Math.min(pinLength.value, index + 1)))
  }
}

// 2FA Variables
const email = ref('')
const password = ref('')
const loading = ref(false)
const logged = ref(false)
const isTwoFactor = ref(false)
const recaptchaToken = ref('')

// Verifica se já está autenticado
onMounted(async () => {
  if (isAuthenticated.value) {
    try {
      const { data: userData } = await useCustomFetch<any>('/auth/me', { method: 'GET' })
      const roleName = userData?.role?.name
      const mobileRoles = ['Operador', 'Caixa', 'Portaria']
      if (mobileRoles.includes(roleName)) router.push('/mobile')
      else router.push('/dashboard')
    } catch (error) {
      router.push('/dashboard')
    }
  }

  if (router.currentRoute.value.query.firstAccess) {
    toaster.add({
      title: 'Obrigado por confiar em nós',
      description: 'Preencha os campos com seu e-mail e sua senha!',
      icon: 'ph:user-circle-fill',
      progress: true,
    })
  }
})

async function getRecaptcha() {
  const { $recaptchaV3 } = useNuxtApp()
  if ($recaptchaV3 && API_CONFIG.SECURITY.RECAPTCHA_REQUIRED) {
    try {
      recaptchaToken.value = await $recaptchaV3.execute(API_CONFIG.SECURITY.RECAPTCHA_ACTION)
    } catch (error) {
      toaster.add({
        title: 'Ops..',
        description: 'Falha na verificação de segurança. Por favor, tente novamente.',
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
      return
    }
  }
}

// PIN Watcher
watch(pinInput, (newValue) => {
  const code = newValue.join('')
  if (code.length === pinLength.value) {
    if (isTwoFactor.value) {
      validate2FACode(code)
    } else if (mode.value === 'recovery-verify') {
      verifyRecoveryCode(code)
    }
  }
}, { deep: true })

async function validate2FACode(code: string) {
  loading.value = true
  try {
    const result = await verifyTwoFactor({
      code,
      email: email.value,
      password: password.value,
      recaptchaToken: recaptchaToken.value,
    })

    if (result.error) {
      logged.value = false
      pinInput.value = []
      toaster.add({ title: 'Erro', description: result.message, icon: 'ph:warning-circle-fill', progress: true })
      return
    }

    logged.value = true
    await new Promise(resolve => setTimeout(resolve, 300))
    const { data: userData } = await useCustomFetch<any>('/auth/me', { method: 'GET' })
    const roleName = userData?.role?.name
    const mobileRoles = ['Operador', 'Caixa', 'Portaria']

    toaster.add({ title: 'Sucesso', description: 'Bem vindo!', icon: 'ph:user-circle-fill', progress: true })
    setTimeout(() => {
      if (mobileRoles.includes(roleName)) router.push('/mobile')
      else router.push('/dashboard')
    }, 1000)
  } catch (error) {
    toaster.add({ title: 'Erro', description: 'Ocorreu um erro ao validar o código', icon: 'ph:warning-circle-fill', progress: true })
  } finally {
    loading.value = false
  }
}

// Recovery Flow Actions
async function startRecovery() {
  if (!recoveryForm.email) {
    toaster.add({ title: 'Campo obrigatório', description: 'Por favor, digite seu e-mail.', icon: 'ph:info-circle-fill' })
    return
  }
  loading.value = true
  try {
    const { data: result } = await useCustomFetch<any>('/auth/forgot-password/request', {
      method: 'POST',
      body: { email: recoveryForm.email }
    })
    if (result.success) {
      recoveryForm.maskedEmail = result.data.email
      recoveryForm.maskedPhone = result.data.phone
      recoveryForm.hasPhone = result.data.hasPhone
      mode.value = 'recovery-method'
    } else {
      toaster.add({ title: 'Erro', description: result.message, icon: 'ph:warning-circle-fill' })
    }
  } catch (e: any) {
    const errorMessage = e.data?.message || e.message || 'Erro ao processar solicitação'
    toaster.add({ title: 'Erro', description: errorMessage, icon: 'ph:warning-circle-fill' })
  } finally {
    loading.value = false
  }
}

async function sendRecoveryCode(method: 'EMAIL' | 'SMS') {
  recoveryForm.method = method
  loading.value = true
  try {
    const { data: result } = await useCustomFetch<any>('/auth/forgot-password/send', {
      method: 'POST',
      body: { email: recoveryForm.email, method }
    })
    if (result.success) {
      toaster.add({ title: 'Código enviado', description: `O código foi enviado para seu ${method === 'EMAIL' ? 'e-mail' : 'celular'}.`, icon: 'ph:check-circle-fill' })
      pinInput.value = []
      mode.value = 'recovery-verify'
    } else {
      toaster.add({ title: 'Erro', description: result.message, icon: 'ph:warning-circle-fill' })
    }
  } catch (e: any) {
    const errorMessage = e.data?.message || e.message || 'Erro ao enviar código'
    toaster.add({ title: 'Erro', description: errorMessage, icon: 'ph:warning-circle-fill' })
  } finally {
    loading.value = false
  }
}

async function verifyRecoveryCode(code: string) {
  recoveryForm.code = code
  loading.value = true
  try {
    const { data: result } = await useCustomFetch<any>('/auth/forgot-password/verify', {
      method: 'POST',
      body: { email: recoveryForm.email, code }
    })
    if (result.success) {
      mode.value = 'recovery-reset'
    } else {
      pinInput.value = []
      toaster.add({ title: 'Código Inválido', description: result.message, icon: 'ph:warning-circle-fill' })
    }
  } catch (e: any) {
    const errorMessage = e.data?.message || e.message || 'Erro ao verificar código'
    toaster.add({ title: 'Erro', description: errorMessage, icon: 'ph:warning-circle-fill' })
  } finally {
    loading.value = false
  }
}

async function resetPassword() {
  if (recoveryForm.newPassword.length < 8) {
    toaster.add({ title: 'Senha Curta', description: 'A senha deve ter no mínimo 8 caracteres.', icon: 'ph:info-circle-fill' })
    return
  }
  if (recoveryForm.newPassword !== recoveryForm.confirmPassword) {
    toaster.add({ title: 'Senhas Diferentes', description: 'As senhas digitadas não conferem.', icon: 'ph:warning-circle-fill' })
    return
  }
  loading.value = true
  try {
    const { data: result } = await useCustomFetch<any>('/auth/forgot-password/reset', {
      method: 'POST',
      body: {
        email: recoveryForm.email,
        code: recoveryForm.code,
        passwordReset: recoveryForm.newPassword
      }
    })
    if (result.success) {
      toaster.add({ title: 'Sucesso', description: 'Sua senha foi alterada com sucesso!', icon: 'ph:check-circle-fill' })
      mode.value = 'login'
    } else {
      toaster.add({ title: 'Erro', description: result.message, icon: 'ph:warning-circle-fill' })
    }
  } catch (e: any) {
    const errorMessage = e.data?.message || e.message || 'Erro ao resetar senha'
    toaster.add({ title: 'Erro', description: errorMessage, icon: 'ph:warning-circle-fill' })
  } finally {
    loading.value = false
  }
}

const onSubmit = handleSubmit(async (values) => {
  try {
    await getRecaptcha()
    const retorno = await login({
      email: values.email,
      password: values.senha,
      recaptchaToken: recaptchaToken.value || undefined,
    })

    if (retorno.error) {
      toaster.add({ title: 'Erro', description: retorno.message, icon: 'ph:warning-circle-fill', progress: true })
      return
    }

    if ('two_factor' in retorno && retorno.two_factor) {
      email.value = values.email
      password.value = values.senha
      isTwoFactor.value = true
      pinInput.value = []
      if (retorno.phone) {
        toaster.add({ title: 'Código Enviado', description: `Código enviado para ${retorno.phone}`, icon: 'ph:check-circle-fill', progress: true })
      }
    }
  } catch (error: any) {
    toaster.add({ title: 'Erro', description: 'Dados de acesso inválidos!', icon: 'ph:warning-circle-fill', progress: true })
  }
})
</script>

<template>
  <ClientOnly>
    <div class="dark:bg-muted-800 min-h-screen bg-white">
      <div class="relative mx-auto flex min-h-screen max-w-10xl">
        <!-- Left Column: Content & Illustration -->
        <div class="bg-muted-100 dark:bg-muted-900 relative hidden w-1/2 items-center justify-center p-12 lg:flex">
          <div class="text-center">
            <img src="assets/funil/background.png" alt="Gestor IRPF"
              class="mx-auto mb-2 max-w-sm rounded-[2.5rem] w-60 shadow-xl border border-muted-200 dark:border-muted-800">
            <BaseHeading tag="h2" size="2xl" weight="bold" class="text-muted-800 dark:text-white mb-4">
              Mais controle. Menos preocupações.
            </BaseHeading>
            <BaseParagraph class="text-muted-500 dark:text-muted-400 max-w-sm mx-auto">
              Sua plataforma inteligente para gestão de declarações de imposto de renda.
              Organize, automatize e escale seu escritório de contabilidade.
            </BaseParagraph>
          </div>
        </div>

        <!-- Right Column: Login & recovery Forms -->
        <div class="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-12">
          <div class="mx-auto w-full max-w-md">
            <!-- Nav -->
            <div class="flex w-full items-center justify-between mb-8">
              <BaseButtonIcon v-if="mode !== 'login'" rounded="full" variant="muted" size="sm"
                @click="mode = mode === 'recovery-verify' ? 'recovery-method' : 'login'">
                <Icon name="ph:arrow-left-bold" class="size-4" />
              </BaseButtonIcon>
              <div v-else></div>
              <BaseThemeToggle />
            </div>

            <!-- Logo -->
            <div v-if="!isTwoFactor && mode === 'login'">
              <img src="/img/logo.png" alt="Integra Flux" class="mx-auto w-60 dark:hidden">
              <img src="/img/logo-white.png" alt="Integra Flux" class="mx-auto hidden w-60 dark:block">
            </div>

            <!-- MODE: LOGIN -->
            <div v-if="mode === 'login' && !isTwoFactor" class="mt-6">
              <div class="mt-5">
                <form method="POST" action="" class="mt-6" novalidate @submit.prevent="onSubmit">
                  <div class="space-y-4">
                    <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="email">
                      <BaseField v-slot="{ inputAttrs, inputRef }" label="Email"
                        :state="errorMessage ? 'error' : 'idle'" :error="errorMessage" :disabled="isSubmitting"
                        required>
                        <BaseInput :ref="inputRef" v-bind="inputAttrs" :model-value="field.value" type="email"
                          placeholder="Email" autocomplete="email" rounded="lg" :classes="{
                            input: 'h-12',
                          }" @update:model-value="handleChange" @blur="handleBlur" />
                      </BaseField>
                    </Field>

                    <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="senha">
                      <BaseField v-slot="{ inputAttrs, inputRef }" label="Senha"
                        :state="errorMessage ? 'error' : 'idle'" :error="errorMessage" :disabled="isSubmitting"
                        required>
                        <BaseInput :ref="inputRef" v-bind="inputAttrs" :model-value="field.value" type="password"
                          placeholder="Senha" autocomplete="current-password" rounded="lg" :classes="{
                            input: 'h-12',
                          }" @update:model-value="handleChange" @blur="handleBlur" />
                      </BaseField>
                    </Field>
                  </div>

                  <!-- Links -->
                  <div class="mt-6 flex items-center justify-between">
                    <div class="text-xs leading-5">
                      <button type="button" @click="mode = 'recovery-request'"
                        class="text-primary-600 hover:text-primary-500 font-sans font-medium underline-offset-4 transition duration-150 ease-in-out hover:underline">
                        Esqueci minha senha
                      </button>
                    </div>
                    <div class="text-xs leading-5">
                      <NuxtLink to="/auth/register"
                        class="text-info-600 hover:text-info-500 font-sans font-medium underline-offset-4 transition duration-150 ease-in-out hover:underline">
                        Criar minha conta
                      </NuxtLink>
                    </div>
                  </div>

                  <!-- Submit -->
                  <div class="mt-6">
                    <BaseButton :disabled="isSubmitting" :loading="isSubmitting" type="submit" variant="primary"
                      rounded="lg" class="h-11! w-full">
                      Entrar
                    </BaseButton>
                  </div>
                </form>
              </div>
            </div>

            <!-- MODE: RECOVERY REQUEST -->
            <div v-if="mode === 'recovery-request'" class="mt-8">
              <div class="text-center mb-8">
                <BaseHeading tag="h2" size="2xl" weight="bold" class="text-muted-800 dark:text-white mb-2">
                  Recuperar Senha
                </BaseHeading>
                <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
                  Digite o e-mail associado à sua conta para receber um código de verificação.
                </BaseParagraph>
              </div>

              <div class="space-y-6">
                <BaseField label="Seu e-mail profissional">
                  <BaseInput v-model="recoveryForm.email" type="email" placeholder="email@exemplo.com" rounded="lg"
                    :classes="{ input: 'h-12' }" />
                </BaseField>

                <BaseButton block variant="primary" rounded="lg" class="h-12" :loading="loading" @click="startRecovery">
                  Continuar
                </BaseButton>
              </div>
            </div>

            <!-- MODE: RECOVERY METHOD -->
            <div v-if="mode === 'recovery-method'" class="mt-8">
              <div class="text-center mb-8">
                <BaseHeading tag="h2" size="2xl" weight="bold" class="text-muted-800 dark:text-white mb-2">
                  Escolha o método
                </BaseHeading>
                <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
                  Por onde você prefere receber seu código de segurança?
                </BaseParagraph>
              </div>

              <div class="space-y-4">
                <!-- Email Option -->
                <button
                  class="flex w-full items-center gap-4 p-4 rounded-2xl border-2 border-muted-200 dark:border-muted-800 hover:border-primary-500 dark:hover:border-primary-500 transition-all text-left bg-white dark:bg-muted-950 shadow-sm hover:shadow-md group"
                  @click="sendRecoveryCode('EMAIL')">
                  <div
                    class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 group-hover:bg-primary-500 group-hover:text-white transition-all">
                    <Icon name="ph:envelope-duotone" class="size-6" />
                  </div>
                  <div class="flex-1">
                    <BaseText weight="semibold" class="text-muted-800 dark:text-muted-100 block">Enviar por E-mail
                    </BaseText>
                    <BaseText size="xs" class="text-muted-400">{{ recoveryForm.maskedEmail }}</BaseText>
                  </div>
                  <Icon name="ph:caret-right-bold" class="size-4 text-muted-400" />
                </button>

                <!-- SMS Option -->
                <button v-if="recoveryForm.hasPhone"
                  class="flex w-full items-center gap-4 p-4 rounded-2xl border-2 border-muted-200 dark:border-muted-800 hover:border-primary-500 dark:hover:border-primary-500 transition-all text-left bg-white dark:bg-muted-950 shadow-sm hover:shadow-md group"
                  @click="sendRecoveryCode('SMS')">
                  <div
                    class="flex h-12 w-12 items-center justify-center rounded-xl bg-info-100 dark:bg-info-900/30 text-info-600 dark:text-info-400 group-hover:bg-info-500 group-hover:text-white transition-all">
                    <Icon name="ph:chats-teardrop-duotone" class="size-6" />
                  </div>
                  <div class="flex-1">
                    <BaseText weight="semibold" class="text-muted-800 dark:text-muted-100 block">Enviar por SMS
                    </BaseText>
                    <BaseText size="xs" class="text-muted-400">{{ recoveryForm.maskedPhone }}</BaseText>
                  </div>
                  <Icon name="ph:caret-right-bold" class="size-4 text-muted-400" />
                </button>
              </div>
            </div>

            <!-- MODE: RECOVERY VERIFY / 2FA -->
            <div v-if="mode === 'recovery-verify' || isTwoFactor" class="mt-8">
              <div class="flex flex-col items-center">
                <!-- Icon -->
                <div class="mb-6 flex h-20 items-center justify-center">
                  <TairoCheckAnimated v-if="logged" size="sm" />
                  <div v-else
                    class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
                    <Icon name="ph:shield-check-duotone" class="size-10 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>

                <!-- Header -->
                <div class="mb-8 text-center">
                  <BaseHeading tag="h2" size="2xl" weight="bold" class="text-muted-800 dark:text-white mb-2">
                    Verificação de Segurança
                  </BaseHeading>
                  <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
                    Digite o código de {{ pinLength }} dígitos que enviamos para seu
                    <span class="font-medium text-muted-800 dark:text-muted-100">{{ isTwoFactor ? 'celular' :
                      (recoveryForm.method === 'EMAIL' ? 'e-mail' : 'celular') }}</span>.
                  </BaseParagraph>
                </div>

                <!-- Code Inputs -->
                <div class="flex flex-col items-center w-full">
                  <div class="flex justify-center gap-2 sm:gap-3" :class="logged && 'pointer-events-none'">
                    <input v-for="i in pinLength" :key="`pin${i}`"
                      :ref="(el) => pinInputElements[i] = el as HTMLInputElement" v-focus="i === 1" type="text"
                      maxlength="1"
                      class="dark:bg-muted-800 dark:border-muted-700 h-14 w-10 sm:h-16 sm:w-12 rounded-xl border-2 border-muted-200 bg-white text-center text-3xl font-bold transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                      :value="pinInput[i - 1] !== undefined ? pinInput[i - 1] : ''" placeholder="&bull;"
                      :disabled="logged" @paste.prevent="handlePinPaste" @keydown="(event) => handlePinType(event, i)">
                  </div>

                  <!-- Status -->
                  <div class="mt-10 w-full text-center">
                    <div v-if="loading" class="mb-4 flex items-center justify-center gap-2 text-primary-500">
                      <Icon name="svg-spinners:270-ring-with-bg" class="size-4" />
                      <BaseText size="xs" weight="medium">Verificando segurança...</BaseText>
                    </div>

                    <div v-if="!isTwoFactor" class="flex flex-col items-center gap-1">
                      <BaseText size="xs" class="text-muted-400">Não recebeu o código?</BaseText>
                      <button type="button" @click="sendRecoveryCode(recoveryForm.method)"
                        class="text-primary-600 dark:text-primary-400 font-sans text-sm font-semibold hover:underline">
                        Enviar novo código
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- MODE: RECOVERY RESET -->
            <div v-if="mode === 'recovery-reset'" class="mt-8">
              <div class="text-center mb-8">
                <BaseHeading tag="h2" size="2xl" weight="bold" class="text-muted-800 dark:text-white mb-2">
                  Nova Senha
                </BaseHeading>
                <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
                  Tudo certo! Agora crie uma senha forte para proteger seu acesso.
                </BaseParagraph>
              </div>

              <div class="space-y-4">
                <BaseField label="Nova Senha">
                  <BaseInput v-model="recoveryForm.newPassword" type="password" placeholder="Mínimo 8 caracteres"
                    rounded="lg" :classes="{ input: 'h-12' }" />
                </BaseField>
                <BaseField label="Confirme a Senha">
                  <BaseInput v-model="recoveryForm.confirmPassword" type="password" placeholder="Repita a nova senha"
                    rounded="lg" :classes="{ input: 'h-12' }" />
                </BaseField>

                <div class="pt-4">
                  <BaseButton block variant="primary" rounded="lg" class="h-12" :loading="loading"
                    @click="resetPassword">
                    Alterar Minha Senha
                  </BaseButton>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
/* Remover setas de input number se necessário, mas como é type text não precisa */
</style>
