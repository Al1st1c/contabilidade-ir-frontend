<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { useApi } from '~/composables/useAuth'

const emit = defineEmits(['close', 'saved'])
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

// Wizard state
const currentStep = ref(1)
const isSaving = ref(false)

// Step 1: Client Selection
const isLoadingClients = ref(false)
const clientSearch = ref('')
const searchResults = ref<any[]>([])
const recentClients = ref<any[]>([])
const selectedClient = ref<any>(null)
const showNewClientForm = ref(false)
const activeResultIndex = ref(-1)
const isConsultingCpf = ref(false)

const newClientData = ref({
  name: '',
  cpf: '',
  phone: '',
  email: '',
})

// Step 2: Service Configuration
const teamMembers = ref<any[]>([])
const isLoadingTeam = ref(false)

const serviceData = ref({
  taxYear: new Date().getFullYear(),
  priority: 'medium' as 'low' | 'medium' | 'high',
  declarationType: 'complete' as 'simplified' | 'complete',
  serviceValue: 0,
  assignedToId: '',
  description: '',
})

// Step 3: Generated Link
const generatedLink = ref('')
const isLoadingTemplate = ref(false)
const checklistDraft = ref<any[]>([])
const newChecklistItemTitle = ref('')
const templateLoaded = ref(false)

// Masks
const masks = ref(['999.999.999-99'])
const phoneMask = ref(['(99) 99999-9999'])

const selectedClientName = computed(() => {
  const name = selectedClient.value?.name || newClientData.value?.name || ''
  return name.trim() || 'Cliente'
})

const selectedClientFirstName = computed(() => {
  const name = selectedClientName.value
  return name.split(' ').filter(Boolean)[0] || name
})

const selectedClientPhone = computed(() => {
  return selectedClient.value?.phone || selectedClient.value?.whatsapp || newClientData.value?.phone || ''
})

const selectedClientEmail = computed(() => {
  return selectedClient.value?.email || newClientData.value?.email || ''
})

const checklistTotals = computed(() => {
  const total = checklistDraft.value.length
  const required = checklistDraft.value.filter(i => i.isRequired).length
  return { total, required }
})

const assignedMember = computed(() => {
  return teamMembers.value.find((m: any) => m.id === serviceData.value.assignedToId) || null
})

function getDigits(value: string) {
  return (value || '').replace(/\D/g, '')
}

function resetNewClientForm() {
  newClientData.value = {
    name: '',
    cpf: '',
    phone: '',
    email: '',
  }
}

// Search clients with debounce
const debouncedSearch = useDebounceFn(async (query: string) => {
  const trimmed = (query || '').trim()
  if (!trimmed || trimmed.length < 3) {
    searchResults.value = []
    activeResultIndex.value = -1
    return
  }

  isLoadingClients.value = true
  try {
    const { data } = await useCustomFetch<any>('/clients', {
      query: { search: trimmed, limit: 10 },
    })
    if (data.success) {
      searchResults.value = data.data
      activeResultIndex.value = data.data?.length ? 0 : -1
    }
  }
  catch (error) {
    console.error('Erro ao buscar clientes:', error)
  }
  finally {
    isLoadingClients.value = false
  }
}, 300)

watch(clientSearch, (newValue) => {
  if (selectedClient.value) {
    return
  }
  if (showNewClientForm.value) {
    return
  }
  debouncedSearch(newValue)
  showNewClientForm.value = false // Hide new client form when typing
})

function selectClient(client: any) {
  selectedClient.value = client
  searchResults.value = []
  clientSearch.value = ''
  activeResultIndex.value = -1
}

function showRegisterForm() {
  showNewClientForm.value = true
  selectedClient.value = null
  searchResults.value = []
  clientSearch.value = ''
  activeResultIndex.value = -1
}

function backToSearch() {
  showNewClientForm.value = false
  resetNewClientForm()
  fetchRecentClients()
}

function clearSelectedClient() {
  selectedClient.value = null
  clientSearch.value = ''
  searchResults.value = []
  activeResultIndex.value = -1
}

async function fetchRecentClients() {
  try {
    const { data } = await useCustomFetch<any>('/clients', {
      query: { limit: 5, sortBy: 'updatedAt', sortOrder: 'desc' },
    })
    if (data.success) {
      recentClients.value = data.data || []
    }
  }
  catch (error) {
    console.error('Erro ao buscar clientes recentes:', error)
  }
}

