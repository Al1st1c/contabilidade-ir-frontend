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

// Storage Quota (mock data - será integrado com backend futuramente)
const storageQuota = ref({
  totalQuotaMB: 500, // Quota total em MB (plano contratado)
  usedMB: 0, // Será calculado a partir dos stats
})

// Computed - Storage calculations
const storageUsedMB = computed(() => {
  return parseFloat(stats.value.totalSizeMB) || 0
})

const storageRemainingMB = computed(() => {
  return Math.max(0, storageQuota.value.totalQuotaMB - storageUsedMB.value)
})

const storagePercentage = computed(() => {
  if (storageQuota.value.totalQuotaMB === 0) return 0
  return Math.min(100, (storageUsedMB.value / storageQuota.value.totalQuotaMB) * 100)
})

const storageStatus = computed(() => {
  const pct = storagePercentage.value
  if (pct >= 100) return { level: 'critical', label: 'Esgotado', color: 'danger', icon: 'solar:danger-triangle-bold' }
  if (pct >= 95) return { level: 'danger', label: 'Crítico', color: 'danger', icon: 'solar:danger-triangle-bold' }
  if (pct >= 80) return { level: 'warning', label: 'Atenção', color: 'warning', icon: 'solar:bell-bold' }
  return { level: 'normal', label: 'Ok', color: 'success', icon: 'solar:check-circle-bold' }
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

// Computed - Contador de arquivos enviados pelo cliente
const uploadedByClientCount = computed(() => {
  return allFiles.value.filter((file: any) => file.uploadedViaLink).length
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
  <div class="overflow-hidden relative px-4 md:px-6 lg:px-8 pb-20">
    <!-- Grid -->
    <div class="grid grid-cols-12 gap-4">
      <!-- Column -->
      <div class="col-span-12">
        <!-- Inner grid -->
        <div class="grid grid-cols-12 gap-4">
          <!-- Header -->
          <div class="col-span-12">
            <div class="bg-primary-800 flex flex-col items-center rounded-2xl p-4 md:p-6 md:flex-row">
              <!-- Illustration - hidden on mobile -->
              <div class="hidden md:block relative h-[175px] w-[180px] shrink-0 overflow-visible">
                <NuxtImg class="pointer-events-none absolute -start-16 -top-8 w-[260px] max-w-none"
                  src="/img/illustrations/dashboards/drive/files-manager.png" alt="Drive illustration" preload
                  loading="eager" />
              </div>
              <div class="grow w-full md:w-auto">
                <div class="text-center md:text-start">
                  <BaseHeading tag="h1" size="xl" class="text-white md:text-2xl">
                    <span>Drive de Arquivos</span>
                  </BaseHeading>
                  <BaseParagraph size="xs" class="max-w-xs text-white/80 mx-auto md:mx-0 md:text-sm">
                    <span>
                      Gerencie todos os documentos dos seus clientes em um só lugar.
                    </span>
                  </BaseParagraph>
                </div>
              </div>
              <!-- Storage Quota Card -->
              <div class="mt-4 w-full md:w-auto md:mt-0 md:ms-auto shrink-0">
                <div class="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4 md:min-w-[220px]">
                  <!-- Header with status -->
                  <div class="flex items-center justify-between mb-2 md:mb-3">
                    <div class="flex items-center gap-2">
                      <div class="size-7 md:size-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
                        <Icon name="solar:server-bold-duotone" class="size-3.5 md:size-4" />
                      </div>
                      <BaseText size="xs" class="text-white/70 uppercase font-semibold">Armazenamento</BaseText>
                    </div>
                    <!-- Status Badge -->
                    <div v-if="storageStatus.level !== 'normal'"
                      class="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse"
                      :class="{
                        'bg-warning-500 text-warning-950': storageStatus.level === 'warning',
                        'bg-danger-500 text-white': storageStatus.level === 'danger' || storageStatus.level === 'critical'
                      }">
                      <Icon :name="storageStatus.icon" class="size-3" />
                      <span>{{ storageStatus.label }}</span>
                    </div>
                  </div>

                  <!-- Usage Display -->
                  <div class="mb-2 md:mb-3">
                    <div class="flex items-baseline gap-1">
                      <span class="text-xl md:text-2xl font-bold text-white">{{ storageUsedMB.toFixed(1) }}</span>
                      <span class="text-xs md:text-sm text-white/60">/ {{ storageQuota.totalQuotaMB }} MB</span>
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  <div class="mb-2 md:mb-3">
                    <div class="h-1.5 md:h-2 bg-white/20 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-500" :class="{
                        'bg-success-400': storageStatus.level === 'normal',
                        'bg-warning-400': storageStatus.level === 'warning',
                        'bg-danger-400': storageStatus.level === 'danger' || storageStatus.level === 'critical'
                      }" :style="{ width: `${storagePercentage}%` }" />
                    </div>
                    <div class="flex justify-between mt-1">
                      <span class="text-[10px] text-white/50">{{ storagePercentage.toFixed(0) }}% usado</span>
                      <span class="text-[10px] text-white/50">{{ storageRemainingMB.toFixed(1) }} MB livres</span>
                    </div>
                  </div>

                  <!-- Stats Footer - hidden on mobile to save space -->
                  <div class="hidden md:flex text-xs text-white/60 border-t border-white/10 pt-2 justify-between">
                    <span>📁 {{ stats.totalFiles }}</span>
                    <span>👤 {{ stats.totalClients }}</span>
                  </div>

                  <!-- Upgrade CTA (when storage is low) -->
                  <div v-if="storageStatus.level !== 'normal'" class="mt-2 md:mt-3">
                    <BaseButton size="sm" class="w-full bg-white/20 hover:bg-white/30 text-white border-0 text-xs">
                      <Icon name="solar:bolt-bold" class="size-3" />
                      <span>Aumentar espaço</span>
                    </BaseButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Content -->
          <div class="col-span-12">
            <!-- Sub grid -->
            <div class="grid grid-cols-12 gap-3 md:gap-4">
              <!-- Stats Tiles - Full width on mobile, half on desktop -->
              <div class="col-span-12 lg:col-span-6">
                <div class="flex flex-col gap-3 md:gap-4">
                  <!-- Tile grid -->
                  <div class="grid grid-cols-3 gap-2 md:gap-4">
                    <!-- Tile - Total Arquivos -->
                    <BaseCard rounded="lg" class="p-3 md:p-4">
                      <div class="flex items-center gap-1.5 md:gap-2 mb-1">
                        <Icon name="solar:folder-with-files-bold-duotone" class="size-3.5 md:size-4 text-primary-500" />
                        <BaseParagraph size="xs" weight="medium" class="text-muted-400 uppercase hidden sm:block">
                          Arquivos
                        </BaseParagraph>
                      </div>
                      <span class="text-muted-900 dark:text-muted-100 block font-sans text-xl md:text-2xl font-bold">
                        {{ stats.totalFiles }}
                      </span>
                      <span class="text-[10px] text-muted-400 sm:hidden">Arquivos</span>
                    </BaseCard>
                    <!-- Tile - Total Clientes -->
                    <BaseCard rounded="lg" class="p-3 md:p-4">
                      <div class="flex items-center gap-1.5 md:gap-2 mb-1">
                        <Icon name="solar:users-group-rounded-bold-duotone" class="size-3.5 md:size-4 text-info-500" />
                        <BaseParagraph size="xs" weight="medium" class="text-muted-400 uppercase hidden sm:block">
                          Clientes
                        </BaseParagraph>
                      </div>
                      <span class="text-muted-900 dark:text-muted-100 block font-sans text-xl md:text-2xl font-bold">
                        {{ stats.totalClients }}
                      </span>
                      <span class="text-[10px] text-muted-400 sm:hidden">Clientes</span>
                    </BaseCard>
                    <!-- Tile - Enviados por Cliente -->
                    <BaseCard rounded="lg" class="p-3 md:p-4">
                      <div class="flex items-center gap-1.5 md:gap-2 mb-1">
                        <Icon name="solar:upload-bold-duotone" class="size-3.5 md:size-4 text-success-500" />
                        <BaseParagraph size="xs" weight="medium" class="text-muted-400 uppercase hidden sm:block">
                          Via Link
                        </BaseParagraph>
                      </div>
                      <span class="text-muted-900 dark:text-muted-100 block font-sans text-xl md:text-2xl font-bold">
                        {{ uploadedByClientCount }}
                      </span>
                      <span class="text-[10px] text-muted-400 sm:hidden">Via Link</span>
                    </BaseCard>
                  </div>

                  <!-- Search Bar - Always visible -->
                  <BaseCard class="p-3 md:p-4" rounded="lg">
                    <div class="flex w-full items-center gap-2 md:gap-3">
                      <BaseInput v-model="searchTerms" icon="lucide:search"
                        placeholder="Buscar cliente, CPF ou arquivo..." rounded="full" class="text-sm" />
                      <BaseText size="xs" class="text-muted-400 whitespace-nowrap">
                        ({{ filteredResults.length }})
                      </BaseText>
                    </div>
                  </BaseCard>

                  <!-- Filters - Hidden on mobile, collapsible could be added later -->
                  <div class="hidden lg:block">
                    <div class="flex flex-col gap-4">
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
                            <BaseCheckbox v-model="filters.uploadedBy.client" variant="default"
                              label="Enviado pelo cliente" :classes="{ label: 'text-xs' }" />
                          </li>
                          <li class="flex items-center justify-between">
                            <BaseCheckbox v-model="filters.uploadedBy.system" variant="default"
                              label="Enviado pelo sistema" :classes="{ label: 'text-xs' }" />
                          </li>
                        </ul>
                      </BaseCard>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Sub column - File List -->
              <div class="col-span-12 lg:col-span-6">
                <!-- Widget -->
                <BaseCard class="p-3 md:p-6" rounded="lg">
                  <div v-if="!isLoading && filesData.length === 0">
                    <BasePlaceholderPage title="Nenhum arquivo encontrado"
                      subtitle="Ainda não há arquivos no sistema. Comece anexando documentos às declarações de IR.">
                      <template #image>
                        <img class="block dark:hidden"
                          src="/img/illustrations/placeholders/flat/placeholder-search-4.svg" alt="Sem arquivos" />
                        <img class="hidden dark:block"
                          src="/img/illustrations/placeholders/flat/placeholder-search-4-dark.svg" alt="Sem arquivos" />
                      </template>
                    </BasePlaceholderPage>
                  </div>
                  <div v-else>
                    <!-- Tabs -->
                    <div
                      class="border-muted-200 dark:border-muted-800 flex items-center gap-1 md:gap-4 border-b font-sans overflow-x-auto">
                      <button type="button"
                        class="cursor-pointer border-b-2 px-2 py-2 md:p-3 text-xs md:text-sm transition-colors whitespace-nowrap"
                        :class="activeTab === 'all'
                          ? 'text-muted-700 dark:text-muted-100 border-primary-500'
                          : 'border-transparent text-muted-400 hover:text-muted-700 dark:hover:text-muted-100'"
                        @click="activeTab = 'all'">
                        Todos
                      </button>
                      <button type="button"
                        class="cursor-pointer border-b-2 px-2 py-2 md:p-3 text-xs md:text-sm transition-colors whitespace-nowrap"
                        :class="activeTab === 'clients'
                          ? 'text-muted-700 dark:text-muted-100 border-primary-500'
                          : 'border-transparent text-muted-400 hover:text-muted-700 dark:hover:text-muted-100'"
                        @click="activeTab = 'clients'">
                        Clientes
                      </button>
                      <button type="button"
                        class="cursor-pointer border-b-2 px-2 py-2 md:p-3 text-xs md:text-sm transition-colors whitespace-nowrap"
                        :class="activeTab === 'files'
                          ? 'text-muted-700 dark:text-muted-100 border-primary-500'
                          : 'border-transparent text-muted-400 hover:text-muted-700 dark:hover:text-muted-100'"
                        @click="activeTab = 'files'">
                        Arquivos
                      </button>
                    </div>


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
                            <img class="block dark:hidden"
                              src="/img/illustrations/placeholders/flat/placeholder-search-4.svg"
                              alt="Sem resultados" />
                            <img class="hidden dark:block"
                              src="/img/illustrations/placeholders/flat/placeholder-search-4-dark.svg"
                              alt="Sem resultados" />
                          </template>
                        </BasePlaceholderPage>
                      </div>

                      <!-- Results -->
                      <div v-else class="space-y-2 md:space-y-4 py-3 md:py-4">
                        <BaseCard v-for="result in filteredResults" :key="result.id" rounded="md"
                          class="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer"
                          @click="result.type === 'client' ? openClientFiles(result) : downloadFile(result)">
                          <div class="flex w-full items-center gap-3 md:gap-4">
                            <!-- Client Avatar -->
                            <BaseAvatar v-if="result.type === 'client'" :text="result.name.charAt(0)" size="sm"
                              class="ring-2 ring-primary-500/20 md:size-10 shrink-0" />

                            <!-- File Icon -->
                            <div v-else
                              class="size-8 md:size-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0"
                              :class="`bg-${getCategoryInfo(result.category).color}-500/10 text-${getCategoryInfo(result.category).color}-500`">
                              <Icon :name="getFileIcon(result.mimeType)" class="size-4 md:size-5" />
                            </div>

                            <!-- Content -->
                            <div class="flex-1 min-w-0">
                              <BaseHeading as="h3" weight="medium" size="xs"
                                class="text-muted-900 dark:text-muted-100 truncate md:text-sm" lead="tight">
                                {{ result.type === 'client' ? result.name : result.fileName }}
                              </BaseHeading>
                              <div class="flex flex-wrap items-center gap-1 md:gap-2 mt-0.5">
                                <!-- Client Info -->
                                <BaseText v-if="result.type === 'client'" size="xs"
                                  class="text-muted-600 dark:text-muted-400 text-[10px] md:text-xs">
                                  <span class="hidden sm:inline">CPF: {{ result.cpf }} • </span>
                                  {{ result.totalFiles }} arq.
                                  <span class="hidden sm:inline">({{ formatFileSize(result.totalSize) }})</span>
                                </BaseText>

                                <!-- File Info -->
                                <template v-else>
                                  <BaseTag rounded="full" size="sm" :color="getCategoryInfo(result.category).color"
                                    class="text-[9px] md:text-[10px] px-1.5 md:px-2">
                                    {{ getCategoryInfo(result.category).label }}
                                  </BaseTag>
                                  <span class="text-[10px] text-muted-400 hidden sm:inline">
                                    {{ formatFileSize(result.fileSize) }}
                                  </span>
                                  <span class="text-[10px] text-muted-400 truncate max-w-[80px] md:max-w-none">
                                    {{ result.client.name }}
                                  </span>
                                  <span v-if="result.uploadedViaLink"
                                    class="text-[9px] md:text-[10px] text-success-500 font-semibold">
                                    📤
                                  </span>
                                </template>
                              </div>
                            </div>

                            <!-- Action Button - Hidden on very small screens -->
                            <div class="ms-auto hidden sm:block">
                              <BaseButton rounded="full" size="icon-sm" color="muted">
                                <Icon :name="result.type === 'client' ? 'lucide:arrow-right' : 'lucide:arrow-down'"
                                  class="size-3.5 md:size-4" />
                              </BaseButton>
                            </div>
                            <!-- Mobile chevron indicator -->
                            <Icon :name="result.type === 'client' ? 'lucide:chevron-right' : 'lucide:download'"
                              class="size-4 text-muted-400 sm:hidden shrink-0" />
                          </div>
                        </BaseCard>
                      </div>
                    </div>
                  </div>
                </BaseCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>
