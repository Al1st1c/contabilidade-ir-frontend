<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Clientes',
})

const { useCustomFetch } = useApi()
const route = useRoute()
const router = useRouter()

// Pagination logic
const page = computed({
  get: () => Number.parseInt((route.query.page as string) ?? '1', 10),
  set: (value) => {
    router.push({
      query: {
        ...route.query,
        page: value,
      },
    })
  },
})

const filter = ref('')
const perPage = ref(10)

watch([filter, perPage], () => {
  router.push({
    query: {
      page: undefined,
    },
  })
})

const query = computed(() => {
  return {
    search: filter.value,
    limit: perPage.value,
    page: page.value,
  }
})

const data = ref<any>({ data: [], pagination: { total: 0 } })
const pending = ref(true)

// Fetch clients
async function fetchClients() {
  pending.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/clients', {
      method: 'GET',
      query: query.value
    })

    data.value = response
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    data.value = { data: [], pagination: { total: 0 } }
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchClients()
})

watch(query, () => {
  fetchClients()
}, { deep: true })

// Tag colors for consistency with Kanban
const tagColors: Record<string, string> = {
  VIP: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Recorrente: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Novo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Médico: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

function getTagColor(tag: string): string {
  return tagColors[tag] || 'bg-muted-100 text-muted-600 dark:bg-muted-800 dark:text-muted-400'
}

function formatCpf(cpf: string): string {
  if (!cpf) return ''
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <TairoContentWrapper>
      <template #left>
        <TairoInput v-model="filter" icon="lucide:search" placeholder="Buscar por nome ou CPF..."
          class="w-full sm:w-80" />
      </template>
      <template #right>
        <BaseButton variant="primary" to="/dashboard/clients/create" class="w-full sm:w-auto">
          <Icon name="lucide:plus" class="size-4" />
          <span>Novo Cliente</span>
        </BaseButton>
      </template>

      <div>
        <!-- Loading State -->
        <div v-if="pending" class="flex items-center justify-center py-20">
          <BaseSpinner size="lg" />
        </div>

        <!-- Empty State -->
        <div v-else-if="data?.data.length === 0">
          <BasePlaceholderPage title="Nenhum cliente encontrado"
            subtitle="Tente ajustar sua busca ou cadastrar um novo cliente.">
            <template #image>
              <img class="block dark:hidden" src="/img/illustrations/placeholders/flat/placeholder-search-1.svg"
                alt="Sem resultados">
              <img class="hidden dark:block" src="/img/illustrations/placeholders/flat/placeholder-search-1-dark.svg"
                alt="Sem resultados">
            </template>
          </BasePlaceholderPage>
        </div>

        <!-- List -->
        <div v-else class="space-y-4">
          <TransitionGroup enter-active-class="transform-gpu transition-all duration-300"
            enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0">
            <BaseCard v-for="item in data?.data" :key="item.id" rounded="lg"
              class="flex flex-col p-5 sm:flex-row sm:items-center gap-4 hover:border-primary-500/30 transition-colors">
              <!-- Info Column -->
              <div class="flex items-center gap-4 flex-1">
                <BaseAvatar size="md" :text="item.name.charAt(0).toUpperCase()" rounded="full"
                  class="bg-primary-500/10 text-primary-600" />
                <div class="flex flex-col">
                  <BaseHeading tag="h3" size="md" weight="medium" class="text-muted-800 dark:text-muted-100">
                    {{ item.name }}
                  </BaseHeading>
                  <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    <span class="text-xs text-muted-400 font-mono flex items-center gap-1">
                      <Icon name="lucide:fingerprint" class="size-3" />
                      {{ item.cpf }}
                    </span>
                    <span v-if="item.phone" class="text-xs text-muted-400 flex items-center gap-1">
                      <Icon name="lucide:phone" class="size-3" />
                      {{ item.phone }}
                    </span>
                    <span v-if="item.email" class="text-xs text-muted-400 flex items-center gap-1">
                      <Icon name="lucide:mail" class="size-3" />
                      {{ item.email }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Stats & Tags -->
              <div class="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
                <!-- Tags -->
                <div v-if="item.tags && item.tags.length > 0" class="flex flex-wrap gap-1">
                  <span v-for="tag in item.tags" :key="tag"
                    :class="[getTagColor(tag), 'px-2 py-0.5 rounded text-[10px] font-medium transition-opacity']">
                    {{ tag }}
                  </span>
                </div>

                <!-- IR Count -->
                <div class="flex flex-col items-center">
                  <span class="text-xs text-muted-400 uppercase tracking-wider font-medium">Declarações</span>
                  <span class="text-lg font-bold text-muted-800 dark:text-muted-100">
                    {{ item.declarationsCount }}
                  </span>
                </div>

                <!-- Status -->
                <BaseTag size="sm" :variant="item.isActive ? 'primary' : 'muted'" rounded="full">
                  {{ item.isActive ? 'Ativo' : 'Inativo' }}
                </BaseTag>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-2 sm:ms-4">
                <BaseTooltip content="Visualizar Detalhes">
                  <BaseButton size="icon-sm" rounded="full" variant="muted" :to="`/dashboard/clients/edit/${item.id}`">
                    <Icon name="lucide:eye" class="size-4" />
                  </BaseButton>
                </BaseTooltip>

                <BaseTooltip content="Nova Declaração">
                  <BaseButton size="icon-sm" rounded="full" variant="primary"
                    :to="{ path: '/dashboard/ir', query: { newFor: item.id } }">
                    <Icon name="lucide:file-plus" class="size-4" />
                  </BaseButton>
                </BaseTooltip>
              </div>
            </BaseCard>
          </TransitionGroup>

          <!-- Pagination -->
          <div class="mt-6">
            <BasePagination v-model:page="page" :items-per-page="perPage" :total="data?.pagination?.total || 0"
              :sibling-count="1" rounded="full" class="w-full" />
          </div>
        </div>
      </div>
    </TairoContentWrapper>
  </div>
</template>