<script setup lang="ts">
definePageMeta({
  layout: 'client',
})

const { add } = useNuiToasts()
const { user } = useAuth()
const { useCustomFetch } = useApi()
const { selectedTaxYear } = useClientSession()
const route = useRoute()
const config = useRuntimeConfig()
const apiBaseUrl = (config.public.apiBase as string || '').replace(/\/$/, '')
const token = computed(() => route.query.token as string | undefined)

const isLoading = ref(true)
const declaration = ref<any>(null)
const collectionLink = ref<any>(null)
const documents = ref<any[]>([])
const isUploading = ref<string | null>(null)
const documentTitle = ref('') // Título para documento extra
const notes = ref<Record<string, string>>({})
const showNote = ref<Record<string, boolean>>({})

const banks = ['Itaú', 'Bradesco', 'Santander', 'Nubank', 'Banco do Brasil']
const customBanks = ref<Record<string, string>>({})
const showCustomInput = ref<Record<string, boolean>>({})

function isIncomeReport(title: string) {
  return title?.toUpperCase().includes('INFORME DE RENDIMENTO')
}

function handleBankSelect(docId: string, bank: string) {
  if (bank === 'Outro') {
    showCustomInput.value[docId] = true
    notes.value[docId] = customBanks.value[docId] || ''
  }
  else {
    showCustomInput.value[docId] = false
    notes.value[docId] = bank
  }
}

async function loadDocuments() {
  if (!token.value && !user.value?.id)
    return

  try {
    isLoading.value = true
    if (!token.value) {
      const { data: clientRes } = await useCustomFetch(`/clients/${(user.value as any)?.id}`)
      if (clientRes.success) {
        const currentDeclaration = clientRes.data.taxDeclarations?.find((d: any) => Number(d.taxYear) === selectedTaxYear.value)
        if (currentDeclaration) {
          const { data: decRes } = await useCustomFetch(`/declarations/${currentDeclaration.id}`)
          if (decRes.success) {
            declaration.value = decRes.data
            documents.value = (decRes.data.checklist || []).map((item: any) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              status: item.status,
              isRequired: item.isRequired,
              comment: item.comment,
              attachmentId: item.attachment?.id,
            }))
            collectionLink.value = decRes.data.collectionLinks?.find((l: any) => l.isActive)
          }
          else {
            declaration.value = null
            documents.value = []
            collectionLink.value = null
          }
        }
        else {
          declaration.value = null
          documents.value = []
          collectionLink.value = null
        }
      }
    }
    else {
      const res = await fetch(`${apiBaseUrl}/public/${token.value}`)
      const result = await res.json()
      if (result?.success) {
        declaration.value = {
          taxYear: result.data?.declaration?.taxYear,
        }
        selectedTaxYear.value = Number(result.data?.declaration?.taxYear) || selectedTaxYear.value
        documents.value = (result.data?.checklist || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          status: item.status,
          isRequired: item.isRequired,
          comment: item.comment,
          attachmentId: item.attachment?.id,
        }))
        collectionLink.value = { token: token.value }
      }
      else {
        declaration.value = null
        documents.value = []
        collectionLink.value = null
      }
    }
  }
  catch (error) {
    console.error('Erro ao carregar documentos:', error)
  }
  finally {
    isLoading.value = false
  }
}

async function handleNotOwned(itemId: string) {
  if (!collectionLink.value?.token) {
    add({
      title: 'Erro',
      description: 'Link de coleta não disponível. Contate seu contador.',
      icon: 'solar:danger-circle-bold-duotone',
    })
    return
  }

  const note = notes.value[itemId]
  if (!note || !note.trim()) {
    add({
      title: 'Observação Obrigatória',
      description: 'Por favor, explique por que você não possui este documento.',
      icon: 'solar:info-circle-bold-duotone',
    })
    showNote.value[itemId] = true
    return
  }

  isUploading.value = itemId

  try {
    const result = await $fetch<any>(getApiUrl(`/public/${collectionLink.value.token}/not-owned`), {
      method: 'POST',
      body: {
        checklistItemId: itemId,
        description: note.trim(),
      },
    })

    if (result.success) {
      add({
        title: 'Sucesso!',
        description: 'Marcado como "Não Possui".',
        icon: 'solar:check-circle-bold-duotone',
      })
      await loadDocuments() // Recarregar lista
    }
  }
  catch (error: any) {
    add({
      title: 'Erro',
      description: error.data?.message || 'Não foi possível salvar sua observação.',
      icon: 'solar:danger-circle-bold-duotone',
    })
  }
  finally {
    isUploading.value = null
  }
}

