<script setup lang="ts">
import { useApi } from '~/composables/useAuth'
import { useSubscription } from '~/composables/useSubscription'

definePageMeta({
  title: 'Créditos SMS & Email',
})

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()
const { currentSubscription, fetchMySubscription } = useSubscription()

const isLoading = ref(true)
const isPurchasing = ref(false)
const packages = ref<{ sms: any[]; email: any[] }>({ sms: [], email: [] })
const balance = ref<any>(null)
const history = ref<any[]>([])
const activeTab = ref<'sms' | 'email'>('sms')
const selectedPackage = ref<string | null>(null)
const pixResult = ref<any>(null)

onMounted(async () => {
  isLoading.value = true
  await Promise.all([loadPackages(), loadBalance(), loadHistory(), fetchMySubscription()])
  isLoading.value = false
})

async function loadPackages() {
  try {
    const { data } = await useCustomFetch('/credits/packages')
    packages.value = data as any
  } catch (err: any) {
    toaster.add({ title: 'Erro', description: err.message, icon: 'solar:danger-triangle-bold-duotone' })
  }
}

async function loadBalance() {
  try {
    const { data } = await useCustomFetch('/credits/balance')
    balance.value = data
  } catch (err: any) {
    console.error(err)
  }
}

async function loadHistory() {
  try {
    const { data } = await useCustomFetch('/credits/history')
    history.value = data as any[] || []
  } catch (err: any) {
    console.error(err)
  }
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

async function purchasePackage() {
  if (!selectedPackage.value || isPurchasing.value) return
  isPurchasing.value = true
  try {
    const { data } = await useCustomFetch('/credits/purchase', {
      method: 'POST',
      body: { packageId: selectedPackage.value },
    })
    pixResult.value = data
    toaster.add({
      title: 'QR Code PIX gerado!',
      description: 'Escaneie o código para concluir a compra.',
      icon: 'solar:check-circle-bold-duotone',
    })
  } catch (err: any) {
    toaster.add({ title: 'Erro na compra', description: err.message, icon: 'solar:danger-triangle-bold-duotone' })
  } finally {
    isPurchasing.value = false
  }
}

function copyPix() {
  if (pixResult.value?.pix?.qrCode) {
    navigator.clipboard.writeText(pixResult.value.pix.qrCode)
    toaster.add({ title: 'Código PIX copiado!', description: 'Cole no app do seu banco.', icon: 'solar:copy-bold-duotone' })
  }
}

function resetPurchase() {
  pixResult.value = null
  selectedPackage.value = null
  loadBalance()
  loadHistory()
}

const currentPackages = computed(() => packages.value[activeTab.value] || [])
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <AppPageLoading v-if="isLoading" min-height="60vh" message="Carregando créditos..." />

    <div v-else class="mx-auto max-w-6xl">
      <!-- Header -->
      <div class="mb-10">
        <NuxtLink to="/dashboard"
          class="text-primary-500 hover:opacity-75 transition-opacity flex items-center gap-2 mb-2 font-medium">
          <Icon name="solar:alt-arrow-left-linear" class="size-4" />
          Voltar ao Dashboard
        </NuxtLink>
        <BaseHeading as="h1" size="2xl" weight="bold" class="text-muted-800 dark:text-white">
          Créditos Pré-Pagos
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
          Compre créditos avulsos de SMS e Email para suas campanhas de marketing.
        </BaseParagraph>
      </div>

      <!-- Balance Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <BaseCard rounded="md"
          class="p-5 bg-gradient-to-br from-primary-500/5 to-primary-500/10 dark:from-primary-500/10 dark:to-primary-500/20 border-primary-200/40 dark:border-primary-500/20">
          <div class="flex items-center justify-between">
            <div>
              <BaseText size="xs" class="text-muted-500 dark:text-muted-400 uppercase tracking-wider font-semibold">
                SMS Disponíveis
              </BaseText>
              <div class="flex items-baseline gap-2 mt-1">
                <BaseHeading as="h3" size="2xl" weight="bold" class="text-primary-600 dark:text-primary-400">
                  {{ balance?.sms?.available ?? 0 }}
                </BaseHeading>
                <BaseText size="xs" class="text-muted-400">
                  / {{ (balance?.sms?.planLimit ?? 0) + (balance?.sms?.prepaid ?? 0) }} total
                </BaseText>
              </div>
              <div class="flex items-center gap-3 mt-2 text-[10px] text-muted-500">
                <span>Plano: {{ balance?.sms?.planLimit ?? 0 }}</span>
                <span>•</span>
                <span class="text-primary-500 font-semibold">Pré-pagos: {{ balance?.sms?.prepaid ?? 0 }}</span>
                <span>•</span>
                <span>Usados: {{ balance?.sms?.used ?? 0 }}</span>
              </div>
            </div>
            <div class="p-3 rounded-2xl bg-primary-500/10">
              <Icon name="solar:chat-round-dots-bold-duotone" class="size-8 text-primary-500" />
            </div>
          </div>
        </BaseCard>

        <BaseCard rounded="md"
          class="p-5 bg-gradient-to-br from-info-500/5 to-info-500/10 dark:from-info-500/10 dark:to-info-500/20 border-info-200/40 dark:border-info-500/20">
          <div class="flex items-center justify-between">
            <div>
              <BaseText size="xs" class="text-muted-500 dark:text-muted-400 uppercase tracking-wider font-semibold">
                Emails Disponíveis
              </BaseText>
              <div class="flex items-baseline gap-2 mt-1">
                <BaseHeading as="h3" size="2xl" weight="bold" class="text-info-600 dark:text-info-400">
                  {{ balance?.email?.available ?? 0 }}
                </BaseHeading>
                <BaseText size="xs" class="text-muted-400">
                  / {{ (balance?.email?.planLimit ?? 0) + (balance?.email?.prepaid ?? 0) }} total
                </BaseText>
              </div>
              <div class="flex items-center gap-3 mt-2 text-[10px] text-muted-500">
                <span>Plano: {{ balance?.email?.planLimit ?? 0 }}</span>
                <span>•</span>
                <span class="text-info-500 font-semibold">Pré-pagos: {{ balance?.email?.prepaid ?? 0 }}</span>
                <span>•</span>
                <span>Usados: {{ balance?.email?.used ?? 0 }}</span>
              </div>
            </div>
            <div class="p-3 rounded-2xl bg-info-500/10">
              <Icon name="solar:letter-bold-duotone" class="size-8 text-info-500" />
            </div>
          </div>
        </BaseCard>
      </div>

      <div class="grid grid-cols-12 gap-8">
        <!-- Left: Package Selection -->
        <div class="col-span-12 lg:col-span-7">
          <!-- PIX Result -->
          <BaseCard v-if="pixResult" rounded="md" class="p-8 text-center mb-6">
            <div class="mb-4">
              <div class="inline-flex p-4 rounded-full bg-success-500/10 mb-4">
                <Icon name="solar:check-circle-bold-duotone" class="size-12 text-success-500" />
              </div>
              <BaseHeading as="h3" size="lg" weight="bold" class="text-muted-800 dark:text-white mb-2">
                QR Code PIX Gerado!
              </BaseHeading>
              <BaseParagraph size="sm" class="text-muted-500">
                Escaneie o código abaixo no app do seu banco para concluir a compra de
                <strong class="text-muted-800 dark:text-white">{{ pixResult.package?.label }}</strong>.
              </BaseParagraph>
            </div>

            <div class="max-w-xs mx-auto mb-6">
              <div class="bg-white p-4 rounded-xl shadow-lg">
                <img v-if="pixResult.pix?.qrCodeImage" :src="pixResult.pix.qrCodeImage" alt="QR Code PIX"
                  class="w-full" />
              </div>
            </div>

            <div class="flex flex-col sm:flex-row justify-center gap-3">
              <BaseButton variant="primary" color="primary" @click="copyPix" class="gap-2">
                <Icon name="solar:copy-bold-duotone" class="size-4" />
                Copiar Código PIX
              </BaseButton>
              <BaseButton variant="muted" @click="resetPurchase" class="gap-2">
                <Icon name="solar:restart-bold-duotone" class="size-4" />
                Comprar Mais
              </BaseButton>
            </div>

            <BaseParagraph size="xs" class="text-muted-400 mt-6">
              Após o pagamento, os créditos serão adicionados automaticamente à sua conta.
            </BaseParagraph>
          </BaseCard>

          <!-- Packages -->
          <template v-else>
            <!-- Tab Switcher -->
            <div class="flex gap-2 mb-6">
              <BaseButton :variant="activeTab === 'sms' ? 'primary' : 'muted'"
                :color="activeTab === 'sms' ? 'primary' : 'default'" size="sm" @click="activeTab = 'sms'" class="gap-2">
                <Icon name="solar:chat-round-dots-bold-duotone" class="size-4" />
                Pacotes SMS
              </BaseButton>
              <BaseButton :variant="activeTab === 'email' ? 'primary' : 'muted'"
                :color="activeTab === 'email' ? 'info' : 'default'" size="sm" @click="activeTab = 'email'"
                class="gap-2">
                <Icon name="solar:letter-bold-duotone" class="size-4" />
                Pacotes Email
              </BaseButton>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BaseCard v-for="pkg in currentPackages" :key="pkg.id" rounded="md"
                class="p-5 cursor-pointer transition-all duration-200 hover:shadow-lg relative overflow-hidden" :class="{
                  'ring-2 ring-primary-500 shadow-lg shadow-primary-500/10': selectedPackage === pkg.id,
                  'hover:ring-1 hover:ring-muted-300 dark:hover:ring-muted-600': selectedPackage !== pkg.id,
                }" @click="selectedPackage = pkg.id">

                <!-- Popular badge -->
                <div v-if="pkg.popular"
                  class="absolute -right-8 top-3 rotate-45 bg-primary-500 px-8 py-0.5 text-[9px] font-bold text-white uppercase">
                  Popular
                </div>

                <!-- Selection indicator -->
                <div class="absolute top-3 right-3">
                  <div v-if="selectedPackage === pkg.id"
                    class="size-6 rounded-full bg-primary-500 flex items-center justify-center">
                    <Icon name="solar:check-read-linear" class="size-3.5 text-white" />
                  </div>
                  <div v-else class="size-6 rounded-full border-2 border-muted-300 dark:border-muted-600" />
                </div>

                <BaseText size="lg" weight="bold" class="text-muted-800 dark:text-white mb-1">
                  {{ pkg.label }}
                </BaseText>
                <div class="flex items-baseline gap-1 mb-3">
                  <BaseHeading as="h4" size="xl" weight="bold" class="text-primary-600 dark:text-primary-400">
                    {{ formatCurrency(pkg.priceInCents) }}
                  </BaseHeading>
                </div>
                <BaseText size="xs" class="text-muted-500">
                  {{ formatCurrency(pkg.unitPriceCents) }} por unidade
                </BaseText>
              </BaseCard>
            </div>

            <BaseButton v-if="selectedPackage" variant="primary" color="primary"
              class="w-full mt-6 h-12 text-base gap-2" :loading="isPurchasing" @click="purchasePackage">
              <Icon name="solar:bag-check-bold-duotone" class="size-5" />
              Comprar via PIX
            </BaseButton>
          </template>
        </div>

        <!-- Right: History -->
        <div class="col-span-12 lg:col-span-5">
          <div class="sticky top-6">
            <BaseCard rounded="md" class="p-6">
              <BaseHeading as="h3" size="md" weight="bold" class="mb-4 flex items-center gap-2">
                <Icon name="solar:history-bold-duotone" class="size-5 text-primary-500" />
                Histórico de Compras
              </BaseHeading>

              <div v-if="!history.length" class="py-8 text-center text-muted-400">
                <Icon name="solar:inbox-line-bold-duotone" class="size-10 mb-2 opacity-40" />
                <BaseParagraph size="xs">Nenhuma compra realizada ainda.</BaseParagraph>
              </div>

              <div v-else class="space-y-3 max-h-[400px] overflow-y-auto">
                <div v-for="purchase in history" :key="purchase.id"
                  class="flex items-center justify-between p-3 rounded-lg bg-muted-50 dark:bg-muted-800/50">
                  <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg"
                      :class="purchase.resourceType === 'SMS' ? 'bg-primary-500/10' : 'bg-info-500/10'">
                      <Icon
                        :name="purchase.resourceType === 'SMS' ? 'solar:chat-round-dots-bold-duotone' : 'solar:letter-bold-duotone'"
                        class="size-4"
                        :class="purchase.resourceType === 'SMS' ? 'text-primary-500' : 'text-info-500'" />
                    </div>
                    <div>
                      <BaseText size="xs" weight="semibold" class="text-muted-800 dark:text-white">
                        {{ purchase.creditsAmount }} {{ purchase.resourceType }}
                      </BaseText>
                      <BaseText size="xs" class="text-muted-400 block">
                        {{ new Date(purchase.createdAt).toLocaleDateString('pt-BR') }}
                      </BaseText>
                    </div>
                  </div>
                  <div class="text-right">
                    <BaseText size="xs" weight="semibold">{{ formatCurrency(purchase.priceInCents) }}</BaseText>
                    <BaseText size="xs" class="block"
                      :class="purchase.status === 'COMPLETED' ? 'text-success-500' : 'text-yellow-500'">
                      {{ purchase.status === 'COMPLETED' ? 'Pago' : 'Pendente' }}
                    </BaseText>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>