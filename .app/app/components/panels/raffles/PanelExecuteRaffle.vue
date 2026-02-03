<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

const props = defineProps<{
  raffle: any
}>()

const emits = defineEmits<{
  close: []
  success: []
}>()

onKeyStroke('Escape', () => emits('close'))

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

const isExecuting = ref(false)
const executionResult = ref(null)
const showConfirmation = ref(false)

// Estatísticas do sorteio
const stats = computed(() => {
  const raffle = props.raffle
  return {
    totalParticipants: raffle.timeTracking?.length || 0,
    totalTickets: raffle.entries?.length || 0,
    totalPrizes: raffle.prizes?.reduce((sum: number, prize: any) => sum + prize.quantity, 0) || 0,
    totalPrizeValue: raffle.prizes?.reduce((sum: number, prize: any) => sum + (prize.value || 0) * prize.quantity, 0) || 0,
  }
})

// Verificar se pode executar o sorteio
const canExecute = computed(() => {
  return props.raffle.status === 'ACTIVE'
    && props.raffle.entries?.length > 0
    && props.raffle.prizes?.length > 0
})

// Executar sorteio
async function executeRaffle() {
  try {
    isExecuting.value = true
    showConfirmation.value = false

    const { data } = await useCustomFetch<any>(`/raffles/${props.raffle.id}/execute`, {
      method: 'POST',
      body: {
        notes: 'Sorteio executado via interface administrativa',
      },
    })

    executionResult.value = data
    toaster.add({
      title: 'Sucesso!',
      description: 'Sorteio executado com sucesso!',
      icon: 'ph:check-circle-fill',
      progress: true,
    })

    emits('success')
  }
  catch (error: any) {
    console.error('Erro ao executar sorteio:', error)
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao executar sorteio',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  }
  finally {
    isExecuting.value = false
  }
}

// Confirmar execução
function confirmExecution() {
  showConfirmation.value = true
}

// Cancelar execução
function cancelExecution() {
  showConfirmation.value = false
}

// Formatar valor em reais
function formatCurrency(value: number): string {
  if (!value)
    return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Formatar data
function formatDate(date: string) {
  if (!date)
    return '-'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
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
        Executar Sorteio
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
      <!-- Execução Concluída -->
      <div v-if="executionResult" class="space-y-6">
        <div class="text-center">
          <div class="bg-success-100 dark:bg-success-900/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Icon name="ph:check-circle-fill" class="size-10 text-success-500" />
          </div>
          <BaseHeading
            as="h4"
            size="lg"
            weight="medium"
            class="text-success-600 dark:text-success-400 mb-2"
          >
            Sorteio Executado!
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
            O sorteio foi executado com sucesso e os ganhadores foram selecionados
          </BaseParagraph>
        </div>

        <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4">
          <BaseHeading
            as="h5"
            size="sm"
            weight="medium"
            class="text-muted-700 dark:text-muted-300 mb-3"
          >
            Resumo da Execução
          </BaseHeading>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted-500">Participantes:</span>
              <span class="font-medium ml-2">{{ stats.totalParticipants }}</span>
            </div>
            <div>
              <span class="text-muted-500">Bilhetes:</span>
              <span class="font-medium ml-2">{{ stats.totalTickets }}</span>
            </div>
            <div>
              <span class="text-muted-500">Prêmios:</span>
              <span class="font-medium ml-2">{{ stats.totalPrizes }}</span>
            </div>
            <div>
              <span class="text-muted-500">Valor Total:</span>
              <span class="font-medium ml-2">{{ formatCurrency(stats.totalPrizeValue) }}</span>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <BaseButton
            variant="primary"
            rounded="lg"
            class="flex-1"
            @click="emits('close')"
          >
            <Icon name="lucide:check" class="size-4" />
            <span>Concluir</span>
          </BaseButton>
        </div>
      </div>

      <!-- Confirmação de Execução -->
      <div v-else-if="showConfirmation" class="space-y-6">
        <div class="text-center">
          <div class="bg-warning-100 dark:bg-warning-900/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Icon name="ph:warning-circle-fill" class="size-10 text-warning-500" />
          </div>
          <BaseHeading
            as="h4"
            size="lg"
            weight="medium"
            class="text-warning-600 dark:text-warning-400 mb-2"
          >
            Confirmar Execução
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
            Tem certeza que deseja executar este sorteio? Esta ação não pode ser desfeita.
          </BaseParagraph>
        </div>

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
              <span class="text-muted-500">Participantes:</span>
              <span class="font-medium">{{ stats.totalParticipants }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-500">Bilhetes:</span>
              <span class="font-medium">{{ stats.totalTickets }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-500">Prêmios:</span>
              <span class="font-medium">{{ stats.totalPrizes }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-500">Valor Total:</span>
              <span class="font-medium">{{ formatCurrency(stats.totalPrizeValue) }}</span>
            </div>
          </div>
        </div>

        <div class="bg-destructive-50 dark:bg-destructive-900/20 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <Icon name="ph:warning-circle-fill" class="size-5 text-destructive-500 mt-0.5" />
            <div>
              <BaseHeading
                as="h6"
                size="xs"
                weight="medium"
                class="text-destructive-600 dark:text-destructive-400 mb-1"
              >
                Atenção
              </BaseHeading>
              <BaseParagraph size="xs" class="text-destructive-500 dark:text-destructive-400">
                Após a execução, o sorteio será finalizado e não poderá ser editado.
                Certifique-se de que todas as configurações estão corretas.
              </BaseParagraph>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <BaseButton
            :loading="isExecuting"
            variant="destructive"
            rounded="lg"
            class="flex-1"
            @click="executeRaffle"
          >
            <Icon name="lucide:play" class="size-4" />
            <span>Executar Sorteio</span>
          </BaseButton>
          <BaseButton
            variant="muted"
            rounded="lg"
            class="flex-1"
            @click="cancelExecution"
          >
            <Icon name="lucide:x" class="size-4" />
            <span>Cancelar</span>
          </BaseButton>
        </div>
      </div>

      <!-- Informações do Sorteio -->
      <div v-else class="space-y-6">
        <!-- Header -->
        <div class="text-center">
          <div class="bg-primary-100 dark:bg-primary-900/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Icon name="lucide:gift" class="size-10 text-primary-500" />
          </div>
          <BaseHeading
            as="h4"
            size="lg"
            weight="medium"
            class="text-muted-900 dark:text-muted-100 mb-2"
          >
            {{ raffle.name }}
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
            {{ raffle.description || 'Sorteio do casino' }}
          </BaseParagraph>
        </div>

        <!-- Status -->
        <div class="text-center">
          <span
            class="bg-success-100 dark:bg-success-900/20 text-success-600 dark:text-success-400 inline-flex items-center gap-2 rounded-full px-4 py-2 font-sans text-sm font-medium"
          >
            <span class="size-2 rounded-full bg-success-500" />
            <span>Pronto para Execução</span>
          </span>
        </div>

        <!-- Estatísticas -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-muted-900 dark:text-muted-100">
              {{ stats.totalParticipants }}
            </div>
            <div class="text-sm text-muted-500 dark:text-muted-400">
              Participantes
            </div>
          </div>
          <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-muted-900 dark:text-muted-100">
              {{ stats.totalTickets }}
            </div>
            <div class="text-sm text-muted-500 dark:text-muted-400">
              Bilhetes
            </div>
          </div>
          <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-muted-900 dark:text-muted-100">
              {{ stats.totalPrizes }}
            </div>
            <div class="text-sm text-muted-500 dark:text-muted-400">
              Prêmios
            </div>
          </div>
          <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 text-center">
            <div class="text-lg font-bold text-muted-900 dark:text-muted-100">
              {{ formatCurrency(stats.totalPrizeValue) }}
            </div>
            <div class="text-sm text-muted-500 dark:text-muted-400">
              Valor Total
            </div>
          </div>
        </div>

        <!-- Configurações -->
        <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4">
          <BaseHeading
            as="h5"
            size="sm"
            weight="medium"
            class="text-muted-700 dark:text-muted-300 mb-3"
          >
            Configurações
          </BaseHeading>
          <div class="space-y-2 text-sm">
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
              <span class="text-muted-500">Criado em:</span>
              <span class="font-medium">{{ formatDate(raffle.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Prêmios -->
        <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4">
          <BaseHeading
            as="h5"
            size="sm"
            weight="medium"
            class="text-muted-700 dark:text-muted-300 mb-3"
          >
            Prêmios
          </BaseHeading>
          <div class="space-y-2">
            <div
              v-for="prize in raffle.prizes"
              :key="prize.id"
              class="flex items-center justify-between text-sm"
            >
              <div class="flex items-center gap-2">
                <Icon name="lucide:gift" class="size-4 text-muted-400" />
                <span class="font-medium">{{ prize.name }}</span>
                <span class="text-muted-500">({{ prize.type }})</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-muted-500">Qtd: {{ prize.quantity }}</span>
                <span v-if="prize.value" class="font-medium text-success-600">
                  {{ formatCurrency(prize.value) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Validações -->
        <div v-if="!canExecute" class="bg-destructive-50 dark:bg-destructive-900/20 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <Icon name="ph:warning-circle-fill" class="size-5 text-destructive-500 mt-0.5" />
            <div>
              <BaseHeading
                as="h6"
                size="xs"
                weight="medium"
                class="text-destructive-600 dark:text-destructive-400 mb-1"
              >
                Não é possível executar o sorteio
              </BaseHeading>
              <BaseParagraph size="xs" class="text-destructive-500 dark:text-destructive-400">
                <span v-if="raffle.status !== 'ACTIVE'">O sorteio deve estar ativo para ser executado.</span>
                <span v-else-if="!raffle.entries?.length">Não há bilhetes para sortear.</span>
                <span v-else-if="!raffle.prizes?.length">Não há prêmios configurados.</span>
              </BaseParagraph>
            </div>
          </div>
        </div>

        <!-- Botões de Ação -->
        <div class="flex gap-3">
          <BaseButton
            v-if="canExecute"
            variant="primary"
            rounded="lg"
            class="flex-1"
            @click="confirmExecution"
          >
            <Icon name="lucide:play" class="size-4" />
            <span>Executar Sorteio</span>
          </BaseButton>
          <BaseButton
            variant="muted"
            rounded="lg"
            class="flex-1"
            @click="emits('close')"
          >
            <Icon name="lucide:x" class="size-4" />
            <span>Cancelar</span>
          </BaseButton>
        </div>
      </div>
    </div>
  </FocusScope>
</template>
