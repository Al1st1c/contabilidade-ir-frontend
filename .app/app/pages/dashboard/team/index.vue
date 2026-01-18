<script setup lang="ts">
import { useApi } from '~/composables/useAuth'
import PanelAddTeamUser from '~/components/panels/PanelAddTeamUser.vue'

definePageMeta({
  title: 'Equipe',
  preview: {
    title: 'Gestão da Equipe',
    description: 'Gerenciamento de usuários da equipe',
    categories: ['layouts'],
    src: '/img/screens/layouts-user-grid-1.png',
    srcDark: '/img/screens/layouts-user-grid-1-dark.png',
    order: 64,
  },
})

const { useCustomFetch } = useApi()
const route = useRoute()
const router = useRouter()
const { open } = usePanels()

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
const perPage = ref(18)
const pending = ref(false)
const data = ref<any>({ data: [], total: 0 })

// Debounce para a busca
const debouncedFilter = refDebounced(filter, 500)

watch([debouncedFilter, perPage], () => {
  router.push({
    query: {
      page: undefined,
    },
  })
})

const query = computed(() => {
  const queryParams: any = {
    perPage: perPage.value,
    page: page.value,
  }
  
  // Só adicionar filter se tiver valor
  if (debouncedFilter.value && debouncedFilter.value.trim()) {
    queryParams.filter = debouncedFilter.value.trim()
  }
  
  return queryParams
})

// Função para buscar usuários da equipe
async function fetchTeamUsers() {
  if (pending.value) return
  
  pending.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/users/team', {
      method: 'GET',
      query: query.value
    })
    
    data.value = response
  } catch (error) {
    console.error('Erro ao buscar usuários da equipe:', error)
    data.value = { data: [], total: 0 }
  } finally {
    pending.value = false
  }
}

// Buscar usuários ao montar o componente
onMounted(() => {
  fetchTeamUsers()
})

// Observar mudanças na query
watch(query, () => {
  fetchTeamUsers()
}, { deep: true })

// Função para abrir painel de cadastro
function openAddUserPanel() {
  open(PanelAddTeamUser, {
    onSuccess: async () => {
      // Recarregar lista após criar usuário
      await fetchTeamUsers()
    }
  })
}

// Função para editar usuário
function editUser(user: any) {
  // Por enquanto, vamos navegar para uma página de edição
  router.push(`/dashboard/team/edit/${user.id}`)
}

// Função para obter cor aleatória do avatar
function getRandomColor() {
  const colors = [
    'bg-primary-500',
    'bg-success-500', 
    'bg-warning-500',
    'bg-danger-500',
    'bg-info-500'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20 dark:[--color-input-default-bg:var(--color-muted-950)]">
    <TairoContentWrapper>
      <template #left>
        <TairoInput
          v-model="filter"
          icon="lucide:search"
          rounded="full"
          placeholder="Buscar usuários..."
        />
      </template>
      <template #right>
        <BaseButton
          variant="primary"
          class="w-full sm:w-32"
          rounded="full"
          @click="openAddUserPanel"
        >
          <Icon name="lucide:plus" class="size-4" />
          <span>Adicionar</span>
        </BaseButton>
      </template>
      <div>
        <div v-if="!pending && data?.data.length === 0">
          <BasePlaceholderPage
            title="Nenhum usuário encontrado"
            subtitle="Não foi possível encontrar usuários da equipe com os termos de busca utilizados."
          >
            <template #image>
              <img
                class="block dark:hidden"
                src="/img/illustrations/placeholders/flat/placeholder-search-2.svg"
                alt="Placeholder image"
              >
              <img
                class="hidden dark:block"
                src="/img/illustrations/placeholders/flat/placeholder-search-2-dark.svg"
                alt="Placeholder image"
              >
            </template>
          </BasePlaceholderPage>
        </div>
        <div
          v-else
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <TransitionGroup
            enter-active-class="transform-gpu"
            enter-from-class="opacity-0 -translate-x-full"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="absolute transform-gpu"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 -translate-x-full"
          >
            <BaseCard
              v-for="(item, index) in (data?.data || []).filter((item: any) => item != null)"
              :key="item?.id || index"
              rounded="md"
              elevated-hover
              class="p-4 md:p-6"
            >
              <div class="mb-3 flex w-full items-center justify-center">
                <BaseAvatar
                  size="lg"
                  :src="item?.src || null"
                  :badge-src="item?.badge || null"
                  :text="item?.initials || 'U'"
                  :class="getRandomColor()"
                />
              </div>
              <div class="text-center">
                <BaseHeading
                  tag="h3"
                  size="md"
                  weight="medium"
                  lead="none"
                  class="text-muted-900 dar:text-white"
                >
                  {{ item?.username || 'Usuário' }}
                </BaseHeading>
                <BaseParagraph size="xs" class="text-muted-600 dark:text-muted-400">
                  {{ item?.position || 'Sem cargo' }}
                </BaseParagraph>
              </div>
              <div class="mb-6 mt-4 flex items-center justify-center gap-3">
                <BaseAvatar
                  v-for="relation in (item?.relations || []).slice(0, 3)"
                  :key="relation?.id || Math.random()"
                  size="xs"
                  :src="relation?.src || null"
                  :text="relation?.text || 'R'"
                  :class="getRandomColor()"
                />
              </div>
              <div class="flex items-center gap-2">
                <BaseButton 
                  rounded="sm" 
                  class="w-full"
                  @click="editUser(item)"
                >
                  <Icon name="solar:pen-linear" class="size-4" />
                  <span>Editar</span>
                </BaseButton>
              </div>
            </BaseCard>
          </TransitionGroup>
        </div>
        <div v-if="!pending && data?.data.length !== 0" class="mt-4">
          <BasePagination
            v-model:page="page"
            :total="data?.total ?? 0"
            :items-per-page="perPage"
            rounded="lg"
            class="w-full"
          />
        </div>
      </div>
    </TairoContentWrapper>
  </div>
</template>
