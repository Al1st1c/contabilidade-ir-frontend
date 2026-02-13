<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Marketing SMS',
})

const { useCustomFetch } = useApi()
const router = useRouter()
const toaster = useNuiToasts()

// Onboarding state
const ONBOARDING_KEY = 'marketing_onboarding_completed'
const showOnboarding = ref(false)
const onboardingStep = ref(0)

onMounted(() => {
  const completed = localStorage.getItem(ONBOARDING_KEY)
  if (!completed) {
    showOnboarding.value = true
  }
})

function completeOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, 'true')
  showOnboarding.value = false
  loadCampaigns().then(() => { isLoading.value = false })
}

function nextOnboardingStep() {
  if (onboardingStep.value < 3) {
    onboardingStep.value++
  } else {
    completeOnboarding()
  }
}

function prevOnboardingStep() {
  if (onboardingStep.value > 0) {
    onboardingStep.value--
  }
}

// Campaign list
const isLoading = ref(true)
const campaigns = ref<any[]>([])
const pagination = ref<any>({ page: 1, limit: 20, total: 0, totalPages: 0 })

onMounted(async () => {
  if (!showOnboarding.value) {
    await loadCampaigns()
    isLoading.value = false
  }
})

async function loadCampaigns(page = 1) {
  try {
    const { data } = await useCustomFetch(`/marketing/campaigns?page=${page}&limit=20`)
    const result = data as any
    campaigns.value = result.campaigns || []
    pagination.value = result.pagination || {}
  } catch (err: any) {
    toaster.add({ title: 'Erro', description: err.message, icon: 'solar:danger-triangle-bold-duotone' })
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'COMPLETED': return 'text-success-500 bg-success-500/10'
    case 'PROCESSING': return 'text-yellow-500 bg-yellow-500/10'
    case 'FAILED': return 'text-danger-500 bg-danger-500/10'
    case 'DRAFT': return 'text-muted-500 bg-muted-500/10'
    default: return 'text-muted-400 bg-muted-400/10'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'COMPLETED': return 'Concluída'
    case 'PROCESSING': return 'Enviando...'
    case 'FAILED': return 'Falha'
    case 'DRAFT': return 'Rascunho'
    default: return status
  }
}
</script>

