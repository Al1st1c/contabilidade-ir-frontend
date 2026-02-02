<script setup lang="ts">
import Sortable from 'sortablejs'

const emit = defineEmits(['close'])
const props = defineProps<{
  onSaved?: () => void
}>()

function close() {
  emit('close')
}

const { useCustomFetch } = useApi()
const toast = useNuiToasts()

const columns = ref<any[]>([])
const isLoading = ref(true)
const listContainer = ref<HTMLElement | null>(null)

// Fetch columns
async function fetchColumns() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any>('/declarations/columns')
    if (data.success) {
      columns.value = data.data.map((col: any) => ({
        ...col,
        clientStatus: col.clientStatus || 'NONE'
      }))

      nextTick(() => {
        if (listContainer.value) {
          Sortable.create(listContainer.value, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: (evt) => {
              const { oldIndex, newIndex } = evt
              if (typeof oldIndex === 'number' && typeof newIndex === 'number' && oldIndex !== newIndex) {
                const item = columns.value.splice(oldIndex, 1)[0]
                columns.value.splice(newIndex, 0, item)
                onDragEnd()
              }
            }
          })
        }
      })
    }
  } catch (err) {
    console.error(err)
    toast.add({ title: 'Erro', message: 'Erro ao buscar colunas', type: 'danger' })
  } finally {
    isLoading.value = false
  }
}

// Add New Column
const newColumnName = ref('')
const isCreating = ref(false)

async function addColumn() {
  if (!newColumnName.value.trim()) return
  isCreating.value = true
  try {
    const { data } = await useCustomFetch<any>('/declarations/columns', {
      method: 'POST',
      body: {
        name: newColumnName.value,
        color: 'info', // default
        isInitial: false,
        isFinal: false
      }
    })
    if (data.success) {
      toast.add({ title: 'Sucesso', description: 'Coluna criada!' })
      newColumnName.value = ''
      await fetchColumns()
      props.onSaved?.()
    }
  } catch (err) {
    console.error(err)
    toast.add({ title: 'Erro', description: 'Erro ao criar coluna' })
  } finally {
    isCreating.value = false
  }
}

// Update Column
async function updateColumn(column: any) {
  try {
    await useCustomFetch(`/declarations/columns/${column.id}`, {
      method: 'PUT',
      body: {
        name: column.name,
        color: column.color,
        clientStatus: column.clientStatus === 'NONE' ? null : column.clientStatus,
        isInitial: column.isInitial,
        isFinal: column.isFinal
      }
    })
    toast.add({ title: 'Sucesso', description: 'Coluna atualizada' })
    props.onSaved?.()
  } catch (err) {
    console.error(err)
    toast.add({ title: 'Erro', description: 'Erro ao atualizar' })
  }
}

// Delete Column
async function deleteColumn(id: string) {
  if (!confirm('Tem certeza? Se houver cards nesta coluna, a exclusão falhará.')) return
  try {
    await useCustomFetch(`/declarations/columns/${id}`, {
      method: 'DELETE'
    })
    toast.add({ title: 'Sucesso', description: 'Coluna excluída' })
    await fetchColumns()
    props.onSaved?.()
  } catch (err: any) {
    console.error(err)
    const msg = err.data?.message || 'Erro ao excluir'
    toast.add({ title: 'Erro', description: msg })
  }
}

// Reorder
async function onDragEnd() {
  const payload = {
    columns: columns.value.map((c, index) => ({ id: c.id, order: index }))
  }
  try {
    await useCustomFetch('/declarations/columns/reorder', {
      method: 'PUT',
      body: payload
    })
    props.onSaved?.()
  } catch (err) {
    console.error(err)
    toast.add({ title: 'Erro', description: 'Erro ao reordenar' })
  }
}

import { safeColors } from '~/utils/colors'

onMounted(() => {
  fetchColumns()
})

const statusOptions = [
  { label: 'Ocultar no App (Etapa Intermediária)', value: 'NONE' },
  { label: 'Aguardando Documentos', value: 'DOCUMENTS' },
  { label: 'Em Análise', value: 'ANALYSIS' },
  { label: 'Em Preenchimento (Receita)', value: 'FILLING' },
  { label: 'Transmitida', value: 'TRANSMITTED' },
]
</script>

<template>
  <div
    class="flex h-full flex-col bg-white dark:bg-muted-900 shadow-xl w-full sm:w-[500px] border-l border-muted-200 dark:border-muted-800">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-muted-200 dark:border-muted-800">
      <BaseHeading as="h3" size="md" weight="medium">
        Gerenciar Colunas
      </BaseHeading>
      <BaseButton size="icon-sm" rounded="full" color="muted" @click="close">
        <Icon name="lucide:x" class="size-4" />
      </BaseButton>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6">

      <!-- Add New -->
      <div class="flex gap-2 mb-6">
        <BaseInput v-model="newColumnName" placeholder="Nova coluna..." class="flex-1" @keyup.enter="addColumn" />
        <BaseButton color="primary" @click="addColumn" :loading="isCreating" :disabled="!newColumnName">
          <Icon name="lucide:plus" class="size-4 mr-2" />
          Adicionar
        </BaseButton>
      </div>

      <!-- List -->
      <div v-if="isLoading" class="flex justify-center py-4">
        <BaseIconBox size="md" rounded="full" class="bg-muted-100 text-muted-400 animate-pulse">
          <Icon name="lucide:loader-2" class="size-6 animate-spin" />
        </BaseIconBox>
      </div>

      <div v-else ref="listContainer" class="space-y-3">
        <div v-for="element in columns" :key="element.id"
          class="group flex flex-col gap-2 p-3 rounded-lg border border-muted-200 dark:border-muted-800 bg-muted-50/50 dark:bg-muted-900/50">
          <div class="flex items-center gap-2">
            <button class="drag-handle cursor-grab text-muted-400 hover:text-muted-600">
              <Icon name="lucide:grip-vertical" class="size-4" />
            </button>

            <!-- Name Edit -->
            <input v-model="element.name" @change="updateColumn(element)"
              class="flex-1 bg-transparent text-sm font-medium border-none focus:ring-0 p-0 text-muted-800 dark:text-muted-100 placeholder-muted-400" />

            <!-- Delete -->
            <button @click="deleteColumn(element.id)" class="text-muted-400 hover:text-danger-500 transition-colors p-1"
              title="Excluir">
              <Icon name="lucide:trash-2" class="size-4" />
            </button>
          </div>

          <!-- Details (Color) -->
          <div class="flex items-center gap-3 pl-6">
            <div class="flex items-center gap-1 flex-wrap max-w-[200px]">
              <button v-for="color in safeColors" :key="color.name"
                @click="element.color = color.name; updateColumn(element)"
                class="size-4 rounded-full border transition-all" :class="[
                  element.color === color.name ? 'ring-2 ring-offset-1 ring-primary-500 border-transparent' : 'border-transparent opacity-40 hover:opacity-100',
                  color.class
                ]" :title="color.label">
              </button>
            </div>

            <!-- Client App Status -->
            <div class="flex-1">
              <BaseSelect v-model="element.clientStatus" placeholder="Status no App" size="sm" shape="rounded"
                @update:model-value="updateColumn(element)">
                <BaseSelectItem v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </BaseSelectItem>
              </BaseSelect>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!isLoading && columns.length === 0" class="text-center py-8 text-muted-400 text-sm">
        Nenhuma coluna encontrada.
      </div>
    </div>
  </div>
</template>

<style scoped>
.drag-handle {
  touch-action: none;
}
</style>
