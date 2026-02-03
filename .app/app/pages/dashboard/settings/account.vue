<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Configurações da Empresa',
})

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

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
})

// UF options
const states = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]

// Masks
const cnpjMask = { mask: '##.###.###/####-##' }
const phoneMask = { mask: '(##) #####-####' }
const cepMask = { mask: '#####-###' }

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
      description: error.data?.message || 'Erro ao salvar dados',
      icon: 'solar:danger-circle-linear',
    })
  }
  finally {
    isSaving.value = false
  }
}

onMounted(fetchTenant)
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
                  <TairoInput
                    v-model="form.name" placeholder="Ex: Contabilidade Silva & Associados"
                    icon="solar:buildings-linear"
                  />
                </BaseField>
              </div>
              <div class="col-span-12 md:col-span-6">
                <BaseField label="Nome Fantasia">
                  <TairoInput v-model="form.tradeName" placeholder="Ex: Contábil Silva" icon="solar:shop-linear" />
                </BaseField>
              </div>
              <div class="col-span-12 md:col-span-6">
                <BaseField label="CNPJ">
                  <TairoInput
                    v-model="form.document" v-maska="cnpjMask" placeholder="00.000.000/0000-00"
                    icon="solar:document-text-linear"
                  />
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
                  <TairoInput
                    v-model="form.email" type="email" placeholder="contato@escritorio.com.br"
                    icon="solar:letter-linear"
                  />
                </BaseField>
              </div>
              <div class="col-span-12 md:col-span-6">
                <BaseField label="WhatsApp (Oficial)">
                  <TairoInput
                    v-model="form.whatsapp" v-maska="phoneMask" placeholder="(00) 00000-0000"
                    icon="fa6-brands:whatsapp"
                  />
                </BaseField>
              </div>
              <div class="col-span-12 md:col-span-6">
                <BaseField label="Telefone Fixo">
                  <TairoInput
                    v-model="form.phone" v-maska="phoneMask" placeholder="(00) 0000-0000"
                    icon="solar:phone-rounded-linear"
                  />
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
                  <TairoInput v-model="form.city" placeholder="Ex: São Paulo" icon="solar:map-point-linear" />
                </BaseField>
              </div>
              <div class="col-span-12 md:col-span-4">
                <BaseField label="Estado">
                  <TairoSelect v-model="form.state" icon="solar:earth-linear">
                    <BaseSelectItem v-for="uf in states" :key="uf" :value="uf">
                      {{ uf }}
                    </BaseSelectItem>
                  </TairoSelect>
                </BaseField>
              </div>
              <div class="col-span-12 md:col-span-4">
                <BaseField label="CEP">
                  <TairoInput
                    v-model="form.zipCode" v-maska="cepMask" placeholder="00000-000"
                    icon="solar:streets-navigation-linear"
                  />
                </BaseField>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- Section: Plan (Info Only) -->
      <div class="grid grid-cols-12 gap-8 lg:gap-12 border-t border-muted-200 dark:border-muted-800 pt-16">
        <div class="col-span-12 lg:col-span-4">
          <BaseHeading as="h3" size="lg" weight="medium" class="text-muted-800 dark:text-white mb-2">
            Plano e Assinatura
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
            Gerencie seu plano atual e acompanhe seus limites de uso.
          </BaseParagraph>
        </div>
        <div class="col-span-12 lg:col-span-8">
          <BaseCard rounded="lg" class="p-8 bg-muted-50/50 dark:bg-muted-900 border-dashed">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div class="flex items-center gap-3 mb-1">
                  <BaseTag variant="none" rounded="lg" class="bg-primary-500/20 text-primary-500 font-bold uppercase">
                    {{ tenant?.plan || 'Free Trial' }}
                  </BaseTag>
                  <span class="text-xs text-muted-400 font-medium">Desde {{ new
                    Date(tenant?.createdAt).toLocaleDateString() }}</span>
                </div>
                <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-400">
                  Seu escritório tem acesso total às funcionalidades até o limite de contratado.
                </BaseParagraph>
              </div>
              <BaseButton
                variant="none"
                class="bg-primary-500/20 text-primary-500 hover:bg-primary-500/30 transition-colors"
              >
                Alterar Plano
              </BaseButton>
            </div>

            <div class="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-muted-200 dark:border-muted-800">
              <div class="text-center">
                <div class="text-xl font-bold text-muted-800 dark:text-white">
                  {{ tenant?._count?.users || 0 }}
                </div>
                <div class="text-[10px] uppercase text-muted-400 font-semibold">
                  Usuários
                </div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold text-muted-800 dark:text-white">
                  {{ tenant?._count?.clients || 0 }}
                </div>
                <div class="text-[10px] uppercase text-muted-400 font-semibold">
                  Clientes
                </div>
              </div>
              <div class="text-center">
                <div class="text-xl font-bold text-muted-800 dark:text-white">
                  {{ tenant?._count?.taxDeclarations || 0 }}
                </div>
                <div class="text-[10px] uppercase text-muted-400 font-semibold">
                  Declarações
                </div>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="flex items-center justify-end gap-3 pt-8 mt-12 border-t border-muted-200 dark:border-muted-800">
        <BaseButton type="submit" color="primary" rounded="lg" size="lg" :loading="isSaving" class="px-12">
          Salvar Alterações
        </BaseButton>
      </div>
    </form>
  </div>
</template>
