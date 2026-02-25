<script setup lang="ts">
definePageMeta({
  title: 'Preços',
  layout: 'empty',
})

useSeoMeta({
  title: 'Gestor IRPF - Planos e Preços',
  description: 'Confira nossos planos de assinatura e tabela de preços de créditos de IR para a temporada 2026.',
})

// Dados dos planos
const availablePlans = [
  {
    id: 'free',
    name: 'Gratuito',
    slug: 'gratuito',
    price: 0,
    priceFormatted: 'R$ 0,00',
    description: 'Para experimentar a plataforma',
    bonusIr: 6,
    features: ['6 declarações inclusas', '1 Usuário', 'Gestor Kanban', '250MB Drive'],
    color: 'success'
  },
  {
    id: 'basic',
    name: 'Start',
    slug: 'basic',
    price: 29.90,
    priceFormatted: 'R$ 29,90',
    description: 'Contador Autônomo',
    bonusIr: 5,
    features: ['5 declarações de bônus', '1 Usuário', '5GB Drive', 'Relatórios Básicos'],
    color: 'primary',
  },
  {
    id: 'pro',
    name: 'Profissional',
    slug: 'pro',
    price: 49.90,
    priceFormatted: 'R$ 49,90',
    description: 'Escritórios em crescimento',
    bonusIr: 10,
    features: ['10 declarações de bônus', '3 Usuários', '20GB Drive', 'Whitelabel'],
    color: 'indigo',
  },
  {
    id: 'business',
    name: 'Empresa',
    slug: 'business',
    price: 89.90,
    priceFormatted: 'R$ 89,90',
    description: 'Escritórios',
    bonusIr: 10,
    features: ['10 declarações de bônus', '10 Usuários', '49GB Drive', 'Whitelabel'],
    color: 'indigo',
  }
]

// Tabela de Créditos IR
const irTiers = [
  { range: '1 a 9', price: 7.90, min: 1, max: 9 },
  { range: '10 a 24', price: 6.90, min: 10, max: 24 },
  { range: '25 a 49', price: 5.90, min: 25, max: 49 },
  { range: '50 a 99', price: 4.90, min: 50, max: 99 },
  { range: '100 a 249', price: 4.20, min: 100, max: 249 },
  { range: '250 a 499', price: 3.79, min: 250, max: 499 },
  { range: '500+', price: 3.19, min: 500, max: Infinity },
]

// Estado do Simulador
const simsPlanSlug = ref('basic')
const simsIrCount = ref(50)

const selectedPlan = computed(() =>
  availablePlans.find(p => p.slug === simsPlanSlug.value) || availablePlans[1]
)

const extraIrCount = computed(() => {
  const bonus = selectedPlan.value?.bonusIr || 0
  return Math.max(0, simsIrCount.value - bonus)
})

const currentTier = computed(() => {
  const count = extraIrCount.value
  if (count === 0) return irTiers[0]
  return irTiers.find(t => count >= t.min && count <= t.max) || irTiers[0]
})

const totalPlan = computed(() => selectedPlan.value?.price || 0)
const totalCredits = computed(() => extraIrCount.value * (currentTier.value?.price || 0))
const totalOverall = computed(() => totalPlan.value + totalCredits.value)

