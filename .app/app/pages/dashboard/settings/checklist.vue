<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Checklist de Documentos',
})

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

const isLoading = ref(true)
const isSaving = ref(false)
const isResetting = ref(false)
const templateItems = ref<any[]>([])
const newItemTitle = ref('')

async function fetchTemplate() {
  isLoading.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/declarations/templates')
    if (response?.success) {
      templateItems.value = response.data
    }
  } catch (error) {
    console.error('Erro ao buscar template:', error)
  } finally {
    isLoading.value = false
  }
}

async function addItem() {
  if (!newItemTitle.value.trim()) return

  const newItem = {
    title: newItemTitle.value,
    description: '',
    isRequired: true,
    order: templateItems.value.length
  }

  templateItems.value.push(newItem)
  newItemTitle.value = ''
}

function removeItem(index: number) {
  templateItems.value.splice(index, 1)
}

async function saveTemplate() {
  isSaving.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/declarations/templates/sync', {
      method: 'POST',
      body: { items: templateItems.value }
    })

    if (response?.success) {
      templateItems.value = response.data
      toaster.add({
        title: 'Sucesso',
        description: 'Template de checklist atualizado com sucesso!',
        icon: 'solar:check-circle-linear'
      })
    }
  } catch (error) {
    toaster.add({
      title: 'Erro',
      description: 'Falha ao salvar template',
      icon: 'solar:danger-circle-linear'
    })
  } finally {
    isSaving.value = false
  }
}

async function resetToDefault() {
  if (!confirm('Deseja realmente resetar para o padrão do sistema? Suas personalizações serão perdidas.')) return

  isResetting.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/declarations/templates/reset', {
      method: 'POST'
    })

    if (response?.success) {
      templateItems.value = response.data
      toaster.add({
        title: 'Resetado',
        description: 'Template resetado para o padrão do sistema.',
        icon: 'solar:refresh-linear'
      })
    }
  } catch (error) {
    console.error('Erro ao resetar:', error)
  } finally {
    isResetting.value = false
  }
}

onMounted(fetchTemplate)
</script>

<template>
  <div class="pb-24">
    <AppPageLoading v-if="isLoading" message="Carregando checklist padrão..." />

    <div v-else class="space-y-10">
      <div class="grid grid-cols-12 gap-8 lg:gap-12">
        <div class="col-span-12 lg:col-span-4">
          <div class="sticky top-24">
            <BaseHeading as="h3" size="lg" weight="medium" class="text-muted-800 dark:text-white mb-2">
              Checklist Padrão
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
              Defina os documentos que serão solicitados automaticamente a cada novo cliente de IR.
              Estas regras serão aplicadas em todos os novos cards criados.
            </BaseParagraph>

            <div class="mt-8 flex flex-col gap-3">
              <BaseButton variant="muted" class="w-full" @click="resetToDefault" :loading="isResetting">
                <Icon name="solar:refresh-linear" class="size-4 mr-2" />
                Resetar para o Padrão
              </BaseButton>
            </div>
          </div>
        </div>

        <div class="col-span-12 lg:col-span-8">
          <BaseCard rounded="lg" class="p-8">
            <div class="space-y-6">
              <!-- Add Item -->
              <div
                class="flex gap-4 p-4 rounded-xl bg-muted-50 dark:bg-muted-900/40 border border-muted-200 dark:border-muted-800">
                <div class="flex-1">
                  <BaseField label="Novo Documento">
                    <TairoInput v-model="newItemTitle" placeholder="Ex: Extrato Bancário, Escritura..."
                      @keyup.enter="addItem" />
                  </BaseField>
                </div>
                <div class="flex items-end mb-1">
                  <BaseButton variant="primary" @click="addItem">
                    <Icon name="lucide:plus" class="size-4 mr-2" />
                    Adicionar
                  </BaseButton>
                </div>
              </div>

              <!-- List -->
              <div class="space-y-3 mt-8">
                <div v-if="templateItems.length === 0"
                  class="text-center py-10 border-2 border-dashed border-muted-200 dark:border-muted-800 rounded-2xl">
                  <Icon name="solar:document-add-linear" class="size-12 text-muted-300 mb-2 mx-auto" />
                  <p class="text-muted-500">Nenhum documento no template padrão.</p>
                </div>

                <div v-for="(item, idx) in templateItems" :key="idx"
                  class="flex items-center gap-4 p-4 rounded-xl border border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-950 hover:border-primary-500/50 transition-all group">
                  <div
                    class="size-10 rounded-lg bg-muted-100 dark:bg-muted-900 flex items-center justify-center text-muted-400 group-hover:bg-primary-500/10 group-hover:text-primary-500 transition-colors">
                    <span class="text-xs font-bold">{{ idx + 1 }}</span>
                  </div>

                  <div class="flex-1 min-w-0">
                    <BaseHeading weight="medium" size="sm" class="text-muted-800 dark:text-muted-100">
                      {{ item.title }}
                    </BaseHeading>
                    <p class="text-xs text-muted-400 truncate" v-if="item.description">{{ item.description }}</p>
                  </div>

                  <div class="flex items-center gap-4">
                    <BaseCheckbox v-model="item.isRequired" label="Obrigatório" color="primary" rounded="md" />

                    <button @click="removeItem(idx)" class="p-2 text-muted-400 hover:text-danger-500 transition-colors">
                      <Icon name="solar:trash-bin-trash-linear" class="size-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </BaseCard>

          <div class="flex justify-end mt-8">
            <BaseButton variant="primary" size="lg" class="px-10" :loading="isSaving" @click="saveTemplate">
              Salvar Alterações
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
