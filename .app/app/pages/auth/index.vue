<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useDebounceFn } from '@vueuse/core'
import { Field, useForm } from 'vee-validate'
import { z } from 'zod'
import { API_CONFIG } from '~/utils/config'

definePageMeta({
  layout: 'empty',
  title: 'Entrar ',
  preview: {
    title: 'Entrar',
    description: 'For authentication and sign in',
    categories: ['layouts', 'authentication'],
    src: '/assets/funil/background.jpg',
    srcDark: '/assets/funil/background.jpg',
    order: 152,
  },
})

const VALIDATION_TEXT = {
  EMAIL_REQUIRED: 'Um email válido é obrigatório',
  PASSWORD_REQUIRED: 'Uma senha é obrigatória',
}

// This is the Zod schema for the form input
// It's used to define the shape that the form data will have
const zodSchema = z.object({
  email: z.string().email(VALIDATION_TEXT.EMAIL_REQUIRED),
  senha: z.string().min(1, VALIDATION_TEXT.PASSWORD_REQUIRED),
  trustDevice: z.boolean(),
})

// Zod has a great infer method that will
// infer the shape of the schema into a TypeScript type
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
    // Buscar dados do usuário para verificar o cargo
    try {
      const { data: userData } = await useCustomFetch<any>('/auth/me', {
        method: 'GET',
      })

      // Verificar cargo e redirecionar apropriadamente
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
    return
  }

  // if query first-access true, show toaster
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

    // Se reCAPTCHA é obrigatório mas não conseguiu obter o token
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

