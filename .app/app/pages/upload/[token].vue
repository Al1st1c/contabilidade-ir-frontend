<script setup lang="ts">
const route = useRoute()
const token = route.params.token as string

definePageMeta({
  layout: false,
})

const config = useRuntimeConfig()
const apiBaseUrl = config.public.apiBase ? (config.public.apiBase as string).replace(/\/$/, '') : ''

// States
const isLoading = ref(true)
const error = ref<string | null>(null)
// Data types would ideally be imported, but using any for flexibility here as per existing pattern
const data = ref<any>(null)
const isUploading = ref<string | null>(null)

// Computed Properties
const checklistProgress = computed(() => {
  if (!data.value?.checklist)
    return 0
  const total = data.value.checklist.length
  if (total === 0)
    return 0
  const completed = data.value.checklist.filter((i: any) => i.status !== 'pending' && i.status !== 'rejected').length
  return Math.round((completed / total) * 100)
})

const logo = computed(() => data.value?.branding?.logo || '/img/logo.png')
const tenantName = computed(() => data.value?.tenant?.name || 'Escritório Contábil')
const primaryColor = computed(() => data.value?.branding?.primaryColor || '#6366f1')

// Methods
async function fetchData() {
  isLoading.value = true
  error.value = null
  try {
    const response = await fetch(`${apiBaseUrl}/public/${token}`)
    const result = await response.json()

    if (result.success) {
      data.value = result.data
    }
    else {
      error.value = result.message || 'Link inválido ou expirado'
    }
  }
  catch (err: any) {
    error.value = 'Erro ao carregar dados. Verifique sua conexão.'
    console.error(err)
  }
  finally {
    isLoading.value = false
  }
}

