<script setup lang="ts">
definePageMeta({
  layout: 'client',
})

const { user } = useAuth()
const { useCustomFetch } = useApi()
const { selectedTaxYear } = useClientSession()
const { fetchTenant, tenant } = useTenant()
const route = useRoute()
const config = useRuntimeConfig()
const apiBaseUrl = (config.public.apiBase as string || '').replace(/\/$/, '')
const token = computed(() => route.query.token as string | undefined)
const isPublicMode = computed(() => Boolean(token.value))
const clientPixKey = computed(() => (rawClient.value as any)?.pixKey || null)
function pixKeyType(key: string) {
  if (!key)
    return 'unknown'
  const digits = key.replace(/\D/g, '')
  if (digits.length === 11)
    return 'cpf'
  return 'bank'
}

const isLoading = ref(true)
const isReportingPayment = ref(false)
const rawClient = ref<any>(null)
const rawDeclaration = ref<any>(null)
const showOnboarding = ref(false)

async function loadData() {
  if (!token.value && !user.value?.id)
    return

  try {
    isLoading.value = true
    if (!token.value) {
      const [clientRes] = await Promise.all([
        useCustomFetch<any>(`/clients/${(user.value as any)?.id}`),
        fetchTenant(),
      ])

      if (clientRes.data.success) {
        rawClient.value = clientRes.data.data

        if (!clientRes.data.data.onboardingCompleted) {
          showOnboarding.value = true
        }

        const declaration = clientRes.data.data.taxDeclarations?.find((d: any) => Number(d.taxYear) === selectedTaxYear.value)

        if (declaration) {
          const { data: decRes } = await useCustomFetch(`/declarations/${declaration.id}`)
          if (decRes.success) {
            rawDeclaration.value = decRes.data
          }
          else {
            rawDeclaration.value = null
          }
        }
        else {
          rawDeclaration.value = null
        }
      }
    }
    else {
      const res = await fetch(`${apiBaseUrl}/public/${token.value}`)
      const result = await res.json()
      if (result?.success) {
        rawClient.value = { name: result.data?.client?.name }
        rawDeclaration.value = {
          id: null,
          taxYear: result.data?.declaration?.taxYear,
          status: result.data?.declaration?.status,
          assignedTo: null,
          paymentStatus: result.data?.declaration?.paymentStatus || null,
          result: result.data?.declaration?.result || null,
          resultValue: result.data?.declaration?.resultValue || 0,
          isPenaltyOffset: result.data?.declaration?.isPenaltyOffset || false,
        }
        selectedTaxYear.value = Number(result.data?.declaration?.taxYear) || selectedTaxYear.value
      }
    }
  }
  catch (error) {
    console.error('Erro ao carregar dados:', error)
  }
  finally {
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

  // Determine visual status and steps based on column mapping
  // Determine visual status using backend calculated appStatus, fallback to specific logic or raw status
  const visualStatus = declaration?.appStatus || (declaration?.status as string) || 'pending'

  const statusOrder = ['pending', 'in_progress', 'submitted', 'finished']
  const currentStatusIndex = statusOrder.indexOf(visualStatus)

  // Mapping strict based on new clientStatus field if available
  const steps = [
    {
      label: 'Envio de Dados',
      completed: !!declaration,
    },
    {
      label: 'Em Análise',
      active: visualStatus === 'in_progress',
      completed: currentStatusIndex > 1, // > in_progress
    },
    {
      label: 'Em Preenchimento',
      active: visualStatus === 'submitted',
      completed: currentStatusIndex > 2, // > submitted
    },
    {
      label: 'Transmitida',
      active: visualStatus === 'finished',
      completed: visualStatus === 'finished',
    },
    {
      label: 'Pagamento Honorários',
      active: visualStatus === 'finished' && declaration?.paymentStatus !== 'paid',
      completed: declaration?.paymentStatus === 'paid',
    },
  ]

  const currentStatus = statusMapper[visualStatus] || statusMapper.pending

  const resultCode = declaration?.result as string | undefined
  const refundStatus
    = resultCode && ['refund', 'tax_to_receive', 'to_receive', 'refund_due'].includes(resultCode)
      ? 'A Receber'
      : resultCode && ['pay', 'tax_to_pay', 'to_pay', 'owed'].includes(resultCode)
        ? 'A Pagar'
        : null
  const refundValue = declaration?.resultValue != null ? Number(declaration.resultValue) : 0

  return {
    id: declaration?.id,
    name: rawClient.value?.name?.split(' ')[0] || 'Usuário',
    currentYear: selectedTaxYear.value,
    status: {
      ...currentStatus,
      steps,
    },
    payment: {
      status: declaration?.paymentStatus || 'pending',
      pixKey: tenant.value?.pixKey,
      value: declaration?.serviceValue || 0,
    },
    refund: {
      value: refundValue,
      status: refundStatus,
      isPenaltyOffset: declaration?.isPenaltyOffset || false,
    },
    accountant: declaration?.assignedTo
      ? {
        name: declaration.assignedTo.name,
        photo: declaration.assignedTo.photo,
        phone: declaration.assignedTo.phone,
      }
      : null,
    hasPendingDocs: declaration?.status === 'pending',
    pixKey: rawClient.value?.pixKey,
  }
})

