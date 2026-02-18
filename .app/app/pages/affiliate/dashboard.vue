<script setup lang="ts">
import { useForm, Field } from 'vee-validate'
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'

definePageMeta({
  layout: 'affiliate',
  title: 'Dashboard Afiliado',
})

const { user } = useAuth()
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

const stats = ref<any>(null)
const referrals = ref<any[]>([])
const isLoading = ref(false)
const isWithdrawLoading = ref(false)

// PIX Form
const showPixModal = ref(false)
const pixSchema = toTypedSchema(z.object({
  pixKey: z.string().min(1, 'Chave PIX obrigatória'),
  pixKeyType: z.enum(['CPF', 'EMAIL', 'PHONE', 'RANDOM', 'CNPJ']),
}))

const { handleSubmit: handlePixSubmit, isSubmitting: isPixSubmitting, resetForm } = useForm({
  validationSchema: pixSchema,
  initialValues: {
    pixKeyType: 'CPF',
    pixKey: '',
  }
})

// Fetch Data
async function fetchData() {
  isLoading.value = true
  try {
    const [statsRes, referRes, profileRes] = await Promise.all([
      useCustomFetch('/affiliate/dashboard'),
      useCustomFetch('/affiliate/referrals'),
      useCustomFetch('/affiliate/profile')
    ])
    stats.value = { ...statsRes.data, ...profileRes.data }
    referrals.value = referRes.data

    // If we have stats, update PIX initial values
    if (statsRes.data?.pixKey) {
      resetForm({
        values: {
          pixKeyType: statsRes.data.pixKeyType || 'CPF',
          pixKey: statsRes.data.pixKey,
        }
      })
    }
  } catch (err) {
    console.error(err)
    toaster.add({ title: 'Erro ao carregar dados', color: 'danger' })
  } finally {
    isLoading.value = false
  }
}

// Update PIX
const onPixSubmit = handlePixSubmit(async (values) => {
  try {
    await useCustomFetch('/affiliate/pix', {
      method: 'PUT',
      body: values
    })
    toaster.add({
      title: 'Chave PIX atualizada!',
      color: 'success',
      icon: 'solar:check-circle-bold-duotone'
    } as any)
    showPixModal.value = false
    await fetchData()
  } catch (err) {
    toaster.add({
      title: 'Erro ao salvar PIX',
      color: 'danger',
      icon: 'solar:danger-bold-duotone'
    } as any)
  }
})

// Request Withdraw
async function requestWithdraw() {
  isWithdrawLoading.value = true
  try {
    await useCustomFetch('/affiliate/withdraw', { method: 'POST' })
    toaster.add({ title: 'Saque solicitado com sucesso!', color: 'success', icon: 'solar:check-circle-bold-duotone' } as any)
    await fetchData()
  } catch (err: any) {
    toaster.add({ title: 'Erro no saque', description: err.data?.message, color: 'danger', icon: 'solar:danger-bold-duotone' } as any)
  } finally {
    isWithdrawLoading.value = false
  }
}

function formatCurrency(val: any) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function copyToClipboard(text: string) {
  if (typeof window !== 'undefined' && window.navigator) {
    window.navigator.clipboard.writeText(text)
    toaster.add({
      title: 'Copiado!',
      description: 'O cupom foi copiado para a área de transferência.',
      color: 'success',
      icon: 'solar:check-circle-bold-duotone',
    } as any)
  }
}

onMounted(() => {
  fetchData()
})

