<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

const props = defineProps<{
  clientId: string
  clientName: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { useCustomFetch } = useApi()
const isLoading = ref(true)
const files = ref<any[]>([])
const selectedFile = ref<any>(null)
const currentFolder = ref<number | null>(null) // null = root (folders view)

// Buscar arquivos do cliente
async function fetchClientFiles() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any>('/drive/files', {
      params: { clientId: props.clientId },
    })
    if (data?.success && data.data.length > 0) {
      files.value = data.data[0].files || []
    }
  }
  catch (error) {
    console.error('Erro ao buscar arquivos:', error)
  }
  finally {
    isLoading.value = false
  }
}

// Pastas = anos disponíveis com contagem
const folders = computed(() => {
  const map = new Map<number, { year: number, count: number, totalSize: number }>()
  files.value.forEach((f: any) => {
    const year = f.taxDeclaration?.taxYear
    if (!year) return
    if (!map.has(year)) {
      map.set(year, { year, count: 0, totalSize: 0 })
    }
    const folder = map.get(year)!
    folder.count++
    folder.totalSize += f.fileSize || 0
  })
  return Array.from(map.values()).sort((a, b) => b.year - a.year)
})

// Arquivos da pasta aberta
const currentFiles = computed(() => {
  if (currentFolder.value === null) return []
  return files.value.filter((f: any) => f.taxDeclaration?.taxYear === currentFolder.value)
})

// Breadcrumb
const breadcrumb = computed(() => {
  const items = [{ label: props.clientName, action: () => { currentFolder.value = null } }]
  if (currentFolder.value !== null) {
    items.push({ label: `IRPF ${currentFolder.value}`, action: () => { } })
  }
  return items
})

function openFolder(year: number) {
  currentFolder.value = year
}

function goBack() {
  currentFolder.value = null
}

// Formatar tamanho
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
}

// Ícone por tipo
function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return 'lucide:file-text'
  if (mimeType.includes('image')) return 'lucide:image'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'lucide:file-type'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'lucide:file-spreadsheet'
  return 'lucide:file'
}

// Cor do ícone por tipo
function getFileIconColor(mimeType: string) {
  if (mimeType.includes('pdf')) return 'text-rose-500'
  if (mimeType.includes('image')) return 'text-violet-500'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'text-blue-500'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'text-emerald-500'
  return 'text-muted-400'
}

// Traduzir categoria
function translateCategory(category: string) {
  const map: Record<string, string> = {
    document: 'Documento',
    receipt: 'Comprovante',
    report: 'Relatório',
    internal: 'Interno',
    other: 'Outro',
  }
  return map[category] || category
}

function previewFile(file: any) {
  selectedFile.value = file
}

function downloadFile(file: any) {
  window.open(file.downloadUrl, '_blank')
}

