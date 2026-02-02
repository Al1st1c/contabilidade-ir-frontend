<script setup lang="ts">
// import { useSortable } from '@vueuse/integrations/useSortable'
import Sortable from 'sortablejs'

definePageMeta({
  title: 'Impostos de Renda',
})

// Composables
const { useCustomFetch } = useApi()

// Types
interface Task {
  id: string
  clientName: string
  cpf: string
  taxYear: number
  description?: string
  status: string
  priority: 'low' | 'medium' | 'high'
  declarationType: 'simplified' | 'complete'
  estimatedResult: 'refund' | 'pay' | 'neutral'
  estimatedValue?: number
  paymentStatus?: 'pending' | 'partial' | 'paid'
  assignee?: {
    id: string
    name: string
    avatar: string
  }
  dueDate?: string
  comments: number
  attachments: number
  checklistTotal: number
  checklistCompleted: number
  tags?: string[]
  clientTags?: string[]
  whatsapp?: string
  hasDependents?: boolean
}

interface Column {
  id: string
  title: string
  color: string
  tasks: Task[]
}

// Reactive state
const columns = ref<Column[]>([])
const isLoading = ref(true)
const taxYearFilter = ref(new Date().getFullYear())

const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]
})

const filters = reactive({
  employeeId: '',
  clientName: '',
  tag: '',
  paymentStatus: ''
})

const columnSearch = reactive<Record<string, string>>({})

// Computed values for filters
const availableAssignees = computed(() => {
  const assignees = new Map()
  columns.value.forEach(col => {
    col.tasks.forEach(task => {
      if (task.assignee) {
        assignees.set(task.assignee.id, task.assignee)
      }
    })
  })
  return Array.from(assignees.values()) as any[]
})

const availableTags = computed(() => {
  const tags = new Set<string>()
  columns.value.forEach(col => {
    col.tasks.forEach(task => {
      task.tags?.forEach(tag => { if (tag) tags.add(tag) })
      task.clientTags?.forEach(tag => { if (tag) tags.add(tag) })
    })
  })
  return Array.from(tags).filter(t => t !== '')
})

const filteredColumns = computed(() => {
  return columns.value.map(col => ({
    ...col,
    tasks: col.tasks.filter(task => {
      // Global Filters
      const matchEmployee = !filters.employeeId || task.assignee?.id === filters.employeeId
      const matchClient = !filters.clientName ||
        task.clientName.toLowerCase().includes(filters.clientName.toLowerCase()) ||
        task.cpf.includes(filters.clientName)
      const matchTag = (!filters.tag || filters.tag === 'all') ||
        (task.tags?.includes(filters.tag) || task.clientTags?.includes(filters.tag))
      const matchPayment = (!filters.paymentStatus || filters.paymentStatus === 'all') || task.paymentStatus === filters.paymentStatus

      // Column Local Filter
      const search = (columnSearch[col.id] || '').toLowerCase()
      const matchColumnSearch = !search ||
        task.clientName.toLowerCase().includes(search) ||
        task.cpf.includes(search) ||
        (task.description || '').toLowerCase().includes(search)

      return matchEmployee && matchClient && matchTag && matchPayment && matchColumnSearch
    })
  }))
})


// Priority colors
const priorityColors: Record<string, string> = {
  low: 'bg-muted-200 text-muted-600 dark:bg-muted-800 dark:text-muted-400',
  medium: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
}

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

// Column colors
const columnColors: Record<string, string> = {
  amber: 'bg-amber-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  gray: 'bg-slate-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
}

const columnBorderColors: Record<string, string> = {
  amber: 'border-amber-500',
  info: 'border-blue-500',
  purple: 'border-purple-500',
  success: 'border-emerald-500',
  warning: 'border-amber-500',
  gray: 'border-slate-500',
  red: 'border-red-500',
  orange: 'border-orange-500',
}

const cardBorderColors: Record<string, string> = {
  amber: 'border-l-amber-500',
  info: 'border-l-blue-500',
  purple: 'border-l-purple-500',
  success: 'border-l-emerald-500',
  warning: 'border-l-amber-500',
  gray: 'border-l-slate-500',
  red: 'border-l-red-500',
  orange: 'border-l-orange-500',
}

