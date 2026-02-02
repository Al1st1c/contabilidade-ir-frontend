<script setup lang="ts">
import { useApi } from '~/composables/useAuth'
import { useDebounceFn } from '@vueuse/core'

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
const selectedClient = ref<any>(null)
const showNewClientForm = ref(false)

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
  description: ''
})

// Step 3: Generated Link
const generatedLink = ref('')

// Masks
const masks = ref(['999.999.999-99'])
const phoneMask = ref(['(99) 99999-9999'])

// Search clients with debounce
const debouncedSearch = useDebounceFn(async (query: string) => {
  if (!query || query.length < 3) {
    searchResults.value = []
    return
  }

  isLoadingClients.value = true
  try {
    const { data } = await useCustomFetch<any>('/clients', {
      query: { search: query, limit: 10 }
    })
    if (data.success) {
      searchResults.value = data.data
    }
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
  } finally {
    isLoadingClients.value = false
  }
}, 300)

watch(clientSearch, (newValue) => {
  debouncedSearch(newValue)
  showNewClientForm.value = false // Hide new client form when typing
})

function selectClient(client: any) {
  selectedClient.value = client
  searchResults.value = []
  clientSearch.value = client.name
}

function showRegisterForm() {
  showNewClientForm.value = true
  selectedClient.value = null
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
  } catch (error) {
    console.error('Erro ao buscar equipe:', error)
  } finally {
    isLoadingTeam.value = false
  }
}

// Navigation
function goToStep2() {
  if (!selectedClient.value && !showNewClientForm.value) {
    toaster.add({
      title: 'Atenção',
      description: 'Selecione um cliente ou cadastre um novo',
      icon: 'ph:warning-circle-fill'
    })
    return
  }

  if (showNewClientForm.value) {
    if (!newClientData.value.name || !newClientData.value.cpf) {
      toaster.add({
        title: 'Atenção',
        description: 'Preencha nome e CPF do novo cliente',
        icon: 'ph:warning-circle-fill'
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
      icon: 'ph:warning-circle-fill'
    })
    return
  }

  currentStep.value = 3
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
      ...serviceData.value
    }

    if (selectedClient.value) {
      payload.clientId = selectedClient.value.id
    } else if (showNewClientForm.value) {
      payload.newClientData = newClientData.value
    }

    const { data } = await useCustomFetch<any>('/declarations', {
      method: 'POST',
      body: payload
    })

    if (data.success) {
      // Immediately generate collection link
      const linkResponse = await useCustomFetch<any>(`/declarations/${data.data.id}/collection-link`, {
        method: 'POST'
      })

      if (linkResponse.data.success) {
        generatedLink.value = `${window.location.origin}${linkResponse.data.data.url}`

        // Auto-copy to clipboard
        await navigator.clipboard.writeText(generatedLink.value)

        toaster.add({
          title: 'Sucesso!',
          description: 'Declaração criada e link copiado para área de transferência',
          icon: 'ph:check-circle-fill',
          duration: 4000
        })
      }

      // Emit saved to refresh Kanban
      emit('saved')

      // Close panel after brief delay
      setTimeout(() => {
        emit('close')
      }, 2000)
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao criar declaração',
      icon: 'ph:warning-circle-fill'
    })
  } finally {
    isSaving.value = false
  }
}

function copyLinkAgain() {
  if (generatedLink.value) {
    window.navigator.clipboard.writeText(generatedLink.value)
  }
}

