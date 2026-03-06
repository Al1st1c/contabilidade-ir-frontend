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
const localFileNames = ref<Record<string, string>>({}) // Nome original do arquivo selecionado pelo usuário

const defaultBanks = ['Itaú', 'Bradesco', 'Santander', 'Nubank', 'Banco do Brasil', 'Inter', 'C6 Bank', 'Caixa']
const customBankName = ref('')
const showCustomBankInput = ref(false)

function isIncomeReport(title: string) {
  return title?.toUpperCase().includes('INFORME DE RENDIMENTO')
}

// Computed: quais bancos já foram enviados para um item de informe de rendimentos
function getBankUploads(parentDocId: string) {
  // Filtra documentos cujo título começa com 'Informe de Rendimentos - '
  return documents.value.filter(d =>
    d.title.startsWith('Informe de Rendimentos - ')
    && d.id !== parentDocId
    && (d.status === 'uploaded' || d.status === 'approved')
  )
}

function isBankAlreadySent(bankName: string) {
  return documents.value.some(d =>
    d.title === `Informe de Rendimentos - ${bankName}`
    && (d.status === 'uploaded' || d.status === 'approved')
  )
}

function getParentBankStatus(doc: any) {
  const uploads = getBankUploads(doc.id)
  if (uploads.length > 0) {
    if (uploads.every(d => d.status === 'approved')) return 'approved'
    return 'uploaded'
  }
  return doc.status
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
              mimeType: item.attachment?.mimeType,
              fileKey: item.attachment?.fileKey,
              fileName: item.attachment?.fileName,
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
          mimeType: item.attachment?.mimeType,
          fileKey: item.attachment?.fileKey,
          fileName: item.attachment?.fileName,
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
  // Se o cliente não escreveu nada, manda "Nao possuo." como padrão
  const description = (note && note.trim()) ? note.trim() : 'Nao possuo.'

  isUploading.value = itemId

  try {
    const result = await $fetch<any>(getApiUrl(`/public/${collectionLink.value.token}/not-owned`), {
      method: 'POST',
      body: {
        checklistItemId: itemId,
        description,
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

// Upload de informe de rendimento por banco
async function handleBankUpload(event: Event, parentDocId: string, bankName: string) {
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
  if (!file) return

  isUploading.value = `${parentDocId}-${bankName}`

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('checklistItemId', parentDocId)
    formData.append('bankName', bankName)
    formData.append('description', `Informe do banco ${bankName}`)
    formData.append('category', 'document')

    const result = await $fetch<any>(getApiUrl(`/public/${collectionLink.value.token}/upload`), {
      method: 'POST',
      body: formData,
    })

    if (result.id || result.success) {
      add({
        title: 'Sucesso!',
        description: `Informe do ${bankName} enviado com sucesso.`,
        icon: 'solar:check-circle-bold-duotone',
      })
      await loadDocuments()
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
    target.value = ''
  }
}

// Upload de banco personalizado
async function handleCustomBankUpload(event: Event, parentDocId: string) {
  const name = customBankName.value.trim()
  if (!name) {
    add({
      title: 'Nome obrigatório',
      description: 'Informe o nome do banco antes de enviar.',
      icon: 'solar:info-circle-bold-duotone',
    })
    return
  }
  await handleBankUpload(event, parentDocId, name)
  customBankName.value = ''
  showCustomBankInput.value = false
}

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
  if (!file) return

  // Guarda o nome original do arquivo (como veio do celular/computador do usuário)
  localFileNames.value[itemId] = file.name

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

function canPreview(doc: any) {
  if (!doc.attachmentId || !doc.mimeType) return false
  const previewableTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  return previewableTypes.includes(doc.mimeType)
}

function viewDocument(doc: any) {
  if (!doc.fileKey) return
  const url = `https://d1fvzp82gc0zw6.cloudfront.net/${doc.fileKey}`
  window.open(url, '_blank')
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
      <template v-for="doc in documents" :key="doc.id">
        <!-- =================================================================
             INFORME DE RENDIMENTOS: Layout especial de bancos
             ================================================================= -->
        <div
          v-if="isIncomeReport(doc.title) && !doc.title.startsWith('Informe de Rendimentos - ') && !doc.title.toUpperCase().includes('ASSALARIADO')"
          class="p-5 bg-white dark:bg-muted-950 rounded-2xl border border-muted-200 dark:border-muted-800 shadow-sm">
          <!-- Header -->
          <div class="flex items-start justify-between gap-4 mb-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <Icon name="solar:bank-bold-duotone" class="size-5 text-primary-500 shrink-0" />
                <BaseHeading as="h4" size="sm" weight="bold" class="text-muted-800 dark:text-muted-100">
                  {{ doc.title }}
                </BaseHeading>
                <BaseTag v-if="doc.isRequired" color="danger" variant="primary" rounded="full"
                  class="text-[9px] uppercase font-bold py-0.5 px-2">
                  Obrigatório
                </BaseTag>
              </div>
              <BaseParagraph size="xs" class="text-muted-500 leading-relaxed">
                Envie o informe de rendimentos de cada banco separadamente. Selecione o banco e importe o documento.
              </BaseParagraph>
            </div>

            <!-- Status / Action -->
            <div class="shrink-0 flex flex-col items-center gap-2">
              <div class="size-10 rounded-xl flex items-center justify-center transition-colors"
                :class="[getStatusColor(getParentBankStatus(doc))]">
                <Icon :name="getStatusIcon(getParentBankStatus(doc))" class="size-6" />
              </div>
              <span class="text-[10px] font-bold uppercase tracking-tighter opacity-70">{{
                getStatusLabel(getParentBankStatus(doc))
              }}</span>
            </div>
          </div>

          <!-- Bancos já enviados -->
          <div v-if="getBankUploads(doc.id).length > 0" class="mb-4">
            <p class="text-[10px] font-bold text-muted-400 uppercase tracking-wider mb-2">Enviados</p>
            <div class="space-y-1.5">
              <div v-for="bankDoc in getBankUploads(doc.id)" :key="bankDoc.id"
                class="flex items-center gap-2 px-3 py-2 rounded-lg bg-success-500/5 border border-success-500/15">
                <Icon name="solar:check-circle-bold" class="size-4 text-success-500 shrink-0" />
                <span class="text-xs font-semibold text-success-700 dark:text-success-400 flex-1">
                  {{ bankDoc.title.replace('Informe de Rendimentos - ', '') }}
                </span>
                <BaseTag size="sm" variant="none" class="text-[8px] uppercase font-bold px-1.5 py-0.5 leading-none"
                  :class="bankDoc.status === 'approved'
                    ? 'bg-success-100 text-success-600'
                    : 'bg-warning-100 text-warning-600'">
                  {{ getStatusLabel(bankDoc.status) }}
                </BaseTag>
              </div>
            </div>
          </div>

          <!-- Grid de bancos para upload -->
          <div class="border-t border-muted-100 dark:border-muted-800 pt-4">
            <p class="text-[10px] font-bold text-muted-400 uppercase tracking-wider mb-3">
              Selecione o banco e importe
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <template v-for="bank in defaultBanks" :key="bank">
                <label v-if="!isBankAlreadySent(bank)" class="relative cursor-pointer group">
                  <input type="file" class="hidden" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.zip"
                    :disabled="!!isUploading" @change="handleBankUpload($event, doc.id, bank)">
                  <div
                    class="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 border-dashed transition-all text-center"
                    :class="isUploading === `${doc.id}-${bank}`
                      ? 'border-primary-500 bg-primary-500/5'
                      : 'border-muted-200 dark:border-muted-700 hover:border-primary-400 hover:bg-primary-500/5'">
                    <Icon v-if="isUploading === `${doc.id}-${bank}`" name="line-md:loading-twotone-loop"
                      class="size-5 text-primary-500" />
                    <Icon v-else name="solar:upload-minimalistic-bold-duotone"
                      class="size-5 text-muted-400 group-hover:text-primary-500 transition-colors" />
                    <span class="text-[11px] font-bold text-muted-600 dark:text-muted-300">{{ bank }}</span>
                  </div>
                </label>
              </template>

              <!-- Outro banco -->
              <button v-if="!showCustomBankInput" type="button"
                class="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 border-dashed border-muted-200 dark:border-muted-700 hover:border-primary-400 hover:bg-primary-500/5 transition-all text-center"
                @click="showCustomBankInput = true">
                <Icon name="lucide:plus" class="size-5 text-muted-400" />
                <span class="text-[11px] font-bold text-muted-500">Outro</span>
              </button>
            </div>

            <!-- Input para banco personalizado -->
            <div v-if="showCustomBankInput" class="mt-3 flex gap-2 animate-fade-in">
              <BaseInput v-model="customBankName" placeholder="Nome do banco..." size="sm" rounded="lg" class="flex-1"
                autocomplete="off" @keyup.enter="($refs.customBankFile as HTMLInputElement)?.click()" />
              <label class="cursor-pointer shrink-0">
                <input ref="customBankFile" type="file" class="hidden" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.zip"
                  :disabled="!!isUploading || !customBankName.trim()" @change="handleCustomBankUpload($event, doc.id)">
                <div
                  class="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm shadow-primary-500/20 h-full">
                  <Icon v-if="isUploading === `${doc.id}-${customBankName}`" name="line-md:loading-twotone-loop"
                    class="size-4" />
                  <Icon v-else name="solar:upload-linear" class="size-4" />
                  Enviar
                </div>
              </label>
              <BaseButton size="sm" variant="muted" rounded="lg"
                @click="showCustomBankInput = false; customBankName = ''">
                <Icon name="lucide:x" class="size-3.5" />
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- =================================================================
             DOCUMENTOS NORMAIS (e sub-itens de banco já enviados — hidden)
             ================================================================= -->
        <div v-else-if="!doc.title.startsWith('Informe de Rendimentos - ')"
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

              <!-- Filename Display -->
              <div v-if="localFileNames[doc.id] || doc.fileName"
                class="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted-100 dark:bg-muted-900 border border-muted-200 dark:border-muted-800 w-fit">
                <Icon name="solar:document-text-bold-duotone" class="size-3.5 text-primary-500" />
                <span class="text-[10px] font-medium text-muted-600 dark:text-muted-400 truncate max-w-[200px]">
                  {{ localFileNames[doc.id] || doc.fileName }}
                </span>
              </div>

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
            <!-- Observação opcional -->
            <div class="mb-4">
              <div class="flex items-center gap-2 mb-2">
                <BaseCheckbox :id="`note-check-${doc.id}`" v-model="showNote[doc.id]" shape="rounded" color="primary"
                  label="Adicionar observação" />
              </div>
              <div v-if="showNote[doc.id]" class="animate-fade-in">
                <BaseTextarea v-model="notes[doc.id]" placeholder="Ex: Este documento refere-se ao imóvel X..." rows="2"
                  size="sm" class="bg-muted-50/50 dark:bg-muted-900/50" />
              </div>
            </div>

            <div class="flex justify-end gap-2">
              <BaseButton v-if="doc.attachmentId && canPreview(doc)" variant="muted" size="sm" rounded="lg" class="p-0"
                @click="viewDocument(doc)">
                <Icon name="solar:eye-linear" class="size-4" />
              </BaseButton>

              <BaseButton v-if="doc.status === 'pending' || doc.status === 'rejected'" variant="muted" size="sm"
                rounded="lg" class="h-8 text-[11px] font-bold" :disabled="!!isUploading"
                @click="handleNotOwned(doc.id)">
                <Icon name="solar:info-circle-linear" class="size-3.5 mr-1" />
                Não Possuo
              </BaseButton>

              <label class="relative cursor-pointer">
                <input type="file" class="hidden" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.zip"
                  :disabled="!!isUploading" @change="handleFileUpload($event, doc.id)">
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
      </template>

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
              <input type="file" class="hidden" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.zip"
                :disabled="!!isUploading || !documentTitle.trim()" @change="handleFileUpload($event, 'extra')">
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
