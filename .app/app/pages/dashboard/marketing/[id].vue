<script setup lang="ts">
import { useApi } from '~/composables/useAuth'
import { useSubscription } from '~/composables/useSubscription'

definePageMeta({
  title: 'Detalhes da Campanha',
})

const { useCustomFetch } = useApi()
const route = useRoute()
const toaster = useNuiToasts()

const campaignId = route.params.id as string
const isLoading = ref(true)
const isSending = ref(false)
const campaign = ref<any>(null)

const { currentSubscription, fetchMySubscription } = useSubscription()

onMounted(async () => {
  await Promise.all([loadCampaign(), fetchMySubscription()])
  isLoading.value = false
})

async function loadCampaign() {
  try {
    const { data } = await useCustomFetch(`/marketing/campaigns/${campaignId}`)
    campaign.value = data
  } catch (err: any) {
    toaster.add({ title: 'Erro', description: err.message, icon: 'solar:danger-triangle-bold-duotone' })
  }
}

async function sendCampaign() {
  if (isSending.value || !campaign.value) return

  // Check balance
  const availableSms = (currentSubscription.value?.smsPrepaidCredits || 0) + (currentSubscription.value?.plan?.limits?.sms_monthly || 0)
  const usedSms = currentSubscription.value?.monthlyUsage?.sms || 0
  const remainingSms = Math.max(0, availableSms - usedSms)

  if (remainingSms < campaign.value.totalNumbers) {
    toaster.add({
      title: 'Saldo insuficiente',
      description: `Você tem ${remainingSms} SMS disponíveis, mas esta campanha precisa de ${campaign.value.totalNumbers}.`,
      icon: 'solar:danger-triangle-bold-duotone',
    })
    return
  }

  isSending.value = true
  try {
    const { data } = await useCustomFetch(`/marketing/campaigns/${campaignId}/send`, {
      method: 'POST',
    })
    const result = data as any
    toaster.add({
      title: 'Campanha disparada!',
      description: result.message,
      icon: 'solar:check-circle-bold-duotone',
    })
    await loadCampaign()
  } catch (err: any) {
    toaster.add({ title: 'Erro no disparo', description: err.message, icon: 'solar:danger-triangle-bold-duotone' })
  } finally {
    isSending.value = false
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'COMPLETED': return 'text-success-500 bg-success-500/10'
    case 'PROCESSING': return 'text-yellow-500 bg-yellow-500/10'
    case 'FAILED': return 'text-danger-500 bg-danger-500/10'
    case 'SENT': return 'text-success-500 bg-success-500/10'
    case 'PENDING': return 'text-muted-500 bg-muted-500/10'
    case 'DRAFT': return 'text-muted-500 bg-muted-500/10'
    default: return 'text-muted-400 bg-muted-400/10'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'COMPLETED': return 'Concluída'
    case 'PROCESSING': return 'Enviando...'
    case 'FAILED': return 'Falha'
    case 'SENT': return 'Enviado'
    case 'PENDING': return 'Pendente'
    case 'DRAFT': return 'Rascunho'
    default: return status
  }
}

function formatPhone(phone: string) {
  if (phone.length === 11) return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`
  if (phone.length === 10) return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`
  return phone
}

