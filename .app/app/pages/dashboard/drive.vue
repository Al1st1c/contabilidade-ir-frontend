<script setup lang="ts">
import { useApi } from '~/composables/useAuth'
import { PanelsDriveClientFiles } from '#components'

definePageMeta({
  title: 'Drive - Arquivos',
  preview: {
    title: 'Drive de Arquivos',
    description: 'Sistema de gerenciamento de arquivos por cliente',
    categories: ['layouts'],
    order: 90,
  },
})

const { useCustomFetch } = useApi()
const { open } = usePanels()

// State
const isLoading = ref(true)
const searchTerms = ref('')
const activeTab = ref<'all' | 'clients' | 'files'>('all')

// Filters
const filters = reactive({
  category: {
    document: false,
    receipt: false,
    income_report: false,
    medical: false,
    education: false,
    other: false,
  },
  period: {
    recent: false,
    thisMonth: false,
    lastMonth: false,
  },
  uploadedBy: {
    client: false,
    system: false,
  },
})

// Data
const filesData = ref<any[]>([])
const stats = ref({
  totalFiles: 0,
  totalSize: 0,
  totalSizeMB: '0',
  totalClients: 0,
  byCategory: {} as Record<string, number>
})

// Categorias
const categories = [
  { value: 'document', label: 'Documentos', icon: 'solar:document-text-bold-duotone', color: 'primary' },
  { value: 'receipt', label: 'Recibos', icon: 'solar:bill-list-bold-duotone', color: 'success' },
  { value: 'income_report', label: 'Informes', icon: 'solar:money-bag-bold-duotone', color: 'warning' },
  { value: 'medical', label: 'Médicas', icon: 'solar:health-bold-duotone', color: 'danger' },
  { value: 'education', label: 'Educação', icon: 'solar:book-bold-duotone', color: 'info' },
  { value: 'other', label: 'Outros', icon: 'solar:file-bold-duotone', color: 'muted' },
]

// Fetch data
const fetchFiles = async () => {
  isLoading.value = true
  try {
    const params: any = {}
    if (searchTerms.value) params.search = searchTerms.value

    const { data } = await useCustomFetch<any>('/drive/files', { params })
    if (data?.success) {
      filesData.value = data.data
    }
  } catch (error) {
    console.error('Erro ao buscar arquivos:', error)
  } finally {
    isLoading.value = false
  }
}

const fetchStats = async () => {
  try {
    const { data } = await useCustomFetch<any>('/drive/stats')
    if (data?.success) {
      stats.value = data.data
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
  }
}

// Computed - Todos os clientes
const allClients = computed(() => {
  return filesData.value.map(item => ({
    ...item.client,
    totalFiles: item.totalFiles,
    totalSize: item.totalSize,
    type: 'client'
  }))
})

// Computed - Todos os arquivos (flat)
const allFiles = computed(() => {
  const files: any[] = []
  filesData.value.forEach(clientData => {
    clientData.files.forEach((file: any) => {
      files.push({
        ...file,
        client: clientData.client,
        type: 'file'
      })
    })
  })
  return files
})

// Computed - Resultados filtrados
const filteredResults = computed(() => {
  let results: any[] = []

  // Selecionar dados baseado na tab ativa
  if (activeTab.value === 'clients') {
    results = allClients.value
  } else if (activeTab.value === 'files') {
    results = allFiles.value
  } else {
    // 'all' - mistura clientes e arquivos
    results = [...allClients.value, ...allFiles.value]
  }

  // Aplicar busca
  if (searchTerms.value) {
    const search = searchTerms.value.toLowerCase()
    results = results.filter((item: any) => {
      if (item.type === 'client') {
        return item.name.toLowerCase().includes(search) ||
          item.cpf?.includes(search)
      } else {
        return item.fileName.toLowerCase().includes(search) ||
          item.client.name.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search)
      }
    })
  }

  // Aplicar filtros de categoria (apenas para arquivos)
  const activeCategories = Object.entries(filters.category)
    .filter(([_, active]) => active)
    .map(([cat, _]) => cat)

  if (activeCategories.length > 0) {
    results = results.filter((item: any) => {
      if (item.type === 'file') {
        return activeCategories.includes(item.category)
      }
      return true // Clientes sempre passam
    })
  }

  // Aplicar filtro de uploadedBy
  if (filters.uploadedBy.client || filters.uploadedBy.system) {
    results = results.filter((item: any) => {
      if (item.type === 'file') {
        if (filters.uploadedBy.client && item.uploadedViaLink) return true
        if (filters.uploadedBy.system && !item.uploadedViaLink) return true
        return false
      }
      return true
    })
  }

  return results
})

// Helpers
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) return 'solar:file-text-bold-duotone'
  if (mimeType.includes('image')) return 'solar:gallery-bold-duotone'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'solar:document-bold-duotone'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'solar:chart-bold-duotone'
  return 'solar:file-bold-duotone'
}

