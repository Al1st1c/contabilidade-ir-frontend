<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    cpfData?: any
  }>(),
  {
    cpfData: undefined,
  },
)

const emits = defineEmits<{
  close: []
}>()

onKeyStroke('Escape', () => emits('close'))

const detailsExpanded = ref(false)

</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white"
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
        Detalhes da Consulta CPF
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
      <div v-if="cpfData" class="space-y-6">
        <!-- Dados Pessoais -->
        <div class="border-b border-muted-200 dark:border-muted-700 pb-6">
          <BaseHeading as="h4" size="sm" weight="medium" class="mb-4">
            Dados Pessoais
          </BaseHeading>
          <div class="space-y-4">
            <div>
              <BaseText size="xs" class="text-muted-500 uppercase tracking-wider mb-1">Nome</BaseText>
              <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-muted-100 ml-2">
                {{ cpfData.name }}
              </BaseText>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <BaseText size="xs" class="text-muted-500 uppercase tracking-wider mb-1">CPF</BaseText>
                <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-muted-100 ml-2">
                  {{ cpfData.cpf }}
                </BaseText>
              </div>
              <div>
                <BaseText size="xs" class="text-muted-500 uppercase tracking-wider mb-1">Nasc.</BaseText>
                <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-muted-100 ml-2">
                  {{ cpfData.birth || 'Não informado' }}
                </BaseText>
              </div>
            </div>
            <div>
              <BaseText size="xs" class="text-muted-500 uppercase tracking-wider mb-1">Situação</BaseText>
              <BaseText 
                size="sm" 
                weight="medium" 
                class="ml-2"
                :class="cpfData.situation === 'REGULAR' ? 'text-success-600' : 'text-warning-600'"
              >
                {{ cpfData.situation }}
              </BaseText>
            </div>
          </div>
        </div>

        <!-- Análise de Risco -->
        <div class="border-b border-muted-200 dark:border-muted-700 pb-6">
          <BaseHeading as="h4" size="sm" weight="medium" class="mb-4">
            Análise de Risco
          </BaseHeading>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <BaseText size="xs" class="text-muted-500 uppercase tracking-wider mb-1">Score</BaseText>
              <div class="flex items-center gap-2">
                <BaseText size="lg" weight="bold" class="text-primary-600">
                  {{ cpfData.score }}
                </BaseText>
                <div class="flex-1">
                  <BaseProgress 
                    :model-value="(parseInt(cpfData.score) / 1000) * 100" 
                    size="xs" 
                    variant="primary"
                  />
                </div>
              </div>
            </div>
            <div>
              <BaseText size="xs" class="text-muted-500 uppercase tracking-wider mb-1">Dívida Ativa da União:</BaseText>
              <br/>
              <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-muted-100">
                {{ cpfData.divida_ativa_da_uniao || 'Não' }}
              </BaseText>
            </div>
          </div>
        </div>

        <!-- Telefones -->
        <div v-if="cpfData.phones && cpfData.phones.length > 0" class="border-b border-muted-200 dark:border-muted-700 pb-6">
          <BaseHeading as="h4" size="sm" weight="medium" class="mb-4">
            Telefones ({{ cpfData.countPhones }})
          </BaseHeading>
          <div class="space-y-3">
            <div
              v-for="(phone, index) in cpfData.phones"
              :key="index"
              class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4"
            >
              <div class="flex items-center justify-between">
                <div>
                  <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-muted-100">
                    {{ phone.number }}
                  </BaseText>
                  <BaseText size="xs" class="text-muted-500 ml-2">
                    {{ phone.carrier }} • {{ phone.type === 'C' ? 'Celular' : 'Fixo' }}
                  </BaseText>
                </div>
                <div class="flex gap-2">
                  <span 
                    v-if="phone.plan_op === 'S'" 
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200"
                  >
                    Pré-pago
                  </span>
                  <span 
                    v-if="phone.procon === 'S'" 
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200"
                  >
                    Procon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado vazio -->
      <div v-else class="flex flex-col items-center justify-center h-full text-center">
        <Icon name="ph:file-x" class="size-16 text-muted-400 mb-4" />
        <BaseHeading as="h4" size="sm" weight="medium" class="text-muted-600 dark:text-muted-300 mb-2">
          Nenhum dado encontrado
        </BaseHeading>
        <BaseText size="sm" class="text-muted-500">
          Os detalhes do CPF não estão disponíveis
        </BaseText>
      </div>
    </div>
  </FocusScope>
</template>
