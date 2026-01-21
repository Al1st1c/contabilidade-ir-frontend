<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Whitelabel',
})

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()
const { applyColors } = useWhitelabel()

// State
const isLoading = ref(true)
const isSaving = ref(false)
const isUploadingLogo = ref(false)
const tenant = ref<any>(null)

// Form - using Tailwind color names
const form = ref({
  name: '',
  tradeName: '',
  primaryColor: 'amber',
  secondaryColor: 'zinc',
})

// Tailwind color options for primary colors
const primaryColors = [
  { name: 'slate', label: 'Slate', class: 'bg-slate-500' },
  { name: 'gray', label: 'Gray', class: 'bg-gray-500' },
  { name: 'zinc', label: 'Zinc', class: 'bg-zinc-500' },
  { name: 'neutral', label: 'Neutral', class: 'bg-neutral-500' },
  { name: 'stone', label: 'Stone', class: 'bg-stone-500' },
  { name: 'red', label: 'Red', class: 'bg-red-500' },
  { name: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { name: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { name: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { name: 'lime', label: 'Lime', class: 'bg-lime-500' },
  { name: 'green', label: 'Green', class: 'bg-green-500' },
  { name: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { name: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { name: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { name: 'sky', label: 'Sky', class: 'bg-sky-500' },
  { name: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { name: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { name: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { name: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { name: 'fuchsia', label: 'Fuchsia', class: 'bg-fuchsia-500' },
  { name: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { name: 'rose', label: 'Rose', class: 'bg-rose-500' },
]

// Muted/secondary color options
const mutedColors = [
  { name: 'slate', label: 'Slate', class: 'bg-slate-300 dark:bg-slate-700' },
  { name: 'gray', label: 'Gray', class: 'bg-gray-300 dark:bg-gray-700' },
  { name: 'zinc', label: 'Zinc', class: 'bg-zinc-300 dark:bg-zinc-700' },
  { name: 'neutral', label: 'Neutral', class: 'bg-neutral-300 dark:bg-neutral-700' },
  { name: 'stone', label: 'Stone', class: 'bg-stone-300 dark:bg-stone-700' },
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
        primaryColor: data.data.primaryColor || 'amber',
        secondaryColor: data.data.secondaryColor || 'zinc',
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

      // Apply colors immediately
      applyColors(form.value.primaryColor, form.value.secondaryColor)

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
                class="size-32 rounded-xl border-2 border-dashed border-muted-300 dark:border-muted-700 flex items-center justify-center overflow-hidden bg-muted-50 dark:bg-muted-900">
                <img v-if="tenant?.logo" :src="tenant.logo" alt="Logo" class="size-full object-contain p-2" />
                <Icon v-else name="lucide:image" class="size-12 text-muted-300" />
              </div>

              <!-- Upload Actions -->
              <div class="flex flex-col gap-3">
                <input ref="logoInput" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" class="hidden"
                  @change="handleLogoUpload" />
                <BaseButton variant="primary" size="sm" :loading="isUploadingLogo" @click="triggerLogoUpload">
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
              Escolha as cores do Tailwind CSS para personalizar seu sistema.
            </BaseParagraph>
          </div>

          <div class="md:col-span-8 space-y-6">
            <!-- Primary Color Selection -->
            <div>
              <BaseInputWrapper label="Cor Primária">
                <div class="grid grid-cols-6 gap-2">
                  <button v-for="color in primaryColors" :key="color.name" type="button"
                    class="size-12 rounded-lg transition-all duration-200" :class="[
                      color.class,
                      form.primaryColor === color.name
                        ? 'ring-4 ring-primary-500 ring-offset-2 dark:ring-offset-muted-900 scale-110'
                        : 'hover:scale-105'
                    ]" :title="color.label" @click="form.primaryColor = color.name" />
                </div>
                <template #help>
                  Selecionado: <span class="font-semibold capitalize">{{ form.primaryColor }}</span>
                </template>
              </BaseInputWrapper>
            </div>

            <!-- Muted Color Selection -->
            <div>
              <BaseInputWrapper label="Cor Secundária (Tons Neutros)">
                <div class="flex gap-3">
                  <button v-for="color in mutedColors" :key="color.name" type="button"
                    class="size-12 rounded-lg transition-all duration-200" :class="[
                      color.class,
                      form.secondaryColor === color.name
                        ? 'ring-4 ring-primary-500 ring-offset-2 dark:ring-offset-muted-900 scale-110'
                        : 'hover:scale-105'
                    ]" :title="color.label" @click="form.secondaryColor = color.name" />
                </div>
                <template #help>
                  Selecionado: <span class="font-semibold capitalize">{{ form.secondaryColor }}</span>
                </template>
              </BaseInputWrapper>
            </div>

            <!-- Preview -->
            <div class="p-4 rounded-xl border border-muted-200 dark:border-muted-800">
              <BaseParagraph size="xs" class="text-muted-500 mb-3 uppercase tracking-wider font-medium">
                Pré-visualização
              </BaseParagraph>
              <div class="flex items-center gap-4">
                <BaseButton variant="primary">
                  Botão Primário
                </BaseButton>
                <BaseButton variant="muted">
                  Botão Neutro
                </BaseButton>
                <BaseBadge variant="primary" rounded="lg">
                  Badge
                </BaseBadge>
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
