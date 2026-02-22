<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits(['close', 'refresh'])

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

const isUploading = ref(false)
const uploadProgress = ref(0)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

function triggerFileSelect() {
  fileInput.value?.click()
}

function removeFile() {
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

async function handleUpload() {
  if (!selectedFile.value) return

  isUploading.value = true
  uploadProgress.value = 10

  const formData = new FormData()
  formData.append('file', selectedFile.value)

  try {
    const response = await useCustomFetch<any>('/clients/import', {
      method: 'POST',
      body: formData,
    })

    uploadProgress.value = 100

    toaster.add({
      title: 'Importação Iniciada',
      description: response.data.message || 'Os clientes estão sendo processados em segundo plano.',
      icon: 'solar:check-circle-bold-duotone',
    })

    setTimeout(() => {
      emit('refresh')
      emit('close')
      resetModal()
    }, 1500)
  }
  catch (error: any) {
    console.error('Erro no upload:', error)
    toaster.add({
      title: 'Erro na Importação',
      description: error.data?.message || 'Não foi possível processar o arquivo.',
      icon: 'solar:danger-circle-bold-duotone',
    })
  }
  finally {
    isUploading.value = false
  }
}

async function downloadTemplate() {
  try {
    // Usar useCustomFetch para garantir autenticação
    const { data } = await useCustomFetch<any>('/clients/import/template', {
      method: 'GET',
      responseType: 'blob', // Importante para receber o buffer como blob
    })

    if (data) {
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'modelo_importacao_clientes.xlsx')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }
  }
  catch (error) {
    console.error('Erro ao baixar modelo:', error)
    toaster.add({
      title: 'Erro no Download',
      description: 'Não foi possível baixar a planilha modelo.',
      icon: 'solar:danger-circle-bold-duotone',
    })
  }
}

function resetModal() {
  selectedFile.value = null
  isUploading.value = false
  uploadProgress.value = 0
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => !val && emit('close')">
    <DialogPortal>
      <DialogOverlay class="bg-muted-800/70 dark:bg-muted-900/80 fixed inset-0 z-[99]" />
      <DialogContent
        class="fixed top-[50%] start-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-lg bg-white dark:bg-muted-900 rounded-2xl shadow-2xl border border-muted-200 dark:border-muted-800 z-[100] overflow-hidden flex flex-col">

        <!-- Header -->
        <div class="px-6 py-4 border-b border-muted-200 dark:border-muted-800 flex items-center justify-between">
          <BaseHeading as="h3" size="lg" weight="medium" class="text-muted-800 dark:text-white">
            Importar Clientes
          </BaseHeading>
          <BaseButtonClose @close="emit('close')" />
        </div>

        <!-- Body -->
        <div class="p-8">
          <div v-if="!selectedFile"
            class="border-2 border-dashed border-muted-200 dark:border-muted-800 rounded-2xl p-10 flex flex-col items-center justify-center transition-colors hover:border-primary-500/50 group cursor-pointer"
            @click="triggerFileSelect">

            <div
              class="size-16 bg-muted-100 dark:bg-muted-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary-500/10 transition-colors">
              <Icon name="solar:document-add-bold-duotone"
                class="size-8 text-muted-400 group-hover:text-primary-500 transition-colors" />
            </div>

            <BaseHeading as="h4" size="md" weight="medium" class="text-muted-800 dark:text-white mb-1">
              Selecione sua planilha
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-500 text-center">
              Arraste o arquivo XLSX ou clique para procurar no seu computador.
            </BaseParagraph>

            <input ref="fileInput" type="file" class="hidden" accept=".xlsx" @change="handleFileSelect">
          </div>

          <div v-else class="space-y-4">
            <div
              class="flex items-center gap-4 p-4 bg-muted-50 dark:bg-muted-950 rounded-xl border border-muted-200 dark:border-muted-800">
              <div class="size-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Icon name="solar:file-check-bold-duotone" class="size-6 text-green-500" />
              </div>
              <div class="flex-1 overflow-hidden">
                <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-white truncate">
                  {{ selectedFile.name }}
                </BaseText>
                <BaseText size="xs" class="text-muted-500">
                  {{ (selectedFile.size / 1024).toFixed(1) }} KB
                </BaseText>
              </div>
              <BaseButtonClose size="xs" @close="removeFile" />
            </div>

            <div v-if="isUploading" class="space-y-2">
              <div
                class="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-muted-400">
                <span>Enviando arquivo...</span>
                <span>{{ uploadProgress }}%</span>
              </div>
              <BaseProgress size="xs" color="primary" :value="uploadProgress" />
            </div>
          </div>

          <!-- Instructions -->
          <div class="mt-8 space-y-4">
            <div class="flex gap-3 items-start p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <Icon name="solar:info-circle-bold-duotone" class="size-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <BaseText size="xs" weight="medium" class="text-amber-800 dark:text-amber-200 block mb-1">
                  Atenção aos campos obrigatórios
                </BaseText>
                <BaseParagraph size="xs" class="text-amber-700/80 dark:text-amber-200/60 leading-tight">
                  Sua planilha deve conter as colunas **NOME**, **CPF** e **TELEFONE** preenchidas corretamente.
                </BaseParagraph>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <BaseParagraph size="xs" class="text-muted-500">
                Ainda não tem o modelo?
              </BaseParagraph>
              <BaseButton variant="ghost" size="sm" class="text-primary-500" @click="downloadTemplate">
                <Icon name="solar:download-minimalistic-bold-duotone" class="size-4 mr-1" />
                Baixar Planilha Modelo
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="px-6 py-4 bg-muted-50 dark:bg-muted-950 border-t border-muted-200 dark:border-muted-800 flex justify-end gap-3">
          <BaseButton variant="muted" size="sm" @click="emit('close')">
            Cancelar
          </BaseButton>
          <BaseButton variant="primary" size="sm" :disabled="!selectedFile || isUploading" :loading="isUploading"
            @click="handleUpload">
            Iniciar Importação
          </BaseButton>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
