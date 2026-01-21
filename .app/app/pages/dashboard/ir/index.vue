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
  paymentStatus?: 'pending' | 'partial' | 'paid' // Added for financial badge
  assignee?: {
    name: string
    avatar: string
  }
  dueDate?: string
  comments: number
  attachments: number
  tags?: string[]
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
const taxYearFilter = ref(2024)


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
  info: 'bg-info-500',
  purple: 'bg-purple-500',
  success: 'bg-success-500',
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
            name: card.assignedTo.name,
            avatar: card.assignedTo.photo ? `${API_CONFIG.BASE_URL}/files/${card.assignedTo.photo}` : '/img/avatars/placeholder.svg'
          } : undefined,
          dueDate: card.dueDate,
          comments: card.commentsTotal || 0,
          attachments: card.attachmentsCount || 0,
          tags: card.client?.tags || [],
          whatsapp: card.client?.whatsapp || card.client?.phone,
          hasDependents: card.hasDependents,
          paymentStatus: card.paymentStatus || 'pending', // Map from backend
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
        const fromColumnId = evt.from.dataset.columnId
        const toColumnId = evt.to.dataset.columnId

        if (fromColumnId && toColumnId && typeof evt.oldIndex === 'number' && typeof evt.newIndex === 'number') {
          const fromColumn = columns.value.find(c => c.id === fromColumnId)
          const toColumn = columns.value.find(c => c.id === toColumnId)

          if (fromColumn && toColumn) {
            const task = fromColumn.tasks[evt.oldIndex]
            if (task) {
              fromColumn.tasks.splice(evt.oldIndex, 1)
              toColumn.tasks.splice(evt.newIndex, 0, task)

              // Persist to backend
              moveTask(task.id, toColumnId, evt.newIndex)
            }
          }
        }
      },
      onUpdate: (evt) => {
        const columnId = evt.from.dataset.columnId

        if (columnId && typeof evt.oldIndex === 'number' && typeof evt.newIndex === 'number' && evt.oldIndex !== evt.newIndex) {
          const column = columns.value.find(c => c.id === columnId)

          if (column) {
            const task = column.tasks.splice(evt.oldIndex, 1)[0]
            if (task) {
              column.tasks.splice(evt.newIndex, 0, task)
              // Persist to backend
              moveTask(task.id, columnId, evt.newIndex)
            }
          }
        }
      },
    })

    sortableInstances.value.set(columnId, sortable)
  })
}

