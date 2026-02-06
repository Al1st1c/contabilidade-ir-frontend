<script setup lang="ts">
import { PanelsPanelDeclarationDetails } from '#components'
import { onClickOutside } from '@vueuse/core'
import { useAppState } from '~/composables/useAppState'
import { useApi, useAuth } from '~/composables/useAuth'

const { useCustomFetch } = useApi()
const { open } = usePanels()
const { user } = useAuth()
const { selectedEmployeeId } = useAppState()

// State
const members = ref<any[]>([])
const recentDeclarations = ref<any[]>([])
const isLoading = ref(true)
const searchMembers = ref('')
const searchDeclarations = ref('')

const target = ref(null)
const openDropdown = ref(false)

// Selected tenant info
const tenant = ref<any>(null)

const canViewAll = computed(() => {
  const roleName = user.value?.role?.name?.toLowerCase()
  return roleName === 'master' || roleName === 'admin' || user.value?.role?.canViewAllCards
})

// Fetch data when dropdown opens
async function fetchData() {
  if (members.value.length > 0)
    return // Already loaded

  isLoading.value = true
  try {
    const { data: res } = await useCustomFetch<any>('/declarations/workspace-data')

    if (res && res.success) {
      const payload = res.data
      tenant.value = payload.tenant
      recentDeclarations.value = payload.recent || []
      members.value = payload.members || []
    }
  }
  catch (error) {
    console.error('Error fetching workspace data:', error)
  }
  finally {
    isLoading.value = false
  }
}

function toggleDropdown() {
  openDropdown.value = !openDropdown.value
  if (openDropdown.value) {
    fetchData()
  }
}

onClickOutside(
  target,
  () => {
    openDropdown.value = false
  },
)

// Filtered lists
const filteredMembers = computed(() => {
  if (!searchMembers.value)
    return members.value
  const term = searchMembers.value.toLowerCase()
  return members.value.filter(m => m.name?.toLowerCase().includes(term))
})

const filteredDeclarations = computed(() => {
  if (!searchDeclarations.value)
    return recentDeclarations.value
  const term = searchDeclarations.value.toLowerCase()
  return recentDeclarations.value.filter(d =>
    d.clientName?.toLowerCase().includes(term)
    || d.cpf?.includes(term),
  )
})

function openDetails(id: string) {
  openDropdown.value = false
  open(PanelsPanelDeclarationDetails, {
    declarationId: id,
  })
}

function selectEmployee(id: string | null) {
  if (!canViewAll.value)
    return
  selectedEmployeeId.value = id || ''
  openDropdown.value = false
}

// Navigate to create pages
const router = useRouter()

function goToCreateMember() {
  openDropdown.value = false
  router.push('/dashboard/settings/team')
}

