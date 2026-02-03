<script setup lang="ts">
definePageMeta({
  layout: 'client',
})

const { user } = useAuth()
const { useCustomFetch } = useApi()
const { selectedTaxYear } = useClientSession()

const isLoading = ref(true)
const rawDeclaration = ref<any>(null)
const documents = ref<any[]>([])

async function loadData() {
  if (!user.value?.id)
    return

  try {
    isLoading.value = true
    const { data: clientRes } = await useCustomFetch(`/clients/${user.value.id}`)
    if (clientRes.success) {
      // Busca declaração que bate com o ano selecionado
      const declaration = clientRes.data.taxDeclarations?.find((d: any) => Number(d.taxYear) === selectedTaxYear.value)

      if (declaration) {
        const { data: decRes } = await useCustomFetch(`/declarations/${declaration.id}`)
        if (decRes.success) {
          rawDeclaration.value = decRes.data
          // Filter and organize documents
          documents.value = decRes.data.attachments || []
        }
      }
    }
  }
  catch (error) {
    console.error('Erro ao carregar documentos:', error)
  }
  finally {
    isLoading.value = false
  }
}

const downloadingDocs = ref<Set<string>>(new Set())

// Download handler
// Download handler
async function downloadAttachment(attachment: any) {
  if (!rawDeclaration.value?.id)
    return

  downloadingDocs.value.add(attachment.id)
  try {
    const { data } = await useCustomFetch<any>(`/declarations/${rawDeclaration.value.id}/attachments/${attachment.id}/preview`)

    if (data?.url) {
      // Create a temporary link element to trigger the download
      const link = document.createElement('a')
      link.href = data.url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'

      // If it's a PDF, we want to view it, but for others we might prefer download
      // The S3 signed URL usually handles the content-disposition header

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
  catch (error) {
    console.error('Erro ao baixar documento:', error)
  }
  finally {
    downloadingDocs.value.delete(attachment.id)
  }
}

// Watch for year changes
watch(selectedTaxYear, loadData)

onMounted(loadData)

// Computed groups - ONLY OFFICIAL DOCUMENTS
const officialDocs = computed(() => {
  // Categorias definidas no painel do contador (PanelDeclarationDetails.vue)
  const officialCategories = ['irpf_backup', 'irpf_receipt', 'irpf_declaration', 'irpf_darf']
  return documents.value.filter(d => officialCategories.includes(d.category))
})

function getIcon(mimeType: string) {
  if (mimeType.includes('pdf'))
    return 'vscode-icons:file-type-pdf2'
  if (mimeType.includes('image'))
    return 'vscode-icons:file-type-image'
  if (mimeType.includes('excel') || mimeType.includes('sheet'))
    return 'vscode-icons:file-type-excel'
  if (mimeType.includes('zip') || mimeType.includes('compressed'))
    return 'vscode-icons:file-type-zip'
  return 'vscode-icons:default-file'
}

function formatSize(bytes: number) {
  if (bytes === 0)
    return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}
</script>

<template>
  <div class="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <BaseButton size="sm" variant="muted" @click="navigateTo('/client')">
        <Icon name="lucide:arrow-left" class="size-4" />
      </BaseButton>
      <div>
        <BaseHeading as="h2" size="xl" weight="bold" class="text-muted-800 dark:text-white">
          Documentos Oficiais
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
          Baixe aqui os comprovantes, recibos e guias do seu Imposto de Renda.
        </BaseParagraph>
      </div>
    </div>

    <div v-if="isLoading" class="space-y-4">
      <BasePlaceload class="h-24 w-full rounded-xl" />
      <BasePlaceload class="h-24 w-full rounded-xl" />
    </div>

    <div v-else-if="officialDocs.length === 0" class="py-12 text-center">
      <div class="size-16 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center mx-auto mb-4">
        <Icon name="solar:folder-with-files-bold-duotone" class="size-8 text-muted-400" />
      </div>
      <BaseHeading as="h3" size="md" weight="medium" class="text-muted-600 dark:text-muted-300">
        Nenhum documento oficial disponível
      </BaseHeading>
      <BaseParagraph size="sm" class="text-muted-400 max-w-xs mx-auto mt-1">
        Assim que sua declaração for finalizada, os documentos aparecerão aqui.
      </BaseParagraph>
    </div>

    <div v-else class="space-y-8">
      <!-- Official Documents Section -->
      <section>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BaseCard
            v-for="doc in officialDocs" :key="doc.id"
            class="group p-4 flex items-center gap-4 cursor-pointer hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md"
            @click="downloadAttachment(doc)"
          >
            <div class="size-10 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
              <Icon :name="getIcon(doc.mimeType)" class="size-6" />
            </div>

            <div class="flex-1 min-w-0">
              <h4
                class="font-medium text-sm text-muted-800 dark:text-muted-100 truncate group-hover:text-primary-600 transition-colors"
              >
                {{ doc.fileName }}
              </h4>
              <p class="text-xs text-muted-400 mt-0.5">
                {{ new Date(doc.createdAt).toLocaleDateString() }} • {{ formatSize(doc.fileSize) }}
              </p>
            </div>

            <BaseButton
              size="icon-sm" variant="muted" class="transition-opacity"
              :class="downloadingDocs.has(doc.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
            >
              <Icon
                v-if="downloadingDocs.has(doc.id)" name="svg-spinners:ring-resize"
                class="size-4 text-primary-500"
              />
              <Icon v-else name="lucide:download" class="size-4" />
            </BaseButton>
          </BaseCard>
        </div>
      </section>
    </div>
  </div>
</template>
