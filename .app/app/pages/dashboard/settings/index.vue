<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { useApi } from '~/composables/useAuth'
import { useTenant } from '~/composables/useTenant'

definePageMeta({
  title: 'Identidade Visual',
})

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()
const { applyColors } = useWhitelabel()

const { tenant, fetchTenant: fetchGlobalTenant } = useTenant()
const isLoading = ref(true)
const isSaving = ref(false)
const isUploadingLogo = ref(false)

// Form
const form = ref({
  name: '',
  tradeName: '',
  primaryColor: 'amber',
  secondaryColor: 'zinc',
})

import { safeColors } from '~/utils/colors'

// Tailwind color options (now using centralized safe list)
const primaryColors = safeColors

const mutedColors = [
  { name: 'slate', label: 'Slate', class: 'bg-slate-300 dark:bg-slate-700' },
  { name: 'gray', label: 'Gray', class: 'bg-gray-300 dark:bg-gray-700' },
  { name: 'zinc', label: 'Zinc', class: 'bg-zinc-300 dark:bg-zinc-700' },
  { name: 'neutral', label: 'Neutral', class: 'bg-neutral-300 dark:bg-neutral-700' },
  { name: 'stone', label: 'Stone', class: 'bg-stone-300 dark:bg-stone-700' },
]

// Fetch tenant
async function fetchTenant() {
  isLoading.value = true
  try {
    const source = await fetchGlobalTenant()
    if (source) {
      form.value = {
        name: source.name || '',
        tradeName: source.tradeName || '',
        primaryColor: source.primaryColor || 'amber',
        secondaryColor: source.secondaryColor || 'zinc',
      }
    }
  } catch (error) {
    console.error('Erro ao buscar dados:', error)
  } finally {
    isLoading.value = false
  }
}

// Logo upload logic
const logoInput = ref<HTMLInputElement | null>(null)
function triggerLogoUpload() { logoInput.value?.click() }

async function handleLogoUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  isUploadingLogo.value = true
  try {
    const formData = new FormData()
    formData.append('logo', file)
    const { data } = await useCustomFetch<any>('/tenant/logo', {
      method: 'POST',
      body: formData
    })
    if (data.success || data) {
      const source = data.data || data
      if (tenant.value) {
        tenant.value.logo = source.logo
      }
      toaster.add({ title: 'Sucesso', description: 'Logo atualizado!', icon: 'solar:check-circle-linear' })
    }
  } catch (error: any) {
    toaster.add({ title: 'Erro', description: 'Erro ao enviar logo', icon: 'solar:danger-circle-linear' })
  } finally {
    isUploadingLogo.value = false
    if (target) target.value = ''
  }
}

// Save settings
async function saveSettings() {
  isSaving.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant', {
      method: 'PUT',
      body: form.value
    })
    if (data.success || data) {
      // Update global tenant state with new settings
      if (tenant.value) {
        tenant.value = {
          ...tenant.value,
          ...form.value
        }
      }
      applyColors(form.value.primaryColor, form.value.secondaryColor)
      toaster.add({ title: 'Sucesso', description: 'Visual atualizado!', icon: 'solar:check-circle-linear' })
    }
  } catch (error: any) {
    toaster.add({ title: 'Erro', description: 'Erro ao salvar', icon: 'solar:danger-circle-linear' })
  } finally {
    isSaving.value = false
  }
}

// Real-time preview
watchDebounced(() => form.value.primaryColor, (c: string) => applyColors(c, form.value.secondaryColor), { debounce: 100 })
watchDebounced(() => form.value.secondaryColor, (c: string) => applyColors(form.value.primaryColor, c), { debounce: 100 })

onMounted(fetchTenant)
</script>

