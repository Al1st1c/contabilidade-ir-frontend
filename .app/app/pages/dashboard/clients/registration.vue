<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Link de Cadastro',
})

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

const isLoading = ref(true)
const analytics = ref<any>(null)
const isCopied = ref(false)
const isToggling = ref(false)
const isSavingSettings = ref(false)
const autoCreateDeclaration = ref(false)
const defaultServiceValue = ref<string>('')

async function fetchAnalytics() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any>('/registration/analytics')
    if (data?.success) {
      analytics.value = data.data
      // Sincronizar configurações locais
      if (data.data.link) {
        autoCreateDeclaration.value = data.data.link.autoCreateDeclaration || false
        defaultServiceValue.value = data.data.link.defaultServiceValue ? String(data.data.link.defaultServiceValue) : ''
      }
    }
  }
  catch (e) {
    console.error('Erro ao buscar analytics:', e)
  }
  finally {
    isLoading.value = false
  }
}

async function generateLink() {
  try {
    const { data } = await useCustomFetch<any>('/registration')
    if (data?.success) {
      await fetchAnalytics()
    }
  }
  catch (e) {
    toaster.add({ title: 'Erro', description: 'Erro ao gerar link', icon: 'ph:warning-circle-fill' })
  }
}

async function toggleLink() {
  isToggling.value = true
  try {
    const { data } = await useCustomFetch<any>('/registration/toggle', { method: 'PATCH' })
    if (data?.success) {
      analytics.value.link = data.data
      toaster.add({ title: 'Sucesso', description: data.data.isActive ? 'Link ativado' : 'Link desativado', icon: 'ph:check-circle-fill' })
    }
  }
  catch (e) {
    toaster.add({ title: 'Erro', description: 'Erro ao alterar link', icon: 'ph:warning-circle-fill' })
  }
  finally {
    isToggling.value = false
  }
}

const registrationUrl = computed(() => {
  if (!analytics.value?.link?.token) return ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `https://irpf26.com/register?token=${analytics.value.link.token}`
})

function copyLink() {
  if (!registrationUrl.value) return
  navigator.clipboard?.writeText(registrationUrl.value)
  isCopied.value = true
  toaster.add({ title: 'Copiado!', description: 'Link copiado para a área de transferência', icon: 'ph:check-circle-fill' })
  setTimeout(() => isCopied.value = false, 3000)
}

async function saveSettings() {
  isSavingSettings.value = true
  try {
    const { data } = await useCustomFetch<any>('/registration/settings', {
      method: 'PATCH',
      body: {
        autoCreateDeclaration: autoCreateDeclaration.value,
        defaultServiceValue: defaultServiceValue.value ? Number(defaultServiceValue.value) : null,
      },
    })
    if (data?.success) {
      analytics.value.link = data.data
      toaster.add({ title: 'Sucesso', description: 'Configurações salvas', icon: 'ph:check-circle-fill' })
    }
  }
  catch (e) {
    toaster.add({ title: 'Erro', description: 'Erro ao salvar configurações', icon: 'ph:warning-circle-fill' })
  }
  finally {
    isSavingSettings.value = false
  }
}

// ─── Chart: Cliques e Cadastros (Area) ──────────────────────────────
const dailyAreaChart = computed(() => {
  const stats = analytics.value?.dailyStats || []
  const series = shallowRef([
    { name: 'Cliques', data: stats.map((d: any) => d.clicks) },
    { name: 'Cadastros', data: stats.map((d: any) => d.registrations) },
  ])
  return defineApexchartsProps({
    type: 'area',
    height: 280,
    series,
    options: {
      chart: { toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false } },
      colors: ['var(--color-chart-base)', 'var(--color-primary-400)'],
      dataLabels: { enabled: false },
      stroke: { width: [2, 2], curve: 'smooth' },
      fill: {
        type: 'gradient',
        gradient: { shade: 'light', type: 'vertical', gradientToColors: ['var(--color-chart-gradient)'], shadeIntensity: 0, opacityFrom: 0.6, opacityTo: 0.1 },
      },
      xaxis: {
        categories: stats.map((d: any) => {
          const date = new Date(d.date)
          return `${date.getDate()}/${date.getMonth() + 1}`
        }),
        labels: { style: { fontSize: '10px' } },
      },
      yaxis: { labels: { style: { fontSize: '10px' } } },
      tooltip: { shared: true },
      legend: { position: 'top', fontSize: '11px' },
    },
  })
})

