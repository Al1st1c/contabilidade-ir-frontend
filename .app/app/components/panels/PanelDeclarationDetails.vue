<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { io } from 'socket.io-client'
import { useApi } from '~/composables/useAuth'

interface Props {
  declarationId: string
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'saved'])

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

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
const showGovPassword = ref(false)
const showClientDetailsPanel = ref(false)
const socket = ref<any>(null)
const saveDebounced = useDebounceFn(() => {
  if (!isSaving.value)
    save()
}, 500)
const lastSavedForm = ref<any>({})

// ─── Active Tab ───────────────────────────────────────────────────────────────
const activeTab = ref<'details' | 'checklist' | 'attachments' | 'official_documents' | 'communication'>('details')

const tabs = [
  { key: 'details', label: 'Detalhes', icon: 'lucide:file-text' },
  { key: 'checklist', label: 'Checklist', icon: 'lucide:check-square' },
  { key: 'attachments', label: 'Anexos', icon: 'lucide:paperclip' },
  { key: 'official_documents', label: 'Documentos Oficiais', icon: 'lucide:shield-check' },
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

const collectionLinkUrl = computed(() => {
  if (!collectionLink.value)
    return ''
  return collectionLink.value.url || (collectionLink.value.token ? `/client?token=${collectionLink.value.token}` : '')
})
const fullCollectionLink = computed(() => {
  if (!collectionLinkUrl.value)
    return ''
  return `${baseUrl.value}${collectionLinkUrl.value}`
})
const isValidatingLink = ref(false)
const linkValidation = ref<{ valid: boolean, reason?: string } | null>(null)
async function validatePublicLink() {
  if (!collectionLink.value?.token)
    return
  isValidatingLink.value = true
  try {
    const { data } = await useCustomFetch<any>(`/public/${collectionLink.value.token}/validate`)
    linkValidation.value = data
  }
  catch (error) {
    linkValidation.value = { valid: false, reason: 'Erro ao validar' }
  }
  finally {
    isValidatingLink.value = false
  }
}
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
    if (data?.url)
      signedPreviewUrl.value = data.url
    else throw new Error('URL de pré-visualização não retornada')
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
  catch (error) { console.error('Erro ao baixar:', error) }
}

// ─── SMS ──────────────────────────────────────────────────────────────────────
const smsTemplates = [
  { id: 1, icon: 'solar:document-add-linear', title: 'Pedir Docs', message: 'Ola [NOME], envie seus documentos para o IR pelo link: {link}. Evite multas! {brand}.' },
  { id: 2, icon: 'solar:refresh-linear', title: 'Status IR', message: 'Ola [NOME], seu IR mudou para: [STATUS]. Acompanhe em nosso sistema. {brand}.' },
  { id: 3, icon: 'solar:check-circle-linear', title: 'Transmitido', message: 'Ola [NOME], seu IR foi transmitido com sucesso! O recibo estara disponivel em breve. {brand}.' },
  { id: 4, icon: 'solar:info-circle-linear', title: 'Aviso Geral', message: 'Ola [NOME], temos uma atualizacao no seu IR. Por favor, acesse {link} para verificar. {brand}.' },
]

function removeAccents(str: string) {
  return str
}

function handleSelectTemplate(index: number) {
  const templateObj = smsTemplates[index]
  if (!templateObj)
    return
  selectedTemplateIndex.value = index
  const firstName = declaration.value?.client?.name?.split(' ')[0] || 'Cliente'
  const statusName = declaration.value?.column?.name || 'Atualizado'
  const msg = templateObj.message.replace('[NOME]', firstName).replace('[STATUS]', statusName)
  smsMessage.value = msg
}

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

// ─── Form ─────────────────────────────────────────────────────────────────────
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
const newTag = ref('')

function addTag() {
  const tag = newTag.value.trim()
  if (tag && !form.value.tags.includes(tag)) {
    form.value.tags.push(tag)
    saveDebounced()
  }
  newTag.value = ''
}
function removeTag(tag: string) {
  form.value.tags = form.value.tags.filter(t => t !== tag)
  saveDebounced()
}

// ─── Options ──────────────────────────────────────────────────────────────────
const priorityOptions = [
  { label: 'Baixa', value: 'low', icon: 'lucide:arrow-down', color: 'text-muted-500' },
  { label: 'Média', value: 'medium', icon: 'lucide:minus', color: 'text-primary-500' },
  { label: 'Alta', value: 'high', icon: 'lucide:arrow-up', color: 'text-rose-500' },
]

const resultOptions = [
  { label: 'Restituição', value: 'restitution' },
  { label: 'Imposto a Pagar', value: 'tax_to_pay' },
  { label: 'Neutro', value: 'neutral' },
]

const paymentStatusOptions = [
  { label: 'Pendente', value: 'pending' },
  { label: 'Aguardando Confirmação', value: 'processing' },
  { label: 'Parcial', value: 'partial' },
  { label: 'Pago', value: 'paid' },
]

const declarationTypeOptions = [
  { label: 'Completa', value: 'complete' },
  { label: 'Simplificada', value: 'simplified' },
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

// ─── Fetch ────────────────────────────────────────────────────────────────────
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
      lastSavedForm.value = JSON.parse(JSON.stringify(form.value))
      if (result.collectionLinks?.length > 0)
        collectionLink.value = result.collectionLinks[0]
      checklistItems.value = result.checklist || []
    }
  }
  catch (error) { console.error('Erro ao buscar detalhes:', error) }
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
    const idx = checklistItems.value.findIndex(i => i.id === itemId)
    if (idx !== -1) {
      checklistItems.value[idx] = { ...checklistItems.value[idx], status }
    }
  }
  catch (error) { console.error('Erro ao atualizar status:', error) }
}

// ─── Save / Delete ────────────────────────────────────────────────────────────
async function save() {
  isSaving.value = true
  try {
    const updated: any = {}
    for (const key in form.value) {
      const nv = (form.value as any)[key]
      const ov = (lastSavedForm.value as any)[key]
      const same = JSON.stringify(nv) === JSON.stringify(ov)
      if (!same)
        updated[key] = nv
    }
    if (updated.assignedToId === 'unassigned')
      updated.assignedToId = ''
    if (Object.keys(updated).length === 0) {
      isSaving.value = false
      return
    }
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}`, {
      method: 'PATCH',
      body: updated,
    })
    if (data && data.success) {
      lastSavedForm.value = JSON.parse(JSON.stringify(form.value))
    }
  }
  catch (error: any) {
    toaster.add({ title: 'Erro', description: error.data?.message || 'Erro ao salvar', icon: 'ph:warning-circle-fill' })
  }
  finally { isSaving.value = false }
}

async function confirmDelete() {
  if (!confirm('Tem certeza que deseja excluir esta declaração? Esta ação não pode ser desfeita.'))
    return
  try {
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}`, { method: 'DELETE' })
    if (data && data.success) {
      toaster.add({ title: 'Excluído', description: 'Declaração excluída com sucesso', icon: 'ph:check-circle-fill' })
      emit('saved')
      emit('close')
    }
  }
  catch (error: any) {
    toaster.add({ title: 'Erro', description: error.data?.message || 'Erro ao excluir', icon: 'ph:warning-circle-fill' })
  }
}