// Recarrega quando mudar o ano no header
watch(selectedTaxYear, loadDocuments)

onMounted(loadDocuments)

async function handleFileUpload(event: Event, itemId: string) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0)
    return
  if (!collectionLink.value?.token) {
    add({
      title: 'Erro',
      description: 'Link de coleta não disponível. Contate seu contador.',
      icon: 'solar:danger-circle-bold-duotone',
    })
    return
  }

  const file = target.files[0]

  // Validação para Informe de Rendimento
  const doc = documents.value.find(d => d.id === itemId)
  if (doc && isIncomeReport(doc.title)) {
    const note = notes.value[itemId]
    if (!note || !note.trim()) {
      add({
        title: 'Seleção Obrigatória',
        description: 'Por favor, informe o nome do banco para este Informe de Rendimento.',
        icon: 'solar:info-circle-bold-duotone',
      })
      target.value = ''
      return
    }
  }

  isUploading.value = itemId

  try {
    const formData = new FormData()
    if (file) {
      formData.append('file', file)
    }
    if (itemId !== 'extra') {
      formData.append('checklistItemId', itemId)
    }
    else {
      // Documento extra precisa de título
      if (!documentTitle.value.trim()) {
        add({
          title: 'Título Necessário',
          description: 'Por favor, informe um título para o documento.',
          icon: 'solar:pen-new-square-bold-duotone',
        })
        return
      }
      formData.append('title', documentTitle.value.trim())
    }

    // Adicionar observação se houver
    const note = notes.value[itemId]
    if (note && note.trim()) {
      formData.append('description', note.trim())
    }

    formData.append('category', 'document')

    const result = await $fetch<any>(getApiUrl(`/public/${collectionLink.value.token}/upload`), {
      method: 'POST',
      body: formData,
    })

    if (result.id || result.success) {
      add({
        title: 'Sucesso!',
        description: 'Documento enviado com sucesso para análise.',
        icon: 'solar:check-circle-bold-duotone',
      })
      await loadDocuments() // Recarregar lista
    }
  }
  catch (error: any) {
    add({
      title: 'Erro no Upload',
      description: error.data?.message || 'Não foi possível enviar o documento.',
      icon: 'solar:danger-circle-bold-duotone',
    })
  }
  finally {
    isUploading.value = null
    // Limpar campos após sucesso
    if (itemId) {
      notes.value[itemId] = ''
      if (itemId === 'extra') {
        documentTitle.value = ''
      }
      if (customBanks.value[itemId]) {
        customBanks.value[itemId] = ''
      }
      showCustomInput.value[itemId] = false
    }
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'approved': return 'solar:check-circle-bold'
    case 'rejected': return 'solar:close-circle-bold'
    case 'uploaded': return 'solar:clock-circle-bold'
    case 'not_owned': return 'solar:info-circle-bold'
    default: return 'solar:upload-minimalistic-bold'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'approved': return 'text-success-500 bg-success-500/10'
    case 'rejected': return 'text-danger-500 bg-danger-500/10'
    case 'uploaded': return 'text-warning-500 bg-warning-500/10'
    case 'not_owned': return 'text-info-500 bg-info-500/10'
    default: return 'text-muted-400 bg-muted-100 dark:bg-muted-800'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'approved': return 'Aprovado'
    case 'rejected': return 'Rejeitado'
    case 'uploaded': return 'Em Análise'
    case 'not_owned': return 'Não Possui'
    default: return 'Pendente'
  }
}
</script>

