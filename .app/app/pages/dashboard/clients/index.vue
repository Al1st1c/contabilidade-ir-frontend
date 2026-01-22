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
const sortBy = ref('name')
const sortOrder = ref('asc')

function toggleSort(field: string) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
}

watch([filter, perPage, sortBy, sortOrder], () => {
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
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
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
        <TairoInput v-model="filter" icon="lucide:search" placeholder="Filtrar clientes..." class="w-full sm:w-80" />
      </template>

      <template #right>
        <div class="flex w-full items-center gap-2 sm:w-80">
          <BaseSelect v-model="perPage" placeholder="Itens por página" class="w-40 hidden sm:block">
            <BaseSelectItem :value="10">10 por pág.</BaseSelectItem>
            <BaseSelectItem :value="25">25 por pág.</BaseSelectItem>
            <BaseSelectItem :value="50">50 por pág.</BaseSelectItem>
          </BaseSelect>
          <BaseButton variant="primary" to="/dashboard/clients/create" class="w-40">
            <Icon name="lucide:plus" class="size-4" />
            <span>Novo Cliente</span>
          </BaseButton>
        </div>
      </template>

      <div>
        <div v-if="pending" class="flex items-center justify-center py-20">
          <BaseSpinner size="lg" class="text-primary-500" />
        </div>

        <div v-else-if="data?.data.length === 0">
          <BasePlaceholderPage title="Nenhum cliente encontrado"
            subtitle="Tente buscar por outro termo ou cadastre um novo cliente.">
            <template #image>
              <img class="block dark:hidden" src="/img/illustrations/placeholders/flat/placeholder-search-4.svg"
                alt="Placeholder image" />
              <img class="hidden dark:block" src="/img/illustrations/placeholders/flat/placeholder-search-4-dark.svg"
                alt="Placeholder image" />
            </template>
            <div class="mt-4 flex justify-center">
              <BaseButton variant="primary" to="/dashboard/clients/create">
                Cadastrar Cliente
              </BaseButton>
            </div>
          </BasePlaceholderPage>
        </div>

        <div v-else class="w-full">
          <TairoTable rounded="sm" :scrollable="false">
            <template #header>
              <TairoTableHeading uppercase spaced class="p-4" @click="toggleSort('name')">
                <div class="flex items-center cursor-pointer hover:text-primary-500 transition-colors">
                  Cliente
                  <Icon v-if="sortBy === 'name'"
                    :name="sortOrder === 'asc' ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="size-3 ml-1" />
                </div>
              </TairoTableHeading>

              <TairoTableHeading uppercase spaced @click="toggleSort('cpf')">
                <div class="flex items-center cursor-pointer hover:text-primary-500 transition-colors">
                  CPF / Contato
                  <Icon v-if="sortBy === 'cpf'"
                    :name="sortOrder === 'asc' ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="size-3 ml-1" />
                </div>
              </TairoTableHeading>

              <TairoTableHeading uppercase spaced>
                Tags
              </TairoTableHeading>

              <TairoTableHeading uppercase spaced @click="toggleSort('declarationsCount')">
                <div class="flex items-center cursor-pointer hover:text-primary-500 transition-colors">
                  Declarações
                  <Icon v-if="sortBy === 'declarationsCount'"
                    :name="sortOrder === 'asc' ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="size-3 ml-1" />
                </div>
              </TairoTableHeading>

              <TairoTableHeading uppercase spaced>
                Status
              </TairoTableHeading>

              <TairoTableHeading uppercase spaced class="text-end">
                Ações
              </TairoTableHeading>
            </template>

            <TairoTableRow v-for="item in data?.data" :key="item.id">
              <TairoTableCell spaced>
                <div class="flex items-center">
                  <BaseAvatar :text="item.name.charAt(0).toUpperCase()" size="sm"
                    class="bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400" />
                  <div class="ms-3 leading-none">
                    <h4 class="text-muted-900 dark:text-white font-sans text-sm font-medium">
                      <NuxtLink :to="`/dashboard/clients/edit/${item.id}`"
                        class="hover:text-primary-500 transition-colors">
                        {{ item.name }}
                      </NuxtLink>
                    </h4>
                    <p class="text-muted-500 dark:text-muted-400 font-sans text-xs mt-1">
                      {{ item.email || 'Sem e-mail' }}
                    </p>
                  </div>
                </div>
              </TairoTableCell>

              <TairoTableCell spaced>
                <div class="flex flex-col">
                  <span class="font-mono text-xs text-muted-600 dark:text-muted-300">
                    {{ formatCpf(item.cpf) }}
                  </span>
                  <span v-if="item.phone" class="text-xs text-muted-400 flex items-center gap-1 mt-0.5">
                    <Icon name="lucide:phone" class="size-3" />
                    {{ item.phone }}
                  </span>
                </div>
              </TairoTableCell>

              <TairoTableCell spaced>
                <div v-if="item.tags && item.tags.length > 0" class="flex flex-wrap gap-1">
                  <BaseTag v-for="tag in item.tags.slice(0, 2)" :key="tag" size="sm" rounded="full" variant="none"
                    :class="[getTagColor(tag), 'px-2 py-0.5 rounded text-[10px] font-medium']">
                    {{ tag }}
                  </BaseTag>
                  <BaseTag v-if="item.tags.length > 2" size="sm" rounded="full" variant="muted" class="text-[10px]">
                    +{{ item.tags.length - 2 }}
                  </BaseTag>
                </div>
                <span v-else class="text-xs text-muted-400 italic">Sem tags</span>
              </TairoTableCell>

              <TairoTableCell spaced>
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-sm text-muted-800 dark:text-muted-100">{{ item.declarationsCount
                    }}</span>
                  <span class="text-xs text-muted-500">enviadas</span>
                </div>
              </TairoTableCell>

              <TairoTableCell spaced>
                <BaseTag :variant="item.isActive ? 'primary' : 'muted'" rounded="full" size="sm" class="font-medium">
                  {{ item.isActive ? 'Ativo' : 'Inativo' }}
                </BaseTag>
              </TairoTableCell>

              <TairoTableCell spaced>
                <div class="flex justify-end items-center gap-2">
                  <BaseTooltip content="Histórico">
                    <BaseButton :to="`/dashboard/clients/edit/${item.id}`" rounded="lg" size="sm" variant="muted"
                      class="size-8 p-0 flex items-center justify-center">
                      <Icon name="lucide:eye" class="size-4" />
                    </BaseButton>
                  </BaseTooltip>
                  <BaseDropdown placement="bottom-end">
                    <template #button>
                      <BaseButton rounded="lg" size="sm" variant="muted"
                        class="size-8 p-0 flex items-center justify-center">
                        <Icon name="lucide:more-vertical" class="size-4" />
                      </BaseButton>
                    </template>
                    <BaseDropdownItem :to="{ path: '/dashboard/ir', query: { newFor: item.id } }"
                      title="Nova Declaração" text="Iniciar processo">
                      <template #start>
                        <Icon name="lucide:file-plus" class="size-4 text-primary-500" />
                      </template>
                    </BaseDropdownItem>
                  </BaseDropdown>
                </div>
              </TairoTableCell>
            </TairoTableRow>
          </TairoTable>

          <div class="mt-6 px-4">
            <BasePagination v-model:page="page" :items-per-page="perPage" :total="data?.pagination?.total || 0"
              :sibling-count="1" rounded="lg" class="w-full" />
          </div>
        </div>
      </div>
    </TairoContentWrapper>
  </div>
</template>