function goToCreateDeclaration() {
  openDropdown.value = false
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

const selectedMemberName = computed(() => {
  if (!selectedEmployeeId.value)
    return null
  return members.value.find(m => m.id === selectedEmployeeId.value)?.name || 'Filtrado'
})
</script>

<template>
  <div ref="target" class="group/workspace relative w-full !z-[60]">
    <button type="button"
      class="w-full max-w-[170px] rounded-lg py-1.5 pe-3 ps-2 border border-muted-200 dark:border-muted-800 transition-colors duration-300 hover:bg-muted-100 dark:hover:bg-muted-900/60 md:max-w-[240px]"
      :class="openDropdown && 'bg-muted-100 dark:bg-muted-900/60'" @click="toggleDropdown()">
      <span class="flex w-full items-center gap-3 text-start">
        <BaseAvatar size="xxs" :src="tenant?.logo" :text="tenant?.tradeName?.charAt(0) || 'E'" />
        <div class="flex-1 min-w-0">
          <BaseText size="sm" class="line-clamp-1 block text-muted-800 dark:text-muted-200 font-medium">
            {{ tenant?.tradeName || 'Meu Escritório' }}
          </BaseText>
          <BaseText v-if="selectedMemberName" size="xs" class="text-primary-500 font-bold truncate block -mt-1">
            {{ selectedMemberName }}
          </BaseText>
        </div>
        <Icon name="lucide:chevrons-up-down" class="ms-auto size-4 text-muted-400 transition-transform duration-300"
          :class="openDropdown && 'rotate-180'" />
      </span>
    </button>
    <Transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
      <div v-if="openDropdown"
        class="absolute end-0 top-12 w-full min-w-[280px] overflow-hidden rounded-xl border border-muted-200 bg-white shadow-xl shadow-muted-400/10 dark:border-muted-800 dark:bg-muted-950 dark:shadow-muted-800/10 md:start-0 md:min-w-[575px] !z-[60]">
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
            </div>
            <div class="flex h-[calc(100%_-_2.5rem)] flex-col p-3">
              <div class="flex items-center justify-between mb-2">
                <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-400">
                  Visualizar por
                </BaseHeading>
                <button v-if="selectedEmployeeId" type="button"
                  class="text-[10px] text-primary-500 font-bold uppercase hover:underline"
                  @click="selectEmployee(null)">
                  Limpar Filtro
                </button>
              </div>
              <div class="my-1 xs:nui-slimscroll xs:max-h-[160px] xs:min-h-[160px]">
                <!-- Loading -->
                <div v-if="isLoading" class="space-y-2">
                  <BasePlaceload v-for="i in 3" :key="i" class="h-10 w-full rounded-lg" />
                </div>
                <!-- Members List -->
                <ul v-else-if="filteredMembers.length > 0" class="space-y-1">
                  <!-- All Option -->
                  <li>
                    <button type="button"
                      class="flex w-full items-center gap-2 rounded-lg py-2 pe-4 ps-2 transition-colors duration-200 hover:bg-muted-100 dark:hover:bg-muted-800 text-start"
                      :class="!selectedEmployeeId && 'bg-primary-500/5 text-primary-600'" @click="selectEmployee(null)">
                      <div
                        class="size-6 rounded-full bg-muted-200 dark:bg-muted-800 flex items-center justify-center shrink-0">
                        <Icon name="lucide:users" class="size-3" />
                      </div>
                      <BaseText size="sm" class="truncate block font-medium">
                        Todos os Funcionários
                      </BaseText>
                      <Icon v-if="!selectedEmployeeId" name="lucide:check" class="ms-auto size-3" />
                    </button>
                  </li>
                  <li v-for="member in filteredMembers" :key="member.id">
                    <button type="button"
                      class="flex w-full items-center gap-2 rounded-lg py-2 pe-4 ps-2 transition-colors duration-200 hover:bg-muted-100 dark:hover:bg-muted-800 text-start"
                      :class="selectedEmployeeId === member.id && 'bg-primary-500/5 text-primary-600'"
                      @click="selectEmployee(member.id)">
                      <BaseAvatar size="xxs" :src="member.photo" :text="member.name?.charAt(0)" />
                      <div class="flex-1 min-w-0">
                        <BaseText size="sm" class="truncate block font-medium">
                          {{ member.name }}
                        </BaseText>
                      </div>
                      <Icon v-if="selectedEmployeeId === member.id" name="lucide:check" class="ms-auto size-3" />
                      <span v-else class="size-2 rounded-full shrink-0" :class="getRoleBadgeColor(member.role?.name)" />
                    </button>
                  </li>
                </ul>
                <!-- Empty State -->
                <div v-else class="text-center py-4">
                  <BaseParagraph size="xs" class="text-muted-400">
                    Nenhum funcionário encontrado
                  </BaseParagraph>
                </div>
              </div>
              <div class="mt-auto pt-2 border-t border-muted-100 dark:border-muted-800">
                <BaseButton rounded="md" size="sm" class="w-full" @click="goToCreateMember">
                  <Icon name="lucide:plus" class="size-3.5" />
                  <span>Gerenciar Equipe</span>
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
            </div>
            <div class="flex h-[calc(100%_-_2.5rem)] flex-col p-3">
              <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-400 mb-2">
                Atalhos Rápidos
              </BaseHeading>
              <div class="my-1 xs:nui-slimscroll xs:max-h-[160px] xs:min-h-[160px]">
                <!-- Loading -->
                <div v-if="isLoading" class="space-y-2">
                  <BasePlaceload v-for="i in 3" :key="i" class="h-12 w-full rounded-lg" />
                </div>
                <!-- Declarations List -->
                <ul v-else-if="filteredDeclarations.length > 0" class="space-y-1">
                  <li v-for="declaration in filteredDeclarations" :key="declaration.id">
                    <button type="button"
                      class="flex w-full items-center gap-3 rounded-lg py-2 px-2 transition-colors duration-200 hover:bg-muted-100 dark:hover:bg-muted-800 text-start"
                      @click="openDetails(declaration.id)">
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
                    </button>
                  </li>
                </ul>
                <!-- Empty State -->
                <div v-else class="text-center py-4">
                  <BaseHeading size="sm" weight="medium">
                    Nenhuma declaração
                  </BaseHeading>
                  <BaseParagraph size="xs" class="text-muted-400">
                    Crie seu primeiro IR
                  </BaseParagraph>
                </div>
              </div>
              <div class="mt-auto pt-2 border-t border-muted-100 dark:border-muted-800">
                <BaseButton rounded="md" variant="dark" size="sm" class="w-full" @click="goToCreateDeclaration">
                  <Icon name="lucide:plus" class="size-3.5" />
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
