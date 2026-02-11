<script setup lang="ts">
import { PanelsPanelDeclarationDetails } from '#components'
import { useApi } from '~/composables/useAuth'

const props = defineProps<{
  onClose?: () => void
}>()

const { useCustomFetch } = useApi()
const { open, close } = usePanels()

// State
const isLoading = ref(true)
const notifications = ref<any[]>([])
const activeTab = ref<'new' | 'history'>('new')
const { dismissedIds, dismiss, restore } = useNotifications()

// Fetch notifications (same alerts from dashboard)
async function fetchNotifications() {
  isLoading.value = true
  try {
    const year = new Date().getFullYear()
    const response = await useCustomFetch<any>(`/declarations/dashboard-stats?taxYear=${year}`)

    if (response?.data?.success) {
      const alerts = response.data.data.alerts || {}
      const items: any[] = []

      // Helper to add notification with common properties
      const add = (item: any, type: string, icon: string, color: string, title: string, description: string, timeLabel: string, priority: number) => {
        items.push({
          id: item.id,
          uid: `${item.id}-${type}`, // Unique ID for dismissal
          type,
          icon,
          color,
          title,
          description,
          timeLabel,
          priority,
          updatedAt: new Date(item.updatedAt || Date.now()),
        })
      }

      // Errors
      alerts.errors?.forEach((item: any) => add(item, 'error', 'solar:danger-bold', 'text-danger-500 bg-danger-500/10', 'Retificação Urgente', item.client?.name || 'Cliente', 'Ação imediata', 1))

      // Near deadline
      alerts.nearDeadline?.forEach((item: any) => add(item, 'deadline', 'solar:alarm-bold', 'text-primary-500 bg-primary-500/10', 'Prazo Próximo', item.client?.name || 'Cliente', 'Próximos 5 dias', 2))

      // Waiting docs
      alerts.waitingDocs?.forEach((item: any) => add(item, 'docs', 'solar:document-add-bold', 'text-primary-500 bg-primary-500/10', 'Aguardando Documentos', item.client?.name || 'Cliente', 'Pendente', 3))

      // Checklist completed
      alerts.checklistCompleted?.forEach((item: any) => add(item, 'completed', 'solar:check-read-bold', 'text-primary-500 bg-primary-500/10', 'Documentos Recebidos', `${item.client?.name || 'Cliente'} enviou tudo`, 'Checklist concluído', 3))

      // Final Review
      alerts.finalReview?.forEach((item: any) => add(item, 'review', 'solar:clipboard-check-bold', 'text-primary-500 bg-primary-500/10', 'Revisão Final', `${item.client?.name || 'Cliente'} aguarda revisão`, 'Pronto para transmitir', 3))

      // Stuck clients
      alerts.stuckClients?.forEach((item: any) => add(item, 'stuck', 'solar:hourglass-line-bold', 'text-muted-500 bg-muted-500/10', 'Fluxo Travado', `${item.client?.name || 'Cliente'} - ${item.column?.name}`, '> 7 dias sem ação', 4))

      // Sort by updatedAt DESC (most recent first)
      notifications.value = items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    }
  }
  catch (e) {
    console.error('Error fetching notifications:', e)
  }
  finally {
    isLoading.value = false
  }
}

// Computed filters
const newNotifications = computed(() => notifications.value.filter(n => !dismissedIds.value.includes(n.uid)))
const historyNotifications = computed(() => notifications.value.filter(n => dismissedIds.value.includes(n.uid)))
const displayNotifications = computed(() => activeTab.value === 'new' ? newNotifications.value : historyNotifications.value)

const newCount = computed(() => newNotifications.value.length)
const historyCount = computed(() => historyNotifications.value.length)
const criticalCount = computed(() => newNotifications.value.filter(n => n.type === 'error').length)

onMounted(() => {
  fetchNotifications()
})

function handleItemClick(notification: any) {
  close()
  setTimeout(() => {
    open(PanelsPanelDeclarationDetails, {
      declarationId: notification.id,
      onSaved: () => fetchNotifications(),
    })
  }, 150)
}

function dismissNotification(uid: string) {
  dismiss(uid)
}

function restoreNotification(uid: string) {
  restore(uid)
}

// Format date relative
function formatTime(date: Date) {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  if (mins < 1)
    return 'Agora mesmo'
  if (mins < 60)
    return `Há ${mins}m`
  if (hours < 24)
    return `Há ${hours}h`
  return `Há ${days}d`
}
</script>

