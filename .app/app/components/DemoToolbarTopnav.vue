<script setup lang="ts">
import { PanelsPanelNotifications } from '#components'
import { useApi, useAuth } from '~/composables/useAuth'

const { user, logout } = useAuth()
const { useCustomFetch } = useApi()
const { open } = usePanels()

// Notifications count
const notificationCount = ref(0)
const hasCritical = ref(false)
const { dismissedIds } = useNotifications()

// Display count shows only NEW notifications (ones not dismissed)
const displayCount = computed(() => notificationCount.value)

async function fetchNotificationCount() {
  try {
    const year = new Date().getFullYear()
    const response = await useCustomFetch<any>(`/declarations/dashboard-stats?taxYear=${year}`)

    if (response?.data?.success) {
      const alerts = response.data.data.alerts || {}

      // Helper to count non-dismissed items
      const countNew = (items: any[] | undefined, type: string) => {
        if (!items)
          return 0
        return items.filter(item => !dismissedIds.value.includes(`${item.id}-${type}`)).length
      }

      const total
        = countNew(alerts.errors, 'error')
          + countNew(alerts.nearDeadline, 'deadline')
          + countNew(alerts.waitingDocs, 'docs')
          + countNew(alerts.checklistCompleted, 'completed')
          + countNew(alerts.finalReview, 'review')
          + countNew(alerts.stuckClients, 'stuck')

      notificationCount.value = total
      hasCritical.value = countNew(alerts.errors, 'error') > 0
    }
  }
  catch (e) {
    console.error('Error fetching notification count:', e)
  }
}

onMounted(() => {
  fetchNotificationCount()
  // Refresh every 2 minutes
  setInterval(fetchNotificationCount, 120000)
})

function openNotifications() {
  open(PanelsPanelNotifications, {})
}
</script>

<template>
  <div class="flex items-center gap-3 flex-1 justify-end">
    <div class="scale-[0.8]">
      <BaseThemeSwitch />
    </div>

    <!-- Notifications Button -->
    <button
      type="button"
      class="relative inline-flex size-10 items-center justify-center rounded-full hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors"
      @click="openNotifications"
    >
      <Icon name="solar:bell-bold-duotone" class="size-5 text-muted-400" />

      <!-- Badge -->
      <span
        v-if="displayCount > 0"
        class="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full"
        :class="hasCritical ? 'bg-danger-500 animate-pulse' : 'bg-primary-500'"
      >
        {{ displayCount > 99 ? '99+' : displayCount }}
      </span>
    </button>

    <div class="group inline-flex items-center justify-center text-end">
      <DropdownMenuRoot>
        <DropdownMenuTrigger
          class="group-hover:ring-primary-500 dark:ring-offset-muted-800 inline-flex size-10 items-center justify-center rounded-full ring-1 ring-transparent transition-all duration-300 group-hover:ring-offset-4 outline-none"
        >
          <BaseChip size="sm" color="custom" :offset="3" class="text-success-500">
            <BaseAvatar
              size="sm" :src="user?.photo || '/img/avatars/placeholder.jpg'"
              class="object-cover ring-2 ring-muted-200 dark:ring-muted-800"
            />
          </BaseChip>
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
          <DropdownMenuContent
            align="end" :side-offset="12"
            class="z-[100] border-muted-200 dark:border-muted-700 dark:bg-muted-950 mt-2 w-56 origin-bottom-right rounded-md border bg-white p-2 shadow-xl outline-none"
          >
            <!-- User Info Header -->
            <div class="px-3 py-2 border-b border-muted-100 dark:border-muted-800 mb-1">
              <p class="text-[10px] font-bold text-muted-400 uppercase tracking-widest">
                Usuário
              </p>
              <p class="text-xs font-semibold text-muted-800 dark:text-muted-100 truncate pb-1">
                {{ user?.name || 'Administrador' }}
              </p>
            </div>

            <DropdownMenuItem as="div">
              <button
                type="button"
                class="group/item flex w-full items-center gap-3 rounded-md p-2 text-sm transition-colors duration-300 hover:bg-muted-100 dark:hover:bg-muted-800 outline-none text-muted-600 dark:text-muted-400"
                @click="logout"
              >
                <div
                  class="flex size-7 items-center justify-center rounded-lg bg-muted-100 dark:bg-muted-800 group-hover/item:bg-primary-500/10"
                >
                  <Icon name="solar:logout-3-linear" class="size-4 group-hover/item:text-primary-500" />
                </div>
                <div class="text-start">
                  <h6 class="text-xs font-semibold text-muted-800 dark:text-white leading-none">
                    Sair
                  </h6>
                  <p class="text-[10px] text-muted-400 mt-0.5">
                    Encerrar sessão
                  </p>
                </div>
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>
  </div>
</template>
