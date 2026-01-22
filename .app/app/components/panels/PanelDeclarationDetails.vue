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
import { PanelsPanelClientDetails } from '#components'

// States
const isLoading = ref(true)
const isSaving = ref(false)
const declaration = ref<any>(null)
const isGeneratingLink = ref(false)
const collectionLink = ref<any>(null)
const activeTab = ref('activity')

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
        value: col.id, // Status technically is mapped to column ID roughly in this view or we need to know what constitutes "Status" vs "Column"
        // Wait, the user said "Status deve listar todas as colunas". The backend schema has 'status' (pending, submitted) AND 'columnId'.
        // This implies the user wants to move cards between columns via this dropdown.
        // So we should map 'columnId' to this dropdown, not 'status'.
        id: col.id,
        color: col.color
      }))
    }
  } catch (error) {
    console.error('Erro ao buscar colunas:', error)
  }
}

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

// ... logic ...

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
        <div class="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-white dark:bg-muted-950">

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
          class="w-full md:w-80 border-t md:border-t-0 md:border-l border-muted-200 dark:border-muted-800 md:shrink-0 bg-muted-50/50 dark:bg-muted-900/20 overflow-y-auto p-6 space-y-8">

          <!-- Client Link (Moved to Top) -->
          <div class="space-y-3">
            <BaseCard rounded="lg" class="p-4 bg-primary-500/5 border-primary-500/10 border shadow-none">
              <div class="flex items-center gap-2 mb-2">
                <Icon name="lucide:share-2" class="size-4 text-primary-500" />
                <span class="text-xs font-bold text-primary-700 dark:text-primary-400 uppercase">Link do Cliente</span>
              </div>
              <BaseParagraph class="text-xs text-muted-500"> Envie esse link para o cliente importar os arquivos
              </BaseParagraph>

              <div v-if="collectionLink">
                <p class="text-xs text-muted-500 mb-3 line-clamp-1 break-all">{{ collectionLink.url }}</p>
                <div class="flex gap-2">
                  <BaseButton size="sm" class="flex-1" @click="copyLink">Copiar</BaseButton>
                  <BaseButton size="icon-sm" :to="collectionLink.url" target="_blank">
                    <Icon name="lucide:external-link" class="size-4" />
                  </BaseButton>
                </div>
              </div>
              <div v-else>
                <p class="text-xs text-muted-500 mb-3">Gere um link para o cliente enviar documentos.</p>
                <BaseButton size="sm" variant="primary" class="w-full" :loading="isGeneratingLink"
                  @click="generateLink">Gerar Link</BaseButton>
              </div>
            </BaseCard>
          </div>

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
            <BaseSelect v-model="form.assignedToId" rounded="md" placeholder="Selecione..." @update:model-value="save">
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

          <!-- Details Group -->
          <div class="space-y-4 border-t border-muted-200 dark:border-muted-800 pt-6">
            <div class="space-y-1">
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

            <div class="space-y-1">
              <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Prazo</label>
              <BaseInput v-model="form.dueDate" type="date" size="sm" rounded="md" @change="save" />
            </div>
          </div>

          <!-- Financial Group -->
          <div class="space-y-4 border-t border-muted-200 dark:border-muted-800 pt-6">
            <BaseHeading as="h5" size="xs" weight="medium" class="text-muted-800 dark:text-muted-100">Financeiro
            </BaseHeading>

            <BaseInputWrapper label="Valor (R$)">
              <BaseInput v-model="form.serviceValue" type="number" step="0.01" size="sm" rounded="md"
                icon="lucide:dollar-sign" @change="save" />
            </BaseInputWrapper>

            <div class="space-y-1">
              <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Pagamento</label>
              <div class="flex flex-col gap-1">
                <label v-for="opt in paymentStatusOptions" :key="opt.value"
                  class="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted-200/50 dark:hover:bg-muted-800/50">
                  <input type="radio" v-model="form.paymentStatus" :value="opt.value" @change="() => save()"
                    class="text-primary-500 focus:ring-primary-500 border-muted-300 rounded-full" />
                  <span class="text-sm text-muted-600 dark:text-muted-300">{{ opt.label }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="border-t border-muted-200 dark:border-muted-800 pt-6 text-center">
            <button @click="remove" class="text-xs text-rose-500 hover:text-rose-600 hover:underline">Excluir
              declaração</button>
          </div>

        </div>
      </div>
    </div>
  </FocusScope>
</template>