async function handleFileUpload(event: Event, checklistItemId?: string) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0)
    return

  const file = target.files[0]
  if (!file)
    return

  const itemId = checklistItemId || 'extra'
  isUploading.value = itemId

  const formData = new FormData()
  formData.append('file', file)
  if (checklistItemId) {
    formData.append('checklistItemId', checklistItemId)
  }

  try {
    const response = await fetch(`${apiBaseUrl}/public/${token}/upload`, {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()
    if (result.id || result.success) {
      // Refresh to update UI
      await fetchData()
    }
    else {
      alert(result.message || 'Erro ao enviar arquivo')
    }
  }
  catch (err) {
    alert('Erro ao enviar arquivo. Tente novamente.')
    console.error(err)
  }
  finally {
    isUploading.value = null
    target.value = ''
  }
}

function triggerUpload(id: string) {
  const input = document.getElementById(`input-${id}`) as HTMLInputElement
  input?.click()
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 py-6 min-h-screen bg-muted-100 dark:bg-muted-900 font-sans">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[60vh]">
      <BaseLoader class="mb-4 size-12 text-primary-500" />
      <BaseParagraph class="text-muted-500 font-medium">
        Carregando seus documentos...
      </BaseParagraph>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-col items-center justify-center min-h-[60vh]">
      <div class="size-20 rounded-full bg-danger-500/10 flex items-center justify-center text-danger-500 mb-6">
        <Icon name="solar:danger-circle-bold" class="size-10" />
      </div>
      <BaseHeading as="h2" size="xl" weight="bold" class="mb-2 text-muted-800 dark:text-white">
        Link Indisponível
      </BaseHeading>
      <p class="text-muted-500 text-center max-w-sm mb-6">
        {{ error }}
      </p>
      <BaseButton variant="primary" @click="fetchData">
        Tentar Novamente
      </BaseButton>
    </div>

    <!-- Dashboard Layout (Mini App) -->
    <div v-else-if="data" class="grid grid-cols-12 gap-6 animate-fade-in">
      <!-- Header Section -->
      <div class="col-span-12">
        <BaseCard class="p-6 md:p-8 relative overflow-hidden">
          <!-- Decorative Background -->
          <div class="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none">
            <Icon name="solar:document-text-bold-duotone" class="size-64 text-primary-500" />
          </div>

          <div
            class="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left"
          >
            <BaseAvatar
              :src="logo" size="xl"
              class="bg-white dark:bg-muted-800 p-2 shadow-sm border border-muted-200 dark:border-muted-700"
            />

            <div class="flex-1">
              <BaseHeading as="h1" size="2xl" weight="bold" class="text-muted-900 dark:text-white mb-2">
                {{ tenantName }}
              </BaseHeading>
              <BaseParagraph class="text-muted-600 dark:text-muted-400 max-w-2xl">
                Olá, <span class="font-bold text-primary-500">{{ data.client.firstName }}</span>!
                Bem-vindo ao seu painel de IRPF {{ data.declaration.taxYear }}.
                Acompanhe abaixo o status da sua declaração e envie os documentos pendentes.
              </BaseParagraph>

              <div class="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <BaseTag rounded="full" color="muted" size="md">
                  <Icon name="solar:calendar-linear" class="size-4 mr-1" />
                  Ano Base: {{ data.declaration.taxYear }}
                </BaseTag>
                <BaseTag rounded="full" :color="checklistProgress === 100 ? 'success' : 'primary'" size="md">
                  <Icon name="solar:chart-pie-linear" class="size-4 mr-1" />
                  {{ checklistProgress }}% Concluído
                </BaseTag>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Main Content (Left Column) -->
      <div class="col-span-12 lg:col-span-8 space-y-6">
        <!-- Checklist Card -->
        <BaseCard class="p-6">
          <div class="mb-6 flex items-center justify-between">
            <BaseHeading as="h3" size="md" weight="semibold" class="text-muted-900 dark:text-white">
              Documentação Solicitada
            </BaseHeading>
            <BaseTag color="muted" size="sm">
              {{ data.checklist.length }} Itens
            </BaseTag>
          </div>

          <div class="space-y-3">
            <div
              v-for="item in data.checklist" :key="item.id"
              class="group relative flex flex-col sm:flex-row gap-4 p-4 rounded-xl border transition-all duration-300"
              :class="[
                item.status === 'rejected' ? 'bg-danger-50 dark:bg-danger-900/10 border-danger-200 dark:border-danger-800'
                : item.status === 'approved' ? 'bg-success-50 dark:bg-success-900/10 border-success-200 dark:border-success-800'
                  : item.status === 'uploaded' ? 'bg-warning-50 dark:bg-warning-900/10 border-warning-200 dark:border-warning-800'
                    : 'bg-white dark:bg-muted-950 border-muted-200 dark:border-muted-800 hover:shadow-md',
              ]"
            >
              <!-- Icon Status -->
              <div class="shrink-0 flex items-start pt-1">
                <div
                  class="size-10 rounded-full flex items-center justify-center" :class="[
                    item.status === 'approved' ? 'bg-success-500 text-white'
                    : item.status === 'rejected' ? 'bg-danger-500 text-white'
                      : item.status === 'uploaded' ? 'bg-warning-500 text-white'
                        : 'bg-muted-200 dark:bg-muted-800 text-muted-500',
                  ]"
                >
                  <Icon v-if="item.status === 'approved'" name="solar:check-circle-bold" class="size-6" />
                  <Icon v-else-if="item.status === 'rejected'" name="solar:close-circle-bold" class="size-6" />
                  <Icon v-else-if="item.status === 'uploaded'" name="solar:clock-circle-bold" class="size-6" />
                  <Icon v-else name="solar:document-text-bold" class="size-5" />
                </div>
              </div>

              <!-- Details -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h4 class="font-bold text-muted-800 dark:text-white">
                      {{ item.title }}
                    </h4>
                    <p class="text-sm text-muted-500 mt-0.5">
                      {{ item.description || 'Envie o documento solicitado.' }}
                    </p>
                  </div>
                  <BaseTag v-if="item.isRequired" color="danger" variant="muted" size="sm" class="shrink-0">
                    Obrigatório
                  </BaseTag>
                </div>

                <!-- Feedback Message -->
                <div
                  v-if="item.status === 'rejected'"
                  class="mt-3 text-sm text-danger-600 dark:text-danger-400 bg-danger-100/50 dark:bg-danger-900/20 p-3 rounded-lg flex items-start gap-2"
                >
                  <Icon name="solar:danger-triangle-bold" class="size-5 shrink-0" />
                  <div>
                    <strong>Precisa de Correção:</strong>
                    <p>{{ item.comment }}</p>
                  </div>
                </div>

                <!-- Actions -->
                <div class="mt-4 flex flex-wrap items-center gap-3">
                  <input
                    :id="`input-${item.id}`" type="file" class="hidden"
                    @change="e => handleFileUpload(e, item.id)"
                  >

                  <template v-if="item.status === 'pending' || item.status === 'rejected'">
                    <BaseButton
                      variant="primary" size="sm" :loading="isUploading === item.id"
                      @click="triggerUpload(item.id)"
                    >
                      <Icon name="solar:upload-minimalistic-linear" class="size-4 mr-2" />
                      Enviar Arquivo
                    </BaseButton>
                  </template>

                  <template v-else>
                    <div
                      class="flex items-center gap-2 text-sm font-medium"
                      :class="item.status === 'approved' ? 'text-success-600' : 'text-warning-600'"
                    >
                      <span v-if="item.status === 'uploaded'">Enviado! Aguardando análise.</span>
                      <span v-else-if="item.status === 'approved'">Aprovado pela contabilidade.</span>
                    </div>
                    <button
                      v-if="item.status !== 'approved'" class="text-xs text-muted-400 hover:text-primary-500 underline ml-auto sm:ml-2"
                      @click="triggerUpload(item.id)"
                    >
                      Substituir
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- Extras Section -->
        <BaseCard class="p-6">
          <div class="mb-4 flex items-center justify-between">
            <BaseHeading as="h3" size="md" weight="semibold" class="text-muted-900 dark:text-white">
              Arquivos Extras
            </BaseHeading>
            <BaseButton size="sm" variant="muted" @click="triggerUpload('extra')">
              <Icon name="solar:add-circle-linear" class="size-4 mr-1" />
              Adicionar
            </BaseButton>
            <input id="input-extra" type="file" multiple class="hidden" @change="handleFileUpload">
          </div>

          <div
            v-if="data.attachments.filter((a: any) => !a.checklistItemId).length === 0"
            class="h-32 border-2 border-dashed border-muted-200 dark:border-muted-700 rounded-xl flex flex-col items-center justify-center text-muted-400"
          >
            <Icon name="solar:folder-with-files-linear" class="size-10 mb-2 opacity-50" />
            <p class="text-sm">
              Nenhum arquivo extra enviado
            </p>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="att in data.attachments.filter((a: any) => !a.checklistItemId)" :key="att.id"
              class="p-4 rounded-lg border border-muted-200 dark:border-muted-700 bg-muted-50 dark:bg-muted-900 flex items-center gap-3"
            >
              <div
                class="size-10 rounded-lg bg-white dark:bg-muted-800 flex items-center justify-center shrink-0 shadow-sm text-primary-500"
              >
                <Icon name="solar:file-text-bold-duotone" class="size-6" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-muted-800 dark:text-white truncate" :title="att.fileName">
                  {{
                    att.fileName }}
                </p>
                <p class="text-xs text-muted-500">
                  {{ (att.fileSize / 1024 / 1024).toFixed(2) }} MB
                </p>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Sidebar (Right Column) -->
      <div class="col-span-12 lg:col-span-4 space-y-6">
        <!-- Accountant Message -->
        <BaseCard class="p-6 bg-gradient-to-br from-primary-500/5 to-transparent">
          <div class="flex items-center gap-2 mb-4">
            <div
              class="size-8 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-500 flex items-center justify-center"
            >
              <Icon name="solar:chat-round-line-linear" class="size-5" />
            </div>
            <BaseHeading as="h3" size="sm" weight="semibold">
              Mensagem
            </BaseHeading>
          </div>
          <p class="text-sm text-muted-600 dark:text-muted-300 italic leading-relaxed">
            "{{ data.link.message || 'Por favor, envie os documentos listados para darmos andamento no seu processo.'
            }}"
          </p>
        </BaseCard>

        <!-- Progress Stats -->
        <BaseCard class="p-6">
          <BaseHeading as="h3" size="sm" weight="semibold" class="mb-6">
            Resumo
          </BaseHeading>

          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-500">Enviados</span>
              <span class="font-bold text-muted-800 dark:text-white">
                {{ data.checklist.filter((i: any) => i.status !== 'pending' && i.status !== 'rejected').length }} / {{
                  data.checklist.length }}
              </span>
            </div>
            <BaseProgress :model-value="checklistProgress" color="primary" size="sm" />

            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900 text-center">
                <span class="block text-2xl font-bold text-muted-800 dark:text-white">
                  {{ data.checklist.filter((i: any) => i.status === 'pending').length }}
                </span>
                <span class="text-xs text-muted-400 uppercase font-bold">Pendentes</span>
              </div>
              <div class="p-3 rounded-lg bg-muted-50 dark:bg-muted-900 text-center">
                <span class="block text-2xl font-bold text-muted-800 dark:text-white">
                  {{ data.checklist.filter((i: any) => i.status === 'rejected').length }}
                </span>
                <span class="text-xs text-muted-400 uppercase font-bold">Rejeitados</span>
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- Support -->
        <BaseCard class="p-6">
          <div class="text-center">
            <p class="text-sm text-muted-500 mb-4">
              Dúvidas sobre os documentos?
            </p>
            <a
              v-if="data.branding.contactPhone"
              :href="`https://wa.me/${data.branding.contactPhone.replace(/\D/g, '')}`" target="_blank"
              class="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-success-500 text-white font-bold hover:bg-success-600 transition-colors shadow-lg shadow-success-500/20"
            >
              <Icon name="logos:whatsapp-icon" class="size-5" />
              <span>Falar no WhatsApp</span>
            </a>
          </div>
        </BaseCard>

        <div class="text-center py-4">
          <div class="flex items-center justify-center gap-2 opacity-50 mb-2">
            <Icon name="solar:shield-check-linear" class="size-4" />
            <span class="text-xs font-semibold">Ambiente Seguro</span>
          </div>
          <p class="text-[10px] text-muted-400">
            &copy; {{ new Date().getFullYear() }} {{ data.branding.companyName }}.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
```