<template>
  <!-- <TairoPanelComponent enable-search title="Notificações"> -->
  <FocusScope class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white" trapped loop>
    <!-- Header -->
    <div class="border-muted-200 dark:border-muted-800 flex h-20 w-full items-center justify-between border-b px-6">
      <div class="flex items-center gap-3">
        <div class="size-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
          <Icon name="solar:bell-bold-duotone" class="size-5" />
        </div>
        <div>
          <BaseHeading size="lg" weight="semibold" class="text-muted-900 dark:text-white leading-tight">
            Notificações
          </BaseHeading>
          <BaseParagraph size="xs" class="text-muted-400">
            {{ newCount }} pendências • {{ criticalCount }} críticas
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
      <!-- Tabs Container -->
      <div class="px-4 mt-4">
        <div class="flex items-center p-1 rounded-xl bg-muted-100 dark:bg-muted-900 overflow-hidden">
          <button v-for="tab in (['new', 'history'] as const)" :key="tab"
            class="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg transition-all" :class="[
              activeTab === tab
                ? 'bg-white dark:bg-muted-800 text-primary-600 shadow-sm border border-muted-200 dark:border-muted-700'
                : 'text-muted-500 hover:text-muted-700 dark:hover:text-muted-300',
            ]" @click="activeTab = tab">
            <span class="flex items-center justify-center gap-2">
              {{ tab === 'new' ? 'Novos' : 'Histórico' }}
              <span class="px-1.5 py-0.5 rounded-md text-[10px]" :class="[
                activeTab === tab
                  ? 'bg-primary-500 text-white'
                  : 'bg-muted-200 dark:bg-muted-800 text-muted-500',
              ]">
                {{ tab === 'new' ? newCount : historyCount }}
              </span>
            </span>
          </button>
        </div>
      </div>

      <div class="p-4">
        <!-- Loading -->
        <div v-if="isLoading" class="space-y-3">
          <div v-for="i in 4" :key="i" class="animate-pulse">
            <div class="flex items-center gap-3 p-3 rounded-xl bg-muted-100 dark:bg-muted-900">
              <div class="size-10 rounded-xl bg-muted-200 dark:bg-muted-800" />
              <div class="flex-1 space-y-2">
                <div class="h-3 w-24 bg-muted-200 dark:bg-muted-800 rounded" />
                <div class="h-2 w-32 bg-muted-200 dark:bg-muted-800 rounded" />
              </div>
            </div>
          </div>
        </div>

        <!-- Notifications List -->
        <div v-else-if="displayNotifications.length > 0" class="space-y-2">
          <div v-for="notification in displayNotifications" :key="notification.uid"
            class="group relative cursor-pointer" @click="handleItemClick(notification)">
            <BaseCard rounded="lg" elevated-hover class="p-3 transition-all group-hover:border-primary-500!">
              <div class="flex items-start gap-3">
                <!-- Icon -->
                <div class="size-10 rounded-xl flex items-center justify-center shrink-0" :class="notification.color">
                  <Icon :name="notification.icon" class="size-5" />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-900 dark:text-white truncate">
                      {{ notification.title }}
                    </BaseHeading>
                    <span v-if="notification.type === 'error'"
                      class="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-danger-500 text-white rounded shrink-0">
                      Crítico
                    </span>
                  </div>
                  <BaseParagraph size="xs" class="text-muted-500 truncate mt-0.5">
                    {{ notification.description }}
                  </BaseParagraph>
                  <div class="flex items-center gap-2 mt-1.5">
                    <span class="text-[10px] text-muted-400">
                      {{ notification.timeLabel }}
                    </span>
                    <span class="text-[10px] text-muted-300">•</span>
                    <span class="text-[10px] text-muted-400">
                      {{ formatTime(notification.updatedAt) }}
                    </span>
                  </div>
                </div>

                <!-- Actions Area -->
                <div class="flex flex-col items-center gap-2">
                  <!-- Dismiss (X) -->
                  <button v-if="activeTab === 'new'"
                    class="p-1 rounded-lg hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-400 hover:text-danger-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Mover para histórico" @click.stop="dismissNotification(notification.uid)">
                    <Icon name="solar:close-circle-bold" class="size-5" />
                  </button>
                  <!-- Restore (History) -->
                  <button v-if="activeTab === 'history'"
                    class="p-1 rounded-lg hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-400 hover:text-primary-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Restaurar para novos" @click.stop="restoreNotification(notification.uid)">
                    <Icon name="solar:restart-bold" class="size-5" />
                  </button>

                  <Icon name="solar:arrow-right-linear"
                    class="size-4 text-muted-300 group-hover:text-primary-500 transition-colors hidden sm:block" />
                </div>
              </div>
            </BaseCard>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="py-12 text-center text-balance px-6">
          <div class="size-16 mx-auto mb-4 rounded-2xl bg-muted-100 dark:bg-muted-800 flex items-center justify-center">
            <Icon :name="activeTab === 'new' ? 'solar:check-circle-bold-duotone' : 'solar:history-bold-duotone'"
              class="size-8 text-muted-400" />
          </div>
          <BaseHeading as="h4" size="md" weight="medium" class="text-muted-900 dark:text-white mb-1">
            {{ activeTab === 'new' ? 'Tudo em dia! 🎉' : 'Histórico limpo' }}
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-400">
            {{ activeTab === 'new' ? 'Não há novas pendências no momento.'
              : 'Você ainda não arquivou nenhuma notificação.' }}
          </BaseParagraph>
        </div>
      </div>
    </div>
  </FocusScope>
  <!-- </TairoPanelComponent> -->
</template>