async function handleReportPayment() {
  if (!rawDeclaration.value?.id)
    return

  // Simular clique em "Já Paguei"
  // Em uma implementação real, abriríamos um modal para upload opcional
  // Por agora vamos apenas marcar como pago
  try {
    isReportingPayment.value = true
    const { data: res } = await useCustomFetch<any>(`/declarations/${rawDeclaration.value.id}/report-payment`, {
      method: 'POST',
    })

    if (res.success) {
      await loadData()
    }
  }
  catch (error) {
    console.error('Erro ao reportar pagamento:', error)
  }
  finally {
    isReportingPayment.value = false
  }
}

function handleUploadReceipt() {
  // Trigger file input
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*,application/pdf'
  input.onchange = async (e: any) => {
    const file = e.target.files[0]
    if (!file)
      return

    const formData = new FormData()
    formData.append('file', file)

    try {
      isReportingPayment.value = true
      const { data: res } = await useCustomFetch<any>(`/declarations/${rawDeclaration.value.id}/report-payment`, {
        method: 'POST',
        body: formData,
      })

      if (res.success) {
        await loadData()
      }
    }
    catch (error) {
      console.error('Erro ao subir comprovante:', error)
    }
    finally {
      isReportingPayment.value = false
    }
  }
  input.click()
}

