<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

const props = defineProps<{
  raffle: any
}>()

const emits = defineEmits<{
  close: []
}>()

onKeyStroke('Escape', () => emits('close'))

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

const stats = ref(null)
const loadingStats = ref(false)

// Buscar estatísticas do sorteio
async function getRaffleStats() {
  try {
    loadingStats.value = true
    const { data } = await useCustomFetch<any>(`/raffles/${props.raffle.id}/stats`, {
      method: 'GET',
    })
    stats.value = data
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
  } finally {
    loadingStats.value = false
  }
}

// Formatar valor em reais
function formatCurrency(value: number): string {
  if (!value) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
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

// Formatar duração
function formatDuration(hours: number): string {
  if (!hours) return '0h'
  const h = Math.floor(hours)
  const m = Math.floor((hours - h) * 60)
  return `${h}h ${m}m`
}

// Obter cor do status
function getStatusColor(status: string) {
  const colors = {
    PENDING: 'bg-muted-300 dark:bg-muted-700',
    ACTIVE: 'bg-success-500',
    PAUSED: 'bg-warning-500',
    DRAWING: 'bg-primary-500',
    FINISHED: 'bg-info-500',
    CANCELLED: 'bg-destructive-500',
  }
  return colors[status as keyof typeof colors] || 'bg-muted-300 dark:bg-muted-700'
}

// Obter label do status
function getStatusLabel(status: string) {
  const labels = {
    PENDING: 'Pendente',
    ACTIVE: 'Ativo',
    PAUSED: 'Pausado',
    DRAWING: 'Executando',
    FINISHED: 'Finalizado',
    CANCELLED: 'Cancelado',
  }
  return labels[status as keyof typeof labels] || status
}

// Obter cor do tipo de prêmio
function getPrizeTypeColor(type: string) {
  const colors = {
    PHYSICAL: 'bg-primary-500',
    CASH: 'bg-success-500',
    BONUS: 'bg-warning-500',
    CREDITS: 'bg-info-500',
  }
  return colors[type as keyof typeof colors] || 'bg-muted-500'
}

// Obter label do tipo de prêmio
function getPrizeTypeLabel(type: string) {
  const labels = {
    PHYSICAL: 'Físico',
    CASH: 'Dinheiro',
    BONUS: 'Bônus',
    CREDITS: 'Créditos',
  }
  return labels[type as keyof typeof labels] || type
}

onMounted(() => {
  getRaffleStats()
})
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white"
    trapped
    loop
    style="width: 40%"
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
        Detalhes do Sorteio
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
        <BaseHeading
          as="h4"
          size="lg"
          weight="medium"
          class="text-muted-900 dark:text-muted-100 mb-2"
        >
          {{ raffle.name }}
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400 mb-4">
          {{ raffle.description || 'Sorteio do casino' }}
        </BaseParagraph>
        
        <!-- Status -->
        <span
          class="bg-muted-100 dark:bg-muted-600/10 text-muted-500 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-sans text-xs"
        >
          <span
            class="size-2 rounded-full"
            :class="getStatusColor(raffle.status)"
          />
          <span>{{ getStatusLabel(raffle.status) }}</span>
        </span>
      </div>

      <!-- Estatísticas Principais -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-muted-900 dark:text-muted-100">
            {{ raffle.timeTracking?.length || 0 }}
          </div>
          <div class="text-sm text-muted-500 dark:text-muted-400">
            Participantes
          </div>
        </div>
        <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-muted-900 dark:text-muted-100">
            {{ raffle.entries?.length || 0 }}
          </div>
          <div class="text-sm text-muted-500 dark:text-muted-400">
            Bilhetes
          </div>
        </div>
        <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-muted-900 dark:text-muted-100">
            {{ raffle.prizes?.length || 0 }}
          </div>
          <div class="text-sm text-muted-500 dark:text-muted-400">
            Prêmios
          </div>
        </div>
        <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-muted-900 dark:text-muted-100">
            {{ raffle.winners?.length || 0 }}
          </div>
          <div class="text-sm text-muted-500 dark:text-muted-400">
            Ganhadores
          </div>
        </div>
      </div>

      <!-- Estatísticas Detalhadas -->
      <div v-if="stats" class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 mb-6">
        <BaseHeading
          as="h5"
          size="sm"
          weight="medium"
          class="text-muted-700 dark:text-muted-300 mb-3"
        >
          Estatísticas Detalhadas
        </BaseHeading>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-500">Total de horas:</span>
            <span class="font-medium">{{ formatDuration(stats.totalHoursTracked) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-500">Média por participante:</span>
            <span class="font-medium">{{ formatDuration(stats.averageHoursPerParticipant) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-500">Sessões ativas:</span>
            <span class="font-medium">{{ stats.activeSessions }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-500">Entregas pendentes:</span>
            <span class="font-medium">{{ stats.pendingDeliveries }}</span>
          </div>
        </div>
      </div>

      <!-- Configurações -->
      <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 mb-6">
        <BaseHeading
          as="h5"
          size="sm"
          weight="medium"
          class="text-muted-700 dark:text-muted-300 mb-3"
        >
          Configurações
        </BaseHeading>
        <div class="grid grid-cols-2 gap-4 text-sm">
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
          <div class="flex justify-between">
            <span class="text-muted-500">Ativo:</span>
            <span class="font-medium">{{ raffle.isActive ? 'Sim' : 'Não' }}</span>
          </div>
        </div>
      </div>

      <!-- Datas -->
      <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 mb-6">
        <BaseHeading
          as="h5"
          size="sm"
          weight="medium"
          class="text-muted-700 dark:text-muted-300 mb-3"
        >
          Datas
        </BaseHeading>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-500">Criado em:</span>
            <span class="font-medium">{{ formatDate(raffle.createdAt) }}</span>
          </div>
          <div v-if="raffle.startDate" class="flex justify-between">
            <span class="text-muted-500">Data de início:</span>
            <span class="font-medium">{{ formatDate(raffle.startDate) }}</span>
          </div>
          <div v-if="raffle.endDate" class="flex justify-between">
            <span class="text-muted-500">Data de fim:</span>
            <span class="font-medium">{{ formatDate(raffle.endDate) }}</span>
          </div>
          <div v-if="raffle.drawDate" class="flex justify-between">
            <span class="text-muted-500">Data do sorteio:</span>
            <span class="font-medium">{{ formatDate(raffle.drawDate) }}</span>
          </div>
        </div>
      </div>

      <!-- Prêmios -->
      <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 mb-6">
        <BaseHeading
          as="h5"
          size="sm"
          weight="medium"
          class="text-muted-700 dark:text-muted-300 mb-3"
        >
          Prêmios
        </BaseHeading>
        <div class="space-y-3">
          <div
            v-for="prize in raffle.prizes"
            :key="prize.id"
            class="flex items-center justify-between p-3 bg-white dark:bg-muted-800 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <span
                class="size-2 rounded-full"
                :class="getPrizeTypeColor(prize.type)"
              />
              <div>
                <div class="font-medium text-muted-900 dark:text-muted-100">
                  {{ prize.name }}
                </div>
                <div class="text-xs text-muted-500">
                  {{ getPrizeTypeLabel(prize.type) }}
                </div>
              </div>
            </div>
            <div class="text-right">
              <div v-if="prize.value" class="font-medium text-success-600 dark:text-success-400">
                {{ formatCurrency(prize.value) }}
              </div>
              <div class="text-xs text-muted-500">
                Qtd: {{ prize.quantity }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Participantes -->
      <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 mb-6">
        <BaseHeading
          as="h5"
          size="sm"
          weight="medium"
          class="text-muted-700 dark:text-muted-300 mb-3"
        >
          Participantes ({{ raffle.timeTracking?.length || 0 }})
        </BaseHeading>
        <div class="space-y-2 max-h-48 overflow-y-auto">
          <div
            v-for="tracking in raffle.timeTracking?.slice(0, 10)"
            :key="tracking.id"
            class="flex items-center justify-between p-2 bg-white dark:bg-muted-800 rounded text-sm"
          >
            <div class="flex items-center gap-2">
              <Icon name="lucide:user" class="size-4 text-muted-400" />
              <span class="font-medium">{{ tracking.user?.name }}</span>
              <span v-if="tracking.isActive" class="bg-success-100 dark:bg-success-900/20 text-success-600 dark:text-success-400 px-2 py-0.5 rounded-full text-xs">
                Ativo
              </span>
            </div>
            <div class="text-right text-xs text-muted-500">
              <div>{{ formatDuration(tracking.totalHours) }}</div>
              <div>{{ tracking.ticketsEarned }} bilhetes</div>
            </div>
          </div>
          <div v-if="(raffle.timeTracking?.length || 0) > 10" class="text-center text-xs text-muted-500 py-2">
            E mais {{ (raffle.timeTracking?.length || 0) - 10 }} participantes...
          </div>
        </div>
      </div>

      <!-- Botões de Ação -->
      <div class="flex gap-3 pt-6 border-t border-muted-200 dark:border-muted-700">
        <BaseButton
          @click="getRaffleStats"
          variant="muted"
          rounded="lg"
          class="flex-1"
          :loading="loadingStats"
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
