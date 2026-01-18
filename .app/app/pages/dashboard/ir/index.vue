<script setup lang="ts">
// import { useSortable } from '@vueuse/integrations/useSortable'
import Sortable from 'sortablejs'

definePageMeta({
  title: 'Impostos de Renda',
})

// Types
interface Task {
  id: number
  name: string
  description?: string
  status: string
  priority: 'low' | 'medium' | 'high'
  assignee?: {
    name: string
    avatar: string
  }
  dueDate?: string
  comments: number
  attachments: number
}

interface Column {
  id: string
  title: string
  color: string
  tasks: Task[]
}

// Reactive state - Mock data for IR control
const columns = ref<Column[]>([
  {
    id: 'waiting-docs',
    title: 'Aguardando Documentos',
    color: 'amber',
    tasks: [
      {
        id: 1,
        name: 'Ricardo Mendes - IRPF 2024',
        description: 'Aguardando informe de rendimentos do Banco do Brasil e Itaú',
        status: 'waiting-docs',
        priority: 'high',
        assignee: { name: 'Ana Paula', avatar: '/img/avatars/5.svg' },
        dueDate: '2025-03-15',
        comments: 2,
        attachments: 3,
      },
      {
        id: 2,
        name: 'Fernanda Costa - IRPF 2024',
        description: 'Faltam comprovantes de despesas médicas e recibos de aluguel',
        status: 'waiting-docs',
        priority: 'medium',
        assignee: { name: 'Carlos Silva', avatar: '/img/avatars/8.svg' },
        dueDate: '2025-03-18',
        comments: 5,
        attachments: 8,
      },
      {
        id: 3,
        name: 'Marcos Oliveira - IRPF 2024',
        description: 'Pendente: DARF pagamentos, informe de previdência privada',
        status: 'waiting-docs',
        priority: 'low',
        assignee: { name: 'Juliana Ramos', avatar: '/img/avatars/12.svg' },
        dueDate: '2025-03-25',
        comments: 0,
        attachments: 1,
      },
    ],
  },
  {
    id: 'docs-received',
    title: 'Documentação Recebida',
    color: 'info',
    tasks: [
      {
        id: 4,
        name: 'Patricia Souza - IRPF 2024',
        description: 'Todos documentos recebidos. Pronto para análise.',
        status: 'docs-received',
        priority: 'high',
        assignee: { name: 'Roberto Alves', avatar: '/img/avatars/2.svg' },
        dueDate: '2025-03-10',
        comments: 8,
        attachments: 22,
      },
      {
        id: 5,
        name: 'José Carlos Lima - IRPF 2024',
        description: 'Documentação completa. Inclui venda de imóvel em 2024.',
        status: 'docs-received',
        priority: 'high',
        assignee: { name: 'Ana Paula', avatar: '/img/avatars/5.svg' },
        dueDate: '2025-03-12',
        comments: 12,
        attachments: 35,
      },
    ],
  },
  {
    id: 'analysis',
    title: 'Em Análise',
    color: 'purple',
    tasks: [
      {
        id: 6,
        name: 'Marina Ferreira - IRPF 2024',
        description: 'Analisando dedução de dependentes e verificando informes',
        status: 'analysis',
        priority: 'medium',
        assignee: { name: 'Carlos Silva', avatar: '/img/avatars/8.svg' },
        dueDate: '2025-03-08',
        comments: 4,
        attachments: 18,
      },
      {
        id: 7,
        name: 'Antonio Pereira - IRPF 2024',
        description: 'Verificando rendimentos de aluguéis e aplicações financeiras',
        status: 'analysis',
        priority: 'high',
        assignee: { name: 'Juliana Ramos', avatar: '/img/avatars/12.svg' },
        dueDate: '2025-03-06',
        comments: 6,
        attachments: 24,
      },
    ],
  },
  {
    id: 'filling',
    title: 'Preenchimento IRPF',
    color: 'info',
    tasks: [
      {
        id: 8,
        name: 'Luciana Dias - IRPF 2024',
        description: 'Preenchendo declaração no PGD. Modelo completo.',
        status: 'filling',
        priority: 'high',
        assignee: { name: 'Roberto Alves', avatar: '/img/avatars/2.svg' },
        dueDate: '2025-03-05',
        comments: 3,
        attachments: 20,
      },
    ],
  },
  {
    id: 'review',
    title: 'Revisão Final',
    color: 'amber',
    tasks: [
      {
        id: 9,
        name: 'Claudia Martins - IRPF 2024',
        description: 'Aguardando aprovação do cliente antes do envio',
        status: 'review',
        priority: 'high',
        assignee: { name: 'Ana Paula', avatar: '/img/avatars/5.svg' },
        dueDate: '2025-03-03',
        comments: 15,
        attachments: 28,
      },
      {
        id: 10,
        name: 'Eduardo Santos - IRPF 2024',
        description: 'Revisando cálculo de ganho de capital em ações',
        status: 'review',
        priority: 'medium',
        assignee: { name: 'Carlos Silva', avatar: '/img/avatars/8.svg' },
        dueDate: '2025-03-04',
        comments: 9,
        attachments: 31,
      },
    ],
  },
  {
    id: 'submitted',
    title: 'Declarações Enviadas',
    color: 'success',
    tasks: [
      {
        id: 11,
        name: 'Beatriz Almeida - IRPF 2024',
        description: 'Declaração enviada em 28/02. Recibo nº 12345678',
        status: 'submitted',
        priority: 'low',
        assignee: { name: 'Roberto Alves', avatar: '/img/avatars/2.svg' },
        comments: 2,
        attachments: 25,
      },
      {
        id: 12,
        name: 'Rafael Nascimento - IRPF 2024',
        description: 'Enviada com restituição de R$ 3.250,00 prevista',
        status: 'submitted',
        priority: 'low',
        assignee: { name: 'Juliana Ramos', avatar: '/img/avatars/12.svg' },
        comments: 1,
        attachments: 19,
      },
      {
        id: 13,
        name: 'Sandra Rodrigues - IRPF 2024',
        description: 'Declaração retificadora enviada. Correção de dependente.',
        status: 'submitted',
        priority: 'low',
        assignee: { name: 'Ana Paula', avatar: '/img/avatars/5.svg' },
        comments: 7,
        attachments: 30,
      },
    ],
  },
])

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

