<script setup lang="ts">
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

definePageMeta({
  title: 'Checklist Padrão - Admin',
})

const checklistItems = ref<any[]>([])
const loading = ref(true)
const isModalOpen = ref(false)
const editingItem = ref<any>(null)
const form = ref({
  title: '',
  description: '',
  isRequired: true,
  order: 0,
})

async function fetchChecklist() {
  try {
    loading.value = true
    const { data } = await useCustomFetch<any>('/admin/checklist')
    checklistItems.value = data
  } catch (error) {
    console.error('Erro ao buscar checklist:', error)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingItem.value = null
  form.value = { title: '', description: '', isRequired: true, order: checklistItems.value.length }
  isModalOpen.value = true
}

function openEditModal(item: any) {
  editingItem.value = item
  form.value = { ...item }
  isModalOpen.value = true
}

async function saveItem() {
  try {
    const payload = editingItem.value ? { ...form.value, id: editingItem.value.id } : form.value
    await useCustomFetch('/admin/checklist', {
      method: 'POST',
      body: payload,
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Item do checklist salvo com sucesso.',
      icon: 'ph:check-circle-fill',
    })

    isModalOpen.value = false
    fetchChecklist()
  } catch (error) {
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível salvar o item.',
      icon: 'ph:warning-circle-fill',
    })
  }
}

onMounted(fetchChecklist)
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <BaseHeading as="h2" size="2xl">Checklist Padrão (Global)</BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500">Documentos solicitados por padrão para novos IRs
          </BaseParagraph>
        </div>
        <BaseButton variant="primary" rounded="md" @click="openCreateModal">
          <Icon name="lucide:plus" class="size-4 mr-1" />
          Novo Item
        </BaseButton>
      </div>

      <BaseCard class="p-4">
        <div v-if="loading" class="space-y-4">
          <div v-for="i in 5" :key="i" class="h-16 bg-muted-100 dark:bg-muted-800 animate-pulse rounded-lg"></div>
        </div>
        <div v-else-if="checklistItems.length === 0" class="py-12 text-center">
          <Icon name="solar:clipboard-list-bold-duotone" class="size-12 text-muted-300 mx-auto mb-4" />
          <BaseHeading size="md">Nenhum item configurado</BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500">Comece adicionando documentos obrigatórios ao checklist
            padrão.
          </BaseParagraph>
        </div>
        <div v-else class="space-y-3">
          <div v-for="item in checklistItems" :key="item.id"
            class="flex items-center justify-between p-4 border border-muted-200 dark:border-muted-800 rounded-xl hover:bg-muted-50 dark:hover:bg-muted-900 transition-colors">
            <div class="flex items-center gap-4">
              <div
                class="size-10 rounded-lg bg-muted-100 dark:bg-muted-800 flex items-center justify-center text-muted-500">
                {{ item.order + 1 }}
              </div>
              <div>
                <BaseHeading size="sm">{{ item.title }}</BaseHeading>
                <BaseParagraph size="xs" class="text-muted-500">{{ item.description || 'Sem descrição' }}
                </BaseParagraph>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <BaseTag v-if="item.isRequired" rounded="full" variant="primary">Obrigatório</BaseTag>
              <BaseButton size="sm" variant="muted" rounded="md" @click="openEditModal(item)">
                <Icon name="lucide:edit" class="size-3" />
              </BaseButton>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Simple Modal Simulation -->
      <div v-if="isModalOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-muted-900/50 backdrop-blur-sm">
        <BaseCard class="w-full max-w-md p-6 shadow-2xl">
          <BaseHeading size="lg" class="mb-6">{{ editingItem ? 'Editar Item' : 'Novo Item' }}</BaseHeading>

          <div class="space-y-4">
            <BaseField label="Título do Documento">
              <BaseInput v-model="form.title" placeholder="Ex: Comprovante de Residência" />
            </BaseField>

            <BaseField label="Descrição/Instruções">
              <BaseInput v-model="form.description" placeholder="Instruções para o cliente..." />
            </BaseField>

            <div class="flex items-center justify-between py-2">
              <BaseText size="sm">Documento Obrigatório?</BaseText>
              <BaseSwitch v-model="form.isRequired" />
            </div>

            <BaseField label="Ordem de Exibição">
              <BaseInput v-model="form.order" type="number" />
            </BaseField>
          </div>

          <div class="mt-8 flex justify-end gap-3">
            <BaseButton variant="muted" @click="isModalOpen = false">Cancelar</BaseButton>
            <BaseButton variant="primary" @click="saveItem">Salvar Item</BaseButton>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
