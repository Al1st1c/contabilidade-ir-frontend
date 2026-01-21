<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { useApi } from '~/composables/useAuth'

const { useCustomFetch } = useApi()

// State
const members = ref<any[]>([])
const recentDeclarations = ref<any[]>([])
const isLoading = ref(true)
const searchMembers = ref('')
const searchDeclarations = ref('')

const target = ref(null)
const open = ref(false)

// Selected tenant info
const tenant = ref<any>(null)

// Fetch data when dropdown opens
async function fetchData() {
  if (members.value.length > 0) return // Already loaded

  isLoading.value = true
  try {
    // Fetch team members
    const { data: membersData } = await useCustomFetch<any>('/tenant/members')
    if (membersData.success) {
      members.value = membersData.data || []
    }

    // Fetch recent declarations (last 3 updated)
    const { data: declarationsData } = await useCustomFetch<any>('/declarations/kanban?taxYear=2024')
    if (declarationsData.success) {
      // Flatten all cards from columns and sort by updatedAt
      const allCards: any[] = []
      declarationsData.data?.columns?.forEach((col: any) => {
        col.cards?.forEach((card: any) => {
          allCards.push({
            ...card,
            columnName: col.title
          })
        })
      })
      // Sort by updatedAt and take last 3
      recentDeclarations.value = allCards
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
        .slice(0, 3)
    }

    // Fetch tenant info
    const { data: tenantData } = await useCustomFetch<any>('/tenant')
    if (tenantData.success) {
      tenant.value = tenantData.data
    }
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    isLoading.value = false
  }
}

function toggleDropdown() {
  open.value = !open.value
  if (open.value) {
    fetchData()
  }
}

onClickOutside(
  target,
  () => {
    open.value = false
  },
)

// Filtered lists
const filteredMembers = computed(() => {
  if (!searchMembers.value) return members.value
  const term = searchMembers.value.toLowerCase()
  return members.value.filter(m => m.name?.toLowerCase().includes(term))
})

const filteredDeclarations = computed(() => {
  if (!searchDeclarations.value) return recentDeclarations.value
  const term = searchDeclarations.value.toLowerCase()
  return recentDeclarations.value.filter(d =>
    d.clientName?.toLowerCase().includes(term) ||
    d.cpf?.includes(term)
  )
})

// Navigate to create pages
const router = useRouter()

function goToCreateMember() {
  open.value = false
  router.push('/dashboard/settings/team')
}

function goToCreateDeclaration() {
  open.value = false
  router.push('/dashboard/ir')
}

// Role badge color
function getRoleBadgeColor(roleName: string) {
  switch (roleName?.toLowerCase()) {
    case 'master': return 'bg-amber-500'
    case 'admin': return 'bg-purple-500'
    case 'contador': return 'bg-blue-500'
    default: return 'bg-emerald-500'
  }
}
</script>

