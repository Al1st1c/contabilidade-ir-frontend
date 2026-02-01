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

// Buscar arquivos do cliente
const fetchClientFiles = async () => {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any>('/drive/files', {
      params: { clientId: props.clientId }
    })
    if (data?.success && data.data.length > 0) {
      files.value = data.data[0].files || []
    }
  } catch (error) {
    console.error('Erro ao buscar arquivos:', error)
  } finally {
    isLoading.value = false
  }
}

// Formatar tamanho
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Ícone por tipo
const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) return 'solar:file-text-bold-duotone'
  if (mimeType.includes('image')) return 'solar:gallery-bold-duotone'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'solar:document-bold-duotone'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'solar:chart-bold-duotone'
  return 'solar:file-bold-duotone'
}

// Preview do arquivo
const previewFile = (file: any) => {
  selectedFile.value = file
}

// Download
const downloadFile = (file: any) => {
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
      class="border-muted-200 dark:border-muted-800 flex h-16 w-full items-center justify-between border-b px-6 shrink-0 z-20 bg-white dark:bg-muted-900">
      <div>
        <BaseHeading as="h3" size="lg" weight="bold" class="text-muted-900 dark:text-white">
          Arquivos de {{ clientName }}
        </BaseHeading>
        <BaseParagraph size="xs" class="text-muted-400 mt-1">
          {{ files.length }} arquivo{{ files.length !== 1 ? 's' : '' }} encontrado{{ files.length !== 1 ? 's' : '' }}
        </BaseParagraph>
      </div>
      <button type="button"
        class="hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-500 rounded-full p-2 transition-colors duration-300"
        @click="emit('close')">
        <Icon name="lucide:x" class="size-5" />
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <Icon name="svg-spinners:blocks-shuffle-3" class="size-12 text-primary-500 mx-auto mb-4" />
        <BaseText size="sm" class="text-muted-400">Carregando arquivos...</BaseText>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="files.length === 0" class="flex-1 flex items-center justify-center p-8">
      <div class="text-center max-w-xs">
        <div class="size-20 mx-auto mb-4 rounded-xl bg-muted-100 dark:bg-muted-800 flex items-center justify-center">
          <Icon name="solar:folder-open-bold-duotone" class="size-10 text-muted-400" />
        </div>
        <BaseHeading as="h4" size="md" class="text-muted-500 mb-2">
          Nenhum arquivo
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-400">
          Este cliente ainda não possui arquivos anexados.
        </BaseParagraph>
      </div>
    </div>

    <!-- Files Grid -->
    <div v-else class="flex-1 overflow-y-auto p-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div v-for="file in files" :key="file.id" class="group cursor-pointer" @click="previewFile(file)">
          <BaseCard rounded="lg"
            class="p-5 transition-all hover:shadow-xl hover:border-primary-500 hover:-translate-y-1 duration-300">
            <div class="flex items-start gap-4">
              <!-- Icon -->
              <div
                class="size-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary-500/30 transition-transform group-hover:scale-110 group-hover:rotate-3">
                <Icon :name="getFileIcon(file.mimeType)" class="size-7" />
              </div>

              <!-- File Info -->
              <div class="flex-1 min-w-0">
                <!-- File Name -->
                <BaseHeading as="h5" size="sm" weight="semibold"
                  class="text-muted-900 dark:text-white line-clamp-2 mb-2">
                  {{ file.fileName }}
                </BaseHeading>

                <!-- Metadata -->
                <div class="space-y-1.5">
                  <div class="flex items-center gap-2">
                    <BaseTag rounded="full" size="sm" color="primary" class="text-[10px]">
                      {{ file.category }}
                    </BaseTag>
                    <span class="text-[11px] text-muted-400">
                      {{ formatFileSize(file.fileSize) }}
                    </span>
                  </div>

                  <div class="flex items-center gap-1.5 text-[11px] text-muted-500">
                    <Icon name="solar:calendar-bold-duotone" class="size-3.5" />
                    <span>IR {{ file.taxDeclaration.taxYear }}</span>
                  </div>

                  <div v-if="file.uploadedViaLink"
                    class="flex items-center gap-1.5 text-[11px] text-success-600 dark:text-success-400 font-medium">
                    <Icon name="solar:upload-bold-duotone" class="size-3.5" />
                    <span>Enviado pelo cliente</span>
                  </div>
                </div>
              </div>

              <!-- Action Icon -->
              <div class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div class="size-8 rounded-full bg-primary-500 text-white flex items-center justify-center">
                  <Icon name="solar:eye-bold" class="size-4" />
                </div>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>
    </div>

    <!-- File Preview Modal -->
    <TairoModal :open="!!selectedFile" size="md" @close="selectedFile = null">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0 mr-4">
            <BaseHeading as="h3" size="sm" weight="bold" class="text-muted-900 dark:text-white truncate">
              {{ selectedFile?.fileName }}
            </BaseHeading>
            <div class="flex items-center gap-2 mt-1">
              <BaseText size="xs" class="text-muted-400">
                {{ selectedFile ? formatFileSize(selectedFile.fileSize) : '' }}
              </BaseText>
              <span class="text-muted-300">•</span>
              <BaseText size="xs" class="text-muted-400">
                IR {{ selectedFile?.taxDeclaration.taxYear }}
              </BaseText>
            </div>
          </div>
        </div>
      </template>

      <div v-if="selectedFile" class="p-4">
        <!-- Preview Area -->
        <div
          class="bg-muted-50 dark:bg-muted-900/40 rounded-xl p-4 mb-4 flex items-center justify-center overflow-hidden">
          <!-- PDF Preview -->
          <div v-if="selectedFile.mimeType.includes('pdf')" class="w-full">
            <iframe :src="selectedFile.downloadUrl" class="w-full h-[400px] rounded-lg border-0" frameborder="0" />
          </div>

          <!-- Image Preview -->
          <div v-else-if="selectedFile.mimeType.includes('image')" class="w-full">
            <img :src="selectedFile.downloadUrl" :alt="selectedFile.fileName"
              class="max-w-full max-h-[400px] mx-auto rounded-lg shadow-lg object-contain" />
          </div>

          <!-- Other Files -->
          <div v-else class="text-center py-8">
            <div
              class="size-20 mx-auto mb-4 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
              <Icon :name="getFileIcon(selectedFile.mimeType)" class="size-10" />
            </div>
            <BaseHeading as="h4" size="sm" class="text-muted-700 dark:text-muted-200 mb-2">
              Preview não disponível
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-400">
              Este tipo de arquivo não pode ser visualizado no navegador.
            </BaseParagraph>
          </div>
        </div>

        <!-- File Details -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="bg-muted-50 dark:bg-muted-900/40 rounded-lg p-3">
            <BaseText size="xs" class="text-muted-400 uppercase font-semibold mb-1">Categoria</BaseText>
            <BaseTag rounded="full" size="sm" color="primary">
              {{ selectedFile.category }}
            </BaseTag>
          </div>
          <div class="bg-muted-50 dark:bg-muted-900/40 rounded-lg p-3">
            <BaseText size="xs" class="text-muted-400 uppercase font-semibold mb-1">Enviado por</BaseText>
            <BaseText size="xs" class="text-muted-700 dark:text-muted-200">
              {{ selectedFile.uploadedViaLink ? '📤 Cliente' : selectedFile.uploadedByName || 'Sistema' }}
            </BaseText>
          </div>
          <div class="bg-muted-50 dark:bg-muted-900/40 rounded-lg p-3">
            <BaseText size="xs" class="text-muted-400 uppercase font-semibold mb-1">Data de Upload</BaseText>
            <BaseText size="xs" class="text-muted-700 dark:text-muted-200">
              {{ new Date(selectedFile.createdAt).toLocaleDateString('pt-BR') }}
            </BaseText>
          </div>
          <div class="bg-muted-50 dark:bg-muted-900/40 rounded-lg p-3">
            <BaseText size="xs" class="text-muted-400 uppercase font-semibold mb-1">Tipo</BaseText>
            <BaseText size="xs" class="text-muted-700 dark:text-muted-200 truncate">
              {{ selectedFile.mimeType }}
            </BaseText>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <BaseButton variant="primary" rounded="md" class="flex-1" @click="downloadFile(selectedFile)">
            <Icon name="solar:download-minimalistic-bold-duotone" class="size-4 mr-2" />
            Baixar Arquivo
          </BaseButton>
          <BaseButton color="muted" rounded="md" @click="selectedFile = null">
            Fechar
          </BaseButton>
        </div>
      </div>
    </TairoModal>
  </FocusScope>
</template>
