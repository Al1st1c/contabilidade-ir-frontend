<script setup lang="ts">
import { useApi } from '~/composables/useAuth'
import { useSubscription } from '~/composables/useSubscription'

definePageMeta({
  title: 'Configurações da Empresa',
})

const { useCustomFetch } = useApi()
const { fetchMySubscription, currentSubscription, loading: loadingSub } = useSubscription()
const { user } = useAuth()
const toaster = useNuiToasts()

const isOwner = computed(() => {
  const roleName = user.value?.role?.name?.toLowerCase()
  return roleName === 'master' || user.value?.isAdmin
})

const hasWhitelabel = computed(() => tenant.value?.allowWhitelabel === true)

// State
const isLoading = ref(true)
const isSaving = ref(false)
const tenant = ref<any>(null)

// Form
const form = ref({
  name: '',
  tradeName: '',
  document: '',
  email: '',
  phone: '',
  whatsapp: '',
  city: '',
  state: '',
  zipCode: '',
  pixKey: '',
})

// UF options
const states = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

// Masks
const cnpjMask = { mask: '##.###.###/####-##' }
const phoneMask = { mask: '(##) #####-####' }
const cepMask = { mask: '#####-###' }

// Helpers
const statusMap: Record<string, { label: string, color: string }> = {
  ACTIVE: { label: 'Ativo', color: 'text-success-500 bg-success-500/10' },
  TRIAL: { label: 'Período de Teste', color: 'text-primary-500 bg-primary-500/10' },
  PAST_DUE: { label: 'Atrasado', color: 'text-danger-500 bg-danger-500/10' },
  CANCELED: { label: 'Cancelado', color: 'text-muted-500 bg-muted-500/10' },
  EXPIRED: { label: 'Expirado', color: 'text-danger-500 bg-danger-500/10' },
}

function calculatePercentage(current: number | undefined, max: number | undefined) {
  if (!max || max <= 0) return 0
  const percent = ((current || 0) / max) * 100
  return Math.min(100, Math.max(0, percent))
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

// Fetch tenant data
async function fetchTenant() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant')
    const source = data.data || data
    if (source) {
      tenant.value = source
      form.value = {
        name: source.name || '',
        tradeName: source.tradeName || '',
        document: source.document || '',
        email: source.email || '',
        phone: source.phone || '',
        whatsapp: source.whatsapp || '',
        city: source.city || '',
        state: source.state || '',
        zipCode: source.zipCode || '',
        pixKey: source.pixKey || '',
      }
    }
  }
  catch (error) {
    console.error('Erro ao buscar dados da empresa:', error)
  }
  finally {
    isLoading.value = false
  }
}

// Save settings
async function saveSettings() {
  isSaving.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant', {
      method: 'PUT',
      body: form.value,
    })

    if (data.success || data) {
      toaster.add({
        title: 'Sucesso',
        description: 'Dados da empresa atualizados!',
        icon: 'solar:check-circle-linear',
      })
    }
  }
  catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao salvar dados',
      icon: 'solar:danger-circle-linear',
    })
  }
  finally {
    isSaving.value = false
  }
}

onMounted(() => {
  fetchTenant()
  fetchMySubscription()
})
</script>

