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

const winners = ref([])
const loading = ref(false)
const updatingDelivery = ref(false)
const redrawing = ref(false)

// Opções de status de entrega
const deliveryStatusOptions = [
  { value: 'PENDING', label: 'Pendente', color: 'bg-muted-300 dark:bg-muted-700' },
  { value: 'DELIVERED', label: 'Entregue', color: 'bg-success-500' },
  { value: 'CANCELLED', label: 'Cancelado', color: 'bg-destructive-500' },
]

// Buscar ganhadores
async function getWinners() {
  try {
    loading.value = true
    const { data } = await useCustomFetch<any>(`/raffles/${props.raffle.id}/winners`, {
      method: 'GET',
    })
    winners.value = data || []
  } catch (error) {
    console.error('Erro ao buscar ganhadores:', error)
    toaster.add({
      title: 'Erro',
      description: 'Erro ao carregar ganhadores',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  } finally {
    loading.value = false
  }
}

// Atualizar status de entrega
async function updateDeliveryStatus(winnerId: string, status: string, notes?: string) {
  try {
    updatingDelivery.value = true
    
    await useCustomFetch<any>(`/raffles/winners/${winnerId}/delivery`, {
      method: 'PUT',
      body: {
        deliveryStatus: status,
        deliveryNotes: notes || undefined
      }
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Status de entrega atualizado com sucesso!',
      icon: 'ph:check-circle-fill',
      progress: true,
    })

    await getWinners()
  } catch (error: any) {
    console.error('Erro ao atualizar status de entrega:', error)
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao atualizar status de entrega',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  } finally {
    updatingDelivery.value = false
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

// Obter cor do status
function getStatusColor(status: string) {
  const option = deliveryStatusOptions.find(opt => opt.value === status)
  return option?.color || 'bg-muted-300 dark:bg-muted-700'
}

// Obter label do status
function getStatusLabel(status: string) {
  const option = deliveryStatusOptions.find(opt => opt.value === status)
  return option?.label || status
}

// Refazer sorteio de um prêmio
async function redrawPrize(prizeId: string, reason: string = 'CANCELLED_WINNER', notes?: string) {
  try {
    redrawing.value = true
    
    await useCustomFetch<any>(`/raffles/${props.raffle.id}/redraw-prize`, {
      method: 'POST',
      body: {
        prizeId,
        reason,
        notes
      }
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Sorteio refeito com sucesso!',
      icon: 'ph:check-circle-fill',
      progress: true,
    })

    await getWinners()
  } catch (error: any) {
    console.error('Erro ao refazer sorteio:', error)
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao refazer sorteio',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  } finally {
    redrawing.value = false
  }
}

// Verificar se um prêmio pode ser refeito
function canRedrawPrize(prizeId: string): boolean {
  const prizeWinners = winners.value.filter((w: any) => w.prizeId === prizeId)
  const cancelledWinners = prizeWinners.filter((w: any) => w.deliveryStatus === 'CANCELLED')
  return cancelledWinners.length > 0
}

// Obter prêmios únicos com estatísticas
const uniquePrizes = computed(() => {
  const prizes = new Map()
  
  winners.value.forEach((winner: any) => {
    const prizeId = winner.prizeId
    if (!prizes.has(prizeId)) {
      prizes.set(prizeId, {
        id: prizeId,
        name: winner.prize?.name,
        type: winner.prize?.type,
        value: winner.prize?.value,
        totalWinners: 0,
        delivered: 0,
        pending: 0,
        cancelled: 0
      })
    }
    
    const prize = prizes.get(prizeId)
    prize.totalWinners++
    
    if (winner.deliveryStatus === 'DELIVERED') prize.delivered++
    else if (winner.deliveryStatus === 'PENDING') prize.pending++
    else if (winner.deliveryStatus === 'CANCELLED') prize.cancelled++
  })
  
  return Array.from(prizes.values())
})

// Estatísticas dos ganhadores
const stats = computed(() => {
  const total = winners.value.length
  const delivered = winners.value.filter((w: any) => w.deliveryStatus === 'DELIVERED').length
  const pending = winners.value.filter((w: any) => w.deliveryStatus === 'PENDING').length
  const cancelled = winners.value.filter((w: any) => w.deliveryStatus === 'CANCELLED').length
  
  return { total, delivered, pending, cancelled }
})

onMounted(() => {
  getWinners()
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
        Ganhadores - {{ raffle.name }}
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
          Ganhadores do Sorteio
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
          Gerencie a entrega dos prêmios aos ganhadores
        </BaseParagraph>
      </div>

      <!-- Prêmios com Ações -->
      <div v-if="uniquePrizes.length > 0" class="mb-6">
        <BaseHeading
          as="h5"
          size="md"
          weight="medium"
          class="text-muted-900 dark:text-muted-100 mb-4"
        >
          Prêmios
        </BaseHeading>
        <div class="space-y-3">
          <div
            v-for="prize in uniquePrizes"
            :key="prize.id"
            class="border border-muted-200 dark:border-muted-700 rounded-lg p-4"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <Icon name="lucide:gift" class="size-4 text-muted-400" />
                  <span class="font-medium text-muted-900 dark:text-muted-100">
                    {{ prize.name }}
                  </span>
                  <span class="text-muted-500 text-sm">
                    ({{ prize.type }})
                  </span>
                  <div v-if="prize.value" class="text-success-600 dark:text-success-400 font-medium">
                    {{ formatCurrency(prize.value) }}
                  </div>
                </div>
                <div class="flex items-center gap-4 text-sm text-muted-500">
                  <span>Total: {{ prize.totalWinners }}</span>
                  <span class="text-success-600">Entregues: {{ prize.delivered }}</span>
                  <span class="text-warning-600">Pendentes: {{ prize.pending }}</span>
                  <span class="text-destructive-600">Cancelados: {{ prize.cancelled }}</span>
                </div>
              </div>
              <div v-if="canRedrawPrize(prize.id)">
                <BaseButton
                  @click="redrawPrize(prize.id)"
                  variant="warning"
                  size="sm"
                  rounded="lg"
                  :loading="redrawing"
                >
                  <Icon name="lucide:refresh-cw" class="size-4" />
                  <span>Refazer Sorteio</span>
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estatísticas -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-muted-900 dark:text-muted-100">
            {{ stats.total }}
          </div>
          <div class="text-sm text-muted-500 dark:text-muted-400">
            Total
          </div>
        </div>
        <div class="bg-success-50 dark:bg-success-900/20 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-success-600 dark:text-success-400">
            {{ stats.delivered }}
          </div>
          <div class="text-sm text-success-500 dark:text-success-400">
            Entregues
          </div>
        </div>
        <div class="bg-warning-50 dark:bg-warning-900/20 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-warning-600 dark:text-warning-400">
            {{ stats.pending }}
          </div>
          <div class="text-sm text-warning-500 dark:text-warning-400">
            Pendentes
          </div>
        </div>
        <div class="bg-destructive-50 dark:bg-destructive-900/20 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-destructive-600 dark:text-destructive-400">
            {{ stats.cancelled }}
          </div>
          <div class="text-sm text-destructive-500 dark:text-destructive-400">
            Cancelados
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-8">
        <div class="flex items-center gap-2 text-muted-500">
          <Icon name="lucide:loader-2" class="size-4 animate-spin" />
          <span>Carregando ganhadores...</span>
        </div>
      </div>

      <!-- Winners List -->
      <div v-else-if="winners.length > 0" class="space-y-4">
        <div
          v-for="winner in winners"
          :key="winner.id"
          class="border border-muted-200 dark:border-muted-700 rounded-lg p-4"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <!-- Informações do Ganhador -->
              <div class="flex items-center gap-3 mb-3">
                <div class="bg-primary-100 dark:bg-primary-900/20 rounded-full p-2">
                  <Icon name="lucide:trophy" class="size-5 text-primary-500" />
                </div>
                <div>
                  <BaseHeading
                    as="h5"
                    size="sm"
                    weight="medium"
                    class="text-muted-900 dark:text-muted-100"
                  >
                    {{ winner.user?.name || 'Usuário não encontrado' }}
                  </BaseHeading>
                  <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400">
                    {{ winner.user?.document || 'Sem documento' }}
                  </BaseParagraph>
                </div>
              </div>

              <!-- Prêmio -->
              <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-3 mb-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Icon name="lucide:gift" class="size-4 text-muted-400" />
                    <span class="font-medium text-muted-900 dark:text-muted-100">
                      {{ winner.prize?.name }}
                    </span>
                    <span class="text-muted-500 text-sm">
                      ({{ winner.prize?.type }})
                    </span>
                  </div>
                  <div class="text-right">
                    <div v-if="winner.prize?.value" class="font-medium text-success-600 dark:text-success-400">
                      {{ formatCurrency(winner.prize.value) }}
                    </div>
                    <div class="text-xs text-muted-500">
                      Bilhete #{{ winner.entry?.ticket }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Status de Entrega -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span
                    class="bg-muted-100 dark:bg-muted-600/10 text-muted-500 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-sans text-xs"
                  >
                    <span
                      class="size-2 rounded-full"
                      :class="getStatusColor(winner.deliveryStatus)"
                    />
                    <span>{{ getStatusLabel(winner.deliveryStatus) }}</span>
                  </span>
                  <span v-if="winner.deliveredAt" class="text-xs text-muted-500">
                    Entregue em {{ formatDate(winner.deliveredAt) }}
                  </span>
                </div>

                <!-- Ações -->
                <div class="flex items-center gap-2">
                  <BaseSelect
                    :model-value="winner.deliveryStatus"
                    @update:model-value="(value) => updateDeliveryStatus(winner.id, value)"
                    :disabled="updatingDelivery"
                    size="xs"
                    rounded="lg"
                  >
                    <BaseSelectItem
                      v-for="option in deliveryStatusOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </BaseSelectItem>
                  </BaseSelect>
                </div>
              </div>

              <!-- Observações -->
              <div v-if="winner.deliveryNotes" class="mt-3 p-2 bg-muted-50 dark:bg-muted-900 rounded text-xs text-muted-600 dark:text-muted-400">
                <strong>Observações:</strong> {{ winner.deliveryNotes }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <Icon name="lucide:trophy" class="size-12 text-muted-400 mx-auto mb-4" />
        <BaseHeading
          as="h3"
          size="lg"
          weight="medium"
          class="text-muted-500 dark:text-muted-400 mb-2"
        >
          Nenhum ganhador encontrado
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-400">
          Este sorteio ainda não foi executado ou não possui ganhadores
        </BaseParagraph>
      </div>

      <!-- Botões de Ação -->
      <div class="flex gap-3 pt-6 border-t border-muted-200 dark:border-muted-700">
        <BaseButton
          @click="getWinners"
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
