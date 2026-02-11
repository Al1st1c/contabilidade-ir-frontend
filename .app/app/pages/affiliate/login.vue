<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { Field, useForm } from 'vee-validate'
import { z } from 'zod'

definePageMeta({
  layout: 'empty',
  title: 'Login Afiliado',
})

useSeoMeta({
  title: 'Login Afiliado - Gestor IRPF',
})

const isLoading = ref(false)
const router = useRouter()
const toaster = useNuiToasts()
const { login, verifyTwoFactor } = useAuth()

// Validation Schema
const schema = toTypedSchema(
  z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
  })
)

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: schema,
})

const isTwoFactor = ref(false)
const emailValue = ref('')
const passwordValue = ref('')
const pinInput = ref<Array<number | undefined>>([])
const pinLength = 6
const logged = ref(false)

const onSubmit = handleSubmit(async (values: any) => {
  isLoading.value = true
  try {
    const response = await login(values) as any

    if (response.error) {
      throw new Error(response.message)
    }

    if (response.two_factor) {
      emailValue.value = values.email
      passwordValue.value = values.password
      isTwoFactor.value = true
      pinInput.value = []
      if (response.phone) {
        toaster.add({
          title: 'Código Enviado',
          description: `Código enviado para ${response.phone}`,
          icon: 'ph:check-circle-fill',
        })
      }
      return
    }

    // Direct login (no 2FA)
    if (!response.user?.affiliateProfile) {
      throw new Error('Esta conta não é de um afiliado.')
    }

    toaster.add({
      title: 'Bem-vindo!',
      description: 'Login realizado com sucesso.',
      icon: 'ph:check-circle-fill',
    })

    router.push('/affiliate/dashboard')
  } catch (err: any) {
    console.error(err)
    toaster.add({
      title: 'Erro no login',
      description: err.message || 'Email ou senha inválidos.',
      icon: 'ph:warning-circle-fill',
      color: 'danger',
    })
  } finally {
    isLoading.value = false
  }
})

async function validate2FACode(code: string) {
  isLoading.value = true
  try {
    const result = await verifyTwoFactor({
      code,
      email: emailValue.value,
      password: passwordValue.value,
    }) as any

    if (result.error) {
      pinInput.value = []
      toaster.add({ title: 'Erro', description: result.message, icon: 'ph:warning-circle-fill' })
      return
    }

    if (!result.user?.affiliateProfile) {
      throw new Error('Esta conta não é de um afiliado.')
    }

    logged.value = true
    toaster.add({
      title: 'Bem-vindo!',
      description: 'Login realizado com sucesso.',
      icon: 'ph:check-circle-fill',
    })

    router.push('/affiliate/dashboard')
  } catch (err: any) {
    console.error(err)
    pinInput.value = []
    toaster.add({
      title: 'Erro na verificação',
      description: err.message || 'Código inválido ou expirado.',
      icon: 'ph:warning-circle-fill',
      color: 'danger',
    })
  } finally {
    isLoading.value = false
  }
}

// PIN Watcher
watch(pinInput, (newValue) => {
  const code = newValue.join('')
  if (code.length === pinLength) {
    validate2FACode(code)
  }
}, { deep: true })

const pinInputElements = ref<HTMLInputElement[]>([])

function handlePinType(event: KeyboardEvent, index: number) {
  if (event.code === 'Backspace') {
    event.preventDefault()
    pinInput.value[index - 1] = undefined
    if (index > 1) pinInputElements.value[index - 1]?.focus()
    return
  }
  const key = event.key.replace(/\D/g, '')
  if (key !== '') {
    pinInput.value[index - 1] = Number(key)
    if (index < pinLength) pinInputElements.value[index + 1]?.focus()
  }
}

function handlePinPaste(event: ClipboardEvent) {
  event.preventDefault()
  const pasted = event.clipboardData?.getData('text')?.replace(/\D/g, '')?.substring(0, pinLength)
  if (pasted) {
    pinInput.value = pasted.split('').map(Number)
  }
}
</script>

<template>
  <div class="dark:bg-muted-900 min-h-screen bg-muted-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <BaseHeading tag="h1" size="2xl" weight="bold" class="text-muted-800 dark:text-white mb-2">
          Área do Afiliado
        </BaseHeading>
        <BaseParagraph class="text-muted-500 dark:text-muted-400">
          Acesse seu painel de parceiro
        </BaseParagraph>
      </div>

      <BaseCard class="p-6 md:p-8" rounded="lg">
        <div v-if="!isTwoFactor">
          <form @submit="onSubmit" class="space-y-4">
            <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="email">
              <BaseInput :model-value="field.value" @update:model-value="handleChange" @blur="handleBlur"
                :error="errorMessage" type="email" label="Email" placeholder="seu@email.com" icon="ph:envelope" />
            </Field>

            <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="password">
              <BaseInput :model-value="field.value" @update:model-value="handleChange" @blur="handleBlur"
                :error="errorMessage" type="password" label="Senha" placeholder="******" icon="ph:lock" />
            </Field>

            <div class="pt-4">
              <BaseButton type="submit" color="primary" class="w-full" :loading="isLoading || isSubmitting">
                Entrar
              </BaseButton>
            </div>

            <div class="text-center text-sm text-muted-500 mt-4">
              Não tem conta?
              <NuxtLink to="/affiliate/register" class="text-primary-500 font-medium hover:underline">
                Cadastre-se aqui
              </NuxtLink>
            </div>

            <div class="text-center text-sm text-muted-500 mt-2">
              <NuxtLink to="/auth/recover" class="hover:underline">
                Esqueceu a senha?
              </NuxtLink>
            </div>
          </form>
        </div>

        <!-- 2FA Step -->
        <div v-else class="space-y-6">
          <div class="text-center">
            <div
              class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30 mx-auto mb-4">
              <Icon name="ph:shield-check-duotone" class="size-10 text-primary-600 dark:text-primary-400" />
            </div>
            <BaseHeading tag="h3" size="lg" weight="medium" class="mb-2">Verificação de Segurança</BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500">
              Digite o código de {{ pinLength }} dígitos enviado para seu celular.
            </BaseParagraph>
          </div>

          <div class="flex justify-center gap-2">
            <input v-for="i in pinLength" :key="`pin${i}`" :ref="(el) => pinInputElements[i] = el as HTMLInputElement"
              type="text" maxlength="1"
              class="dark:bg-muted-800 dark:border-muted-700 h-12 w-9 sm:h-14 sm:w-10 rounded-xl border-2 border-muted-200 bg-white text-center text-2xl font-bold transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
              :value="pinInput[i - 1] !== undefined ? pinInput[i - 1] : ''" placeholder="•" :disabled="isLoading"
              @paste.prevent="handlePinPaste" @keydown="(event) => handlePinType(event, i)">
          </div>

          <div class="text-center pt-2">
            <BaseButton variant="ghost" size="sm" @click="isTwoFactor = false" class="text-muted-500">
              <Icon name="ph:arrow-left" class="mr-1" /> Voltar ao login
            </BaseButton>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
