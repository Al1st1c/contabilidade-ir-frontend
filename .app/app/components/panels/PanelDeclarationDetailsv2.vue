<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

interface Props {
  declarationId: string
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'saved'])

const { useCustomFetch } = useApi()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const toaster = useNuiToasts()
const { open } = usePanels()

// ─── States ──────────────────────────────────────────────────────────────────
const isLoading = ref(true)
const isSaving = ref(false)
const declaration = ref<any>(null)
const isGeneratingLink = ref(false)
const collectionLink = ref<any>(null)
const smsMessage = ref('')
const selectedTemplateIndex = ref<number | null>(null)
const isSendingSms = ref(false)
const checklistItems = ref<any[]>([])
const isSavingChecklist = ref(false)
const newChecklistTitle = ref('')
const showPreviewModal = ref(false)
const previewItem = ref<any>(null)
const signedPreviewUrl = ref('')
const isPreviewLoading = ref(false)

// ─── Active Tab ───────────────────────────────────────────────────────────────
const activeTab = ref<'details' | 'checklist' | 'attachments' | 'communication'>('details')

const tabs = [
  { key: 'details', label: 'Detalhes', icon: 'lucide:file-text' },
  { key: 'checklist', label: 'Checklist', icon: 'lucide:check-square' },
  { key: 'attachments', label: 'Anexos', icon: 'lucide:paperclip' },
  { key: 'communication', label: 'Comunicação', icon: 'lucide:send' },
] as const

// ─── Computed ─────────────────────────────────────────────────────────────────
const selectedColumn = computed(() => kanbanColumns.value.find(col => col.value === form.value.status))
const selectedPriority = computed(() => priorityOptions.find(opt => opt.value === form.value.priority))
const assignedMember = computed(() => {
  if (!form.value.assignedToId || form.value.assignedToId === 'unassigned')
    return null
  return teamMembers.value.find(member => member.id === form.value.assignedToId) || null
})

const isRectified = computed(() => {
  const tags = form.value.tags || []
  return tags.some(t => t.toUpperCase() === 'RETIFICADO' || t.toUpperCase() === 'RETIFICAÇÃO')
})

const filteredAttachments = computed(() => {
  if (!declaration.value?.attachments)
    return []
  const officialCategories = ['irpf_backup', 'irpf_receipt', 'irpf_declaration', 'irpf_darf']
  return declaration.value.attachments.filter((a: any) => !officialCategories.includes(a.category))
})

const baseUrl = computed(() => {
  if (import.meta.server)
    return ''
  return window.location.origin
})

// Counts for tab badges
const pendingChecklistCount = computed(() => checklistItems.value.filter(i => i.status === 'pending').length)
const uploadedChecklistCount = computed(() => checklistItems.value.filter(i => i.status === 'uploaded').length)

// ─── Preview ──────────────────────────────────────────────────────────────────
async function openPreview(item: any) {
  if (!item?.attachment?.previewUrl) {
    toaster.add({ title: 'Erro', description: 'Documento sem URL de visualização', icon: 'ph:warning-circle-fill' })
    return
  }
  previewItem.value = item
  showPreviewModal.value = true
  signedPreviewUrl.value = ''
  isPreviewLoading.value = true
  try {
    const auth = useAuth()
    let authToken: string | null = auth.token.value
    if (!authToken)
      authToken = useCookie<string>('auth_token').value
    if (!authToken)
      throw new Error('Sessão expirada ou token não encontrado.')

    const { data } = await useCustomFetch<any>(item.attachment.previewUrl, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    if (data?.url) {
      signedPreviewUrl.value = data.url
    }
    else {
      throw new Error('URL de pré-visualização não retornada')
    }
  }
  catch (error: any) {
    console.error('Erro ao buscar URL de preview:', error)
    toaster.add({ title: 'Erro de Visualização', description: error.message || 'Não foi possível carregar o documento', icon: 'ph:warning-circle-fill' })
  }
  finally {
    isPreviewLoading.value = false
  }
}

async function handleDownload(item: any) {
  try {
    const auth = useAuth()
    const authToken = auth.token.value || useCookie<string>('auth_token').value
    if (!authToken)
      throw new Error('Sessão expirada')
    const { data } = await useCustomFetch<any>(item.previewUrl || item.attachment?.previewUrl, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    if (data?.url)
      window.open(data.url, '_blank')
  }
  catch (error) {
    console.error('Erro ao baixar:', error)
  }
}

// ─── SMS Templates ────────────────────────────────────────────────────────────
const smsTemplates = [
  { id: 1, icon: 'solar:document-add-linear', title: 'Pedir Docs', message: 'Ola [NOME], envie seus documentos para o IR pelo link: [LINK]. Evite multas! ConsTar.' },
  { id: 2, icon: 'solar:refresh-linear', title: 'Status IR', message: 'Ola [NOME], seu IR mudou para: [STATUS]. Acompanhe em nosso sistema. ConsTar.' },
  { id: 3, icon: 'solar:check-circle-linear', title: 'Transmitido', message: 'Ola [NOME], seu IR foi transmitido com sucesso! O recibo estara disponivel em breve. ConsTar.' },
  { id: 4, icon: 'solar:info-circle-linear', title: 'Aviso Geral', message: 'Ola [NOME], temos uma atualizacao no seu IR. Por favor, acesse [LINK] para verificar. Grato.' },
]

function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036F]/g, '').replace(/[^\x00-\x7F]/g, '')
}

function handleSelectTemplate(index: number) {
  const templateObj = smsTemplates[index]
  if (!templateObj)
    return
  selectedTemplateIndex.value = index
  const firstName = removeAccents(declaration.value?.client?.name?.split(' ')[0] || 'Cliente')
  const statusName = removeAccents(declaration.value?.column?.name || 'Atualizado')
  const fullUrl = collectionLink.value ? `${window.location.origin}${collectionLink.value.url}` : 'sistema'
  const msg = templateObj.message.replace('[NOME]', firstName).replace('[STATUS]', statusName).replace('[LINK]', fullUrl)
  smsMessage.value = removeAccents(msg).substring(0, 160)
}

// ─── Form State ───────────────────────────────────────────────────────────────
const form = ref({
  status: '',
  priority: '',
  declarationType: '',
  result: 'neutral',
  resultValue: 0,
  serviceValue: 0,
  paymentStatus: '',
  dueDate: '',
  description: '',
  internalNotes: '',
  assignedToId: 'unassigned',
  govPassword: '',
  tags: [] as string[],
  rectificationDescription: '',
})
const showGovPassword = ref(false)
const newTag = ref('')

function addTag() {
  const tag = newTag.value.trim()
  if (tag && !form.value.tags.includes(tag)) {
    form.value.tags.push(tag)
    save()
  }
  newTag.value = ''
}

function removeTag(tag: string) {
  form.value.tags = form.value.tags.filter(t => t !== tag)
  save()
}

// ─── Options ──────────────────────────────────────────────────────────────────
const priorityOptions = [
  { label: 'Baixa', value: 'low', icon: 'lucide:arrow-down', color: 'text-muted-500' },
  { label: 'Média', value: 'medium', icon: 'lucide:minus', color: 'text-amber-500' },
  { label: 'Alta', value: 'high', icon: 'lucide:arrow-up', color: 'text-rose-500' },
]

const resultOptions = [
  { label: 'Restituição', value: 'refund' },
  { label: 'A Pagar', value: 'pay' },
  { label: 'Neutro', value: 'neutral' },
]

