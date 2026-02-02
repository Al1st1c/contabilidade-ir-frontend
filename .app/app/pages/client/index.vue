<script setup lang="ts">
definePageMeta({
  layout: 'client',
})

const { user } = useAuth()
const { useCustomFetch } = useApi()
const { selectedTaxYear } = useClientSession()

const isLoading = ref(true)
const rawClient = ref<any>(null)
const rawDeclaration = ref<any>(null)

async function loadData() {
  if (!user.value?.id) return

  try {
    isLoading.value = true
    const { data: clientRes } = await useCustomFetch(`/clients/${user.value.id}`)
    if (clientRes.success) {
      rawClient.value = clientRes.data

      // Busca declaração que bate com o ano selecionado
      const declaration = clientRes.data.taxDeclarations?.find((d: any) => Number(d.taxYear) === selectedTaxYear.value)

      if (declaration) {
        const { data: decRes } = await useCustomFetch(`/declarations/${declaration.id}`)
        if (decRes.success) {
          rawDeclaration.value = decRes.data
        } else {
          rawDeclaration.value = null
        }
      } else {
        rawDeclaration.value = null
      }
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error)
  } finally {
    isLoading.value = false
  }
}

// Recarrega quando mudar o ano no header
watch(selectedTaxYear, loadData)

onMounted(loadData)

