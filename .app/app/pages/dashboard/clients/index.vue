<script setup lang="ts">
definePageMeta({
  title: 'Listagem de clientes',
  preview: {
    title: 'Listagem de clientes',
    description: 'For list views and collections',
    categories: ['layouts', 'lists'],
    src: '/img/screens/layouts-list-view-1.png',
    srcDark: '/img/screens/layouts-list-view-1-dark.png',
    order: 37,
  },
})

import { useApi } from '~/composables/useAuth'

const { useCustomFetch } = useApi()
const route = useRoute()
const router = useRouter()
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

const data = ref<any>({ data: [], total: 0 })
const pending = ref(true)

// Função para buscar clientes
async function fetchClients() {
  pending.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/users/clients-with-stats', {
      method: 'GET',
      query: query.value
    })
    
    data.value = response
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    data.value = { data: [], total: 0 }
  } finally {
    pending.value = false
  }
}

// Buscar clientes ao montar o componente e quando query mudar
onMounted(() => {
  fetchClients()
})

watch(query, () => {
  fetchClients()
}, { deep: true })

// Função para formatar valores em moeda brasileira
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

const { open, close } = usePanels()
import { PanelsPanelAddCredit, PanelsPanelWithdraw, PanelsPanelClientDetails } from '#components'

function addCredit(id: string) {
  open(PanelsPanelAddCredit, {
    action: 'create',
    data: { id: id },
    onSave(info: any) {
      console.log(info)
      close()
    },
  })
}


function withdraw(id: string) {
  open(PanelsPanelWithdraw, {
    action: 'create',
    data: { id: id },
    onSave(info: any) {
      console.log('Saque processado:', info)
      // Atualizar lista após o saque
      fetchClients()
      close()
    },
  })
}

