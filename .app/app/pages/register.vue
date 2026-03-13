<script setup lang="ts">
definePageMeta({
  layout: false,
  title: 'Cadastro de Cliente',
  auth: false,
})

const route = useRoute()
const config = useRuntimeConfig()
const apiBaseUrl = (config.public.apiBase as string || '').replace(/\/$/, '')
const token = computed(() => route.query.token as string)

const isLoading = ref(true)
const isSubmitting = ref(false)
const isSuccess = ref(false)
const declarationCreated = ref(false)
const errorMsg = ref('')
const branding = ref<any>(null)

// CNPJ search state
const isSearchMode = ref(false)
const cnpjInput = ref('')
const isSearching = ref(false)
const searchError = ref('')
const searchResult = ref<any>(null)
const activeToken = ref('')

const form = ref({
  name: '',
  cpf: '',
  phone: '',
  email: '',
  birthDate: '',
})

// CNPJ mask
function maskCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function handleCnpjInput(e: Event) {
  const target = e.target as HTMLInputElement
  cnpjInput.value = maskCnpj(target.value)
}

async function searchByCnpj() {
  searchError.value = ''
  const cleanCnpj = cnpjInput.value.replace(/\D/g, '')
  if (cleanCnpj.length !== 14) { searchError.value = 'Digite um CNPJ válido com 14 dígitos'; return }

  isSearching.value = true
  try {
    const res = await fetch(`${apiBaseUrl}/public/register/search/${cleanCnpj}`)
    const result = await res.json()
    if (result?.success) {
      searchResult.value = result.data
      // Set branding from search result and switch to form mode
      branding.value = {
        tradeName: result.data.tradeName,
        logo: result.data.logo,
        primaryColor: result.data.primaryColor,
      }
      // Update the token so submits go to the right place
      activeToken.value = result.data.token
      isSearchMode.value = false
    }
    else {
      searchError.value = result?.message || 'Empresa não encontrada.'
    }
  }
  catch {
    searchError.value = 'Erro na comunicação. Tente novamente.'
  }
  finally {
    isSearching.value = false
  }
}

// Fetch branding on mount
async function loadBranding() {
  if (!token.value) {
    isSearchMode.value = true
    isLoading.value = false
    return
  }
  activeToken.value = token.value
  try {
    const res = await fetch(`${apiBaseUrl}/public/register/${token.value}`)
    const result = await res.json()
    if (result?.success) {
      branding.value = result.data
    }
    else {
      errorMsg.value = result?.message || 'Link inválido ou desativado.'
    }
  }
  catch {
    errorMsg.value = 'Erro ao carregar formulário. Tente novamente.'
  }
  finally {
    isLoading.value = false
  }
}

onMounted(loadBranding)

// CPF mask
function maskCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function handleCpfInput(e: Event) {
  const target = e.target as HTMLInputElement
  form.value.cpf = maskCpf(target.value)
}

// Phone mask
function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function handlePhoneInput(e: Event) {
  const target = e.target as HTMLInputElement
  form.value.phone = maskPhone(target.value)
}