onMounted(() => {
  fetchClientFiles()
})
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-800 border-l bg-white dark:bg-muted-900 w-full max-w-2xl shadow-2xl flex flex-col h-screen overflow-hidden">
    <!-- Header -->
    <div
      class="border-muted-200 dark:border-muted-800 flex w-full items-center justify-between border-b px-5 py-3 shrink-0 bg-white dark:bg-muted-900">
      <div class="flex items-center gap-2 min-w-0">
        <button v-if="currentFolder !== null" type="button"
          class="hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-400 hover:text-muted-600 rounded-lg p-1 transition-colors shrink-0"
          @click="goBack">
          <Icon name="lucide:arrow-left" class="size-4" />
        </button>
        <Icon v-else name="lucide:hard-drive" class="size-4 text-primary-500 shrink-0" />
        <!-- Breadcrumb -->
        <div class="flex items-center gap-1 min-w-0 text-sm">
          <template v-for="(item, idx) in breadcrumb" :key="idx">
            <span v-if="idx > 0" class="text-muted-300 dark:text-muted-600 shrink-0">/</span>
            <button v-if="idx < breadcrumb.length - 1" type="button"
              class="text-muted-500 hover:text-muted-700 dark:hover:text-muted-300 truncate transition-colors"
              @click="item.action">
              {{ item.label }}
            </button>
            <span v-else class="text-muted-800 dark:text-muted-200 font-semibold truncate">
              {{ item.label }}
            </span>
          </template>
        </div>
      </div>
      <button type="button"
        class="hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-400 hover:text-muted-600 rounded-lg p-1.5 transition-colors shrink-0"
        @click="emit('close')">
        <Icon name="lucide:x" class="size-4" />
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <Icon name="svg-spinners:blocks-shuffle-3" class="size-8 text-primary-500 mx-auto mb-3" />
        <BaseText size="xs" class="text-muted-400">Carregando...</BaseText>
      </div>
    </div>

    <!-- Empty (no files at all) -->
    <div v-else-if="files.length === 0" class="flex-1 flex items-center justify-center p-8">
      <div class="text-center">
        <Icon name="lucide:folder-open" class="size-10 text-muted-300 dark:text-muted-600 mx-auto mb-3" />
        <BaseText size="sm" class="text-muted-400">Nenhum arquivo encontrado.</BaseText>
      </div>
    </div>

    <!-- ═══ ROOT: Folders View ═══ -->
    <div v-else-if="currentFolder === null" class="flex-1 overflow-y-auto nui-slimscroll p-5">
      <BaseText size="xs" class="text-muted-400 uppercase tracking-wider font-bold mb-3 px-1">
        {{ folders.length }} pasta{{ folders.length !== 1 ? 's' : '' }}
      </BaseText>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button v-for="folder in folders" :key="folder.year" type="button"
          class="group text-left p-4 rounded-xl border border-muted-200 dark:border-muted-800 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all"
          @click="openFolder(folder.year)">
          <Icon name="lucide:folder"
            class="size-8 text-amber-400 dark:text-amber-500 mb-2 group-hover:scale-105 transition-transform" />
          <BaseText size="sm" weight="semibold" class="text-muted-800 dark:text-muted-200 block">
            IRPF {{ folder.year }}
          </BaseText>
          <BaseText size="xs" class="text-muted-400 mt-0.5">
            {{ folder.count }} arquivo{{ folder.count !== 1 ? 's' : '' }} · {{ formatFileSize(folder.totalSize) }}
          </BaseText>
        </button>
      </div>
    </div>

    <!-- ═══ INSIDE FOLDER: Files View ═══ -->
    <div v-else class="flex-1 overflow-y-auto nui-slimscroll">
      <div class="px-5 pt-3 pb-1">
        <BaseText size="xs" class="text-muted-400 uppercase tracking-wider font-bold">
          {{ currentFiles.length }} arquivo{{ currentFiles.length !== 1 ? 's' : '' }}
        </BaseText>
      </div>
      <div class="divide-y divide-muted-100 dark:divide-muted-800/50">
        <button v-for="file in currentFiles" :key="file.id" type="button"
          class="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-muted-50 dark:hover:bg-muted-800/40 transition-colors group"
          @click="previewFile(file)">
          <!-- Icon -->
          <div class="size-9 rounded-lg bg-muted-100 dark:bg-muted-800 flex items-center justify-center shrink-0">
            <Icon :name="getFileIcon(file.mimeType)" class="size-4" :class="getFileIconColor(file.mimeType)" />
          </div>
          <!-- File Info -->
          <div class="flex-1 min-w-0">
            <BaseText size="xs" weight="medium" class="text-muted-800 dark:text-muted-200 truncate block">
              {{ file.fileName }}
            </BaseText>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-muted-400">{{ formatFileSize(file.fileSize) }}</span>
              <span class="text-muted-200 dark:text-muted-700">·</span>
              <span class="text-[10px] text-muted-400">{{ translateCategory(file.category) }}</span>
              <template v-if="file.uploadedViaLink">
                <span class="text-muted-200 dark:text-muted-700">·</span>
                <span class="text-[10px] text-emerald-500 font-medium">Cliente</span>
              </template>
            </div>
          </div>
          <!-- Action hint -->
          <Icon name="lucide:chevron-right"
            class="size-3.5 text-muted-300 dark:text-muted-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>

    <!-- File Preview Modal -->
    <TairoModal :open="!!selectedFile" size="md" @close="selectedFile = null">
      <template #header>
        <div class="flex items-center gap-3 min-w-0 mr-4">
          <div class="size-8 rounded-lg bg-muted-100 dark:bg-muted-800 flex items-center justify-center shrink-0">
            <Icon v-if="selectedFile" :name="getFileIcon(selectedFile.mimeType)" class="size-4"
              :class="getFileIconColor(selectedFile.mimeType)" />
          </div>
          <div class="min-w-0">
            <BaseText size="sm" weight="semibold" class="text-muted-900 dark:text-white truncate block">
              {{ selectedFile?.fileName }}
            </BaseText>
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-muted-400">
                {{ selectedFile ? formatFileSize(selectedFile.fileSize) : '' }}
              </span>
              <span class="text-muted-300 dark:text-muted-700">·</span>
              <span class="text-[11px] text-muted-400">
                {{ selectedFile ? new Date(selectedFile.createdAt).toLocaleDateString('pt-BR') : '' }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <div v-if="selectedFile" class="p-4">
        <!-- Preview Area -->
        <div class="bg-muted-50 dark:bg-muted-900/40 rounded-xl overflow-hidden mb-4">
          <div v-if="selectedFile.mimeType.includes('pdf')" class="w-full">
            <iframe :src="selectedFile.downloadUrl" class="w-full h-[400px] border-0" frameborder="0" />
          </div>
          <div v-else-if="selectedFile.mimeType.includes('image')" class="w-full flex items-center justify-center p-4">
            <img :src="selectedFile.downloadUrl" :alt="selectedFile.fileName"
              class="max-w-full max-h-[400px] rounded-lg object-contain">
          </div>
          <div v-else class="text-center py-10">
            <Icon :name="getFileIcon(selectedFile.mimeType)" class="size-10 mx-auto mb-3"
              :class="getFileIconColor(selectedFile.mimeType)" />
            <BaseText size="xs" class="text-muted-400">
              Preview não disponível para este tipo de arquivo.
            </BaseText>
          </div>
        </div>

        <!-- Metadata inline -->
        <div class="flex items-center gap-3 text-[11px] text-muted-400 mb-4 px-1">
          <span>{{ translateCategory(selectedFile.category) }}</span>
          <span class="text-muted-200 dark:text-muted-700">·</span>
          <span>
            {{ selectedFile.uploadedViaLink ? 'Enviado pelo cliente' : selectedFile.uploadedByName || 'Sistema' }}
          </span>
          <span class="text-muted-200 dark:text-muted-700">·</span>
          <span class="font-mono">{{ selectedFile.mimeType.split('/').pop() }}</span>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <BaseButton size="sm" variant="primary" rounded="lg" class="flex-1" @click="downloadFile(selectedFile)">
            <Icon name="lucide:download" class="size-3.5 mr-1.5" />
            Baixar
          </BaseButton>
          <BaseButton size="sm" color="muted" rounded="lg" @click="selectedFile = null">
            Fechar
          </BaseButton>
        </div>
      </div>
    </TairoModal>
  </FocusScope>
</template>
