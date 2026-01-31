<script setup lang="ts">
import { useApi } from '~/composables/useAuth'
import PanelAddTeamUser from '~/components/panels/PanelAddTeamUser.vue'

definePageMeta({
  title: 'Equipe',
  preview: {
    title: 'Gestão da Equipe',
    description: 'Gerenciamento de usuários da equipe',
    categories: ['layouts'],
    src: '/img/screens/layouts-members.png',
    srcDark: '/img/screens/layouts-members-dark.png',
    order: 37,
  },
})

const { useCustomFetch } = useApi()
const route = useRoute()
const router = useRouter()
const { open } = usePanels()

const page = computed(() => Number.parseInt((route.query.page as string) ?? '1', 10))
const filter = ref('')
const perPage = ref(45)
const pending = ref(false)
const data = ref<any>({ data: [], total: 0 })

watch([filter, perPage], () => {
  router.push({
    query: {
      page: undefined,
    },
  })
})

const query = computed(() => {
  return {
    filter: filter.value,
    perPage: perPage.value,
    page: page.value,
  }
})

// Fetch team members from API
async function fetchMembers() {
  pending.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/tenant/members')

    if (response?.success && response?.data) {
      // Transform data to match expected format
      data.value = {
        data: response.data.map((member: any) => ({
          id: member.id,
          slug: member.id, // Using ID as slug for navigation
          name: member.name,
          email: member.email,
          picture: member.photo,
          phone: member.phone,
          role: {
            label: getRoleLabel(member.role?.name),
            value: member.role?.name,
            description: member.role?.description,
            permissions: member.role,
          },
          position: member.role?.description, // Use role description as position for now
          isActive: member.isActive,
          status: member.status || 'ACTIVE', // PENDING_INVITE, ACTIVE, INACTIVE
          createdAt: member.createdAt,
          lastLoginAt: member.lastLoginAt,
          assignedDeclarations: member.assignedDeclarations,
        })),
        total: response.data.length,
      }
    }
  } catch (error) {
    console.error('Erro ao buscar membros:', error)
    data.value = { data: [], total: 0 }
  } finally {
    pending.value = false
  }
}

// Helper to get role label
function getRoleLabel(roleName: string): string {
  const roles: Record<string, string> = {
    master: 'Administrador',
    admin: 'Gerente',
    accountant: 'Contador',
    contador: 'Contador',
    assistant: 'Assistente',
    assistente: 'Assistente',
    viewer: 'Visualizador',
  }
  return roles[roleName] || roleName || 'Membro'
}

// Fetch on mount
onMounted(() => {
  fetchMembers()
})

// Current selected member
const currentMember = ref<any>(null)

// Watch route changes to update current member
watch(() => route.params.slug, (slug) => {
  if (slug && data.value?.data) {
    currentMember.value = data.value.data.find((m: any) => m.slug === slug)
  }
}, { immediate: true })

// Open panel to add new member
function openAddMemberPanel() {
  open(PanelAddTeamUser, {
    onSuccess: async () => {
      await fetchMembers()
    }
  })
}
</script>

<template>
  <div class="w-full pb-20">
    <!-- Header -->
    <div class="flex items-center justify-between pb-6">
      <div>
        <BaseHeading tag="h1" size="2xl" weight="medium">
          Equipe
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-400">
          Gerencie os membros da sua equipe
        </BaseParagraph>
      </div>
      <!-- Buttons -->
      <div class="hidden items-center gap-2 md:flex">
        <BaseButton rounded="md" size="sm" variant="primary" @click="openAddMemberPanel">
          <Icon name="solar:user-plus-rounded-linear" class="size-4" />
          <span>Convidar Membro</span>
        </BaseButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-20">
      <div class="text-center">
        <Icon name="svg-spinners:blocks-shuffle-3" class="size-12 text-primary-500 mx-auto mb-4" />
        <BaseText size="sm" class="text-muted-400">Carregando membros...</BaseText>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!data?.data?.length" class="py-10">
      <BasePlaceholderPage title="Nenhum membro encontrado"
        subtitle="Você ainda não possui membros na equipe. Convide alguém para começar.">
        <template #image>
          <img class="block dark:hidden" src="/img/illustrations/placeholders/flat/placeholder-search-2.svg"
            alt="Sem membros" />
          <img class="hidden dark:block" src="/img/illustrations/placeholders/flat/placeholder-search-2-dark.svg"
            alt="Sem membros" />
        </template>
        <template #action>
          <BaseButton variant="primary" @click="openAddMemberPanel">
            <Icon name="solar:user-plus-rounded-linear" class="size-4" />
            <span>Convidar Membro</span>
          </BaseButton>
        </template>
      </BasePlaceholderPage>
    </div>

    <!-- Content Grid -->
    <div v-else class="grid grid-cols-12 gap-6">
      <!-- Navigation - Members List -->
      <div class="col-span-12 lg:col-span-5">
        <BaseCard rounded="lg" class="p-2">
          <ul class="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-x-hidden max-h-[600px] overflow-y-auto">
            <li v-for="member in data?.data" :key="member.id" role="button" tabindex="0"
              @click="currentMember = member">
              <NuxtLink :to="`/dashboard/settings/team/${member.slug}`"
                class="hover:bg-muted-200/80 dark:hover:bg-muted-800/60 flex items-center gap-3 rounded-xl p-3 transition-colors"
                :class="{ 'bg-muted-200/80 dark:bg-muted-800/60': currentMember?.id === member.id }">
                <div class="relative">
                  <BaseAvatar :src="member.picture" :text="member.name?.charAt(0) || 'U'" size="sm" />
                  <!-- Pending invite indicator -->
                  <span v-if="member.status === 'PENDING_INVITE'"
                    class="absolute -top-1 -right-1 size-3 bg-warning-500 rounded-full border-2 border-white dark:border-muted-800"
                    title="Convite pendente" />
                </div>
                <div class="flex-1 min-w-0">
                  <BaseHeading weight="medium" size="sm" lead="tight"
                    class="line-clamp-1 text-muted-800 dark:text-muted-100">
                    {{ member.name }}
                  </BaseHeading>
                  <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400 line-clamp-1">
                    {{ member.email }}
                  </BaseParagraph>
                </div>
                <div class="ms-auto hidden sm:flex items-center gap-2">
                  <BaseTag v-if="member.status === 'PENDING_INVITE'" rounded="lg" size="sm" color="warning">
                    Pendente
                  </BaseTag>
                  <BaseTag rounded="lg" size="sm" :color="member.role.value === 'master' ? 'primary' : 'muted'">
                    {{ member.role.label }}
                  </BaseTag>
                </div>
              </NuxtLink>
            </li>
          </ul>
        </BaseCard>
      </div>

      <!-- Member Details -->
      <div class="col-span-12 lg:col-span-7">
        <NuxtPage v-if="currentMember !== undefined && $route.params.slug" />
        <BaseCard v-else rounded="lg">
          <div class="p-6">
            <div class="py-10 text-center">
              <Icon name="solar:users-group-rounded-bold-duotone"
                class="size-16 text-muted-300 dark:text-muted-700 mx-auto mb-4" />
              <BaseHeading weight="medium" size="xl" lead="none" class="mb-2 text-muted-800 dark:text-muted-100">
                Selecione um membro
              </BaseHeading>
              <BaseParagraph size="sm" class="text-muted-400 mx-auto max-w-xs">
                Clique em um membro da lista para ver seus detalhes e gerenciar suas permissões.
              </BaseParagraph>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
