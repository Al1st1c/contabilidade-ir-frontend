<script setup lang="ts">
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

definePageMeta({
  title: 'Gerenciar Novidades',
})

const isLoading = ref(true)
const isSubmitting = ref(false)
const updates = ref<any[]>([])
const isModalOpen = ref(false)
const editingItem = ref<any>(null)

const form = ref({
  title: '',
  content: '',
  type: 'improvement',
  isPublished: true,
  publishDate: new Date().toISOString().substring(0, 10),
})

async function fetchUpdates() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any[]>('/changelog/admin')
    if (data) updates.value = data
  } catch (error) {
    console.error('Erro ao buscar atualizações:', error)
  } finally {
    isLoading.value = false
  }
}

function openCreate() {
  editingItem.value = null
  form.value = {
    title: '',
    content: '',
    type: 'improvement',
    isPublished: true,
    publishDate: new Date().toISOString().substring(0, 10),
  }
  isModalOpen.value = true
}

function openEdit(item: any) {
  editingItem.value = item
  form.value = {
    title: item.title,
    content: item.content,
    type: item.type,
    isPublished: item.isPublished,
    publishDate: new Date(item.publishDate).toISOString().substring(0, 10),
  }
  isModalOpen.value = true
}

async function saveUpdate() {
  isSubmitting.value = true
  try {
    const method = editingItem.value ? 'PATCH' : 'POST'
    const url = editingItem.value ? `/changelog/${editingItem.value.id}` : '/changelog'

    await useCustomFetch(url, { method, body: form.value })

    toaster.clear()
    toaster.add({
      title: 'Sucesso',
      description: editingItem.value ? 'Atualização editada!' : 'Nova atualização publicada!',
      icon: 'ph:check-circle-fill',
    })
    isModalOpen.value = false
    fetchUpdates()
  } catch (error) {
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível salvar.',
      icon: 'ph:warning-circle-fill',
    })
  } finally {
    isSubmitting.value = false
  }
}

async function deleteUpdate(id: string) {
  if (!confirm('Tem certeza que deseja excluir esta atualização?')) return
  try {
    await useCustomFetch(`/changelog/${id}`, { method: 'DELETE' })
    toaster.add({ title: 'Excluído', description: 'Atualização removida.', icon: 'ph:check-circle-fill' })
    fetchUpdates()
  } catch (error) {
    toaster.add({ title: 'Erro', description: 'Erro ao excluir.', icon: 'ph:warning-circle-fill' })
  }
}

function getTypeName(type: string) {
  const map: Record<string, string> = { feature: 'Nova Função', fix: 'Correção', improvement: 'Melhoria' }
  return map[type] || 'Atualização'
}

function getTypeColor(type: string) {
  const map: Record<string, string> = { feature: 'warning', fix: 'danger', improvement: 'info' }
  return map[type] || 'default'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

onMounted(fetchUpdates)
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <BaseHeading as="h2" size="2xl">Central de Novidades</BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500">Gerencie as atualizações exibidas aos usuários</BaseParagraph>
        </div>
        <BaseButton color="primary" @click="openCreate">
          <Icon name="lucide:plus" class="size-4 mr-2" />
          Nova Atualização
        </BaseButton>
      </div>

      <!-- Table Card -->
      <BaseCard class="p-4">
        <!-- Loading -->
        <div v-if="isLoading" class="space-y-4">
          <div v-for="i in 4" :key="i" class="h-16 bg-muted-100 dark:bg-muted-800 animate-pulse rounded-lg" />
        </div>

        <!-- Empty -->
        <div v-else-if="updates.length === 0" class="py-12 text-center">
          <Icon name="solar:star-fall-bold-duotone" class="size-12 text-muted-300 mx-auto mb-4" />
          <BaseHeading size="md">Nenhuma atualização cadastrada</BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 mb-4">Comece publicando a primeira novidade para os usuários.
          </BaseParagraph>
          <BaseButton size="sm" color="primary" @click="openCreate">
            <Icon name="lucide:plus" class="size-4 mr-1" /> Criar Primeira
          </BaseButton>
        </div>

        <!-- List -->
        <div v-else class="space-y-3">
          <div v-for="item in updates" :key="item.id"
            class="flex items-center justify-between p-4 border border-muted-200 dark:border-muted-800 rounded-xl hover:bg-muted-50 dark:hover:bg-muted-900 transition-colors">
            <div class="flex items-center gap-4 min-w-0 flex-1">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-0.5">
                  <BaseHeading size="sm" weight="medium" class="truncate">
                    {{ item.title }}
                  </BaseHeading>
                  <BaseTag rounded="full" size="sm" :color="getTypeColor(item.type)">
                    {{ getTypeName(item.type) }}
                  </BaseTag>
                  <BaseTag v-if="!item.isPublished" rounded="full" size="sm" color="muted">
                    Rascunho
                  </BaseTag>
                </div>
                <BaseParagraph size="xs" class="text-muted-400 truncate">
                  {{ formatDate(item.publishDate) }} · {{ item.content.substring(0, 100) }}{{ item.content.length > 100
                    ? '...' : '' }}
                </BaseParagraph>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0 ml-4">
              <BaseButton size="sm" variant="muted" rounded="md" @click="openEdit(item)">
                <Icon name="lucide:edit" class="size-3" />
              </BaseButton>
              <BaseButton size="sm" variant="muted" rounded="md" @click="deleteUpdate(item.id)">
                <Icon name="lucide:trash-2" class="size-3 text-danger-500" />
              </BaseButton>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- Modal -->
    <div v-if="isModalOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-muted-900/50 backdrop-blur-sm">
      <BaseCard class="w-full max-w-lg p-6 shadow-2xl">
        <BaseHeading size="lg" class="mb-6">
          {{ editingItem ? 'Editar Atualização' : 'Nova Atualização' }}
        </BaseHeading>

        <div class="space-y-4">
          <BaseInput v-model="form.title" label="Título" placeholder="Ex: Novo dashboard de clientes" rounded="md" />

          <BaseSelect v-model="form.type" label="Tipo" rounded="md">
            <BaseSelectItem value="feature">Nova Funcionalidade</BaseSelectItem>
            <BaseSelectItem value="improvement">Melhoria</BaseSelectItem>
            <BaseSelectItem value="fix">Correção de Bug</BaseSelectItem>
          </BaseSelect>

          <BaseInput v-model="form.publishDate" type="date" label="Data de Publicação" rounded="md" />

          <div class="flex items-center justify-between py-2">
            <BaseText size="sm">Publicar imediatamente?</BaseText>
            <BaseSwitch v-model="form.isPublished" />
          </div>

          <BaseTextarea v-model="form.content" label="Conteúdo" rows="6" placeholder="Descreva o que mudou..."
            rounded="md" />
        </div>

        <div class="mt-8 flex justify-end gap-3">
          <BaseButton variant="muted" @click="isModalOpen = false">Cancelar</BaseButton>
          <BaseButton color="primary" :loading="isSubmitting" @click="saveUpdate">
            {{ editingItem ? 'Salvar' : 'Publicar' }}
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