function formatCurrency(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function adjustQuantity(delta: number) {
  const newVal = simsIrCount.value + delta
  if (newVal >= 0) simsIrCount.value = newVal
}
</script>

<template>
  <div class="min-h-screen bg-muted-50 dark:bg-muted-950 font-sans text-muted-800 dark:text-muted-200">
    <!-- Navbar simples estilo dashboard -->
    <div
      class="h-16 border-b border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-900 flex items-center px-4 md:px-8 justify-between">
      <div class="flex items-center gap-4">
        <NuxtLink to="/links" class="text-muted-400 hover:text-primary-500 transition-colors flex items-center gap-2">
          <Icon name="solar:alt-arrow-left-linear" class="size-4" />
          <span class="text-sm font-medium">Links Úteis</span>
        </NuxtLink>
        <div class="h-4 w-px bg-muted-200 dark:bg-muted-800" />
        <span class="text-sm font-semibold text-muted-800 dark:text-white">Planos e Preços</span>
      </div>
      <BaseThemeToggle />
    </div>

    <div class="mx-auto max-w-6xl px-4 py-12 md:px-8">

      <!-- Page Header -->
      <div class="mb-10 text-center md:text-left">
        <BaseHeading as="h1" size="2xl" weight="bold" class="text-muted-900 dark:text-white">
          Estrutura de Preços
        </BaseHeading>
        <BaseParagraph size="sm" class="mt-1 text-muted-500 dark:text-muted-400 max-w-2xl">
          Entenda como funciona o faturamento do Gestor IRPF: Assinatura da plataforma para acesso às ferramentas e
          créditos por volume de declarações enviadas.
        </BaseParagraph>
      </div>

      <!-- Plans Section -->
      <div class="mb-16">
        <div class="flex items-center gap-2 mb-6">
          <Icon name="solar:box-bold-duotone" class="size-5 text-primary-500" />
          <BaseHeading as="h2" size="lg" weight="semibold">Assinatura Mensal</BaseHeading>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BaseCard v-for="plan in availablePlans" :key="plan.id" rounded="lg"
            class="p-6 border-muted-200 dark:border-muted-800 flex flex-col">
            <div class="mb-4">
              <BaseTag :color="plan.color === 'success' ? 'success' : (plan.color === 'indigo' ? 'info' : 'primary')"
                rounded="full" size="sm" class="mb-2">{{ plan.name }}</BaseTag>
              <BaseHeading as="h3" size="xl" weight="bold" class="text-muted-900 dark:text-white">{{ plan.priceFormatted
                }}<span class="text-sm font-normal text-muted-400">/mês</span></BaseHeading>
              <p class="text-xs text-muted-500 dark:text-muted-400 mt-1">{{ plan.description }}</p>
            </div>

            <div class="h-px bg-muted-100 dark:bg-muted-800 my-4" />

            <ul class="space-y-3 mb-6 flex-1">
              <li v-for="feature in plan.features" :key="feature" class="flex items-center gap-2">
                <Icon name="lucide:check" class="size-3.5 text-success-500" />
                <span class="text-xs text-muted-600 dark:text-muted-400">{{ feature }}</span>
              </li>
            </ul>
          </BaseCard>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        <!-- Table Section -->
        <div class="lg:col-span-5">
          <div class="flex items-center gap-2 mb-6">
            <Icon name="solar:reorder-bold-duotone" class="size-5 text-primary-500" />
            <BaseHeading as="h2" size="lg" weight="semibold">Tabela de Declarações</BaseHeading>
          </div>

          <BaseCard rounded="lg" class="overflow-hidden border-muted-200 dark:border-muted-800">
            <table class="w-full text-left font-sans">
              <thead class="bg-muted-50 dark:bg-muted-800/50">
                <tr>
                  <th class="px-5 py-3 text-[10px] font-bold text-muted-400 uppercase tracking-wider">Faixa</th>
                  <th class="px-5 py-3 text-right text-[10px] font-bold text-muted-400 uppercase tracking-wider">Por IR
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-muted-100 dark:divide-muted-800">
                <tr v-for="tier in irTiers" :key="tier.range"
                  class="hover:bg-muted-50/50 dark:hover:bg-muted-800/20 transition-colors">
                  <td class="px-5 py-3 text-sm text-muted-600 dark:text-muted-400">
                    {{ tier.range }} unidades
                  </td>
                  <td class="px-5 py-3 text-right text-sm font-bold text-muted-800 dark:text-white tabular-nums">
                    R$ {{ tier.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="p-4 bg-muted-50 dark:bg-muted-800/30 border-t border-muted-100 dark:border-muted-800">
              <p class="text-[10px] text-muted-400 dark:text-muted-500 leading-tight">
                * Os créditos adquiridos não possuem data de validade dentro da temporada atual.
              </p>
            </div>
          </BaseCard>
        </div>

        <!-- Simulator Section -->
        <div class="lg:col-span-7">
          <div class="flex items-center gap-2 mb-6">
            <Icon name="solar:calculator-minimalistic-bold-duotone" class="size-5 text-primary-500" />
            <BaseHeading as="h2" size="lg" weight="semibold">Simulador de Custos</BaseHeading>
          </div>

          <BaseCard rounded="lg" class="p-8 border-muted-200 dark:border-muted-800">
            <div class="space-y-8">
              <!-- Plan Choice -->
              <div>
                <label class="text-xs font-bold text-muted-400 uppercase tracking-wider block mb-4">Seu Plano</label>
                <div class="grid grid-cols-3 gap-3">
                  <button v-for="plan in availablePlans" :key="plan.id" @click="simsPlanSlug = plan.slug"
                    class="p-4 rounded-xl border-2 text-center transition-all flex flex-col gap-1" :class="simsPlanSlug === plan.slug
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                      : 'border-muted-100 dark:border-muted-800 hover:border-muted-200 dark:hover:border-muted-700'">
                    <span class="text-xs font-bold"
                      :class="simsPlanSlug === plan.slug ? 'text-primary-600 dark:text-primary-400' : 'text-muted-500'">{{
                        plan.name }}</span>
                    <span class="text-[10px] text-muted-400">{{ plan.bonusIr }} inclusas</span>
                  </button>
                </div>
              </div>

              <!-- Slider -->
              <div>
                <div class="flex items-center justify-between mb-4">
                  <label class="text-xs font-bold text-muted-400 uppercase tracking-wider">Total de Declarações</label>
                  <span class="text-2xl font-black text-muted-800 dark:text-white tabular-nums">{{ simsIrCount }}</span>
                </div>

                <div class="flex items-center gap-4">
                  <BaseButton size="sm" color="muted" class="shrink-0" :disabled="simsIrCount <= 0"
                    @click="adjustQuantity(-10)">
                    -10
                  </BaseButton>

                  <input v-model.number="simsIrCount" type="range" min="0" max="1000" step="10"
                    class="flex-1 accent-primary-500 h-1.5 bg-muted-200 dark:bg-muted-800 rounded-full cursor-pointer" />

                  <BaseButton size="sm" color="muted" class="shrink-0" @click="adjustQuantity(10)">
                    +10
                  </BaseButton>
                </div>
              </div>

              <!-- Breakdown -->
              <div
                class="bg-muted-50 dark:bg-muted-800 shadow-inner rounded-2xl p-6 border border-muted-100 dark:border-muted-700">
                <div class="space-y-4 mb-6">
                  <!-- Monthly Recurring -->
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="text-[10px] font-bold text-muted-400 uppercase tracking-widest block">Recorrência
                        Mensal</span>
                      <span class="text-sm font-semibold text-muted-800 dark:text-white">Assinatura {{
                        selectedPlan?.name }}</span>
                    </div>
                    <div class="text-right">
                      <div class="text-xl font-black text-muted-800 dark:text-white">{{ formatCurrency(totalPlan) }}
                      </div>
                      <div class="text-[10px] text-muted-400">por mês</div>
                    </div>
                  </div>

                  <div class="h-px bg-muted-200 dark:bg-muted-700" />

                  <!-- One time cost -->
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="text-[10px] font-bold text-muted-400 uppercase tracking-widest block">Pagamento
                        Único</span>
                      <span class="text-sm font-semibold text-muted-800 dark:text-white">{{ extraIrCount }} Créditos de
                        IR</span>
                    </div>
                    <div class="text-right">
                      <div class="text-xl font-black text-primary-500">{{ formatCurrency(totalCredits) }}</div>
                      <div v-if="extraIrCount > 0" class="text-[10px] text-primary-500 font-medium">
                        {{ formatCurrency(currentTier?.price || 0) }} /unid
                      </div>
                      <div v-else class="text-[10px] text-success-500 font-medium">
                        Incluso no plano
                      </div>
                    </div>
                  </div>
                </div>

                <div class="bg-primary-600 p-4 rounded-xl text-white text-center">
                  <p class="text-[11px] font-medium opacity-90 leading-tight">
                    Os créditos adquiridos não possuem validade e podem ser comprados conforme sua necessidade.
                  </p>
                </div>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- Simple CTA -->
      <div
        class="mt-20 py-12 border-t border-muted-100 dark:border-muted-800 flex flex-col md:flex-row items-center justify-between gap-8">
        <div class="max-w-md text-center md:text-left">
          <BaseHeading as="h4" size="lg" weight="bold">Pronto para começar?</BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400 mt-2">
            Crie sua conta gratuitamente ou agende uma demonstração personalizada com nossos especialistas para entender
            como escalar seu escritório.
          </BaseParagraph>
        </div>
        <div class="flex flex-wrap gap-4 justify-center">
          <BaseButton to="https://wa.me/5521979044284" target="_blank" color="primary" class="font-bold px-8 h-11">
            Falar com Consultor
          </BaseButton>
          <BaseButton to="https://app.gestorirpf.com.br/auth/register?c=links" target="_blank" color="muted"
            class="font-bold px-8 h-11">
            Criar Conta Grátis
          </BaseButton>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Estilização suave do range input */
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #3b82f6;
  border: 4px solid #fff;
  border-radius: 50%;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  cursor: pointer;
}

input[type=range]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #3b82f6;
  border: 4px solid #fff;
  border-radius: 50%;
  cursor: pointer;
}
</style>