<template>
  <div class="space-y-6 pb-24">
    <!-- Header -->
    <section class="pt-6 px-4">
      <BaseHeading as="h2" size="xl" weight="bold" class="text-muted-800 dark:text-white">
        Documentação
      </BaseHeading>
      <BaseParagraph size="sm" class="text-muted-500">
        {{ declaration ? `Arquivos para o exercício ${selectedTaxYear} (Ano Calendário ${selectedTaxYear - 1})`
          : 'Nenhuma declaração encontrada para este ano.' }}
      </BaseParagraph>
    </section>

    <AppPageLoading v-if="isLoading" message="Carregando seus documentos..." />

    <!-- Empty State -->
    <div v-else-if="!declaration" class="py-20 text-center px-4">
      <div class="size-20 bg-muted-100 dark:bg-muted-900 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon name="solar:document-add-linear" class="size-10 text-muted-400" />
      </div>
      <BaseHeading as="h3" size="md" weight="semibold" class="text-muted-400">
        IRPF {{ selectedTaxYear }} não iniciado
      </BaseHeading>
      <BaseParagraph size="sm" class="text-muted-500 mt-2 max-w-[320px] mx-auto">
        O seu Imposto de Renda para este exercício ainda não foi iniciado. Por favor, solicite a abertura ao seu
        contador para enviar os documentos.
      </BaseParagraph>
    </div>

    <!-- Documents List -->
    <div v-else class="px-4 space-y-4">
      <div v-for="doc in documents" :key="doc.id"
        class="group p-5 bg-white dark:bg-muted-950 rounded-2xl border border-muted-200 dark:border-muted-800 shadow-sm transition-all duration-300">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <BaseHeading as="h4" size="sm" weight="bold" class="text-muted-800 dark:text-muted-100">
                {{ doc.title }}
              </BaseHeading>
              <BaseTag v-if="doc.isRequired" color="danger" variant="primary" rounded="full"
                class="text-[9px] uppercase font-bold py-0.5 px-2">
                Obrigatório
              </BaseTag>
            </div>
            <BaseParagraph size="xs" class="text-muted-500 line-clamp-2 leading-relaxed">
              {{ doc.description }}
            </BaseParagraph>

            <!-- Rejection Reason -->
            <div v-if="doc.status === 'rejected' && doc.comment"
              class="mt-3 p-2 rounded-lg bg-danger-500/5 border border-danger-500/10 flex gap-2">
              <Icon name="solar:info-circle-bold" class="size-4 text-danger-500 shrink-0 mt-0.5" />
              <p class="text-[10px] text-danger-600 dark:text-danger-400 font-medium leading-tight">
                {{ doc.comment }}
              </p>
            </div>
          </div>

          <!-- Status / Action -->
          <div class="shrink-0 flex flex-col items-center gap-2">
            <div class="size-10 rounded-xl flex items-center justify-center transition-colors"
              :class="[getStatusColor(doc.status)]">
              <Icon :name="getStatusIcon(doc.status)" class="size-6" />
            </div>
            <span class="text-[10px] font-bold uppercase tracking-tighter opacity-70">{{ getStatusLabel(doc.status)
            }}</span>
          </div>
        </div>

        <!-- Upload Area (only if not approved) -->
        <div v-if="doc.status !== 'approved'" class="mt-4 pt-4 border-t border-muted-100 dark:border-muted-800">

          <!-- Note input or Bank Selection -->
          <div class="mb-4">
            <!-- Caso seja Informe de Rendimento: Seleção de Banco -->
            <div v-if="isIncomeReport(doc.title)" class="animate-fade-in">
              <p class="text-[11px] font-bold text-muted-400 uppercase mb-3 flex items-center gap-2">
                <Icon name="solar:bank-bold-duotone" class="size-4 text-primary-500" />
                Selecione o Banco Emissor
              </p>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button v-for="bank in [...banks, 'Outro']" :key="bank" type="button"
                  class="px-3 py-2.5 rounded-xl border text-[11px] font-bold transition-all text-center"
                  :class="notes[doc.id] === bank || (bank === 'Outro' && showCustomInput[doc.id])
                    ? 'border-primary-500 bg-primary-500/5 text-primary-600 shadow-sm'
                    : 'border-muted-200 dark:border-muted-800 bg-muted-50/50 dark:bg-muted-900/50 text-muted-500 hover:border-primary-400'" @click="handleBankSelect(doc.id, bank)">
                  {{ bank }}
                </button>
              </div>

              <!-- Input para outro banco -->
              <div v-if="showCustomInput[doc.id]" class="mt-3 animate-fade-in">
                <BaseInput v-model="customBanks[doc.id]" placeholder="Digite o nome do banco..." size="sm" rounded="lg"
                  class="bg-muted-50/50 dark:bg-muted-900/50 shadow-inner"
                  @input="notes[doc.id] = customBanks[doc.id] || ''" />
              </div>
            </div>

            <!-- Caso normal: Observação opcional -->
            <div v-else>
              <div class="flex items-center gap-2 mb-2">
                <BaseCheckbox :id="`note-check-${doc.id}`" v-model="showNote[doc.id]" shape="rounded" color="primary"
                  label="Adicionar observação" />
              </div>
              <div v-if="showNote[doc.id]" class="animate-fade-in">
                <BaseTextarea v-model="notes[doc.id]" placeholder="Ex: Este documento refere-se ao imóvel X..." rows="2"
                  size="sm" class="bg-muted-50/50 dark:bg-muted-900/50" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <BaseButton v-if="doc.status === 'pending' || doc.status === 'rejected'" variant="muted" size="sm"
              rounded="lg" class="h-8 text-[11px] font-bold" :disabled="!!isUploading" @click="handleNotOwned(doc.id)">
              <Icon name="solar:info-circle-linear" class="size-3.5 mr-1" />
              Não Possuo
            </BaseButton>

            <label class="relative cursor-pointer">
              <input type="file" class="hidden" :disabled="!!isUploading" @change="handleFileUpload($event, doc.id)">
              <div
                class="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm shadow-primary-500/20">
                <Icon v-if="isUploading === doc.id" name="line-md:loading-twotone-loop" class="size-4" />
                <Icon v-else name="solar:upload-linear" class="size-4" />
                {{ doc.status === 'pending' || doc.status === 'rejected' ? 'Enviar Arquivo' : 'Substituir' }}
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Optional Extra Files -->
      <BaseCard
        class="p-6 border-dashed border-2 border-muted-200 dark:border-muted-800 bg-transparent flex flex-col items-center text-center">
        <BaseHeading as="h4" size="sm" weight="bold" class="mb-1 text-muted-600 dark:text-muted-300">
          Outros Documentos
        </BaseHeading>
        <BaseParagraph size="xs" class="text-muted-400 mb-6">
          Envie qualquer outro arquivo adicional que considerar
          relevante.
        </BaseParagraph>

        <div class="w-full max-w-sm mx-auto space-y-4">
          <!-- Campo de Título (Obrigatório para Extras) -->
          <div class="text-left">
            <BaseInput v-model="documentTitle" placeholder="Título do documento (ex: Recibo do Médico)" size="sm"
              label="Título do Documento" :disabled="!!isUploading" />
          </div>

          <!-- Observação opcional -->
          <div class="space-y-2">
            <div class="flex items-center justify-center gap-2">
              <BaseCheckbox id="note-check-extra" v-model="showNote['extra']" shape="rounded" color="primary"
                label="Adicionar observação" />
            </div>
            <div v-if="showNote['extra']" class="animate-fade-in text-left">
              <BaseTextarea v-model="notes['extra']" placeholder="Descreva o que é este documento..." rows="2" size="sm"
                class="bg-muted-50/50 dark:bg-muted-900/50" />
            </div>
          </div>

          <div class="pt-2">
            <label class="cursor-pointer"
              :class="{ 'opacity-50 pointer-events-none': !documentTitle.trim() || isUploading }">
              <input type="file" class="hidden" :disabled="!!isUploading || !documentTitle.trim()"
                @change="handleFileUpload($event, 'extra')">
              <div
                class="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary-500/25 active:scale-95">
                <Icon v-if="isUploading === 'extra'" name="line-md:loading-twotone-loop" class="size-4" />
                <Icon v-else name="solar:upload-minimalistic-linear" class="size-4" />
                Importar e Enviar
              </div>
            </label>
            <p v-if="!documentTitle.trim()" class="text-[10px] text-muted-400 mt-2 italic">
              * Informe o título antes de importar o arquivo
            </p>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