const date = ref(new Date())
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="grid grid-cols-12 gap-4">
      <!-- Grid column: Left Stats & Main Content -->
      <div class="col-span-12 xl:col-span-9">
        <div class="grid grid-cols-12 gap-4">
          <!-- Welcome Card -->
          <div class="col-span-12">
            <div class="bg-primary-800 rounded-2xl px-6 py-8 flex items-center relative overflow-hidden shadow-xl">
              <div class="absolute inset-0 overflow-hidden pointer-events-none">
                <div class="absolute -right-35 -bottom-30 opacity-20 transform scale-x-[-1] z-0">
                  <img src="/img/favicon-white.png" class="size-96 object-contain" alt="">
                </div>
              </div>
              <div class="flex w-full flex-col items-center gap-y-6 sm:flex-row relative z-10">
                <div class="flex flex-1 flex-col gap-y-2 px-4">
                  <BaseAvatar src="https://cdn-icons-png.freepik.com/256/17613/17613012.png"
                    :text="user?.name?.charAt(0) || '?'" size="lg"
                    class="border-primary-200/50 ring-primary-200/50 ring-offset-primary-600 mb-2 border ring-2 ring-offset-4" />
                  <BaseHeading as="h2" size="2xl" weight="semibold" lead="none" class="text-white">
                    <span>Olá, {{ user?.name?.split(' ')[0] || 'Afiliado' }}! 👋</span>
                  </BaseHeading>
                  <BaseParagraph size="xs" class="text-primary-100 opacity-90 max-w-md">
                    Seja bem-vindo ao seu portal de parceiro. Acompanhe suas indicações e gerencie seus ganhos em tempo
                    real.
                  </BaseParagraph>
                </div>

                <div class="flex h-full flex-1 flex-col px-4 sm:px-6 border-white/10 sm:border-l">
                  <BaseHeading as="h2" size="lg" weight="semibold" lead="tight" class="mb-1 text-white">
                    <span>Link de Indicação</span>
                  </BaseHeading>
                  <BaseParagraph size="xs" lead="tight" class="mb-3 text-primary-200">
                    Use o cupom abaixo para indicar novos clientes e ganhar comissões.
                  </BaseParagraph>
                  <div class="mt-auto">
                    <div
                      class="bg-white/10 border border-white/20 rounded-lg px-4 py-2 flex items-center justify-between">
                      <span class="text-white font-mono font-bold tracking-wider">{{
                        'https://app.gestorirpf.com.br/auth/register?r=' + stats?.couponCode || 'GERANDO...'
                        }}</span>
                      <BaseButton size="sm" variant="ghost" color="white" class="!h-8"
                        @click="copyToClipboard('https://app.gestorirpf.com.br/auth/register?r=' + stats?.couponCode)">
                        <Icon name="solar:copy-bold-duotone" class="size-4" />
                      </BaseButton>
                    </div>
                  </div>
                </div>

                <div class="flex h-full flex-1 flex-col px-4 sm:px-6 border-white/10 sm:border-l">
                  <BaseHeading as="h2" size="lg" weight="semibold" lead="tight" class="mb-1 text-white">
                    <span>Ações Rápidas</span>
                  </BaseHeading>
                  <BaseParagraph size="xs" lead="tight" class="mb-3 text-primary-200">
                    Gerencie seu saldo e informações de pagamento.
                  </BaseParagraph>
                  <div class="mt-auto flex flex-col gap-2">
                    <BaseButton color="success" shadow="success" class="w-full"
                      :disabled="!stats?.balance || Number(stats.balance) < 50" :loading="isWithdrawLoading"
                      @click="requestWithdraw">
                      <Icon name="solar:wad-of-money-bold-duotone" class="mr-2 size-5" />
                      Solicitar Saque
                    </BaseButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Stat Tiles from Analytics -->
          <!-- Balance -->
          <div class="col-span-12 md:col-span-3">
            <BaseCard rounded="md" class="p-4 shadow-sm border-muted-200 dark:border-muted-800">
              <div class="mb-1 flex items-center justify-between">
                <BaseHeading as="h5" size="sm" weight="medium" lead="tight" class="text-muted-500 dark:text-muted-400">
                  <span>Saldo Disponível</span>
                </BaseHeading>
                <BaseIconBox size="xs"
                  class="bg-success-100 text-success-500 dark:bg-success-500/10 dark:text-success-400 dark:border-success-500/20 border"
                  rounded="full" variant="none">
                  <Icon name="solar:wallet-money-bold-duotone" class="size-5" />
                </BaseIconBox>
              </div>
              <div class="mb-2">
                <BaseHeading as="h4" size="2xl" weight="bold" lead="tight"
                  class="text-muted-900 dark:text-white tabular-nums">
                  <span>{{ formatCurrency(stats?.balance) }}</span>
                </BaseHeading>
              </div>
              <div class="text-muted-400 text-xs flex items-center gap-1">
                <Icon name="solar:info-circle-linear" class="size-3" />
                <span>Mínimo de R$ 50,00 para saque</span>
              </div>
            </BaseCard>
          </div>

          <!-- Total Earnings -->
          <div class="col-span-12 md:col-span-3">
            <BaseCard rounded="md" class="p-4 shadow-sm border-muted-200 dark:border-muted-800">
              <div class="mb-1 flex items-center justify-between">
                <BaseHeading as="h5" size="sm" weight="medium" lead="tight" class="text-muted-500 dark:text-muted-400">
                  <span>Ganhos Totais</span>
                </BaseHeading>
                <BaseIconBox size="xs"
                  class="bg-primary-100 text-primary-500 dark:bg-primary-500/10 dark:text-primary-400 dark:border-primary-500/20 border"
                  rounded="full" variant="none">
                  <Icon name="solar:chart-square-bold-duotone" class="size-5" />
                </BaseIconBox>
              </div>
              <div class="mb-2">
                <BaseHeading as="h4" size="2xl" weight="bold" lead="tight"
                  class="text-muted-900 dark:text-white tabular-nums">
                  <span>{{ formatCurrency(stats?.totalEarnings) }}</span>
                </BaseHeading>
              </div>
              <div class="text-success-500 flex items-center gap-1 font-sans text-xs">
                <Icon name="solar:course-up-bold-duotone" class="size-4" />
                <span>Acumulado desde o início</span>
              </div>
            </BaseCard>
          </div>

          <!-- Active Referrals -->
          <div class="col-span-12 md:col-span-3">
            <BaseCard rounded="md" class="p-4 shadow-sm border-muted-200 dark:border-muted-800">
              <div class="mb-1 flex items-center justify-between">
                <BaseHeading as="h5" size="sm" weight="medium" lead="tight" class="text-muted-500 dark:text-muted-400">
                  <span>Indicações Ativas</span>
                </BaseHeading>
                <BaseIconBox size="xs"
                  class="bg-info-100 text-info-500 dark:bg-info-500/10 dark:text-info-400 dark:border-info-500/20 border"
                  rounded="full" variant="none">
                  <Icon name="solar:users-group-two-rounded-bold-duotone" class="size-5" />
                </BaseIconBox>
              </div>
              <div class="mb-2">
                <BaseHeading as="h4" size="2xl" weight="bold" lead="tight"
                  class="text-muted-900 dark:text-white tabular-nums">
                  <span>{{ stats?.activeReferrals || 0 }}</span>
                </BaseHeading>
              </div>
              <div class="text-muted-400 text-xs">
                <span>Total de {{ stats?.totalReferrals || 0 }} cadastros</span>
              </div>
            </BaseCard>
          </div>

          <!-- Pending Commissions -->
          <div class="col-span-12 md:col-span-3">
            <BaseCard rounded="md" class="p-4 shadow-sm border-muted-200 dark:border-muted-800">
              <div class="mb-1 flex items-center justify-between">
                <BaseHeading as="h5" size="sm" weight="medium" lead="tight" class="text-muted-500 dark:text-muted-400">
                  <span>Em Processamento</span>
                </BaseHeading>
                <BaseIconBox size="xs"
                  class="bg-warning-100 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400 dark:border-warning-500/20 border"
                  rounded="full" variant="none">
                  <Icon name="solar:clock-circle-bold-duotone" class="size-5" />
                </BaseIconBox>
              </div>
              <div class="mb-2">
                <BaseHeading as="h4" size="2xl" weight="bold" lead="tight"
                  class="text-muted-900 dark:text-white tabular-nums">
                  <span>{{ formatCurrency(stats?.pendingCommissions) }}</span>
                </BaseHeading>
              </div>
              <div class="text-muted-400 text-xs">
                <span>Aguardando compensação</span>
              </div>
            </BaseCard>
          </div>

          <!-- Referrals Table (Inspired by Analytics dashboard table style) -->
          <div class="col-span-12">
            <BaseCard rounded="md" class="p-6 shadow-sm border-muted-200 dark:border-muted-800">
              <div class="mb-6 flex items-center justify-between">
                <BaseHeading as="h3" size="md" weight="medium" lead="tight" class="text-muted-900 dark:text-white">
                  <span>Indicações Recentes</span>
                </BaseHeading>
                <BaseTag size="sm" color="primary" variant="muted">{{ referrals.length }} Registros</BaseTag>
              </div>

              <div class="flex flex-col gap-4">
                <div v-if="referrals.length === 0" class="flex flex-col items-center py-12 text-center">
                  <div
                    class="size-16 rounded-full bg-muted-100 dark:bg-muted-800 flex items-center justify-center mb-4">
                    <Icon name="solar:user-plus-bold-duotone" class="size-8 text-muted-400" />
                  </div>
                  <BaseHeading as="h4" size="md" weight="medium">Nenhuma indicação ainda</BaseHeading>
                  <BaseParagraph size="sm" class="text-muted-500 max-w-xs mx-auto">
                    Compartilhe seu cupom para começar a ganhar comissões.
                  </BaseParagraph>
                </div>

                <div v-else class="overflow-x-auto min-h-[300px]">
                  <table class="w-full text-left">
                    <thead>
                      <tr
                        class="text-muted-400 font-sans text-xs uppercase tracking-wider border-b border-muted-200 dark:border-muted-800">
                        <th class="pb-4 font-semibold">Cliente</th>
                        <th class="pb-4 font-semibold">Data</th>
                        <th class="pb-4 font-semibold">Plano</th>
                        <th class="pb-4 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-muted-100 dark:divide-muted-800">
                      <tr v-for="ref in referrals" :key="ref.id"
                        class="group hover:bg-muted-50 dark:hover:bg-muted-900/40 transition-colors">
                        <td class="py-4">
                          <div class="flex items-center gap-3">
                            <BaseAvatar size="xs" :text="ref.user.charAt(0)"
                              class="bg-primary-500/10 text-primary-500" />
                            <span class="text-sm font-medium text-muted-800 dark:text-muted-100">{{ ref.user }}</span>
                          </div>
                        </td>
                        <td class="py-4 font-sans text-xs text-muted-500">
                          {{ new Date(ref.date).toLocaleDateString('pt-BR') }}
                        </td>
                        <td class="py-4 text-xs font-semibold text-muted-700 dark:text-muted-300">
                          {{ ref.plan }}
                        </td>
                        <td class="py-4 text-right">
                          <BaseTag :color="ref.subscriptionStatus === 'ACTIVE' ? 'success' : 'warning'" size="sm"
                            variant="muted" class="font-bold">
                            {{ ref.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Pendente' }}
                          </BaseTag>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </BaseCard>
          </div>
        </div>
      </div>

      <!-- Right Column: Settings & Info -->
      <div class="col-span-12 xl:col-span-3">
        <div class="flex flex-col gap-4 sticky top-24">
          <!-- PIX Configuration Card -->
          <BaseCard rounded="md"
            class="p-6 shadow-sm border-muted-200 dark:border-muted-800 bg-primary-100/30 dark:bg-primary-500/5">
            <div class="mb-4">
              <BaseIconBox size="md" class="bg-primary-500 text-white shadow-lg shadow-primary-500/20 mb-4" rounded="lg"
                variant="none">
                <Icon name="solar:settings-bold-duotone" class="size-6" />
              </BaseIconBox>
              <BaseHeading as="h3" size="md" weight="semibold" class="text-muted-900 dark:text-white mb-1">
                Dados de Recebimento
              </BaseHeading>
              <BaseParagraph size="xs" class="text-muted-500 leading-relaxed">
                Configure sua conta PIX para receber as comissões acumuladas.
              </BaseParagraph>
            </div>

            <div v-if="stats?.pixKey"
              class="mb-6 p-3 rounded-lg bg-white dark:bg-muted-800 border border-muted-200 dark:border-muted-700">
              <span class="text-[10px] uppercase font-bold text-muted-400 block mb-1">Chave Atual ({{ stats.pixKeyType
                }})</span>
              <p class="text-sm font-mono font-medium truncate text-muted-800 dark:text-muted-100">{{ stats.pixKey }}
              </p>
            </div>

            <div v-else
              class="mb-6 p-3 rounded-lg bg-warning-50 dark:bg-warning-500/5 border border-warning-200 dark:border-warning-500/20">
              <p class="text-[10px] font-bold text-warning-600 dark:text-warning-400">PIX NÃO CONFIGURADO</p>
            </div>

            <BaseButton class="w-full" variant="muted" color="primary" @click="showPixModal = true">
              <Icon name="solar:pen-new-square-bold-duotone" class="mr-2 size-4" />
              Editar Chave PIX
            </BaseButton>
          </BaseCard>

          <!-- Calendar / Info -->
          <BaseCard rounded="md" class="p-4 shadow-sm border-muted-200 dark:border-muted-800 overflow-hidden">
            <AddonDatepicker v-model="date" locale="pt-BR" />
          </BaseCard>

          <!-- Guidelines -->
          <BaseCard rounded="md" class="p-6 shadow-sm border-muted-200 dark:border-muted-800">
            <BaseHeading as="h4" size="sm" weight="bold" class="mb-3 uppercase tracking-wider text-muted-400">
              Regras do Programa
            </BaseHeading>
            <ul class="space-y-3">
              <li class="flex gap-3">
                <Icon name="solar:check-circle-bold" class="size-4 text-success-500 shrink-0" />
                <span class="text-xs text-muted-600 dark:text-muted-400">Comissão de 10% sobre o valor da primeira
                  assinatura.</span>
              </li>
              <li class="flex gap-3">
                <Icon name="solar:check-circle-bold" class="size-4 text-success-500 shrink-0" />
                <span class="text-xs text-muted-600 dark:text-muted-400">Pagamento somente para indicações via
                  PIX.</span>
              </li>
              <li class="flex gap-3">
                <Icon name="solar:check-circle-bold" class="size-4 text-success-500 shrink-0" />
                <span class="text-xs text-muted-600 dark:text-muted-400">O saque pode ser solicitado a partir de R$
                  50,00 acumulados.</span>
              </li>
              <li class="flex gap-3">
                <Icon name="solar:check-circle-bold" class="size-4 text-success-500 shrink-0" />
                <span class="text-xs text-muted-600 dark:text-muted-400">O processamento do saque ocorre em até 2 dias
                  úteis.</span>
              </li>
            </ul>
          </BaseCard>
        </div>
      </div>
    </div>

    <!-- PIX Modal using DialogRoot as requested -->
    <DialogRoot :open="showPixModal" @update:open="showPixModal = $event">
      <DialogPortal>
        <DialogOverlay class="bg-muted-900/60 fixed inset-0 z-[120] backdrop-blur-sm" />
        <DialogContent class="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-muted-950 shadow-2xl">
            <div class="px-6 py-4 border-b border-muted-100 dark:border-muted-800 flex items-center justify-between">
              <BaseHeading as="h3" size="lg" weight="semibold">Configurar PIX</BaseHeading>
              <button @click="showPixModal = false" class="text-muted-400 hover:text-muted-600 transition-colors">
                <Icon name="solar:close-circle-bold-duotone" class="size-6" />
              </button>
            </div>

            <form @submit="onPixSubmit" class="p-6 space-y-6">
              <BaseParagraph size="xs" class="text-muted-500">
                Escolha o tipo de chave e insira os dados corretamente para evitar erros no pagamento das suas
                comissões.
              </BaseParagraph>

              <div class="space-y-4">
                <div class="space-y-1">
                  <BaseParagraph size="xs" weight="medium" class="text-muted-700 dark:text-muted-300">
                    Tipo de Chave
                  </BaseParagraph>
                  <Field v-slot="{ field, handleChange }" name="pixKeyType">
                    <BaseListbox :model-value="field.value" @update:model-value="handleChange" :items="[
                      { label: 'CPF', value: 'CPF' },
                      { label: 'E-mail', value: 'EMAIL' },
                      { label: 'Telefone', value: 'PHONE' },
                      { label: 'Chave Aleatória', value: 'RANDOM' },
                      { label: 'CNPJ', value: 'CNPJ' }
                    ]" />
                  </Field>
                </div>

                <div class="space-y-1">
                  <BaseParagraph size="xs" weight="medium" class="text-muted-700 dark:text-muted-300">
                    Chave PIX
                  </BaseParagraph>
                  <Field v-slot="{ field, errorMessage, handleChange, handleBlur }" name="pixKey">
                    <BaseInput :model-value="field.value" @update:model-value="handleChange" @blur="handleBlur"
                      :error="errorMessage" placeholder="Digite sua chave aqui..." rounded="md" />
                  </Field>
                </div>
              </div>

              <div class="flex justify-end gap-3 pt-2">
                <BaseButton type="button" variant="ghost" @click="showPixModal = false">Cancelar</BaseButton>
                <BaseButton type="submit" color="primary" shadow="primary" :loading="isPixSubmitting">
                  Salvar Chave
                </BaseButton>
              </div>
            </form>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