const sentPercent = computed(() => {
  if (!campaign.value?.recipients?.length) return 0
  const sent = campaign.value.recipients.filter((r: any) => r.status === 'SENT').length
  return Math.round((sent / campaign.value.recipients.length) * 100)
})
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <AppPageLoading v-if="isLoading" min-height="60vh" message="Carregando campanha..." />

    <div v-else-if="campaign" class="mx-auto max-w-5xl">
      <!-- Header -->
      <div class="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <NuxtLink to="/dashboard/marketing"
            class="text-primary-500 hover:opacity-75 transition-opacity flex items-center gap-2 mb-2 font-medium text-sm">
            <Icon name="solar:alt-arrow-left-linear" class="size-4" />
            Voltar às Campanhas
          </NuxtLink>
          <div class="flex items-center gap-3 mb-1">
            <BaseHeading as="h1" size="2xl" weight="bold" class="text-muted-800 dark:text-white">
              {{ campaign.name }}
            </BaseHeading>
            <span :class="statusColor(campaign.status)" class="px-3 py-1 rounded-full text-xs font-semibold">
              {{ statusLabel(campaign.status) }}
            </span>
          </div>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
            Criada em {{ new Date(campaign.createdAt).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year:
                'numeric', hour: '2-digit', minute: '2-digit'
            }) }}
            <span v-if="campaign.createdBy"> · por {{ campaign.createdBy.name }}</span>
          </BaseParagraph>
        </div>

        <BaseButton v-if="campaign.status === 'DRAFT'" variant="primary" color="primary" :loading="isSending"
          @click="sendCampaign" class="gap-2 shrink-0">
          <Icon name="solar:plain-2-bold-duotone" class="size-5" />
          Disparar Campanha
        </BaseButton>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <BaseCard rounded="md" class="p-4 text-center">
          <BaseText size="2xl" weight="bold" class="text-muted-800 dark:text-white block">
            {{ campaign.totalNumbers || campaign.recipients?.length || 0 }}
          </BaseText>
          <BaseText size="xs" class="text-muted-500">Total Contatos</BaseText>
        </BaseCard>
        <BaseCard rounded="md" class="p-4 text-center">
          <BaseText size="2xl" weight="bold" class="text-success-500 block">
            {{campaign.sentCount ?? campaign.recipients?.filter((r: any) => r.status === 'SENT').length ?? 0}}
          </BaseText>
          <BaseText size="xs" class="text-muted-500">Enviados</BaseText>
        </BaseCard>
        <BaseCard rounded="md" class="p-4 text-center">
          <BaseText size="2xl" weight="bold" class="text-danger-500 block">
            {{campaign.failedCount ?? campaign.recipients?.filter((r: any) => r.status === 'FAILED').length ?? 0}}
          </BaseText>
          <BaseText size="xs" class="text-muted-500">Falhas</BaseText>
        </BaseCard>
        <BaseCard rounded="md" class="p-4 text-center">
          <BaseText size="2xl" weight="bold" class="text-primary-500 block">
            {{ sentPercent }}%
          </BaseText>
          <BaseText size="xs" class="text-muted-500">Taxa de Envio</BaseText>
        </BaseCard>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <!-- Message Preview -->
        <div class="col-span-12 md:col-span-5">
          <BaseCard rounded="md" class="p-5 sticky top-6">
            <BaseHeading as="h3" size="sm" weight="bold" class="mb-4 flex items-center gap-2">
              <Icon name="solar:chat-round-dots-bold-duotone" class="size-4 text-primary-500" />
              Mensagem
            </BaseHeading>
            <div class="p-4 rounded-lg bg-primary-500/5 border border-primary-500/20">
              <BaseText size="sm" class="text-muted-700 dark:text-muted-200 whitespace-pre-wrap">
                {{ campaign.message }}
              </BaseText>
            </div>
            <div class="flex justify-between mt-3 text-[10px] text-muted-400">
              <span>{{ campaign.message?.length || 0 }}/160 caracteres</span>
              <span>Mensagem limpa (sem acentos/emojis)</span>
            </div>

            <div v-if="campaign.processedAt" class="mt-4 pt-4 border-t border-muted-200 dark:border-muted-700">
              <BaseText size="xs" class="text-muted-500">
                Processado em {{ new Date(campaign.processedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit', month:
                    'short', hour: '2-digit', minute: '2-digit'
                }) }}
              </BaseText>
            </div>
          </BaseCard>
        </div>

        <!-- Recipients List -->
        <div class="col-span-12 md:col-span-7">
          <BaseCard rounded="md" class="p-5">
            <BaseHeading as="h3" size="sm" weight="bold" class="mb-4 flex items-center gap-2">
              <Icon name="solar:users-group-rounded-bold-duotone" class="size-4 text-primary-500" />
              Destinatários ({{ campaign.recipients?.length || 0 }})
            </BaseHeading>

            <!-- Progress bar -->
            <div v-if="campaign.status !== 'DRAFT'" class="mb-4">
              <div class="h-2 bg-muted-200 dark:bg-muted-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-success-500 to-success-400 rounded-full transition-all duration-500"
                  :style="{ width: `${sentPercent}%` }" />
              </div>
            </div>

            <div class="space-y-1 max-h-[500px] overflow-y-auto">
              <div v-for="recipient in campaign.recipients" :key="recipient.id"
                class="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted-50 dark:hover:bg-muted-800/50 transition-colors">
                <div class="flex items-center gap-3">
                  <div class="size-8 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center">
                    <Icon name="solar:phone-bold-duotone" class="size-4 text-muted-500" />
                  </div>
                  <BaseText size="xs" class="font-mono text-muted-700 dark:text-muted-300">
                    {{ formatPhone(recipient.phone) }}
                  </BaseText>
                </div>
                <div class="flex items-center gap-2">
                  <BaseText v-if="recipient.sentAt" size="xs" class="text-muted-400 hidden sm:block">
                    {{ new Date(recipient.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }}
                  </BaseText>
                  <span :class="statusColor(recipient.status)"
                    class="px-2 py-0.5 rounded-full text-[10px] font-semibold">
                    {{ statusLabel(recipient.status) }}
                  </span>
                </div>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>
    </div>
  </div>
</template>