function viewClient(clientId: string) {
  open(PanelsPanelClientDetails, {
    clientId: clientId
  })
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20 dark:[--color-input-default-bg:var(--color-muted-950)]">
    <TairoContentWrapper>
      <template #left>
        <TairoInput
          v-model="filter"
          icon="lucide:search"
          placeholder="Filtrar por nome ou cpf..."
        />
      </template>
      <template #right>
        <BaseButton variant="primary" class="w-full sm:w-32" to="/dashboard/clients/create">
          <Icon name="lucide:plus" class="size-4" />
          <span>Cadastrar</span>
        </BaseButton>
      </template>
      <div>
        <div v-if="!pending && data?.data.length === 0">
          <BasePlaceholderPage
            title="Nenhum resultado encontrado"
            subtitle="Não foi possível encontrar nenhum resultado para a busca."
          >
            <template #image>
              <img
                class="block dark:hidden"
                src="/img/illustrations/placeholders/flat/placeholder-search-1.svg"
                alt="Placeholder image"
              >
              <img
                class="hidden dark:block"
                src="/img/illustrations/placeholders/flat/placeholder-search-1-dark.svg"
                alt="Placeholder image"
              >
            </template>
          </BasePlaceholderPage>
        </div>
        <div v-else class="space-y-3">
          <TransitionGroup
            enter-active-class="transform-gpu"
            enter-from-class="opacity-0 -translate-x-full"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="absolute transform-gpu"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 -translate-x-full"
          >
            <BaseCard
              v-for="item in data?.data"
              :key="item.id"
              rounded="lg"
              class="flex flex-col p-4 sm:flex-row sm:items-center"
            >
              <div
                class="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:justify-start sm:text-start"
              >
                <BaseAvatar
                  size="sm"
                  :src="item.photo"
                  :text="item.name.charAt(0).toUpperCase()"
                />
                <div>
                  <BaseHeading
                    tag="h3"
                    size="sm"
                  >
                    {{ item.name }}
                  </BaseHeading>
                  <BaseParagraph
                    size="xs"
                    lead="none"
                    class="text-muted-600 dark:text-muted-400 flex items-end text-sm"
                  >
                    <span>{{ item.document || 'Sem documento' }}</span>
                  </BaseParagraph>
                  <BaseParagraph
                    size="xs"
                    lead="none"
                    class="text-muted-600 dark:text-muted-400 flex items-end text-sm"
                  >
                    <span>{{ item.phone || 'Sem telefone' }}</span>
                  </BaseParagraph>
                </div>
              </div>
              <div
                class="flex flex-col gap-4 pt-4 sm:ms-auto sm:flex-row sm:items-center sm:justify-end sm:pt-0"
              >
                <div
                  class="flex w-full items-center justify-center sm:w-[120px] sm:justify-start"
                >
                  <BaseTag
                    size="sm"
                    :variant="item.phoneValidated ? 'primary' : 'dark'"
                    rounded="full"
                  >
                    {{ item.phoneValidated ? 'Tel. Válido' : 'Tel. Inválido' }}
                  </BaseTag>
                </div>
                <div
                  class="divide-muted-200 dark:divide-muted-800 flex items-center justify-center divide-x flex-1"
                >
                  <div class="flex flex-col gap-1 px-3 text-center min-h-[3rem] justify-center flex-1">
                    <BaseHeading
                      tag="h3"
                      size="sm"
                      class="text-muted-800 dark:text-muted-100"
                    >
                      <span>{{ formatCurrency(item.stats.totalDeposited) }}</span>
                    </BaseHeading>
                    <BaseParagraph
                      lead="none"
                      weight="medium"
                      class="text-muted-400 text-[0.6rem]! uppercase tracking-wide"
                    >
                      <span>Depositado</span>
                    </BaseParagraph>
                  </div>
                  <div class="flex flex-col gap-1 px-3 text-center min-h-[3rem] justify-center flex-1">
                    <BaseHeading
                      tag="h3"
                      size="sm"
                      class="text-muted-800 dark:text-muted-100"
                    >
                      <span>{{ formatCurrency(item.stats.totalWithdrawn) }}</span>
                    </BaseHeading>
                    <BaseParagraph
                      lead="none"
                      weight="medium"
                      class="text-muted-400 text-[0.6rem]! uppercase tracking-wide"
                    >
                      <span>Sacado</span>
                    </BaseParagraph>
                  </div>
                  <div class="flex flex-col gap-1 px-3 text-center min-h-[3rem] justify-center flex-1">
                    <BaseHeading
                      tag="h3"
                      size="sm"
                      class="text-muted-800 dark:text-muted-100"
                    >
                      <span>{{ formatCurrency(item.stats.totalCashback) }}</span>
                    </BaseHeading>
                    <BaseParagraph
                      lead="none"
                      weight="medium"
                      class="text-muted-400 text-[0.6rem]! uppercase tracking-wide"
                    >
                      <span>Cashback</span>
                    </BaseParagraph>
                  </div>
                  <div class="flex flex-col gap-1 px-3 text-center min-h-[3rem] justify-center flex-1">
                    <BaseHeading
                      tag="h3"
                      size="sm"
                      class="text-muted-800 dark:text-muted-100"
                    >
                      <span>{{ formatCurrency(item.credits) }}</span>
                    </BaseHeading>
                    <BaseParagraph
                      lead="none"
                      weight="medium"
                      class="text-muted-400 text-[0.6rem]! uppercase tracking-wide"
                    >
                      <span>Créditos</span>
                    </BaseParagraph>
                  </div>
                </div>
                <div
                  class="flex w-full items-center justify-center gap-1 py-3 sm:w-[160px] sm:justify-end sm:py-0"
                >
                  <div v-if="item.invitedBy" class="flex items-center gap-2">
                    <BaseAvatar
                      size="xs"
                      :text="item.invitedBy.name.charAt(0).toUpperCase()"
                    />
                    <p class="text-muted-600 dark:text-muted-400 font-sans text-xs">
                      {{ item.invitedBy.name }}
                    </p>
                  </div>
                  <div v-else class="flex items-center gap-2">
                    <p class="text-muted-400 dark:text-muted-500 font-sans text-xs">
                      Cadastro direto
                    </p>
                  </div>
                </div>
                <div class="sm:ms-0">
                  <BaseTooltip content="Visualizar"> 
                  <BaseButton size="sm" rounded="md" class="w-full sm:w-auto" @click="viewClient(item.id)">
                    <Icon name="lucide:eye" class="size-4" /> 
                  </BaseButton>
                  </BaseTooltip>
                </div>
                <div class="sm:ms-0">
                  <BaseTooltip content="Editar">
                  <BaseButton size="sm" rounded="md" class="w-full sm:w-auto" :to="`/dashboard/clients/edit/${item.id}`">
                    <Icon name="lucide:edit-2" class="size-4" />
                  </BaseButton>
                  </BaseTooltip>
                </div>
                <div class="sm:ms-0">
                  <BaseTooltip content="Adicionar Crédito">
                  <BaseButton size="sm" rounded="md" class="w-full sm:w-auto" @click="addCredit(item.id)">
                    <Icon name="uil:money-insert" class="size-4" />
                  </BaseButton>
                  </BaseTooltip>
                </div>
                <div class="sm:ms-0">
                  <BaseTooltip content="Sacar">
                  <BaseButton size="sm" rounded="md" class="w-full sm:w-auto" @click="withdraw(item.id)">
                    <Icon name="uil:money-withdrawal" class="size-4" />
                  </BaseButton>
                  </BaseTooltip>
                </div>
              
              </div>
            </BaseCard>
          </TransitionGroup>

          <div class="mt-4">
            <BasePagination
              v-model:page="page"
              :items-per-page="perPage"
              :total="data.total"
              :sibling-count="2"
              rounded="full"
              class="w-full"
            />
          </div>
        </div>
      </div>
    </TairoContentWrapper>
  </div>
</template>
  