<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

interface Props {
  declarationId: string
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'saved'])

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()
const { open } = usePanels()
// No import needed for auto-imported components, or use direct import if needed
// import PanelsPanelClientDetails from '~/components/panels/PanelClientDetails.vue'

// States
const isLoading = ref(true)
const isSaving = ref(false)
const declaration = ref<any>(null)
const isGeneratingLink = ref(false)
const collectionLink = ref<any>(null)
const activeTab = ref('activity')
const smsMessage = ref('')
const selectedTemplateIndex = ref<number | null>(null)
const isSendingSms = ref(false)
const activeSidebarTab = ref('details')

const smsTemplates = [
  {
    id: 1,
    icon: 'solar:document-add-linear',
    title: 'Pedir Docs',
    message: 'Ola [NOME], envie seus documentos para o IR pelo link: [LINK]. Evite multas! ConsTar.'
  },
  {
    id: 2,
    icon: 'solar:refresh-linear',
    title: 'Status IR',
    message: 'Ola [NOME], seu IR mudou para: [STATUS]. Acompanhe em nosso sistema. ConsTar.'
  },
  {
    id: 3,
    icon: 'solar:check-circle-linear',
    title: 'Transmitido',
    message: 'Ola [NOME], seu IR foi transmitido com sucesso! O recibo estara disponivel em breve. ConsTar.'
  },
  {
    id: 4,
    icon: 'solar:info-circle-linear',
    title: 'Aviso Geral',
    message: 'Ola [NOME], temos uma atualizacao no seu IR. Por favor, acesse [LINK] para verificar. Grato.'
  }
]

function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '')
}

function handleSelectTemplate(index: number) {
  const templateObj = smsTemplates[index]
  if (!templateObj) return

  selectedTemplateIndex.value = index
  const firstName = removeAccents(declaration.value?.client?.name?.split(' ')[0] || 'Cliente')
  const statusName = removeAccents(declaration.value?.column?.name || 'Atualizado')
  const fullUrl = collectionLink.value
    ? `${window.location.origin}${collectionLink.value.url}`
    : 'sistema'

  let msg = templateObj.message
    .replace('[NOME]', firstName)
    .replace('[STATUS]', statusName)
    .replace('[LINK]', fullUrl)

  smsMessage.value = removeAccents(msg).substring(0, 160)
}

// Form state
const form = ref({
  status: '',
  priority: '',
  declarationType: '',
  result: '',
  resultValue: 0,
  serviceValue: 0,
  paymentStatus: '',
  dueDate: '',
  description: '',
  internalNotes: '',
  assignedToId: '',
})

// Team members for assignee dropdown
const teamMembers = ref<any[]>([])
const isLoadingTeam = ref(false)

// Options
const statusOptions = [
  { label: 'Pendente', value: 'pending', color: 'warning' },
  { label: 'Em Progresso', value: 'in_progress', color: 'info' },
  { label: 'Transmitida', value: 'submitted', color: 'success' },
  { label: 'Retificadora', value: 'rectifying', color: 'danger' },
]

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
  { label: 'Pendente', value: 'pending' },
  { label: 'Parcial', value: 'partial' },
  { label: 'Pago', value: 'paid' },
]

// Methods
// Methods
const kanbanColumns = ref<any[]>([])

async function fetchKanbanColumns() {
  try {
    const { data } = await useCustomFetch<any>('/declarations/columns')
    if (data.success) {
      kanbanColumns.value = data.data.map((col: any) => ({
        label: col.name,
        value: col.id,
        id: col.id,
        color: col.color
      }))
    }
  } catch (error) {
    console.error('Erro ao buscar colunas:', error)
  }
}

const baseUrl = computed(() => {
  if (import.meta.server) return ''
  return window.location.origin
})

async function fetchTeamMembers() {
  isLoadingTeam.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant/members')
    if (data.success) {
      teamMembers.value = data.data
    }
  } catch (error) {
    console.error('Erro ao buscar equipe:', error)
  } finally {
    isLoadingTeam.value = false
  }
}