// Panels
const { open } = usePanels()
import { PanelsPanelCreateDeclaration, PanelsPanelDeclarationDetails } from '#components'

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
  <div class="h-full">
    <!-- Page Header -->
    <div class="px-4 md:px-6 lg:px-8 xl:px-10 pb-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex h-12 items-center justify-between pe-4 xl:pe-10">
          <div class="flex items-center gap-2">
            <BaseAvatar :src="'/img/avatars/10.svg'" size="xs" />
            <div>
              <BaseParagraph size="xs" class="text-muted-400">
                Gustavo B
              </BaseParagraph>
              <BaseHeading as="h2" size="sm" weight="medium">
                ConsTar
              </BaseHeading>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <BaseAvatarGroup :avatars="[]" size="xs" />
          <BaseTooltip content="Detalhes">
            <BaseButton size="icon-sm" rounded="full">
              <Icon name="solar:widget-4-linear" class="size-4" />
            </BaseButton>
          </BaseTooltip>
          <BaseTooltip content="Nova Tarefa">
            <BaseButton size="icon-sm" rounded="full" variant="primary" @click="openCreateDeclaration">
              <Icon name="lucide:plus" class="size-4" />
            </BaseButton>
          </BaseTooltip>
        </div>
      </div>
    </div>

    <!-- Kanban Board -->
    <div class="px-4 md:px-6 lg:px-8 xl:px-10 overflow-x-auto">
      <ClientOnly>
        <template #default>
          <div class="min-w-max pb-8">
            <!-- Columns Container -->
            <div ref="columnsContainer" class="flex gap-6">
              <!-- Column -->
              <div v-for="column in columns" :key="column.id" class="w-80 shrink-0">
                <!-- Column Header -->
                <div class="flex items-center gap-3 mb-4 px-1 group">
                  <div
                    class="column-handle cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors">
                    <Icon name="lucide:grip-vertical" class="size-4 text-muted-400" />
                  </div>
                  <div :class="[columnColors[column.color], 'size-3 rounded-full']" />
                  <span class=" text-sm text-muted-800 dark:text-muted-100 uppercase tracking-wide font-sans">
                    {{ column.title }}
                  </span>
                  <span
                    class="ml-auto bg-muted-100 dark:bg-muted-800 text-muted-600 dark:text-muted-400 px-2 py-0.5 rounded-md text-xs font-bold">
                    {{ column.tasks.length }}
                  </span>
                  <button
                    class="opacity-0 group-hover:opacity-100 text-muted-400 hover:text-muted-600 dark:hover:text-muted-300 transition-all">
                    <Icon name="lucide:more-horizontal" class="size-4" />
                  </button>
                </div>

                <!-- Tasks Container -->
                <div class="min-h-[calc(100vh-320px)] rounded-xl bg-muted-100/50 dark:bg-muted-900/30 p-3">
                  <div :data-column-id="column.id" class="space-y-3 min-h-[100px]">
                    <!-- Task Card -->
                    <div v-for="task in column.tasks" :key="task.id"
                      class="bg-white dark:bg-muted-900 rounded-xl border border-muted-200 dark:border-muted-800 p-4 hover:shadow-lg hover:border-primary-500/30 transition-all duration-200 group relative">

                      <!-- Click to open details (excluding action buttons) -->
                      <div @click="openDeclarationDetails(task.id)" class="cursor-pointer">
                        <!-- Card Header: Client Info -->
                        <div class="mb-3">
                          <div class="flex items-start justify-between gap-2 mb-1">
                            <h4 class="font-medium text-base text-muted-800 dark:text-muted-100 font-sans flex-1">
                              {{ task.clientName }}
                            </h4>
                            <span
                              class="text-[10px] text-muted-400 font-mono bg-muted-50 dark:bg-muted-800/50 px-1.5 py-0.5 rounded shrink-0">
                              IR {{ task.taxYear }}
                            </span>
                          </div>
                          <span class="text-[11px] text-muted-400 font-mono">{{ task.cpf }}</span>
                        </div>

                        <!-- Financial Status Badge -->
                        <div class="mb-3 flex items-center gap-2">
                          <div v-if="task.estimatedValue"
                            class="flex-1 py-1.5 px-2.5 rounded-lg flex items-center gap-2" :class="[
                              task.paymentStatus === 'paid' ? 'bg-success-500/10 border border-success-500/20' :
                                task.paymentStatus === 'partial' ? 'bg-amber-500/10 border border-amber-500/20' :
                                  'bg-rose-500/10 border border-rose-500/20'
                            ]">
                            <Icon :name="task.paymentStatus === 'paid' ? 'lucide:check-circle' : 'lucide:clock'"
                              class="size-3.5" :class="[
                                task.paymentStatus === 'paid' ? 'text-success-600' :
                                  task.paymentStatus === 'partial' ? 'text-amber-600' :
                                    'text-rose-600'
                              ]" />
                            <div class="flex-1 min-w-0">
                              <p class="text-[9px] uppercase tracking-wide" :class="[
                                task.paymentStatus === 'paid' ? 'text-success-600/70' :
                                  task.paymentStatus === 'partial' ? 'text-amber-600/70' :
                                    'text-rose-600/70'
                              ]">
                                {{ task.paymentStatus === 'paid' ? 'Pago' : task.paymentStatus === 'partial' ? 'Parcial'
                                  : 'Pendente' }}
                              </p>
                              <p class="text-xs font-bold truncate" :class="[
                                task.paymentStatus === 'paid' ? 'text-success-700 dark:text-success-400' :
                                  task.paymentStatus === 'partial' ? 'text-amber-700 dark:text-amber-400' :
                                    'text-rose-700 dark:text-rose-400'
                              ]">
                                {{ formatCurrency(task.estimatedValue) }}
                              </p>
                            </div>
                          </div>
                          <span
                            :class="[priorityColors[task.priority], 'px-2 py-0.5 rounded text-[10px] uppercase shrink-0']">
                            {{ priorityLabels[task.priority] }}
                          </span>
                        </div>

                        <!-- Estimated Result -->
                        <div v-if="task.estimatedValue && task.estimatedResult"
                          class="flex items-center gap-2 mb-3 py-2 px-3 rounded-lg bg-mut ed-50 dark:bg-muted-800/50">
                          <Icon :name="resultIcons[task.estimatedResult] || 'lucide:minus'"
                            :class="[resultColors[task.estimatedResult] || '', 'size-4']" />
                          <div class="flex-1">
                            <span class="text-[10px] text-muted-500 dark:text-muted-400 uppercase">
                              {{ resultLabels[task.estimatedResult] }}
                            </span>
                            <p :class="[resultColors[task.estimatedResult], 'text-sm font-semibold']">
                              {{ formatCurrency(task.estimatedValue) }}
                            </p>
                          </div>
                          <Icon v-if="task.hasDependents" name="lucide:users" class="size-4 text-muted-400"
                            title="Possui dependentes" />
                        </div>

                        <!-- Tags -->
                        <div v-if="task.tags && task.tags.length > 0" class="flex flex-wrap gap-1.5 mb-3">
                          <span v-for="tag in task.tags.slice(0, 3)" :key="tag"
                            :class="[getTagColor(tag), 'px-2 py-0.5 rounded text-[10px] font-medium']">
                            {{ tag }}
                          </span>
                          <span v-if="task.tags.length > 3"
                            class="px-2 py-0.5 rounded text-[10px] font-medium bg-muted-100 text-muted-600 dark:bg-muted-800 dark:text-muted-400">
                            +{{ task.tags.length - 3 }}
                          </span>
                        </div>

                        <!-- Description -->
                        <p v-if="task.description"
                          class="text-xs text-muted-500 dark:text-muted-400 mb-3 line-clamp-2 font-sans">
                          {{ task.description }}
                        </p>
                      </div>

                      <!-- Card Footer with Actions -->
                      <div
                        class="flex items-center justify-between pt-3 border-t border-muted-100 dark:border-muted-800">
                        <!-- Assignee Info -->
                        <div class="flex items-center gap-2">
                          <BaseAvatar v-if="task.assignee" :src="task.assignee.avatar" size="xxs"
                            class="ring-2 ring-white dark:ring-muted-900" />
                          <div v-if="task.assignee" class="flex flex-col">
                            <span class="text-[10px] font-medium text-muted-600 dark:text-muted-400">
                              {{ task.assignee.name.split(' ')[0] }}
                            </span>
                          </div>
                          <span v-if="task.dueDate" class="flex items-center gap-1 text-[11px] text-muted-500 ml-2">
                            <Icon name="lucide:calendar" class="size-3" />
                            {{ formatDate(task.dueDate) }}
                          </span>
                        </div>

                        <!-- Quick Actions -->
                        <div class="flex items-center gap-2" @click.stop>
                          <!-- WhatsApp Quick Contact -->
                          <button v-if="task.whatsapp" @click="openWhatsApp(task.whatsapp, task.clientName)"
                            class="flex items-center gap-1 text-emerald-500 hover:text-emerald-600 transition-colors p-1.5 rounded hover:bg-emerald-500/10"
                            title="Enviar WhatsApp">
                            <Icon name="lucide:message-circle" class="size-3.5" />
                          </button>

                          <!-- Quick Copy Link Button -->
                          <button @click="quickCopyCollectionLink(task.id, task.clientName)"
                            class="flex items-center gap-1 text-primary-500 hover:text-primary-600 transition-colors p-1.5 rounded hover:bg-primary-500/10 opacity-0 group-hover:opacity-100"
                            title="Copiar Link de Upload">
                            <Icon name="lucide:link" class="size-3.5" />
                          </button>

                          <!-- Comments/Attachments -->
                          <span v-if="task.comments > 0" class="flex items-center gap-1 text-muted-400">
                            <Icon name="lucide:message-square" class="size-3.5" />
                            <span class="text-[10px] font-bold">{{ task.comments }}</span>
                          </span>
                          <span v-if="task.attachments > 0" class="flex items-center gap-1 text-muted-400">
                            <Icon name="lucide:paperclip" class="size-3.5" />
                            <span class="text-[10px] font-bold">{{ task.attachments }}</span>
                          </span>
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
                      <p class="text-sm text-muted-400 font-medium font-sans">Nenhuma tarefa</p>
                      <p class="text-xs text-muted-400 mt-1 font-sans">Arraste tarefas para cá</p>
                    </div>
                  </div>

                  <!-- Add Task Button -->
                  <button
                    class="w-full mt-3 py-2.5 rounded-lg border-2 border-dashed border-muted-300 dark:border-muted-700 text-muted-500 dark:text-muted-400 hover:border-primary-500 hover:text-primary-500 hover:bg-primary-500/5 transition-all text-sm font-medium flex items-center justify-center gap-2 font-sans">
                    <Icon name="lucide:plus" class="size-4" />
                    Adicionar tarefa
                  </button>
                </div>
              </div>

              <!-- Add Column Button -->
              <div class="w-80 shrink-0">
                <button
                  class="w-full h-32 rounded-xl border-2 border-dashed border-muted-300 dark:border-muted-700 text-muted-500 dark:text-muted-400 hover:border-primary-500 hover:text-primary-500 hover:bg-primary-500/5 transition-all flex flex-col items-center justify-center gap-2 font-sans">
                  <div class="size-10 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center">
                    <Icon name="lucide:plus" class="size-5" />
                  </div>
                  <span class="text-sm ">Nova Coluna</span>
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- Fallback for SSR -->
        <template #fallback>
          <div class="flex gap-6 pb-8">
            <div v-for="i in 6" :key="i" class="w-80 shrink-0 animate-pulse">
              <div class="h-8 w-32 bg-muted-200 dark:bg-muted-800 rounded-lg mb-4" />
              <div class="space-y-3 bg-muted-100/50 dark:bg-muted-900/30 rounded-xl p-3 min-h-[400px]">
                <div class="h-32 bg-muted-200/50 dark:bg-muted-800/50 rounded-xl" />
                <div class="h-32 bg-muted-200/50 dark:bg-muted-800/50 rounded-xl" />
              </div>
            </div>
          </div>
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
  transform: rotate(2deg) scale(1.05);
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  z-index: 50;
}
</style>
