<script setup lang="ts">
import { useApi } from '~/composables/useAuth'
import { useSubscription } from '~/composables/useSubscription'

definePageMeta({
  title: 'Créditos SMS & Email',
})

const router = useRouter()
const { useCustomFetch } = useApi()
const { user } = useAuth()
const toaster = useNuiToasts()
const { currentSubscription, fetchMySubscription } = useSubscription()

// Owner guard — only account owner can purchase credits
const isOwner = computed(() => {
  const roleName = user.value?.role?.name?.toLowerCase()
  return roleName === 'master' || user.value?.isAdmin
})

onBeforeMount(() => {
  if (user.value && !isOwner.value) {
    router.replace('/dashboard')
  }
})

const isLoading = ref(true)
const isPurchasing = ref(false)
const packages = ref<{ sms: any[]; email: any[] }>({ sms: [], email: [] })
const balance = ref<any>(null)
const history = ref<any[]>([])
const activeTab = ref<'sms' | 'email'>('sms')
const selectedPackage = ref<string | null>(null)
const pixResult = ref<any>(null)

onMounted(async () => {
  if (!isOwner.value) return
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

const smsAvailable = computed(() => balance.value?.sms?.available ?? 0)
const smsTotal = computed(() => (balance.value?.sms?.planLimit ?? 0) + (balance.value?.sms?.prepaid ?? 0))
const emailAvailable = computed(() => balance.value?.email?.available ?? 0)
const emailTotal = computed(() => (balance.value?.email?.planLimit ?? 0) + (balance.value?.email?.prepaid ?? 0))
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <AppPageLoading v-if="isLoading" min-height="60vh" message="Carregando..." />

    <div v-else class="mx-auto max-w-6xl">
      <!-- Header -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <NuxtLink to="/dashboard"
            class="text-muted-400 hover:text-primary-500 transition-colors flex items-center gap-1 mb-1 text-xs font-medium">
            <Icon name="solar:alt-arrow-left-linear" class="size-3" />
            Dashboard
          </NuxtLink>
          <BaseHeading as="h1" size="2xl" weight="bold" class="text-muted-800 dark:text-white">
            Créditos Pré-Pagos
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-400 mt-0.5">
            Compre pacotes avulsos de SMS e Email para campanhas.
          </BaseParagraph>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted-100 dark:bg-muted-800">
            <Icon name="solar:chat-round-dots-bold-duotone" class="size-3.5 text-primary-400" />
            <span class="text-muted-400 text-xs">SMS</span>
            <span class="font-bold text-muted-800 dark:text-white tabular-nums">{{ smsAvailable }}/{{ smsTotal }}</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted-100 dark:bg-muted-800">
            <Icon name="solar:letter-bold-duotone" class="size-3.5 text-info-400" />
            <span class="text-muted-400 text-xs">Email</span>
            <span class="font-bold text-muted-800 dark:text-white tabular-nums">{{ emailAvailable }}/{{ emailTotal
            }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-6">
        <!-- Left: Package Selection -->
        <div class="col-span-12 lg:col-span-7">
          <!-- PIX Result -->
          <BaseCard v-if="pixResult" rounded="md" class="p-6 text-center">
            <div class="flex flex-col items-center">
              <div class="size-12 rounded-full bg-success-500/10 flex items-center justify-center mb-3">
                <Icon name="solar:check-circle-bold-duotone" class="size-7 text-success-500" />
              </div>
              <BaseHeading as="h3" size="md" weight="semibold" class="text-muted-800 dark:text-white mb-1">
                PIX gerado
              </BaseHeading>
              <BaseParagraph size="xs" class="text-muted-400 mb-5">
                Escaneie o QR Code abaixo para concluir a compra de
                <strong class="text-muted-700 dark:text-muted-200">{{ pixResult.package?.label }}</strong>.
              </BaseParagraph>
            </div>

            <div class="max-w-[200px] mx-auto mb-5">
              <div class="bg-white p-3 rounded-lg border border-muted-200">
                <img v-if="pixResult.pix?.qrCodeImage" :src="pixResult.pix.qrCodeImage" alt="QR Code PIX"
                  class="w-full" />
              </div>
            </div>

            <div class="flex justify-center gap-2 mb-4">
              <BaseButton size="sm" variant="primary" color="primary" @click="copyPix" class="gap-1.5">
                <Icon name="solar:copy-bold-duotone" class="size-3.5" />
                Copiar código
              </BaseButton>
              <BaseButton size="sm" variant="muted" @click="resetPurchase" class="gap-1.5">
                <Icon name="solar:restart-bold-duotone" class="size-3.5" />
                Nova compra
              </BaseButton>
            </div>

            <BaseParagraph size="xs" class="text-muted-400 mt-4">
              Os créditos serão adicionados automaticamente após o pagamento.
            </BaseParagraph>
          </BaseCard>

          <!-- Packages -->
          <template v-else>
            <!-- Tab Switcher -->
            <div class="flex gap-1.5 mb-5 p-1 bg-muted-100 dark:bg-muted-800 rounded-lg w-fit">
              <button
                class="px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-md flex items-center gap-1.5"
                :class="activeTab === 'sms'
                  ? 'bg-white dark:bg-muted-700 text-primary-500 shadow-sm'
                  : 'text-muted-400 hover:text-muted-600'" @click="activeTab = 'sms'; selectedPackage = null">
                <Icon name="solar:chat-round-dots-bold-duotone" class="size-3.5" />
                SMS
              </button>
              <button
                class="px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-md flex items-center gap-1.5"
                :class="activeTab === 'email'
                  ? 'bg-white dark:bg-muted-700 text-info-500 shadow-sm'
                  : 'text-muted-400 hover:text-muted-600'" @click="activeTab = 'email'; selectedPackage = null">
                <Icon name="solar:letter-bold-duotone" class="size-3.5" />
                Email
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BaseCard v-for="pkg in currentPackages" :key="pkg.id" rounded="md"
                class="p-4 cursor-pointer transition-all duration-150 relative overflow-hidden" :class="{
                  'ring-2 ring-primary-500': selectedPackage === pkg.id,
                  'hover:ring-1 hover:ring-muted-300 dark:hover:ring-muted-600': selectedPackage !== pkg.id,
                }" @click="selectedPackage = pkg.id">

                <!-- Popular badge -->
                <div v-if="pkg.popular"
                  class="absolute -right-8 top-2.5 rotate-45 bg-primary-500 px-8 py-0.5 text-[8px] font-bold text-white uppercase">
                  Popular
                </div>

                <!-- Selection indicator -->
                <div class="absolute top-3 right-3">
                  <div v-if="selectedPackage === pkg.id"
                    class="size-5 rounded-full bg-primary-500 flex items-center justify-center">
                    <Icon name="lucide:check" class="size-3 text-white" />
                  </div>
                  <div v-else class="size-5 rounded-full border-2 border-muted-300 dark:border-muted-600" />
                </div>

                <BaseText size="sm" weight="semibold" class="text-muted-800 dark:text-white mb-0.5">
                  {{ pkg.label }}
                </BaseText>
                <div class="flex items-baseline gap-1.5 mb-2">
                  <BaseText size="lg" weight="bold" class="text-primary-500">
                    {{ formatCurrency(pkg.priceInCents) }}
                  </BaseText>
                </div>
                <BaseText size="xs" class="text-muted-400">
                  {{ formatCurrency(pkg.unitPriceCents) }}/unidade
                </BaseText>
              </BaseCard>
            </div>

            <BaseButton v-if="selectedPackage" variant="primary" color="primary"
              class="w-full mt-5 h-11 font-semibold gap-2" :loading="isPurchasing" @click="purchasePackage">
              <Icon name="solar:bag-check-bold-duotone" class="size-4" />
              Comprar via PIX
            </BaseButton>
          </template>
        </div>

        <!-- Right: History -->
        <div class="col-span-12 lg:col-span-5">
          <div class="sticky top-6">
            <BaseCard rounded="md" class="p-5">
              <div class="flex items-center justify-between mb-4">
                <BaseHeading as="h3" size="sm" weight="semibold" class="text-muted-800 dark:text-white">
                  Histórico
                </BaseHeading>
                <BaseText v-if="history.length" size="xs" class="text-muted-400">
                  {{ history.length }} compras
                </BaseText>
              </div>

              <div v-if="!history.length" class="py-10 text-center text-muted-400">
                <Icon name="solar:inbox-line-bold-duotone" class="size-8 mb-2 opacity-40 mx-auto" />
                <BaseParagraph size="xs">Nenhuma compra realizada.</BaseParagraph>
              </div>

              <div v-else class="space-y-2 max-h-[400px] overflow-y-auto">
                <div v-for="purchase in history" :key="purchase.id"
                  class="flex items-center justify-between p-2.5 rounded-lg bg-muted-50 dark:bg-muted-800/50">
                  <div class="flex items-center gap-2.5">
                    <div class="size-8 rounded-lg flex items-center justify-center"
                      :class="purchase.resourceType === 'SMS' ? 'bg-primary-500/10' : 'bg-info-500/10'">
                      <Icon
                        :name="purchase.resourceType === 'SMS' ? 'solar:chat-round-dots-bold-duotone' : 'solar:letter-bold-duotone'"
                        class="size-3.5"
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