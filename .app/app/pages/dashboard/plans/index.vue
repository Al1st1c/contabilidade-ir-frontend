<script setup lang="ts">
import { useSubscription } from '~/composables/useSubscription'

definePageMeta({
  title: 'Planos e Preços',
  layout: 'empty',
})

useSeoMeta({
  title: 'Planos e Preços - Gestor IRPF | Escolha sua Assinatura',
  ogTitle: 'Planos e Preços - Gestor IRPF | Escolha sua Assinatura',
  description: 'Conheça nossos planos e escolha o ideal para o seu tamanho. Do contador autônomo ao grande escritório, temos a solução para sua gestão de IR.',
  ogDescription: 'Conheça nossos planos e escolha o ideal para o seu tamanho. Do contador autônomo ao grande escritório, temos a solução para sua gestão de IR.',
})

const { plans, currentSubscription, loading, error, fetchPlans, fetchMySubscription, selectFreePlan } = useSubscription()
const pricingMode = ref('free') // Default to free now
const isCustom = ref(false)

// Configuração personalizada
const customConfig = ref({
  storage_gb: 5,
  sms_count: 100,
})

const customPrice = computed(() => {
  if (pricingMode.value === 'enterprise') {
    return 85000 // R$ 850,00 fixo
  }

  const base = 4900 // R$ 49,00 base
  const storageCost = customConfig.value.storage_gb * 250 // R$ 2,50 por GB
  const smsCost = customConfig.value.sms_count * 12 // R$ 0,12 por SMS
  return base + storageCost + smsCost
})

const isInitialLoad = ref(true)

onMounted(async () => {
  try {
    await Promise.all([
      fetchPlans(),
      fetchMySubscription(),
    ])

    if (currentSubscription.value) {
      pricingMode.value = currentSubscription.value.plan.slug
    }
  }
  finally {
    isInitialLoad.value = false
  }
})

function selectPlan(slug: string) {
  if (slug === 'custom') {
    isCustom.value = true
    pricingMode.value = 'custom'
  }
  else {
    isCustom.value = false
    pricingMode.value = slug
  }
}

async function handleConfirm() {
  const router = useRouter()

  if (pricingMode.value === 'free') {
    const res = await selectFreePlan()
    if (res.success) {
      router.push('/dashboard')
    }
    else {
      alert(res.error)
    }
    return
  }

  if (pricingMode.value === 'custom') {
    router.push({
      path: '/dashboard/plans/payment',
      query: {
        plan: 'custom',
        storage: customConfig.value.storage_gb,
        sms: customConfig.value.sms_count,
        price: customPrice.value,
      },
    })
  }
  else {
    router.push({
      path: '/dashboard/plans/payment',
      query: { plan: pricingMode.value },
    })
  }
}

const filteredPlans = computed(() => {
  const targets = ['free', 'basic', 'pro']
  return plans.value
    .filter(p => targets.includes(p.slug))
    .sort((a, b) => targets.indexOf(a.slug) - targets.indexOf(b.slug))
})

function getPlanIcon(slug: string) {
  switch (slug) {
    case 'free': return '/img/illustrations/onboarding/pricing-1.svg'
    case 'basic': return '/img/illustrations/onboarding/pricing-2.svg'
    case 'pro': return '/img/illustrations/onboarding/pricing-3.svg'
  }
  return '/img/custom/pro-plan.png'
}

