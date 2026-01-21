<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

interface Props {
  declarationId: string
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'saved'])

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

// States
const isLoading = ref(true)
const isSaving = ref(false)
const declaration = ref<any>(null)
const isGeneratingLink = ref(false)
const collectionLink = ref<any>(null)

// Form state
const form = ref({
  status: '',
  priority: '',
  declarationType: '',
  result: '',
  resultValue: 0,
  serviceValue: 0,
  paymentStatus: '',
  dueDate: '',
  description: '',
  internalNotes: '',
})

// Options
const statusOptions = [
  { label: 'Pendente', value: 'pending' },
  { label: 'Em Progresso', value: 'in_progress' },
  { label: 'Transmitida', value: 'submitted' },
  { label: 'Retificadora', value: 'rectifying' },
]

const priorityOptions = [
  { label: 'Baixa', value: 'low' },
  { label: 'Média', value: 'medium' },
  { label: 'Alta', value: 'high' },
]

const typeOptions = [
  { label: 'Simplificada', value: 'simplified' },
  { label: 'Completa', value: 'complete' },
]

const resultOptions = [
  { label: 'Restituição', value: 'refund' },
  { label: 'A Pagar', value: 'pay' },
  { label: 'Neutro', value: 'neutral' },
]

const paymentStatusOptions = [
  { label: 'Pendente', value: 'pending' },
  { label: 'Parcial', value: 'partial' },
  { label: 'Pago', value: 'paid' },
]

// Methods
async function fetchDeclaration() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}`)
    if (data.success) {
      declaration.value = data.data

      // Populate form
      form.value = {
        status: data.data.status,
        priority: data.data.priority,
        declarationType: data.data.declarationType,
        result: data.data.result || 'neutral',
        resultValue: data.data.resultValue || 0,
        serviceValue: data.data.serviceValue || 0,
        paymentStatus: data.data.paymentStatus,
        dueDate: (data.data.dueDate ? new Date(data.data.dueDate).toISOString().split('T')[0] : '') as string,
        description: data.data.description || '',
        internalNotes: data.data.internalNotes || '',
      }

      // Check for latest collection link
      if (data.data.collectionLinks?.length > 0) {
        collectionLink.value = data.data.collectionLinks[0]
      }
    }
  } catch (error) {
    console.error('Erro ao buscar detalhes da declaração:', error)
  } finally {
    isLoading.value = false
  }
}

async function save() {
  isSaving.value = true
  try {
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}`, {
      method: 'PUT',
      body: {
        ...form.value,
        resultValue: Number(form.value.resultValue),
        serviceValue: Number(form.value.serviceValue),
      }
    })

    if (data.success) {
      toaster.add({
        title: 'Sucesso',
        description: 'Declaração atualizada com sucesso!',
        icon: 'ph:check-circle-fill'
      })
      emit('saved')
      emit('close')
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao salvar alterações',
      icon: 'ph:warning-circle-fill'
    })
  } finally {
    isSaving.value = false
  }
}

