<script setup lang="ts">
const { useCustomFetch } = useApi()

definePageMeta({
  title: 'Novidades',
})

const isLoading = ref(true)
const updates = ref<any[]>([])

async function fetchUpdates() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any[]>('/changelog')
    if (data) updates.value = data
    localStorage.setItem('last_changelog_seen', new Date().toISOString())
  } catch (error) {
    console.error('Erro ao buscar atualizações:', error)
  } finally {
    isLoading.value = false
  }
}

function getTypeIcon(type: string) {
  const map: Record<string, string> = {
    feature: 'solar:star-bold-duotone',
    fix: 'solar:wrench-bold-duotone',
    improvement: 'solar:round-alt-arrow-up-bold-duotone',
  }
  return map[type] || 'solar:info-circle-bold-duotone'
}

function getTypeLabel(type: string) {
  const map: Record<string, string> = { feature: 'Nova Função', fix: 'Correção', improvement: 'Melhoria' }
  return map[type] || 'Atualização'
}

function getTypeColor(type: string) {
  const map: Record<string, string> = { feature: 'warning', fix: 'danger', improvement: 'info' }
  return map[type] || 'default'
}

function getIconBg(type: string) {
  const map: Record<string, string> = {
    feature: 'bg-amber-500/10 text-amber-500',
    fix: 'bg-danger-500/10 text-danger-500',
    improvement: 'bg-info-500/10 text-info-500',
  }
  return map[type] || 'bg-muted-500/10 text-muted-500'
}

function isNew(date: string) {
  return (new Date().getTime() - new Date(date).getTime()) < 48 * 60 * 60 * 1000
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(fetchUpdates)
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <BaseHeading as="h2" size="2xl">Novidades</BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500">Últimas atualizações e melhorias do sistema</BaseParagraph>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <BaseCard v-for="i in 3" :key="i" class="p-5">
          <div class="flex items-start gap-4">
            <BasePlaceload class="size-10 rounded-xl shrink-0" />
            <div class="flex-1 space-y-2">
              <BasePlaceload class="h-4 w-40 rounded" />
              <BasePlaceload class="h-3 w-full rounded" />
              <BasePlaceload class="h-3 w-3/4 rounded" />
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Empty -->
      <div v-else-if="updates.length === 0" class="text-center py-20">
        <div class="size-16 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center mx-auto mb-4">
          <Icon name="solar:star-fall-bold-duotone" class="size-8 text-muted-300" />
        </div>
        <BaseHeading as="h3" size="md" weight="semibold" class="text-muted-400 mb-1">
          Nenhuma novidade ainda
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-400">
          Atualizações do sistema aparecerão aqui.
        </BaseParagraph>
      </div>

      <!-- Updates list -->
      <div v-else class="space-y-4">
        <BaseCard v-for="item in updates" :key="item.id" class="p-5 hover:shadow-md transition-shadow">
          <div class="flex items-start gap-4">
            <!-- Icon -->
            <div class="size-10 rounded-xl flex items-center justify-center shrink-0" :class="getIconBg(item.type)">
              <Icon :name="getTypeIcon(item.type)" class="size-5" />
            </div>

            <!-- Content -->
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <BaseHeading size="sm" weight="semibold" class="text-muted-800 dark:text-muted-100">
                  {{ item.title }}
                </BaseHeading>
                <BaseTag rounded="full" size="sm" :color="getTypeColor(item.type)">
                  {{ getTypeLabel(item.type) }}
                </BaseTag>
                <BaseTag v-if="isNew(item.publishDate)" rounded="full" size="sm" color="primary" class="animate-pulse">
                  Novo
                </BaseTag>
                <time class="ml-auto text-xs text-muted-400">
                  {{ formatDate(item.publishDate) }}
                </time>
              </div>
              <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400 whitespace-pre-line">
                {{ item.content }}
              </BaseParagraph>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