// Declaration type labels
const declarationTypeLabels: Record<string, string> = {
  simplified: 'Simples',
  complete: 'Completa',
}

// Result colors and labels
const resultColors: Record<string, string> = {
  refund: 'text-emerald-600 dark:text-emerald-400',
  pay: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-muted-500 dark:text-muted-400',
}

const resultLabels: Record<string, string> = {
  refund: 'Restituição',
  pay: 'A pagar',
  neutral: 'Neutro',
}

const resultIcons: Record<string, string> = {
  refund: 'lucide:trending-up',
  pay: 'lucide:trending-down',
  neutral: 'lucide:minus',
}

// Tag colors
const tagColors: Record<string, string> = {
  VIP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Recorrente: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Novo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Médico: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Investimentos: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Imóvel: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Aluguéis: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Ganho Capital': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Day Trade': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  Retificadora: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

// Methods
async function fetchKanban() {
  try {
    isLoading.value = true
    const { data } = await useCustomFetch<any>(`/declarations/kanban?taxYear=${taxYearFilter.value}`)

    if (data.success) {
      // Map backend columns to frontend columns
      columns.value = data.data.map((col: any) => ({
        id: col.id,
        title: col.name,
        color: col.color || 'info',
        tasks: col.cards.map((card: any) => ({
          id: card.id,
          clientName: card.client?.name || 'Sem nome',
          cpf: card.client?.cpfMasked || card.client?.cpf || '',
          taxYear: card.taxYear,
          description: card.description,
          status: card.status,
          priority: card.priority,
          declarationType: card.declarationType || 'complete',
          estimatedResult: card.result || 'neutral',
          estimatedValue: card.resultValue,
          assignee: card.assignedTo ? {
            id: card.assignedTo.id,
            name: card.assignedTo.name,
            avatar: card.assignedTo.photo
              ? (card.assignedTo.photo.startsWith('http')
                ? card.assignedTo.photo
                : `${useRuntimeConfig().public.apiBase}/files/${card.assignedTo.photo}`)
              : '/img/avatars/placeholder.svg'
          } : undefined,
          dueDate: card.dueDate,
          comments: card.commentsTotal || 0,
          attachments: card.attachmentsCount || 0,
          checklistTotal: card.checklistTotal || 0,
          checklistCompleted: card.checklistCompleted || 0,
          tags: card.tags || [],
          clientTags: card.client?.tags || [],
          whatsapp: card.client?.whatsapp || card.client?.phone,
          hasDependents: card.hasDependents,
          paymentStatus: card.paymentStatus || 'pending',
        }))
      }))
    }
  } catch (error) {
    console.error('Erro ao buscar Kanban:', error)
  } finally {
    isLoading.value = false
  }
}

async function moveTask(taskId: string, columnId: string, order: number) {
  try {
    await useCustomFetch(`/declarations/${taskId}/move`, {
      method: 'PATCH',
      body: {
        columnId,
        columnOrder: order
      }
    })
  } catch (error) {
    console.error('Erro ao mover tarefa:', error)
    // Revert if needed (simplification: just re-fetch)
    fetchKanban()
  }
}

// Columns container ref
const columnsContainer = ref<HTMLElement | null>(null)
const sortableInstances = ref<Map<string, Sortable>>(new Map())

// Initialize sortable for columns after mount
onMounted(async () => {
  await fetchKanban()
  await nextTick()

  if (columnsContainer.value) {
    Sortable.create(columnsContainer.value, {
      animation: 200,
      handle: '.column-handle',
      ghostClass: 'opacity-50',
      dragClass: 'shadow-2xl',
      onEnd: (evt) => {
        if (typeof evt.oldIndex === 'number' && typeof evt.newIndex === 'number' && evt.oldIndex !== evt.newIndex) {
          const movedColumn = columns.value.splice(evt.oldIndex, 1)[0]
          if (movedColumn) {
            columns.value.splice(evt.newIndex, 0, movedColumn)
          }
        }
      },
    })
  }

  // Initialize all task containers
  initAllTaskSortables()
})

// Watch for column changes to reinitialize sortables
watch(columns, () => {
  nextTick(() => {
    initAllTaskSortables()
  })
}, { deep: false })

function initAllTaskSortables() {
  const containers = document.querySelectorAll('[data-column-id]')

  containers.forEach((container) => {
    const columnId = (container as HTMLElement).dataset.columnId
    if (!columnId) return

    // Skip if already initialized
    if (sortableInstances.value.has(columnId)) return

    const sortable = Sortable.create(container as HTMLElement, {
      group: 'tasks',
      animation: 200,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      chosenClass: 'sortable-chosen',
      fallbackOnBody: true,
      swapThreshold: 0.65,
      onAdd: (evt) => {
        handleTaskMove(evt)
      },
      onUpdate: (evt) => {
        handleTaskMove(evt)
      },
    })

    sortableInstances.value.set(columnId, sortable)
  })
}

function handleTaskMove(evt: Sortable.SortableEvent) {
  const taskId = evt.item.dataset.taskId
  const fromColumnId = evt.from.dataset.columnId
  const toColumnId = evt.to.dataset.columnId

  if (!taskId || !fromColumnId || !toColumnId) return

  // Find source and target columns in the source of truth (columns ref)
  const fromColumn = columns.value.find(c => c.id === fromColumnId)
  const toColumn = columns.value.find(c => c.id === toColumnId)

  if (!fromColumn || !toColumn) return

  // Find the task object
  const taskIndex = fromColumn.tasks.findIndex(t => t.id === taskId)
  if (taskIndex === -1) return

  const task = fromColumn.tasks[taskIndex]
  if (!task) return

  // Find where to insert in the target column
  // We use the previous sibling in the DOM to determine position
  const prevElement = evt.item.previousElementSibling as HTMLElement
  const prevTaskId = prevElement?.dataset?.taskId

  // Calculate new index in the UNFILTERED list
  let newIndex = 0
  if (prevTaskId) {
    const prevTaskIndex = toColumn.tasks.findIndex(t => t.id === prevTaskId)
    if (prevTaskIndex !== -1) {
      newIndex = prevTaskIndex + 1
    } else {
      // Fallback: if we can't find the prev task (shouldn't happen), append or put at best guess
      newIndex = toColumn.tasks.length
    }
  }

  // Remove from source
  fromColumn.tasks.splice(taskIndex, 1)

  // Insert into target (adjust index if moving within same column downwards)
  if (fromColumnId === toColumnId && taskIndex < newIndex) {
    newIndex--
  }

  toColumn.tasks.splice(newIndex, 0, task)

  // Persist to backend
  moveTask(task.id, toColumnId, newIndex)
}

// Panels
const { open } = usePanels()
import { PanelsPanelCreateDeclaration, PanelsPanelDeclarationDetails, PanelsPanelManageColumns } from '#components'

function openManageColumns() {
  open(PanelsPanelManageColumns, {
    onSaved: () => {
      fetchKanban()
    }
  })
}

function openCreateDeclaration() {
  open(PanelsPanelCreateDeclaration, {
    onSaved: () => {
      fetchKanban()
    }
  })
}

function openDeclarationDetails(declarationId: string) {
  open(PanelsPanelDeclarationDetails, {
    declarationId,
    onSaved: () => {
      fetchKanban()
    }
  })
}

// Utility functions moved after methods to keep block clean
function formatDate(date?: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function formatCurrency(value?: number): string {
  if (!value) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function getTagColor(tag: string): string {
  return tagColors[tag] || 'bg-muted-100 text-muted-600 dark:bg-muted-800 dark:text-muted-400'
}

// WhatsApp helper
function openWhatsApp(phone: string, clientName: string) {
  const message = encodeURIComponent(`Olá ${clientName}! Aqui é da contabilidade.`)
  window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${message}`, '_blank')
}

// Quick copy collection link
const toaster = useNuiToasts()
const isCopyingLink = ref<string | null>(null)

async function quickCopyCollectionLink(declarationId: string, clientName: string) {
  if (isCopyingLink.value === declarationId) return // Prevent double-click

  isCopyingLink.value = declarationId
  try {
    // Generate link
    const { data } = await useCustomFetch<any>(`/declarations/${declarationId}/collection-link`, {
      method: 'POST'
    })

    if (data.success && data.data?.url) {
      const fullUrl = `${window.location.origin}${data.data.url}`
      await navigator.clipboard.writeText(fullUrl)

      toaster.add({
        title: 'Link Copiado!',
        description: `Envie para ${clientName} via WhatsApp`,
        icon: 'ph:check-circle-fill',
        duration: 3000
      })
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Não foi possível gerar o link',
      icon: 'ph:warning-circle-fill'
    })
  } finally {
    isCopyingLink.value = null
  }
}

</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Page Header -->
    <div class="px-4 md:px-6 lg:px-8 xl:px-10 pb-6 shrink-0">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex h-12 items-center justify-between pe-4 xl:pe-10">
          <div class="flex items-center gap-2">
            <BaseAvatar :src="'/img/avatars/10.svg'" size="xs" />
            <div>
              <BaseParagraph size="xs" class="text-muted-400">
                Gustavo B
              </BaseParagraph>
              <BaseHeading as="h2" size="sm" weight="normal">
                ConsTar
              </BaseHeading>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <BaseAvatarGroup :avatars="[]" size="xs" />
          <BaseTooltip content="Gerenciar Colunas">
            <BaseButton size="icon-sm" rounded="full" @click="openManageColumns">
              <Icon name="solar:widget-4-linear" class="size-4" />
            </BaseButton>
          </BaseTooltip>
          <BaseTooltip content="Novo IR">
            <BaseButton size="icon-sm" rounded="full" variant="primary" @click="openCreateDeclaration">
              <Icon name="lucide:plus" class="size-4" />
            </BaseButton>
          </BaseTooltip>
        </div>
      </div>
    </div>

    <!-- Kanban Board -->
    <!-- Kanban Board -->
    <!-- Main Content Area (Scrollable) -->
    <div class="flex-1 flex flex-col min-h-0 px-4 md:px-6 lg:px-8 xl:px-10 font-sans">
      <!-- Filters Bar (Fixed within scroll area or sticky) -->
      <div
        class="mb-6 flex flex-wrap items-center gap-4 bg-white dark:bg-muted-950 p-4 rounded-xl border border-muted-200 dark:border-muted-800 shadow-sm shrink-0">
        <!-- Year Filter -->
        <div class="w-full md:w-48">
          <BaseSelect v-model="taxYearFilter" rounded="md" icon="ph:calendar" @change="fetchKanban">
            <BaseSelectItem v-for="year in availableYears" :key="year" :value="year">
              IR {{ year }} (Ano-C {{ year - 1 }})
            </BaseSelectItem>
          </BaseSelect>
        </div>

        <!-- Search Client -->
        <div class="w-full md:w-64">
          <BaseInput v-model="filters.clientName" placeholder="Buscar por cliente ou CPF..." icon="lucide:search"
            rounded="md" class="!bg-muted-50 dark:!bg-muted-900" />
        </div>

        <!-- Employee Filter (Avatar Group style) -->
        <div class="flex items-center gap-2 border-l border-muted-200 dark:border-muted-800 pl-4">
          <span class="text-[10px] uppercase text-muted-400 tracking-widest mr-2">Responsável</span>
          <div class="flex items-center -space-x-2">
            <button v-for="user in availableAssignees" :key="user.id"
              @click="filters.employeeId = filters.employeeId === user.id ? '' : user.id"
              class="relative flex items-center justify-center transition-all duration-200 hover:z-10 rounded-full size-8"
              :class="[filters.employeeId === user.id ? 'scale-110 ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-muted-950 z-20' : 'opacity-60 hover:opacity-100']">
              <BaseAvatar :src="user.avatar" size="xs" :title="user.name" class="!size-full" />
            </button>
            <button v-if="filters.employeeId" @click="filters.employeeId = ''"
              class="ms-4 text-[10px] text-primary-500 hover:underline">
              Limpar
            </button>
          </div>
        </div>

        <!-- Tags Filter -->
        <div class="w-full md:w-48 ml-auto flex items-center gap-2">
          <BaseSelect v-model="filters.tag" rounded="md" icon="lucide:tag" placeholder="Todas as Tags">
            <BaseSelectItem value="all">Todas as Tags</BaseSelectItem>
            <BaseSelectItem v-for="tag in availableTags" :key="tag" :value="tag">{{ tag }}</BaseSelectItem>
          </BaseSelect>
        </div>

        <!-- Payment Status -->
        <div class="w-full md:w-48 flex items-center gap-2">
          <BaseSelect v-model="filters.paymentStatus" rounded="md" icon="lucide:wallet">
            <BaseSelectItem value="all">Financeiro: Todos</BaseSelectItem>
            <BaseSelectItem value="paid">Pago</BaseSelectItem>
            <BaseSelectItem value="pending">Pendente</BaseSelectItem>
          </BaseSelect>
        </div>

        <!-- Clear All -->
        <BaseButton v-if="filters.employeeId || filters.clientName || filters.tag || filters.paymentStatus"
          variant="muted" size="sm" rounded="md"
          @click="Object.assign(filters, { employeeId: '', clientName: '', tag: '', paymentStatus: '' })">
          <Icon name="lucide:filter-x" class="size-4 mr-1" />
          Limpar
        </BaseButton>
      </div>

      <!-- Kanban Board + Scrolling -->
      <ClientOnly>
        <template #default>
          <div class="flex-1 overflow-x-auto overflow-y-hidden pb-4">
            <!-- Columns Container -->
            <div ref="columnsContainer" class="flex gap-4 h-full">
              <!-- Column (Screenshot Style) -->
              <div v-for="column in filteredColumns" :key="column.id"
                class="w-80 shrink-0 flex flex-col bg-muted-100/50 dark:bg-muted-900/40 rounded-xl overflow-hidden shadow-sm border border-muted-200/50 dark:border-muted-800/50 h-full max-h-full">
                <!-- Column Header -->
                <div class="flex flex-col border-b border-muted-200/50 dark:border-muted-800/50 transition-all">
                  <div class="flex h-12 shrink-0 items-center px-4 justify-between">
                    <div class="flex items-center gap-2 overflow-hidden max-w-[70%]">
                      <span
                        class="block font-sans text-[11px] text-muted-500 dark:text-muted-400 uppercase tracking-widest truncate"
                        :title="column.title">
                        {{ column.title }}
                      </span>
                      <span
                        class="px-1.5 py-0.5 rounded bg-muted-200 dark:bg-muted-700 text-muted-600 dark:text-muted-300 text-[10px]">
                        {{ column.tasks.length }}
                      </span>
                    </div>

                    <div class="flex items-center gap-1">
                      <!-- Filter Toggle -->
                      <button
                        @click="columnSearch[column.id] === undefined ? (columnSearch[column.id] = '') : (delete columnSearch[column.id])"
                        class="text-muted-400 hover:text-primary-500 flex size-7 items-center justify-center rounded-lg hover:bg-white dark:hover:bg-muted-800 transition-all duration-300"
                        :class="columnSearch[column.id] !== undefined ? 'text-primary-500 bg-white dark:bg-muted-800' : ''">
                        <Icon name="lucide:search" class="size-3.5" />
                      </button>

                      <!-- Add Task -->
                      <button @click="openCreateDeclaration"
                        class="text-muted-400 hover:text-primary-500 flex size-7 items-center justify-center rounded-lg hover:bg-white dark:hover:bg-muted-800 transition-all duration-300">
                        <Icon name="lucide:plus" class="size-4" />
                      </button>
                    </div>
                  </div>

                  <!-- Local Filter Input -->
                  <div v-if="columnSearch[column.id] !== undefined"
                    class="px-3 pb-3 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div class="relative">
                      <input v-model="columnSearch[column.id]" type="text" placeholder="Filtrar nesta coluna..."
                        class="w-full h-8 pl-8 pr-2 rounded-lg text-xs bg-white dark:bg-muted-950 border border-muted-200 dark:border-muted-700 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all text-muted-600 dark:text-muted-300 placeholder-muted-400"
                        autoFocus />
                      <Icon name="lucide:filter" class="absolute left-2.5 top-2.5 size-3 text-muted-400" />
                    </div>
                  </div>
                </div>

                <!-- Tasks Container -->
                <div class="nui-slimscroll flex-1 overflow-y-auto p-2 pb-20">
                  <div :data-column-id="column.id" class="space-y-2.5 min-h-[50px]">
                    <!-- Task Card -->
                    <div v-for="task in (column?.tasks || [])" :key="task.id" :data-task-id="task.id"
                      class="bg-white dark:bg-muted-950 group relative flex cursor-pointer flex-col items-start rounded-md border border-muted-200 dark:border-muted-800 p-3 hover:shadow-md hover:border-muted-300 dark:hover:border-muted-700 transition-all duration-200 shadow-sm border-l-4"
                      :class="[column.color && cardBorderColors[column.color] ? cardBorderColors[column.color] : 'border-l-primary-500']"
                      @click="openDeclarationDetails(task.id)">

                      <!-- JIRA Style: Summary (Client Name) -->
                      <div class="w-full mb-3">
                        <BaseHeading as="h4" size="sm" weight="normal"
                          class="text-muted-900 dark:text-muted-100 leading-snug line-clamp-2">
                          {{ task.clientName }}
                        </BaseHeading>
                        <div class="flex items-center gap-2 mt-1">
                          <BaseText size="xs" class="text-muted-400 font-mono tracking-tighter">{{ task.cpf }}
                          </BaseText>
                          <span class="size-1 rounded-full bg-muted-300"></span>
                          <BaseText size="xs" class="text-primary-500">IR {{ task.taxYear }}</BaseText>
                        </div>
                      </div>

                      <!-- IR Metadata & Progress -->
                      <div class="w-full space-y-3 mb-4">
                        <!-- Progress Bar (Subtle JIRA style) -->
                        <div v-if="task.checklistTotal > 0" class="w-full">
                          <div class="flex items-center justify-between text-[10px] text-muted-500 mb-1">
                            <span>Documentação</span>
                            <span>{{ Math.round((task.checklistCompleted / task.checklistTotal) * 100) }}%</span>
                          </div>
                          <div class="h-1.5 w-full bg-muted-100 dark:bg-muted-800 rounded-full overflow-hidden">
                            <div class="h-full bg-primary-500 transition-all duration-300"
                              :style="{ width: `${(task.checklistCompleted / task.checklistTotal) * 100}%` }" />
                          </div>
                        </div>

                        <!-- Financial Labels -->
                        <div class="flex flex-wrap gap-2">
                          <div v-if="task.estimatedValue"
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted-50 dark:bg-muted-900 border border-muted-200 dark:border-muted-800">
                            <Icon :name="(resultIcons[task.estimatedResult] || 'lucide:minus') as any" class="size-3"
                              :class="resultColors[task.estimatedResult]" />
                            <span class="text-[10px]" :class="resultColors[task.estimatedResult]">{{
                              formatCurrency(task.estimatedValue) }}</span>
                          </div>
                          <div
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted-50 dark:bg-muted-900 border border-muted-200 dark:border-muted-800">
                            <Icon :name="task.paymentStatus === 'paid' ? 'lucide:check-circle' : 'lucide:clock'"
                              class="size-3"
                              :class="task.paymentStatus === 'paid' ? 'text-success-500' : 'text-amber-500'" />
                            <span class="text-[10px] text-muted-600 dark:text-muted-400">{{ task.paymentStatus
                              === 'paid' ? 'Pago' : 'Pgm. Pendente' }}</span>
                          </div>
                        </div>

                        <!-- Tags & Dynamic Status -->
                        <div
                          v-if="(task.tags?.length || (task.checklistCompleted > 0 && task.checklistCompleted < task.checklistTotal))"
                          class="flex flex-wrap gap-1 pt-1">
                          <!-- Docs. Parcial Dynamic Tag -->
                          <div v-if="task.checklistCompleted > 0 && task.checklistCompleted < task.checklistTotal"
                            class="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-tight bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-sm">
                            Docs. Parcial
                          </div>

                          <!-- Other Tags -->
                          <template v-if="task.tags?.length">
                            <div v-for="tag in task.tags" :key="tag"
                              :class="[getTagColor(tag), 'px-1.5 py-0.5 rounded text-[9px] uppercase tracking-tight border border-current/10 opacity-90 shadow-sm']">
                              {{ tag }}
                            </div>
                          </template>
                        </div>
                      </div>

                      <!-- JIRA Footer: ID & Assignee -->
                      <div class="w-full flex items-center justify-between mt-auto pt-2">
                        <div class="flex items-center gap-2">
                          <div
                            class="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-muted-100 dark:bg-muted-800 border border-muted-200 dark:border-muted-700">
                            <Icon :name="task.priority === 'high' ? 'lucide:alert-circle' : 'lucide:check-square'"
                              class="size-3"
                              :class="task.priority === 'high' ? 'text-danger-500' : 'text-primary-500'" />
                            <span class="text-[9px] uppercase text-muted-500">DLR-{{ task.id ?
                              task.id.toString().slice(-4) : '####' }}</span>
                          </div>
                          <div class="flex items-center gap-1.5 text-muted-400">
                            <!-- Prazo (Deadline) -->
                            <div v-if="task.dueDate"
                              class="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted-50 dark:bg-muted-900 border border-muted-200 dark:border-muted-800 text-muted-500"
                              title="Prazo da Declaração">
                              <Icon name="lucide:calendar" class="size-3 text-primary-500" />
                              <span>{{ formatDate(task.dueDate) }}</span>
                            </div>
                            <div v-if="task.comments > 0" class="flex items-center gap-0.5" title="Comentários">
                              <Icon name="lucide:message-square" class="size-3" />
                              <span class="text-[9px]">{{ task.comments }}</span>
                            </div>
                            <div v-if="task.attachments > 0" class="flex items-center gap-0.5" title="Anexos">
                              <Icon name="lucide:paperclip" class="size-3" />
                              <span class="text-[9px]">{{ task.attachments }}</span>
                            </div>
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          <button v-if="task.whatsapp" @click.stop="openWhatsApp(task.whatsapp, task.clientName)"
                            class="text-emerald-500 hover:text-emerald-600">
                            <Icon name="lucide:message-circle" class="size-4" />
                          </button>
                          <BaseAvatar v-if="task.assignee" :src="task.assignee.avatar" size="xxs"
                            class="ring-2 ring-white dark:ring-muted-950 shadow-sm" />
                        </div>
                      </div>
                    </div>

                    <!-- Empty State -->
                    <div v-if="column.tasks.length === 0"
                      class="flex flex-col items-center justify-center py-12 text-center">
                      <div
                        class="size-12 rounded-full bg-muted-200/50 dark:bg-muted-800/50 flex items-center justify-center mb-3">
                        <Icon name="lucide:inbox" class="size-6 text-muted-400" />
                      </div>
                      <p class="text-sm text-muted-400 font-sans">Nenhum IR</p>
                      <p class="text-xs text-muted-400 mt-1 font-sans">Arraste os cards para cá</p>
                    </div>
                  </div>

                  <!-- Add Task Button (Only for first column) -->
                  <button v-if="column.title === 'AGUARDANDO DOCUMENTOS'" @click="openCreateDeclaration"
                    class="w-full mt-3 py-2.5 rounded-lg border-2 border-dashed border-muted-300 dark:border-muted-700 text-muted-500 dark:text-muted-400 hover:border-primary-500 hover:text-primary-500 hover:bg-primary-500/5 transition-all text-sm font-medium flex items-center justify-center gap-2 font-sans">
                    <Icon name="lucide:plus" class="size-4" />
                    Criar novo IR
                  </button>
                </div>
              </div>

              <!-- Manage Columns Placeholder -->
              <div
                class="w-14 shrink-0 flex flex-col justify-center items-center py-4 bg-muted-50/50 dark:bg-muted-900/20 rounded-xl border border-dashed border-muted-200 dark:border-muted-800 hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors cursor-pointer group"
                @click="openManageColumns" title="Gerenciar Colunas">
                <div class="flex flex-col items-center gap-4 group-hover:scale-110 transition-transform">
                  <Icon name="lucide:settings-2" class="size-5 text-muted-400 group-hover:text-primary-500" />
                  <span
                    class="text-[10px] text-muted-400 group-hover:text-primary-500 font-medium tracking-widest uppercase"
                    style="writing-mode: vertical-rl; text-orientation: mixed;">Configurar</span>
                </div>
              </div>

            </div>
          </div>
        </template>

        <!-- Fallback for SSR -->
        <template #fallback>
          <AppPageLoading message="Buscando declarações..." />
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
.sortable-ghost {
  opacity: 0.4;
}

.sortable-chosen {
  box-shadow: 0 0 0 2px var(--color-primary-500);
}

.sortable-drag {
  transform: scale(1.02);
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  z-index: 50;
  cursor: grabbing !important;
}
</style>
