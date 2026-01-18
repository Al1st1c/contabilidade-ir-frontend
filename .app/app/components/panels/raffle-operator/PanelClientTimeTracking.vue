<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

const props = defineProps<{
  client: any
  raffle: any
}>()

const emits = defineEmits<{
  close: []
  success: []
}>()

onKeyStroke('Escape', () => emits('close'))

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

const loading = ref(false)
const timeTracking = ref(props.client.timeTracking || null)
const sessions = ref([])

// Buscar detalhes do controle de tempo
async function getTimeTrackingDetails() {
  try {
    loading.value = true
    const { data } = await useCustomFetch<any>(`/raffle-operator/tracking/${props.raffle.id}/${props.client.id}`, {
      method: 'GET',
    })
    timeTracking.value = data
  } catch (error) {
    console.error('Erro ao buscar detalhes:', error)
  } finally {
    loading.value = false
  }
}

// Polling automático para atualizar tempo em tempo real
let pollingInterval: NodeJS.Timeout | null = null

function startPolling() {
  if (pollingInterval) return
  
  pollingInterval = setInterval(async () => {
    if (timeTracking.value?.isActive) {
      await getTimeTrackingDetails()
    }
  }, 30000) // Atualiza a cada 30 segundos
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

// Buscar sessões do cliente
async function getSessions() {
  try {
    const { data } = await useCustomFetch<any>(`/raffle-operator/raffle/${props.raffle.id}/sessions/${props.client.id}`, {
      method: 'GET',
    })
    sessions.value = data || []
  } catch (error) {
    console.error('Erro ao buscar sessões:', error)
  }
}

// Iniciar sessão
async function startSession() {
  try {
    loading.value = true
    await useCustomFetch<any>(`/raffle-operator/tracking/${props.raffle.id}/${props.client.id}`, {
      method: 'POST',
      body: { action: 'start' }
    })

    toaster.add({
      title: 'Sucesso',
      description: `Sessão iniciada para ${props.client.name}`,
      icon: 'ph:check-circle-fill',
      progress: true,
    })

    await getTimeTrackingDetails()
    await getSessions()
    emits('success')
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao iniciar sessão',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  } finally {
    loading.value = false
  }
}

// Pausar sessão
async function pauseSession() {
  try {
    loading.value = true
    await useCustomFetch<any>(`/raffle-operator/tracking/${props.raffle.id}/${props.client.id}`, {
      method: 'POST',
      body: { action: 'pause' }
    })

    toaster.add({
      title: 'Sucesso',
      description: `Sessão pausada para ${props.client.name}`,
      icon: 'ph:check-circle-fill',
      progress: true,
    })

    await getTimeTrackingDetails()
    await getSessions()
    emits('success')
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao pausar sessão',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  } finally {
    loading.value = false
  }
}

// Retomar sessão
async function resumeSession() {
  try {
    loading.value = true
    await useCustomFetch<any>(`/raffle-operator/tracking/${props.raffle.id}/${props.client.id}`, {
      method: 'POST',
      body: { action: 'resume' }
    })

    toaster.add({
      title: 'Sucesso',
      description: `Sessão retomada para ${props.client.name}`,
      icon: 'ph:check-circle-fill',
      progress: true,
    })

    await getTimeTrackingDetails()
    await getSessions()
    emits('success')
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao retomar sessão',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  } finally {
    loading.value = false
  }
}

// Formatar tempo
function formatTime(hours: number): string {
  if (!hours) return '0h 0m'
  const h = Math.floor(hours)
  const m = Math.floor((hours - h) * 60)
  return `${h}h ${m}m`
}

// Formatar data
function formatDate(date: string) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Calcular tempo da sessão atual
// Tempo da sessão atual (com fallback para cálculo local)
const currentSessionTime = computed(() => {
  // Se o backend retornou currentDuration, usar ele
  if (timeTracking.value?.currentDuration !== undefined) {
    return timeTracking.value.currentDuration
  }
  
  // Fallback: calcular localmente se sessão está ativa
  if (timeTracking.value?.isActive && timeTracking.value?.sessionStart) {
    const startTime = new Date(timeTracking.value.sessionStart)
    const now = new Date()
    const diffMs = now.getTime() - startTime.getTime()
    return diffMs / (1000 * 60 * 60) // Converter para horas
  }
  
  return 0
})

// Calcular bilhetes ganhos (agora vem do backend em tempo real)
const ticketsEarned = computed(() => {
  return timeTracking.value?.ticketsEarned || 0
})

// Próximo bilhete (agora usa dados em tempo real do backend)
const nextTicketProgress = computed(() => {
  const totalHours = timeTracking.value?.totalHours || 0
  const hoursPerTicket = Number(props.raffle.hoursPerTicket)
  const currentTickets = Math.floor(totalHours / hoursPerTicket)
  const nextTicketHours = (currentTickets + 1) * hoursPerTicket
  
  const progress = totalHours > 0 ? Math.min((totalHours / nextTicketHours) * 100, 100) : 0
  
  return {
    progress: Math.min(progress, 100),
    hoursToNext: timeTracking.value?.nextTicketIn || 0
  }
})

onMounted(() => {
  getTimeTrackingDetails()
  getSessions()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white"
    style="width: 40%"
    trapped
    loop
  >
    <div
      class="border-muted-200 dark:border-muted-700 flex h-20 w-full items-center justify-between border-b px-6"
    >
      <BaseHeading
        as="h3"
        size="xs"
        weight="semibold"
        class="text-muted-500 dark:text-muted-100 uppercase"
      >
        Controle de Tempo - {{ client.name }}
      </BaseHeading>

      <!-- Close button -->
      <button
        type="button"
        class="nui-mask nui-mask-blob hover:bg-muted-100 focus:bg-muted-100 dark:hover:bg-muted-700 dark:focus:bg-muted-700 text-muted-700 dark:text-muted-400 flex size-10 cursor-pointer items-center justify-center outline-transparent transition-colors duration-300"
        @click="() => emits('close')"
      >
        <Icon name="lucide:arrow-right" class="size-4" />
      </button>
    </div>

    <div
      class="nui-slimscroll relative h-[calc(100dvh_-_80px)] w-full overflow-y-auto p-6"
    >
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center gap-4 mb-4">
          <div class="bg-primary-100 dark:bg-primary-900/20 rounded-full p-3">
            <Icon name="lucide:user" class="size-6 text-primary-500" />
          </div>
          <div>
            <BaseHeading
              as="h4"
              size="lg"
              weight="medium"
              class="text-muted-900 dark:text-muted-100"
            >
              {{ client.name }}
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
              {{ client.document || 'Sem documento' }}
            </BaseParagraph>
          </div>
        </div>

        <!-- Status -->
        <div class="flex items-center gap-2">
          <span
            class="bg-muted-100 dark:bg-muted-600/10 text-muted-500 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-sans text-xs"
          >
            <span
              class="size-2 rounded-full"
              :class="timeTracking?.isActive ? 'bg-success-500' : 'bg-muted-300'"
            />
            <span :class="timeTracking?.isActive ? 'text-success-600' : 'text-muted-500'">
              {{ timeTracking?.isActive ? 'Jogando Agora' : 'Não está jogando' }}
            </span>
          </span>
        </div>
      </div>

      <!-- Estatísticas -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-muted-900 dark:text-muted-100">
            {{ formatTime(timeTracking?.totalHours || 0) }}
          </div>
          <div class="text-sm text-muted-500 dark:text-muted-400">
            Tempo Total
          </div>
        </div>
        <div class="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {{ ticketsEarned }}
          </div>
          <div class="text-sm text-primary-500 dark:text-primary-400">
            Bilhetes Ganhos
          </div>
        </div>
      </div>

      <!-- Progresso para Próximo Bilhete -->
      <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 mb-6">
        <BaseHeading
          as="h5"
          size="sm"
          weight="medium"
          class="text-muted-700 dark:text-muted-300 mb-3"
        >
          Progresso para Próximo Bilhete
        </BaseHeading>
        
        <div class="space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-muted-500">Tempo atual</span>
            <span class="font-medium">{{ formatTime(timeTracking?.totalHours || 0) }}</span>
          </div>
          
          <div class="w-full bg-muted-200 dark:bg-muted-700 rounded-full h-2">
            <div
              class="bg-primary-500 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${nextTicketProgress.progress}%` }"
            />
          </div>
          
          <div class="flex justify-between text-sm">
            <span class="text-muted-500">Faltam</span>
            <span class="font-medium">{{ formatTime(nextTicketProgress.hoursToNext) }}</span>
          </div>
        </div>
      </div>

      <!-- Sessão Ativa -->
      <div v-if="timeTracking?.isActive" class="bg-success-50 dark:bg-success-900/20 rounded-lg p-4 mb-6">
        <div class="flex items-center gap-3 mb-3">
          <Icon name="lucide:clock" class="size-5 text-success-500" />
          <BaseHeading
            as="h5"
            size="sm"
            weight="medium"
            class="text-success-700 dark:text-success-300"
          >
            Sessão Ativa
          </BaseHeading>
          <div class="flex items-center gap-2 ml-auto">
            <div class="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span class="text-xs text-success-600 dark:text-success-400">Tempo Real</span>
          </div>
        </div>
        
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-success-600 dark:text-success-400">Iniciada em:</span>
            <span class="font-medium">{{ formatDate(timeTracking.sessionStart) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-success-600 dark:text-success-400">Tempo desta sessão:</span>
            <span class="font-medium">{{ formatTime(currentSessionTime) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-success-600 dark:text-success-400">Tempo total:</span>
            <span class="font-medium">{{ formatTime(timeTracking?.totalHours || 0) }}</span>
          </div>
        </div>
      </div>

      <!-- Informações de Auditoria -->
      <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 mb-6">
        <BaseHeading
          as="h5"
          size="sm"
          weight="medium"
          class="text-muted-700 dark:text-muted-300 mb-3"
        >
          <Icon name="lucide:shield-check" class="size-4 inline mr-2" />
          Auditoria
        </BaseHeading>
        
        <div class="space-y-2 text-sm">
          <!-- Quem iniciou -->
          <div v-if="timeTracking?.startedBy" class="flex justify-between">
            <span class="text-muted-500">Iniciado por:</span>
            <div class="flex items-center gap-2">
              <Icon name="lucide:user-check" class="size-3 text-success-500" />
              <span class="font-medium text-success-600 dark:text-success-400">
                {{ timeTracking.startedBy.name }}
              </span>
            </div>
          </div>
          
          <!-- Quem pausou -->
          <div v-if="timeTracking?.pausedBy" class="flex justify-between">
            <span class="text-muted-500">Pausado por:</span>
            <div class="flex items-center gap-2">
              <Icon name="lucide:user-x" class="size-3 text-warning-500" />
              <span class="font-medium text-warning-600 dark:text-warning-400">
                {{ timeTracking.pausedBy.name }}
              </span>
            </div>
          </div>
          
          <!-- Status atual -->
          <div class="flex justify-between">
            <span class="text-muted-500">Status:</span>
            <div class="flex items-center gap-2">
              <Icon 
                :name="timeTracking?.isActive ? 'lucide:play-circle' : 'lucide:pause-circle'" 
                :class="timeTracking?.isActive ? 'size-3 text-success-500' : 'size-3 text-muted-500'"
              />
              <span 
                :class="timeTracking?.isActive 
                  ? 'font-medium text-success-600 dark:text-success-400' 
                  : 'font-medium text-muted-600 dark:text-muted-400'"
              >
                {{ timeTracking?.isActive ? 'Ativo' : 'Pausado' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Controles -->
      <div class="space-y-4 mb-6">
        <BaseHeading
          as="h5"
          size="sm"
          weight="medium"
          class="text-muted-700 dark:text-muted-300"
        >
          Controles
        </BaseHeading>
        
        <div class="flex gap-3">
          <!-- Iniciar -->
          <BaseButton
            v-if="!timeTracking?.isActive && !timeTracking?.totalHours"
            @click="startSession"
            :loading="loading"
            variant="primary"
            rounded="lg"
            class="flex-1"
          >
            <Icon name="lucide:play" class="size-4" />
            <span>Iniciar Sessão</span>
          </BaseButton>

          <!-- Pausar -->
          <BaseButton
            v-else-if="timeTracking?.isActive"
            @click="pauseSession"
            :loading="loading"
            variant="warning"
            rounded="lg"
            class="flex-1"
          >
            <Icon name="lucide:pause" class="size-4" />
            <span>Pausar Sessão</span>
          </BaseButton>

          <!-- Retomar -->
          <BaseButton
            v-else-if="timeTracking?.totalHours > 0"
            @click="resumeSession"
            :loading="loading"
            variant="success"
            rounded="lg"
            class="flex-1"
          >
            <Icon name="lucide:play" class="size-4" />
            <span>Retomar Sessão</span>
          </BaseButton>
        </div>
      </div>

      <!-- Histórico de Sessões -->
      <div v-if="sessions.length > 0" class="mb-6">
        <BaseHeading
          as="h5"
          size="sm"
          weight="medium"
          class="text-muted-700 dark:text-muted-300 mb-3"
        >
          Histórico de Sessões
        </BaseHeading>
        
        <div class="space-y-2">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="p-3 bg-white dark:bg-muted-800 rounded-lg text-sm"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <Icon name="lucide:clock" class="size-4 text-muted-400" />
                <div>
                  <div class="font-medium">{{ formatDate(session.sessionStart) }}</div>
                  <div class="text-xs text-muted-500">
                    {{ session.sessionEnd ? `Finalizada em ${formatDate(session.sessionEnd)}` : 'Em andamento' }}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-medium">{{ formatTime(session.duration) }}</div>
                <div class="text-xs text-muted-500">{{ session.ticketsGenerated }} bilhetes</div>
              </div>
            </div>
            
            <!-- Informações de Auditoria da Sessão -->
            <div class="pt-2 border-t border-muted-200 dark:border-muted-700">
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-4">
                  <!-- Quem iniciou -->
                  <div v-if="session.startedBy" class="flex items-center gap-1">
                    <Icon name="lucide:user-check" class="size-3 text-success-500" />
                    <span class="text-muted-500">Iniciado por:</span>
                    <span class="font-medium text-success-600 dark:text-success-400">{{ session.startedBy.name }}</span>
                  </div>
                  
                  <!-- Quem pausou -->
                  <div v-if="session.pausedBy" class="flex items-center gap-1">
                    <Icon name="lucide:user-x" class="size-3 text-warning-500" />
                    <span class="text-muted-500">Pausado por:</span>
                    <span class="font-medium text-warning-600 dark:text-warning-400">{{ session.pausedBy.name }}</span>
                  </div>
                </div>
                
                <!-- Status da sessão -->
                <div class="flex items-center gap-1">
                  <Icon 
                    :name="session.sessionEnd ? 'lucide:check-circle' : 'lucide:play-circle'" 
                    :class="session.sessionEnd ? 'size-3 text-success-500' : 'size-3 text-primary-500'"
                  />
                  <span 
                    :class="session.sessionEnd 
                      ? 'text-success-600 dark:text-success-400' 
                      : 'text-primary-600 dark:text-primary-400'"
                  >
                    {{ session.sessionEnd ? 'Finalizada' : 'Ativa' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Informações do Sorteio -->
      <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4">
        <BaseHeading
          as="h5"
          size="sm"
          weight="medium"
          class="text-muted-700 dark:text-muted-300 mb-3"
        >
          Informações do Sorteio
        </BaseHeading>
        
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-500">Nome:</span>
            <span class="font-medium">{{ raffle.name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-500">Horas por bilhete:</span>
            <span class="font-medium">{{ raffle.hoursPerTicket }}h</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-500">Bilhetes por ciclo:</span>
            <span class="font-medium">{{ raffle.ticketsPerCycle }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-500">Múltiplas vitórias:</span>
            <span class="font-medium">{{ raffle.allowMultipleWins ? 'Sim' : 'Não' }}</span>
          </div>
        </div>
      </div>

      <!-- Botões de Ação -->
      <div class="flex gap-3 pt-6 border-t border-muted-200 dark:border-muted-700">
        <BaseButton
          @click="getTimeTrackingDetails"
          variant="muted"
          rounded="lg"
          class="flex-1"
          :loading="loading"
        >
          <Icon name="lucide:refresh-cw" class="size-4" />
          <span>Atualizar</span>
        </BaseButton>
        <BaseButton
          @click="emits('close')"
          variant="primary"
          rounded="lg"
          class="flex-1"
        >
          <Icon name="lucide:check" class="size-4" />
          <span>Fechar</span>
        </BaseButton>
      </div>
    </div>
  </FocusScope>
</template>
