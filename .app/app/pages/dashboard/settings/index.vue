<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Whitelabel',
})

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

// State
const isLoading = ref(true)
const isSaving = ref(false)
const isUploadingLogo = ref(false)
const tenant = ref<any>(null)

// Form
const form = ref({
  name: '',
  tradeName: '',
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
})

// Preset colors for easy selection
const colorPresets = [
  { name: 'Indigo', primary: '#6366f1', secondary: '#8b5cf6' },
  { name: 'Emerald', primary: '#10b981', secondary: '#34d399' },
  { name: 'Blue', primary: '#3b82f6', secondary: '#60a5fa' },
  { name: 'Rose', primary: '#f43f5e', secondary: '#fb7185' },
  { name: 'Amber', primary: '#f59e0b', secondary: '#fbbf24' },
  { name: 'Violet', primary: '#8b5cf6', secondary: '#a78bfa' },
  { name: 'Teal', primary: '#14b8a6', secondary: '#2dd4bf' },
  { name: 'Orange', primary: '#f97316', secondary: '#fb923c' },
]

// Fetch tenant data
async function fetchTenant() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant')
    if (data.success) {
      tenant.value = data.data
      form.value = {
        name: data.data.name || '',
        tradeName: data.data.tradeName || '',
        primaryColor: data.data.primaryColor || '#6366f1',
        secondaryColor: data.data.secondaryColor || '#8b5cf6',
      }
    }
  } catch (error) {
    console.error('Erro ao buscar dados da empresa:', error)
  } finally {
    isLoading.value = false
  }
}

// Save whitelabel settings
async function saveSettings() {
  isSaving.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant', {
      method: 'PUT',
      body: {
        name: form.value.name,
        tradeName: form.value.tradeName,
        primaryColor: form.value.primaryColor,
        secondaryColor: form.value.secondaryColor,
      }
    })

    if (data.success) {
      tenant.value = { ...tenant.value, ...form.value }
      toaster.add({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso!',
        icon: 'ph:check-circle-fill'
      })
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao salvar configurações',
      icon: 'ph:warning-circle-fill'
    })
  } finally {
    isSaving.value = false
  }
}

// Handle logo upload
const logoInput = ref<HTMLInputElement | null>(null)

function triggerLogoUpload() {
  logoInput.value?.click()
}

async function handleLogoUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    toaster.add({
      title: 'Erro',
      description: 'Tipo de arquivo não suportado. Use JPEG, PNG, WebP ou SVG.',
      icon: 'ph:warning-circle-fill'
    })
    return
  }

  // Validate file size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    toaster.add({
      title: 'Erro',
      description: 'Arquivo muito grande. Tamanho máximo: 2MB',
      icon: 'ph:warning-circle-fill'
    })
    return
  }

  isUploadingLogo.value = true
  try {
    const formData = new FormData()
    formData.append('logo', file)

    const { data } = await useCustomFetch<any>('/tenant/logo', {
      method: 'POST',
      body: formData
    })

    if (data.success) {
      tenant.value.logo = data.data.logo
      toaster.add({
        title: 'Sucesso',
        description: 'Logo atualizado com sucesso!',
        icon: 'ph:check-circle-fill'
      })
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao enviar logo',
      icon: 'ph:warning-circle-fill'
    })
  } finally {
    isUploadingLogo.value = false
    // Reset input
    if (target) target.value = ''
  }
}

// Apply preset colors
function applyPreset(preset: typeof colorPresets[0]) {
  form.value.primaryColor = preset.primary
  form.value.secondaryColor = preset.secondary
}

onMounted(fetchTenant)
</script>