<template>
  <div class="pb-24">
    <!-- Skeleton loading -->
    <AppPageLoading v-if="isLoading" message="Carregando dados da conta..." />

    <form v-else class="space-y-20" @submit.prevent="saveSettings">
      <!-- Section: Basic Info -->
      <div class="grid grid-cols-12 gap-8 lg:gap-12">
        <div class="col-span-12 lg:col-span-4">
          <div class="sticky top-24">
            <BaseHeading as="h3" size="lg" weight="medium" class="text-muted-800 dark:text-white mb-2">
              Dados Jurídicos
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
              Informações oficiais do seu CNPJ que serão utilizadas em documentos e faturamento.
            </BaseParagraph>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-8">
          <BaseCard rounded="lg" class="p-8">
            <div class="grid grid-cols-12 gap-6">
              <div class="col-span-12">
                <BaseField label="Razão Social" required>
                  <TairoInput v-model="form.name" :disabled="!isOwner"
                    placeholder="Ex: Contabilidade Silva & Associados" icon="solar:buildings-linear" />
                </BaseField>
              </div>
              <div class="col-span-12 md:col-span-6">
                <BaseField>
                  <template #label>
                    <div class="flex items-center gap-1.5">
                      <span>Nome Fantasia</span>
                      <span v-if="!hasWhitelabel" class="inline-flex items-center gap-1 text-xs text-amber-500"
                        title="Disponível no plano Whitelabel">
                        <Icon name="solar:lock-keyhole-linear" class="size-3.5" />
                        <span class="text-[11px]">Whitelabel</span>
                      </span>
                    </div>
                  </template>
                  <TairoInput v-model="form.tradeName" :disabled="!isOwner || !hasWhitelabel"
                    placeholder="Ex: Contábil Silva" icon="solar:shop-linear" />
                </BaseField>
              </div>
              <div class="col-span-12 md:col-span-6">
                <BaseField label="CNPJ">
                  <TairoInput v-model="form.document" v-maska="cnpjMask" :disabled="!isOwner"
                    placeholder="00.000.000/0000-00" icon="solar:document-text-linear" />
                </BaseField>
              </div>
              <div class="col-span-12 md:col-span-6">
                <BaseField label="Chave PIX (Vai aparecer para o cliente pagar os honorários)">
                  <TairoInput v-model="form.pixKey" :disabled="!isOwner" placeholder="E-mail, CPF/CNPJ ou Aleatória"
                    icon="solar:wallet-money-linear" />
                </BaseField>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- Section: Contact -->
      <div class="grid grid-cols-12 gap-8 lg:gap-12 border-t border-muted-200 dark:border-muted-800 pt-16">
        <div class="col-span-12 lg:col-span-4">
          <div class="sticky top-24">
            <BaseHeading as="h3" size="lg" weight="medium" class="text-muted-800 dark:text-white mb-2">
              Canais de Atendimento
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
              Como seus clientes entrarão em contato com o escritório. O WhatsApp será o canal principal de envio.
            </BaseParagraph>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-8">
          <BaseCard rounded="lg" class="p-8">
            <div class="grid grid-cols-12 gap-6">
              <div class="col-span-12">
                <BaseField label="E-mail de Contato">
                  <TairoInput v-model="form.email" type="email" :disabled="!isOwner"
                    placeholder="contato@escritorio.com.br" icon="solar:letter-linear" />
                </BaseField>
              </div>
              <div class="col-span-12 md:col-span-6">
                <BaseField label="WhatsApp (Oficial)">
                  <TairoInput v-model="form.whatsapp" v-maska="phoneMask" :disabled="!isOwner"
                    placeholder="(00) 00000-0000" icon="fa6-brands:whatsapp" />
                </BaseField>
              </div>
              <div class="col-span-12 md:col-span-6">
                <BaseField label="Telefone Fixo">
                  <TairoInput v-model="form.phone" v-maska="phoneMask" :disabled="!isOwner" placeholder="(00) 0000-0000"
                    icon="solar:phone-rounded-linear" />
                </BaseField>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- Section: Location -->
      <div class="grid grid-cols-12 gap-8 lg:gap-12 border-t border-muted-200 dark:border-muted-800 pt-16">
        <div class="col-span-12 lg:col-span-4">
          <div class="sticky top-24">
            <BaseHeading as="h3" size="lg" weight="medium" class="text-muted-800 dark:text-white mb-2">
              Localização
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
              Onde sua sede física está localizada.
            </BaseParagraph>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-8">
          <BaseCard rounded="lg" class="p-8">
            <div class="grid grid-cols-12 gap-6">
              <div class="col-span-12 md:col-span-8">
                <BaseField label="Cidade">
                  <TairoInput v-model="form.city" :disabled="!isOwner" placeholder="Ex: São Paulo"
                    icon="solar:map-point-linear" />
                </BaseField>
              </div>
              <div class="col-span-12 md:col-span-4">
                <BaseField label="Estado">
                  <TairoSelect v-model="form.state" :disabled="!isOwner" icon="solar:earth-linear">
                    <BaseSelectItem v-for="uf in states" :key="uf" :value="uf">
                      {{ uf }}
                    </BaseSelectItem>
                  </TairoSelect>
                </BaseField>
              </div>
              <div class="col-span-12 md:col-span-4">
                <BaseField label="CEP">
                  <TairoInput v-model="form.zipCode" v-maska="cepMask" :disabled="!isOwner" placeholder="00000-000"
                    icon="solar:streets-navigation-linear" />
                </BaseField>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>


      <!-- Action Footer -->
      <div v-if="isOwner"
        class="flex items-center justify-end gap-3 pt-8 mt-12 border-t border-muted-200 dark:border-muted-800">
        <BaseButton type="submit" color="primary" rounded="lg" size="lg" :loading="isSaving" class="px-12">
          Salvar Alterações
        </BaseButton>
      </div>
    </form>
  </div>
</template>