async function remove() {
  if (!confirm('Tem certeza que deseja excluir esta declaração? Esta ação não pode ser desfeita.')) return

  try {
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}`, {
      method: 'DELETE'
    })

    if (data.success) {
      toaster.add({
        title: 'Sucesso',
        description: 'Declaração excluída com sucesso',
        icon: 'ph:check-circle-fill'
      })
      emit('saved')
      emit('close')
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao excluir declaração',
      icon: 'ph:warning-circle-fill'
    })
  }
}

async function generateLink() {
  isGeneratingLink.value = true
  try {
    const { data } = await useCustomFetch<any>(`/declarations/${props.declarationId}/collection-link`, {
      method: 'POST'
    })

    if (data.success) {
      collectionLink.value = data.data
      toaster.add({
        title: 'Link Gerado',
        description: 'Link de coleta gerado com sucesso!',
        icon: 'ph:link-fill'
      })
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao gerar link',
      icon: 'ph:warning-circle-fill'
    })
  } finally {
    isGeneratingLink.value = false
  }
}

const { open } = usePanels()
import { PanelsPanelClientDetails } from '#components'

function viewClient() {
  if (!declaration.value?.client?.id) return
  open(PanelsPanelClientDetails, {
    clientId: declaration.value.client.id
  })
}

function copyLink() {
  if (!collectionLink.value?.url) return
  const fullUrl = `${window.location.origin}${collectionLink.value.url}`
  navigator.clipboard.writeText(fullUrl)
  toaster.add({
    title: 'Copiado',
    description: 'Link copiado para a área de transferência',
    icon: 'ph:copy-fill'
  })
}

onMounted(() => {
  fetchDeclaration()
})

</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-700 dark:bg-muted-950 border-l bg-white w-full max-w-xl shadow-2xl"
    trapped loop>
    <!-- Header -->
    <div class="border-muted-200 dark:border-muted-800 flex h-20 w-full items-center justify-between border-b px-8">
      <div v-if="declaration" class="flex flex-col">
        <BaseHeading as="h3" size="sm" weight="medium"
          class="text-muted-800 dark:text-muted-100 uppercase tracking-wider">
          IR {{ declaration.taxYear }} - {{ declaration.client?.name }}
        </BaseHeading>
        <div class="flex items-center gap-2 mt-1">
          <BaseParagraph size="xs" class="text-muted-400 font-mono">
            {{ declaration.client?.cpfMasked }}
          </BaseParagraph>
          <span class="text-muted-300">•</span>
          <button type="button" @click="viewClient" class="text-xs text-primary-500 hover:text-primary-600 font-medium">
            Ver Ficha do Cliente
          </button>
        </div>
      </div>
      <div v-else class="flex flex-col gap-1">
        <BasePlaceload class="h-4 w-48 rounded" />
        <BasePlaceload class="h-3 w-32 rounded" />
      </div>

      <button type="button"
        class="hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-500 rounded-full p-2 transition-colors duration-300"
        @click="() => $emit('close')">
        <Icon name="lucide:x" class="size-5" />
      </button>
    </div>

    <!-- Content -->
    <div class="nui-slimscroll h-[calc(100dvh-160px)] overflow-y-auto p-8">
      <div v-if="isLoading" class="space-y-6">
        <BasePlaceload class="h-24 w-full rounded-xl" />
        <BasePlaceload class="h-48 w-full rounded-xl" />
        <BasePlaceload class="h-32 w-full rounded-xl" />
      </div>

      <div v-else-if="declaration" class="space-y-8">
        <!-- Status & Priority Section -->
        <div class="grid grid-cols-2 gap-4">
          <BaseInputWrapper label="Status do Processamento">
            <BaseSelect v-model="form.status" rounded="lg">
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </BaseSelect>
          </BaseInputWrapper>

          <BaseInputWrapper label="Prioridade">
            <BaseSelect v-model="form.priority" rounded="lg">
              <option v-for="opt in priorityOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </BaseSelect>
          </BaseInputWrapper>
        </div>

        <!-- Configuration -->
        <div class="grid grid-cols-2 gap-4">
          <BaseInputWrapper label="Tipo de Declaração">
            <BaseSelect v-model="form.declarationType" rounded="lg">
              <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </BaseSelect>
          </BaseInputWrapper>

          <BaseInputWrapper label="Prazo de Entrega">
            <BaseInput v-model="form.dueDate" type="date" rounded="lg" />
          </BaseInputWrapper>
        </div>

        <!-- Collection Link Section -->
        <BaseCard rounded="lg"
          class="p-6 border-muted-200 dark:border-muted-800 shadow-none border-dashed bg-primary-500/5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <BaseHeading as="h4" size="xs" weight="medium" class="uppercase tracking-widest text-primary-600 mb-1">
                Coleta de Documentos
              </BaseHeading>
              <BaseParagraph size="xs" class="text-muted-500">
                Envie este link para o cliente fazer upload dos documentos com segurança.
              </BaseParagraph>
            </div>
            <Icon name="lucide:file-up" class="size-6 text-primary-500" />
          </div>

          <div v-if="collectionLink"
            class="flex items-center gap-2 p-3 bg-white dark:bg-muted-900 rounded-lg border border-primary-500/20">
            <BaseParagraph size="xs" class="flex-1 truncate font-mono text-muted-500">
              {{ collectionLink.url }}
            </BaseParagraph>
            <div class="flex gap-2">
              <BaseButton size="icon-sm" @click="copyLink" title="Copiar Link">
                <Icon name="lucide:copy" class="size-3.5" />
              </BaseButton>
              <BaseButton size="icon-sm" variant="primary" :to="collectionLink.url" target="_blank" title="Abrir Link">
                <Icon name="lucide:external-link" class="size-3.5" />
              </BaseButton>
            </div>
          </div>
          <div v-else class="text-center py-2">
            <BaseButton variant="primary" size="sm" rounded="full" class="w-full" :loading="isGeneratingLink"
              @click="generateLink">
              Gerar Link de Coleta
            </BaseButton>
          </div>
        </BaseCard>

        <!-- Financial Section -->
        <BaseCard rounded="lg"
          class="p-6 border-muted-200 dark:border-muted-800 shadow-none bg-muted-50/50 dark:bg-muted-900/50">
          <BaseHeading as="h4" size="xs" weight="medium" class="uppercase tracking-widest text-muted-400 mb-4">
            Financeiro & Resultado
          </BaseHeading>

          <div class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
              <BaseInputWrapper label="Valor do Serviço (R$)">
                <BaseInput v-model="form.serviceValue" type="number" step="0.01" rounded="lg"
                  icon="lucide:dollar-sign" />
              </BaseInputWrapper>

              <BaseInputWrapper label="Status de Pagamento">
                <BaseSelect v-model="form.paymentStatus" rounded="lg">
                  <option v-for="opt in paymentStatusOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </BaseSelect>
              </BaseInputWrapper>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-muted-200 dark:border-muted-800">
              <BaseInputWrapper label="Resultado Estimado">
                <BaseSelect v-model="form.result" rounded="lg">
                  <option v-for="opt in resultOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </BaseSelect>
              </BaseInputWrapper>

              <BaseInputWrapper label="Valor Estimado (R$)">
                <BaseInput v-model="form.resultValue" type="number" step="0.01" rounded="lg" icon="lucide:calculator" />
              </BaseInputWrapper>
            </div>
          </div>
        </BaseCard>

        <!-- Notes -->
        <div class="space-y-6">
          <BaseInputWrapper label="Descrição Pública (O que o cliente vê)">
            <BaseTextarea v-model="form.description" rounded="lg"
              placeholder="Instruções para o cliente ou resumo do status..." />
          </BaseInputWrapper>

          <BaseInputWrapper label="Notas Internas (Apenas equipe)">
            <BaseTextarea v-model="form.internalNotes" rounded="lg"
              placeholder="Detalhes técnicos, pendências internas..." />
          </BaseInputWrapper>
        </div>

        <!-- Audit/Logs Preview -->
        <div v-if="declaration.auditLogs?.length > 0" class="space-y-4">
          <BaseHeading as="h4" size="sm" weight="medium">Atividade Recente</BaseHeading>
          <div class="space-y-3">
            <div v-for="log in declaration.auditLogs.slice(0, 3)" :key="log.id" class="flex gap-3">
              <div class="size-2 mt-1.5 rounded-full bg-primary-500 shrink-0" />
              <div>
                <BaseParagraph size="xs" weight="medium" class="text-muted-700 dark:text-muted-200">
                  {{ log.description }}
                </BaseParagraph>
                <BaseParagraph size="xs" class="text-muted-400">
                  Por {{ log.userName }} em {{ new Date(log.createdAt).toLocaleString('pt-BR') }}
                </BaseParagraph>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div
      class="border-muted-200 dark:border-muted-800 flex h-20 w-full items-center justify-between border-t px-8 bg-muted-50/50 dark:bg-muted-950/50">
      <BaseButton variant="destructive" ghost size="sm" @click="remove">
        <Icon name="lucide:trash-2" class="size-4 mr-2" />
        Excluir Card
      </BaseButton>

      <div class="flex gap-3">
        <BaseButton size="sm" @click="() => $emit('close')">Cancelar</BaseButton>
        <BaseButton variant="primary" size="sm" :loading="isSaving" @click="save">
          Salvar Alterações
        </BaseButton>
      </div>
    </div>
  </FocusScope>
</template>