<template>
  <div class="space-y-8">
    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-6">
      <BasePlaceload class="h-48 w-full rounded-xl" />
      <BasePlaceload class="h-64 w-full rounded-xl" />
    </div>

    <template v-else>
      <!-- Logo Section -->
      <BaseCard rounded="lg" class="p-6">
        <div class="grid gap-8 md:grid-cols-12">
          <div class="md:col-span-4">
            <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-muted-100 mb-1">
              Logo da Empresa
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400">
              Este logo será exibido no sistema e nas páginas públicas de coleta de documentos.
            </BaseParagraph>
          </div>

          <div class="md:col-span-8">
            <div class="flex items-center gap-6">
              <!-- Logo Preview -->
              <div
                class="size-32 rounded-xl border-2 border-dashed border-muted-300 dark:border-muted-700 flex items-center justify-center overflow-hidden bg-muted-50 dark:bg-muted-900"
              >
                <img
                  v-if="tenant?.logo"
                  :src="tenant.logo"
                  alt="Logo"
                  class="size-full object-contain p-2"
                />
                <Icon v-else name="lucide:image" class="size-12 text-muted-300" />
              </div>

              <!-- Upload Actions -->
              <div class="flex flex-col gap-3">
                <input
                  ref="logoInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  class="hidden"
                  @change="handleLogoUpload"
                />
                <BaseButton
                  variant="primary"
                  size="sm"
                  :loading="isUploadingLogo"
                  @click="triggerLogoUpload"
                >
                  <Icon name="lucide:upload" class="size-4 mr-2" />
                  Enviar Logo
                </BaseButton>
                <BaseParagraph size="xs" class="text-muted-400">
                  JPEG, PNG, WebP ou SVG. Máx 2MB.
                </BaseParagraph>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Colors Section -->
      <BaseCard rounded="lg" class="p-6">
        <div class="grid gap-8 md:grid-cols-12">
          <div class="md:col-span-4">
            <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-muted-100 mb-1">
              Cores do Sistema
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400">
              Personalize as cores principais do sistema para combinar com a identidade visual do seu escritório.
            </BaseParagraph>
          </div>

          <div class="md:col-span-8 space-y-6">
            <!-- Color Presets -->
            <div>
              <BaseParagraph size="xs" class="text-muted-500 mb-3 uppercase tracking-wider font-medium">
                Paletas Prontas
              </BaseParagraph>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="preset in colorPresets"
                  :key="preset.name"
                  type="button"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg border border-muted-200 dark:border-muted-700 hover:border-primary-500/50 transition-colors"
                  :class="form.primaryColor === preset.primary ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-muted-900' : ''"
                  @click="applyPreset(preset)"
                >
                  <div class="flex gap-1">
                    <div class="size-4 rounded-full" :style="{ backgroundColor: preset.primary }"></div>
                    <div class="size-4 rounded-full" :style="{ backgroundColor: preset.secondary }"></div>
                  </div>
                  <span class="text-xs font-medium text-muted-600 dark:text-muted-400">{{ preset.name }}</span>
                </button>
              </div>
            </div>

            <!-- Custom Colors -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <BaseInputWrapper label="Cor Primária">
                  <div class="flex items-center gap-3">
                    <input
                      v-model="form.primaryColor"
                      type="color"
                      class="size-10 rounded-lg border border-muted-200 dark:border-muted-700 cursor-pointer"
                    />
                    <BaseInput v-model="form.primaryColor" class="font-mono text-sm" />
                  </div>
                </BaseInputWrapper>
              </div>

              <div>
                <BaseInputWrapper label="Cor Secundária">
                  <div class="flex items-center gap-3">
                    <input
                      v-model="form.secondaryColor"
                      type="color"
                      class="size-10 rounded-lg border border-muted-200 dark:border-muted-700 cursor-pointer"
                    />
                    <BaseInput v-model="form.secondaryColor" class="font-mono text-sm" />
                  </div>
                </BaseInputWrapper>
              </div>
            </div>

            <!-- Preview -->
            <div class="p-4 rounded-xl border border-muted-200 dark:border-muted-800">
              <BaseParagraph size="xs" class="text-muted-500 mb-3 uppercase tracking-wider font-medium">
                Pré-visualização
              </BaseParagraph>
              <div class="flex items-center gap-4">
                <div class="h-10 px-6 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                  :style="{ backgroundColor: form.primaryColor }">
                  Botão Primário
                </div>
                <div class="h-10 px-6 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                  :style="{ backgroundColor: form.secondaryColor }">
                  Botão Secundário
                </div>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Company Info Section -->
      <BaseCard rounded="lg" class="p-6">
        <div class="grid gap-8 md:grid-cols-12">
          <div class="md:col-span-4">
            <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-muted-100 mb-1">
              Informações da Marca
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400">
              O nome da empresa conforme será exibido para seus clientes.
            </BaseParagraph>
          </div>

          <div class="md:col-span-8 space-y-4">
            <BaseInputWrapper label="Nome da Empresa">
              <BaseInput v-model="form.name" placeholder="Contabilidade Silva & Associados" icon="lucide:building-2" />
            </BaseInputWrapper>

            <BaseInputWrapper label="Nome Fantasia">
              <BaseInput v-model="form.tradeName" placeholder="Contábil Silva" icon="lucide:store" />
              <template #help>
                Nome mais curto exibido em espaços reduzidos
              </template>
            </BaseInputWrapper>
          </div>
        </div>
      </BaseCard>

      <!-- Save Button -->
      <div class="flex justify-end">
        <BaseButton variant="primary" size="lg" :loading="isSaving" @click="saveSettings">
          <Icon name="lucide:save" class="size-4 mr-2" />
          Salvar Configurações
        </BaseButton>
      </div>
    </template>
  </div>
</template>