async function fetchChecklistTemplate() {
  if (templateLoaded.value)
    return
  isLoadingTemplate.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/declarations/templates')
    if (response?.success) {
      checklistDraft.value = (response.data || []).map((item: any) => ({
        title: item.title || '',
        description: item.description || '',
        isRequired: item.isRequired ?? true,
      }))
      templateLoaded.value = true
    }
  }
  catch (error) {
    console.error('Erro ao buscar template do checklist:', error)
  }
  finally {
    isLoadingTemplate.value = false
  }
}

function addChecklistItem() {
  const title = (newChecklistItemTitle.value || '').trim()
  if (!title)
    return
  checklistDraft.value.push({
    title,
    description: '',
    isRequired: true,
  })
  newChecklistItemTitle.value = ''
}

function removeChecklistItem(index: number) {
  checklistDraft.value.splice(index, 1)
}

function buildChecklistSyncItems() {
  return checklistDraft.value
    .map((item: any) => ({
      title: (item.title || '').trim(),
      description: (item.description || '').trim(),
      isRequired: item.isRequired ?? true,
      status: 'pending',
    }))
    .filter((item: any) => item.title)
}

async function consultCpf() {
  const cpf = getDigits(newClientData.value.cpf)
  if (cpf.length !== 11) {
    toaster.add({
      title: 'Atenção',
      description: 'Informe um CPF válido (11 dígitos) para consultar',
      icon: 'ph:warning-circle-fill',
    })
    return
  }

  isConsultingCpf.value = true
  try {
    const { data } = await useCustomFetch<any>('/clients/consult-cpf', {
      method: 'POST',
      body: { cpf },
    })

    if (data?.success && data?.alreadyExists && data?.data?.id) {
      selectClient({
        ...data.data,
        cpf: data.data.cpf?.length === 11
          ? data.data.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
          : data.data.cpf,
      })
      showNewClientForm.value = false
      resetNewClientForm()
      toaster.add({
        title: 'Cliente encontrado',
        description: 'Cliente já está cadastrado. Seleção aplicada.',
        icon: 'ph:check-circle-fill',
        duration: 3500,
      })
      return
    }

    if (data?.success && data?.data) {
      newClientData.value.name = data.data.name || newClientData.value.name
      newClientData.value.cpf = data.data.cpf || newClientData.value.cpf
      newClientData.value.phone = data.data.phone || newClientData.value.phone
      toaster.add({
        title: 'CPF consultado',
        description: 'Dados preenchidos automaticamente.',
        icon: 'ph:check-circle-fill',
        duration: 3500,
      })
      return
    }

    toaster.add({
      title: 'Atenção',
      description: data?.message || 'Não foi possível consultar o CPF',
      icon: 'ph:warning-circle-fill',
    })
  }
  catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error?.message || 'Erro ao consultar CPF',
      icon: 'ph:warning-circle-fill',
    })
  }
  finally {
    isConsultingCpf.value = false
  }
}

function handleSearchKeydown(event: KeyboardEvent) {
  if (isLoadingClients.value)
    return
  if (!searchResults.value?.length)
    return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeResultIndex.value = Math.min(
      activeResultIndex.value + 1,
      searchResults.value.length - 1,
    )
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeResultIndex.value = Math.max(activeResultIndex.value - 1, 0)
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    const client = searchResults.value[activeResultIndex.value]
    if (client)
      selectClient(client)
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    clientSearch.value = ''
    searchResults.value = []
    activeResultIndex.value = -1
  }
}

// Fetch team members for Step 2
async function fetchTeamMembers() {
  isLoadingTeam.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant/members')
    if (data.success) {
      teamMembers.value = data.data
      // Auto-select current user if not set
      if (!serviceData.value.assignedToId && teamMembers.value.length > 0) {
        serviceData.value.assignedToId = teamMembers.value[0].id
      }
    }
  }
  catch (error) {
    console.error('Erro ao buscar equipe:', error)
  }
  finally {
    isLoadingTeam.value = false
  }
}

