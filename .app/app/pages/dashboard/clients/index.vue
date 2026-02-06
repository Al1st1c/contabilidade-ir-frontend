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
  }
  else {
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

// Pagination logic removed from query redeclaration fix
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
const isLoading = ref(true)

async function fetchClients() {
  isLoading.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/clients', {
      method: 'GET',
      query: query.value,
    })
    data.value = response
  }
  catch (error) {
    console.error('Erro ao buscar clientes:', error)
  }
  finally {
    isLoading.value = false
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
  VIP: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  Recorrente: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Novo: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  Médico: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

function getTagColor(tag: string): string {
  return tagColors[tag] || 'bg-muted-100 text-muted-600 dark:bg-muted-800 dark:text-muted-400'
}

function formatCpf(cpf: string): string {
  if (!cpf)
    return ''
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}
</script>

<template>
  <ClientOnly>
    <template #fallback>
      <AppPageLoading message="Preparando sua base de clientes..." />
    </template>

    <div class="px-4 md:px-6 lg:px-8 pb-20">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <BaseHeading as="h1" size="2xl" weight="medium" class="text-muted-800 dark:text-white">
            Clientes
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
            Gerencie sua base de clientes e acompanhe o status das declarações.
          </BaseParagraph>
        </div>
        <div class="flex items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          <BaseButton variant="primary" to="/dashboard/clients/create"
            class="w-full sm:w-auto shadow-lg shadow-primary-500/20">
            <Icon name="lucide:plus" class="size-4 mr-1" />
            <span>Cadastrar Cliente</span>
          </BaseButton>
        </div>
      </div>

      <!-- Filters & Content -->
      <div class="space-y-6">
        <!-- Filter Bar -->
        <BaseCard rounded="lg" class="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="relative w-full md:w-96">
            <Icon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-400" />
            <input v-model="filter" type="text" placeholder="Buscar por nome, CPF ou e-mail..."
              class="w-full pl-10 pr-4 py-2 text-sm bg-muted-100/50 dark:bg-muted-950/50 border border-muted-200 dark:border-muted-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all">
          </div>
          <div class="flex items-center gap-3 w-full md:w-auto">
            <div class="flex items-center gap-2 text-xs text-muted-500">
              <span>Mostrar:</span>
              <select v-model="perPage"
                class="bg-transparent border-none focus:ring-0 text-muted-800 dark:text-muted-200 font-medium cursor-pointer">
                <option :value="10">10</option>
                <option :value="25">25</option>
                <option :value="50">50</option>
              </select>
            </div>
            <BaseButton variant="muted" size="sm" rounded="lg" class="hidden sm:flex">
              <Icon name="lucide:filter" class="size-4 mr-1" />
              <span>Mais Filtros</span>
            </BaseButton>
          </div>
        </BaseCard>

        <!-- Results -->
        <div>
          <AppPageLoading v-if="isLoading" message="Carregando clientes..." />

          <div v-else-if="data?.data.length === 0">
            <BasePlaceholderPage title="Nenhum cliente encontrado"
              subtitle="Tente buscar por outro termo ou cadastre um novo cliente.">
              <template #image>
                <img class="block dark:hidden" src="/img/illustrations/placeholders/flat/accounting-empty-search-v2.png"
                  alt="Placeholder image">
                <img class="hidden dark:block"
                  src="/img/illustrations/placeholders/flat/accounting-empty-search-v2-dark.png"
                  alt="Placeholder image">
              </template>
              <div class="mt-4 flex justify-center">
                <BaseButton variant="primary" to="/dashboard/clients/create">
                  Cadastrar Cliente
                </BaseButton>
              </div>
            </BasePlaceholderPage>
          </div>

          <div v-else class="w-full">
            <BaseCard rounded="lg" class="overflow-hidden border border-muted-200 dark:border-muted-800">
              <TairoTable :scrollable="true">
                <template #header>
                  <TairoTableHeading uppercase spaced class="p-4" @click="toggleSort('name')">
                    <div class="flex items-center cursor-pointer hover:text-primary-500 transition-colors gap-1">
                      Cliente
                      <Icon v-if="sortBy === 'name'"
                        :name="sortOrder === 'asc' ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="size-3" />
                    </div>
                  </TairoTableHeading>

                  <TairoTableHeading uppercase spaced @click="toggleSort('cpf')">
                    <div class="flex items-center cursor-pointer hover:text-primary-500 transition-colors gap-1">
                      Documento
                      <Icon v-if="sortBy === 'cpf'"
                        :name="sortOrder === 'asc' ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="size-3" />
                    </div>
                  </TairoTableHeading>

                  <TairoTableHeading uppercase spaced>
                    Tags
                  </TairoTableHeading>

                  <TairoTableHeading uppercase spaced @click="toggleSort('declarationsCount')" class="text-center">
                    <div
                      class="flex items-center justify-center cursor-pointer hover:text-primary-500 transition-colors gap-1">
                      Declarações
                      <Icon v-if="sortBy === 'declarationsCount'"
                        :name="sortOrder === 'asc' ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="size-3" />
                    </div>
                  </TairoTableHeading>

                  <TairoTableHeading uppercase spaced>
                    Status
                  </TairoTableHeading>

                  <TairoTableHeading uppercase spaced class="text-end px-4">
                    Ações
                  </TairoTableHeading>
                </template>

                <TairoTableRow v-for="item in data?.data" :key="item.id"
                  class="hover:bg-muted-50/50 dark:hover:bg-muted-900/30 transition-colors">
                  <TairoTableCell spaced>
                    <div class="flex items-center">
                      <BaseAvatar :text="item.name.charAt(0).toUpperCase()" size="sm"
                        class="bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400 ring-1 ring-primary-500/20" />
                      <div class="ms-3 leading-none">
                        <NuxtLink :to="`/dashboard/clients/edit/${item.id}`"
                          class="text-sm font-medium text-muted-800 dark:text-white hover:text-primary-500 transition-colors">
                          {{ item.name }}
                        </NuxtLink>
                        <p class="text-muted-500 dark:text-muted-400 font-sans text-[11px] mt-1.5">
                          {{ item.email || 'Sem e-mail' }}
                        </p>
                      </div>
                    </div>
                  </TairoTableCell>

                  <TairoTableCell spaced>
                    <div class="flex flex-col gap-1">
                      <span class="text-sm text-muted-700 dark:text-muted-200 tracking-wide font-medium font-sans">
                        {{ formatCpf(item.cpf) }}
                      </span>
                      <span v-if="item.phone" class="text-[11px] text-muted-400 flex items-center gap-1.5">
                        <Icon name="lucide:phone" class="size-3.5" />
                        {{ item.phone }}
                      </span>
                    </div>
                  </TairoTableCell>

                  <TairoTableCell spaced>
                    <div v-if="item.tags && item.tags.length > 0" class="flex flex-wrap gap-1.5">
                      <BaseTag v-for="tag in item.tags.slice(0, 2)" :key="tag" size="sm" rounded="full" variant="none"
                        class="px-2.5 py-0.5 text-[10px] font-medium" :class="[getTagColor(tag)]">
                        {{ tag }}
                      </BaseTag>
                      <BaseTag v-if="item.tags.length > 2" size="sm" rounded="full" variant="muted"
                        class="text-[10px] px-2 border border-muted-200 dark:border-muted-800">
                        +{{ item.tags.length - 2 }}
                      </BaseTag>
                    </div>
                    <span v-else class="text-[11px] text-muted-400 italic">Sem tags</span>
                  </TairoTableCell>

                  <TairoTableCell spaced class="text-center">
                    <div class="flex flex-col items-center leading-none">
                      <span class="text-sm font-medium text-muted-800 dark:text-muted-100">{{ item.declarationsCount
                        }}</span>
                      <span class="text-[10px] text-muted-400 uppercase tracking-wider mt-1">enviadas</span>
                    </div>
                  </TairoTableCell>

                  <TairoTableCell spaced>
                    <BaseTag :variant="item.isActive ? 'none' : 'muted'" rounded="full" size="sm"
                      class="text-[11px] font-medium px-3"
                      :class="item.isActive ? 'bg-emerald-500/10 text-emerald-600' : ''">
                      {{ item.isActive ? 'Ativo' : 'Inativo' }}
                    </BaseTag>
                  </TairoTableCell>

                  <TairoTableCell spaced class="px-4">
                    <div class="flex justify-end items-center gap-2">
                      <BaseTooltip content="Editar Cliente">
                        <BaseButton :to="`/dashboard/clients/edit/${item.id}`" rounded="lg" size="sm" variant="muted"
                          class="size-9 p-0 flex items-center justify-center hover:bg-muted-100 dark:hover:bg-muted-800 border-muted-200 dark:border-muted-700">
                          <Icon name="solar:pen-2-linear" class="size-5" />
                        </BaseButton>
                      </BaseTooltip>

                      <BaseDropdown placement="bottom-end">
                        <template #button>
                          <BaseButton rounded="lg" size="sm" variant="muted"
                            class="size-9 p-0 flex items-center justify-center hover:bg-muted-100 dark:hover:bg-muted-800 border-muted-200 dark:border-muted-700">
                            <Icon name="lucide:more-vertical" class="size-5" />
                          </BaseButton>
                        </template>
                        <BaseDropdownItem :to="{ path: '/dashboard/ir', query: { newFor: item.id } }"
                          title="Nova Declaração" text="Iniciar processo de IR">
                          <template #start>
                            <BaseAvatar size="xs" class="bg-primary-500/10 text-primary-500">
                              <Icon name="lucide:plus" class="size-4" />
                            </BaseAvatar>
                          </template>
                        </BaseDropdownItem>
                      </BaseDropdown>
                    </div>
                  </TairoTableCell>
                </TairoTableRow>
              </TairoTable>
            </BaseCard>

            <!-- Pagination -->
            <div class="mt-6">
              <BasePagination v-model:page="page" :items-per-page="perPage" :total="data?.pagination?.total || 0"
                :sibling-count="1" rounded="full" class="w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>