<template>
  <div class="overflow-hidden relative px-4 md:px-6 lg:px-8 pb-20">

    <!-- ============ ONBOARDING ============ -->
    <div v-if="showOnboarding" class="mx-auto max-w-5xl py-6 min-h-[80vh] flex flex-col">

      <!-- Progress Bar -->
      <div class="flex items-center gap-3 mb-10">
        <div v-for="i in 4" :key="i" class="flex-1 h-1.5 rounded-full overflow-hidden bg-muted-200 dark:bg-muted-800">
          <div class="h-full rounded-full transition-all duration-500 ease-out"
            :class="i - 1 <= onboardingStep ? 'bg-primary-500 w-full' : 'w-0'" />
        </div>
        <button @click="completeOnboarding"
          class="text-[11px] text-muted-400 hover:text-muted-600 dark:hover:text-muted-300 transition-colors font-medium ml-2 shrink-0">
          Pular
        </button>
      </div>

      <!-- Step 0: Welcome -->
      <div v-if="onboardingStep === 0"
        class="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
        <div
          class="size-20 rounded-3xl bg-primary-500 flex items-center justify-center text-white mb-8 shadow-2xl shadow-primary-500/30">
          <Icon name="solar:chat-round-dots-bold-duotone" class="size-10" />
        </div>
        <h1 class="text-3xl md:text-4xl font-bold text-muted-800 dark:text-white mb-4 leading-tight">
          Bem-vindo ao <span class="text-primary-500">Marketing SMS</span>
        </h1>
        <p class="text-lg text-muted-500 dark:text-muted-400 max-w-2xl mb-4 leading-relaxed">
          Você sabia que o <strong class="text-muted-700 dark:text-muted-200">SMS é lido em até 3 minutos</strong> por
          98% das pessoas? Com esse módulo, você pode enviar mensagens personalizadas diretamente para o celular dos
          seus clientes.
        </p>
        <p class="text-muted-400 dark:text-muted-500 max-w-xl mb-10">
          Vamos te mostrar como funciona em poucos passos. É simples, rápido e muito eficaz para se comunicar com seus
          clientes.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl w-full mb-10">
          <div
            class="flex flex-col items-center gap-3 p-5 rounded-2xl bg-muted-100 dark:bg-muted-800/50 border border-muted-200 dark:border-muted-700">
            <div class="size-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Icon name="solar:pen-new-round-bold-duotone" class="size-6 text-primary-500" />
            </div>
            <h3 class="text-sm font-bold text-muted-800 dark:text-white">Escreva</h3>
            <p class="text-xs text-muted-500 text-center">Crie sua mensagem em poucos segundos</p>
          </div>
          <div
            class="flex flex-col items-center gap-3 p-5 rounded-2xl bg-muted-100 dark:bg-muted-800/50 border border-muted-200 dark:border-muted-700">
            <div class="size-12 rounded-xl bg-info-500/10 flex items-center justify-center">
              <Icon name="solar:users-group-rounded-bold-duotone" class="size-6 text-info-500" />
            </div>
            <h3 class="text-sm font-bold text-muted-800 dark:text-white">Selecione</h3>
            <p class="text-xs text-muted-500 text-center">Escolha os contatos que devem receber</p>
          </div>
          <div
            class="flex flex-col items-center gap-3 p-5 rounded-2xl bg-muted-100 dark:bg-muted-800/50 border border-muted-200 dark:border-muted-700">
            <div class="size-12 rounded-xl bg-success-500/10 flex items-center justify-center">
              <Icon name="solar:rocket-2-bold-duotone" class="size-6 text-success-500" />
            </div>
            <h3 class="text-sm font-bold text-muted-800 dark:text-white">Dispare</h3>
            <p class="text-xs text-muted-500 text-center">Envie para todos de uma só vez</p>
          </div>
        </div>
      </div>

      <!-- Step 1: What is SMS Marketing -->
      <div v-if="onboardingStep === 1" class="flex-1 flex flex-col md:flex-row items-center gap-10 animate-fade-in">
        <div class="flex-1 order-2 md:order-1">
          <div
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 text-primary-500 text-xs font-bold mb-5 uppercase tracking-wider">
            <Icon name="solar:chat-round-dots-bold-duotone" class="size-3.5" />
            O que é?
          </div>
          <h2 class="text-2xl md:text-3xl font-bold text-muted-800 dark:text-white mb-5 leading-tight">
            SMS é uma mensagem de texto que chega direto no celular
          </h2>
          <p class="text-muted-500 dark:text-muted-400 mb-4 leading-relaxed">
            Sabe aquelas mensagens que você recebe de bancos ou lojas no seu celular? Isso é um <strong
              class="text-muted-700 dark:text-muted-200">SMS</strong> (Short Message Service). Diferente do WhatsApp, o
            SMS <strong class="text-muted-700 dark:text-muted-200">não precisa de internet</strong> para chegar.
          </p>
          <p class="text-muted-500 dark:text-muted-400 mb-4 leading-relaxed">
            Com este módulo, você pode enviar a mesma mensagem para <strong
              class="text-muted-700 dark:text-muted-200">dezenas ou centenas de clientes ao mesmo tempo</strong>. É
            perfeito para:
          </p>
          <ul class="space-y-3 mb-6">
            <li class="flex items-start gap-3">
              <div class="size-6 shrink-0 rounded-full bg-success-500/10 flex items-center justify-center mt-0.5">
                <Icon name="solar:check-circle-bold" class="size-4 text-success-500" />
              </div>
              <span class="text-sm text-muted-600 dark:text-muted-300">Avisar sobre prazos do <strong>Imposto de
                  Renda</strong></span>
            </li>
            <li class="flex items-start gap-3">
              <div class="size-6 shrink-0 rounded-full bg-success-500/10 flex items-center justify-center mt-0.5">
                <Icon name="solar:check-circle-bold" class="size-4 text-success-500" />
              </div>
              <span class="text-sm text-muted-600 dark:text-muted-300">Lembrar clientes de enviar <strong>documentos
                  pendentes</strong></span>
            </li>
            <li class="flex items-start gap-3">
              <div class="size-6 shrink-0 rounded-full bg-success-500/10 flex items-center justify-center mt-0.5">
                <Icon name="solar:check-circle-bold" class="size-4 text-success-500" />
              </div>
              <span class="text-sm text-muted-600 dark:text-muted-300">Comunicar que a <strong>declaração ficou
                  pronta</strong></span>
            </li>
            <li class="flex items-start gap-3">
              <div class="size-6 shrink-0 rounded-full bg-success-500/10 flex items-center justify-center mt-0.5">
                <Icon name="solar:check-circle-bold" class="size-4 text-success-500" />
              </div>
              <span class="text-sm text-muted-600 dark:text-muted-300">Divulgar <strong>promoções e novos
                  serviços</strong></span>
            </li>
          </ul>
        </div>
        <div class="flex-1 flex justify-center order-1 md:order-2">
          <div class="relative">
            <div class="absolute -inset-6 bg-primary-500/5 rounded-3xl blur-xl" />
            <img src="/img/marketing/sms-notification-mockup.png" alt="Notificação SMS no celular"
              class="relative w-full max-w-[320px] rounded-3xl shadow-2xl" />
          </div>
        </div>
      </div>

      <!-- Step 2: How it works -->
      <div v-if="onboardingStep === 2" class="flex-1 flex flex-col items-center animate-fade-in">
        <div
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-info-500/10 text-info-500 text-xs font-bold mb-5 uppercase tracking-wider">
          <Icon name="solar:routing-2-bold-duotone" class="size-3.5" />
          Como Funciona
        </div>
        <h2 class="text-2xl md:text-3xl font-bold text-muted-800 dark:text-white mb-3 text-center leading-tight">
          É simples: digite, selecione e dispare
        </h2>
        <p class="text-muted-500 dark:text-muted-400 max-w-2xl text-center mb-8">
          Em apenas 3 passos você envia sua mensagem para todos os clientes. Sem complicação.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
          <!-- Step 1 Card -->
          <div
            class="rounded-2xl bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-700 shadow-md overflow-hidden">
            <div class="relative">
              <img src="/img/marketing/step1-message.png" alt="Passo 1: Escreva a mensagem"
                class="w-full h-48 object-cover object-top" />
              <div
                class="absolute top-3 left-3 size-8 rounded-lg bg-primary-500 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                1</div>
            </div>
            <div class="p-4">
              <h3 class="text-sm font-bold text-muted-800 dark:text-white mb-1">Escreva a mensagem</h3>
              <p class="text-xs text-muted-500 leading-relaxed">
                Digite o texto que seus clientes vão receber. Pode ser um aviso, lembrete ou promoção. Limite de 160
                caracteres.
              </p>
            </div>
          </div>

          <!-- Step 2 Card -->
          <div
            class="rounded-2xl bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-700 shadow-md overflow-hidden">
            <div class="relative">
              <img src="/img/marketing/step2-contacts.png" alt="Passo 2: Adicione os contatos"
                class="w-full h-48 object-cover object-top" />
              <div
                class="absolute top-3 left-3 size-8 rounded-lg bg-primary-500 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                2</div>
            </div>
            <div class="p-4">
              <h3 class="text-sm font-bold text-muted-800 dark:text-white mb-1">Adicione os números</h3>
              <p class="text-xs text-muted-500 leading-relaxed">
                Cole os números de celular dos clientes ou importe uma planilha. Adicione quantos quiser, um por linha.
              </p>
            </div>
          </div>

          <!-- Step 3 Card -->
          <div
            class="rounded-2xl bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-700 shadow-md overflow-hidden">
            <div class="relative">
              <img src="/img/marketing/step3-confirm.png" alt="Passo 3: Revise e dispare"
                class="w-full h-48 object-cover object-top" />
              <div
                class="absolute top-3 left-3 size-8 rounded-lg bg-primary-500 text-white flex items-center justify-center text-sm font-bold shadow-lg">
                3</div>
            </div>
            <div class="p-4">
              <h3 class="text-sm font-bold text-muted-800 dark:text-white mb-1">Dispare a campanha</h3>
              <p class="text-xs text-muted-500 leading-relaxed">
                Revise tudo e clique em enviar. Cada contato recebe o SMS diretamente no celular, sem internet.
              </p>
            </div>
          </div>
        </div>
      </div>


      <!-- Step 3: Example -->
      <div v-if="onboardingStep === 3" class="flex-1 flex flex-col md:flex-row items-center gap-10 animate-fade-in">
        <div class="flex-1 flex justify-center order-1">
          <div class="relative">
            <div class="absolute -inset-6 bg-success-500/5 rounded-3xl blur-xl" />
            <img src="/img/marketing/sms-phone-mockup.png" alt="Exemplo de SMS recebido"
              class="relative w-full max-w-[300px] rounded-3xl shadow-2xl" />
          </div>
        </div>
        <div class="flex-1 order-2">
          <div
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-500/10 text-success-500 text-xs font-bold mb-5 uppercase tracking-wider">
            <Icon name="solar:smartphone-bold-duotone" class="size-3.5" />
            Exemplo Real
          </div>
          <h2 class="text-2xl md:text-3xl font-bold text-muted-800 dark:text-white mb-5 leading-tight">
            Veja como seu cliente recebe a mensagem
          </h2>
          <p class="text-muted-500 dark:text-muted-400 mb-5 leading-relaxed">
            Ao lado, você pode ver um exemplo real. O SMS chega como uma mensagem de texto normal, sem necessidade de
            baixar nenhum aplicativo.
          </p>

          <div
            class="p-5 rounded-2xl bg-muted-100 dark:bg-muted-800/50 border border-muted-200 dark:border-muted-700 mb-6">
            <h4 class="text-xs font-bold text-muted-400 uppercase tracking-wider mb-3">Exemplos de mensagens</h4>
            <div class="space-y-3">
              <div class="p-3 rounded-xl bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-700">
                <p class="text-xs text-muted-600 dark:text-muted-300 italic">"Ola Joao! Sua declaracao de IR 2026 esta
                  pronta. Acesse o portal para conferir."</p>
              </div>
              <div class="p-3 rounded-xl bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-700">
                <p class="text-xs text-muted-600 dark:text-muted-300 italic">"Lembrete: o prazo do IRPF 2026 encerra em
                  30/05. Envie seus documentos o quanto antes!"</p>
              </div>
              <div class="p-3 rounded-xl bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-700">
                <p class="text-xs text-muted-600 dark:text-muted-300 italic">"Contabilidade Silva: Novidade! Agora
                  fazemos abertura de MEI. Entre em contato conosco."</p>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Icon name="solar:info-circle-bold" class="size-5 text-yellow-500 shrink-0" />
            <p class="text-xs text-yellow-600 dark:text-yellow-400">
              <strong>Dica:</strong> Mensagens sem acentos e emojis são automaticamente limpas pelo sistema para
              garantir a entrega.
            </p>
          </div>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex items-center justify-between mt-10 pt-6 border-t border-muted-200 dark:border-muted-800">
        <button v-if="onboardingStep > 0" @click="prevOnboardingStep"
          class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-muted-600 dark:text-muted-400 hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors">
          <Icon name="solar:alt-arrow-left-linear" class="size-4" />
          Voltar
        </button>
        <div v-else />

        <div class="flex items-center gap-2">
          <div v-for="i in 4" :key="i" class="size-2 rounded-full transition-all duration-300"
            :class="i - 1 === onboardingStep ? 'bg-primary-500 w-6' : 'bg-muted-300 dark:bg-muted-600'" />
        </div>

        <button @click="nextOnboardingStep"
          class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20">
          {{ onboardingStep === 3 ? 'Começar Agora' : 'Próximo' }}
          <Icon :name="onboardingStep === 3 ? 'solar:rocket-2-bold-duotone' : 'solar:alt-arrow-right-linear'"
            class="size-4" />
        </button>
      </div>
    </div>

    <!-- ============ CAMPAIGNS LIST ============ -->
    <AppPageLoading v-else-if="isLoading" min-height="60vh" message="Carregando campanhas..." />

    <div v-else class="grid grid-cols-8 gap-4">
      <div class="col-span-8">
        <!-- Header -->
        <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <NuxtLink to="/dashboard"
              class="text-primary-500 hover:opacity-75 transition-opacity flex items-center gap-2 mb-2 font-medium text-sm">
              <Icon name="solar:alt-arrow-left-linear" class="size-4" />
              Voltar ao Dashboard
            </NuxtLink>
            <BaseHeading as="h1" size="2xl" weight="bold" class="text-muted-800 dark:text-white">
              Marketing SMS
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
              Crie e gerencie campanhas de SMS em massa para seus contatos.
            </BaseParagraph>
          </div>
          <div class="flex gap-3">
            <NuxtLink to="/dashboard/credits">
              <BaseButton variant="muted" size="sm" class="gap-2">
                <Icon name="solar:wallet-2-bold-duotone" class="size-4" />
                Comprar Créditos
              </BaseButton>
            </NuxtLink>
            <NuxtLink to="/dashboard/marketing/new">
              <BaseButton variant="primary" color="primary" size="sm" class="gap-2">
                <Icon name="solar:add-circle-bold-duotone" class="size-4" />
                Nova Campanha
              </BaseButton>
            </NuxtLink>
          </div>
        </div>

        <!-- Empty State -->
        <BaseCard v-if="!campaigns.length" rounded="md"
          class="p-12 text-center border-dashed border-2 border-muted-200 dark:border-muted-700">
          <div class="inline-flex p-5 rounded-full bg-muted-100 dark:bg-muted-800 mb-4">
            <Icon name="solar:chat-round-dots-bold-duotone" class="size-12 text-muted-400" />
          </div>
          <BaseHeading as="h3" size="lg" weight="bold" class="text-muted-800 dark:text-white mb-2">
            Nenhuma campanha ainda
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 max-w-md mx-auto mb-6">
            Crie sua primeira campanha de SMS para enviar mensagens em massa para seus clientes.
          </BaseParagraph>
          <NuxtLink to="/dashboard/marketing/new">
            <BaseButton variant="primary" color="primary" class="gap-2">
              <Icon name="solar:add-circle-bold-duotone" class="size-4" />
              Criar Primeira Campanha
            </BaseButton>
          </NuxtLink>
        </BaseCard>

        <!-- Campaign List -->
        <div v-else class="space-y-3">
          <BaseCard v-for="campaign in campaigns" :key="campaign.id" rounded="md"
            class="p-5 hover:shadow-md transition-all duration-200 cursor-pointer"
            @click="router.push(`/dashboard/marketing/${campaign.id}`)">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="p-3 rounded-xl bg-primary-500/10 shrink-0">
                  <Icon name="solar:chat-round-dots-bold-duotone" class="size-6 text-primary-500" />
                </div>
                <div>
                  <BaseText size="sm" weight="bold" class="text-muted-800 dark:text-white block">
                    {{ campaign.name }}
                  </BaseText>
                  <BaseText size="xs" class="text-muted-400 block mt-0.5">
                    {{ new Date(campaign.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year:
                        'numeric', hour: '2-digit', minute: '2-digit'
                    }) }}
                    · por {{ campaign.createdBy?.name || 'Sistema' }}
                  </BaseText>
                </div>
              </div>

              <div class="flex items-center gap-4 sm:gap-6">
                <div class="text-center">
                  <BaseText size="lg" weight="bold" class="text-muted-800 dark:text-white block">
                    {{ campaign._count?.recipients || campaign.totalNumbers || 0 }}
                  </BaseText>
                  <BaseText size="xs" class="text-muted-400">
                    contatos
                  </BaseText>
                </div>

                <div v-if="campaign.sentCount !== undefined && campaign.sentCount !== null" class="text-center">
                  <BaseText size="lg" weight="bold" class="text-success-500 block">
                    {{ campaign.sentCount }}
                  </BaseText>
                  <BaseText size="xs" class="text-muted-400">
                    enviados
                  </BaseText>
                </div>

                <div :class="statusColor(campaign.status)" class="px-3 py-1 rounded-full text-xs font-semibold">
                  {{ statusLabel(campaign.status) }}
                </div>

                <Icon name="solar:alt-arrow-right-linear" class="size-5 text-muted-400" />
              </div>
            </div>
          </BaseCard>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="flex justify-center mt-8 gap-2">
          <BaseButton v-for="p in pagination.totalPages" :key="p" size="sm"
            :variant="p === pagination.page ? 'primary' : 'muted'"
            :color="p === pagination.page ? 'primary' : 'default'" @click="loadCampaigns(p)">
            {{ p }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}
</style>