function getPlanPrice(plan: any) {
  if (plan.slug === 'free')
    return 'Grátis'
  return (plan.pricing.monthly / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>

<template>
  <div class="bg-muted-100 dark:bg-muted-900 min-h-screen">
    <div class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
      <NuxtLink to="/dashboard"
        class="text-muted-400 hover:text-primary-500 dark:text-muted-700 dark:hover:text-primary-500 transition-colors duration-300 flex items-center gap-2">
        <Icon name="solar:alt-arrow-left-linear" class="size-5" />
        <span>Voltar ao Dashboard</span>
      </NuxtLink>
      <div class="flex items-center gap-4">
        <BaseThemeToggle />
      </div>
    </div>

    <div class="mx-auto max-w-7xl px-4 pb-20">
      <div class="pt-8 text-center">
        <BaseHeading tag="h2" size="2xl" weight="medium" class="mb-2 text-muted-900 dark:text-white">
          Escolha o Plano Ideal
        </BaseHeading>
        <BaseParagraph class="text-muted-500 dark:text-muted-400 mb-8">
          Comece agora gratuitamente ou escolha um plano profissional para mais recursos.
        </BaseParagraph>
      </div>

      <ClientOnly>
        <template #fallback>
          <AppPageLoading message="Carregando planos e opções..." />
        </template>

        <AppPageLoading v-if="loading || isInitialLoad" message="Carregando planos e opções..." />

        <div v-else-if="error" class="py-10 text-center">
          <BaseText class="text-error-500 mb-4">
            {{ error }}
          </BaseText>
          <BaseButton @click="fetchPlans">
            Tentar Novamente
          </BaseButton>
        </div>

        <div v-else-if="filteredPlans.length === 0" class="py-10 text-center">
          <BasePlaceholderPage title="Nenhum plano disponível"
            subtitle="Não foi possível carregar os planos no momento." />
        </div>

        <div v-else>
          <div class="w-full">
            <div class="mx-auto w-full">
              <div class="w-full">
                <!-- Planos Padrão -->
                <BaseRadioGroup v-model="pricingMode" class="mx-auto mb-10 grid max-w-6xl gap-6 sm:grid-cols-3">
                  <TairoRadioCard v-for="plan in filteredPlans" :key="plan.id" rounded="md" :value="plan.slug"
                    class="group transition-all duration-300 relative overflow-hidden" @click="selectPlan(plan.slug)">
                    <div v-if="plan.slug === 'pro' && currentSubscription?.plan.slug !== 'pro'"
                      class="absolute -right-6 top-3 rotate-45 bg-indigo-500 px-8 py-1 text-[10px] font-bold text-white shadow-lg z-10 font-sans">
                      Mais Comum
                    </div>
                    <div v-if="currentSubscription?.plan.slug === plan.slug"
                      class="absolute -right-6 top-3 rotate-45 bg-success-500 px-8 py-1 text-[10px] font-bold text-white shadow-lg z-10 font-sans">
                      Plano Atual
                    </div>
                    <template #indicator>
                      <Icon name="solar:check-circle-bold-duotone"
                        class="size-7 group-data-[state=unchecked]:opacity-0 text-primary-500" />
                    </template>

                    <div class="flex flex-col items-center p-4">
                      <img :src="getPlanIcon(plan.slug)"
                        class="mx-auto mb-4 max-w-[140px] grayscale-100 group-hover:grayscale-0 group-data-[state=checked]:grayscale-0 transition-all duration-300"
                        :alt="plan.name">

                      <BaseHeading size="lg" weight="medium" class="text-muted-900 dark:text-white mb-2">
                        {{ plan.name }}
                      </BaseHeading>

                      <BaseParagraph size="xs" lead="snug"
                        class="text-muted-500 dark:text-muted-400 text-center mb-4 min-h-[40px]">
                        {{ plan.description }}
                      </BaseParagraph>

                      <div class="flex items-baseline justify-center gap-1 mb-6">
                        <BaseText class="text-3xl font-bold text-muted-900 dark:text-white">
                          {{ getPlanPrice(plan) }}
                        </BaseText>
                        <BaseText v-if="plan.slug !== 'free'" size="xs" class="text-muted-500 dark:text-muted-400">
                          /mês
                        </BaseText>
                      </div>

                      <ul class="w-full text-left space-y-3 mt-4 border-t border-muted-200 dark:border-muted-800 pt-6">
                        <li v-if="plan.limits.tax_declarations_yearly" class="flex items-center gap-2 text-xs">
                          <Icon name="solar:document-text-bold-duotone" class="size-4 text-primary-500" />
                          <span class="text-muted-600 dark:text-muted-300">{{ plan.limits.tax_declarations_yearly }}
                            Declarações /ano</span>
                        </li>
                        <li v-if="plan.limits.storage_mb" class="flex items-center gap-2 text-xs">
                          <Icon name="solar:database-bold-duotone" class="size-4 text-primary-500" />
                          <span v-if="plan.limits.storage_mb >= 1024" class="text-muted-600 dark:text-muted-300">{{
                            Math.round(plan.limits.storage_mb / 1024) }}GB Space</span>
                          <span v-else class="text-muted-600 dark:text-muted-300">{{ plan.limits.storage_mb }}MB
                            Space</span>
                        </li>
                        <li v-if="plan.limits.sms_monthly" class="flex items-center gap-2 text-xs">
                          <Icon name="solar:letter-bold-duotone" class="size-4 text-primary-500" />
                          <span class="text-muted-600 dark:text-muted-300">{{ plan.limits.sms_monthly }} SMS /mês</span>
                        </li>
                        <li v-if="plan.limits.employees" class="flex items-center gap-2 text-xs">
                          <Icon name="solar:users-group-rounded-bold-duotone" class="size-4 text-primary-500" />
                          <span class="text-muted-600 dark:text-muted-300">{{ plan.limits.employees }} {{
                            plan.limits.employees > 1
                              ? 'Usuários' : 'Usuário' }}</span>
                        </li>
                      </ul>
                    </div>
                  </TairoRadioCard>
                </BaseRadioGroup>

                <div class="mx-auto flex flex-col items-center pt-4">
                  <BaseButton rounded="lg" class="h-12 w-64 text-lg font-bold shadow-xl shadow-primary-500/20"
                    variant="primary" @click="handleConfirm">
                    {{ pricingMode === currentSubscription?.plan.slug ? 'Manter Plano Atual' : 'Migrar para este Plano'
                    }}
                  </BaseButton>
                  <NuxtLink to="/dashboard/plans/payment?plan=custom"
                    class="text-muted-400 hover:text-primary-500 mt-6 text-sm font-medium underline-offset-4 transition-colors duration-300 hover:underline">
                    Precisa de limites maiores? Monte seu plano personalizado
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ClientOnly>
    </div>
  </div>
</template>
