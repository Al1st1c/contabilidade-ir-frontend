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

const VALIDATION_TEXT = {
  EMAIL_REQUIRED: 'Um email válido é obrigatório',
  PASSWORD_REQUIRED: 'Uma senha é obrigatória',
}

const zodSchema = z.object({
  email: z.string().email(VALIDATION_TEXT.EMAIL_REQUIRED),
  senha: z.string().min(1, VALIDATION_TEXT.PASSWORD_REQUIRED),
  trustDevice: z.boolean(),
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

// Verifica se já está autenticado
onMounted(async () => {
  if (isAuthenticated.value) {
    try {
      const { data: userData } = await useCustomFetch<any>('/auth/me', {
        method: 'GET',
      })

      const roleName = userData?.role?.name
      const mobileRoles = ['Operador', 'Caixa', 'Portaria']

      if (mobileRoles.includes(roleName)) {
        router.push('/mobile')
      }
      else {
        router.push('/dashboard')
      }
    }
    catch (error) {
      console.error('Erro ao buscar dados do usuário:', error)
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

// 2FA Variables
const codeLength = ref(4)
const input = ref<Array<number | undefined>>([])
const inputElements = ref<HTMLInputElement[]>([])
const email = ref('')
const password = ref('')
const loading = ref(false)
const logged = ref(false)
const isTwoFactor = ref(false)
const recaptchaToken = ref('')

async function getRecaptcha() {
  const { $recaptchaV3 } = useNuxtApp()

  if ($recaptchaV3 && API_CONFIG.SECURITY.RECAPTCHA_REQUIRED) {
    try {
      recaptchaToken.value = await $recaptchaV3.execute(API_CONFIG.SECURITY.RECAPTCHA_ACTION)
    }
    catch (error) {
      console.error('Erro ao executar reCAPTCHA:', error)
      toaster.add({
        title: 'Ops..',
        description: 'Falha na verificação de segurança. Por favor, tente novamente.',
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
      return
    }

    if (!recaptchaToken.value) {
      toaster.add({
        title: 'Erro',
        description: 'Falha na verificação de segurança. Por favor, tente novamente.',
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
    }
  }
}

async function validateCode(code: string) {
  if (code.length !== codeLength.value)
    return

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
      clearInputs()
      toaster.add({
        title: 'Erro',
        description: result.message,
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
      return
    }

    logged.value = true
    await new Promise(resolve => setTimeout(resolve, 300))

    try {
      if (!token.value) {
        throw new Error('Token não foi salvo corretamente')
      }

      const { data: userData } = await useCustomFetch<any>('/auth/me', {
        method: 'GET',
      })

      const roleName = userData?.role?.name
      const mobileRoles = ['Operador', 'Caixa', 'Portaria']

      if (mobileRoles.includes(roleName)) {
        toaster.add({
          title: 'Sucesso',
          description: `Bem-vindo, ${roleName}!`,
          icon: 'ph:user-circle-fill',
          progress: true,
        })

        setTimeout(() => {
          router.push('/mobile')
        }, 1000)
      }
      else {
        toaster.add({
          title: 'Sucesso',
          description: 'Bem vindo ao seu centro de controle!',
          icon: 'ph:user-circle-fill',
          progress: true,
        })

        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      }
    }
    catch (error) {
      console.error('Erro ao buscar dados do usuário:', error)
      toaster.add({
        title: 'Sucesso',
        description: 'Bem vindo!',
        icon: 'ph:user-circle-fill',
        progress: true,
      })

      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    }
  }
  catch (error) {
    console.error('Erro ao validar código:', error)
    toaster.add({
      title: 'Erro',
      description: 'Ocorreu um erro ao validar o código',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  }
  finally {
    loading.value = false
  }
}

function clearInputs() {
  input.value = Array.from({ length: codeLength.value }, () => undefined)
  focusField(1)
}

function paste(event: ClipboardEvent) {
  event.preventDefault()
  const pasted = event.clipboardData
    ?.getData('text')
    ?.replace(/\D/g, '')
    ?.substring(0, codeLength.value)

  if (pasted) {
    input.value = pasted.split('').map(Number)
  }
}

function type(event: KeyboardEvent, index: number) {
  if (event.code === 'ArrowRight') {
    event.preventDefault()
    nextTick(() => focusField(Math.min(codeLength.value, index + 1)))
    return
  }

  if (event.code === 'ArrowLeft') {
    event.preventDefault()
    nextTick(() => focusField(Math.max(1, index - 1)))
    return
  }

  if (event.code === 'Backspace') {
    event.preventDefault()
    input.value[index - 1] = undefined
    nextTick(() => focusField(Math.max(1, index - 1)))
    return
  }

  const key = event.key.replace(/\D/g, '')
  if (key !== '') {
    input.value[index - 1] = Number(key)
    nextTick(() => focusField(Math.min(codeLength.value, index + 1)))
  }
}

function focusField(n: number) {
  if (!n || n > codeLength.value) {
    n = 1
  }
  if (inputElements.value[n]) {
    inputElements.value[n]?.focus()
  }
}

const debouncedValidateCode = useDebounceFn((code: string) => {
  validateCode(code)
}, 300)

watch(input, (newValue) => {
  const code = newValue.join('')
  if (code.length === codeLength.value) {
    debouncedValidateCode(code)
  }
}, { deep: true })

async function resendCode() {
  try {
    await getRecaptcha()

    const result = await login({
      email: email.value,
      password: password.value,
      recaptchaToken: recaptchaToken.value,
    })

    if (result.error) {
      toaster.add({
        title: 'Erro',
        description: result.message,
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
      return
    }

    toaster.add({
      title: 'Sucesso',
      description: 'Código enviado com sucesso!',
      icon: 'ph:user-circle-fill',
      progress: true,
    })
  }
  catch (error) {
    toaster.add({
      title: 'Erro',
      description: 'Erro ao reenviar código',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  }
}

const onSubmit = handleSubmit(async (values) => {
  try {
    const { $recaptchaV3 } = useNuxtApp()
    let recaptchaToken = null

    if ($recaptchaV3 && API_CONFIG.SECURITY.RECAPTCHA_REQUIRED) {
      try {
        recaptchaToken = await $recaptchaV3.execute(API_CONFIG.SECURITY.RECAPTCHA_ACTION)
      }
      catch (error) {
        console.error('Erro ao executar reCAPTCHA:', error)
        toaster.add({
          title: 'Erro',
          description: 'Falha na verificação de segurança. Por favor, tente novamente.',
          icon: 'ph:warning-circle-fill',
          progress: true,
        })
        return
      }

      if (!recaptchaToken) {
        toaster.add({
          title: 'Erro',
          description: 'Falha na verificação de segurança. Por favor, tente novamente.',
          icon: 'ph:warning-circle-fill',
          progress: true,
        })
        return
      }
    }

    const retorno = await login({
      email: values.email,
      password: values.senha,
      recaptchaToken: recaptchaToken || undefined,
    })

    if (retorno.error) {
      toaster.add({
        title: 'Erro',
        description: retorno.message,
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
      return
    }

    if ('two_factor' in retorno && retorno.two_factor) {
      email.value = values.email
      password.value = values.senha
      isTwoFactor.value = true

      if (retorno.phone) {
        toaster.add({
          title: 'Código Enviado',
          description: `Código enviado para ${retorno.phone}`,
          icon: 'ph:check-circle-fill',
          progress: true,
        })
      }
    }
  }
  catch (error: any) {
    console.error('Erro durante o login:', error)

    const errorMessage = error.message || error.data?.message || ''
    if (errorMessage.includes('reCAPTCHA') || errorMessage.includes('Token do reCAPTCHA')) {
      toaster.add({
        title: 'Erro de Segurança',
        description: 'Falha na verificação de segurança. Por favor, tente novamente.',
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
    }
    else {
      toaster.add({
        title: 'Erro',
        description: 'Dados de acesso inválidos! Verifique seu email e senha.',
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
    }
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

        <!-- Right Column: Login Form -->
        <div class="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-12">
          <div class="mx-auto w-full max-w-md">
            <!-- Nav -->
            <div class="flex w-full items-center justify-between">
              <BaseThemeToggle />
            </div>

            <div v-if="!isTwoFactor">
              <img src="/img/logo.png" alt="Integra Flux" class="mx-auto w-60 dark:hidden">
              <img src="/img/logo-white.png" alt="Integra Flux" class="mx-auto hidden w-60 dark:block">
            </div>

            <!-- Form section -->
            <div v-if="!isTwoFactor" class="mt-6">
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

                  <!-- Remember -->
                  <div class="mt-6 flex items-center justify-between">
                    <div class="text-xs leading-5">
                      <NuxtLink to="https://wa.me/551132808396"
                        class="text-primary-600 hover:text-primary-500 font-sans font-medium underline-offset-4 transition duration-150 ease-in-out hover:underline">
                        Esqueci minha senha
                      </NuxtLink>
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
                    <div class="block w-full rounded-md shadow-xs">
                      <BaseButton :disabled="isSubmitting" :loading="isSubmitting" type="submit" variant="primary"
                        rounded="lg" class="h-11! w-full">
                        Entrar
                      </BaseButton>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <!-- 2FA Section -->
            <div v-if="isTwoFactor" class="mt-8">
              <form action="" method="POST" @submit.prevent>
                <div class="flex flex-col items-center">
                  <div class="mb-6 flex h-20 items-center justify-center">
                    <TairoCheckAnimated v-if="logged" size="sm" />
                    <div v-else
                      class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
                      <Icon name="ph:shield-check-duotone" class="size-10 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>

                  <div class="mb-8 text-center">
                    <BaseHeading tag="h2" size="2xl" weight="bold" class="text-muted-800 dark:text-white mb-2">
                      Verificação de Segurança
                    </BaseHeading>
                    <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
                      Digite o código de 6 dígitos que enviamos para seu <span
                        class="font-medium text-muted-800 dark:text-muted-100">celular</span>.
                    </BaseParagraph>
                  </div>

                  <div class="flex flex-col items-center w-full">
                    <div class="flex justify-center gap-2 sm:gap-3" :class="logged && 'pointer-events-none'">
                      <input v-for="i in codeLength" :key="`pin${i}`" :ref="(el) => {
                        inputElements[i] = el as HTMLInputElement
                      }" v-focus="i === 1" type="text" :name="`pin${i}`" maxlength="1"
                        class="dark:bg-muted-800 dark:border-muted-700 h-14 w-12 sm:h-16 sm:w-14 rounded-xl border-2 border-muted-200 bg-white text-center text-3xl font-bold transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                        :value="input[i - 1] !== undefined ? input[i - 1] : ''" placeholder="&bull;"
                        :disabled="input.length < i - 1 || logged" @paste.prevent="(event) => paste(event)"
                        @keydown="(event) => type(event, i)">
                    </div>

                    <div class="mt-10 w-full text-center">
                      <div v-if="loading" class="mb-4 flex items-center justify-center gap-2 text-primary-500">
                        <Icon name="svg-spinners:270-ring-with-bg" class="size-4" />
                        <BaseText size="xs" weight="medium">Verificando segurança...</BaseText>
                      </div>

                      <div class="flex flex-col items-center gap-1">
                        <BaseText size="xs" class="text-muted-400">Não recebeu o código?</BaseText>
                        <button type="button"
                          class="text-primary-600 dark:text-primary-400 font-sans text-sm font-semibold hover:underline"
                          @click="resendCode">
                          Enviar novo código
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>