// Navigation
function goToStep2() {
  if (!selectedClient.value && !showNewClientForm.value) {
    toaster.add({
      title: 'Atenção',
      description: 'Selecione um cliente ou cadastre um novo',
      icon: 'ph:warning-circle-fill',
    })
    return
  }

  if (showNewClientForm.value) {
    if (!newClientData.value.name || !newClientData.value.cpf) {
      toaster.add({
        title: 'Atenção',
        description: 'Preencha nome e CPF do novo cliente',
        icon: 'ph:warning-circle-fill',
      })
      return
    }

    if (getDigits(newClientData.value.cpf).length !== 11) {
      toaster.add({
        title: 'Atenção',
        description: 'Informe um CPF válido (11 dígitos)',
        icon: 'ph:warning-circle-fill',
      })
      return
    }
  }

  currentStep.value = 2
  fetchTeamMembers()
}

function goToStep3() {
  if (!serviceData.value.serviceValue || serviceData.value.serviceValue <= 0) {
    toaster.add({
      title: 'Atenção',
      description: 'Informe o valor do honorário',
      icon: 'ph:warning-circle-fill',
    })
    return
  }

  currentStep.value = 3
  fetchChecklistTemplate()
}

function goBack() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// Final submission
async function createDeclaration() {
  isSaving.value = true
  try {
    const payload: any = {
      ...serviceData.value,
    }

    if (selectedClient.value) {
      payload.clientId = selectedClient.value.id
    }
    else if (showNewClientForm.value) {
      payload.newClientData = newClientData.value
    }

    const { data } = await useCustomFetch<any>('/declarations', {
      method: 'POST',
      body: payload,
    })

    if (data.success) {
      if (templateLoaded.value) {
        const items = buildChecklistSyncItems()
        await useCustomFetch<any>(`/declarations/${data.data.id}/checklist/sync`, {
          method: 'POST',
          body: { items },
        })
      }

      // Immediately generate collection link
      const linkResponse = await useCustomFetch<any>(`/declarations/${data.data.id}/collection-link`, {
        method: 'POST',
      })

      if (linkResponse.data.success) {
        generatedLink.value = `${window.location.origin}${linkResponse.data.data.url}`

        // Auto-copy to clipboard (silently ignore if blocked)
        try {
          await navigator.clipboard.writeText(generatedLink.value)
          toaster.add({
            title: 'Sucesso!',
            description: 'Declaração criada e link copiado para área de transferência',
            icon: 'ph:check-circle-fill',
            duration: 4000,
          })
        } catch {
          // Clipboard blocked - just show success without copy confirmation
          toaster.add({
            title: 'Sucesso!',
            description: 'Declaração criada com sucesso',
            icon: 'ph:check-circle-fill',
            duration: 4000,
          })
        }
      }

      // Emit saved to refresh Kanban
      emit('saved')
    }
  }
  catch (error: any) {
    console.log(error)
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao criar declaração',
      icon: 'ph:warning-circle-fill',
    })
  }
  finally {
    isSaving.value = false
  }
}

function copyLinkAgain() {
  if (generatedLink.value) {
    window.navigator.clipboard.writeText(generatedLink.value)
  }
}

function openGeneratedLink() {
  if (generatedLink.value) {
    window.open(generatedLink.value, '_blank', 'noopener,noreferrer')
  }
}