const getCategoryInfo = (category: string) => {
  return categories.find(c => c.value === category) || categories[categories.length - 1]
}

// Actions
const openClientFiles = (client: any) => {
  open(PanelsDriveClientFiles, {
    clientId: client.id,
    clientName: client.name
  })
}

const downloadFile = (file: any) => {
  window.open(file.downloadUrl, '_blank')
}

// Lifecycle
onMounted(async () => {
  await Promise.all([fetchFiles(), fetchStats()])
})

// Watch search with debounce
const debouncedSearch = useDebounceFn(() => {
  fetchFiles()
}, 500)

watch(searchTerms, () => {
  debouncedSearch()
})
</script>

<template>
  <div class="w-full px-4 md:px-6 lg:px-8 pb-20 dark:[--color-input-default-bg:var(--color-muted-950)]">
    <!-- Search Bar -->
    <div class="my-6 flex w-full items-center gap-3">
      <BaseInput v-model="searchTerms" icon="lucide:search" placeholder="Buscar por cliente, CPF ou arquivo..."
        rounded="full" />
      <div>
        <BaseText size="sm" class="text-muted-400">
          {{ filteredResults.length }} resultado{{ filteredResults.length !== 1 ? 's' : '' }}
        </BaseText>
      </div>
    </div>

    <!-- Empty State (no data at all) -->
    <div v-if="!isLoading && filesData.length === 0">
      <BasePlaceholderPage title="Nenhum arquivo encontrado"
        subtitle="Ainda não há arquivos no sistema. Comece anexando documentos às declarações de IR.">
        <template #image>
          <img class="block dark:hidden" src="/img/illustrations/placeholders/flat/placeholder-search-4.svg"
            alt="Sem arquivos" />
          <img class="hidden dark:block" src="/img/illustrations/placeholders/flat/placeholder-search-4-dark.svg"
            alt="Sem arquivos" />
        </template>
      </BasePlaceholderPage>
    </div>

    <!-- Main Content -->
    <div v-else>
      <!-- Tabs -->
      <div class="border-muted-200 dark:border-muted-800 flex items-center gap-4 border-b font-sans">
        <button type="button" class="cursor-pointer border-b-2 p-3 text-sm transition-colors" :class="activeTab === 'all'
          ? 'text-muted-700 dark:text-muted-100 border-primary-500'
          : 'border-transparent text-muted-400 hover:text-muted-700 dark:hover:text-muted-100'"
          @click="activeTab = 'all'">
          Todos
        </button>
        <button type="button" class="cursor-pointer border-b-2 p-3 text-sm transition-colors" :class="activeTab === 'clients'
          ? 'text-muted-700 dark:text-muted-100 border-primary-500'
          : 'border-transparent text-muted-400 hover:text-muted-700 dark:hover:text-muted-100'"
          @click="activeTab = 'clients'">
          Clientes
        </button>
        <button type="button" class="cursor-pointer border-b-2 p-3 text-sm transition-colors" :class="activeTab === 'files'
          ? 'text-muted-700 dark:text-muted-100 border-primary-500'
          : 'border-transparent text-muted-400 hover:text-muted-700 dark:hover:text-muted-100'"
          @click="activeTab = 'files'">
          Arquivos
        </button>
      </div>

      <!-- Grid Layout -->
      <div class="grid grid-cols-12 gap-4">
        <!-- Sidebar - Filters -->
        <div class="col-span-12 lg:col-span-4 xl:col-span-3">
          <div class="flex flex-col gap-4 mt-4">
            <!-- Category Filters -->
            <BaseCard rounded="md" class="p-4">
              <BaseHeading as="h3" weight="medium" size="md" class="mb-4 text-muted-900 dark:text-muted-100">
                Categorias
              </BaseHeading>
              <ul class="space-y-4">
                <li v-for="cat in categories" :key="cat.value" class="flex items-center justify-between">
                  <BaseCheckbox v-model="filters.category[cat.value]" variant="default" :label="cat.label"
                    :classes="{ label: 'text-xs' }" />
                  <BaseTag rounded="full" size="sm" :color="cat.color">
                    {{ stats.byCategory[cat.value] || 0 }}
                  </BaseTag>
                </li>
              </ul>
            </BaseCard>

            <!-- Upload Source Filter -->
            <BaseCard rounded="md" class="p-4">
              <BaseHeading as="h3" weight="medium" size="md" class="mb-4 text-muted-900 dark:text-muted-100">
                Origem do Upload
              </BaseHeading>
              <ul class="space-y-4">
                <li class="flex items-center justify-between">
                  <BaseCheckbox v-model="filters.uploadedBy.client" variant="default" label="Enviado pelo cliente"
                    :classes="{ label: 'text-xs' }" />
                </li>
                <li class="flex items-center justify-between">
                  <BaseCheckbox v-model="filters.uploadedBy.system" variant="default" label="Enviado pelo sistema"
                    :classes="{ label: 'text-xs' }" />
                </li>
              </ul>
            </BaseCard>

            <!-- Stats Card -->
            <BaseCard rounded="md" class="p-4 bg-gradient-to-br from-primary-500/5 to-primary-500/10">
              <div class="flex items-center gap-3 mb-3">
                <div class="size-10 rounded-xl bg-primary-500 text-white flex items-center justify-center">
                  <Icon name="solar:database-bold-duotone" class="size-5" />
                </div>
                <div>
                  <BaseText size="xs" class="text-muted-400 uppercase font-semibold">Espaço Total</BaseText>
                  <BaseHeading as="h4" size="lg" weight="bold" class="text-primary-600 dark:text-primary-400">
                    {{ stats.totalSizeMB }} MB
                  </BaseHeading>
                </div>
              </div>
              <div class="text-xs text-muted-500">
                {{ stats.totalFiles }} arquivos • {{ stats.totalClients }} clientes
              </div>
            </BaseCard>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="col-span-12 lg:col-span-8 xl:col-span-9">
          <!-- Loading -->
          <div v-if="isLoading" class="flex items-center justify-center py-20">
            <div class="text-center">
              <Icon name="svg-spinners:blocks-shuffle-3" class="size-12 text-primary-500 mx-auto mb-4" />
              <BaseText size="sm" class="text-muted-400">Carregando...</BaseText>
            </div>
          </div>

          <!-- Empty filtered results -->
          <div v-else-if="filteredResults.length === 0" class="py-20">
            <BasePlaceholderPage title="Nenhum resultado"
              subtitle="Não encontramos nada com esses filtros. Tente ajustar sua busca.">
              <template #image>
                <img class="block dark:hidden" src="/img/illustrations/placeholders/flat/placeholder-search-4.svg"
                  alt="Sem resultados" />
                <img class="hidden dark:block" src="/img/illustrations/placeholders/flat/placeholder-search-4-dark.svg"
                  alt="Sem resultados" />
              </template>
            </BasePlaceholderPage>
          </div>

          <!-- Results -->
          <div v-else class="space-y-4 py-4">
            <BaseCard v-for="result in filteredResults" :key="result.id" rounded="md"
              class="p-4 hover:shadow-md transition-shadow cursor-pointer"
              @click="result.type === 'client' ? openClientFiles(result) : downloadFile(result)">
              <div class="flex w-full items-center gap-4">
                <!-- Client Avatar -->
                <BaseAvatar v-if="result.type === 'client'" :text="result.name.charAt(0)" size="md"
                  class="ring-2 ring-primary-500/20" />

                <!-- File Icon -->
                <div v-else class="size-10 rounded-xl flex items-center justify-center shrink-0"
                  :class="`bg-${getCategoryInfo(result.category).color}-500/10 text-${getCategoryInfo(result.category).color}-500`">
                  <Icon :name="getFileIcon(result.mimeType)" class="size-5" />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <BaseHeading as="h3" weight="medium" size="sm" class="text-muted-900 dark:text-muted-100 truncate"
                    lead="tight">
                    {{ result.type === 'client' ? result.name : result.fileName }}
                  </BaseHeading>
                  <div class="flex items-center gap-2 mt-0.5">
                    <!-- Client Info -->
                    <BaseText v-if="result.type === 'client'" size="xs" class="text-muted-600 dark:text-muted-400">
                      CPF: {{ result.cpf }} • {{ result.totalFiles }} arquivo{{ result.totalFiles !== 1 ? 's' : '' }}
                      ({{
                        formatFileSize(result.totalSize) }})
                    </BaseText>

                    <!-- File Info -->
                    <template v-else>
                      <BaseTag rounded="full" size="sm" :color="getCategoryInfo(result.category).color"
                        class="text-[10px]">
                        {{ getCategoryInfo(result.category).label }}
                      </BaseTag>
                      <span class="text-[10px] text-muted-400">
                        {{ formatFileSize(result.fileSize) }}
                      </span>
                      <span class="text-muted-300 dark:text-muted-600">•</span>
                      <span class="text-[10px] text-muted-400">
                        {{ result.client.name }}
                      </span>
                      <span v-if="result.uploadedViaLink" class="text-[10px] text-success-500 font-semibold">
                        📤 Cliente
                      </span>
                    </template>
                  </div>
                </div>

                <!-- Action Button -->
                <div class="ms-auto">
                  <BaseTooltip :content="result.type === 'client' ? 'Ver arquivos' : 'Baixar arquivo'">
                    <BaseButton rounded="full" size="icon-sm" color="muted">
                      <Icon :name="result.type === 'client' ? 'lucide:arrow-right' : 'lucide:arrow-down'" />
                    </BaseButton>
                  </BaseTooltip>
                </div>
              </div>
            </BaseCard>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