const paymentStatusOptions = [
  { label: 'Pendente', value: 'pending', dot: 'bg-danger-500' },
  { label: 'Aguardando Confirmação', value: 'processing', dot: 'bg-warning-500' },
  { label: 'Parcial', value: 'partial', dot: 'bg-warning-500' },
  { label: 'Pago', value: 'paid', dot: 'bg-success-500' },
]

// ─── Team & Columns ──────────────────────────────────────────────────────────
const teamMembers = ref<any[]>([])
const isLoadingTeam = ref(false)
const kanbanColumns = ref<any[]>([])

async function fetchKanbanColumns() {
  try {
    const { data } = await useCustomFetch<any>('/declarations/columns')
    if (data.success) {
      kanbanColumns.value = data.data.map((col: any) => ({
        label: col.name,
        value: col.id,
        id: col.id,
        color: col.color,
      }))
    }
  }
  catch (error) { console.error('Erro ao buscar colunas:', error) }
}

async function fetchTeamMembers() {
  isLoadingTeam.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant/members')
    if (data.success)
      teamMembers.value = data.data
  }
  catch (error) { console.error('Erro ao buscar equipe:', error) }
  finally { isLoadingTeam.value = false }
}

// ─── Fetch Declaration ────────────────────────────────────────────────────────
async function fetchDeclaration() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}?t=${Date.now()}`)
    if (data && data.success) {
      const result = data.data
      declaration.value = result
      form.value = {
        status: result.column?.id || '',
        priority: result.priority,
        declarationType: result.declarationType,
        result: result.result || 'neutral',
        resultValue: result.resultValue || 0,
        serviceValue: result.serviceValue || 0,
        paymentStatus: result.paymentStatus,
        dueDate: (result.dueDate ? new Date(result.dueDate).toISOString().split('T')[0] : '') as string,
        description: result.description || '',
        internalNotes: result.internalNotes || '',
        assignedToId: result.assignedTo?.id || 'unassigned',
        govPassword: result.govPassword || '',
        tags: result.tags || [],
        rectificationDescription: result.rectificationDescription || '',
      }
      if (result.collectionLinks?.length > 0)
        collectionLink.value = result.collectionLinks[0]
      checklistItems.value = result.checklist || []
    }
  }
  catch (error) { console.error('Erro ao buscar detalhes da declaração:', error) }
  finally { isLoading.value = false }
}

// ─── Checklist ────────────────────────────────────────────────────────────────
async function addChecklistItem() {
  if (!newChecklistTitle.value.trim())
    return
  checklistItems.value.push({ title: newChecklistTitle.value, isRequired: true, status: 'pending' })
  newChecklistTitle.value = ''
  await syncChecklist()
}

async function removeChecklistItem(index: number) {
  checklistItems.value.splice(index, 1)
  await syncChecklist()
}

async function toggleItemRequired(index: number) {
  checklistItems.value[index].isRequired = !checklistItems.value[index].isRequired
  await syncChecklist()
}

async function syncChecklist() {
  isSavingChecklist.value = true
  try {
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}/checklist/sync`, {
      method: 'POST',
      body: { items: checklistItems.value },
    })
    if (data && data.success)
      checklistItems.value = data.data
  }
  catch (error) { console.error('Erro ao sincronizar checklist:', error) }
  finally { isSavingChecklist.value = false }
}

async function updateItemStatus(itemId: string, status: string, comment?: string) {
  try {
    await useCustomFetch<any>(`/declarations/${props.declarationId}/checklist/${itemId}`, {
      method: 'PATCH',
      body: { status, comment },
    })
    await fetchDeclaration()
  }
  catch (error) { console.error('Erro ao atualizar status do item:', error) }
}

// ─── SMS ──────────────────────────────────────────────────────────────────────
async function sendSms() {
  if (!smsMessage.value.trim()) {
    toaster.add({ title: 'Erro', description: 'Digite uma mensagem para enviar', icon: 'ph:warning-circle-fill' })
    return
  }
  isSendingSms.value = true
  try {
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}/send-sms`, {
      method: 'POST',
      body: { message: smsMessage.value },
    })
    if (data && data.success) {
      toaster.add({ title: 'Sucesso', description: 'SMS enviado para o cliente!', icon: 'ph:chat-circle-dots-fill' })
      smsMessage.value = ''
      selectedTemplateIndex.value = null
      await fetchDeclaration()
    }
    else {
      toaster.add({ title: 'Erro', description: data?.message || 'Falha ao enviar SMS', icon: 'ph:warning-circle-fill' })
    }
  }
  catch (error: any) {
    toaster.add({ title: 'Erro', description: 'Erro na comunicação com o servidor', icon: 'ph:warning-circle-fill' })
  }
  finally { isSendingSms.value = false }
}

// ─── Save ─────────────────────────────────────────────────────────────────────
async function save() {
  isSaving.value = true
  try {
    const payload = { ...form.value }
    if (payload.assignedToId === 'unassigned')
      payload.assignedToId = ''
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}`, {
      method: 'PUT',
      body: payload,
    })
    if (data && data.success) {
      toaster.add({ title: 'Salvo', description: 'Alterações gravadas com sucesso', icon: 'ph:check-circle-fill' })
      await fetchDeclaration()
      emit('saved')
    }
  }
  catch (error: any) {
    toaster.add({ title: 'Erro', description: error.data?.message || 'Erro ao salvar alterações', icon: 'ph:warning-circle-fill' })
  }
  finally { isSaving.value = false }
}

// ─── Collection Link ──────────────────────────────────────────────────────────
function copyLink() {
  if (collectionLink.value) {
    navigator.clipboard.writeText(`${window.location.origin}${collectionLink.value.url}`)
    toaster.add({ title: 'Copiado', description: 'Link copiado para a área de transferência', icon: 'ph:copy-fill' })
  }
}

async function generateLink() {
  isGeneratingLink.value = true
  try {
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}/collection-link`, {
      method: 'POST',
      body: { title: `Documentos para IR ${declaration.value.taxYear}` },
    })
    if (data && data.success) { collectionLink.value = data.data; await fetchDeclaration() }
  }
  catch (error) { console.error('Erro ao gerar link:', error) }
  finally { isGeneratingLink.value = false }
}

// ─── File Upload ──────────────────────────────────────────────────────────────
const fileInput = ref<HTMLInputElement | null>(null)
const officialFileInput = ref<HTMLInputElement | null>(null)
const pendingFile = ref<File | null>(null)
const showChecklistModal = ref(false)
const selectedChecklistItemId = ref<string | null>(null)
const selectedOfficialCategory = ref<string | null>(null)

const officialDocumentSlots = [
  { label: 'Cópia de Segurança IRPF', category: 'irpf_backup', icon: 'solar:database-bold-duotone' },
  { label: 'Recibo de Entrega', category: 'irpf_receipt', icon: 'solar:clippy-bold-duotone' },
  { label: 'Declaração IRPF', category: 'irpf_declaration', icon: 'solar:file-text-bold-duotone' },
  { label: 'DARF do IR', category: 'irpf_darf', icon: 'solar:bill-list-bold-duotone' },
]

function getSlotAttachment(category: string) {
  return declaration.value?.attachments?.find((a: any) => a.category === category)
}

function triggerOfficialUpload(category: string) {
  selectedOfficialCategory.value = category
  officialFileInput.value?.click()
}

async function handleOfficialFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0)
    return
  const file = target.files[0]
  if (!file || !selectedOfficialCategory.value)
    return
  await uploadFile(file, null, selectedOfficialCategory.value)
  selectedOfficialCategory.value = null
}

async function deleteOfficialDocument(id: string) {
  if (!confirm('Deseja excluir este documento oficial?'))
    return
  try {
    await useCustomFetch(`/declarations/${props.declarationId}/attachments/${id}`, { method: 'DELETE' })
    await fetchDeclaration()
    toaster.add({ title: 'Excluído', description: 'Documento oficial removido', icon: 'ph:check-circle-fill' })
  }
  catch (error) { console.error('Erro ao excluir:', error) }
}

function triggerUpload() { fileInput.value?.click() }

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0)
    return
  const file = target.files[0]
  if (!file)
    return
  const pendingItems = checklistItems.value.filter(item => item.status === 'pending')
  if (pendingItems.length > 0) {
    pendingFile.value = file
    selectedChecklistItemId.value = pendingItems[0].id
    showChecklistModal.value = true
  }
  else {
    await uploadFile(file, null)
  }
}

async function uploadFile(file: File, checklistItemId: string | null, category: string | null = null) {
  const formData = new FormData()
  formData.append('file', file)
  if (checklistItemId)
    formData.append('checklistItemId', checklistItemId)
  if (category)
    formData.append('category', category)
  try {
    toaster.add({ title: 'Enviando...', description: `Enviando ${file.name}...`, icon: 'ph:clock-fill' })
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}/attachments`, {
      method: 'POST',
      body: formData,
    })
    if (data && (data.success || data.id)) {
      toaster.add({
        title: 'Sucesso',
        description: checklistItemId ? 'Arquivo vinculado ao checklist com sucesso' : 'Arquivo enviado com sucesso',
        icon: 'ph:check-circle-fill',
      })
      await fetchDeclaration()
      emit('saved')
      showChecklistModal.value = false
      pendingFile.value = null
      selectedChecklistItemId.value = null
    }
  }
  catch (error: any) {
    toaster.add({ title: 'Erro', description: error.data?.message || 'Erro ao enviar arquivo', icon: 'ph:warning-circle-fill' })
  }
  finally {
    if (fileInput.value)
      fileInput.value.value = ''
  }
}