async function fetchDeclaration() {
  isLoading.value = true
  try {
    // Force cache bust with timestamp
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}?t=${Date.now()}`)
    if (data && data.success) {
      const result = data.data
      declaration.value = result

      // Populate form
      form.value = {
        // We are using columnId as "Status" for the dropdown as per request
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
      }

      // Check for latest collection link
      if (result.collectionLinks?.length > 0) {
        collectionLink.value = result.collectionLinks[0]
      }
    }
  } catch (error) {
    console.error('Erro ao buscar detalhes da declaração:', error)
  } finally {
    isLoading.value = false
  }
}

async function sendSms() {
  if (!smsMessage.value.trim()) {
    toaster.add({
      title: 'Erro',
      description: 'Digite uma mensagem para enviar',
      icon: 'ph:warning-circle-fill'
    })
    return
  }

  isSendingSms.value = true
  try {
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}/send-sms`, {
      method: 'POST',
      body: { message: smsMessage.value }
    })

    if (data.value && data.value.success) {
      toaster.add({
        title: 'Sucesso',
        description: 'SMS enviado para o cliente!',
        icon: 'ph:chat-circle-dots-fill'
      })
      smsMessage.value = ''
      // Refresh to see the new log
      await fetchDeclaration()
    } else {
      toaster.add({
        title: 'Erro',
        description: data.value?.message || 'Falha ao enviar SMS',
        icon: 'ph:warning-circle-fill'
      })
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: 'Erro na comunicação com o servidor',
      icon: 'ph:warning-circle-fill'
    })
  } finally {
    isSendingSms.value = false
  }
}

async function save() {
  isSaving.value = true
  try {
    const payload = { ...form.value }
    if (payload.assignedToId === 'unassigned') payload.assignedToId = ''

    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}`, {
      method: 'PUT',
      body: payload,
    })

    if (data.value && data.value.success) {
      toaster.add({
        title: 'Salvo',
        description: 'Alterações gravadas com sucesso',
        icon: 'ph:check-circle-fill'
      })
      await fetchDeclaration()
      emit('saved')
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao salvar alterações',
      icon: 'ph:warning-circle-fill'
    })
  } finally {
    isSaving.value = false
  }
}

async function remove() {
  if (!confirm('Tem certeza que deseja excluir esta declaração?')) return

  try {
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}`, {
      method: 'DELETE',
    })

    if (data.value && data.value.success) {
      toaster.add({
        title: 'Excluído',
        description: 'Declaração removida com sucesso',
        icon: 'ph:trash-fill'
      })
      emit('saved')
      emit('close')
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: 'Erro ao excluir declaração',
      icon: 'ph:warning-circle-fill'
    })
  }
}

function triggerUpload() {
  fileInput.value?.click()
}

function copyLink() {
  if (collectionLink.value) {
    const fullUrl = `${window.location.origin}${collectionLink.value.url}`
    navigator.clipboard.writeText(fullUrl)
    toaster.add({
      title: 'Copiado',
      description: 'Link copiado para a área de transferência',
      icon: 'ph:copy-fill'
    })
  }
}

async function generateLink() {
  isGeneratingLink.value = true
  try {
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}/collection-link`, {
      method: 'POST',
      body: { title: `Documentos para IR ${declaration.value.taxYear}` }
    })

    if (data.value && data.value.success) {
      collectionLink.value = data.value.data
      await fetchDeclaration()
    }
  } catch (error) {
    console.error('Erro ao gerar link:', error)
  } finally {
    isGeneratingLink.value = false
  }
}

const fileInput = ref<HTMLInputElement | null>(null)

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  try {
    toaster.add({
      title: 'Enviando...',
      description: `Enviando ${file.name}...`,
      icon: 'ph:clock-fill',
    })

    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}/attachments`, {
      method: 'POST',
      body: formData,
    })

    if (data.value && (data.value.success || data.value.id)) {
      toaster.add({
        title: 'Sucesso',
        description: 'Arquivo enviado com sucesso',
        icon: 'ph:check-circle-fill'
      })

      // Refresh data from server to get updated attachments and logs
      await fetchDeclaration()

      // Notify parent to update board (e.g. attachment count)
      emit('saved')
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao enviar arquivo',
      icon: 'ph:warning-circle-fill'
    })
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

