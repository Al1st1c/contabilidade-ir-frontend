<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

const props = defineProps<{
  onClose?: () => void
}>()

const { useCustomFetch } = useApi()
const { close } = usePanels()

const isLoading = ref(true)
const updates = ref<any[]>([])
const activeFilter = ref<'all' | 'feature' | 'improvement' | 'fix'>('all')

const filteredUpdates = computed(() => {
  if (activeFilter.value === 'all') return updates.value
  return updates.value.filter(u => u.type === activeFilter.value)
})

const filterTabs = [
  { key: 'all' as const, label: 'Todos', icon: 'solar:layers-bold-duotone' },
  { key: 'feature' as const, label: 'Funções', icon: 'solar:star-bold-duotone' },
  { key: 'improvement' as const, label: 'Melhorias', icon: 'solar:round-alt-arrow-up-bold-duotone' },
  { key: 'fix' as const, label: 'Correções', icon: 'solar:wrench-bold-duotone' },
]

function countByType(type: string) {
  if (type === 'all') return updates.value.length
  return updates.value.filter(u => u.type === type).length
}

async function fetchUpdates() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any[]>('/changelog')
    if (data) updates.value = data
    localStorage.setItem('last_changelog_seen', new Date().toISOString())
  } catch (error) {
    console.error('Erro ao buscar novidades:', error)
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

function getTypeColor(type: string) {
  const map: Record<string, string> = {
    feature: 'text-amber-500 bg-amber-500/10',
    fix: 'text-danger-500 bg-danger-500/10',
    improvement: 'text-primary-500 bg-primary-500/10',
  }
  return map[type] || 'text-muted-500 bg-muted-500/10'
}

function getTypeLabel(type: string) {
  const map: Record<string, string> = { feature: 'Nova Função', fix: 'Correção', improvement: 'Melhoria' }
  return map[type] || 'Atualização'
}

function getTypeTagColor(type: string) {
  const map: Record<string, string> = { feature: 'warning', fix: 'danger', improvement: 'info' }
  return map[type] || 'default'
}

function isNew(date: string) {
  return (new Date().getTime() - new Date(date).getTime()) < 48 * 60 * 60 * 1000
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatRelative(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  if (mins < 1) return 'Agora'
  if (mins < 60) return `Há ${mins}m`
  if (hours < 24) return `Há ${hours}h`
  if (days < 7) return `Há ${days}d`
  return formatDate(date)
}

onMounted(fetchUpdates)
</script>

<template>
  <FocusScope class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white" trapped loop>
    <!-- Header -->
    <div class="border-muted-200 dark:border-muted-800 flex h-20 w-full items-center justify-between border-b px-6">
      <div class="flex items-center gap-3">
        <div class="size-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
          <Icon name="solar:star-fall-bold-duotone" class="size-5" />
        </div>
        <div>
          <BaseHeading size="lg" weight="semibold" class="text-muted-900 dark:text-white leading-tight">
            Novidades
          </BaseHeading>
          <BaseParagraph size="xs" class="text-muted-400">
            Atualizações e melhorias do sistema
          </BaseParagraph>
        </div>
      </div>

      <button type="button"
        class="flex items-center justify-center size-9 rounded-full bg-muted-100 dark:bg-muted-700 hover:bg-muted-200 dark:hover:bg-muted-600 text-muted-500 dark:text-muted-200 transition-colors"
        @click="close()">
        <Icon name="lucide:x" class="size-5" />
      </button>
    </div>

    <div class="nui-slimscroll h-[calc(100dvh-80px)] overflow-y-auto pb-10">
      <!-- Filter Tabs -->
      <div class="px-4 mt-4">
        <div class="flex items-center p-1 rounded-xl bg-muted-100 dark:bg-muted-900 overflow-hidden">
          <button v-for="tab in filterTabs" :key="tab.key"
            class="flex-1 py-1.5 px-2 text-xs font-medium rounded-lg transition-all" :class="[
              activeFilter === tab.key
                ? 'bg-white dark:bg-muted-800 text-primary-600 shadow-sm border border-muted-200 dark:border-muted-700'
                : 'text-muted-500 hover:text-muted-700 dark:hover:text-muted-300',
            ]" @click="activeFilter = tab.key">
            <span class="flex items-center justify-center gap-1.5">
              {{ tab.label }}
              <span class="px-1.5 py-0.5 rounded-md text-[10px]" :class="[
                activeFilter === tab.key
                  ? 'bg-primary-500 text-white'
                  : 'bg-muted-200 dark:bg-muted-800 text-muted-500',
              ]">
                {{ countByType(tab.key) }}
              </span>
            </span>
          </button>
        </div>
      </div>

      <div class="p-4">
        <!-- Loading -->
        <div v-if="isLoading" class="space-y-3">
          <div v-for="i in 4" :key="i" class="animate-pulse">
            <div class="flex items-start gap-3 p-3 rounded-xl bg-muted-100 dark:bg-muted-900">
              <div class="size-10 rounded-xl bg-muted-200 dark:bg-muted-800 shrink-0" />
              <div class="flex-1 space-y-2">
                <div class="h-3 w-24 bg-muted-200 dark:bg-muted-800 rounded" />
                <div class="h-2 w-full bg-muted-200 dark:bg-muted-800 rounded" />
                <div class="h-2 w-3/4 bg-muted-200 dark:bg-muted-800 rounded" />
              </div>
            </div>
          </div>
        </div>

        <!-- Updates List -->
        <div v-else-if="filteredUpdates.length > 0" class="space-y-3">
          <div v-for="item in filteredUpdates" :key="item.id">
            <BaseCard rounded="lg" class="p-4 transition-all hover:border-primary-500/30">
              <div class="flex items-start gap-3">
                <!-- Icon -->
                <div class="size-10 rounded-xl flex items-center justify-center shrink-0"
                  :class="getTypeColor(item.type)">
                  <Icon :name="getTypeIcon(item.type)" class="size-5" />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-900 dark:text-white">
                      {{ item.title }}
                    </BaseHeading>
                    <BaseTag rounded="full" size="sm" :color="getTypeTagColor(item.type)">
                      {{ getTypeLabel(item.type) }}
                    </BaseTag>
                    <span v-if="isNew(item.publishDate)"
                      class="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-primary-500 text-white rounded animate-pulse shrink-0">
                      Novo
                    </span>
                  </div>

                  <BaseParagraph size="xs" class="text-muted-500 mt-1.5 whitespace-pre-line leading-relaxed">
                    {{ item.content }}
                  </BaseParagraph>

                  <div class="flex items-center gap-2 mt-2">
                    <Icon name="solar:calendar-minimalistic-bold-duotone" class="size-3 text-muted-300" />
                    <span class="text-[10px] text-muted-400">
                      {{ formatDate(item.publishDate) }}
                    </span>
                    <span class="text-[10px] text-muted-300">•</span>
                    <span class="text-[10px] text-muted-400">
                      {{ formatRelative(item.publishDate) }}
                    </span>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="py-12 text-center text-balance px-6">
          <div class="size-16 mx-auto mb-4 rounded-2xl bg-muted-100 dark:bg-muted-800 flex items-center justify-center">
            <Icon name="solar:star-fall-bold-duotone" class="size-8 text-muted-400" />
          </div>
          <BaseHeading as="h4" size="md" weight="medium" class="text-muted-900 dark:text-white mb-1">
            {{ activeFilter === 'all' ? 'Nenhuma novidade' : 'Nenhum item nesta categoria' }}
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-400">
            {{ activeFilter === 'all' ? 'Novas funcionalidades e melhorias aparecerão aqui.' : 'Tente outra categoria.'
            }}
          </BaseParagraph>
        </div>
      </div>
    </div>
  </FocusScope>
</template>
