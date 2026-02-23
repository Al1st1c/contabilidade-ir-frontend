<script setup lang="ts">
import { useSubscription } from '~/composables/useSubscription'

definePageMeta({
  title: 'Configurar Escritório',
  layout: 'empty',
})

useSeoMeta({
  title: 'Configurar Escritório - Gestor IRPF',
})

const router = useRouter()
const { user } = useAuth()
const { plans, fetchPlans, fetchMySubscription, getIrPricing } = useSubscription()

const isInitialLoad = ref(true)
const pricingTiers = ref<any[]>([])

// Customizer state
const simulatedIrs = ref(30)
const simulatedUsers = ref(1)
const needsWhitelabel = ref(false)

// Wizard State
const currentStep = ref(0)
const totalSteps = 4

// Owner guard
const isOwner = computed(() => {
  const roleName = user.value?.role?.name?.toLowerCase()
  return roleName === 'master' || user.value?.isAdmin
})

onBeforeMount(() => {
  if (user.value && !isOwner.value) {
    router.replace('/dashboard')
  }
})

onMounted(async () => {
  isInitialLoad.value = true
  try {
    const [_, __, irPricingResult] = await Promise.all([
      fetchPlans(),
      fetchMySubscription(),
      getIrPricing()
    ])

    if (irPricingResult.success) {
      pricingTiers.value = irPricingResult.data as any[] || []
    }
  }
  catch (err) {
    console.error(err)
  }
  finally {
    isInitialLoad.value = false
  }
})

// Business logic
const recommendedPlan = computed(() => {
  if (!plans.value.length) return null
  const startPlan = plans.value.find(p => p.slug === 'basic')
  const proPlan = plans.value.find(p => p.slug === 'pro')
  const enterprisePlan = plans.value.find(p => p.slug === 'enterprise')

  if (simulatedUsers.value > 3 || needsWhitelabel.value) return enterprisePlan || proPlan || startPlan
  if (simulatedUsers.value > 1) return proPlan || startPlan
  return startPlan || plans.value[0]
})

const platformMonthlyCost = computed(() => recommendedPlan.value?.pricing?.monthly || 0)

const currentIrTier = computed(() => {
  if (!pricingTiers.value.length) return null
  return pricingTiers.value.find(
    (t: any) => simulatedIrs.value >= t.minQuantity && (t.maxQuantity === null || simulatedIrs.value <= t.maxQuantity)
  ) || (pricingTiers.value.length > 0 ? pricingTiers.value[0] : null)
})

const unitPriceCents = computed(() => currentIrTier.value?.unitPriceCents || 790)
const irTotalCents = computed(() => simulatedIrs.value * unitPriceCents.value)

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

async function handleConfirm() {
  if (!recommendedPlan.value) return
  localStorage.setItem('pendingIrPurchase', simulatedIrs.value.toString())
  router.push({
    path: '/dashboard/plans/payment',
    query: { plan: recommendedPlan.value.slug },
  })
}