onMounted(() => {
  fetchKanbanColumns() // Fetch dynamic columns
  fetchDeclaration()
  fetchTeamMembers()
})
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-700 dark:bg-muted-950 border-l bg-white w-full max-w-5xl shadow-2xl flex flex-col h-screen">
    <!-- Header -->
    <div
      class="border-muted-200 dark:border-muted-800 flex h-16 w-full items-center justify-between border-b px-6 shrink-0 z-20 bg-white dark:bg-muted-950">
      <div v-if="declaration" class="flex items-center gap-4">
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono text-muted-400">#{{ declaration.id.slice(0, 6) }}</span>
            <BaseHeading as="h3" size="sm" weight="medium" class="text-muted-800 dark:text-muted-100">
              IR {{ declaration.taxYear }} - {{ declaration.client?.name }}
            </BaseHeading>
            <BaseTag v-if="declaration.declarationType === 'complete'" size="sm" variant="muted" color="primary">
              Completa</BaseTag>
            <BaseTag v-else size="sm" variant="muted" color="info">Simplificada</BaseTag>
          </div>
        </div>
      </div>
      <div v-else class="flex flex-col gap-1">
        <BasePlaceload class="h-4 w-48 rounded" />
      </div>

      <div class="flex items-center">
        <div v-if="isSaving" class="mr-3 flex items-center animate-fade-in">
          <Icon name="svg-spinners:ring-resize" class="size-5 text-muted-400" />
        </div>
        <button type="button"
          class="hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-500 rounded-full p-2 transition-colors duration-300"
          @click="() => $emit('close')">
          <Icon name="lucide:x" class="size-5" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
      <!-- Loading State -->
      <div v-if="isLoading" class="w-full p-8 space-y-6">
        <BasePlaceload class="h-24 w-full rounded-xl" />
        <div class="grid grid-cols-3 gap-6">
          <BasePlaceload class="h-96 w-full col-span-2 rounded-xl" />
          <BasePlaceload class="h-96 w-full rounded-xl" />
        </div>
      </div>

      <div v-else-if="declaration" class="w-full flex flex-col md:flex-row h-full">
        <!-- Main Content (Left) -->
        <div
          class="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-white dark:bg-muted-950 border-r border-muted-200 dark:border-muted-800">

          <!-- Client Data Section -->
          <div class="space-y-4">
            <BaseHeading as="h4" size="xs" weight="medium" class="text-muted-500 uppercase tracking-wider">
              Dados do Cliente
            </BaseHeading>
            <BaseCard rounded="lg" class="p-6 bg-muted-50 dark:bg-muted-900/40 border-muted-200 dark:border-muted-800">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <p class="text-[10px] text-muted-400 uppercase font-bold mb-1">Nome Completo</p>
                  <p class="text-sm font-semibold text-muted-800 dark:text-muted-100">{{ declaration.client?.name }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-muted-400 uppercase font-bold mb-1">CPF</p>
                  <p class="text-sm font-mono text-muted-800 dark:text-muted-100">{{ declaration.client?.cpf }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-muted-400 uppercase font-bold mb-1">Telefone/WhatsApp</p>
                  <p class="text-sm text-muted-800 dark:text-muted-100">{{ declaration.client?.phone || 'Não informado'
                    }}</p>
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- Description -->
          <div class="space-y-2">
            <BaseHeading as="h4" size="xs" weight="medium" class="text-muted-500 uppercase tracking-wider">
              Descrição
            </BaseHeading>
            <BaseTextarea v-model="form.description" rounded="lg" rows="6"
              placeholder="Adicione uma descrição detalhada, instruções ou checklist..." class="bg-transparent" />
            <div class="flex justify-end">
              <BaseButton v-if="form.description !== declaration.description" size="sm" variant="primary"
                :loading="isSaving" @click="save">Salvar Descrição</BaseButton>
            </div>
          </div>

          <!-- Attachments -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <BaseHeading as="h4" size="xs" weight="medium" class="text-muted-500 uppercase tracking-wider">
                Anexos ({{ declaration.attachments?.length || 0 }})
              </BaseHeading>
              <input type="file" ref="fileInput" class="hidden" @change="handleFileUpload" multiple />
              <BaseButton size="sm" variant="muted" @click="triggerUpload">
                <Icon name="lucide:upload" class="size-4 mr-2" />
                Adicionar Anexo
              </BaseButton>
            </div>

            <div v-if="declaration.attachments?.length > 0" class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <BaseCard v-for="att in declaration.attachments" :key="att.id" rounded="lg"
                class="p-3 border-muted-200 dark:border-muted-800 hover:border-primary-500 transition-colors cursor-pointer group">
                <div class="flex items-start gap-3">
                  <div class="size-10 rounded bg-muted-100 dark:bg-muted-800 flex items-center justify-center shrink-0">
                    <Icon name="lucide:file-text" class="size-5 text-muted-500" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium truncate" :title="att.fileName">{{ att.fileName }}</p>
                    <p class="text-[10px] text-muted-400 capitalize">{{ att.category }}</p>
                  </div>
                  <button class="opacity-0 group-hover:opacity-100 p-1 text-primary-500">
                    <Icon name="lucide:download" class="size-4" />
                  </button>
                </div>
              </BaseCard>
            </div>
            <div v-else
              class="text-center py-6 border-2 border-dashed border-muted-200 dark:border-muted-800 rounded-xl">
              <p class="text-sm text-muted-400">Nenhum anexo encontrado</p>
            </div>
          </div>

          <!-- Tabs: Activity & Notes -->
          <div>
            <div class="border-b border-muted-200 dark:border-muted-800 flex gap-6 mb-4">
              <button @click="activeTab = 'activity'" class="pb-3 text-sm font-medium border-b-2 transition-colors"
                :class="activeTab === 'activity' ? 'border-primary-500 text-primary-600' : 'border-transparent text-muted-400 hover:text-muted-600'">
                Atividade
              </button>
              <button @click="activeTab = 'notes'" class="pb-3 text-sm font-medium border-b-2 transition-colors"
                :class="activeTab === 'notes' ? 'border-primary-500 text-primary-600' : 'border-transparent text-muted-400 hover:text-muted-600'">
                Notas Internas
              </button>
            </div>

            <!-- Activity Tab -->
            <div v-if="activeTab === 'activity'" class="space-y-4">
              <div v-if="declaration.auditLogs?.length > 0" class="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                <div v-for="log in declaration.auditLogs" :key="log.id" class="flex gap-3 text-sm">
                  <div class="mt-0.5">
                    <BaseAvatar v-if="log.userId" :text="log.userName?.charAt(0)" size="xs"
                      class="bg-muted-200 dark:bg-muted-800 text-muted-600" />
                    <div v-else class="size-6 rounded-full bg-primary-100 flex items-center justify-center">
                      <Icon name="lucide:zap" class="size-3 text-primary-500" />
                    </div>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-muted-800 dark:text-muted-100">{{ log.userName || 'Sistema'
                        }}</span>
                      <span class="text-xs text-muted-400">{{ new Date(log.createdAt).toLocaleString('pt-BR') }}</span>
                    </div>
                    <p class="text-muted-600 dark:text-muted-300 mt-0.5">{{ log.description }}</p>
                  </div>
                </div>
              </div>
              <div v-else class="text-muted-400 text-sm italic">Nenhuma atividade registrada.</div>
            </div>

            <!-- Internal Notes Tab -->
            <div v-if="activeTab === 'notes'" class="space-y-2">
              <BaseTextarea v-model="form.internalNotes" rounded="lg" rows="6"
                placeholder="Notas visíveis apenas para a equipe..." />
              <div class="flex justify-end">
                <BaseButton size="sm" variant="primary" :loading="isSaving" @click="save">Salvar Nota</BaseButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar (Right) -->
        <!-- Sidebar (Right) -->
        <div
          class="w-full md:w-80 border-t md:border-t-0 md:border-l border-muted-200 dark:border-muted-800 md:shrink-0 bg-muted-50/50 dark:bg-muted-900/20 overflow-y-auto flex flex-col h-full">

          <!-- Sidebar Tabs -->
          <div
            class="flex border-b border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-950 px-4 shrink-0 overflow-x-auto no-scrollbar">
            <button @click="activeSidebarTab = 'details'"
              class="px-4 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 grow text-center whitespace-nowrap"
              :class="activeSidebarTab === 'details' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted-400 hover:text-muted-500'">
              Card
            </button>
            <button @click="activeSidebarTab = 'notification'"
              class="px-4 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 grow text-center whitespace-nowrap"
              :class="activeSidebarTab === 'notification' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted-400 hover:text-muted-500'">
              Avisos
            </button>
            <button @click="activeSidebarTab = 'financial'"
              class="px-4 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 grow text-center whitespace-nowrap"
              :class="activeSidebarTab === 'financial' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted-400 hover:text-muted-500'">
              Financeiro
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6 space-y-8">
            <!-- TAB: DETALHES -->
            <div v-if="activeSidebarTab === 'details'" class="space-y-6 animate-fade-in">
              <!-- Status -->
              <div class="space-y-3">
                <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Status</label>
                <BaseSelect v-model="form.status" rounded="md" @update:model-value="() => save()">
                  <BaseSelectItem v-for="opt in kanbanColumns" :key="opt.value" :value="opt.value" class="py-1">
                    <div class="flex items-center gap-2">
                      <div class="size-2 rounded-full" :class="`bg-${opt.color || 'gray'}-500`"></div>
                      <span>{{ opt.label }}</span>
                    </div>
                  </BaseSelectItem>
                </BaseSelect>
              </div>

              <!-- Assignee -->
              <div class="space-y-3">
                <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Responsável</label>
                <BaseSelect v-model="form.assignedToId" rounded="md" placeholder="Selecione..."
                  @update:model-value="save">
                  <BaseSelectItem value="unassigned">
                    <span class="text-muted-400">Sem responsável</span>
                  </BaseSelectItem>
                  <BaseSelectItem v-for="member in teamMembers" :key="member.id" :value="member.id" class="py-2">
                    <div class="flex items-center gap-2">
                      <BaseAvatar :src="member.photo" :text="member.name?.charAt(0).toUpperCase()" size="xs" />
                      <div>
                        <span class="font-medium text-sm">{{ member.name }}</span>
                      </div>
                    </div>
                  </BaseSelectItem>
                </BaseSelect>
              </div>

              <!-- Priority -->
              <div class="space-y-3 pt-6 border-t border-muted-200 dark:border-muted-800">
                <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Prioridade</label>
                <div class="flex flex-wrap gap-2">
                  <button v-for="p in priorityOptions" :key="p.value" @click="form.priority = p.value; save()"
                    type="button"
                    class="px-2 py-1 rounded text-xs font-medium border transition-all flex items-center gap-1" :class="form.priority === p.value
                      ? 'bg-white dark:bg-muted-800 border-primary-500 text-primary-600 shadow-sm'
                      : 'border-transparent hover:bg-muted-200 dark:hover:bg-muted-800 text-muted-500'">
                    <Icon :name="p.icon" class="size-3" :class="p.color" />
                    {{ p.label }}
                  </button>
                </div>
              </div>

              <!-- Due Date -->
              <div class="space-y-3 pt-6 border-t border-muted-200 dark:border-muted-800">
                <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Prazo de Entrega</label>
                <BaseInput v-model="form.dueDate" type="date" size="sm" rounded="md" @change="save" />
              </div>

              <!-- Declaration Type -->
              <div class="space-y-3 pt-6 border-t border-muted-200 dark:border-muted-800">
                <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Tipo de Declaração</label>
                <div class="grid grid-cols-2 gap-2">
                  <button @click="form.declarationType = 'complete'; save()"
                    class="text-xs p-2 rounded-lg border transition-all"
                    :class="form.declarationType === 'complete' ? 'border-primary-500 bg-primary-500/5 text-primary-600' : 'border-muted-200 dark:border-muted-800 text-muted-400 hover:bg-muted-200 dark:hover:bg-muted-800'">Completa</button>
                  <button @click="form.declarationType = 'simplified'; save()"
                    class="text-xs p-2 rounded-lg border transition-all"
                    :class="form.declarationType === 'simplified' ? 'border-primary-500 bg-primary-500/5 text-primary-600' : 'border-muted-200 dark:border-muted-800 text-muted-400 hover:bg-muted-200 dark:hover:bg-muted-800'">Simplificada</button>
                </div>
              </div>
            </div>

            <!-- TAB: NOTIFICAÇÕES -->
            <div v-if="activeSidebarTab === 'notification'" class="space-y-6 animate-fade-in">
              <!-- Client Link -->
              <div class="space-y-3">
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Link de Coleta</label>
                  <Icon name="lucide:share-2" class="size-4 text-primary-500" />
                </div>
                <BaseCard rounded="lg" class="p-4 bg-primary-500/5 border-primary-500/10 border shadow-none">
                  <div v-if="collectionLink">
                    <p class="text-[10px] font-mono text-muted-500 mb-3 break-all line-clamp-2">
                      {{ `${baseUrl}${collectionLink.url}` }}
                    </p>
                    <div class="flex gap-2">
                      <BaseButton size="sm" class="flex-1" @click="copyLink">Copiar Link</BaseButton>
                      <BaseButton size="icon-sm" :to="collectionLink.url" target="_blank">
                        <Icon name="lucide:external-link" class="size-4" />
                      </BaseButton>
                    </div>
                  </div>
                  <div v-else>
                    <p class="text-xs text-muted-500 mb-3">Gere um link para o cliente enviar documentos.</p>
                    <BaseButton size="sm" variant="primary" class="w-full" :loading="isGeneratingLink"
                      @click="generateLink">Gerar Novo Link</BaseButton>
                  </div>
                </BaseCard>
              </div>

              <!-- SMS Templates -->
              <div class="space-y-3 pt-6 border-t border-muted-200 dark:border-muted-800">
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Enviar SMS</label>
                  <BaseTag size="sm" variant="muted" color="success" class="scale-90">GSM Standard</BaseTag>
                </div>

                <div class="space-y-2">
                  <button v-for="(tpl, idx) in smsTemplates" :key="tpl.id" @click="handleSelectTemplate(idx)"
                    class="w-full text-left p-2.5 rounded-lg border transition-all duration-200 group"
                    :class="selectedTemplateIndex === idx
                      ? 'border-primary-500 bg-primary-500/5 ring-1 ring-primary-500'
                      : 'border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-950 hover:border-primary-500/50'">
                    <div class="flex items-center gap-3">
                      <div class="size-7 rounded flex items-center justify-center transition-colors"
                        :class="selectedTemplateIndex === idx ? 'bg-primary-500 text-white' : 'bg-muted-100 dark:bg-muted-800 text-muted-500 group-hover:bg-primary-100 group-hover:text-primary-500'">
                        <Icon :name="tpl.icon" class="size-3.5" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-[11px] font-bold text-muted-800 dark:text-muted-100 uppercase tracking-wider">{{
                          tpl.title }}</p>
                      </div>
                    </div>
                  </button>
                </div>

                <div v-if="selectedTemplateIndex !== null" class="mt-4 animate-fade-in">
                  <BaseCard rounded="lg" class="p-3 border-primary-500/20 bg-primary-500/5">
                    <p class="text-xs text-muted-600 dark:text-muted-300 mb-3 italic leading-relaxed">
                      "{{ smsMessage }}"
                    </p>
                    <BaseButton variant="primary" size="sm" class="w-full h-8" :loading="isSendingSms" @click="sendSms">
                      <Icon name="solar:paper-plane-bold" class="size-3.5 mr-2" />
                      Enviar Agora
                    </BaseButton>
                  </BaseCard>
                  <p class="text-[10px] text-muted-400 text-center italic mt-2">
                    Destino: {{ declaration.client?.phone || '...' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- TAB: FINANCEIRO -->
            <div v-if="activeSidebarTab === 'financial'" class="space-y-6 animate-fade-in">
              <!-- Honorários -->
              <div class="space-y-3">
                <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Valor do Serviço</label>
                <BaseInput v-model="form.serviceValue" type="number" step="0.01" size="sm" rounded="md"
                  icon="lucide:dollar-sign" @change="save" placeholder="0,00" />
              </div>

              <!-- Pagamento -->
              <div class="space-y-3 pt-6 border-t border-muted-200 dark:border-muted-800">
                <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Status do Pagamento</label>
                <div class="grid grid-cols-1 gap-1">
                  <button v-for="opt in paymentStatusOptions" :key="opt.value"
                    @click="form.paymentStatus = opt.value; save()"
                    class="flex items-center gap-3 p-3 rounded-lg border transition-all text-sm" :class="form.paymentStatus === opt.value
                      ? 'border-primary-500 bg-primary-500/5 text-primary-600 font-bold'
                      : 'border-transparent text-muted-500 hover:bg-muted-100 dark:hover:bg-muted-800'">
                    <div class="size-2 rounded-full" :class="{
                      'bg-success-500': opt.value === 'paid',
                      'bg-warning-500': opt.value === 'partial',
                      'bg-danger-500': opt.value === 'pending'
                    }"></div>
                    {{ opt.label }}
                    <Icon v-if="form.paymentStatus === opt.value" name="lucide:check" class="ms-auto size-4" />
                  </button>
                </div>
              </div>

              <!-- Resultado IR -->
              <div class="space-y-3 pt-6 border-t border-muted-200 dark:border-muted-800">
                <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Resultado do IR</label>
                <BaseSelect v-model="form.result" rounded="md" @update:model-value="save">
                  <BaseSelectItem v-for="opt in resultOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </BaseSelectItem>
                </BaseSelect>

                <div v-if="form.result !== 'neutral'" class="mt-2">
                  <p class="text-[10px] text-muted-400 uppercase font-bold mb-1">Valor do Resultado</p>
                  <BaseInput v-model="form.resultValue" type="number" step="0.01" size="sm" rounded="md"
                    icon="lucide:banknote" @change="save" placeholder="0,00" />
                </div>
              </div>
            </div>

            <!-- Account Actions -->
            <div class="pt-10 text-center">
              <button @click="remove"
                class="text-[10px] font-bold uppercase tracking-widest text-muted-400 hover:text-rose-500 transition-colors">
                Excluir Card
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </FocusScope>
</template>