<template>
  <div ref="target" class="group/workspace relative w-full">
    <button type="button"
      class="w-full max-w-[170px] rounded-lg py-1.5 pe-3 ps-2 border border-muted-200 dark:border-muted-800 transition-colors duration-300 group-hover/workspace:bg-muted-100 dark:group-hover/workspace:bg-muted-900/60 md:max-w-[240px]"
      :class="open && 'bg-muted-100 dark:bg-muted-900/60'" @click="toggleDropdown()">
      <span class="flex w-full items-center gap-3 text-start">
        <BaseAvatar size="xxs" :src="tenant?.logo" :text="tenant?.tradeName?.charAt(0) || 'E'" />
        <div>
          <BaseText size="sm" class="line-clamp-1 block text-muted-800 dark:text-muted-200">
            {{ tenant?.tradeName || 'Meu Escritório' }}
          </BaseText>
        </div>
        <Icon name="lucide:chevrons-up-down" class="ms-auto size-4 text-muted-400 transition-transform duration-300"
          :class="open && 'rotate-180'" />
      </span>
    </button>
    <Transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
      <div v-if="open"
        class="absolute end-0 top-12 w-full min-w-[280px] overflow-hidden rounded-xl border border-muted-200 bg-white shadow-xl shadow-muted-400/10 dark:border-muted-800 dark:bg-muted-950 dark:shadow-muted-800/10 md:start-0 md:min-w-[575px] z-[100]">
        <div class="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-muted-200 md:dark:divide-muted-800">
          <!-- Left: Team Members -->
          <div>
            <div class="font-sans flex items-center border-b border-muted-200 dark:border-muted-800">
              <div class="shrink-0 size-8 flex items-center justify-center">
                <Icon name="lucide:search" class="size-4 text-muted-400 dark:text-muted-100" />
              </div>
              <input v-model="searchMembers" type="text"
                class="h-10 px-2 w-full border-none outline-none bg-transparent text-sm text-muted-700 dark:text-muted-100"
                placeholder="Buscar funcionário...">
              <button type="button"
                class="me-2 ms-auto rounded-lg border border-muted-200 px-2 py-0.5 dark:border-muted-800">
                <BaseText size="xs">
                  Esc
                </BaseText>
              </button>
            </div>
            <div class="flex h-[calc(100%_-_2.5rem)] flex-col p-3">
              <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-400">
                Equipe
              </BaseHeading>
              <div class="my-3 xs:nui-slimscroll xs:max-h-[128px] xs:min-h-[128px]">
                <!-- Loading -->
                <div v-if="isLoading" class="space-y-2">
                  <BasePlaceload v-for="i in 3" :key="i" class="h-10 w-full rounded-lg" />
                </div>
                <!-- Members List -->
                <ul v-else-if="filteredMembers.length > 0" class="space-y-1">
                  <li v-for="member in filteredMembers" :key="member.id">
                    <NuxtLink to="/dashboard/settings/team"
                      class="flex w-full items-center gap-2 rounded-lg py-2 pe-4 ps-2 transition-colors duration-200 hover:bg-muted-100 dark:hover:bg-muted-800"
                      @click="open = false">
                      <BaseAvatar size="xxs" :src="member.photo" :text="member.name?.charAt(0)" />
                      <div class="flex-1 min-w-0">
                        <BaseText size="sm" class="truncate block">
                          {{ member.name }}
                        </BaseText>
                      </div>
                      <span class="size-2 rounded-full" :class="getRoleBadgeColor(member.role?.name)" />
                    </NuxtLink>
                  </li>
                </ul>
                <!-- Empty State -->
                <div v-else class="text-center py-4">
                  <BaseParagraph size="xs" class="text-muted-400">
                    Nenhum funcionário encontrado
                  </BaseParagraph>
                </div>
              </div>
              <div class="mt-auto">
                <BaseButton rounded="md" class="w-full" @click="goToCreateMember">
                  <Icon name="lucide:plus" class="size-4" />
                  <span>Criar Funcionário</span>
                </BaseButton>
              </div>
            </div>
          </div>

          <!-- Right: Recent Declarations -->
          <div class="block">
            <div class="font-sans flex items-center border-b border-muted-200 dark:border-muted-800">
              <div class="shrink-0 size-8 flex items-center justify-center">
                <Icon name="lucide:search" class="size-4 text-muted-400 dark:text-muted-100" />
              </div>
              <input v-model="searchDeclarations" type="text"
                class="h-10 px-2 w-full border-none outline-none bg-transparent text-sm text-muted-700 dark:text-muted-100"
                placeholder="Buscar declaração...">
              <button type="button"
                class="me-2 ms-auto rounded-lg border border-muted-200 px-2 py-0.5 dark:border-muted-800">
                <BaseText size="xs">
                  Esc
                </BaseText>
              </button>
            </div>
            <div class="flex h-[calc(100%_-_2.5rem)] flex-col p-3">
              <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-400">
                Declarações Recentes
              </BaseHeading>
              <div class="my-3 xs:nui-slimscroll xs:max-h-[128px] xs:min-h-[128px]">
                <!-- Loading -->
                <div v-if="isLoading" class="space-y-2">
                  <BasePlaceload v-for="i in 3" :key="i" class="h-12 w-full rounded-lg" />
                </div>
                <!-- Declarations List -->
                <ul v-else-if="filteredDeclarations.length > 0" class="space-y-1">
                  <li v-for="declaration in filteredDeclarations" :key="declaration.id">
                    <NuxtLink to="/dashboard/ir"
                      class="flex w-full items-center gap-3 rounded-lg py-2 px-2 transition-colors duration-200 hover:bg-muted-100 dark:hover:bg-muted-800"
                      @click="open = false">
                      <div class="size-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
                        <Icon name="lucide:file-text" class="size-4 text-primary-500" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <BaseText size="sm" class="truncate block font-medium">
                          {{ declaration.clientName }}
                        </BaseText>
                        <BaseText size="xs" class="text-muted-400">
                          {{ declaration.taxYear }} · {{ declaration.columnName }}
                        </BaseText>
                      </div>
                    </NuxtLink>
                  </li>
                </ul>
                <!-- Empty State -->
                <div v-else>
                  <BaseHeading size="sm" weight="medium">
                    Nenhuma declaração ainda
                  </BaseHeading>
                  <BaseParagraph size="xs" class="text-muted-400">
                    Crie sua primeira declaração de IR
                  </BaseParagraph>
                </div>
              </div>
              <div class="mt-auto">
                <BaseButton rounded="md" variant="dark" class="w-full" @click="goToCreateDeclaration">
                  <Icon name="lucide:plus" class="size-4" />
                  <span>Criar Novo IR</span>
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