// ─── Chart: Melhores Horários (Bar) ─────────────────────────────────
const hourlyBarChart = computed(() => {
  const hours = analytics.value?.hourlyDistribution || []
  const series = shallowRef([
    { name: 'Cadastros', data: hours.map((h: any) => h.registrations) },
  ])
  return defineApexchartsProps({
    type: 'bar',
    height: 250,
    series,
    options: {
      chart: { toolbar: { show: false } },
      colors: ['var(--color-chart-base)'],
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      xaxis: {
        categories: hours.map((h: any) => `${String(h.hour).padStart(2, '0')}h`),
        labels: { style: { fontSize: '9px' }, rotate: -45 },
      },
      yaxis: { labels: { style: { fontSize: '10px' } } },
      tooltip: { y: { formatter: (val: number) => `${val} cadastro${val !== 1 ? 's' : ''}` } },
    },
  })
})

// ─── Chart: Dispositivos (Donut) ────────────────────────────────────
const deviceDonutChart = computed(() => {
  const devices = analytics.value?.devices || []
  const series = shallowRef(devices.map((d: any) => d.count))
  return defineApexchartsProps({
    type: 'donut',
    height: 250,
    series,
    options: {
      labels: devices.map((d: any) => d.name),
      colors: ['var(--color-chart-base)', 'var(--color-primary-300)', 'var(--color-amber-400)', 'var(--color-indigo-400)', 'var(--color-teal-400)', 'var(--color-rose-400)'],
      legend: { position: 'bottom', horizontalAlign: 'center', fontSize: '11px' },
      responsive: [{ breakpoint: 480, options: { chart: { width: 280 }, legend: { position: 'top' } } }],
    },
  })
})

// ─── Chart: Radial Conversão ────────────────────────────────────────
const conversionRadial = computed(() => {
  const rate = analytics.value?.conversionRate || 0
  const series = shallowRef([rate])
  return defineApexchartsProps({
    type: 'radialBar',
    height: 260,
    series,
    options: {
      plotOptions: {
        radialBar: {
          hollow: { size: '70%' },
          dataLabels: {
            name: { show: true, fontSize: '13px', color: undefined, offsetY: -10 },
            value: { show: true, fontSize: '30px', formatter: (val: number) => `${val}%` },
          },
        },
      },
      colors: ['var(--color-chart-base)'],
      labels: ['Conversão'],
    },
  })
})

onMounted(fetchAnalytics)
</script>