function confirmChecklistUpload() {
  if (pendingFile.value)
    uploadFile(pendingFile.value, selectedChecklistItemId.value)
}

function cancelChecklistUpload() {
  showChecklistModal.value = false
  pendingFile.value = null
  selectedChecklistItemId.value = null
  if (fileInput.value)
    fileInput.value.value = ''
}

// ─── Mount ────────────────────────────────────────────────────────────────────
onMounted(() => {
  fetchKanbanColumns()
  fetchDeclaration()
  fetchTeamMembers()
})
</script>

<template>
  <FocusScope class="border-muted-200 dark:border-muted-800 border-l bg-white dark:bg-muted-900 w-full max-w-6xl shadow-2xl flex flex-col h-screen overflow-hidden">
    <!-- ═══════════ COMPACT TOP HEADER (Jira-style) ═══════════ -->
    <div class="border-muted-200 dark:border-muted-800 border-b bg-white dark:bg-muted-900 shrink-0 z-20">
      <!-- Primary row: key + title + close -->
      <div class="flex h-14 w-full items-center justify-between px-6">
        <div v-if="declaration" class="flex items-center gap-3 min-w-0">
          <!-- Key badge -->
          <span class="inline-flex items-center gap-1.5 bg-muted-100 dark:bg-muted-800 text-muted-600 dark:text-muted-300 text-xs font-mono font-semibold px-2.5 py-1 rounded-md shrink-0">
            <Icon name="lucide:hash" class="size-3" />
            {{ declaration.id.slice(0, 8).toUpperCase() }}
          </span>

          <!-- Title + type badge -->
          <div class="flex items-center gap-2 min-w-0">
            <BaseHeading as="h3" size="sm" weight="semibold" class="text-muted-800 dark:text-muted-100 truncate">
              IR {{ declaration.taxYear }} — {{ declaration.client?.name }}
            </BaseHeading>
            <BaseTag size="sm" :color="declaration.declarationType === 'complete' ? 'primary' : 'info'" variant="muted">
              {{ declaration.declarationType === 'complete' ? 'Completa' : 'Simplificada' }}
            </BaseTag>
          </div>
        </div>
        <div v-else>
          <BasePlaceload class="h-5 w-56 rounded" />
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <div v-if="isSaving" class="mr-1">
            <Icon name="svg-spinners:ring-resize" class="size-4 text-muted-400" />
          </div>
          <button type="button" class="hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-400 hover:text-muted-600 rounded-lg p-1.5 transition-colors" @click="$emit('close')">
            <Icon name="lucide:x" class="size-5" />
          </button>
        </div>
      </div>

      <!-- Status pill strip (Jira breadcrumb-style status bar) -->
      <div v-if="declaration" class="flex items-center gap-4 px-6 pb-3 text-xs text-muted-500 flex-wrap">
        <!-- Status pill -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-muted-200 dark:border-muted-700 bg-muted-50 dark:bg-muted-800 hover:border-primary-400 transition-colors"
        >
          <span class="size-2 rounded-full" :style="`background-color: var(--color-${selectedColumn?.color || 'gray'}-500, #9ca3af)`" />
          <span class="font-medium text-muted-700 dark:text-muted-200">{{ selectedColumn?.label || 'Sem status' }}</span>
        </button>

        <!-- Priority -->
        <div class="flex items-center gap-1.5">
          <Icon :name="selectedPriority?.icon || 'lucide:minus'" class="size-3.5" :class="selectedPriority?.color || 'text-muted-400'" />
          <span>{{ selectedPriority?.label || '—' }}</span>
        </div>

        <span class="text-muted-300 dark:text-muted-700">·</span>

        <!-- Assignee -->
        <div class="flex items-center gap-1.5">
          <BaseAvatar v-if="assignedMember" :src="assignedMember.photo" :text="assignedMember.name?.charAt(0)" size="xs" />
          <Icon v-else name="lucide:user" class="size-3.5 text-muted-400" />
          <span>{{ assignedMember?.name || 'Sem responsável' }}</span>
        </div>

        <span class="text-muted-300 dark:text-muted-700">·</span>

        <!-- Due date -->
        <div class="flex items-center gap-1.5">
          <Icon name="lucide:calendar" class="size-3.5 text-muted-400" />
          <span>{{ form.dueDate ? new Date(`${form.dueDate}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem prazo' }}</span>
        </div>

        <span class="text-muted-300 dark:text-muted-700">·</span>

        <!-- Result -->
        <div class="flex items-center gap-1.5">
          <Icon name="lucide:banknote" class="size-3.5 text-muted-400" />
          <span>{{ form.result === 'refund' ? 'Restituição' : form.result === 'pay' ? 'A pagar' : 'Neutro' }}</span>
          <span v-if="form.result !== 'neutral'" class="font-semibold text-muted-700 dark:text-muted-200">
            R$ {{ Number(form.resultValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
          </span>
        </div>
      </div>

      <!-- Tab bar -->
      <div class="flex items-center gap-1 px-6 border-t border-muted-100 dark:border-muted-800 pt-2 pb-0">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors"
          :class="activeTab === tab.key
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-muted-400 hover:text-muted-600 dark:hover:text-muted-300'"
          @click="activeTab = tab.key"
        >
          <Icon :name="tab.icon" class="size-3.5" />
          {{ tab.label }}

          <!-- Badge for checklist: pending or review -->
          <span
            v-if="tab.key === 'checklist' && (pendingChecklistCount > 0 || uploadedChecklistCount > 0)"
            class="ml-0.5 inline-flex items-center justify-center size-4 rounded-full text-[9px] font-bold"
            :class="uploadedChecklistCount > 0 ? 'bg-warning-100 text-warning-600' : 'bg-muted-100 text-muted-500'"
          >
            {{ uploadedChecklistCount > 0 ? uploadedChecklistCount : pendingChecklistCount }}
          </span>

          <!-- Badge for attachments -->
          <span
            v-if="tab.key === 'attachments' && filteredAttachments.length > 0"
            class="ml-0.5 inline-flex items-center justify-center size-4 rounded-full text-[9px] font-bold bg-muted-100 text-muted-500"
          >{{ filteredAttachments.length }}</span>

          <!-- Active underline -->
          <span v-if="activeTab === tab.key" class="absolute inset-x-0 bottom-0 h-0.5 bg-primary-500 rounded-full" />
        </button>
      </div>
    </div>

    <!-- ═══════════ BODY: MAIN CONTENT + RIGHT SIDEBAR ═══════════ -->
    <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
      <!-- ── Loading ── -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center w-full h-full min-h-[400px]">
        <BaseLoader class="mb-4 size-10 text-primary-500" />
        <BaseParagraph size="sm" class="text-muted-500">
          Carregando detalhes do IR...
        </BaseParagraph>
      </div>

      <template v-else-if="declaration">
        <!-- ════════ MAIN CONTENT (scrollable) ════════ -->
        <div class="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 border-r border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-900">
          <!-- ━━━ TAB: DETALHES ━━━ -->
          <div v-show="activeTab === 'details'" class="space-y-8 animate-fade-in">
            <!-- Client info card -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <Icon name="lucide:user-circle" class="size-4 text-muted-400" />
                <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-500 uppercase tracking-wider">
                  Cliente
                </BaseHeading>
              </div>
              <BaseCard rounded="lg" class="p-5 bg-muted-50 dark:bg-muted-900/40 border-muted-200 dark:border-muted-800">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <p class="text-[10px] text-muted-400 uppercase font-bold mb-1">
                      Nome
                    </p>
                    <p class="text-sm font-semibold text-muted-800 dark:text-muted-100">
                      {{ declaration.client?.name }}
                    </p>
                  </div>
                  <div>
                    <p class="text-[10px] text-muted-400 uppercase font-bold mb-1">
                      CPF
                    </p>
                    <p class="text-sm font-mono text-muted-800 dark:text-muted-100">
                      {{ declaration.client?.cpf }}
                    </p>
                  </div>
                  <div>
                    <p class="text-[10px] text-muted-400 uppercase font-bold mb-1">
                      Telefone / WhatsApp
                    </p>
                    <p class="text-sm text-muted-800 dark:text-muted-100">
                      {{ declaration.client?.phone || 'Não informado' }}
                    </p>
                  </div>
                </div>
              </BaseCard>
            </div>

            <!-- IR Details: tags, gov password, rectification -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <Icon name="lucide:file-json" class="size-4 text-muted-400" />
                <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-500 uppercase tracking-wider">
                  Dados do IR
                </BaseHeading>
              </div>
              <BaseCard rounded="lg" class="p-5 bg-muted-50 dark:bg-muted-900/40 border-muted-200 dark:border-muted-800">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Tags -->
                  <div class="space-y-2">
                    <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Tags</label>
                    <div class="flex flex-wrap gap-1.5">
                      <BaseTag v-for="tag in form.tags" :key="tag" size="sm" color="primary" variant="muted" class="group relative py-1 px-2 pr-6">
                        {{ tag }}
                        <button class="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-danger-500 transition-all" @click="removeTag(tag)">
                          <Icon name="lucide:x" class="size-3" />
                        </button>
                      </BaseTag>
                    </div>
                    <div class="flex gap-2 mt-2">
                      <BaseInput v-model="newTag" placeholder="Nova tag..." size="sm" rounded="md" class="flex-1" @keyup.enter="addTag" />
                      <BaseButton size="sm" variant="muted" @click="addTag">
                        <Icon name="lucide:plus" class="size-4" />
                      </BaseButton>
                    </div>
                  </div>

                  <!-- Gov password -->
                  <div class="space-y-2">
                    <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Senha GOV.br</label>
                    <div class="relative">
                      <BaseInput v-model="form.govPassword" :type="showGovPassword ? 'text' : 'password'" size="sm" rounded="md" placeholder="Sua senha gov" class="pr-10" @blur="save" />
                      <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-400 hover:text-primary-500 transition-colors" @click="showGovPassword = !showGovPassword">
                        <Icon :name="showGovPassword ? 'solar:eye-bold-duotone' : 'solar:eye-closed-bold-duotone'" class="size-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Rectification reason (conditional) -->
                <div v-if="isRectified" class="space-y-2 pt-5 border-t border-muted-200 dark:border-muted-800 mt-5">
                  <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Motivo da Retificação</label>
                  <BaseTextarea v-model="form.rectificationDescription" rounded="md" rows="3" placeholder="Descreva o que motivou a retificação..." size="sm" @blur="save" />
                </div>
              </BaseCard>
            </div>

            <!-- Description + Internal Notes -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <Icon name="lucide:file-text" class="size-4 text-muted-400" />
                <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-500 uppercase tracking-wider">
                  Observações
                </BaseHeading>
              </div>
              <BaseCard rounded="lg" class="p-5 bg-muted-50 dark:bg-muted-900/40 border-muted-200 dark:border-muted-800">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Description -->
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <p class="text-xs font-bold text-muted-400 uppercase tracking-wider">
                        Descrição
                      </p>
                    </div>
                    <BaseTextarea v-model="form.description" rounded="lg" rows="5" placeholder="Adicione uma descrição detalhada..." class="bg-transparent" />
                    <div class="flex justify-end">
                      <BaseButton v-if="form.description !== declaration.description" size="sm" variant="primary" :loading="isSaving" @click="save">
                        Salvar
                      </BaseButton>
                    </div>
                  </div>

                  <!-- Internal notes -->
                  <div class="space-y-2">
                    <div class="flex items-center gap-1.5">
                      <Icon name="lucide:eye-off" class="size-3.5 text-muted-400" />
                      <p class="text-xs font-bold text-muted-400 uppercase tracking-wider">
                        Notas internas
                      </p>
                    </div>
                    <BaseTextarea v-model="form.internalNotes" rounded="lg" rows="5" placeholder="Visível apenas para a equipe..." />
                    <div class="flex justify-end">
                      <BaseButton size="sm" variant="primary" :loading="isSaving" @click="save">
                        Salvar
                      </BaseButton>
                    </div>
                  </div>
                </div>
              </BaseCard>
            </div>

            <!-- Activity / History -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <Icon name="lucide:clock" class="size-4 text-muted-400" />
                <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-500 uppercase tracking-wider">
                  Histórico
                </BaseHeading>
              </div>
              <BaseCard rounded="lg" class="p-5 bg-muted-50 dark:bg-muted-900/40 border-muted-200 dark:border-muted-800">
                <div v-if="declaration.auditLogs?.length > 0" class="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                  <div v-for="log in declaration.auditLogs" :key="log.id" class="flex gap-3 text-sm">
                    <div class="flex flex-col items-center shrink-0">
                      <BaseAvatar v-if="log.userId" :text="log.userName?.charAt(0)" size="xs" class="bg-muted-200 dark:bg-muted-800 text-muted-600" />
                      <div v-else class="size-6 rounded-full bg-primary-100 flex items-center justify-center">
                        <Icon name="lucide:zap" class="size-3 text-primary-500" />
                      </div>
                      <!-- Connector line -->
                      <div class="w-px flex-1 bg-muted-200 dark:bg-muted-800 min-h-[20px] mt-1" />
                    </div>
                    <div class="pb-4">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-semibold text-muted-800 dark:text-muted-100 text-xs">{{ log.userName || 'Sistema' }}</span>
                        <span class="text-[10px] text-muted-400">{{ new Date(log.createdAt).toLocaleString('pt-BR') }}</span>
                      </div>
                      <p class="text-xs text-muted-600 dark:text-muted-300 mt-0.5">
                        {{ log.description }}
                      </p>
                    </div>
                  </div>
                </div>
                <div v-else class="text-muted-400 text-sm italic">
                  Nenhuma atividade registrada.
                </div>
              </BaseCard>
            </div>
          </div>

          <!-- ━━━ TAB: CHECKLIST ━━━ -->
          <div v-show="activeTab === 'checklist'" class="space-y-5 animate-fade-in">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Icon name="lucide:check-square" class="size-4 text-muted-400" />
                <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-500 uppercase tracking-wider">
                  Checklist de Documentos
                </BaseHeading>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="isSavingChecklist" class="animate-spin text-primary-500">
                  <Icon name="svg-spinners:ring-resize" class="size-4" />
                </span>
                <!-- Progress summary -->
                <span class="text-xs text-muted-400">
                  {{ checklistItems.filter(i => i.status === 'approved').length }} / {{ checklistItems.length }} aprovados
                </span>
              </div>
            </div>

            <!-- Add item input -->
            <div class="flex gap-2">
              <BaseInput v-model="newChecklistTitle" placeholder="Ex: RG, CPF, Comprovante de renda..." size="sm" rounded="md" class="flex-1" @keyup.enter="addChecklistItem" />
              <BaseButton size="sm" variant="primary" @click="addChecklistItem">
                <Icon name="lucide:plus" class="size-4 mr-1" />
                Adicionar
              </BaseButton>
            </div>

            <!-- Progress bar -->
            <div v-if="checklistItems.length > 0" class="w-full bg-muted-200 dark:bg-muted-800 rounded-full h-1.5">
              <div
                class="h-1.5 rounded-full transition-all duration-500"
                :class="checklistItems.filter(i => i.status === 'approved').length === checklistItems.length ? 'bg-success-500' : 'bg-primary-500'"
                :style="`width: ${(checklistItems.filter(i => i.status === 'approved').length / checklistItems.length) * 100}%`"
              />
            </div>

            <!-- Checklist items -->
            <div class="space-y-2">
              <div
                v-for="(item, idx) in checklistItems"
                :key="item.id || idx"
                class="p-4 rounded-xl border bg-white dark:bg-muted-950 transition-all border-muted-200 dark:border-muted-800 hover:shadow-sm"
                :class="{
                  'border-success-300 dark:border-success-800 bg-success-50/50 dark:bg-success-900/10': item.status === 'approved',
                  'border-danger-300 dark:border-danger-800 bg-danger-50/50 dark:bg-danger-900/10': item.status === 'rejected',
                  'border-warning-300 dark:border-warning-800 bg-warning-50/50 dark:bg-warning-900/10': item.status === 'uploaded',
                }"
              >
                <div class="flex items-center gap-3">
                  <!-- Status icon -->
                  <div
                    class="size-7 rounded-full flex items-center justify-center shrink-0"
                    :class="{
                      'bg-success-100 text-success-600': item.status === 'approved',
                      'bg-danger-100 text-danger-600': item.status === 'rejected',
                      'bg-warning-100 text-warning-600': item.status === 'uploaded',
                      'bg-muted-100 dark:bg-muted-800 text-muted-400': item.status === 'pending',
                    }"
                  >
                    <Icon
                      :name="{
                        approved: 'lucide:check',
                        rejected: 'lucide:x',
                        uploaded: 'lucide:upload',
                        pending: 'lucide:circle-dashed',
                      }[item.status] || 'lucide:circle-dashed'" class="size-3.5"
                    />
                  </div>

                  <!-- Title + badges -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <p class="text-sm font-medium text-muted-800 dark:text-muted-100">
                        {{ item.title }}
                      </p>
                      <BaseTag v-if="item.isRequired" size="sm" color="danger" variant="muted" class="scale-80 origin-left">
                        Obrigatório
                      </BaseTag>
                      <BaseTag v-if="item.status !== 'pending'" size="sm" :color="{ uploaded: 'warning', approved: 'success', rejected: 'danger' }[item.status]" variant="muted" class="scale-80 origin-left capitalize">
                        {{ { uploaded: 'Enviado', approved: 'Aprovado', rejected: 'Rejeitado' }[item.status] }}
                      </BaseTag>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center gap-1 shrink-0">
                    <button class="p-1.5 rounded-lg hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors" :class="item.isRequired ? 'text-danger-500' : 'text-muted-400 hover:text-primary-500'" @click="toggleItemRequired(idx)">
                      <Icon :name="item.isRequired ? 'lucide:alert-circle' : 'lucide:circle'" class="size-3.5" />
                    </button>
                    <button class="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/30 text-muted-400 hover:text-danger-500 transition-colors" @click="removeChecklistItem(idx)">
                      <Icon name="lucide:trash-2" class="size-3.5" />
                    </button>
                  </div>
                </div>

                <!-- Uploaded file row -->
                <div v-if="item.status === 'uploaded' && item.attachment" class="mt-3 pt-3 border-t border-muted-100 dark:border-muted-800 flex items-center justify-between">
                  <div class="flex items-center gap-2 text-xs text-muted-500 min-w-0">
                    <Icon name="lucide:file" class="size-3.5 shrink-0" />
                    <span class="truncate">{{ item.attachment.fileName }}</span>
                  </div>
                  <div class="flex gap-1 shrink-0">
                    <BaseButton variant="ghost" color="primary" size="icon-sm" title="Pré-visualizar" @click="openPreview(item)">
                      <Icon name="solar:eye-bold-duotone" class="size-3.5" />
                    </BaseButton>
                    <BaseButton color="success" size="icon-sm" title="Aprovar" @click="updateItemStatus(item.id, 'approved')">
                      <Icon name="lucide:check" class="size-3.5" />
                    </BaseButton>
                    <BaseButton color="danger" size="icon-sm" title="Rejeitar" @click="updateItemStatus(item.id, 'rejected')">
                      <Icon name="lucide:x" class="size-3.5" />
                    </BaseButton>
                  </div>
                </div>
              </div>

              <div v-if="checklistItems.length === 0" class="text-center py-10 border-2 border-dashed border-muted-200 dark:border-muted-800 rounded-xl">
                <Icon name="lucide:check-square" class="size-8 text-muted-300 mx-auto mb-2" />
                <p class="text-xs text-muted-400">
                  Adicione itens ao checklist acima
                </p>
              </div>
            </div>
          </div>

          <!-- ━━━ TAB: ATTACHMENTS ━━━ -->
          <div v-show="activeTab === 'attachments'" class="space-y-6 animate-fade-in">
            <!-- Hidden file inputs -->
            <input ref="fileInput" type="file" class="hidden" @change="handleFileUpload">
            <input ref="officialFileInput" type="file" class="hidden" @change="handleOfficialFileUpload">

            <!-- Client Attachments -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:paperclip" class="size-4 text-muted-400" />
                  <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-500 uppercase tracking-wider">
                    Anexos do Cliente
                    <span class="ml-1.5 text-muted-300">({{ filteredAttachments.length }})</span>
                  </BaseHeading>
                </div>
                <BaseButton size="sm" variant="muted" @click="triggerUpload">
                  <Icon name="lucide:upload" class="size-3.5 mr-1.5" />
                  Adicionar
                </BaseButton>
              </div>

              <div v-if="filteredAttachments.length > 0" class="grid grid-cols-2 md:grid-cols-3 gap-3">
                <BaseCard v-for="att in filteredAttachments" :key="att.id" rounded="lg" class="p-3 border-muted-200 dark:border-muted-800 hover:border-primary-400 hover:shadow-sm transition-all cursor-pointer group">
                  <div class="flex items-start gap-3">
                    <div class="size-9 rounded-lg bg-muted-100 dark:bg-muted-800 flex items-center justify-center shrink-0">
                      <Icon name="lucide:file-text" class="size-4.5 text-muted-500" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-semibold truncate text-muted-800 dark:text-muted-100" :title="att.fileName">
                        {{ att.fileName }}
                      </p>
                      <p class="text-[10px] text-muted-400 capitalize mt-0.5">
                        {{ att.category }}
                      </p>
                    </div>
                  </div>
                  <!-- Action buttons appear on hover -->
                  <div class="flex gap-1 mt-2.5 pt-2 border-t border-muted-100 dark:border-muted-800 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="flex-1 flex items-center justify-center gap-1 text-[10px] text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded py-1 transition-colors" @click.stop="openPreview({ attachment: att, title: 'Anexo' })">
                      <Icon name="solar:eye-bold-duotone" class="size-3" /> Visualizar
                    </button>
                    <button class="flex-1 flex items-center justify-center gap-1 text-[10px] text-muted-500 hover:bg-muted-100 dark:hover:bg-muted-800 rounded py-1 transition-colors" @click.stop="handleDownload(att)">
                      <Icon name="lucide:download" class="size-3" /> Baixar
                    </button>
                  </div>
                </BaseCard>
              </div>
              <div v-else class="text-center py-10 border-2 border-dashed border-muted-200 dark:border-muted-800 rounded-xl">
                <Icon name="lucide:paperclip" class="size-8 text-muted-300 mx-auto mb-2" />
                <p class="text-xs text-muted-400">
                  Nenhum anexo. Clique em "Adicionar" para enviar.
                </p>
              </div>
            </div>

            <!-- Official Documents -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <Icon name="solar:shield-bold-duotone" class="size-4 text-primary-500" />
                <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-500 uppercase tracking-wider">
                  Documentos Oficiais
                </BaseHeading>
              </div>
              <BaseCard rounded="lg" class="p-5 bg-muted-50 dark:bg-muted-900/40 border-muted-200 dark:border-muted-800">
                <div class="space-y-2">
                  <div
                    v-for="slot in officialDocumentSlots"
                    :key="slot.category"
                    class="flex items-center gap-4 p-3.5 rounded-xl border bg-white dark:bg-muted-950 transition-all border-muted-200 dark:border-muted-800 hover:border-primary-300 group"
                  >
                    <!-- Icon -->
                    <div class="size-9 rounded-lg bg-muted-100 dark:bg-muted-900 flex items-center justify-center shrink-0">
                      <Icon :name="slot.icon" class="size-4.5 text-muted-400" />
                    </div>

                    <!-- Label + filename -->
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-bold text-muted-800 dark:text-muted-100">
                        {{ slot.label }}
                      </p>
                      <p class="text-[10px] text-muted-400 mt-0.5 truncate">
                        {{ getSlotAttachment(slot.category)?.fileName || 'Pendente de envio' }}
                      </p>
                    </div>

                    <!-- Status badge -->
                    <BaseTag v-if="getSlotAttachment(slot.category)" size="sm" color="success" variant="muted" class="scale-85">
                      Enviado
                    </BaseTag>
                    <BaseTag v-else size="sm" color="muted" variant="muted" class="scale-85">
                      Pendente
                    </BaseTag>

                    <!-- Actions -->
                    <div class="flex gap-1 shrink-0">
                      <template v-if="getSlotAttachment(slot.category)">
                        <button class="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors" @click="openPreview({ attachment: getSlotAttachment(slot.category), title: slot.label })">
                          <Icon name="solar:eye-bold-duotone" class="size-4" />
                        </button>
                        <button class="p-1.5 rounded-lg hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-400 transition-colors" @click="handleDownload(getSlotAttachment(slot.category))">
                          <Icon name="lucide:download" class="size-4" />
                        </button>
                        <button class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-danger-500 transition-all" @click="deleteOfficialDocument(getSlotAttachment(slot.category).id)">
                          <Icon name="lucide:trash-2" class="size-4" />
                        </button>
                      </template>
                      <template v-else>
                        <button class="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm shadow-primary-500/20" @click="triggerOfficialUpload(slot.category)">
                          <Icon name="lucide:upload" class="size-4" />
                        </button>
                      </template>
                    </div>
                  </div>
                </div>

                <!-- Info note -->
                <div class="bg-primary-500/5 border border-primary-500/20 rounded-xl p-3.5 mt-4 flex gap-2.5">
                  <Icon name="solar:info-circle-bold-duotone" class="size-4.5 text-primary-500 shrink-0 mt-0.5" />
                  <BaseParagraph size="xs" class="text-muted-500 leading-relaxed">
                    Versões finais processadas pelo contador. O cliente não pode excluí-los via link de coleta.
                  </BaseParagraph>
                </div>
              </BaseCard>
            </div>
          </div>

          <!-- ━━━ TAB: COMMUNICATION ━━━ -->
          <div v-show="activeTab === 'communication'" class="space-y-6 animate-fade-in">
            <!-- Collection Link -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <Icon name="lucide:link" class="size-4 text-muted-400" />
                <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-500 uppercase tracking-wider">
                  Link de Coleta
                </BaseHeading>
              </div>
              <BaseCard rounded="lg" class="p-5 bg-primary-500/5 border-primary-500/20 border">
                <div v-if="collectionLink">
                  <p class="text-xs font-mono text-muted-500 mb-3 break-all">
                    {{ `${baseUrl}${collectionLink.url}` }}
                  </p>
                  <div class="flex gap-2">
                    <BaseButton size="sm" class="flex-1" @click="copyLink">
                      <Icon name="lucide:copy" class="size-3.5 mr-1.5" />
                      Copiar Link
                    </BaseButton>
                    <BaseButton size="sm" variant="muted" :to="collectionLink.url" target="_blank">
                      <Icon name="lucide:external-link" class="size-4" />
                    </BaseButton>
                  </div>
                </div>
                <div v-else>
                  <p class="text-xs text-muted-500 mb-3">
                    Gere um link para o cliente enviar seus documentos de forma segura.
                  </p>
                  <BaseButton size="sm" variant="primary" class="w-full" :loading="isGeneratingLink" @click="generateLink">
                    <Icon name="lucide:link" class="size-3.5 mr-1.5" />
                    Gerar Novo Link
                  </BaseButton>
                </div>
              </BaseCard>
            </div>

            <!-- SMS -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:send" class="size-4 text-muted-400" />
                  <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-500 uppercase tracking-wider">
                    Enviar SMS
                  </BaseHeading>
                </div>
                <BaseTag size="sm" variant="muted" color="success" class="scale-90">
                  GSM Standard
                </BaseTag>
              </div>

              <!-- Template grid -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  v-for="(tpl, idx) in smsTemplates"
                  :key="tpl.id"
                  class="text-left p-3 rounded-xl border transition-all duration-200 group"
                  :class="selectedTemplateIndex === idx
                    ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500 shadow-sm shadow-primary-500/10'
                    : 'border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-950 hover:border-primary-400'"
                  @click="handleSelectTemplate(idx)"
                >
                  <div
                    class="size-8 rounded-lg flex items-center justify-center mb-2 transition-colors"
                    :class="selectedTemplateIndex === idx ? 'bg-primary-500 text-white' : 'bg-muted-100 dark:bg-muted-800 text-muted-500 group-hover:bg-primary-100 group-hover:text-primary-500'"
                  >
                    <Icon :name="tpl.icon" class="size-4" />
                  </div>
                  <p class="text-xs font-bold text-muted-800 dark:text-muted-100">
                    {{ tpl.title }}
                  </p>
                </button>
              </div>

              <!-- Message preview + send -->
              <div v-if="selectedTemplateIndex !== null" class="animate-fade-in">
                <BaseCard rounded="lg" class="p-4 border-primary-500/20 bg-primary-500/5">
                  <p class="text-xs text-muted-600 dark:text-muted-300 italic leading-relaxed mb-3">
                    "{{ smsMessage }}"
                  </p>
                  <div class="flex items-center justify-between">
                    <p class="text-[10px] text-muted-400">
                      Para: {{ declaration.client?.phone || '—' }} · {{ smsMessage.length }}/160 caracteres
                    </p>
                    <BaseButton variant="primary" size="sm" :loading="isSendingSms" @click="sendSms">
                      <Icon name="solar:paper-plane-bold" class="size-3.5 mr-1.5" />
                      Enviar Agora
                    </BaseButton>
                  </div>
                </BaseCard>
              </div>
            </div>
          </div>
        </div>

        <!-- ════════ RIGHT SIDEBAR (fixed, Jira-style) ════════ -->
        <div class="w-full md:w-[320px] border-t md:border-t-0 md:border-l border-muted-200 dark:border-muted-800 md:shrink-0 bg-muted-50/50 dark:bg-muted-900/20 overflow-y-auto">
          <div class="p-5 space-y-5">
            <!-- ── Status ── -->
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-muted-400 uppercase tracking-widest">Status</label>
              <BaseSelect v-model="form.status" rounded="md" @update:model-value="() => save()">
                <BaseSelectItem v-for="opt in kanbanColumns" :key="opt.value" :value="opt.value">
                  <div class="flex items-center gap-2">
                    <div class="size-2 rounded-full" :style="`background-color: var(--color-${opt.color || 'gray'}-500, #9ca3af)`" />
                    <span>{{ opt.label }}</span>
                  </div>
                </BaseSelectItem>
              </BaseSelect>
            </div>

            <div class="border-t border-muted-200 dark:border-muted-800" />

            <!-- ── Assignee ── -->
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-muted-400 uppercase tracking-widest">Responsável</label>
              <BaseSelect v-model="form.assignedToId" rounded="md" placeholder="Selecione..." @update:model-value="save">
                <BaseSelectItem value="unassigned">
                  <span class="text-muted-400">Sem responsável</span>
                </BaseSelectItem>
                <BaseSelectItem v-for="member in teamMembers" :key="member.id" :value="member.id">
                  <div class="flex items-center gap-2">
                    <BaseAvatar :src="member.photo" :text="member.name?.charAt(0).toUpperCase()" size="xs" />
                    <span class="text-sm font-medium">{{ member.name }}</span>
                  </div>
                </BaseSelectItem>
              </BaseSelect>
            </div>

            <div class="border-t border-muted-200 dark:border-muted-800" />

            <!-- ── Priority ── -->
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-muted-400 uppercase tracking-widest">Prioridade</label>
              <div class="flex gap-1.5">
                <button
                  v-for="p in priorityOptions"
                  :key="p.value"
                  type="button"
                  class="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1"
                  :class="form.priority === p.value
                    ? 'bg-white dark:bg-muted-800 border-primary-500 text-primary-600 shadow-sm'
                    : 'border-muted-200 dark:border-muted-700 hover:border-muted-300 text-muted-500'"
                  @click="form.priority = p.value; save()"
                >
                  <Icon :name="p.icon" class="size-3" :class="p.color" />
                  {{ p.label }}
                </button>
              </div>
            </div>

            <div class="border-t border-muted-200 dark:border-muted-800" />

            <!-- ── Due Date ── -->
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-muted-400 uppercase tracking-widest">Prazo</label>
              <BaseInput v-model="form.dueDate" type="date" size="sm" rounded="md" @change="save" />
            </div>

            <div class="border-t border-muted-200 dark:border-muted-800" />

            <!-- ── Declaration Type ── -->
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-muted-400 uppercase tracking-widest">Tipo de Declaração</label>
              <div class="flex gap-1.5">
                <button
                  v-for="opt in [{ label: 'Completa', value: 'complete' }, { label: 'Simplificada', value: 'simplified' }]"
                  :key="opt.value"
                  class="flex-1 text-xs p-2 rounded-lg border transition-all font-medium"
                  :class="form.declarationType === opt.value
                    ? 'border-primary-500 bg-primary-500/5 text-primary-600'
                    : 'border-muted-200 dark:border-muted-700 text-muted-400 hover:border-muted-300'"
                  @click="form.declarationType = opt.value; save()"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div class="border-t border-muted-200 dark:border-muted-800" />

            <!-- ── Financial Block ── -->
            <div class="space-y-4">
              <label class="text-[10px] font-bold text-muted-400 uppercase tracking-widest">Financeiro</label>

              <!-- Service value -->
              <div class="space-y-1.5">
                <p class="text-[10px] text-muted-400 uppercase font-bold">
                  Valor do Serviço
                </p>
                <BaseInput v-model="form.serviceValue" type="number" step="0.01" size="sm" rounded="md" icon="lucide:dollar-sign" placeholder="0,00" @change="save" />
              </div>

              <!-- Payment status -->
              <div class="space-y-1.5">
                <p class="text-[10px] text-muted-400 uppercase font-bold">
                  Status do Pagamento
                </p>
                <div class="space-y-1">
                  <button
                    v-for="opt in paymentStatusOptions"
                    :key="opt.value"
                    class="w-full flex items-center gap-2.5 p-2 rounded-lg border transition-all text-xs"
                    :class="form.paymentStatus === opt.value
                      ? 'border-primary-500 bg-primary-500/5 text-primary-600 font-semibold'
                      : 'border-transparent text-muted-500 hover:bg-muted-100 dark:hover:bg-muted-800'"
                    @click="form.paymentStatus = opt.value; save()"
                  >
                    <div class="size-2 rounded-full" :class="opt.dot" />
                    {{ opt.label }}
                    <Icon v-if="form.paymentStatus === opt.value" name="lucide:check" class="ms-auto size-3.5" />
                  </button>
                </div>
              </div>

              <!-- Result -->
              <div class="space-y-1.5">
                <p class="text-[10px] text-muted-400 uppercase font-bold">
                  Resultado do IR
                </p>
                <BaseSelect v-model="form.result" rounded="md" @update:model-value="save">
                  <BaseSelectItem v-for="opt in resultOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </BaseSelectItem>
                </BaseSelect>
                <div v-if="form.result !== 'neutral'" class="mt-1.5">
                  <BaseInput v-model="form.resultValue" type="number" step="0.01" size="sm" rounded="md" icon="lucide:banknote" placeholder="0,00" @change="save" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ═══════════ MODAL: Checklist Upload Link ═══════════ -->
    <DialogRoot v-model:open="showChecklistModal">
      <DialogPortal>
        <DialogOverlay class="bg-muted-800/70 dark:bg-muted-900/80 fixed inset-0 z-[100]" />
        <DialogContent class="fixed starting:opacity-0 starting:top-[8%] top-[10%] start-[50%] max-h-[85vh] w-[90vw] max-w-[32rem] translate-x-[-50%] rounded-lg overflow-hidden border border-muted-200 dark:border-muted-700 bg-white dark:bg-muted-800 focus:outline-none z-[101] transition-discrete transition-all duration-200 ease-out flex flex-col">
          <div class="flex w-full items-center justify-between p-6 border-b border-muted-200 dark:border-muted-800">
            <DialogTitle class="font-heading text-muted-900 text-lg font-medium dark:text-white">
              Vincular ao Checklist
            </DialogTitle>
            <BaseButtonIcon rounded="full" variant="ghost" @click="cancelChecklistUpload">
              <Icon name="solar:close-circle-linear" class="size-5" />
            </BaseButtonIcon>
          </div>
          <div class="nui-slimscroll overflow-y-auto p-8 space-y-6">
            <DialogDescription class="text-sm text-muted-500">
              Este arquivo corresponde a algum documento do checklist? Selecione abaixo para vincular.
            </DialogDescription>

            <!-- File preview -->
            <div class="bg-muted-50 dark:bg-muted-900/40 rounded-xl p-4 border border-muted-200 dark:border-muted-700">
              <div class="flex items-center gap-3">
                <div class="size-12 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                  <Icon name="solar:file-bold-duotone" class="size-7" />
                </div>
                <div class="flex-1 min-w-0">
                  <BaseText size="sm" weight="semibold" class="text-muted-900 dark:text-white truncate">
                    {{ pendingFile?.name }}
                  </BaseText>
                  <BaseText size="xs" class="text-muted-500">
                    {{ pendingFile ? (pendingFile.size / 1024).toFixed(2) : 0 }} KB
                  </BaseText>
                </div>
              </div>
            </div>

            <!-- Checklist item selector -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Selecione o documento correspondente</label>
              <button
                v-for="item in checklistItems.filter(i => i.status === 'pending')"
                :key="item.id"
                type="button"
                class="w-full text-left p-4 rounded-xl border transition-all"
                :class="selectedChecklistItemId === item.id
                  ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500'
                  : 'border-muted-200 dark:border-muted-800 hover:border-primary-500/50'"
                @click="selectedChecklistItemId = item.id"
              >
                <div class="flex items-center gap-3">
                  <div class="size-8 rounded-full flex items-center justify-center transition-colors" :class="selectedChecklistItemId === item.id ? 'bg-primary-500 text-white' : 'bg-muted-100 dark:bg-muted-800 text-muted-500'">
                    <Icon name="solar:document-text-bold-duotone" class="size-4" />
                  </div>
                  <div class="flex-1">
                    <BaseText size="sm" weight="medium" class="text-muted-900 dark:text-white">
                      {{ item.title }}
                    </BaseText>
                    <BaseTag v-if="item.isRequired" size="sm" color="danger" variant="muted" class="mt-1 scale-90 origin-left">
                      Obrigatório
                    </BaseTag>
                  </div>
                  <Icon v-if="selectedChecklistItemId === item.id" name="solar:check-circle-bold" class="size-5 text-primary-500" />
                </div>
              </button>
            </div>
          </div>
          <div class="p-6 border-t border-muted-200 dark:border-muted-800 flex justify-end gap-3 bg-muted-50/50 dark:bg-muted-900/50">
            <BaseButton @click="cancelChecklistUpload">
              Cancelar
            </BaseButton>
            <BaseButton variant="primary" rounded="lg" @click="confirmChecklistUpload">
              <Icon name="solar:upload-bold-duotone" class="size-4 mr-2" />
              Enviar e Vincular
            </BaseButton>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- ═══════════ MODAL: Document Preview ═══════════ -->
    <DialogRoot v-model:open="showPreviewModal">
      <DialogPortal>
        <DialogOverlay class="bg-muted-800/70 dark:bg-muted-900/80 fixed inset-0 z-[110]" />
        <DialogContent class="fixed starting:opacity-0 starting:top-[45%] top-[50%] start-[50%] max-h-[95vh] w-[95vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] rounded-xl overflow-hidden border border-muted-200 dark:border-muted-700 bg-white dark:bg-muted-800 shadow-2xl focus:outline-none z-[111] transition-discrete transition-all duration-300 ease-out flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b border-muted-200 dark:border-muted-800 bg-muted-50/50 dark:bg-muted-900/50">
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                <Icon name="solar:file-bold-duotone" class="size-6" />
              </div>
              <div class="min-w-0">
                <DialogTitle class="text-sm font-semibold text-muted-900 dark:text-white truncate">
                  {{ previewItem?.attachment?.fileName || 'Visualizar Documento' }}
                </DialogTitle>
                <BaseText size="xs" class="text-muted-500">
                  {{ previewItem?.title }}
                </BaseText>
              </div>
            </div>
            <BaseButtonIcon rounded="full" variant="ghost" @click="showPreviewModal = false">
              <Icon name="solar:close-circle-linear" class="size-6" />
            </BaseButtonIcon>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-auto bg-muted-100 dark:bg-muted-900 flex items-center justify-center p-4 min-h-[60vh]">
            <!-- Loading -->
            <div v-if="isPreviewLoading" class="text-center py-20">
              <Icon name="svg-spinners:ring-resize" class="size-12 text-primary-500 mb-4 mx-auto" />
              <BaseParagraph size="sm" class="text-muted-500">
                Buscando documento...
              </BaseParagraph>
            </div>

            <template v-else-if="signedPreviewUrl">
              <!-- PDF -->
              <iframe v-if="previewItem?.attachment?.mimeType === 'application/pdf'" :src="signedPreviewUrl" class="w-full h-full min-h-[75vh] rounded-lg border border-muted-200 dark:border-muted-800" />
              <!-- Image -->
              <img v-else-if="previewItem?.attachment?.mimeType?.startsWith('image/')" :src="signedPreviewUrl" class="max-w-full max-h-full object-contain rounded-lg shadow-lg" alt="Documento">
              <!-- Fallback -->
              <div v-else class="text-center p-12">
                <div class="size-20 mx-auto mb-4 rounded-3xl bg-muted-200 dark:bg-muted-800 flex items-center justify-center">
                  <Icon name="solar:document-bold-duotone" class="size-10 text-muted-400" />
                </div>
                <BaseHeading as="h4" size="md" weight="medium" class="text-muted-900 dark:text-white mb-2">
                  Pré-visualização indisponível
                </BaseHeading>
                <BaseParagraph size="sm" class="text-muted-500 mb-6">
                  Este tipo de arquivo não pode ser visualizado no navegador.
                </BaseParagraph>
                <BaseButton as="a" :href="signedPreviewUrl" target="_blank" variant="primary">
                  <Icon name="solar:download-bold" class="size-4 mr-2" /> Abrir / Baixar
                </BaseButton>
              </div>
            </template>

            <!-- Error -->
            <div v-else class="text-center py-20">
              <Icon name="solar:danger-bold" class="size-12 text-danger-500 mb-4 mx-auto" />
              <BaseParagraph size="sm" class="text-muted-500">
                Falha ao carregar o documento.
              </BaseParagraph>
              <BaseButton size="sm" variant="muted" class="mt-4" @click="openPreview(previewItem)">
                Tentar novamente
              </BaseButton>
            </div>
          </div>

          <!-- Footer: Approve / Reject -->
          <div class="p-4 border-t border-muted-200 dark:border-muted-800 flex justify-center gap-3 bg-muted-50/50 dark:bg-muted-900/50">
            <BaseButton color="danger" @click="updateItemStatus(previewItem.id, 'rejected'); showPreviewModal = false">
              <Icon name="lucide:x" class="size-4 mr-2" /> Rejeitar
            </BaseButton>
            <BaseButton color="success" @click="updateItemStatus(previewItem.id, 'approved'); showPreviewModal = false">
              <Icon name="lucide:check" class="size-4 mr-2" /> Aprovar Documento
            </BaseButton>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </FocusScope>
</template>