// Função para validar código 2FA
async function validateCode(code: string) {
  if (code.length !== codeLength.value)
    return

  loading.value = true

  try {
    console.log('Validando código 2FA:', code)

    const result = await verifyTwoFactor({
      code,
      email: email.value,
      password: password.value,
      recaptchaToken: recaptchaToken.value,
    })

    console.log('Resultado da validação 2FA:', result)

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

    // Login bem-sucedido
    logged.value = true

    // Debug: verificar se o token foi salvo
    console.log('Token após 2FA:', token.value)
    debugCookies()

    // Aguardar um momento para garantir que o token foi salvo
    await new Promise(resolve => setTimeout(resolve, 300))

    // Buscar dados do usuário para verificar o cargo
    try {
      // Verificar se o token existe antes de fazer a chamada
      if (!token.value) {
        console.error('Token não encontrado após 2FA')
        throw new Error('Token não foi salvo corretamente')
      }

      const { data: userData } = await useCustomFetch<any>('/auth/me', {
        method: 'GET',
      })

      console.log('Dados do usuário:', userData)

      // Verificar cargo e redirecionar apropriadamente
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
      // Se falhar, redirecionar para dashboard por padrão
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

// Função para limpar os inputs
function clearInputs() {
  input.value = Array.from({ length: codeLength.value }, () => undefined)
  focusField(1) // Volta o foco para o primeiro campo
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

  // Permite apenas números
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

// Adiciona um debounce no watch para evitar múltiplas chamadas rápidas
const debouncedValidateCode = useDebounceFn((code: string) => {
  validateCode(code)
}, 300)

watch(input, (newValue) => {
  const code = newValue.join('')
  if (code.length === codeLength.value) {
    debouncedValidateCode(code)
  }
}, { deep: true })

// Função para reenviar código 2FA
async function resendCode() {
  try {
    await getRecaptcha()

    console.log('Reenviando código 2FA...')

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

// This is where you would send the form data to the server
const onSubmit = handleSubmit(async (values) => {
  try {
    // Verifica se tem reCAPTCHA disponível
    const { $recaptchaV3 } = useNuxtApp()
    let recaptchaToken = null

    // Só tenta executar reCAPTCHA se estiver configurado como obrigatório
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

      // Se reCAPTCHA é obrigatório mas não conseguiu obter o token
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

    // Login com 2FA obrigatório
    console.log('Tentando login com 2FA obrigatório...')
    const retorno = await login({
      email: values.email,
      password: values.senha,
      recaptchaToken: recaptchaToken || undefined,
    })

    console.log('Resposta do login:', retorno)

    if (retorno.error) {
      toaster.add({
        title: 'Erro',
        description: retorno.message,
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
      return
    }

    // Sempre vai para 2FA
    if ('two_factor' in retorno && retorno.two_factor) {
      email.value = values.email
      password.value = values.senha
      isTwoFactor.value = true

      // Mostrar telefone mascarado se disponível
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

    // Verifica se é erro específico do reCAPTCHA
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
    <div class="dark:bg-muted-800 flex min-h-screen bg-white">
      <div
        class="bg-muted-100 dark:bg-muted-900 relative hidden w-0 flex-1 items-center justify-center lg:flex lg:w-3/5"
      >
        <div class="size-full">
          <img
            src="assets/funil/background.png"
            alt="Integra Flux"
            class="size-full object-cover"
          >
        </div>
      </div>
      <div
        class="relative flex flex-1 flex-col justify-center px-6 py-12 lg:w-2/5 lg:flex-none"
      >
        <div class="dark:bg-muted-800 relative mx-auto w-full max-w-sm bg-white">
          <!-- Nav -->
          <div class="flex w-full items-center justify-between">
            <BaseThemeToggle />
          </div>

          <div v-if="!isTwoFactor">
            <img
              src="/img/logo.png"
              alt="Integra Flux"
              class="mx-auto w-60 dark:hidden"
            >
            <img
              src="/img/logo.png"
              alt="Integra Flux"
              class="mx-auto hidden w-60 dark:block"
            >
          </div>

          <!-- Form section -->
          <div v-if="!isTwoFactor" class="mt-6">
            <div class="mt-5">
              <!-- Form -->
              <form
                method="POST"
                action=""
                class="mt-6"
                novalidate
                @submit.prevent="onSubmit"
              >
                <div class="space-y-4">
                  <Field
                    v-slot="{ field, errorMessage, handleChange, handleBlur }"
                    name="email"
                  >
                    <BaseField
                      v-slot="{ inputAttrs, inputRef }"
                      label="Email"
                      :state="errorMessage ? 'error' : 'idle'"
                      :error="errorMessage"
                      :disabled="isSubmitting"
                      required
                    >
                      <BaseInput
                        :ref="inputRef"
                        v-bind="inputAttrs"
                        :model-value="field.value"
                        type="email"
                        placeholder="Email"
                        autocomplete="email"
                        rounded="lg"
                        :classes="{
                          input: 'h-12',
                        }"
                        @update:model-value="handleChange"
                        @blur="handleBlur"
                      />
                    </BaseField>
                  </Field>

                  <Field
                    v-slot="{ field, errorMessage, handleChange, handleBlur }"
                    name="senha"
                  >
                    <BaseField
                      v-slot="{ inputAttrs, inputRef }"
                      label="Senha"
                      :state="errorMessage ? 'error' : 'idle'"
                      :error="errorMessage"
                      :disabled="isSubmitting"
                      required
                    >
                      <BaseInput
                        :ref="inputRef"
                        v-bind="inputAttrs"
                        :model-value="field.value"
                        type="password"
                        placeholder="Senha"
                        autocomplete="current-password"
                        rounded="lg"
                        :classes="{
                          input: 'h-12',
                        }"
                        @update:model-value="handleChange"
                        @blur="handleBlur"
                      />
                    </BaseField>
                  </Field>
                </div>

                <!-- Remember -->
                <div class="mt-6 flex items-center justify-between">
                  <div class="text-xs leading-5">
                    <NuxtLink
                      to="https://wa.me/551132808396"
                      class="text-primary-600 hover:text-primary-500 font-sans font-medium underline-offset-4 transition duration-150 ease-in-out hover:underline"
                    >
                      Esqueci minha senha
                    </NuxtLink>
                  </div>
                  <div class="text-xs leading-5">
                    <NuxtLink
                      to="/auth/register"
                      class="text-info-600 hover:text-info-500 font-sans font-medium underline-offset-4 transition duration-150 ease-in-out hover:underline"
                    >
                      Criar minha conta
                    </NuxtLink>
                  </div>
                </div>

                <!-- Submit -->
                <div class="mt-6">
                  <div class="block w-full rounded-md shadow-xs">
                    <BaseButton
                      :disabled="isSubmitting"
                      :loading="isSubmitting"
                      type="submit"
                      variant="primary"
                      rounded="lg"
                      class="h-11! w-full"
                    >
                      Entrar
                    </BaseButton>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <!-- 2FA Section -->
          <div v-if="isTwoFactor" class="mt-6">
            <form
              action=""
              method="POST"
              class="mt-6"
              @submit.prevent
            >
              <div>
                <div class="space-y-4">
                  <div class="flex size-full flex-col">
                    <div
                      class="pointer-events-none flex w-full items-center justify-center pt-8"
                    >
                      <div class="flex h-16 items-center justify-center">
                        <TairoCheckAnimated v-if="logged" size="sm" />
                        <BaseIconBox
                          v-else
                          color="primary"
                          size="lg"
                          rounded="full"
                          class="mx-auto"
                        >
                          <Icon
                            name="ph:lock-duotone"
                            class="text-white-500 mx-auto size-8"
                          />
                        </BaseIconBox>
                      </div>
                    </div>
                    <div class="pt-4 text-center">
                      <BaseHeading
                        tag="h2"
                        size="3xl"
                        weight="medium"
                        class="mb-1"
                      >
                        Digite o código
                      </BaseHeading>
                      <BaseParagraph class="text-muted-500 dark:text-muted-400 mb-2">
                        Digite o código que <strong>enviamos para o seu telefone</strong>
                      </BaseParagraph>
                    </div>
                    <div
                      class="text-muted-800 dark:text-muted-100 mx-auto flex h-60 w-72 flex-col rounded text-center"
                    >
                      <div
                        class="flex w-full justify-center gap-3"
                        :class="logged && 'pointer-events-none'"
                      >
                        <input
                          v-for="i in codeLength"
                          :key="`pin${i}`"
                          :ref="
                            (el) => {
                              inputElements[i] = el as HTMLInputElement
                            }
                          "
                          v-focus="i === 1"
                          type="text"
                          :name="`pin${i}`"
                          maxlength="1"
                          class="dark:bg-muted-800 unselectable nui-focus inline w-16 select-none rounded-lg bg-white py-5 text-center text-4xl font-bold transition-all"
                          :value="input[i - 1] !== undefined ? input[i - 1] : '-'"
                          placeholder="0"
                          :disabled="input.length < i - 1 || logged"
                          @paste.prevent="(event) => paste(event)"
                          @keydown="(event) => type(event, i)"
                        >
                      </div>
                      <div class="mt-10">
                        <!-- Um texto indicando que esta verificando o código -->
                        <BaseText
                          v-if="loading"
                          size="sm"
                          class="text-muted-400"
                        >
                          Verificando código, aguarde...
                        </BaseText>

                        <div class="mt-8 flex items-center justify-between">
                          <BaseText
                            size="sm"
                            class="text-muted-400"
                          >
                            Não recebeu?
                          </BaseText>
                          <button
                            type="button"
                            class="text-primary-500 font-sans text-sm underline-offset-4 hover:underline"
                            @click="resendCode"
                          >
                            Enviar novamente
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<style>
.background-video {
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: -1;
}
</style>
