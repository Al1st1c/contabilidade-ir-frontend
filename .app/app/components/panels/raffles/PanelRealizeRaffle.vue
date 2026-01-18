<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

const props = defineProps<{
  raffle: any
}>()

const emits = defineEmits<{
  success: []
  close: []
}>()

const selectedPrize = ref<any>(null)
const loading = ref(false)

// Função para verificar se um prêmio já foi sorteado
function isPrizeAlreadyDrawn(prizeId: string): boolean {
  return props.raffle.winners?.some((winner: any) => winner.prizeId === prizeId) || false
}

// Função para executar sorteio de um prêmio específico
async function executePrizeRaffle() {
  if (!selectedPrize.value) {
    toaster.add({
      title: 'Erro',
      description: 'Selecione um prêmio para realizar o sorteio',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
    return
  }

  if (isPrizeAlreadyDrawn(selectedPrize.value.id)) {
    toaster.add({
      title: 'Erro',
      description: 'Este prêmio já foi sorteado',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
    return
  }

  try {
    loading.value = true
    
    const { data } = await useCustomFetch<any>(`/raffles/${props.raffle.id}/execute-prize`, {
      method: 'POST',
      body: {
        prizeId: selectedPrize.value.id,
        notes: `Sorteio realizado para o prêmio: ${selectedPrize.value.name}`
      }
    })

    toaster.add({
      title: 'Sucesso',
      description: `Sorteio realizado com sucesso! Prêmio: ${selectedPrize.value.name}`,
      icon: 'ph:check-circle-fill',
      progress: true,
    })

    emits('success')
    emits('close')
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao realizar sorteio',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  } finally {
    loading.value = false
  }
}

// Função para executar sorteio completo (todos os prêmios)
async function executeFullRaffle() {
  try {
    loading.value = true
    
    const { data } = await useCustomFetch<any>(`/raffles/${props.raffle.id}/execute`, {
      method: 'POST',
      body: {
        notes: 'Sorteio completo realizado'
      }
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Sorteio completo realizado com sucesso!',
      icon: 'ph:check-circle-fill',
      progress: true,
    })

    emits('success')
    emits('close')
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao realizar sorteio completo',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white"
    trapped
    style="width: 40%"
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
        Realizar Sorteio
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
      <!-- Informações do Sorteio -->
      <div class="mb-6">
        <BaseHeading
          as="h4"
          size="sm"
          weight="medium"
          class="text-muted-700 dark:text-muted-300 mb-2"
        >
          {{ raffle.name }}
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500">
          {{ raffle.description || 'Sem descrição' }}
        </BaseParagraph>
      </div>

      <!-- Estatísticas -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-primary-500">{{ raffle.entries?.length || 0 }}</div>
            <div class="text-sm text-muted-500">Bilhetes</div>
          </div>
        </div>
        <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-success-500">{{ raffle.timeTracking?.length || 0 }}</div>
            <div class="text-sm text-muted-500">Participantes</div>
          </div>
        </div>
        <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-warning-500">{{ raffle.prizes?.length || 0 }}</div>
            <div class="text-sm text-muted-500">Prêmios</div>
          </div>
        </div>
      </div>

      <!-- Seleção de Prêmio -->
      <div class="mb-6">
        <BaseHeading
          as="h5"
          size="sm"
          weight="medium"
          class="text-muted-700 dark:text-muted-300 mb-3"
        >
          Escolha o Prêmio para Sortear
        </BaseHeading>
        
        <div class="space-y-3">
          <div
            v-for="prize in raffle.prizes"
            :key="prize.id"
            class="border rounded-lg p-4 transition-colors"
            :class="{
              'border-primary-500 bg-primary-50 dark:bg-primary-900/20': selectedPrize?.id === prize.id,
              'border-muted-200 dark:border-muted-700 hover:bg-muted-50 dark:hover:bg-muted-800 cursor-pointer': !isPrizeAlreadyDrawn(prize.id),
              'border-muted-300 dark:border-muted-600 bg-muted-100 dark:bg-muted-800 cursor-not-allowed opacity-60': isPrizeAlreadyDrawn(prize.id)
            }"
            @click="!isPrizeAlreadyDrawn(prize.id) && (selectedPrize = prize)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div 
                  class="size-4 rounded-full border-2"
                  :class="{
                    'border-primary-500 bg-primary-500': selectedPrize?.id === prize.id,
                    'border-muted-300': !isPrizeAlreadyDrawn(prize.id) && selectedPrize?.id !== prize.id,
                    'border-muted-400 bg-muted-400': isPrizeAlreadyDrawn(prize.id)
                  }"
                >
                  <Icon 
                    v-if="selectedPrize?.id === prize.id"
                    name="lucide:check" 
                    class="size-3 text-white"
                  />
                  <Icon 
                    v-else-if="isPrizeAlreadyDrawn(prize.id)"
                    name="lucide:check-circle" 
                    class="size-3 text-white"
                  />
                </div>
                <div>
                  <div class="font-medium flex items-center gap-2"
                    :class="{
                      'text-muted-700 dark:text-muted-300': !isPrizeAlreadyDrawn(prize.id),
                      'text-muted-500 dark:text-muted-400': isPrizeAlreadyDrawn(prize.id)
                    }"
                  >
                    {{ prize.name }}
                    <span 
                      v-if="isPrizeAlreadyDrawn(prize.id)"
                      class="text-xs bg-success-100 dark:bg-success-900 text-success-700 dark:text-success-300 px-2 py-1 rounded-full"
                    >
                      Já Sorteado
                    </span>
                  </div>
                  <div class="text-sm"
                    :class="{
                      'text-muted-500': !isPrizeAlreadyDrawn(prize.id),
                      'text-muted-400': isPrizeAlreadyDrawn(prize.id)
                    }"
                  >
                    {{ prize.type }} • Quantidade: {{ prize.quantity }}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium text-muted-600 dark:text-muted-400">
                  {{ prize.value ? `R$ ${prize.value}` : 'Sem valor' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Botões de Ação -->
      <div class="flex gap-3 pt-6 border-t border-muted-200 dark:border-muted-700">
        <BaseButton
          @click="executePrizeRaffle"
          :disabled="!selectedPrize || loading || (selectedPrize && isPrizeAlreadyDrawn(selectedPrize.id))"
          variant="primary"
          size="lg"
          rounded="lg"
          :loading="loading"
          class="flex-1"
        >
          <Icon name="lucide:dice-6" class="size-4" />
          <span>Sortear Prêmio Selecionado</span>
        </BaseButton>

        <BaseButton
          @click="executeFullRaffle"
          :disabled="loading"
          variant="default"
          size="lg"
          rounded="lg"
          :loading="loading"
          class="flex-1"
        >
          <Icon name="lucide:zap" class="size-4" />
          <span>Sortear Todos os Prêmios</span>
        </BaseButton>
      </div>

      <!-- Aviso -->
      <div class="mt-4 p-4 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
        <div class="flex items-start gap-3">
          <Icon name="lucide:alert-triangle" class="size-5 text-warning-500 mt-0.5" />
          <div>
            <div class="font-medium text-warning-700 dark:text-warning-300 mb-1">
              Atenção
            </div>
            <div class="text-sm text-warning-600 dark:text-warning-400">
              Após realizar o sorteio, o status será alterado para "Finalizado" e não será possível fazer alterações.
            </div>
          </div>
        </div>
      </div>
    </div>
  </FocusScope>
</template>
