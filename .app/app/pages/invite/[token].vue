<script setup lang="ts">
import { API_CONFIG } from '~/utils/config'

definePageMeta({
  layout: 'empty',
  title: 'Ativar Conta',
})

const route = useRoute()
const router = useRouter()

// Token da URL
const token = computed(() => route.params.token as string)

// Estados
const loading = ref(true)
const submitting = ref(false)
const step = ref<'loading' | 'welcome' | 'password' | 'success' | 'error'>('loading')
const errorType = ref<string>('')
const errorMessage = ref<string>('')

// Dados do convite
const inviteData = ref<{
  user: { id: string; name: string; email: string; phone: string | null }
  role: { id: string; name: string; description: string }
  tenant: { id: string; name: string; tradeName: string | null; logo: string | null; primaryColor: string | null; secondaryColor: string | null }
  expiresAt: string | null
} | null>(null)

// Formulário
const form = ref({
  phone: '',
  password: '',
  confirmPassword: '',
})
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Validação de senha
const passwordValidation = computed(() => ({
  minLength: form.value.password.length >= 8,
  hasNumber: /\d/.test(form.value.password),
  hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(form.value.password),
  matches: form.value.password === form.value.confirmPassword && form.value.confirmPassword.length > 0,
}))

const isPasswordValid = computed(() =>
  passwordValidation.value.minLength &&
  passwordValidation.value.hasNumber &&
  passwordValidation.value.matches
)

// Shades para as cores do whitelabel
const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const

// Aplicar cores do whitelabel dinamicamente
function applyWhitelabelColors(primaryColor: string | null, secondaryColor: string | null) {
  if (!process.client) return

  const root = document.documentElement
  const primary = primaryColor || 'amber'
  const secondary = secondaryColor || 'zinc'

  // Aplicar primary color shades
  for (const shade of shades) {
    root.style.setProperty(
      `--color-primary-${shade}`,
      `var(--color-${primary}-${shade})`
    )
  }

  // Aplicar muted (secondary) color shades
  for (const shade of shades) {
    root.style.setProperty(
      `--color-muted-${shade}`,
      `var(--color-${secondary}-${shade})`
    )
  }
}

// Validar token ao carregar
async function validateToken() {
  loading.value = true
  step.value = 'loading'

  try {
    const baseUrl = API_CONFIG.BASE_URL
    const response = await fetch(`${baseUrl}/auth/invite/${token.value}`)
    const data = await response.json()

    if (data.success) {
      inviteData.value = data.data
      form.value.phone = data.data.user.phone || ''

      // Aplicar whitelabel do tenant ANTES de mostrar o conteúdo
      applyWhitelabelColors(
        data.data.tenant?.primaryColor,
        data.data.tenant?.secondaryColor
      )

      // Pequeno delay para garantir que as cores foram aplicadas
      await new Promise(resolve => setTimeout(resolve, 100))

      step.value = 'welcome'
    } else {
      errorType.value = data.error || 'UNKNOWN'
      errorMessage.value = data.message || 'Erro ao validar convite'
      step.value = 'error'
    }
  } catch (error) {
    console.error('Erro ao validar token:', error)
    errorType.value = 'NETWORK_ERROR'
    errorMessage.value = 'Erro de conexão. Tente novamente.'
    step.value = 'error'
  } finally {
    loading.value = false
  }
}

// Ir para step de senha
function goToPasswordStep() {
  step.value = 'password'
}