function copyPixKey() {
  if (!clientData.value.payment.pixKey)
    return
  navigator.clipboard.writeText(clientData.value.payment.pixKey)
  // Toast opcional
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function openWhatsApp(phone: string) {
  window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank')
}

function goToDocuments() {
  if (token.value)
    navigateTo({ path: '/client/documentos', query: { token: token.value } })
  else
    navigateTo('/client/documentos')
}
</script>

<template>
  <div class="space-y-10 pb-24">
    <div v-if="isLoading" class="px-4 space-y-4">
      <BasePlaceload v-for="i in 2" :key="i" class="h-30 w-full rounded-2xl" />
    </div>

    <!-- Welcome Section -->
    <section v-if="!isLoading" class="pt-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <BaseParagraph size="sm" class="text-muted-500 mb-1">
        Olá, {{ clientData.name }} 👋
      </BaseParagraph>
      <BaseHeading as="h2" size="2xl" weight="bold" class="text-muted-800 dark:text-white leading-tight">
        Seu IRPF {{ clientData.currentYear }}
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
            @click="goToDocuments">
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
                  step.completed ? 'bg-success-500 text-white'
                    : step.active ? 'bg-primary-500 text-white ring-4 ring-primary-500/20'
                      : 'bg-muted-200 dark:bg-muted-800 text-muted-400',
                ]">
                <Icon v-if="step.completed" name="solar:check-read-bold" class="size-4" />
                <span v-else class="text-[10px] font-bold">{{ Number(index) + 1 }}</span>
              </div>
              <div v-if="Number(index) < clientData.status.steps.length - 1"
                class="w-0.5 h-full absolute top-6 transition-colors duration-300"
                :class="step.completed ? 'bg-success-500' : 'bg-muted-200 dark:bg-muted-800'" />
            </div>
            <div class="pt-0.5 flex-1">
              <BaseHeading as="h4" size="xs" weight="bold"
                :class="step.active || step.completed ? 'text-muted-800 dark:text-muted-100' : 'text-muted-400'">
                {{ step.label }}
                <Icon v-if="Number(index) === 4 && step.completed" name="solar:verified-check-bold"
                  class="size-3 ml-1 text-success-500 align-middle" />
              </BaseHeading>

              <!-- Minimalist Payment Section (REFINED) -->
              <div v-if="!isPublicMode && index === 4 && step.active && rawDeclaration?.paymentStatus === 'pending'"
                class="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div class="flex items-center justify-between py-2 border-y border-muted-200 dark:border-muted-800">
                  <div class="flex items-center gap-2">
                    <Icon name="fa6-brands:pix" class="size-3 text-emerald-500" />
                    <BaseText size="xs" weight="bold" class="text-primary-600 dark:text-primary-400 font-mono">
                      {{ clientData.payment.pixKey }}
                    </BaseText>
                  </div>
                  <button class="text-[10px] font-bold text-primary-500 hover:text-primary-600 uppercase tracking-wider"
                    @click="copyPixKey">
                    Copiar
                  </button>
                </div>

                <div class="flex items-center justify-between">
                  <BaseText size="xs" class="text-muted-500">
                    Valor do Honorário
                  </BaseText>
                  <BaseText size="xs" weight="bold" class="text-muted-800 dark:text-white">
                    {{ formatCurrency(clientData.payment.value) }}
                  </BaseText>
                </div>

                <div class="flex gap-2 pt-1">
                  <BaseButton variant="primary" rounded="lg" size="sm" :loading="isReportingPayment"
                    class="flex-1 h-8 font-bold text-[10px] uppercase tracking-wider" @click="handleReportPayment">
                    Já Paguei
                  </BaseButton>
                  <BaseButton variant="none" rounded="lg" size="sm" :disabled="isReportingPayment"
                    class="flex-1 h-8 border border-muted-200 dark:border-muted-800 text-muted-500 hover:text-primary-500 font-bold text-[10px] uppercase tracking-wider"
                    @click="handleUploadReceipt">
                    Comprovante
                  </BaseButton>
                </div>
              </div>

              <!-- Awaiting Verification Status (NEW) -->
              <div v-if="index === 4 && step.active && rawDeclaration?.paymentStatus === 'processing'"
                class="mt-4 p-4 rounded-xl bg-orange-500/5 border border-orange-200 dark:border-orange-800/20 animate-in fade-in slide-in-from-top-2">
                <div class="flex items-center gap-3">
                  <div class="size-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <Icon name="solar:clock-circle-bold-duotone" class="size-5" />
                  </div>
                  <div class="leading-tight">
                    <BaseText size="xs" weight="bold" class="text-orange-600 dark:text-orange-400 block">
                      Confirmação
                      Pendente
                    </BaseText>
                    <BaseText size="xs" class="text-muted-500 text-[10px]">
                      Já recebemos seu aviso. Nossa equipe
                      confirmará o pagamento em breve.
                    </BaseText>
                  </div>
                </div>
              </div>

              <!-- Paid Confirmation (REFINED) -->
              <div v-if="index === 4 && step.completed"
                class="mt-2 flex items-center gap-2 text-success-500 animate-in fade-in">
                <Icon name="solar:verified-check-bold" class="size-4" />
                <BaseText size="xs" weight="bold">
                  Pagamento Confirmado
                </BaseText>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Results & Payment Card (Refund/Pay/Fees) -->
      <BaseCard
        v-if="clientData.refund.status || clientData.status.steps[3].completed || clientData.status.steps[4].active || clientData.status.steps[4].completed"
        rounded="lg" class="border-none shadow-xl relative overflow-hidden group">
        <!-- Premium Background Effects -->
        <div class="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none">
          <div class="absolute -top-24 -right-24 size-64 rounded-full blur-3xl transition-colors duration-500"
            :class="clientData.refund.status === 'A Receber' ? 'bg-success-500/40' : 'bg-danger-500/10'" />
          <div class="absolute -bottom-24 -left-24 size-64 rounded-full blur-3xl transition-colors duration-500"
            :class="clientData.refund.status === 'A Receber' ? 'bg-success-500/20' : 'bg-danger-500/5'" />
        </div>

        <div class="relative flex flex-col h-full">
          <!-- Result Header -->
          <div class="p-8 border-b border-muted-100 dark:border-muted-800">
            <div class="flex items-center justify-between mb-8">
              <BaseHeading as="h4" size="xs" weight="medium" lead="none"
                class="text-muted-400 uppercase tracking-widest">
                Resultado Oficial
              </BaseHeading>
              <div class="size-10 rounded-xl flex items-center justify-center shadow-lg"
                :class="clientData.refund.status ? (clientData.refund.status === 'A Receber' ? 'bg-success-500/10 text-success-500' : 'bg-danger-500/5 text-danger-400') : 'bg-info-500/10 text-info-500'">
                <Icon
                  :name="clientData.refund.status ? (clientData.refund.status === 'A Receber' ? 'solar:hand-stars-bold-duotone' : 'solar:bill-list-bold-duotone') : 'solar:flag-bold-duotone'"
                  class="size-6" />
              </div>
            </div>

            <div v-if="clientData.refund.status" class="space-y-4">
              <div class="flex items-baseline gap-2">
                <!-- <span class="text-2xl font-light text-muted-400">R$</span> -->
                <BaseHeading as="h2" :size="clientData.refund.status === 'A Receber' ? '5xl' : '3xl'" weight="bold"
                  class="tracking-tight leading-none"
                  :class="clientData.refund.status === 'A Receber' ? 'text-green-500' : 'text-red-500/80'">
                  {{ clientData.refund.status }}
                </BaseHeading>
              </div>

              <div class="flex items-center gap-2">
                <BaseTag v-if="clientData.refund.status === 'A Receber'" size="sm" variant="none"
                  class="px-4 py-1.5 font-bold text-[10px] uppercase tracking-wider bg-success-500 text-white rounded-full">
                  {{ clientData.refund.status }}
                </BaseTag>
                <BaseTag v-else size="sm" variant="none"
                  class="px-3 py-1 font-semibold text-[10px] uppercase tracking-wider bg-danger-500/10 text-danger-700 border border-danger-500/20 rounded-full">
                  {{ clientData.refund.status }}
                </BaseTag>
                <BaseText size="xs" class="text-muted-500 font-medium">
                  {{ clientData.refund.status === 'A Receber'
                    ? 'A ser depositado em sua conta' : 'Valor a ser pago à Receita' }}
                </BaseText>
              </div>
              <div class="flex items-center justify-between mt-2">
                <BaseText size="xs" class="text-muted-500">
                  Valor
                </BaseText>
                <BaseText size="xs" weight="bold" class="text-muted-800 dark:text-white">
                  {{ formatCurrency(clientData.refund.value || 0) }}
                </BaseText>
              </div>
              <div v-if="clientData.refund.status === 'A Pagar'" class="mt-2 space-y-2">
                <div v-if="clientData.refund.isPenaltyOffset"
                  class="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
                  <Icon name="solar:verified-check-bold" class="size-5 text-orange-500 shrink-0 mt-0.5" />
                  <div class="leading-tight">
                    <BaseText size="xs" weight="bold" class="text-orange-600 dark:text-orange-400 block">Multa
                      Compensada</BaseText>
                    <BaseText size="xs" class="text-orange-700/70 dark:text-orange-400/60 text-[10px]">
                      O valor da multa foi compensado pelo seu saldo a restituir. <b>Você não precisa pagar o DARF</b>.
                    </BaseText>
                  </div>
                </div>
                <div v-else class="flex items-center gap-2">
                  <Icon name="solar:info-circle-bold" class="size-4 text-danger-500/80" />
                  <BaseText size="xs" class="text-danger-600/80 dark:text-danger-400/80">
                    O DARF para pagamento está em Documentos Oficiais.
                  </BaseText>
                </div>
              </div>
              <div v-else-if="clientData.refund.status === 'A Receber'" class="mt-2 flex items-center gap-2">
                <Icon name="solar:info-circle-bold" class="size-4 text-success-500" />
                <BaseText size="xs" class="text-success-600 dark:text-success-400">
                  Confirme sua chave Pix: CPF ou Agência e Conta.
                </BaseText>
              </div>
              <div v-if="clientData.refund.status === 'A Receber'" class="mt-2 flex items-center justify-between">
                <BaseText size="xs" class="text-muted-500">
                  Chave Pix
                </BaseText>
                <div class="flex items-center gap-2">
                  <BaseTag v-if="clientPixKey" size="sm" variant="none"
                    :class="pixKeyType(clientPixKey) === 'cpf' ? 'bg-success-500 text-white' : 'bg-info-500 text-white'">
                    {{ pixKeyType(clientPixKey) === 'cpf' ? 'CPF' : 'Agência/Conta' }}
                  </BaseTag>
                  <BaseTag v-else size="sm" variant="none" class="bg-danger-500 text-white">
                    Não configurada
                  </BaseTag>
                </div>
              </div>
            </div>

            <div v-else class="py-4">
              <template v-if="rawDeclaration?.status === 'finished'">
                <div class="flex items-center gap-3">
                  <div class="size-10 rounded-xl bg-info-500/10 text-info-500 flex items-center justify-center">
                    <Icon name="solar:flag-bold-duotone" class="size-6" />
                  </div>
                  <div>
                    <BaseHeading as="h2" size="lg" weight="bold" class="leading-none">
                      Transmitida
                    </BaseHeading>
                    <BaseText size="xs" class="text-muted-500">
                      Sua declaração foi transmitida. Os documentos oficiais estão abaixo.
                    </BaseText>
                  </div>
                </div>
              </template>
              <template v-else>
                <BasePlaceholderMinimal title="Aguardando Transmissão"
                  subtitle="O resultado oficial aparecerá aqui após a entrega." class="!bg-transparent" />
              </template>
            </div>
          </div>

          <!-- Quick Access / Documents (only if transmitted) -->
          <div v-if="clientData.status.steps[3].completed || clientData.status.steps[4].completed"
            class="p-6 bg-muted-50/50 dark:bg-muted-900/50">
            <BaseButton variant="none" rounded="lg" size="lg"
              class="w-full justify-between group h-14 bg-white dark:bg-muted-950 border border-muted-200 dark:border-muted-800 shadow-sm"
              @click="navigateTo('/client/documents')">
              <div class="flex items-center gap-3">
                <div class="size-10 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center">
                  <Icon name="solar:folder-with-files-bold-duotone" class="size-6" />
                </div>
                <div class="text-left leading-none">
                  <span class="block font-bold text-sm text-muted-800 dark:text-muted-100">Recibo & Declaração</span>
                  <span class="text-[10px] text-muted-400 font-medium">Arquivos oficiais para download</span>
                </div>
              </div>
              <Icon name="solar:alt-arrow-right-bold"
                class="size-5 text-muted-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </BaseButton>
          </div>
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
            <BaseHeading as="h4" size="sm" weight="bold">
              {{ clientData.accountant.name }}
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-400">
              Garantindo a melhor entrega do seu IR
            </BaseParagraph>
          </div>
          <BaseButton v-if="clientData.accountant.phone" variant="muted" rounded="lg" size="sm" class="h-10"
            @click="openWhatsApp(clientData.accountant.phone)">
            <Icon name="logos:whatsapp-icon" class="size-4 mr-2" />
            Contato
          </BaseButton>
        </div>
      </BaseCard>
    </template>

    <!-- Empty State -->
    <div v-else-if="!isLoading && !rawDeclaration" class="py-20 text-center px-4">
      <div class="size-20 bg-muted-100 dark:bg-muted-900 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon name="solar:document-add-linear" class="size-10 text-muted-400" />
      </div>
      <BaseHeading as="h3" size="md" weight="semibold" class="text-muted-400">
        Nenhuma declaração para {{ selectedTaxYear }}
      </BaseHeading>
      <BaseParagraph size="sm" class="text-muted-500 mt-2 max-w-[280px] mx-auto">
        Não encontramos uma declaração iniciada para este ano. Entre em contato com seu contador.
      </BaseParagraph>
    </div>

    <!-- Onboarding Modal -->
    <ClientOnboardingModal :open="showOnboarding" :client="rawClient" @close="showOnboarding = false"
      @complete="loadData" />
  </div>
</template>