function nextStep() {
  if (currentStep.value < totalSteps - 1) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function skipOnboarding() {
  currentStep.value = 3
}
</script>

<template>
  <div class="bg-muted-50 dark:bg-muted-950 min-h-screen pb-20 font-sans">
    <!-- Navbar Compacta -->
    <div class="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 md:px-6">
      <NuxtLink to="/dashboard" class="flex items-center gap-3 group">
        <div
          class="flex size-9 items-center justify-center rounded-xl bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-800 shadow-sm transition-all duration-300">
          <Icon name="solar:alt-arrow-left-linear" class="size-4 text-muted-400 group-hover:text-primary-500" />
        </div>
        <BaseText weight="medium" size="sm" class="text-muted-700 dark:text-muted-200">Voltar ao Início</BaseText>
      </NuxtLink>

      <div class="flex items-center gap-4">
        <BaseButton v-if="currentStep < 3" variant="link" size="sm"
          class="font-bold text-[11px] uppercase tracking-widest text-muted-400 hover:text-primary-500"
          @click="skipOnboarding">
          Pular
        </BaseButton>
        <BaseThemeToggle />
      </div>
    </div>

    <!-- Container Principal do Wizard -->
    <div class="mx-auto max-w-4xl px-4 md:px-6 mt-10">
      <AppPageLoading v-if="isInitialLoad" message="Abrindo configurador..." min-height="50vh" />

      <div v-else class="space-y-12">
        <!-- Indicador de Passos Minimalista -->
        <div class="flex items-center justify-center gap-3">
          <div v-for="step in totalSteps" :key="step" class="h-1.5 rounded-full transition-all duration-500" :class="[
            currentStep === step - 1 ? 'w-12 bg-primary-500' : step - 1 < currentStep ? 'w-4 bg-primary-500/40' : 'w-4 bg-muted-200 dark:bg-muted-800'
          ]" />
        </div>

        <Transition name="fade-slow" mode="out-in">
          <!-- PASSO 0: EXPLICADO PARA TODOS -->
          <div v-if="currentStep === 0" key="step0" class="max-w-3xl mx-auto space-y-10">
            <div class="text-center space-y-3">
              <BaseHeading as="h1" size="3xl" weight="bold" class="text-muted-800 dark:text-white">
                Como funciona o preço?
              </BaseHeading>
              <BaseParagraph size="lg" class="text-muted-500 dark:text-muted-400">
                Dividimos o custo em duas partes para ser justo com você.
              </BaseParagraph>
            </div>

            <div class="grid md:grid-cols-2 gap-6">
              <BaseCard rounded="lg"
                class="p-8 border-muted-200 dark:border-muted-800 shadow-sm hover:shadow-md transition-shadow">
                <div
                  class="size-12 rounded-2xl bg-primary-500 text-white flex items-center justify-center mb-6 shadow-lg shadow-primary-500/20">
                  <Icon name="solar:monitor-bold-duotone" class="size-6" />
                </div>
                <BaseHeading as="h3" size="lg" weight="bold" class="text-muted-800 dark:text-white mb-2">1. Uso do
                  Sistema</BaseHeading>
                <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400 leading-relaxed font-medium">
                  É o valor mensal para ter acesso à plataforma, organizar sua equipe e gerenciar documentos.
                </BaseParagraph>
              </BaseCard>

              <BaseCard rounded="lg"
                class="p-8 border-muted-200 dark:border-muted-800 shadow-sm hover:shadow-md transition-shadow">
                <div
                  class="size-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                  <Icon name="solar:ticket-bold-duotone" class="size-6" />
                </div>
                <BaseHeading as="h3" size="lg" weight="bold" class="text-muted-800 dark:text-white mb-2">2. Suas
                  Declarações</BaseHeading>
                <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400 leading-relaxed font-medium">
                  Você compra conforme o volume de clientes que tiver. Os créditos nunca expiram.
                </BaseParagraph>
              </BaseCard>
            </div>

            <div class="flex justify-center pt-6">
              <BaseButton variant="primary" color="primary" rounded="lg" size="lg" shadow="primary"
                class="h-12 px-12 font-bold uppercase tracking-widest text-xs" @click="nextStep">
                Entendi, vamos começar
              </BaseButton>
            </div>
          </div>

          <!-- PASSO 1: EQUIPE E MARCA -->
          <div v-else-if="currentStep === 1" key="step1" class="max-w-2xl mx-auto space-y-8">
            <div class="text-center space-y-2">
              <BaseHeading as="h2" size="2xl" weight="bold" class="text-muted-800 dark:text-white">Quem vai usar?
              </BaseHeading>
              <BaseParagraph size="sm" class="text-muted-500">Defina quem do seu escritório terá acesso ao sistema.
              </BaseParagraph>
            </div>

            <BaseCard rounded="lg" class="p-10 border-muted-200 dark:border-muted-800 shadow-sm">
              <div class="space-y-12">
                <!-- Equipe -->
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <BaseHeading as="h4" size="md" weight="bold" class="text-muted-800 dark:text-white">Sua Equipe
                      </BaseHeading>
                      <BaseParagraph size="xs" class="text-muted-500 font-medium">Quantas pessoas vão trabalhar com
                        você?</BaseParagraph>
                    </div>
                    <div class="w-32">
                      <BaseInput v-model.number="simulatedUsers" type="number" min="1" rounded="lg"
                        icon="solar:users-group-rounded-bold-duotone" class="text-center font-bold" />
                    </div>
                  </div>
                </div>

                <!-- Marca Própria -->
                <div class="pt-8 border-t border-muted-100 dark:border-muted-800">
                  <div class="flex items-start gap-4">
                    <div class="mt-1">
                      <BaseCheckbox v-model="needsWhitelabel" color="primary" />
                    </div>
                    <div class="space-y-1">
                      <BaseHeading as="h4" size="md" weight="bold" class="text-muted-800 dark:text-white">Quer usar sua
                        logo e suas cores?</BaseHeading>
                      <BaseParagraph size="xs" class="text-muted-500 leading-relaxed font-medium">Sua marca aparece para
                        seus clientes, transmitindo muito mais profissionalismo.</BaseParagraph>
                      <div v-if="needsWhitelabel" class="pt-2">
                        <BaseTag color="primary" variant="primary" rounded="full"
                          class="font-bold text-[9px] uppercase tracking-widest px-3">Ativa o Plano Profissional
                        </BaseTag>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </BaseCard>

            <div class="flex items-center justify-between pt-6">
              <BaseButton variant="muted" rounded="lg" size="lg"
                class="px-8 font-bold uppercase tracking-widest text-xs" @click="prevStep">
                Voltar
              </BaseButton>
              <BaseButton variant="primary" color="primary" rounded="lg" size="lg"
                class="px-10 font-bold uppercase tracking-widest text-xs" @click="nextStep">
                Próximo Passo
              </BaseButton>
            </div>
          </div>

          <!-- PASSO 2: VOLUME DE CLIENTES -->
          <div v-else-if="currentStep === 2" key="step2" class="max-w-4xl mx-auto space-y-8">
            <div class="text-center space-y-2">
              <BaseHeading as="h2" size="2xl" weight="bold" class="text-muted-800 dark:text-white">Quantos clientes?
              </BaseHeading>
              <BaseParagraph size="sm" class="text-muted-500 font-medium">Simule quantas declarações você pretende fazer
                nesta temporada.</BaseParagraph>
            </div>

            <div class="grid lg:grid-cols-12 gap-8 items-start">
              <div class="lg:col-span-7 space-y-6">
                <BaseCard rounded="lg" class="p-8 border-muted-200 dark:border-muted-800 shadow-sm h-full">
                  <div class="space-y-8">
                    <div>
                      <BaseHeading as="h4" size="md" weight="bold" class="text-muted-800 dark:text-white mb-2">Total de
                        Declarações</BaseHeading>
                      <BaseParagraph size="xs" class="text-muted-500 mb-6 font-medium italic">Quanto mais você compra,
                        mais barato fica o custo por cada uma.</BaseParagraph>

                      <div class="space-y-6">
                        <BaseInput v-model.number="simulatedIrs" type="number" min="0" rounded="lg"
                          icon="solar:document-text-bold-duotone" class="text-2xl font-bold h-14" />

                        <div class="flex flex-wrap gap-2 text-center">
                          <button v-for="q in [30, 100, 250, 500]" :key="q"
                            class="flex-1 min-w-[70px] py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 border shadow-sm"
                            :class="simulatedIrs === q ? 'bg-primary-500 border-primary-500 text-white shadow-lg scale-105' : 'bg-white dark:bg-muted-900 border-muted-200 dark:border-muted-800 text-muted-500 hover:border-primary-500'"
                            @click="simulatedIrs = q">
                            {{ q }}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div
                      class="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/50 flex gap-4">
                      <div
                        class="shrink-0 size-8 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                        <Icon name="solar:info-circle-bold" class="size-5" />
                      </div>
                      <BaseParagraph size="xs"
                        class="text-indigo-700 dark:text-indigo-300 leading-relaxed font-semibold">
                        Seus créditos nunca vencem. Se contratar 100 e usar apenas 80, os outros 20 ficam salvos para o
                        ano que vem.
                      </BaseParagraph>
                    </div>
                  </div>
                </BaseCard>
              </div>

              <div class="lg:col-span-5">
                <BaseCard rounded="lg"
                  class="p-8 border-muted-200 dark:border-muted-800 bg-muted-50/50 dark:bg-muted-900/40 shadow-inner">
                  <BaseHeading as="h4" size="xs" weight="bold"
                    class="text-muted-400 uppercase tracking-widest mb-6 text-center">Tabela de Preços</BaseHeading>
                  <div class="space-y-3">
                    <div v-for="tier in pricingTiers" :key="tier.id"
                      class="flex items-center justify-between p-4 rounded-xl border transition-all duration-500"
                      :class="simulatedIrs >= tier.minQuantity && (tier.maxQuantity === null || simulatedIrs <= tier.maxQuantity)
                        ? 'bg-white dark:bg-muted-950 border-primary-500 shadow-md ring-1 ring-primary-500/10'
                        : 'border-transparent opacity-40 translate-x-1'">
                      <div class="flex items-center gap-3">
                        <div class="size-2 rounded-full"
                          :class="simulatedIrs >= tier.minQuantity && (tier.maxQuantity === null || simulatedIrs <= tier.maxQuantity) ? 'bg-primary-500' : 'bg-muted-300'" />
                        <BaseText size="sm" weight="bold" class="text-muted-700 dark:text-muted-200">
                          {{ tier.maxQuantity ? `${tier.minQuantity} - ${tier.maxQuantity}` : `${tier.minQuantity}+` }}
                          un
                        </BaseText>
                      </div>
                      <BaseText size="sm" weight="bold"
                        :class="simulatedIrs >= tier.minQuantity && (tier.maxQuantity === null || simulatedIrs <= tier.maxQuantity) ? 'text-primary-500' : 'text-muted-500'">
                        {{ formatCurrency(tier.unitPriceCents) }}
                      </BaseText>
                    </div>
                  </div>
                </BaseCard>
              </div>
            </div>

            <div class="flex items-center justify-between pt-6">
              <BaseButton variant="muted" rounded="lg" size="lg"
                class="px-8 font-bold uppercase tracking-widest text-xs" @click="prevStep">
                Voltar
              </BaseButton>
              <BaseButton variant="primary" color="primary" rounded="lg" size="lg"
                class="px-10 font-bold uppercase tracking-widest text-xs" @click="nextStep">
                Ver Resumo Final
              </BaseButton>
            </div>
          </div>

          <!-- PASSO 3: RESUMO DE TUDO -->
          <div v-else-if="currentStep === 3" key="step3" class="max-w-3xl mx-auto space-y-10">
            <div class="text-center space-y-2">
              <BaseHeading as="h2" size="2xl" weight="bold" class="text-muted-800 dark:text-white">Confira seu Pedido
              </BaseHeading>
              <BaseParagraph size="sm" class="text-muted-500 font-medium tracking-tight">Tudo pronto! Confira os valores
                abaixo e comece agora.</BaseParagraph>
            </div>

            <div class="space-y-6">
              <!-- Grid de Resumo -->
              <div class="grid md:grid-cols-2 gap-6">
                <!-- Parte Sistema -->
                <BaseCard rounded="lg"
                  class="p-8 border-muted-200 dark:border-muted-800 shadow-sm relative overflow-hidden">
                  <div class="flex items-center gap-4 mb-10">
                    <div
                      class="size-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/20">
                      <Icon name="solar:monitor-bold-duotone" class="size-6" />
                    </div>
                    <div class="leading-tight">
                      <BaseHeading as="h4" size="md" weight="bold" class="text-muted-800 dark:text-white">Mensalidade
                      </BaseHeading>
                      <BaseParagraph size="xs" class="text-muted-400 font-bold uppercase tracking-widest !text-[9px]">
                        Uso do Sistema</BaseParagraph>
                    </div>
                  </div>

                  <ul class="space-y-4 mb-10">
                    <li class="flex items-center justify-between">
                      <BaseText size="sm" class="text-muted-500 font-medium">Plano Recomendado</BaseText>
                      <BaseText size="sm" weight="bold" class="text-muted-800 dark:text-white">{{ recommendedPlan?.name
                        }}</BaseText>
                    </li>
                    <li class="flex items-center justify-between">
                      <BaseText size="sm" class="text-muted-500 font-medium">Sua Equipe</BaseText>
                      <BaseText size="sm" weight="bold" class="text-muted-800 dark:text-white">{{ simulatedUsers }}
                        Pessoa(s)</BaseText>
                    </li>
                    <li class="flex items-center justify-between">
                      <BaseText size="sm" class="text-muted-500 font-medium">Sua Marca</BaseText>
                      <BaseText size="sm" weight="bold" class="text-muted-800 dark:text-white">{{ needsWhitelabel ?
                        'Ativada' : 'Padrão' }}</BaseText>
                    </li>
                  </ul>

                  <div class="pt-6 border-t border-muted-100 dark:border-muted-800 flex items-baseline gap-2">
                    <BaseText size="3xl" weight="bold" class="text-primary-500">{{ formatCurrency(platformMonthlyCost)
                      }}</BaseText>
                    <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-wider !text-[10px]">/ mês
                    </BaseText>
                  </div>
                </BaseCard>

                <!-- Parte Créditos -->
                <BaseCard rounded="lg"
                  class="p-8 border-muted-200 dark:border-muted-800 shadow-sm bg-indigo-50/30 dark:bg-indigo-950/20 relative overflow-hidden">
                  <div class="flex items-center gap-4 mb-10 text-center">
                    <div
                      class="size-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <Icon name="solar:ticket-bold-duotone" class="size-6" />
                    </div>
                    <div class="text-left leading-tight">
                      <BaseHeading as="h4" size="md" weight="bold" class="text-muted-800 dark:text-white">Declarações
                      </BaseHeading>
                      <BaseParagraph size="xs" class="text-muted-400 font-bold uppercase tracking-widest !text-[9px]">
                        Primeira Carga</BaseParagraph>
                    </div>
                  </div>

                  <ul class="space-y-4 mb-10">
                    <li class="flex justify-between items-center text-sm font-medium">
                      <span class="text-muted-500">Quantidade contratada</span>
                      <span class="text-muted-900 dark:text-white font-bold">{{ simulatedIrs }} unidades</span>
                    </li>
                    <li class="flex justify-between items-center text-sm font-medium">
                      <span class="text-muted-500">Preço por cada Declaração</span>
                      <span class="text-muted-900 dark:text-white font-bold">{{ formatCurrency(unitPriceCents) }}</span>
                    </li>
                  </ul>

                  <div class="pt-6 border-t border-muted-200 dark:border-muted-700">
                    <BaseText size="3xl" weight="bold" class="text-indigo-600 dark:text-indigo-400 block">{{
                      formatCurrency(irTotalCents) }}</BaseText>
                    <BaseText size="xs" weight="bold"
                      class="text-muted-400 uppercase tracking-widest !text-[10px] mt-1">Carga única (Não expira)
                    </BaseText>
                  </div>
                </BaseCard>
              </div>

              <!-- Totalizador Final -->
              <BaseCard rounded="lg"
                class="p-10 border-primary-500/30 bg-primary-500/[0.03] dark:bg-primary-500/[0.05] border-2 shadow-lg">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div class="space-y-2">
                    <BaseText weight="bold" size="sm" class="text-muted-400 uppercase tracking-widest !text-[10px]">
                      Total do Investimento</BaseText>
                    <BaseHeading as="h2" size="4xl" weight="bold" class="text-primary-500 leading-none">
                      {{ formatCurrency(platformMonthlyCost + irTotalCents) }}
                    </BaseHeading>
                    <BaseText size="xs" class="text-muted-500 font-medium">Sua conta será ativada imediatamente após o
                      pagamento.</BaseText>
                  </div>
                  <BaseButton variant="primary" color="primary" rounded="lg" size="lg" shadow="primary"
                    class="h-16 px-12 font-bold uppercase tracking-widest text-xs group w-full md:w-auto"
                    @click="handleConfirm">
                    <span>Ativar Meu Escritório</span>
                    <Icon name="solar:round-alt-arrow-right-bold"
                      class="ml-2 size-6 group-hover:translate-x-1 transition-transform" />
                  </BaseButton>
                </div>
              </BaseCard>

              <!-- Segurança e Pix -->
              <div
                class="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 pt-10 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                <Icon name="logos:stripe" class="h-5 w-auto" />
                <div class="flex items-center gap-2">
                  <Icon name="solar:lock-bold" class="size-4" />
                  <BaseText size="xs" weight="bold" class="uppercase tracking-widest !text-[9px]">Pagamento 100% Seguro
                  </BaseText>
                </div>
                <Icon name="ph:pix-logo-bold" class="size-6" />
              </div>
            </div>

            <div class="flex justify-center pt-4">
              <BaseButton variant="link" size="sm"
                class="text-muted-400 font-bold uppercase tracking-widest !text-[10px] hover:text-primary-500"
                @click="prevStep">
                Revisar Simulação
              </BaseButton>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-slow-enter-active,
.fade-slow-leave-active {
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slow-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.fade-slow-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
