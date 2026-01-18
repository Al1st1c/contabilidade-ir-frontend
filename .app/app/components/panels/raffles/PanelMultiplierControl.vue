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
      <div class="flex items-center gap-3">
        <Icon name="lucide:zap" class="h-6 w-6 text-primary-500" />
        <div>
          <h3 class="text-lg font-semibold text-muted-800 dark:text-white">
            Controle de Multiplicador
          </h3>
          <p class="text-sm text-muted-500">
            {{ raffle?.name }}
          </p>
        </div>
      </div>

      <!-- Close button -->
      <button
        type="button"
        class="nui-mask nui-mask-blob hover:bg-muted-100 focus:bg-muted-100 dark:hover:bg-muted-700 dark:focus:bg-muted-700 text-muted-700 dark:text-muted-400 flex size-10 cursor-pointer items-center justify-center outline-transparent transition-colors duration-300"
        @click="() => emits('close')"
      >
        <Icon name="lucide:arrow-right" class="size-4" />
      </button>
    </div>
  <div class="panel-content">

    <!-- Status Atual -->
    <div class="space-y-6">
      <div class="bg-muted-50 dark:bg-muted-800/50 rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-semibold text-muted-800 dark:text-white">Status Atual</h4>
          <BaseBadge
            :color="raffle?.multiplierActive ? 'success' : 'muted'"
            variant="pastel"
          >
            {{ raffle?.multiplierActive ? 'ATIVO' : 'INATIVO' }}
          </BaseBadge>
        </div>
        
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-muted-500">Configuração Original:</span>
            <p class="font-medium text-muted-800 dark:text-white">
              {{ raffle?.hoursPerTicket }}h = {{ raffle?.ticketsPerCycle }} bilhete(s)
            </p>
          </div>
          <div v-if="raffle?.multiplierActive">
            <span class="text-muted-500">Com {{ raffle?.multiplierValue }} bilhetes por ciclo:</span>
            <p class="font-medium text-success-600">
              {{ raffle?.hoursPerTicket }}h = {{ raffle?.multiplierValue }} bilhetes
            </p>
          </div>
        </div>

        <div v-if="raffle?.multiplierActive && raffle?.multiplierStartedAt" class="mt-3 pt-3 border-t border-muted-200 dark:border-muted-700">
          <p class="text-xs text-muted-500">
            Ativado em: {{ formatDateTime(raffle.multiplierStartedAt) }}
          </p>
        </div>
      </div>

      <!-- Controles -->
      <div v-if="!raffle?.multiplierActive" class="space-y-4">
        <h4 class="font-semibold text-muted-800 dark:text-white">Ativar Multiplicador</h4>
        
        <BaseInput
          v-model="multiplierValue"
          type="number"
          min="2"
          max="10"
          step="1"
          label="Quantos bilhetes por hora"
          placeholder="Ex: 3 (para 3 bilhetes por ciclo)"
          :error="multiplierError"
        />

        <div class="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-4">
          <div class="flex gap-3">
            <Icon name="lucide:alert-triangle" class="h-5 w-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <div class="text-sm">
              <p class="font-medium text-warning-800 dark:text-warning-200 mb-1">
                Exemplo com {{ multiplierValue }} bilhetes por ciclo:
              </p>
              <p class="text-warning-700 dark:text-warning-300">
                Mantém <strong>{{ raffle?.hoursPerTicket }}h por ciclo</strong>, 
                mas paga <strong>{{ multiplierValue }} bilhetes</strong> ao invés de {{ raffle?.ticketsPerCycle }}
              </p>
            </div>
          </div>
        </div>

        <BaseButton
          :loading="loading"
          :disabled="!isValidMultiplier"
          color="success"
          class="w-full"
          @click="activateMultiplier"
        >
          <Icon name="lucide:zap" class="h-4 w-4 mr-2" />
          Ativar {{ multiplierValue }} Bilhetes por Ciclo
        </BaseButton>
      </div>

      <!-- Pausar Multiplicador -->
      <div v-else class="space-y-4">
        <div class="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-4">
          <div class="flex gap-3">
            <Icon name="lucide:zap" class="h-5 w-5 text-success-600 flex-shrink-0" />
            <div class="text-sm">
              <p class="font-medium text-success-800 dark:text-success-200 mb-1">
                {{ raffle?.multiplierValue }} Bilhetes por Ciclo Ativo
              </p>
              <p class="text-success-700 dark:text-success-300">
                Os jogadores estão ganhando {{ raffle?.multiplierValue }} bilhetes a cada {{ raffle?.hoursPerTicket }}h!
              </p>
            </div>
          </div>
        </div>

        <BaseButton
          :loading="loading"
          color="danger"
          variant="ghost"
          class="w-full"
          @click="pauseMultiplier"
        >
          <Icon name="lucide:pause" class="h-4 w-4 mr-2" />
          Pausar Multiplicador
        </BaseButton>

        <p class="text-xs text-muted-500 text-center">
          Ao pausar, volta para {{ raffle?.ticketsPerCycle }} bilhete por {{ raffle?.hoursPerTicket }}h
        </p>
      </div>

      <!-- Histórico -->
      <div v-if="raffle?.multiplierStartedAt || raffle?.multiplierEndedAt" class="space-y-3">
        <h4 class="font-semibold text-muted-800 dark:text-white">Histórico</h4>
        <div class="space-y-2 text-sm">
          <div v-if="raffle?.multiplierStartedAt" class="flex items-center gap-2">
            <Icon name="lucide:play" class="h-4 w-4 text-success-500" />
            <span class="text-muted-600 dark:text-muted-400">
              Ativado em {{ formatDateTime(raffle.multiplierStartedAt) }}
            </span>
          </div>
          <div v-if="raffle?.multiplierEndedAt" class="flex items-center gap-2">
            <Icon name="lucide:pause" class="h-4 w-4 text-muted-500" />
            <span class="text-muted-600 dark:text-muted-400">
              Pausado em {{ formatDateTime(raffle.multiplierEndedAt) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</FocusScope>
</template>

<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

interface Props {
  raffle: any
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'success'])

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

// Estados
const loading = ref(false)
const multiplierValue = ref(3)
const multiplierError = ref('')

// Computed
const isValidMultiplier = computed(() => {
  return multiplierValue.value >= 2 && multiplierValue.value <= 10
})

// Watchers
watch(multiplierValue, (value) => {
  if (value < 2) {
    multiplierError.value = 'Deve ser no mínimo 2 bilhetes por ciclo'
  } else if (value > 10) {
    multiplierError.value = 'Deve ser no máximo 10 bilhetes por ciclo'
  } else {
    multiplierError.value = ''
  }
})

// Métodos
async function activateMultiplier() {
  if (!isValidMultiplier.value) return

  try {
    loading.value = true
    
    await useCustomFetch(`/raffles/${props.raffle.id}/multiplier/activate`, {
      method: 'POST',
      body: {
        multiplierValue: multiplierValue.value
      }
    })

    toaster.add({
      title: 'Sucesso!',
      description: `${multiplierValue.value} bilhetes por ciclo ativado com sucesso`,
      icon: 'ph:check-circle-fill',
      progress: true,
    })

    emit('success')
    emit('close')
  } catch (error: any) {
    console.error('Erro ao ativar multiplicador:', error)
    toaster.add({
      title: 'Erro',
      description: error?.data?.message || 'Erro ao ativar multiplicador',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  } finally {
    loading.value = false
  }
}

async function pauseMultiplier() {
  try {
    loading.value = true
    
    await useCustomFetch(`/raffles/${props.raffle.id}/multiplier/pause`, {
      method: 'POST'
    })

    toaster.add({
      title: 'Sucesso!',
      description: 'Multiplicador pausado com sucesso',
      icon: 'ph:check-circle-fill',
      progress: true,
    })

    emit('success')
    emit('close')
  } catch (error: any) {
    console.error('Erro ao pausar multiplicador:', error)
    toaster.add({
      title: 'Erro',
      description: error?.data?.message || 'Erro ao pausar multiplicador',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  } finally {
    loading.value = false
  }
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('pt-BR')
}

// Keyboard shortcuts
onMounted(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      emit('close')
    }
  }
  
  document.addEventListener('keydown', handleKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})
</script>

<style scoped>
.panel-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.dark .panel-header {
  border-bottom-color: #374151;
}
</style>