// ─── Collection Link ──────────────────────────────────────────────────────────
function copyLink() {
  const url = fullCollectionLink.value
  if (!url) {
    toaster.add({ title: 'Erro', description: 'Link indisponível. Gere um novo link.', icon: 'ph:warning-circle-fill' })
    return
  }
  navigator.clipboard.writeText(url)
  toaster.add({ title: 'Copiado', description: 'Link copiado para a área de transferência', icon: 'ph:copy-fill' })
}
async function generateLink() {
  isGeneratingLink.value = true
  try {
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}/collection-link`, {
      method: 'POST',
      body: { title: `Documentos para IR ${declaration.value.taxYear}` },
    })
    if (data && data.success) { collectionLink.value = data.data }
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

const officialDocumentsCount = computed(() => {
  return officialDocumentSlots.reduce((acc, slot) => acc + (getSlotAttachment(slot.category) ? 1 : 0), 0)
})
function getSlotAttachment(category: string) {
  return declaration.value?.attachments?.find((a: any) => a.category === category)
}
function statusIcon(status: string) {
  const map: Record<string, string> = {
    approved: 'lucide:check',
    rejected: 'lucide:x',
    uploaded: 'lucide:upload',
    pending: 'lucide:circle-dashed',
  }
  return map[status] || 'lucide:circle-dashed'
}
function statusTagClass(status: string) {
  const map: Record<string, string> = {
    uploaded: 'bg-warning-500 text-white',
    approved: 'bg-success-500 text-white',
    rejected: 'bg-danger-500 text-white',
  }
  return map[status] || ''
}
function statusLabel(status: string) {
  const map: Record<string, string> = {
    uploaded: 'Enviado',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
  }
  return map[status] || ''
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
    if (declaration.value?.attachments)
      declaration.value.attachments = declaration.value.attachments.filter((a: any) => a.id !== id)
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
        description: checklistItemId ? 'Arquivo vinculado ao checklist' : 'Arquivo enviado com sucesso',
        icon: 'ph:check-circle-fill',
      })
      if (!declaration.value.attachments)
        declaration.value.attachments = []
      const created = data?.data ?? data
      if (created)
        declaration.value.attachments.push(created)
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
  try {
    const config = useRuntimeConfig()
    const url = (config.public.apiBase || '').replace(/\/$/, '')
    socket.value = io(url, { transports: ['websocket'], autoConnect: true })
    socket.value.emit('declaration:join', { id: props.declarationId })
    socket.value.on('declaration:patch', (patch: any) => {
      if (!patch)
        return
      if (patch.attachments && declaration.value) {
        declaration.value.attachments = patch.attachments
      }
      if (patch.checklist) {
        checklistItems.value = patch.checklist
      }
      if (patch.form) {
        form.value = { ...form.value, ...patch.form }
      }
    })
    const onVisibility = () => {
      if (document.visibilityState === 'visible')
        fetchDeclaration()
    }
    document.addEventListener('visibilitychange', onVisibility)
    onBeforeUnmount(() => {
      document.removeEventListener('visibilitychange', onVisibility)
    })
  }
  catch { }
})
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-800 border-l bg-white dark:bg-muted-900 w-full max-w-6xl shadow-2xl flex flex-col h-screen overflow-hidden">
    <!-- ═══ HEADER ═══ -->
    <div class="border-muted-200 dark:border-muted-800 border-b bg-white dark:bg-muted-900 shrink-0 z-20">
      <!-- Row 1: key + título + close -->
      <div class="flex h-14 w-full items-center justify-between px-6">
        <div v-if="declaration" class="flex items-center gap-3 min-w-0">
          <span
            class="inline-flex items-center gap-1.5 bg-muted-100 dark:bg-muted-800 text-muted-600 dark:text-muted-300 text-xs font-mono font-semibold px-2.5 py-1 rounded-md shrink-0">
            <Icon name="lucide:hash" class="size-3" />
            {{ declaration.id.slice(0, 8).toUpperCase() }}
          </span>
          <div class="flex items-center gap-2 min-w-0">
            <BaseHeading as="h3" size="sm" weight="semibold" class="text-muted-800 dark:text-muted-100 truncate">
              IR {{ declaration.taxYear }} — {{ declaration.client?.name }}
            </BaseHeading>
            <BaseTag size="sm" variant="none"
              :class="declaration.declarationType === 'complete' ? 'bg-primary-500 text-white' : 'bg-info-500 text-white'">
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
          <button type="button"
            class="hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-400 hover:text-muted-600 rounded-lg p-1.5 transition-colors"
            @click="$emit('close')">
            <Icon name="lucide:x" class="size-5" />
          </button>
        </div>
      </div>

      <!-- Row 2: status strip -->
      <div v-if="declaration" class="flex items-center gap-3 px-6 pb-2.5 text-xs text-muted-500 flex-wrap">
        <span
          class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-muted-200 dark:border-muted-700 bg-muted-50 dark:bg-muted-800">
          <span class="size-2 rounded-full"
            :style="`background-color: var(--color-${selectedColumn?.color || 'gray'}-500, #9ca3af)`" />
          <span class=" text-muted-700 dark:text-muted-200">{{ selectedColumn?.label || 'Sem status' }}</span>
        </span>
        <div class="flex items-center gap-1.5">
          <Icon :name="selectedPriority?.icon || 'lucide:minus'" class="size-3.5"
            :class="selectedPriority?.color || 'text-muted-400'" />
          <span>{{ selectedPriority?.label || '—' }}</span>
        </div>
        <span class="text-muted-300 dark:text-muted-700">·</span>
        <div class="flex items-center gap-1.5">
          <BaseAvatar v-if="assignedMember" :src="assignedMember.photo" :text="assignedMember.name?.charAt(0)"
            size="xs" />
          <Icon v-else name="lucide:user" class="size-3.5 text-muted-400" />
          <span>{{ assignedMember?.name || 'Sem responsável' }}</span>
        </div>
        <span class="text-muted-300 dark:text-muted-700">·</span>
        <div class="flex items-center gap-1.5">
          <Icon name="lucide:calendar" class="size-3.5 text-muted-400" />
          <span>{{ form.dueDate ? new Date(`${form.dueDate}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem prazo'
            }}</span>
        </div>
        <span class="text-muted-300 dark:text-muted-700">·</span>
        <div class="flex items-center gap-1.5">
          <Icon name="lucide:banknote" class="size-3.5 text-muted-400" />
          <span>{{ form.result === 'restitution' ? 'Restituição' : form.result === 'tax_to_pay' ? 'A pagar' : 'Neutro'
            }}</span>
          <span v-if="form.result !== 'neutral'" class="font-bold text-muted-700 dark:text-muted-200">
            R$ {{ Number(form.resultValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
          </span>
        </div>
      </div>

      <!-- Row 3: Tabs -->
      <div class="flex items-center gap-1 px-6 border-t border-muted-100 dark:border-muted-800">
        <button v-for="tab in tabs" :key="tab.key" type="button"
          class="relative flex items-center gap-2 px-3 py-2.5 text-xs transition-all"
          :class="activeTab === tab.key ? 'text-primary-600 dark:text-primary-400' : 'text-muted-400 hover:text-muted-600 dark:hover:text-muted-300'"
          @click="activeTab = tab.key">
          <Icon :name="tab.icon" class="size-3.5" />
          <span class="uppercase tracking-wider">{{ tab.label }}</span>

          <!-- Badge checklist -->
          <span v-if="tab.key === 'checklist' && (pendingChecklistCount > 0 || uploadedChecklistCount > 0)"
            class="inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full px-1 text-[9px] "
            :class="uploadedChecklistCount > 0 ? 'bg-warning-100 text-warning-700' : 'bg-muted-100 text-muted-500'">{{
              uploadedChecklistCount > 0 ? uploadedChecklistCount : pendingChecklistCount }}</span>

          <!-- Badge anexos -->
          <span v-if="tab.key === 'attachments' && filteredAttachments.length > 0"
            class="inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full px-1 text-[9px]  bg-muted-100 text-muted-500">{{
              filteredAttachments.length }}</span>

          <!-- Badge documentos oficiais -->
          <span v-if="tab.key === 'official_documents' && officialDocumentsCount > 0"
            class="inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full px-1 text-[9px]  bg-muted-100 text-muted-500">{{
            officialDocumentsCount }}</span>

          <span v-if="activeTab === tab.key"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t-full" />
        </button>
      </div>
    </div>

    <!-- ═══ BODY ═══ -->
    <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
      <!-- Loading -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center w-full h-full min-h-[400px]">
        <BaseLoader class="mb-4 size-10 text-primary-500" />
        <BaseParagraph size="sm" class="text-muted-500">
          Carregando detalhes do IR...
        </BaseParagraph>
      </div>

      <template v-else-if="declaration">
        <!-- ════ MAIN CONTENT ════ -->
        <div class="flex-1 overflow-y-auto p-6 md:p-8 bg-white dark:bg-muted-900 nui-slimscroll">
          <!-- ━━━ TAB: DETALHES ━━━ -->
          <div v-if="activeTab === 'details'" class="space-y-6 animate-fade-in">
            <!-- Cliente: card compacto no topo -->
            <div
              class="flex items-center gap-4 p-4 rounded-xl bg-muted-50 dark:bg-muted-900/50 border border-muted-200 dark:border-muted-800">
              <div
                class="size-11 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                <Icon name="lucide:user" class="size-5 text-primary-500" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-muted-800 dark:text-muted-100">
                  {{ declaration.client?.name }}
                </p>
                <div class="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span class="text-xs text-muted-500">{{ declaration.client?.cpf }}</span>
                  <span class="text-muted-300 dark:text-muted-700">·</span>
                  <span class="text-xs text-muted-500">{{ declaration.client?.phone || 'Sem telefone' }}</span>
                </div>
                <!-- Link de Coleta -->
                <div class="mt-2 flex flex-col gap-1">
                  <div class="flex items-center gap-2">
                    <Icon name="lucide:link" class="size-3.5 text-muted-400" />
                    <BaseText size="xs" class="text-muted-500 uppercase font-bold">
                      Link de Coleta
                    </BaseText>
                  </div>
                  <div v-if="collectionLink" class="flex items-center gap-2">
                    <span v-if="fullCollectionLink"
                      class="text-xs text-muted-500 break-all bg-muted-50 dark:bg-muted-800 p-1 rounded border border-muted-200 dark:border-muted-700 select-all">
                      {{ fullCollectionLink }}
                    </span>
                    <BaseButton size="sm" variant="none" class="px-2 py-1 bg-primary-500 text-white shrink-0"
                      @click="copyLink">
                      <Icon name="lucide:copy" class="size-3" />
                    </BaseButton>
                  </div>
                  <div v-else class="ml-auto">
                    <BaseButton size="sm" variant="primary" :loading="isGeneratingLink" @click="generateLink">
                      <Icon name="lucide:link" class="size-3.5 mr-1.5" /> Gerar
                    </BaseButton>
                  </div>
                </div>
              </div>
              <!-- Tags inline do cliente -->
              <div v-if="form.tags.length > 0" class="flex flex-wrap gap-1 shrink-0">
                <BaseTag v-for="tag in form.tags" :key="tag" size="sm" variant="none"
                  class="text-[10px] bg-primary-500 text-white">
                  {{ tag }}
                </BaseTag>
              </div>
              <BaseButton size="sm" variant="muted" rounded="lg" class="shrink-0"
                @click="showClientDetailsPanel = true">
                <Icon name="lucide:id-card" class="size-4 mr-1.5" /> Detalhes
              </BaseButton>
            </div>

            <!-- Descrição: campo principal, grande e com destaque -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:align-left" class="size-4 text-muted-400" />
                  <BaseText size="xs" class="text-muted-500 uppercase  font-bold">
                    Descrição
                  </BaseText>
                </div>
                <BaseTag size="sm" variant="none"
                  class="text-[9px] uppercase font-bold tracking-tight bg-muted-100 text-muted-700">
                  Público — cliente vê
                </BaseTag>
              </div>
              <BaseTextarea v-model="form.description" rounded="lg" rows="7"
                placeholder="Adicione uma descrição detalhada, orientações ou instruções para o cliente..."
                class="bg-muted-50 dark:bg-muted-900/40 border border-muted-200 dark:border-muted-800 focus:border-primary-400 focus:ring-1 focus:ring-primary-500/20 text-sm leading-relaxed transition-colors"
                @blur="saveDebounced" />
            </div>

            <!-- Notas internas -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:eye-off" class="size-4 text-primary-500" />
                  <BaseText size="xs" class="text-primary-600 dark:text-primary-400 uppercase  font-bold">
                    Notas Internas
                  </BaseText>
                </div>
                <BaseTag size="sm" variant="none"
                  class="text-[9px] uppercase font-bold tracking-tight bg-primary-500 text-white">
                  Privado — apenas equipe
                </BaseTag>
              </div>
              <BaseTextarea v-model="form.internalNotes" rounded="lg" rows="4"
                placeholder="Notas visíveis apenas para a sua equipe..."
                class="bg-primary-50/40 dark:bg-primary-900/10 border border-primary-200/60 dark:border-primary-800/40 focus:border-primary-400 focus:ring-1 focus:ring-primary-500/20 text-sm leading-relaxed italic transition-colors"
                @blur="saveDebounced" />
            </div>

            <!-- Retificação (condicional) -->
            <div v-if="isRectified" class="space-y-2">
              <div class="flex items-center gap-2">
                <Icon name="lucide:alert-triangle" class="size-4 text-danger-500" />
                <BaseText size="xs" class="text-danger-500 uppercase  font-bold">
                  Motivo da Retificação
                </BaseText>
              </div>
              <BaseTextarea v-model="form.rectificationDescription" rounded="lg" rows="3"
                placeholder="Descreva o que motivou a retificação..."
                class="bg-danger-50/30 dark:bg-danger-900/10 border border-danger-200/60 dark:border-danger-800/40 text-sm leading-relaxed"
                @blur="saveDebounced" />
            </div>

            <!-- Docs Oficiais: compacto, 2x2 grid -->
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <Icon name="lucide:shield-check" class="size-4 text-muted-400" />
                <BaseText size="xs" class="text-muted-500 uppercase  font-bold">
                  Documentos Oficiais
                </BaseText>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div v-for="slot in officialDocumentSlots" :key="slot.category"
                  class="group relative flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-muted-950 transition-all"
                  :class="getSlotAttachment(slot.category)
                    ? 'border-success-200 dark:border-success-800 bg-success-50/40 dark:bg-success-900/10'
                    : 'border-muted-200 dark:border-muted-800 hover:border-primary-300'">
                  <div class="size-8 rounded-lg flex items-center justify-center shrink-0"
                    :class="getSlotAttachment(slot.category) ? 'bg-success-100 dark:bg-success-900/30' : 'bg-muted-100 dark:bg-muted-800'">
                    <Icon :name="slot.icon" class="size-4"
                      :class="getSlotAttachment(slot.category) ? 'text-success-500' : 'text-muted-400'" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-[10px] font-bold text-muted-600 dark:text-muted-300 uppercase tracking-tight">
                      {{ slot.label }}
                    </p>
                    <p v-if="getSlotAttachment(slot.category)"
                      class="text-[10px] text-success-600 font-semibold mt-0.5 truncate">
                      ✓ Enviado
                    </p>
                    <p v-else class="text-[10px] text-muted-400 mt-0.5">
                      Aguardando...
                    </p>
                  </div>
                  <!-- actions on hover -->
                  <div class="flex gap-1 shrink-0">
                    <template v-if="getSlotAttachment(slot.category)">
                      <button
                        class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-all"
                        @click="openPreview({ attachment: getSlotAttachment(slot.category), title: slot.label })">
                        <Icon name="solar:eye-bold-duotone" class="size-3.5" />
                      </button>
                      <button
                        class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-danger-500 transition-all"
                        @click="deleteOfficialDocument(getSlotAttachment(slot.category).id)">
                        <Icon name="lucide:trash-2" class="size-3.5" />
                      </button>
                    </template>
                    <button v-else
                      class="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm"
                      @click="triggerOfficialUpload(slot.category)">
                      <Icon name="lucide:upload" class="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── HISTÓRICO: timeline leve, sem cards ── -->
            <div class="space-y-2 pt-2">
              <div class="flex items-center gap-2">
                <Icon name="lucide:clock" class="size-4 text-muted-400" />
                <BaseText size="xs" class="text-muted-400 uppercase  font-bold">
                  Histórico
                </BaseText>
                <span class="text-[9px] text-muted-300 font-normal ml-1">({{ declaration.auditLogs?.length || 0 }}
                  entradas)</span>
              </div>

              <div v-if="declaration.auditLogs?.length > 0"
                class="relative pl-4 border-l-2 border-muted-200 dark:border-muted-800 ml-2 space-y-3 max-h-[260px] overflow-y-auto pr-1">
                <div v-for="log in declaration.auditLogs" :key="log.id" class="flex items-start gap-2.5">
                  <!-- dot no timeline -->
                  <div
                    class="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-muted-300 dark:bg-muted-600 border-2 border-white dark:border-muted-900 shrink-0" />

                  <!-- conteúdo inline -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-baseline gap-2 flex-wrap">
                      <span class="text-xs font-semibold text-muted-700 dark:text-muted-200">{{ log.userName ||
                        'Sistema' }}</span>
                      <span class="text-[10px] text-muted-400">{{ new Date(log.createdAt).toLocaleString('pt-BR')
                        }}</span>
                    </div>
                    <p class="text-xs text-muted-500 dark:text-muted-400 mt-0.5 leading-snug">
                      {{ log.description }}
                    </p>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-muted-400 italic ml-3">
                Nenhuma atividade registrada.
              </p>
            </div>
          </div>

          <!-- ━━━ TAB: CHECKLIST ━━━ -->
          <div v-if="activeTab === 'checklist'" class="space-y-5 animate-fade-in">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Icon name="lucide:check-square" class="size-4 text-muted-400" />
                <BaseText size="xs" class="text-muted-500 uppercase  font-bold">
                  Checklist
                </BaseText>
              </div>
              <div class="flex items-center gap-3">
                <span v-if="isSavingChecklist" class="animate-spin text-primary-500">
                  <Icon name="svg-spinners:ring-resize" class="size-4" />
                </span>
                <span class="text-xs text-muted-400 font-semibold">{{checklistItems.filter(i => i.status ===
                  'approved').length
                  }}/{{ checklistItems.length }} aprovados</span>
              </div>
            </div>

            <!-- Input + botão -->
            <div class="flex gap-2">
              <BaseInput v-model="newChecklistTitle" placeholder="Ex: RG, CPF, Comprovante de renda..." size="sm"
                rounded="lg" class="flex-1" @keyup.enter="addChecklistItem" />
              <BaseButton size="sm" variant="primary" rounded="lg" @click="addChecklistItem">
                <Icon name="lucide:plus" class="size-4 mr-1" /> Adicionar
              </BaseButton>
            </div>

            <!-- Progress bar -->
            <div v-if="checklistItems.length > 0" class="w-full bg-muted-200 dark:bg-muted-800 rounded-full h-1.5">
              <div class="h-1.5 rounded-full transition-all duration-500"
                :class="checklistItems.filter(i => i.status === 'approved').length === checklistItems.length && checklistItems.length > 0 ? 'bg-success-500' : 'bg-primary-500'"
                :style="`width: ${checklistItems.length > 0 ? (checklistItems.filter(i => i.status === 'approved').length / checklistItems.length) * 100 : 0}%`" />
            </div>

            <!-- Items -->
            <div class="space-y-2">
              <div v-for="(item, idx) in checklistItems" :key="item.id || idx"
                class="group flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-muted-950 transition-all"
                :class="{
                  'border-success-200 dark:border-success-800 bg-success-50/40 dark:bg-success-900/10': item.status === 'approved',
                  'border-danger-200 dark:border-danger-800 bg-danger-50/40 dark:bg-danger-900/10': item.status === 'rejected',
                  'border-warning-200 dark:border-warning-800 bg-warning-50/40 dark:bg-warning-900/10': item.status === 'uploaded',
                  'border-muted-200 dark:border-muted-800 hover:border-primary-300': item.status === 'pending',
                }">
                <!-- Status icon -->
                <div class="size-6 rounded-full flex items-center justify-center shrink-0" :class="{
                  'bg-success-100 text-success-600': item.status === 'approved',
                  'bg-danger-100 text-danger-600': item.status === 'rejected',
                  'bg-warning-100 text-warning-600': item.status === 'uploaded',
                  'bg-muted-100 dark:bg-muted-800 text-muted-400': item.status === 'pending',
                }">
                  <Icon :name="statusIcon(item.status)" class="size-3" />
                </div>

                <!-- Title -->
                <div class="flex-1 min-w-0 flex items-center gap-2">
                  <p class="text-sm font-medium text-muted-800 dark:text-muted-100 truncate">
                    {{ item.title }}
                  </p>
                  <BaseTag v-if="item.isRequired" size="sm" variant="none"
                    class="text-[9px] shrink-0 bg-danger-500 text-white">
                    Obrigatório
                  </BaseTag>
                  <BaseTag v-if="item.status !== 'pending'" size="sm" :class="statusTagClass(item.status)"
                    variant="none" class="text-[9px] shrink-0 capitalize">
                    {{ statusLabel(item.status) }}
                  </BaseTag>
                </div>

                <!-- Arquivo enviado: nome + ações -->
                <div v-if="item.status === 'uploaded' && item.attachment" class="flex items-center gap-2 shrink-0">
                  <span class="text-[10px] text-muted-400 truncate max-w-[100px]">{{ item.attachment.fileName }}</span>
                  <BaseButton variant="ghost" color="primary" size="icon-sm" @click="openPreview(item)">
                    <Icon name="solar:eye-bold-duotone" class="size-3.5" />
                  </BaseButton>
                  <BaseButton color="success" size="icon-sm" @click="updateItemStatus(item.id, 'approved')">
                    <Icon name="lucide:check" class="size-3.5" />
                  </BaseButton>
                  <BaseButton color="danger" size="icon-sm" @click="updateItemStatus(item.id, 'rejected')">
                    <Icon name="lucide:x" class="size-3.5" />
                  </BaseButton>
                </div>

                <!-- Actions: required toggle + delete -->
                <div v-if="item.status !== 'uploaded' || !item.attachment" class="flex items-center gap-0.5 shrink-0">
                  <button class="p-1.5 rounded-lg hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors"
                    :class="item.isRequired ? 'text-danger-500' : 'text-muted-400 hover:text-primary-500'"
                    @click="toggleItemRequired(idx)">
                    <Icon :name="item.isRequired ? 'lucide:alert-circle' : 'lucide:circle'" class="size-3.5" />
                  </button>
                  <button
                    class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-muted-400 hover:text-danger-500 transition-all"
                    @click="removeChecklistItem(idx)">
                    <Icon name="lucide:trash-2" class="size-3.5" />
                  </button>
                </div>
              </div>

              <div v-if="checklistItems.length === 0"
                class="text-center py-10 border-2 border-dashed border-muted-200 dark:border-muted-800 rounded-xl">
                <Icon name="lucide:clipboard-list" class="size-8 text-muted-200 mx-auto mb-2" />
                <p class="text-xs text-muted-400">
                  Adicione itens ao checklist acima
                </p>
              </div>
            </div>
          </div>

          <!-- ━━━ TAB: ANEXOS ━━━ -->
          <div v-if="activeTab === 'attachments'" class="space-y-6 animate-fade-in">
            <input ref="fileInput" type="file" class="hidden" @change="handleFileUpload">

            <!-- Anexos do cliente -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:paperclip" class="size-4 text-muted-400" />
                  <BaseText size="xs" class="text-muted-500 uppercase  font-bold">
                    Anexos <span class="text-muted-300">({{ filteredAttachments.length }})</span>
                  </BaseText>
                </div>
                <BaseButton size="sm" variant="muted" rounded="lg" @click="triggerUpload">
                  <Icon name="lucide:upload" class="size-3.5 mr-1.5" /> Adicionar
                </BaseButton>
              </div>

              <div v-if="filteredAttachments.length > 0" class="grid grid-cols-2 md:grid-cols-3 gap-3">
                <BaseCard v-for="att in filteredAttachments" :key="att.id" rounded="lg"
                  class="p-3 border-muted-200 dark:border-muted-800 hover:border-primary-400 hover:shadow-sm transition-all cursor-pointer group bg-white dark:bg-muted-950">
                  <div class="flex items-start gap-3">
                    <div
                      class="size-9 rounded-lg bg-muted-100 dark:bg-muted-800 flex items-center justify-center shrink-0 group-hover:bg-primary-100 group-hover:text-primary-500 transition-colors">
                      <Icon name="lucide:file-text"
                        class="size-4.5 text-muted-500 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-semibold truncate text-muted-700 dark:text-muted-200"
                        :title="att.fileName">
                        {{ att.fileName }}
                      </p>
                      <p class="text-[10px] text-muted-400 capitalize mt-0.5">
                        {{ att.category || 'Geral' }}
                      </p>
                    </div>
                  </div>
                  <div
                    class="flex gap-1 mt-2.5 pt-2 border-t border-muted-100 dark:border-muted-800 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      class="flex-1 flex items-center justify-center gap-1 text-[10px] text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded py-0.5 transition-colors"
                      @click.stop="openPreview({ attachment: att, title: 'Anexo' })">
                      <Icon name="solar:eye-bold-duotone" class="size-3" /> Ver
                    </button>
                    <button
                      class="flex-1 flex items-center justify-center gap-1 text-[10px] text-muted-500 hover:bg-muted-100 dark:hover:bg-muted-800 rounded py-0.5 transition-colors"
                      @click.stop="handleDownload(att)">
                      <Icon name="lucide:download" class="size-3" /> Baixar
                    </button>
                  </div>
                </BaseCard>
              </div>
              <div v-else
                class="text-center py-10 border-2 border-dashed border-muted-200 dark:border-muted-800 rounded-xl">
                <Icon name="lucide:paperclip" class="size-8 text-muted-200 mx-auto mb-2" />
                <p class="text-xs text-muted-400">
                  Nenhum anexo. Clique "Adicionar" para enviar.
                </p>
              </div>
            </div>
          </div>

          <!-- ━━━ TAB: DOCUMENTOS OFICIAIS ━━━ -->
          <div v-if="activeTab === 'official_documents'" class="space-y-6 animate-fade-in">
            <input ref="officialFileInput" type="file" class="hidden" @change="handleOfficialFileUpload">
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <Icon name="lucide:shield-check" class="size-4 text-primary-500" />
                <BaseText size="xs" class="text-muted-500 uppercase  font-bold">
                  Documentos Oficiais
                </BaseText>
              </div>
              <div class="space-y-2">
                <div v-for="slot in officialDocumentSlots" :key="slot.category"
                  class="group flex items-center gap-4 p-3.5 rounded-xl border bg-white dark:bg-muted-950 transition-all"
                  :class="getSlotAttachment(slot.category)
                    ? 'border-success-200 dark:border-success-800 bg-success-50/30 dark:bg-success-900/10'
                    : 'border-muted-200 dark:border-muted-800 hover:border-primary-300'">
                  <div class="size-9 rounded-lg flex items-center justify-center shrink-0"
                    :class="getSlotAttachment(slot.category) ? 'bg-success-100 dark:bg-success-900/30' : 'bg-muted-100 dark:bg-muted-800'">
                    <Icon :name="slot.icon" class="size-4.5"
                      :class="getSlotAttachment(slot.category) ? 'text-success-500' : 'text-muted-400'" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-muted-700 dark:text-muted-200">
                      {{ slot.label }}
                    </p>
                    <p class="text-[10px] text-muted-400 mt-0.5 truncate">
                      {{ getSlotAttachment(slot.category)?.fileName || 'Aguardando envio' }}
                    </p>
                  </div>
                  <BaseTag v-if="getSlotAttachment(slot.category)" size="sm" variant="none"
                    class="text-[9px] shrink-0 bg-success-500 text-white">
                    Enviado
                  </BaseTag>
                  <BaseTag v-else size="sm" variant="none" class="text-[9px] shrink-0 bg-muted-200 text-muted-700">
                    Pendente
                  </BaseTag>
                  <div class="flex gap-1 shrink-0">
                    <template v-if="getSlotAttachment(slot.category)">
                      <button
                        class="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 transition-colors"
                        @click="openPreview({ attachment: getSlotAttachment(slot.category), title: slot.label })">
                        <Icon name="solar:eye-bold-duotone" class="size-4" />
                      </button>
                      <button
                        class="p-1.5 rounded-lg hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-400 transition-colors"
                        @click="handleDownload(getSlotAttachment(slot.category))">
                        <Icon name="lucide:download" class="size-4" />
                      </button>
                      <button
                        class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-danger-500 transition-all"
                        @click="deleteOfficialDocument(getSlotAttachment(slot.category).id)">
                        <Icon name="lucide:trash-2" class="size-4" />
                      </button>
                    </template>
                    <button v-else
                      class="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm"
                      @click="triggerOfficialUpload(slot.category)">
                      <Icon name="lucide:upload" class="size-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div class="flex gap-2 p-3 bg-primary-500/5 border border-primary-500/20 rounded-lg">
                <Icon name="solar:info-circle-bold-duotone" class="size-4 text-primary-500 shrink-0 mt-0.5" />
                <p class="text-[10px] text-muted-500 leading-relaxed">
                  Documentos finais processados pelo contador. O cliente não pode removê-los via link.
                </p>
              </div>
            </div>
          </div>

          <!-- ━━━ TAB: COMUNICAÇÃO ━━━ -->
          <div v-if="activeTab === 'communication'" class="space-y-6 animate-fade-in">
            <!-- SMS -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:send" class="size-4 text-muted-400" />
                  <BaseText size="xs" class="text-muted-500 uppercase  font-bold">
                    Enviar SMS
                  </BaseText>
                </div>
                <BaseTag size="sm" variant="none" class="text-[9px] bg-success-500 text-white">
                  GSM Standard
                </BaseTag>
              </div>

              <!-- Templates grid 2x2 -->
              <div class="grid grid-cols-2 gap-2">
                <button v-for="(tpl, idx) in smsTemplates" :key="tpl.id"
                  class="text-left p-3 rounded-xl border transition-all group" :class="selectedTemplateIndex === idx
                    ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500'
                    : 'border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-950 hover:border-primary-400'"
                  @click="handleSelectTemplate(idx)">
                  <div class="flex items-center gap-2.5">
                    <div class="size-8 rounded-lg flex items-center justify-center transition-colors"
                      :class="selectedTemplateIndex === idx ? 'bg-primary-500 text-white' : 'bg-muted-100 dark:bg-muted-800 text-muted-500 group-hover:bg-primary-100 group-hover:text-primary-500'">
                      <Icon :name="tpl.icon" class="size-4" />
                    </div>
                    <p class="text-xs font-bold text-muted-700 dark:text-muted-200">
                      {{ tpl.title }}
                    </p>
                  </div>
                </button>
              </div>

              <!-- Preview + envio -->
              <div v-if="selectedTemplateIndex !== null"
                class="animate-fade-in p-4 rounded-xl bg-primary-500/5 border border-primary-500/20">
                <p class="text-xs text-muted-600 dark:text-muted-300 italic leading-relaxed mb-3">
                  "{{ smsMessage }}"
                </p>
                <div class="flex items-center justify-between">
                  <p class="text-[10px] text-muted-400">
                    Para: {{ declaration.client?.phone || '—' }} · {{ smsMessage.length }}/160
                  </p>
                  <BaseButton variant="primary" size="sm" :loading="isSendingSms" @click="sendSms">
                    <Icon name="solar:paper-plane-bold" class="size-3.5 mr-1.5" /> Enviar Agora
                  </BaseButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ════ SIDEBAR ════ -->
        <div
          class="w-full md:w-[300px] border-t md:border-t-0 md:border-l border-muted-200 dark:border-muted-800 md:shrink-0 bg-muted-50/30 dark:bg-muted-950/20 overflow-y-auto nui-slimscroll h-full">
          <div class="p-5 space-y-5">
            <!-- STATUS -->
            <div class="space-y-1.5">
              <BaseText size="xs" class="text-muted-400 uppercase  font-bold">
                Status
              </BaseText>
              <BaseSelect v-model="form.status" rounded="md" size="sm" @update:model-value="saveDebounced">
                <BaseSelectItem v-for="opt in kanbanColumns" :key="opt.value" :value="opt.value">
                  <div class="flex items-center gap-2">
                    <span class="size-2 rounded-full"
                      :style="`background-color: var(--color-${opt.color || 'gray'}-500, #9ca3af)`" />
                    <span class="text-sm font-medium">{{ opt.label }}</span>
                  </div>
                </BaseSelectItem>
              </BaseSelect>
            </div>

            <div class="border-t border-muted-200 dark:border-muted-800" />

            <!-- RESULTADO FINANCEIRO: destaque visual -->
            <div class="space-y-2">
              <BaseText size="xs" class="text-muted-400 uppercase  font-bold">
                Resultado do IR
              </BaseText>
              <div class="flex items-center gap-2">
                <BaseSelect v-model="form.result" rounded="md" size="sm" class="flex-1"
                  @update:model-value="saveDebounced">
                  <BaseSelectItem v-for="opt in resultOptions" :key="opt.value" :value="opt.value">
                    <span class="text-sm font-medium">{{ opt.label }}</span>
                  </BaseSelectItem>
                </BaseSelect>
              </div>
              <!-- Valor com destaque visual forte -->
              <div v-if="form.result !== 'neutral'" class="flex items-center gap-2 mt-1">
                <div class="flex-1 relative">
                  <BaseInput v-model="form.resultValue" type="number" step="0.01" size="sm" rounded="md"
                    placeholder="0,00" class="text-sm font-bold pr-16" @blur="saveDebounced" />
                  <span
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-400">BRL</span>
                </div>
              </div>
              <!-- Valor formatado destaque -->
              <div v-if="form.result !== 'neutral'" class="mt-1 px-3 py-1.5 rounded-lg"
                :class="form.result === 'restitution' ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800' : 'bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800'">
                <p class="text-[10px] font-bold uppercase "
                  :class="form.result === 'restitution' ? 'text-success-600' : 'text-danger-600'">
                  {{ form.result === 'restitution' ? '↑ Restituição' : '↓ A Pagar' }}
                </p>
                <p class="text-lg font-bold"
                  :class="form.result === 'restitution' ? 'text-success-700 dark:text-success-400' : 'text-danger-700 dark:text-danger-400'">
                  R$ {{ Number(form.resultValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
                </p>
              </div>
            </div>

            <div class="border-t border-muted-200 dark:border-muted-800" />

            <!-- RESPONSÁVEL + PRIORIDADE + PRAZO -->
            <div class="space-y-3.5">
              <!-- Responsável -->
              <div class="space-y-1.5">
                <BaseText size="xs" class="text-muted-400 uppercase  font-bold">
                  Responsável
                </BaseText>
                <BaseSelect v-model="form.assignedToId" rounded="md" size="sm" @update:model-value="saveDebounced">
                  <BaseSelectItem value="unassigned">
                    <span class="text-muted-400 text-xs">Sem responsável</span>
                  </BaseSelectItem>
                  <BaseSelectItem v-for="member in teamMembers" :key="member.id" :value="member.id">
                    <div class="flex items-center gap-2">
                      <BaseAvatar :src="member.photo" :text="member.name?.charAt(0).toUpperCase()" size="xs" />
                      <span class="text-xs font-medium">{{ member.name }}</span>
                    </div>
                  </BaseSelectItem>
                </BaseSelect>
              </div>

              <!-- Prioridade -->
              <div class="space-y-1.5">
                <BaseText size="xs" class="text-muted-400 uppercase  font-bold">
                  Prioridade
                </BaseText>
                <div class="flex gap-1.5">
                  <button v-for="p in priorityOptions" :key="p.value" type="button"
                    class="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1"
                    :class="form.priority === p.value
                      ? 'bg-white dark:bg-muted-800 border-primary-500 text-primary-600 shadow-sm'
                      : 'border-muted-200 dark:border-muted-700 hover:border-muted-300 text-muted-500'"
                    @click="form.priority = p.value; saveDebounced()">
                    <Icon :name="p.icon" class="size-3" :class="p.color" /> {{ p.label }}
                  </button>
                </div>
              </div>

              <!-- Prazo -->
              <div class="space-y-1.5">
                <BaseText size="xs" class="text-muted-400 uppercase  font-bold">
                  Prazo
                </BaseText>
                <BaseInput v-model="form.dueDate" type="date" size="sm" rounded="md" @change="saveDebounced" />
              </div>
            </div>

            <div class="border-t border-muted-200 dark:border-muted-800" />

            <!-- TIPO DE DECLARAÇÃO -->
            <div class="space-y-1.5">
              <BaseText size="xs" class="text-muted-400 uppercase  font-bold">
                Tipo de Declaração
              </BaseText>
              <div class="flex gap-1.5">
                <button v-for="opt in declarationTypeOptions" :key="opt.value"
                  class="flex-1 text-xs p-2 rounded-lg border transition-all font-medium" :class="form.declarationType === opt.value
                    ? 'border-primary-500 bg-primary-500/5 text-primary-600'
                    : 'border-muted-200 dark:border-muted-700 text-muted-400 hover:border-muted-300'"
                  @click="form.declarationType = opt.value; saveDebounced()">
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div class="border-t border-muted-200 dark:border-muted-800" />

            <!-- FINANCEIRO: honorários + pagamento -->
            <div class="space-y-3">
              <BaseText size="xs" class="text-muted-400 uppercase  font-bold">
                Financeiro
              </BaseText>
              <!-- Honorários -->
              <div class="space-y-1.5">
                <BaseText size="xs" class="text-muted-400 font-semibold">
                  Valor do Serviço
                </BaseText>
                <BaseInput v-model="form.serviceValue" type="number" step="0.01" size="sm" rounded="md"
                  icon="lucide:dollar-sign" placeholder="0,00" @blur="saveDebounced" />
              </div>
              <!-- Pagamento -->
              <div class="space-y-1.5">
                <BaseText size="xs" class="text-muted-400 font-semibold">
                  Status do Pagamento
                </BaseText>
                <BaseSelect v-model="form.paymentStatus" rounded="md" size="sm" @update:model-value="saveDebounced">
                  <BaseSelectItem v-for="opt in paymentStatusOptions" :key="opt.value" :value="opt.value">
                    <div class="flex items-center gap-2">
                      <div class="size-2 rounded-full" :class="{
                        'bg-success-500': opt.value === 'paid',
                        'bg-warning-500': opt.value === 'partial' || opt.value === 'processing',
                        'bg-danger-500': opt.value === 'pending',
                      }" />
                      <span class="text-xs font-medium">{{ opt.label }}</span>
                    </div>
                  </BaseSelectItem>
                </BaseSelect>
              </div>
            </div>

            <div class="border-t border-muted-200 dark:border-muted-800" />

            <!-- TAGS + GOV.BR: campos que estavam ocultos -->
            <div class="space-y-3">
              <!-- Tags -->
              <div class="space-y-1.5">
                <BaseText size="xs" class="text-muted-400 uppercase  font-bold">
                  Tags
                </BaseText>
                <div class="flex flex-wrap gap-1.5">
                  <BaseTag v-for="tag in form.tags" :key="tag" size="sm" variant="none"
                    class="group relative text-[10px] pr-5 bg-primary-500 text-white">
                    {{ tag }}
                    <button
                      class="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-danger-500 transition-all"
                      @click="removeTag(tag)">
                      <Icon name="lucide:x" class="size-2.5" />
                    </button>
                  </BaseTag>
                </div>
                <div class="flex gap-1.5 mt-1">
                  <BaseInput v-model="newTag" placeholder="Nova tag..." size="sm" rounded="md" class="flex-1 text-xs"
                    @keyup.enter="addTag" />
                  <BaseButton size="sm" variant="muted" @click="addTag">
                    <Icon name="lucide:plus" class="size-3.5" />
                  </BaseButton>
                </div>
              </div>

              <!-- Senha GOV.br -->
              <div class="space-y-1.5">
                <BaseText size="xs" class="text-muted-400 uppercase  font-bold">
                  Senha GOV.br
                </BaseText>
                <div class="relative">
                  <BaseInput v-model="form.govPassword" :type="showGovPassword ? 'text' : 'password'" size="sm"
                    rounded="md" placeholder="Senha do cliente" class="pr-9 text-xs" @blur="saveDebounced" />
                  <button type="button"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-400 hover:text-primary-500 transition-colors"
                    @click="showGovPassword = !showGovPassword">
                    <Icon :name="showGovPassword ? 'solar:eye-bold-duotone' : 'solar:eye-closed-bold-duotone'"
                      class="size-4" />
                  </button>
                </div>
              </div>
            </div>

            <div class="border-t border-muted-200 dark:border-muted-800" />

            <!-- AÇÕES -->
            <div class="space-y-2">
              <BaseButton variant="muted" rounded="lg" size="sm"
                class="w-full text-danger-500 hover:text-danger-600 hover:bg-danger-500/5 transition-colors"
                @click="confirmDelete">
                <Icon name="lucide:trash-2" class="size-3.5 mr-2" /> Excluir Declaração
              </BaseButton>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ═══ MODAL: Checklist Upload ═══ -->
    <DialogRoot v-model:open="showChecklistModal">
      <DialogPortal>
        <DialogOverlay class="bg-muted-800/70 dark:bg-muted-900/80 fixed inset-0 z-[100]" />
        <DialogContent
          class="fixed starting:opacity-0 starting:top-[8%] top-[10%] start-[50%] max-h-[85vh] w-[90vw] max-w-[32rem] translate-x-[-50%] rounded-lg overflow-hidden border border-muted-200 dark:border-muted-700 bg-white dark:bg-muted-800 focus:outline-none z-[101] transition-discrete transition-all duration-200 ease-out flex flex-col">
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
              Este arquivo corresponde a algum documento do checklist? Selecione abaixo.
            </DialogDescription>
            <!-- File card -->
            <div
              class="bg-muted-50 dark:bg-muted-900/40 rounded-xl p-4 border border-muted-200 dark:border-muted-700 flex items-center gap-3">
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
            <!-- Checklist items -->
            <div class="space-y-2">
              <BaseText size="xs" class="text-muted-400 uppercase tracking-wider font-bold">
                Selecione o documento correspondente
              </BaseText>
              <button v-for="item in checklistItems.filter(i => i.status === 'pending')" :key="item.id" type="button"
                class="w-full text-left p-4 rounded-xl border transition-all"
                :class="selectedChecklistItemId === item.id ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500' : 'border-muted-200 dark:border-muted-800 hover:border-primary-500/50'"
                @click="selectedChecklistItemId = item.id">
                <div class="flex items-center gap-3">
                  <div class="size-8 rounded-full flex items-center justify-center transition-colors"
                    :class="selectedChecklistItemId === item.id ? 'bg-primary-500 text-white' : 'bg-muted-100 dark:bg-muted-800 text-muted-500'">
                    <Icon name="solar:document-text-bold-duotone" class="size-4" />
                  </div>
                  <div class="flex-1">
                    <BaseText size="sm" weight="medium" class="text-muted-900 dark:text-white">
                      {{ item.title }}
                    </BaseText>
                    <BaseTag v-if="item.isRequired" size="sm" variant="none"
                      class="mt-1 scale-90 origin-left bg-danger-500 text-white">
                      Obrigatório
                    </BaseTag>
                  </div>
                  <Icon v-if="selectedChecklistItemId === item.id" name="solar:check-circle-bold"
                    class="size-5 text-primary-500" />
                </div>
              </button>
            </div>
          </div>
          <div
            class="p-6 border-t border-muted-200 dark:border-muted-800 flex justify-end gap-3 bg-muted-50/50 dark:bg-muted-900/50">
            <BaseButton @click="cancelChecklistUpload">
              Cancelar
            </BaseButton>
            <BaseButton variant="primary" rounded="lg" @click="confirmChecklistUpload">
              <Icon name="solar:upload-bold-duotone" class="size-4 mr-2" /> Enviar e Vincular
            </BaseButton>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- ═══ MODAL: Preview ═══ -->
    <DialogRoot v-model:open="showPreviewModal">
      <DialogPortal>
        <DialogOverlay class="bg-muted-800/70 dark:bg-muted-900/80 fixed inset-0 z-[110]" />
        <DialogContent
          class="fixed starting:opacity-0 starting:top-[45%] top-[50%] start-[50%] max-h-[95vh] w-[95vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] rounded-xl overflow-hidden border border-muted-200 dark:border-muted-700 bg-white dark:bg-muted-800 shadow-2xl focus:outline-none z-[111] transition-discrete transition-all duration-300 ease-out flex flex-col">
          <!-- Header -->
          <div
            class="flex items-center justify-between p-4 border-b border-muted-200 dark:border-muted-800 bg-muted-50/50 dark:bg-muted-900/50">
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                <Icon name="solar:file-bold-duotone" class="size-6" />
              </div>
              <div class="min-w-0">
                <DialogTitle class="text-sm font-semibold text-muted-900 dark:text-white truncate">
                  {{ previewItem?.attachment?.fileName || 'Visualizar' }}
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
          <div
            class="flex-1 overflow-auto bg-muted-100 dark:bg-muted-900 flex items-center justify-center p-4 min-h-[60vh]">
            <div v-if="isPreviewLoading" class="text-center py-20">
              <Icon name="svg-spinners:ring-resize" class="size-12 text-primary-500 mb-4 mx-auto" />
              <BaseParagraph size="sm" class="text-muted-500">
                Buscando documento...
              </BaseParagraph>
            </div>
            <template v-else-if="signedPreviewUrl">
              <iframe v-if="previewItem?.attachment?.mimeType === 'application/pdf'" :src="signedPreviewUrl"
                class="w-full h-full min-h-[75vh] rounded-lg border border-muted-200 dark:border-muted-800" />
              <img v-else-if="previewItem?.attachment?.mimeType?.startsWith('image/')" :src="signedPreviewUrl"
                class="max-w-full max-h-full object-contain rounded-lg shadow-lg" alt="Documento">
              <div v-else class="text-center p-12">
                <div
                  class="size-20 mx-auto mb-4 rounded-3xl bg-muted-200 dark:bg-muted-800 flex items-center justify-center">
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
          <!-- Footer -->
          <div
            class="p-4 border-t border-muted-200 dark:border-muted-800 flex justify-center gap-3 bg-muted-50/50 dark:bg-muted-900/50">
            <BaseButton color="danger" @click="updateItemStatus(previewItem.id, 'rejected'); showPreviewModal = false">
              <Icon name="lucide:x" class="size-4 mr-2" /> Rejeitar
            </BaseButton>
            <BaseButton color="success" @click="updateItemStatus(previewItem.id, 'approved'); showPreviewModal = false">
              <Icon name="lucide:check" class="size-4 mr-2" /> Aprovar
            </BaseButton>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Overlay: Detalhes do Cliente -->
    <Teleport to="body">
      <div v-if="showClientDetailsPanel" class="fixed inset-0 z-[120]">
        <div class="bg-muted-800/70 dark:bg-muted-900/80 absolute inset-0" @click="showClientDetailsPanel = false" />
        <div class="absolute start-auto end-0 top-0 h-full">
          <PanelsPanelClientDetails :client-id="declaration.client?.id" @close="showClientDetailsPanel = false" />
        </div>
      </div>
    </Teleport>
  </FocusScope>
</template>