function shareOnWhatsapp() {
  if (generatedLink.value) {
    const message = `Segue o link para envio de documentos do IR: ${generatedLink.value}`
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

const stepTitles = ['Selecionar Cliente', 'Dados do IR', 'Revisão e Link']

onMounted(() => {
  fetchRecentClients()
})
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-800 dark:bg-muted-950 border-l bg-white w-full max-w-2xl shadow-2xl">
    <!-- Header -->
    <div class="border-muted-200 dark:border-muted-800 flex h-20 w-full items-center justify-between border-b px-8">
      <div>
        <BaseHeading as="h3" size="sm" weight="medium"
          class="text-muted-800 dark:text-muted-100 uppercase tracking-wider">
          Novo Imposto de Renda
        </BaseHeading>
        <BaseParagraph size="xs" class="text-muted-400 mt-1">
          Etapa {{ currentStep }} de 3: {{ stepTitles[currentStep - 1] }}
        </BaseParagraph>
      </div>
      <button type="button"
        class="text-muted-500 rounded-full p-2 hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors"
        @click="() => $emit('close')">
        <Icon name="lucide:x" class="size-5" />
      </button>
    </div>

    <!-- Progress Stepper -->
    <div class="px-8 py-4 border-b border-muted-200 dark:border-muted-800 bg-muted-50/50 dark:bg-muted-950/50">
      <div class="flex items-center justify-between">
        <div v-for="(title, idx) in stepTitles" :key="idx" class="flex items-center flex-1">
          <div class="flex items-center gap-2 flex-1">
            <div class="size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all" :class="[
              currentStep > idx + 1 ? 'bg-success-500 text-white'
                : currentStep === idx + 1 ? 'bg-primary-500 text-white'
                  : 'bg-muted-200 text-muted-400 dark:bg-muted-800',
            ]">
              <Icon v-if="currentStep > idx + 1" name="lucide:check" class="size-4" />
              <span v-else>{{ idx + 1 }}</span>
            </div>
            <span class="text-xs font-medium hidden md:inline"
              :class="currentStep === idx + 1 ? 'text-primary-600 dark:text-primary-400' : 'text-muted-500'">
              {{ title }}
            </span>
          </div>
          <div v-if="idx < stepTitles.length - 1" class="h-0.5 w-full mx-2"
            :class="currentStep > idx + 1 ? 'bg-success-500' : 'bg-muted-200 dark:bg-muted-800'" />
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="nui-slimscroll h-[calc(100dvh-200px)] overflow-y-auto p-8">
      <!-- Step 1: Client Selection -->
      <div v-if="currentStep === 1" class="space-y-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-900 dark:text-muted-100">
              Cliente
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-400 mt-1">
              Busque e selecione um cliente, ou cadastre um novo
            </BaseParagraph>
          </div>
          <BaseButton v-if="!showNewClientForm && !generatedLink" size="sm" variant="primary" @click="showRegisterForm">
            <Icon name="lucide:user-plus" class="size-4 mr-2" />
            Novo cliente
          </BaseButton>
        </div>

        <div v-if="selectedClient && !showNewClientForm" class="space-y-3">
          <BaseCard rounded="lg" class="p-5 border-muted-200 dark:border-muted-800 shadow-none">
            <div class="flex items-start gap-4">
              <BaseAvatar :src="selectedClient.photoUrl" :text="selectedClient.name?.charAt(0)?.toUpperCase()" size="md"
                class="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400" />
              <div class="flex-1 min-w-0">
                <BaseHeading as="h5" size="sm" weight="medium" class="truncate">
                  {{ selectedClient.name }}
                </BaseHeading>
                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <BaseParagraph size="xs" class="text-muted-500 font-mono">
                    {{ selectedClient.cpf }}
                  </BaseParagraph>
                  <BaseParagraph v-if="selectedClient.email" size="xs" class="text-muted-400 truncate">
                    {{ selectedClient.email }}
                  </BaseParagraph>
                  <BaseParagraph v-if="selectedClient.phone" size="xs" class="text-muted-400">
                    {{ selectedClient.phone }}
                  </BaseParagraph>
                </div>
                <div class="mt-3 flex items-center gap-2">
                  <span
                    class="text-[11px] px-2 py-1 rounded-full bg-muted-100 dark:bg-muted-900 text-muted-600 dark:text-muted-400">
                    {{ selectedClient.declarationsCount || 0 }} IRs
                  </span>
                  <span v-if="selectedClient.onboardingCompleted"
                    class="text-[11px] px-2 py-1 rounded-full bg-success-500/10 text-success-700 dark:text-success-400">
                    Onboarding ok
                  </span>
                  <span v-else
                    class="text-[11px] px-2 py-1 rounded-full bg-warning-500/10 text-warning-700 dark:text-warning-400">
                    Onboarding pendente
                  </span>
                </div>
              </div>
              <BaseButton size="sm" @click="clearSelectedClient">
                Trocar
              </BaseButton>
            </div>
          </BaseCard>
        </div>

        <div v-else-if="!showNewClientForm" class="space-y-3">
          <BaseField label="Buscar cliente">
            <BaseInput v-model="clientSearch" placeholder="Nome, CPF, e-mail ou telefone..." icon="ph:magnifying-glass"
              autocomplete="off" @keydown="handleSearchKeydown" />
            <p class="text-xs text-muted-400 mt-1">
              Dica: cole o CPF sem se preocupar com pontos e traços
            </p>
          </BaseField>
        </div>

        <!-- Loading State for Search -->
        <div v-if="isLoadingClients" class="flex flex-col items-center justify-center py-6">
          <BaseLoader class="mb-2 size-8 text-primary-500" />
          <BaseParagraph size="xs" class="text-muted-400">
            Buscando clientes...
          </BaseParagraph>
        </div>

        <!-- Search Results -->
        <div v-if="searchResults.length > 0 && !isLoadingClients && !selectedClient && !showNewClientForm"
          class="space-y-2">
          <div class="flex items-center justify-between">
            <BaseParagraph size="xs" class="text-muted-500 uppercase tracking-wider font-medium">
              Resultados
            </BaseParagraph>
            <BaseParagraph size="xs" class="text-muted-400">
              Use ↑ ↓ e Enter
            </BaseParagraph>
          </div>
          <div class="space-y-2">
            <button v-for="(client, idx) in searchResults" :key="client.id" type="button"
              class="w-full p-4 rounded-lg border transition-all text-left" :class="[
                idx === activeResultIndex
                  ? 'border-primary-500 bg-primary-500/5'
                  : 'border-muted-200 dark:border-muted-800 hover:border-primary-500/50',
              ]" @click="selectClient(client)">
              <div class="flex items-center gap-3">
                <BaseAvatar :src="client.photoUrl" :text="client.name?.charAt(0)?.toUpperCase()" size="xs"
                  class="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400" />
                <div class="flex-1">
                  <BaseParagraph size="sm" weight="medium">
                    {{ client.name }}
                  </BaseParagraph>
                  <div class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <BaseParagraph size="xs" class="text-muted-400 font-mono">
                      {{ client.cpf }}
                    </BaseParagraph>
                    <BaseParagraph v-if="client.email" size="xs" class="text-muted-400 truncate">
                      {{ client.email }}
                    </BaseParagraph>
                    <BaseParagraph v-if="client.phone" size="xs" class="text-muted-400">
                      {{ client.phone }}
                    </BaseParagraph>
                  </div>
                </div>
                <span
                  class="text-[11px] px-2 py-1 rounded-full bg-muted-100 dark:bg-muted-900 text-muted-600 dark:text-muted-400">
                  {{ client.declarationsCount || 0 }} IRs
                </span>
              </div>
            </button>
          </div>
        </div>

        <!-- Recent Clients -->
        <div
          v-if="!clientSearch && recentClients.length > 0 && !isLoadingClients && !selectedClient && !showNewClientForm"
          class="space-y-2">
          <BaseParagraph size="xs" class="text-muted-500 uppercase tracking-wider font-medium">
            Recentes
          </BaseParagraph>
          <div class="space-y-2">
            <button v-for="client in recentClients" :key="client.id" type="button"
              class="w-full p-4 rounded-lg border border-muted-200 dark:border-muted-800 hover:border-primary-500/50 transition-all text-left"
              @click="selectClient(client)">
              <div class="flex items-center gap-3">
                <BaseAvatar :src="client.photoUrl" :text="client.name?.charAt(0)?.toUpperCase()" size="xs"
                  class="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400" />
                <div class="flex-1">
                  <BaseParagraph size="sm" weight="medium">
                    {{ client.name }}
                  </BaseParagraph>
                  <BaseParagraph size="xs" class="text-muted-400 font-mono">
                    {{ client.cpf }}
                  </BaseParagraph>
                </div>
                <span
                  class="text-[11px] px-2 py-1 rounded-full bg-muted-100 dark:bg-muted-900 text-muted-600 dark:text-muted-400">
                  {{ client.declarationsCount || 0 }} IRs
                </span>
              </div>
            </button>
          </div>
        </div>

        <!-- No Results / Register New -->
        <div
          v-if="clientSearch && clientSearch.trim().length >= 3 && searchResults.length === 0 && !isLoadingClients && !showNewClientForm && !selectedClient"
          class="text-center py-8 border-2 border-dashed border-muted-200 dark:border-muted-800 rounded-xl">
          <Icon name="lucide:search-x" class="size-12 text-muted-300 mx-auto mb-3" />
          <BaseParagraph size="sm" class="text-muted-500 mb-4">
            Nenhum cliente encontrado
          </BaseParagraph>
          <BaseButton size="sm" variant="primary" @click="showRegisterForm">
            <Icon name="lucide:user-plus" class="size-4 mr-2" />
            Cadastrar Novo Cliente
          </BaseButton>
        </div>

        <!-- New Client Form (Expanded Inline) -->
        <div v-if="showNewClientForm" class="space-y-4 p-6 bg-primary-500/5 border border-primary-500/20 rounded-xl">
          <div class="flex items-center gap-2 mb-4">
            <Icon name="lucide:user-plus" class="size-5 text-primary-600" />
            <BaseHeading as="h4" size="sm" weight="medium" class="text-primary-700 dark:text-primary-400">
              Cadastrar Novo Cliente
            </BaseHeading>
          </div>

          <BaseField label="Nome Completo *">
            <BaseInput v-model="newClientData.name" placeholder="Ex: João da Silva" icon="ph:user" />
          </BaseField>

          <div class="grid grid-cols-2 gap-4">
            <BaseField label="CPF *">
              <BaseInput v-model="newClientData.cpf" v-maska="masks" placeholder="000.000.000-00"
                icon="ph:identification-card" />
              <div class="mt-2 flex justify-end">
                <BaseButton size="sm" :loading="isConsultingCpf" @click="consultCpf">
                  <Icon name="lucide:scan-search" class="size-4 mr-2" />
                  Consultar CPF
                </BaseButton>
              </div>
            </BaseField>

            <BaseField label="Telefone/WhatsApp">
              <BaseInput v-model="newClientData.phone" v-maska="phoneMask" placeholder="(00) 00000-0000"
                icon="ph:phone" />
            </BaseField>
          </div>

          <BaseField label="E-mail (Opcional)">
            <BaseInput v-model="newClientData.email" placeholder="cliente@exemplo.com" icon="ph:envelope" />
          </BaseField>

          <div class="flex items-center justify-between pt-2">
            <BaseButton size="sm" @click="backToSearch">
              Voltar para busca
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Step 2: Service Configuration -->
      <div v-else-if="currentStep === 2" class="space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <BaseField label="Exercício" class="z-30">
            <BaseSelect v-model="serviceData.taxYear" icon="ph:calendar">
              <BaseSelectItem v-for="year in [2026, 2025, 2024]" :key="year" :value="year">
                IR {{ year }} (Ano-C {{ year - 1 }})
              </BaseSelectItem>
            </BaseSelect>
          </BaseField>

          <BaseField label="Prioridade" class="z-30">
            <BaseSelect v-model="serviceData.priority" icon="ph:flag">
              <BaseSelectItem value="low">
                Baixa
              </BaseSelectItem>
              <BaseSelectItem value="medium">
                Média
              </BaseSelectItem>
              <BaseSelectItem value="high">
                Alta
              </BaseSelectItem>
            </BaseSelect>
          </BaseField>
        </div>

        <BaseField label="Honorários (R$) *">
          <BaseInput v-model.number="serviceData.serviceValue" type="number" step="0.01" placeholder="350.00"
            icon="lucide:dollar-sign" />
          <p class="text-xs text-muted-400 mt-1">
            Valor a ser cobrado pelo serviço
          </p>
        </BaseField>

        <BaseField label="Responsável" class="z-20">
          <BaseSelect v-model="serviceData.assignedToId" icon="ph:user-circle" placeholder="Selecione o responsável...">
            <BaseSelectItem v-for="member in teamMembers" :key="member.id" :value="member.id" class="py-2">
              <div class="flex items-center gap-2">
                <BaseAvatar :src="member.photo" :text="member.name.charAt(0).toUpperCase()" size="xs"
                  class="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400" />
                <div class="flex flex-col">
                  <span class="font-medium text-xs">{{ member.name }}</span>
                  <span class="text-[10px] text-muted-500">{{ member.role?.name }}</span>
                </div>
              </div>
            </BaseSelectItem>
          </BaseSelect>
        </BaseField>

        <!-- <BaseField label="Tipo de IR">
          <div class="flex gap-6 mt-2">
            <BaseRadioGroup v-model="serviceData.declarationType">
              <BaseRadio value="complete" label="Completa" color="primary" />
              <BaseRadio value="simplified" label="Simplificada" color="primary" />
            </BaseRadioGroup>
          </div>
        </BaseField> -->

        <BaseField label="Observações Iniciais">
          <BaseTextarea v-model="serviceData.description" rows="3" placeholder="Ex: Aguardando informe do banco X..." />
        </BaseField>
      </div>

      <!-- Step 3: Resumo e Checklist -->
      <div v-if="currentStep === 3" class="space-y-6">
        <div class="flex items-center gap-4 p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl">
          <div class="size-12 rounded-full bg-primary-500/10 flex items-center justify-center shrink-0">
            <Icon name="lucide:info" class="size-6 text-primary-600" />
          </div>
          <div>
            <BaseHeading as="h4" size="sm" weight="medium" class="text-primary-800 dark:text-primary-400">
              Pronto para iniciar!
            </BaseHeading>
            <BaseParagraph size="xs" class="text-primary-700/70 dark:text-primary-500/70">
              Ao confirmar, enviaremos automaticamente um <b>SMS e E-mail</b> para <b>{{ selectedClientName }}</b> com o
              link de acesso seguro para envio dos documentos.
            </BaseParagraph>
          </div>
        </div>

        <!-- Checklist Editável -->
        <BaseCard rounded="lg"
          class="p-5 border-muted-200 dark:border-muted-800 shadow-none bg-muted-50/30 dark:bg-muted-950/30">
          <div class="flex items-center justify-between mb-4">
            <div>
              <BaseHeading as="h4" size="sm" weight="medium">
                Checklist de Documentos
              </BaseHeading>
              <BaseParagraph size="xs" class="text-muted-400">
                Personalize o que o cliente deve enviar agora
              </BaseParagraph>
            </div>
            <div class="flex items-center gap-2">
              <BaseTag rounded="full" color="primary">
                {{ checklistTotals.total }} itens
              </BaseTag>
            </div>
          </div>

          <div class="space-y-4">
            <!-- Add new item input -->
            <div class="flex gap-2">
              <BaseInput v-model="newChecklistItemTitle" placeholder="Adicionar novo documento necessário..." size="sm"
                class="flex-1" @keydown.enter.prevent="addChecklistItem" />
              <BaseButton size="sm" @click="addChecklistItem">
                <Icon name="lucide:plus" class="size-4 mr-1" />
                Add
              </BaseButton>
            </div>

            <div class="space-y-2 max-h-[350px] overflow-y-auto nui-slimscroll pr-2">
              <div v-if="checklistDraft.length === 0"
                class="text-center py-10 border-2 border-dashed border-muted-200 dark:border-muted-800 rounded-2xl">
                <Icon name="lucide:clipboard-list" class="size-10 text-muted-300 mb-2 mx-auto" />
                <p class="text-xs text-muted-500">
                  Nenhum item definido. O cliente não terá o que enviar.
                </p>
              </div>

              <div v-for="(item, idx) in checklistDraft" :key="idx"
                class="group flex items-start gap-3 p-3 rounded-xl border border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-950 hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md">
                <div
                  class="flex items-center justify-center size-6 rounded-lg bg-muted-100 dark:bg-muted-800 text-[10px] font-bold text-muted-500 shrink-0 mt-0.5">
                  {{ idx + 1 }}
                </div>

                <div class="flex-1 min-w-0">
                  <input v-model="item.title"
                    class="w-full bg-transparent text-sm font-semibold focus:outline-none border-b border-transparent focus:border-primary-500 text-muted-800 dark:text-muted-100"
                    placeholder="Nome do documento">
                  <input v-model="item.description"
                    class="w-full bg-transparent text-[11px] text-muted-500 focus:outline-none mt-1"
                    placeholder="Instruções curtas (ex: 'Pode ser PDF ou foto')">
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  <div
                    class="flex items-center gap-1.5 cursor-pointer select-none py-1 px-2 rounded-lg hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors"
                    @click="item.isRequired = !item.isRequired">
                    <div class="size-4 rounded border flex items-center justify-center transition-colors"
                      :class="item.isRequired ? 'bg-primary-500 border-primary-500 text-white' : 'border-muted-300 dark:border-muted-700'">
                      <Icon v-if="item.isRequired" name="lucide:check" class="size-2.5" />
                    </div>
                    <span class="text-[10px] font-bold uppercase tracking-tight"
                      :class="item.isRequired ? 'text-primary-600' : 'text-muted-400'">
                      Obrig.
                    </span>
                  </div>

                  <button
                    class="p-1.5 text-muted-400 hover:text-danger-500 hover:bg-danger-500/10 rounded-lg transition-all md:opacity-0 group-hover:opacity-100"
                    @click="removeChecklistItem(idx)">
                    <Icon name="lucide:trash-2" class="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- Informações Adicionais -->
        <div class="grid grid-cols-2 gap-4">
          <div class="p-3 border border-muted-200 dark:border-muted-800 rounded-xl bg-white dark:bg-muted-950">
            <BaseParagraph size="xs" weight="medium" class="text-muted-400 uppercase tracking-wider mb-1">
              Responsável
            </BaseParagraph>
            <div class="flex items-center gap-2">
              <BaseAvatar :src="assignedMember?.photo" :text="assignedMember?.name?.charAt(0)" size="xs" />
              <BaseParagraph size="sm" weight="medium" class="text-muted-700 dark:text-muted-200 truncate">
                {{ assignedMember?.name || 'Não definido' }}
              </BaseParagraph>
            </div>
          </div>
          <div class="p-3 border border-muted-200 dark:border-muted-800 rounded-xl bg-white dark:bg-muted-950">
            <BaseParagraph size="xs" weight="medium" class="text-muted-400 uppercase tracking-wider mb-1">
              Honorário
            </BaseParagraph>
            <BaseParagraph size="sm" weight="bold" class="text-primary-600 dark:text-primary-400">
              {{ new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(serviceData.serviceValue)
              }}
            </BaseParagraph>
          </div>
        </div>

        <!-- Generated Link Preview (After Submission) -->
        <div v-if="generatedLink"
          class="p-6 bg-success-500/5 border border-success-500/20 rounded-xl animate-pulse-once">
          <div class="flex items-center gap-2 mb-3">
            <Icon name="lucide:check-circle" class="size-6 text-success-600" />
            <BaseHeading as="h4" size="sm" weight="medium" class="text-success-700 dark:text-success-400">
              Link de Upload Gerado!
            </BaseHeading>
          </div>
          <div class="flex items-center gap-2 p-3 bg-white dark:bg-muted-900 rounded-lg border border-success-500/20">
            <BaseParagraph size="xs" class="flex-1 truncate font-mono text-muted-500">
              {{ generatedLink }}
            </BaseParagraph>
            <BaseButton size="icon-sm" title="Copiar novamente" @click="copyLinkAgain">
              <Icon name="lucide:copy" class="size-3.5" />
            </BaseButton>
          </div>
          <BaseParagraph size="xs" class="text-success-600 mt-2 text-center">
            ✓ Link copiado! O cliente também recebe via SMS/E-mail (se cadastrado)
          </BaseParagraph>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div
      class="border-muted-200 dark:border-muted-800 flex h-16 w-full items-center justify-between border-t px-8 bg-muted-50/50 dark:bg-muted-950/50">
      <BaseButton v-if="currentStep > 1 && !generatedLink" size="sm" @click="goBack">
        <Icon name="lucide:arrow-left" class="size-4 mr-2" />
        Voltar
      </BaseButton>
      <div v-else />

      <div class="flex gap-3">
        <BaseButton v-if="!generatedLink" size="sm" @click="() => $emit('close')">
          Cancelar
        </BaseButton>
        <BaseButton v-if="currentStep === 1" variant="primary" size="sm" @click="goToStep2">
          Continuar
          <Icon name="lucide:arrow-right" class="size-4 ml-2" />
        </BaseButton>
        <BaseButton v-else-if="currentStep === 2" variant="primary" size="sm" @click="goToStep3">
          Continuar
          <Icon name="lucide:arrow-right" class="size-4 ml-2" />
        </BaseButton>
        <BaseButton v-else-if="currentStep === 3 && !generatedLink" variant="primary" size="sm" :loading="isSaving"
          @click="createDeclaration">
          <Icon name="lucide:rocket" class="size-4 mr-2" />
          Criar e Gerar Link
        </BaseButton>
        <template v-else-if="generatedLink">
          <BaseButton size="sm" @click="shareOnWhatsapp">
            <Icon name="lucide:message-circle" class="size-4 mr-2" />
            WhatsApp
          </BaseButton>
          <BaseButton size="sm" @click="openGeneratedLink">
            <Icon name="lucide:external-link" class="size-4 mr-2" />
            Abrir
          </BaseButton>
          <BaseButton variant="primary" size="sm" @click="() => $emit('close')">
            Fechar
          </BaseButton>
        </template>
      </div>
    </div>
  </FocusScope>
</template>