// Methods
function formatDate(date?: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Columns container ref
const columnsContainer = ref<HTMLElement | null>(null)
const taskContainers = ref<Map<string, HTMLElement>>(new Map())
const sortableInstances = ref<Map<string, Sortable>>(new Map())

// Initialize sortable for columns after mount
onMounted(async () => {
  await nextTick()

  if (columnsContainer.value) {
    Sortable.create(columnsContainer.value, {
      animation: 200,
      handle: '.column-handle',
      ghostClass: 'opacity-50',
      dragClass: 'shadow-2xl',
      onEnd: (evt) => {
        if (evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
          const movedColumn = columns.value.splice(evt.oldIndex, 1)[0]
          columns.value.splice(evt.newIndex, 0, movedColumn)
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
        // Task was added to this column from another
        const fromColumnId = evt.from.dataset.columnId
        const toColumnId = evt.to.dataset.columnId

        if (fromColumnId && toColumnId && evt.oldIndex !== undefined && evt.newIndex !== undefined) {
          const fromColumn = columns.value.find(c => c.id === fromColumnId)
          const toColumn = columns.value.find(c => c.id === toColumnId)

          if (fromColumn && toColumn) {
            // Remove from source (Sortable already moved the DOM element)
            const task = fromColumn.tasks[evt.oldIndex]
            if (task) {
              fromColumn.tasks.splice(evt.oldIndex, 1)
              toColumn.tasks.splice(evt.newIndex, 0, task)
            }
          }
        }
      },
      onUpdate: (evt) => {
        // Task was reordered within the same column
        const columnId = evt.from.dataset.columnId

        if (columnId && evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
          const column = columns.value.find(c => c.id === columnId)

          if (column) {
            const task = column.tasks.splice(evt.oldIndex, 1)[0]
            column.tasks.splice(evt.newIndex, 0, task)
          }
        }
      },
    })

    sortableInstances.value.set(columnId, sortable)
  })
}
</script>

<template>
  <div class="h-full">
    <!-- Page Header -->
    <div class="px-4 md:px-6 lg:px-8 xl:px-10 pb-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-muted-800 dark:text-white font-sans">
            Impostos de Renda
          </h1>
          <p class="text-sm text-muted-500 dark:text-muted-400 mt-1 font-sans">
            Gerencie suas declarações e documentos fiscais
          </p>
        </div>
        <div class="flex items-center gap-3">
          <BaseButton size="sm" rounded="lg" variant="default">
            <Icon name="lucide:filter" class="size-4 me-2" />
            Filtrar
          </BaseButton>
          <BaseButton size="sm" rounded="lg" variant="primary">
            <Icon name="lucide:plus" class="size-4 me-2" />
            Nova Tarefa
          </BaseButton>
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
                  <span
                    class="font-semibold text-sm text-muted-800 dark:text-muted-100 uppercase tracking-wide font-sans">
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
                      class="bg-white dark:bg-muted-900 rounded-xl border border-muted-200 dark:border-muted-800 p-4 cursor-grab active:cursor-grabbing hover:shadow-lg hover:border-primary-500/30 transition-all duration-200">
                      <!-- Task Header -->
                      <div class="flex items-start justify-between gap-2 mb-3">
                        <span
                          :class="[priorityColors[task.priority], 'px-2 py-0.5 rounded text-[10px] font-bold uppercase']">
                          {{ priorityLabels[task.priority] }}
                        </span>
                        <span class="text-[10px] text-muted-400 font-mono">#{{ task.id }}</span>
                      </div>

                      <!-- Task Title -->
                      <h4 class="font-semibold text-sm text-muted-800 dark:text-muted-100 mb-2 line-clamp-2 font-sans">
                        {{ task.name }}
                      </h4>

                      <!-- Task Description -->
                      <p v-if="task.description"
                        class="text-xs text-muted-500 dark:text-muted-400 mb-3 line-clamp-2 font-sans">
                        {{ task.description }}
                      </p>

                      <!-- Task Footer -->
                      <div
                        class="flex items-center justify-between pt-3 border-t border-muted-100 dark:border-muted-800">
                        <div class="flex items-center gap-2">
                          <BaseAvatar v-if="task.assignee" :src="task.assignee.avatar" size="xxs"
                            class="ring-2 ring-white dark:ring-muted-900" />
                          <span v-if="task.dueDate" class="flex items-center gap-1 text-[11px] text-muted-500">
                            <Icon name="lucide:calendar" class="size-3" />
                            {{ formatDate(task.dueDate) }}
                          </span>
                        </div>
                        <div class="flex items-center gap-3">
                          <span v-if="task.comments > 0" class="flex items-center gap-1 text-muted-400">
                            <Icon name="lucide:message-circle" class="size-3.5" />
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
                  <span class="text-sm font-semibold">Nova Coluna</span>
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