const clientData = computed(() => {
  const declaration = rawDeclaration.value || rawClient.value?.taxDeclarations?.find((d: any) => Number(d.taxYear) === selectedTaxYear.value)

  const statusMapper: Record<string, any> = {
    pending: { label: 'Aguardando Documentos', color: 'danger', icon: 'solar:document-add-bold-duotone', description: 'Por favor, envie seus documentos para iniciarmos sua declaração.' },
    in_progress: { label: 'Em Análise', color: 'warning', icon: 'solar:magnifer-bold-duotone', description: 'Seus documentos foram recebidos e estão sendo analisados por nossa equipe.' },
    submitted: { label: 'Em Preenchimento', color: 'success', icon: 'solar:check-read-bold-duotone', description: 'Seu IRPF está sendo preenchido na Receita Federal.' },
    finished: { label: 'Transmitida', color: 'info', icon: 'solar:flag-bold-duotone', description: 'Processo concluído. Todos os documentos foram processados.' },
  }

  const currentStatus = statusMapper[declaration?.status as string] || statusMapper.pending

  const steps = [
    { label: 'Envio de Dados', completed: !!declaration },
    { label: 'Em Análise', active: declaration?.status === 'in_progress', completed: ['submitted', 'finished'].includes(declaration?.status) },
    { label: 'Em Preenchimento', active: declaration?.status === 'submitted', completed: ['finished'].includes(declaration?.status) },
    { label: 'Transmitida', active: declaration?.status === 'finished', completed: declaration?.status === 'finished' },
  ]

  return {
    name: rawClient.value?.name?.split(' ')[0] || 'Usuário',
    currentYear: selectedTaxYear.value,
    status: {
      ...currentStatus,
      steps
    },
    refund: {
      value: declaration?.resultValue || 0,
      status: declaration?.result === 'refund' ? 'A Receber' : declaration?.result === 'pay' ? 'A Pagar' : null
    },
    accountant: declaration?.assignedTo ? {
      name: declaration.assignedTo.name,
      photo: declaration.assignedTo.photo,
      phone: declaration.assignedTo.phone
    } : null,
    hasPendingDocs: declaration?.status === 'pending'
  }
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function openWhatsApp(phone: string) {
  window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank')
}
</script>

<template>
  <div class="space-y-10 pb-24">
    <!-- Welcome Section -->
    <section v-if="!isLoading" class="pt-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <BaseParagraph size="sm" class="text-muted-500 mb-1">Olá, {{ clientData.name }} 👋</BaseParagraph>
      <BaseHeading as="h2" size="2xl" weight="bold" class="text-muted-800 dark:text-white leading-tight">
        Seu IRPF {{ clientData.currentYear }} (Ano Calendário {{ clientData.currentYear - 1 }})
      </BaseHeading>
    </section>
    <!-- Pending Documents Alert -->
    <section v-if="!isLoading && clientData.hasPendingDocs"
      class="mt-4 animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
      <BaseCard
        class="p-5 border-2 border-warning-500/20 bg-warning-500/5 dark:bg-warning-500/10 shadow-sm shadow-warning-500/10">
        <div class="flex items-center gap-4">
          <div
            class="size-12 rounded-2xl bg-warning-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-warning-500/30">
            <Icon name="solar:document-add-bold" class="size-6" />
          </div>
          <div class="flex-1">
            <BaseHeading as="h4" size="sm" weight="bold" class="text-warning-800 dark:text-warning-100 mb-1">
              Documentos Pendentes
            </BaseHeading>
            <BaseParagraph size="xs" class="text-warning-700/80 dark:text-warning-300/80 font-medium leading-tight">
              Você possui pendências no IRPF {{ clientData.currentYear }}. Envie seus documentos agora para iniciarmos.
            </BaseParagraph>
          </div>
          <BaseButton variant="none" rounded="lg" size="sm"
            class="h-10 px-4 font-bold shadow-sm text-white bg-warning-500 hover:bg-warning-500/20"
            @click="navigateTo('/client/documentos')">
            Enviar Agora
          </BaseButton>
        </div>
      </BaseCard>
    </section>

    <!-- Skeleton if loading -->
    <div v-else-if="!isLoading && clientData.hasPendingDocs" class="space-y-6">
      <BasePlaceload class="h-8 w-48 rounded" />
      <BasePlaceload class="h-64 w-full rounded-2xl" />
      <BasePlaceload class="h-32 w-full rounded-2xl" />
    </div>

    <!-- Declaration content -->
    <template v-if="!isLoading && rawDeclaration">
      <!-- Status Card -->
      <BaseCard class="p-6 border-none shadow-sm relative overflow-hidden bg-white dark:bg-muted-950">
        <div class="flex items-center justify-between mb-6">
          <BaseHeading as="h3" size="sm" weight="bold" class="text-muted-400 uppercase tracking-widest">
            Status Atual
          </BaseHeading>
          <BaseTag :color="clientData.status.color" variant="primary" rounded="full" class="px-3 font-bold">
            <Icon :name="clientData.status.icon" class="size-4 mr-1" />
            {{ clientData.status.label }}
          </BaseTag>
        </div>

        <BaseHeading as="h3" size="md" weight="semibold" class="mb-2">
          Progresso da Declaração
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500 mb-6 font-medium leading-tight">
          {{ clientData.status.description }}
        </BaseParagraph>

        <!-- Vertical Timeline/Steps -->
        <div class="space-y-4">
          <div v-for="(step, index) in clientData.status.steps" :key="index" class="flex gap-4">
            <div class="relative flex flex-col items-center">
              <div class="size-6 rounded-full flex items-center justify-center z-10 transition-colors duration-300"
                :class="[
                  step.completed ? 'bg-success-500 text-white' :
                    step.active ? 'bg-primary-500 text-white ring-4 ring-primary-500/20' :
                      'bg-muted-200 dark:bg-muted-800 text-muted-400'
                ]">
                <Icon v-if="step.completed" name="solar:check-read-bold" class="size-4" />
                <span v-else class="text-[10px] font-bold">{{ Number(index) + 1 }}</span>
              </div>
              <div v-if="Number(index) < clientData.status.steps.length - 1"
                class="w-0.5 h-full absolute top-6 transition-colors duration-300"
                :class="step.completed ? 'bg-success-500' : 'bg-muted-200 dark:bg-muted-800'"></div>
            </div>
            <div class="pt-0.5">
              <BaseHeading as="h4" size="xs" weight="bold"
                :class="step.active || step.completed ? 'text-muted-800 dark:text-muted-100' : 'text-muted-400'">
                {{ step.label }}
              </BaseHeading>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Results Card (Refund/Pay) -->
      <BaseCard v-if="clientData.refund.status" class="p-6 border-none shadow-sm bg-white dark:bg-muted-950">
        <div class="flex items-center justify-between">
          <div>
            <BaseHeading as="h3" size="sm" weight="bold" class="text-muted-400 uppercase tracking-widest mb-1">
              Resultado Estimado
            </BaseHeading>
            <BaseHeading as="h4" size="lg" weight="bold"
              :class="clientData.refund.status === 'A Receber' ? 'text-success-500' : 'text-rose-500'">
              {{ formatCurrency(clientData.refund.value) }}
            </BaseHeading>
          </div>
          <BaseTag :color="clientData.refund.status === 'A Receber' ? 'success' : 'danger'" variant="muted"
            rounded="full" class="font-bold">
            {{ clientData.refund.status }}
          </BaseTag>
        </div>
      </BaseCard>

      <!-- Accountant Card -->
      <BaseCard v-if="clientData.accountant" class="p-6 border-none shadow-sm bg-white dark:bg-muted-950">
        <BaseHeading as="h3" size="sm" weight="bold" class="text-muted-400 uppercase tracking-widest mb-4">
          Seu Contador Responsável
        </BaseHeading>
        <div class="flex items-center gap-4">
          <BaseAvatar :src="clientData.accountant.photo" :text="clientData.accountant.name?.charAt(0)" size="md" />
          <div class="flex-1">
            <BaseHeading as="h4" size="sm" weight="bold">{{ clientData.accountant.name }}</BaseHeading>
            <BaseParagraph size="xs" class="text-muted-400">Garantindo a melhor entrega do seu IR</BaseParagraph>
          </div>
          <BaseButton v-if="clientData.accountant.phone" variant="muted" rounded="lg" size="sm" class="h-10"
            @click="openWhatsApp(clientData.accountant.phone)">
            <Icon name="logos:whatsapp-icon" class="size-4 mr-2" />
            Contato
          </BaseButton>
        </div>
      </BaseCard>
    </template>

    <!-- Empty State (No declaration for the year) -->
    <!-- Empty State -->
    <div v-else-if="!rawDeclaration" class="py-20 text-center px-4">
      <div class="size-20 bg-muted-100 dark:bg-muted-900 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon name="solar:document-add-linear" class="size-10 text-muted-400" />
      </div>
      <BaseHeading as="h3" size="md" weight="semibold" class="text-muted-400">Nenhuma declaração para {{ selectedTaxYear
      }}</BaseHeading>
      <BaseParagraph size="sm" class="text-muted-500 mt-2 max-w-[280px] mx-auto">
        Não encontramos uma declaração iniciada para este ano. Entre em contato com seu contador.
      </BaseParagraph>
    </div>

    <!-- Quick Help -->
  </div>
</template>