const stepTitles = ['Selecionar Cliente', 'Dados do IR', 'Revisão e Link']

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
              currentStep > idx + 1 ? 'bg-success-500 text-white' :
                currentStep === idx + 1 ? 'bg-primary-500 text-white' :
                  'bg-muted-200 text-muted-400 dark:bg-muted-800'
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
            :class="currentStep > idx + 1 ? 'bg-success-500' : 'bg-muted-200 dark:bg-muted-800'"></div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="nui-slimscroll h-[calc(100dvh-200px)] overflow-y-auto p-8">
      <!-- Step 1: Client Selection -->
      <div v-if="currentStep === 1" class="space-y-6">
        <BaseField label="Buscar Cliente">
          <BaseInput v-model="clientSearch" placeholder="Digite o nome ou CPF do cliente..." icon="ph:magnifying-glass"
            autocomplete="off" />
          <p class="text-xs text-muted-400 mt-1">
            Digite pelo menos 3 caracteres para buscar
          </p>
        </BaseField>

        <!-- Loading State for Search -->
        <div v-if="isLoadingClients" class="flex flex-col items-center justify-center py-6">
          <BaseLoader class="mb-2 size-8 text-primary-500" />
          <BaseParagraph size="xs" class="text-muted-400">Buscando clientes...</BaseParagraph>
        </div>

        <!-- Search Results -->
        <div v-if="searchResults.length > 0 && !isLoadingClients" class="space-y-2">
          <BaseParagraph size="xs" class="text-muted-500 uppercase tracking-wider font-medium">Resultados
          </BaseParagraph>
          <div class="space-y-2">
            <button v-for="client in searchResults" :key="client.id" type="button" @click="selectClient(client)"
              class="w-full p-4 rounded-lg border transition-all text-left" :class="[
                selectedClient?.id === client.id
                  ? 'border-primary-500 bg-primary-500/5'
                  : 'border-muted-200 dark:border-muted-800 hover:border-primary-500/50'
              ]">
              <div class="flex items-center gap-3">
                <Icon name="lucide:user" class="size-5 text-primary-500" />
                <div class="flex-1">
                  <BaseParagraph size="sm" weight="medium">{{ client.name }}</BaseParagraph>
                  <BaseParagraph size="xs" class="text-muted-400 font-mono">{{ client.cpf }}</BaseParagraph>
                </div>
                <Icon v-if="selectedClient?.id === client.id" name="lucide:check-circle"
                  class="size-5 text-success-500" />
              </div>
            </button>
          </div>
        </div>

        <!-- No Results / Register New -->
        <div v-if="clientSearch && searchResults.length === 0 && !isLoadingClients && !showNewClientForm"
          class="text-center py-8 border-2 border-dashed border-muted-200 dark:border-muted-800 rounded-xl">
          <Icon name="lucide:search-x" class="size-12 text-muted-300 mx-auto mb-3" />
          <BaseParagraph size="sm" class="text-muted-500 mb-4">Nenhum cliente encontrado</BaseParagraph>
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
            </BaseField>

            <BaseField label="Telefone/WhatsApp">
              <BaseInput v-model="newClientData.phone" v-maska="phoneMask" placeholder="(00) 00000-0000"
                icon="ph:phone" />
            </BaseField>
          </div>

          <BaseField label="E-mail (Opcional)">
            <BaseInput v-model="newClientData.email" placeholder="cliente@exemplo.com" icon="ph:envelope" />
          </BaseField>
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
              <BaseSelectItem value="low">Baixa</BaseSelectItem>
              <BaseSelectItem value="medium">Média</BaseSelectItem>
              <BaseSelectItem value="high">Alta</BaseSelectItem>
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
                <BaseAvatar :src="member.avatar" :text="member.name.charAt(0).toUpperCase()" size="xs"
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

      <!-- Step 3: Review and Link -->
      <div v-else-if="currentStep === 3" class="space-y-6">
        <BaseCard rounded="lg" class="p-6 border-muted-200 dark:border-muted-800 shadow-none">
          <BaseHeading as="h4" size="sm" weight="medium" class="mb-4 uppercase tracking-widest text-muted-400">
            Resumo do IR
          </BaseHeading>

          <div class="space-y-4">
            <div class="flex items-start justify-between py-3 border-b border-muted-100 dark:border-muted-800">
              <span class="text-sm text-muted-500">Cliente</span>
              <div class="text-right">
                <p class="text-sm font-medium">{{ selectedClient?.name || newClientData.name }}</p>
                <p class="text-xs text-muted-400 font-mono">{{ selectedClient?.cpf || newClientData.cpf }}</p>
              </div>
            </div>

            <div class="flex items-center justify-between py-3 border-b border-muted-100 dark:border-muted-800">
              <span class="text-sm text-muted-500">Exercício</span>
              <span class="text-sm font-medium">IR {{ serviceData.taxYear }} (Ano-C {{ serviceData.taxYear - 1
              }})</span>
            </div>

            <div class="flex items-center justify-between py-3 border-b border-muted-100 dark:border-muted-800">
              <span class="text-sm text-muted-500">Honorários</span>
              <span class="text-sm font-medium text-primary-600">
                {{ new Intl.NumberFormat('pt-BR', {
                  style: 'currency', currency: 'BRL'
                }).format(serviceData.serviceValue) }}
              </span>
            </div>

            <div class="flex items-center justify-between py-3 border-b border-muted-100 dark:border-muted-800">
              <span class="text-sm text-muted-500">Tipo</span>
              <span class="text-sm font-medium">
                {{ serviceData.declarationType === 'complete' ? 'Completa' : 'Simplificada' }}
              </span>
            </div>

            <div class="flex items-center justify-between py-3">
              <span class="text-sm text-muted-500">Prioridade</span>
              <span class="text-sm font-medium capitalize">
                {{ serviceData.priority === 'low' ? 'Baixa' : serviceData.priority === 'medium' ? 'Média' : 'Alta' }}
              </span>
            </div>
          </div>
        </BaseCard>

        <!-- Generated Link Preview (After Submission) -->
        <div v-if="generatedLink" class="p-6 bg-success-500/5 border border-success-500/20 rounded-xl">
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
            <BaseButton size="icon-sm" @click="copyLinkAgain" title="Copiar novamente">
              <Icon name="lucide:copy" class="size-3.5" />
            </BaseButton>
          </div>
          <BaseParagraph size="xs" class="text-success-600 mt-2 text-center">
            ✓ Link copiado! Envie para o cliente via WhatsApp
          </BaseParagraph>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div
      class="border-muted-200 dark:border-muted-800 flex h-16 w-full items-center justify-between border-t px-8 bg-muted-50/50 dark:bg-muted-950/50">
      <BaseButton v-if="currentStep > 1 && !generatedLink" @click="goBack" size="sm">
        <Icon name="lucide:arrow-left" class="size-4 mr-2" />
        Voltar
      </BaseButton>
      <div v-else></div>

      <div class="flex gap-3">
        <BaseButton v-if="!generatedLink" @click="() => $emit('close')" size="sm">Cancelar</BaseButton>
        <BaseButton v-if="currentStep === 1" variant="primary" size="sm" @click="goToStep2">
          Continuar
          <Icon name="lucide:arrow-right" class="size-4 ml-2" />
        </BaseButton>
        <BaseButton v-else-if="currentStep === 2" variant="primary" size="sm" @click="goToStep3">
          Continuar
          <Icon name="lucide:arrow-right" class="size-4 ml-2" />
        </BaseButton>
        <BaseButton v-else-if="currentStep === 3 && !generatedLink" variant="primary" size="lg" :loading="isSaving"
          @click="createDeclaration">
          <Icon name="lucide:rocket" class="size-4 mr-2" />
          Criar e Gerar Link
        </BaseButton>
      </div>
    </div>
  </FocusScope>
</template>