<template>
  <div class="pb-24">
    <AppPageLoading v-if="isLoading" message="Carregando configurações..." />

    <div v-else class="space-y-20">
      <!-- Section: Brand Logo -->
      <div class="grid grid-cols-12 gap-8 lg:gap-12">
        <div class="col-span-12 lg:col-span-4">
          <div class="sticky top-24">
            <BaseHeading as="h3" size="lg" weight="medium" class="text-muted-800 dark:text-white mb-2">
              Logo & Marca
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
              Sua marca principal que aparecerá no topo do sistema e em todos os documentos gerados para seus clientes.
            </BaseParagraph>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-8">
          <BaseCard rounded="lg" class="p-8">
            <div class="flex flex-col sm:flex-row items-center gap-10">
              <div class="relative group">
                <div
                  class="size-40 rounded-2xl border-2 border-dashed border-muted-200 dark:border-muted-800 bg-muted-50/50 dark:bg-muted-950 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-primary-500">
                  <img v-if="tenant?.logo" :src="tenant.logo" alt="Logo" class="size-full object-contain p-4" />
                  <Icon v-else name="solar:gallery-linear" class="size-16 text-muted-300" />

                  <div
                    class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <BaseButton color="white" rounded="full" size="sm" @click="triggerLogoUpload">Alterar</BaseButton>
                  </div>
                </div>
              </div>

              <div class="flex-1 space-y-6">
                <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="handleLogoUpload" />
                <BaseField label="Nome por Extenso">
                  <TairoInput v-model="form.name" placeholder="Ex: Contabilidade Silva"
                    icon="solar:buildings-bold-duotone" />
                </BaseField>
                <BaseField label="Nome Curto (Menu)">
                  <TairoInput v-model="form.tradeName" placeholder="Ex: Contábil Silva"
                    icon="solar:shop-bold-duotone" />
                </BaseField>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- Section: Identity Colors -->
      <div class="grid grid-cols-12 gap-8 lg:gap-12 border-t border-muted-200 dark:border-muted-800 pt-16">
        <div class="col-span-12 lg:col-span-4">
          <div class="sticky top-24">
            <BaseHeading as="h3" size="lg" weight="medium" class="text-muted-800 dark:text-white mb-2">
              Cores do Sistema
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
              Personalize a paleta de cores para combinar com seu manual de marca. A cor primária afeta botões e
              destaques.
            </BaseParagraph>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-8">
          <BaseCard rounded="lg" class="p-8">
            <div class="space-y-10">
              <div>
                <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-400 uppercase tracking-widest mb-4">
                  Cor Primária (Marca)</BaseHeading>
                <div class="grid grid-cols-6 sm:grid-cols-11 gap-3">
                  <button v-for="c in primaryColors" :key="c.name" type="button"
                    class="size-10 rounded-xl transition-all duration-200" :class="[
                      c.class,
                      form.primaryColor === c.name ? 'ring-4 ring-primary-500 ring-offset-2 dark:ring-offset-muted-950 scale-110 shadow-lg' : 'hover:scale-110 opacity-80 hover:opacity-100'
                    ]" @click="form.primaryColor = c.name" />
                </div>
              </div>

              <div>
                <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-400 uppercase tracking-widest mb-4">
                  Tom de Fundo (Muted)</BaseHeading>
                <div class="flex flex-wrap gap-4">
                  <button v-for="c in mutedColors" :key="c.name" type="button"
                    class="size-14 rounded-xl border-2 transition-all duration-200" :class="[
                      c.class,
                      form.secondaryColor === c.name ? 'border-primary-500 ring-4 ring-primary-500/20 scale-110' : 'border-transparent hover:scale-105 opacity-60 hover:opacity-100'
                    ]" @click="form.secondaryColor = c.name" />
                </div>
              </div>

              <div
                class="p-6 rounded-2xl bg-muted-50/50 dark:bg-muted-900/50 border border-muted-200 dark:border-muted-800 shadow-inner">
                <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-400 mb-6 uppercase tracking-widest">
                  Preview em Tempo Real</BaseHeading>
                <div class="flex flex-wrap items-center gap-6">
                  <BaseButton variant="primary" class="shadow-lg shadow-primary-500/20">Botão Principal</BaseButton>
                  <BaseButton variant="muted">Botão Neutro</BaseButton>
                  <BaseTag variant="none" rounded="lg" class="px-4 py-2 font-bold bg-primary-500/20 text-primary-500">
                    Status Badge</BaseTag>
                  <div class="flex gap-2">
                    <div class="size-10 rounded-full bg-primary-500 shadow-lg"></div>
                    <div class="size-10 rounded-full bg-primary-200 dark:bg-primary-900/40"></div>
                  </div>
                </div>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="flex items-center justify-end gap-3 pt-8 mt-12 border-t border-muted-200 dark:border-muted-800">
        <BaseButton variant="primary" rounded="lg" size="lg" :loading="isSaving" class="px-12" @click="saveSettings">
          Publicar Alterações
        </BaseButton>
      </div>
    </div>
  </div>
</template>