// Completar primeiro acesso
async function completeFirstAccess() {
  if (!isPasswordValid.value) return

  submitting.value = true

  try {
    const baseUrl = API_CONFIG.BASE_URL
    const response = await fetch(`${baseUrl}/auth/invite/${token.value}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: form.value.password,
        phone: form.value.phone || undefined,
      }),
    })
    const data = await response.json()

    if (data.success) {
      step.value = 'success'
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        router.push('/auth?firstAccess=true')
      }, 3000)
    } else {
      errorMessage.value = data.message || 'Erro ao ativar conta'
    }
  } catch (error) {
    console.error('Erro ao completar primeiro acesso:', error)
    errorMessage.value = 'Erro de conexão. Tente novamente.'
  } finally {
    submitting.value = false
  }
}

// Formatar telefone
function formatPhone(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  if (cleanValue.length === 11) {
    return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (cleanValue.length === 10) {
    return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return value
}

watch(() => form.value.phone, (newValue) => {
  const cleanValue = newValue.replace(/\D/g, '')
  if (cleanValue.length <= 11) {
    form.value.phone = formatPhone(newValue)
  }
})

// Validar token ao montar
onMounted(() => {
  validateToken()
})
</script>

<template>
  <div class="dark:bg-muted-900 flex min-h-screen bg-white">
    <!-- Side Image -->
    <div class="bg-muted-100 dark:bg-muted-800 relative hidden w-0 flex-1 items-center justify-center lg:flex lg:w-3/5">
      <div class="flex size-full items-center justify-center p-12">
        <!-- Whitelabel: Logo do Tenant -->
        <div v-if="inviteData?.tenant?.logo" class="flex flex-col items-center">
          <img :src="inviteData.tenant.logo" :alt="inviteData.tenant.name" class="max-h-48 max-w-md object-contain" />
        </div>
        <!-- Fallback logo -->
        <!-- <div v-else class="flex flex-col items-center">
          <img src="/img/logo.png" alt="Sistema" class="max-h-40 object-contain dark:hidden" />
          <img src="/img/logo.png" alt="Sistema" class="hidden max-h-40 object-contain dark:block" />
        </div> -->
      </div>
    </div>

    <!-- Content -->
    <div class="relative flex flex-1 flex-col justify-center px-6 py-12 lg:w-2/5 lg:flex-none">
      <div class="dark:bg-muted-800 relative mx-auto w-full max-w-md rounded-2xl bg-white p-8">
        <!-- Loading State -->
        <div v-if="step === 'loading'" class="flex flex-col items-center justify-center py-12">
          <BaseLoader class="mb-4 size-12 text-primary-500" />
          <BaseParagraph class="text-muted-500">Validando seu convite...</BaseParagraph>
        </div>

        <!-- Error State -->
        <div v-else-if="step === 'error'" class="flex flex-col items-center justify-center py-8">
          <div class="bg-danger-100 dark:bg-danger-900/30 mb-4 flex size-20 items-center justify-center rounded-full">
            <Icon :name="errorType === 'TOKEN_EXPIRED' ? 'lucide:clock' : 'lucide:alert-triangle'"
              class="text-danger-500 size-10" />
          </div>
          <BaseHeading as="h3" size="xl" weight="semibold" class="mb-2 text-center">
            {{ errorType === 'TOKEN_EXPIRED' ? 'Link Expirado' : 'Link Inválido' }}
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400 mb-6 text-center">
            {{ errorMessage }}
          </BaseParagraph>
          <BaseButton variant="primary" @click="router.push('/auth')">
            Ir para Login
          </BaseButton>
        </div>

        <!-- Welcome Step -->
        <div v-else-if="step === 'welcome'" class="space-y-6">
          <!-- Mobile Logo -->
          <div class="flex justify-center lg:hidden">
            <img v-if="inviteData?.tenant?.logo" :src="inviteData.tenant.logo" :alt="inviteData?.tenant?.name"
              class="max-h-16 object-contain" />
            <img v-else src="/img/logo.png" alt="Sistema" class="max-h-12 object-contain" />
          </div>

          <!-- Welcome Message -->
          <div class="text-center">
            <div
              class="bg-primary-100 dark:bg-primary-900/30 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
              <Icon name="lucide:party-popper" class="text-primary-500 size-8" />
            </div>
            <BaseHeading as="h2" size="2xl" weight="bold" class="mb-2">
              Bem-vindo, {{ inviteData?.user?.name?.split(' ')[0] }}! 🎉
            </BaseHeading>
            <BaseParagraph class="text-muted-500 dark:text-muted-400">
              Você foi convidado por <strong class="text-primary-500">{{ inviteData?.tenant?.name }}</strong>
              para fazer parte da equipe.
            </BaseParagraph>
          </div>

          <!-- User Info Card -->
          <div class="bg-muted-50 dark:bg-muted-900/50 space-y-4 rounded-xl p-5">
            <div class="flex items-center gap-3">
              <Icon name="lucide:user" class="text-muted-400 size-5" />
              <div>
                <label class="text-muted-400 text-xs">Nome</label>
                <p class="text-muted-800 dark:text-muted-100 font-medium">{{ inviteData?.user?.name }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <Icon name="lucide:mail" class="text-muted-400 size-5" />
              <div>
                <label class="text-muted-400 text-xs">Email</label>
                <p class="text-muted-800 dark:text-muted-100 font-medium">{{ inviteData?.user?.email }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <Icon name="lucide:briefcase" class="text-muted-400 size-5" />
              <div>
                <label class="text-muted-400 text-xs">Cargo</label>
                <p class="text-muted-800 dark:text-muted-100 font-medium">{{ inviteData?.role?.name }}</p>
              </div>
            </div>
          </div>

          <!-- Phone Edit (optional) -->
          <BaseField label="Telefone para verificação">
            <BaseInput v-model="form.phone" placeholder="(00) 00000-0000" maxlength="15" />
            <template #help>
              <span class="text-muted-400 text-xs">Você pode atualizar seu telefone se necessário.</span>
            </template>
          </BaseField>

          <!-- Continue Button -->
          <BaseButton variant="primary" class="w-full" size="lg" @click="goToPasswordStep">
            Continuar
            <Icon name="lucide:arrow-right" class="ml-2 size-5" />
          </BaseButton>
        </div>

        <!-- Password Step -->
        <div v-else-if="step === 'password'" class="space-y-6">
          <!-- Mobile Logo -->
          <div class="flex justify-center lg:hidden">
            <img v-if="inviteData?.tenant?.logo" :src="inviteData.tenant.logo" :alt="inviteData?.tenant?.name"
              class="max-h-16 object-contain" />
            <img v-else src="/img/logo.png" alt="Sistema" class="max-h-12 object-contain" />
          </div>

          <div class="text-center">
            <div
              class="bg-primary-100 dark:bg-primary-900/30 mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
              <Icon name="lucide:lock" class="text-primary-500 size-8" />
            </div>
            <BaseHeading as="h2" size="2xl" weight="bold" class="mb-2">
              Crie sua senha
            </BaseHeading>
            <BaseParagraph class="text-muted-500 dark:text-muted-400">
              Escolha uma senha segura para acessar o sistema.
            </BaseParagraph>
          </div>

          <!-- Password Form -->
          <form @submit.prevent="completeFirstAccess" class="space-y-4">
            <BaseField label="Nova Senha">
              <div class="relative">
                <BaseInput v-model="form.password" :type="showPassword ? 'text' : 'password'"
                  placeholder="Digite sua senha" :disabled="submitting" />
                <button type="button"
                  class="text-muted-400 hover:text-muted-600 absolute right-3 top-1/2 -translate-y-1/2"
                  @click="showPassword = !showPassword">
                  <Icon :name="showPassword ? 'lucide:eye-off' : 'lucide:eye'" class="size-5" />
                </button>
              </div>
            </BaseField>

            <BaseField label="Confirmar Senha">
              <div class="relative">
                <BaseInput v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="Confirme sua senha" :disabled="submitting" />
                <button type="button"
                  class="text-muted-400 hover:text-muted-600 absolute right-3 top-1/2 -translate-y-1/2"
                  @click="showConfirmPassword = !showConfirmPassword">
                  <Icon :name="showConfirmPassword ? 'lucide:eye-off' : 'lucide:eye'" class="size-5" />
                </button>
              </div>
            </BaseField>

            <!-- Password Requirements -->
            <div class="space-y-2">
              <p class="text-muted-500 text-sm font-medium">Requisitos da senha:</p>
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-sm"
                  :class="passwordValidation.minLength ? 'text-success-500' : 'text-muted-400'">
                  <Icon :name="passwordValidation.minLength ? 'lucide:check-circle' : 'lucide:circle'" class="size-4" />
                  Mínimo 8 caracteres
                </div>
                <div class="flex items-center gap-2 text-sm"
                  :class="passwordValidation.hasNumber ? 'text-success-500' : 'text-muted-400'">
                  <Icon :name="passwordValidation.hasNumber ? 'lucide:check-circle' : 'lucide:circle'" class="size-4" />
                  Pelo menos 1 número
                </div>
                <div class="flex items-center gap-2 text-sm"
                  :class="passwordValidation.hasSpecial ? 'text-success-500' : 'text-muted-400'">
                  <Icon :name="passwordValidation.hasSpecial ? 'lucide:check-circle' : 'lucide:circle'"
                    class="size-4" />
                  Caractere especial (opcional)
                </div>
                <div class="flex items-center gap-2 text-sm"
                  :class="passwordValidation.matches ? 'text-success-500' : 'text-muted-400'">
                  <Icon :name="passwordValidation.matches ? 'lucide:check-circle' : 'lucide:circle'" class="size-4" />
                  Senhas coincidem
                </div>
              </div>
            </div>

            <!-- Error message -->
            <div v-if="errorMessage" class="bg-danger-50 dark:bg-danger-900/20 rounded-lg p-3">
              <p class="text-danger-600 dark:text-danger-400 text-sm">{{ errorMessage }}</p>
            </div>

            <!-- Submit -->
            <div class="flex gap-3 pt-4">
              <BaseButton type="button" variant="muted" class="w-1/3" :disabled="submitting" @click="step = 'welcome'">
                <Icon name="lucide:arrow-left" class="mr-1 size-4" />
                Voltar
              </BaseButton>
              <BaseButton type="submit" variant="primary" class="w-2/3" :loading="submitting"
                :disabled="!isPasswordValid || submitting">
                <Icon v-if="!submitting" name="lucide:check" class="mr-2 size-5" />
                {{ submitting ? 'Ativando...' : 'Ativar Minha Conta' }}
              </BaseButton>
            </div>
          </form>
        </div>

        <!-- Success Step -->
        <div v-else-if="step === 'success'" class="flex flex-col items-center justify-center py-8">
          <div class="bg-success-100 dark:bg-success-900/30 mb-4 flex size-20 items-center justify-center rounded-full">
            <Icon name="lucide:check-circle-2" class="text-success-500 size-10" />
          </div>
          <BaseHeading as="h3" size="xl" weight="semibold" class="mb-2 text-center">
            Conta Ativada! 🎉
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400 mb-4 text-center">
            Sua conta foi ativada com sucesso.<br />
            Você será redirecionado para o login em instantes...
          </BaseParagraph>
          <div class="text-primary-500 flex items-center gap-2 text-sm">
            <div class="border-primary-500 size-4 animate-spin rounded-full border-2 border-t-transparent"></div>
            Redirecionando...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