// Submit
async function handleSubmit() {
  errorMsg.value = ''
  if (!form.value.name.trim()) { errorMsg.value = 'Preencha seu nome completo'; return }
  if (form.value.cpf.replace(/\D/g, '').length !== 11) { errorMsg.value = 'CPF inválido'; return }
  if (!form.value.phone || form.value.phone.replace(/\D/g, '').length < 10) { errorMsg.value = 'Preencha seu telefone'; return }

  isSubmitting.value = true
  try {
    const res = await fetch(`${apiBaseUrl}/public/register/${activeToken.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.value.name.trim(),
        cpf: form.value.cpf,
        phone: form.value.phone.replace(/\D/g, ''),
        email: form.value.email.trim() || undefined,
        birthDate: form.value.birthDate || undefined,
      }),
    })
    const result = await res.json()
    if (result?.success) {
      isSuccess.value = true
      declarationCreated.value = result.data?.declarationCreated || false
    }
    else {
      errorMsg.value = result?.message || 'Erro ao realizar cadastro.'
    }
  }
  catch {
    errorMsg.value = 'Erro na comunicação. Tente novamente.'
  }
  finally {
    isSubmitting.value = false
  }
}

const { applyColors } = useWhitelabel()

const primaryColorName = computed(() => branding.value?.primaryColor || '#6366f1')
const secondaryColorName = computed(() => branding.value?.secondaryColor || 'slate')

// Watch for branding changes and apply colors to the document
watch([primaryColorName, secondaryColorName], () => {
  applyColors(
    primaryColorName.value,
    secondaryColorName.value,
    branding.value?.logo,
    undefined,
    branding.value?.tradeName,
  )
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen bg-muted-50 dark:bg-muted-950 flex flex-col">
    <!-- Header -->
    <header class="border-b border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-900">
      <div class="max-w-lg mx-auto flex items-center justify-center gap-3 py-4 px-4">
        <img v-if="branding?.logo" :src="branding.logo" alt="Logo" class="h-8 w-auto object-contain" />
        <span class="text-sm font-bold text-muted-800 dark:text-white tracking-tight">
          {{ branding?.tradeName || 'Cadastro' }}
        </span>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1 flex items-start justify-center px-4 py-8 md:py-16">
      <div class="w-full max-w-lg">
        <!-- Loading -->
        <div v-if="isLoading" class="text-center py-20">
          <div class="size-10 border-2 border-muted-300 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p class="text-sm text-muted-400">Carregando...</p>
        </div>

        <!-- CNPJ Search (no token) -->
        <div v-else-if="isSearchMode && !branding" class="py-12">
          <div class="text-center mb-8">
            <div
              class="size-16 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center mx-auto mb-4">
              <Icon name="solar:buildings-2-bold-duotone" class="size-8" />
            </div>
            <h1 class="text-2xl font-bold text-muted-800 dark:text-white mb-2">Encontre sua empresa</h1>
            <p class="text-sm text-muted-500 leading-relaxed max-w-sm mx-auto">
              Digite o CNPJ da empresa contábil para se cadastrar como cliente.
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="searchByCnpj">
            <div>
              <label class="block text-xs font-bold text-muted-500 uppercase tracking-wider mb-1.5">CNPJ da
                Empresa</label>
              <input :value="cnpjInput" type="text" placeholder="00.000.000/0000-00" maxlength="18"
                class="w-full rounded-xl border border-muted-200 dark:border-muted-700 bg-white dark:bg-muted-900 px-4 py-3 text-sm text-muted-800 dark:text-muted-200 placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-transparent transition-all"
                @input="handleCnpjInput" />
            </div>

            <div v-if="searchError"
              class="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-600 dark:text-danger-400 text-xs font-medium flex items-center gap-2">
              <Icon name="solar:danger-triangle-bold" class="size-4 shrink-0" />
              {{ searchError }}
            </div>

            <button type="submit"
              class="w-full rounded-xl py-3.5 text-sm font-bold text-white bg-primary-500 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              :disabled="isSearching">
              <Icon v-if="isSearching" name="svg-spinners:ring-resize" class="size-4" />
              <template v-else>
                <Icon name="solar:magnifer-bold" class="size-4" />
                Buscar Empresa
              </template>
            </button>
          </form>
        </div>

        <!-- Error (invalid token) -->
        <div v-else-if="errorMsg && !branding" class="text-center py-20">
          <div
            class="size-16 rounded-full bg-danger-500/10 text-danger-500 flex items-center justify-center mx-auto mb-4">
            <Icon name="solar:close-circle-bold" class="size-8" />
          </div>
          <h2 class="text-lg font-bold text-muted-800 dark:text-white mb-2">Link Inválido</h2>
          <p class="text-sm text-muted-500">{{ errorMsg }}</p>
        </div>

        <!-- Success -->
        <div v-else-if="isSuccess" class="text-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div class="size-20 rounded-full flex items-center justify-center mx-auto mb-6"
            :style="{ backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-500)' }">
            <Icon name="solar:check-circle-bold" class="size-10" />
          </div>
          <h2 class="text-xl font-bold text-muted-800 dark:text-white mb-2">Cadastro Realizado!</h2>
          <p class="text-sm text-muted-500 max-w-sm mx-auto leading-relaxed">
            Seus dados foram enviados para <strong>{{ branding?.tradeName }}</strong>.
            <template v-if="declarationCreated">
              Sua declaração de Imposto de Renda já foi iniciada automaticamente.
            </template>
            <template v-else>
              O escritório entrará em contato em breve para dar continuidade ao seu atendimento.
            </template>
          </p>
        </div>

        <!-- Form -->
        <template v-else-if="branding">
          <div class="mb-8">
            <h1 class="text-2xl font-bold text-muted-800 dark:text-white mb-2">Cadastre-se</h1>
            <p class="text-sm text-muted-500 leading-relaxed">
              Preencha seus dados para se cadastrar em <strong>{{ branding.tradeName }}</strong>.
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <!-- Nome -->
            <div>
              <label class="block text-xs font-bold text-muted-500 uppercase tracking-wider mb-1.5">Nome Completo
                *</label>
              <input v-model="form.name" type="text" placeholder="João da Silva"
                class="w-full rounded-xl border border-muted-200 dark:border-muted-700 bg-white dark:bg-muted-900 px-4 py-3 text-sm text-muted-800 dark:text-muted-200 placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-transparent transition-all" />
            </div>

            <!-- CPF -->
            <div>
              <label class="block text-xs font-bold text-muted-500 uppercase tracking-wider mb-1.5">CPF *</label>
              <input :value="form.cpf" type="text" placeholder="000.000.000-00" maxlength="14"
                class="w-full rounded-xl border border-muted-200 dark:border-muted-700 bg-white dark:bg-muted-900 px-4 py-3 text-sm text-muted-800 dark:text-muted-200 placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-transparent transition-all"
                @input="handleCpfInput" />
            </div>

            <!-- Telefone -->
            <div>
              <label class="block text-xs font-bold text-muted-500 uppercase tracking-wider mb-1.5">Telefone *</label>
              <input :value="form.phone" type="text" placeholder="(00) 00000-0000" maxlength="15"
                class="w-full rounded-xl border border-muted-200 dark:border-muted-700 bg-white dark:bg-muted-900 px-4 py-3 text-sm text-muted-800 dark:text-muted-200 placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-transparent transition-all"
                @input="handlePhoneInput" />
            </div>

            <!-- Email -->
            <div>
              <label class="block text-xs font-bold text-muted-500 uppercase tracking-wider mb-1.5">E-mail</label>
              <input v-model="form.email" type="email" placeholder="joao@email.com"
                class="w-full rounded-xl border border-muted-200 dark:border-muted-700 bg-white dark:bg-muted-900 px-4 py-3 text-sm text-muted-800 dark:text-muted-200 placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-transparent transition-all" />
            </div>

            <!-- Data Nascimento -->
            <div>
              <label class="block text-xs font-bold text-muted-500 uppercase tracking-wider mb-1.5">Data de
                Nascimento</label>
              <input v-model="form.birthDate" type="date"
                class="w-full rounded-xl border border-muted-200 dark:border-muted-700 bg-white dark:bg-muted-900 px-4 py-3 text-sm text-muted-800 dark:text-muted-200 placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-transparent transition-all" />
            </div>

            <!-- Error -->
            <div v-if="errorMsg"
              class="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-600 dark:text-danger-400 text-xs font-medium flex items-center gap-2">
              <Icon name="solar:danger-triangle-bold" class="size-4 shrink-0" />
              {{ errorMsg }}
            </div>

            <!-- Submit -->
            <button type="submit"
              class="w-full rounded-xl py-3.5 text-sm font-bold text-white bg-primary-500 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              :disabled="isSubmitting">
              <Icon v-if="isSubmitting" name="svg-spinners:ring-resize" class="size-4" />
              <template v-else>
                <Icon name="solar:user-plus-bold" class="size-4" />
                Cadastrar
              </template>
            </button>
          </form>

          <p class="text-center text-[10px] text-muted-400 mt-6">
            Seus dados serão utilizados exclusivamente por <strong>{{ branding.tradeName }}</strong>.
          </p>
        </template>
      </div>
    </main>
  </div>
</template>
