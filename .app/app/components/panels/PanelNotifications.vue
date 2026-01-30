<script setup lang="ts">
import { useApi } from '~/composables/useAuth'
import { PanelsPanelDeclarationDetails } from '#components'

const props = defineProps<{
  onClose?: () => void
}>()

const { useCustomFetch } = useApi()
const { open, close } = usePanels()

// State
const isLoading = ref(true)
const notifications = ref<any[]>([])

// Fetch notifications (same alerts from dashboard)
async function fetchNotifications() {
  isLoading.value = true
  try {
    const year = new Date().getFullYear()
    const response = await useCustomFetch<any>(`/declarations/dashboard-stats?taxYear=${year}`)

    if (response?.data?.success) {
      const alerts = response.data.data.alerts || {}
      const items: any[] = []

      // Errors - Critical priority
      if (alerts.errors?.length > 0) {
        alerts.errors.forEach((item: any) => {
          items.push({
            id: item.id,
            type: 'error',
            icon: 'solar:danger-bold',
            color: 'text-danger-500 bg-danger-500/10',
            title: 'Retificação Urgente',
            description: item.client?.name || 'Cliente sem nome',
            time: 'Ação imediata',
            priority: 1
          })
        })
      }

      // Near deadline - High priority
      if (alerts.nearDeadline?.length > 0) {
        alerts.nearDeadline.forEach((item: any) => {
          items.push({
            id: item.id,
            type: 'deadline',
            icon: 'solar:alarm-bold',
            color: 'text-amber-500 bg-amber-500/10',
            title: 'Prazo Próximo',
            description: item.client?.name || 'Cliente sem nome',
            time: 'Próximos 5 dias',
            priority: 2
          })
        })
      }

      // Waiting docs - Medium priority
      if (alerts.waitingDocs?.length > 0) {
        alerts.waitingDocs.forEach((item: any) => {
          items.push({
            id: item.id,
            type: 'docs',
            icon: 'solar:document-add-bold',
            color: 'text-primary-500 bg-primary-500/10',
            title: 'Aguardando Documentos',
            description: item.client?.name || 'Cliente sem nome',
            time: 'Pendente',
            priority: 3
          })
        })
      }

      // Stuck clients - Low priority
      if (alerts.stuckClients?.length > 0) {
        alerts.stuckClients.forEach((item: any) => {
          items.push({
            id: item.id,
            type: 'stuck',
            icon: 'solar:hourglass-line-bold',
            color: 'text-muted-500 bg-muted-500/10',
            title: 'Fluxo Travado',
            description: `${item.client?.name || 'Cliente'} - ${item.column?.name || 'Sem etapa'}`,
            time: '> 7 dias sem ação',
            priority: 4
          })
        })
      }

      // Sort by priority
      notifications.value = items.sort((a, b) => a.priority - b.priority)
    }
  } catch (e) {
    console.error('Error fetching notifications:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchNotifications()
})

function handleItemClick(notification: any) {
  // Close this panel first
  close()

  // Open the declaration details panel
  setTimeout(() => {
    open(PanelsPanelDeclarationDetails, {
      declarationId: notification.id,
      onSaved: () => {
        // Refresh notifications after saving
        fetchNotifications()
      }
    })
  }, 150)
}

const totalCount = computed(() => notifications.value.length)
const criticalCount = computed(() => notifications.value.filter(n => n.type === 'error').length)
</script>

<template>
  <TairoPanelComponent enable-search title="Notificações">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="size-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
          <Icon name="solar:bell-bold-duotone" class="size-5" />
        </div>
        <div>
          <BaseHeading size="lg" weight="semibold" class="text-muted-900 dark:text-white">
            Notificações
          </BaseHeading>
          <BaseParagraph size="xs" class="text-muted-400">
            {{ totalCount }} pendências • {{ criticalCount }} críticas
          </BaseParagraph>
        </div>
      </div>
    </template>

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
      <div v-else-if="notifications.length > 0" class="space-y-2">
        <div v-for="notification in notifications" :key="notification.id" class="group cursor-pointer"
          @click="handleItemClick(notification)">
          <BaseCard rounded="lg" elevated-hover class="p-3 transition-all group-hover:border-primary-500!">
            <div class="flex items-start gap-3">
              <!-- Icon -->
              <div class="size-10 rounded-xl flex items-center justify-center shrink-0" :class="notification.color">
                <Icon :name="notification.icon" class="size-5" />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-900 dark:text-white">
                    {{ notification.title }}
                  </BaseHeading>
                  <span v-if="notification.type === 'error'"
                    class="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-danger-500 text-white rounded">
                    Crítico
                  </span>
                </div>
                <BaseParagraph size="xs" class="text-muted-500 truncate">
                  {{ notification.description }}
                </BaseParagraph>
                <span class="text-[10px] text-muted-400 mt-1 block">
                  {{ notification.time }}
                </span>
              </div>

              <!-- Arrow -->
              <Icon name="solar:arrow-right-linear"
                class="size-4 text-muted-300 group-hover:text-primary-500 transition-colors mt-1" />
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="py-12 text-center">
        <div class="size-16 mx-auto mb-4 rounded-2xl bg-success-500/10 flex items-center justify-center">
          <Icon name="solar:check-circle-bold-duotone" class="size-8 text-success-500" />
        </div>
        <BaseHeading as="h4" size="md" weight="medium" class="text-muted-900 dark:text-white mb-1">
          Tudo em dia! 🎉
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-400 max-w-[240px] mx-auto">
          Não há pendências ou alertas no momento. Continue o bom trabalho!
        </BaseParagraph>
      </div>
    </div>
  </TairoPanelComponent>
</template>