<template>
  <ClientOnly>
    <template #fallback>
      <AppPageLoading message="Carregando analytics..." />
    </template>

    <div class="px-4 md:px-6 lg:px-8 pb-20">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <BaseHeading as="h1" size="2xl" weight="medium" class="text-muted-800 dark:text-white">
            Link de Cadastro
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
            Compartilhe o link para que os clientes se cadastrem sozinhos.
          </BaseParagraph>
        </div>
        <BaseButton v-if="!analytics?.link" variant="primary" :loading="isLoading" @click="generateLink">
          <Icon name="solar:link-round-angle-bold" class="size-4 mr-1" />
          Gerar Link
        </BaseButton>
      </div>

      <AppPageLoading v-if="isLoading" message="Carregando dados do link..." />

      <template v-else>
        <!-- Link Card -->
        <BaseCard v-if="analytics?.link" rounded="md" class="p-5 mb-6">
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <Icon name="solar:link-round-angle-bold" class="size-4 text-primary-500" />
                <span class="text-xs font-bold text-muted-500 uppercase tracking-wider">Seu Link</span>
                <BaseTag :variant="analytics.link.isActive ? 'none' : 'muted'" size="sm" rounded="full"
                  :class="analytics.link.isActive ? 'bg-emerald-500/10 text-emerald-600 text-[9px]' : 'text-[9px]'">
                  {{ analytics.link.isActive ? 'Ativo' : 'Inativo' }}
                </BaseTag>
              </div>
              <p
                class="text-sm text-muted-700 dark:text-muted-300 font-mono bg-muted-100 dark:bg-muted-900 px-3 py-2 rounded-lg truncate">
                {{ registrationUrl }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <BaseButton variant="primary" size="sm" @click="copyLink">
                <Icon :name="isCopied ? 'solar:check-read-bold' : 'solar:copy-bold'" class="size-4 mr-1" />
                {{ isCopied ? 'Copiado!' : 'Copiar' }}
              </BaseButton>
              <BaseButton variant="muted" size="sm" :loading="isToggling" @click="toggleLink">
                <Icon :name="analytics.link.isActive ? 'solar:lock-bold' : 'solar:lock-unlocked-bold'"
                  class="size-4 mr-1" />
                {{ analytics.link.isActive ? 'Desativar' : 'Ativar' }}
              </BaseButton>
            </div>
          </div>
        </BaseCard>

        <!-- Settings Card -->
        <BaseCard v-if="analytics?.link" rounded="md" class="p-6 mb-6">
          <div class="mb-5">
            <BaseHeading as="h3" size="md" weight="medium" lead="tight" class="text-muted-900 dark:text-white">
              <span>Configurações do Cadastro</span>
            </BaseHeading>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <BaseHeading as="h5" size="sm" weight="medium" lead="tight" class="text-muted-800 dark:text-muted-200">
                  <span>Criar declaração IR automaticamente</span>
                </BaseHeading>
                <span class="text-muted-400 font-sans text-xs">Ao se cadastrar, o sistema cria automaticamente uma
                  declaração para o
                  cliente (debita 1 crédito do saldo).</span>
              </div>
              <BaseSwitchBall v-model="autoCreateDeclaration" />
            </div>

            <div v-if="autoCreateDeclaration" class="pl-0 pt-2 border-t border-muted-200 dark:border-muted-700">
              <BaseHeading as="h5" size="sm" weight="medium" lead="tight"
                class="text-muted-500 dark:text-muted-400 mb-1.5">
                <span>Honorário padrão (R$)</span>
              </BaseHeading>
              <div class="max-w-[200px]">
                <BaseInput v-model="defaultServiceValue" type="number" placeholder="0.00" step="0.01" min="0" size="sm"
                  rounded="lg" icon="solar:wallet-money-bold-duotone" />
              </div>
              <span class="text-muted-400 font-sans text-xs">Valor do serviço que será atribuído à declaração criada
                automaticamente. Deixe vazio para não definir.</span>
            </div>

            <div class="flex justify-end pt-2">
              <BaseButton variant="primary" size="sm" :loading="isSavingSettings" @click="saveSettings">
                <Icon name="solar:diskette-bold" class="size-4 mr-1" />
                Salvar Configurações
              </BaseButton>
            </div>
          </div>
        </BaseCard>

        <!-- Empty state -->
        <div v-if="!analytics?.link" class="text-center py-20">
          <div
            class="size-20 bg-muted-100 dark:bg-muted-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="solar:link-round-angle-linear" class="size-10 text-muted-400" />
          </div>
          <BaseHeading as="h3" size="md" weight="semibold" class="text-muted-400 mb-2">
            Nenhum link criado
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 max-w-sm mx-auto">
            Gere um link para que seus clientes possam se cadastrar diretamente no seu sistema.
          </BaseParagraph>
        </div>

        <!-- Analytics Grid -->
        <div v-if="analytics?.link" class="grid grid-cols-12 gap-4">
          <!-- Stat tiles row -->
          <div class="col-span-12 md:col-span-4">
            <BaseCard rounded="md" class="p-4">
              <div class="mb-1 flex items-center justify-between">
                <BaseHeading as="h5" size="sm" weight="medium" lead="tight" class="text-muted-500 dark:text-muted-400">
                  <span>Cliques</span>
                </BaseHeading>
                <BaseIconBox size="xs"
                  class="bg-primary-100 text-primary-500 dark:bg-primary-500/20 dark:text-primary-400 dark:border-primary-500 dark:border-2"
                  rounded="full" variant="none">
                  <Icon name="solar:cursor-bold-duotone" class="size-5" />
                </BaseIconBox>
              </div>
              <div class="mb-2">
                <BaseHeading as="h4" size="3xl" weight="bold" lead="tight" class="text-muted-900 dark:text-white">
                  <span>{{ analytics.totalClicks }}</span>
                </BaseHeading>
              </div>
              <div class="text-muted-400 font-sans text-xs">
                <span>Últimos 30 dias</span>
              </div>
            </BaseCard>
          </div>
          <div class="col-span-12 md:col-span-4">
            <BaseCard rounded="md" class="p-4">
              <div class="mb-1 flex items-center justify-between">
                <BaseHeading as="h5" size="sm" weight="medium" lead="tight" class="text-muted-500 dark:text-muted-400">
                  <span>Cadastros</span>
                </BaseHeading>
                <BaseIconBox size="xs"
                  class="bg-primary-100 text-primary-500 dark:bg-primary-500/20 dark:text-primary-400 dark:border-primary-500 dark:border-2"
                  rounded="full" variant="none">
                  <Icon name="solar:user-plus-bold-duotone" class="size-5" />
                </BaseIconBox>
              </div>
              <div class="mb-2">
                <BaseHeading as="h4" size="3xl" weight="bold" lead="tight" class="text-muted-900 dark:text-white">
                  <span>{{ analytics.totalRegistrations }}</span>
                </BaseHeading>
              </div>
              <div class="text-muted-400 font-sans text-xs">
                <span>Últimos 30 dias</span>
              </div>
            </BaseCard>
          </div>
          <div class="col-span-12 md:col-span-4">
            <BaseCard rounded="md" class="p-4">
              <div class="mb-1 flex items-center justify-between">
                <BaseHeading as="h5" size="sm" weight="medium" lead="tight" class="text-muted-500 dark:text-muted-400">
                  <span>Conversão</span>
                </BaseHeading>
                <BaseIconBox size="xs"
                  class="bg-primary-100 text-primary-500 dark:bg-primary-500/20 dark:text-primary-400 dark:border-primary-500 dark:border-2"
                  rounded="full" variant="none">
                  <Icon name="solar:chart-2-bold-duotone" class="size-5" />
                </BaseIconBox>
              </div>
              <div class="mb-2">
                <BaseHeading as="h4" size="3xl" weight="bold" lead="tight" class="text-muted-900 dark:text-white">
                  <span>{{ analytics.conversionRate }}%</span>
                </BaseHeading>
              </div>
              <div class="text-muted-400 font-sans text-xs">
                <span>Cadastros / Cliques</span>
              </div>
            </BaseCard>
          </div>

          <!-- Area chart: Daily -->
          <div class="col-span-12 md:col-span-8">
            <BaseCard rounded="md" class="p-6">
              <div class="mb-2 flex items-center justify-between">
                <BaseHeading as="h3" size="md" weight="medium" lead="tight" class="text-muted-900 dark:text-white">
                  <span>Cliques e Cadastros</span>
                </BaseHeading>
              </div>
              <div class="flex gap-8 mb-2">
                <div>
                  <span class="text-muted-600 dark:text-muted-400 font-sans text-xs">Cliques</span>
                  <p class="text-muted-900 dark:text-muted-100 font-sans text-lg font-medium">
                    {{ analytics.totalClicks }}
                  </p>
                </div>
                <div>
                  <span class="text-muted-600 dark:text-muted-400 font-sans text-xs">Cadastros</span>
                  <p class="text-muted-900 dark:text-muted-100 font-sans text-lg font-medium">
                    {{ analytics.totalRegistrations }}
                  </p>
                </div>
              </div>
              <LazyAddonApexcharts v-if="analytics.dailyStats?.length" v-bind="reactive(dailyAreaChart)" />
              <div v-else class="py-12 text-center text-sm text-muted-400">Sem dados ainda</div>
            </BaseCard>
          </div>

          <!-- Radial: Conversão -->
          <div class="col-span-12 md:col-span-4">
            <BaseCard rounded="md" class="flex h-full flex-col p-6">
              <div class="mb-5 flex items-center justify-between">
                <BaseHeading as="h3" size="md" weight="medium" lead="tight" class="text-muted-900 dark:text-white">
                  <span>Taxa de Conversão</span>
                </BaseHeading>
              </div>
              <div class="mb-6">
                <LazyAddonApexcharts v-bind="reactive(conversionRadial)" />
              </div>
              <div class="mt-auto">
                <div class="border-muted-200 dark:border-muted-700 flex w-full border-t pt-4 text-center">
                  <div class="border-muted-200 dark:border-muted-700 flex-1 border-r px-2">
                    <span class="text-muted-400 font-sans text-xs">Cliques</span>
                    <p class="text-muted-900 dark:text-muted-100 font-sans text-lg font-medium">
                      {{ analytics.totalClicks }}
                    </p>
                  </div>
                  <div class="flex-1 px-2">
                    <span class="text-muted-400 font-sans text-xs">Cadastros</span>
                    <p class="text-muted-900 dark:text-muted-100 font-sans text-lg font-medium">
                      {{ analytics.totalRegistrations }}
                    </p>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- Bar chart: Hourly -->
          <div class="col-span-12 md:col-span-6">
            <BaseCard rounded="md" class="p-6">
              <div class="mb-6">
                <BaseHeading as="h3" size="md" weight="medium" lead="tight" class="text-muted-900 dark:text-white">
                  <span>Melhores Horários</span>
                </BaseHeading>
              </div>
              <LazyAddonApexcharts v-if="analytics.hourlyDistribution?.length" v-bind="reactive(hourlyBarChart)" />
              <div v-else class="py-12 text-center text-sm text-muted-400">Sem dados suficientes</div>
            </BaseCard>
          </div>

          <!-- Donut chart: Devices -->
          <div class="col-span-12 md:col-span-6">
            <BaseCard rounded="md" class="p-6">
              <div class="mb-6">
                <BaseHeading as="h3" size="md" weight="medium" lead="tight" class="text-muted-900 dark:text-white">
                  <span>Dispositivos</span>
                </BaseHeading>
              </div>
              <LazyAddonApexcharts v-if="analytics.devices?.length" v-bind="reactive(deviceDonutChart)" />
              <div v-else class="py-12 text-center text-sm text-muted-400">Sem dados suficientes</div>
            </BaseCard>
          </div>

          <!-- Recent Registrations Table -->
          <div v-if="analytics.recentRegistrations?.length" class="col-span-12">
            <BaseCard rounded="md" class="p-6">
              <div class="mb-4">
                <BaseHeading as="h3" size="md" weight="medium" lead="tight" class="text-muted-900 dark:text-white">
                  <span>Últimos Cadastros</span>
                </BaseHeading>
              </div>
              <div class="space-y-2">
                <div v-for="(reg, idx) in analytics.recentRegistrations" :key="idx"
                  class="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted-50 dark:bg-muted-900/50">
                  <div class="flex items-center gap-3">
                    <BaseAvatar :text="reg.clientName?.charAt(0)?.toUpperCase()" size="xs"
                      class="bg-primary-500/10 text-primary-600 ring-1 ring-primary-500/20" />
                    <div>
                      <p class="text-sm font-medium text-muted-800 dark:text-muted-200">{{ reg.clientName }}</p>
                      <p class="text-[10px] text-muted-400">
                        {{ reg.device }}
                        <template v-if="reg.ipMasked"> · IP {{ reg.ipMasked }}</template>
                      </p>
                    </div>
                  </div>
                  <span class="text-[10px] text-muted-400 shrink-0">
                    {{ new Date(reg.date).toLocaleDateString('pt-BR') }}
                    {{ new Date(reg.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }}
                  </span>
                </div>
              </div>
            </BaseCard>
          </div>
        </div>
      </template>
    </div>
  </ClientOnly>
</template>
