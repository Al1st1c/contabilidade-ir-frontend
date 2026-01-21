<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Dados da Empresa',
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

// Brazilian states
const states = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

// Masks
const cnpjMask = ref(['99.999.999/9999-99'])
const phoneMask = ref(['(99) 99999-9999'])
const cepMask = ref(['99999-999'])

// Fetch tenant data
async function fetchTenant() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant')
    if (data.success) {
      tenant.value = data.data
      form.value = {
        name: data.data.name || '',
        tradeName: data.data.tradeName || '',
        document: data.data.document || '',
        email: data.data.email || '',
        phone: data.data.phone || '',
        whatsapp: data.data.whatsapp || '',
        city: data.data.city || '',
        state: data.data.state || '',
        zipCode: data.data.zipCode || '',
      }
    }
  } catch (error) {
    console.error('Erro ao buscar dados da empresa:', error)
  } finally {
    isLoading.value = false
  }
}

// Save settings
async function saveSettings() {
  isSaving.value = true
  try {
    const { data } = await useCustomFetch<any>('/tenant', {
      method: 'PUT',
      body: form.value
    })

    if (data.success) {
      tenant.value = { ...tenant.value, ...form.value }
      toaster.add({
        title: 'Sucesso',
        description: 'Dados da empresa atualizados!',
        icon: 'ph:check-circle-fill'
      })
    }
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao salvar dados',
      icon: 'ph:warning-circle-fill'
    })
  } finally {
    isSaving.value = false
  }
}

onMounted(fetchTenant)
</script>

<template>
  <div class="space-y-8">
    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-6">
      <BasePlaceload class="h-64 w-full rounded-xl" />
      <BasePlaceload class="h-64 w-full rounded-xl" />
    </div>

    <template v-else>
      <!-- Company Info Section -->
      <BaseCard rounded="lg" class="p-6">
        <div class="grid gap-8 md:grid-cols-12">
          <div class="md:col-span-4">
            <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-muted-100 mb-1">
              Dados Básicos
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400">
              Informações principais do seu escritório de contabilidade.
            </BaseParagraph>
          </div>

          <div class="md:col-span-8 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <BaseInputWrapper label="Razão Social">
                <BaseInput v-model="form.name" placeholder="Contabilidade Silva & Associados" />
              </BaseInputWrapper>

              <BaseInputWrapper label="Nome Fantasia">
                <BaseInput v-model="form.tradeName" placeholder="Contábil Silva" />
              </BaseInputWrapper>
            </div>

            <BaseInputWrapper label="CNPJ">
              <BaseInput v-model="form.document" v-maska="cnpjMask" placeholder="00.000.000/0000-00" icon="lucide:file-text" />
            </BaseInputWrapper>
          </div>
        </div>
      </BaseCard>

      <!-- Contact Section -->
      <BaseCard rounded="lg" class="p-6">
        <div class="grid gap-8 md:grid-cols-12">
          <div class="md:col-span-4">
            <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-muted-100 mb-1">
              Contato
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400">
              Informações de contato que serão exibidas para seus clientes.
            </BaseParagraph>
          </div>

          <div class="md:col-span-8 space-y-4">
            <BaseInputWrapper label="E-mail">
              <BaseInput v-model="form.email" type="email" placeholder="contato@escritorio.com.br" icon="lucide:mail" />
            </BaseInputWrapper>

            <div class="grid grid-cols-2 gap-4">
              <BaseInputWrapper label="Telefone">
                <BaseInput v-model="form.phone" v-maska="phoneMask" placeholder="(00) 00000-0000" icon="lucide:phone" />
              </BaseInputWrapper>

              <BaseInputWrapper label="WhatsApp">
                <BaseInput v-model="form.whatsapp" v-maska="phoneMask" placeholder="(00) 00000-0000" icon="lucide:message-circle" />
              </BaseInputWrapper>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Address Section -->
      <BaseCard rounded="lg" class="p-6">
        <div class="grid gap-8 md:grid-cols-12">
          <div class="md:col-span-4">
            <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-muted-100 mb-1">
              Localização
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400">
              Endereço do escritório.
            </BaseParagraph>
          </div>

          <div class="md:col-span-8 space-y-4">
            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-2">
                <BaseInputWrapper label="Cidade">
                  <BaseInput v-model="form.city" placeholder="São Paulo" icon="lucide:map-pin" />
                </BaseInputWrapper>
              </div>

              <BaseInputWrapper label="Estado">
                <BaseSelect v-model="form.state">
                  <option value="" disabled>UF</option>
                  <option v-for="uf in states" :key="uf" :value="uf">{{ uf }}</option>
                </BaseSelect>
              </BaseInputWrapper>
            </div>

            <BaseInputWrapper label="CEP">
              <BaseInput v-model="form.zipCode" v-maska="cepMask" placeholder="00000-000" icon="lucide:map" class="max-w-xs" />
            </BaseInputWrapper>
          </div>
        </div>
      </BaseCard>

      <!-- Plan Info (Read Only) -->
      <BaseCard rounded="lg" class="p-6 bg-muted-50/50 dark:bg-muted-900/50">
        <div class="grid gap-8 md:grid-cols-12">
          <div class="md:col-span-4">
            <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-muted-100 mb-1">
              Plano Atual
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400">
              Informações sobre seu plano de assinatura.
            </BaseParagraph>
          </div>

          <div class="md:col-span-8">
            <div class="flex items-center gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium text-muted-800 dark:text-muted-100 uppercase">
                    {{ tenant?.plan || 'Trial' }}
                  </span>
                  <span v-if="tenant?.plan === 'trial'" class="px-2 py-0.5 text-xs rounded bg-amber-500/10 text-amber-600">
                    Período de Teste
                  </span>
                </div>
                <BaseParagraph v-if="tenant?.trialEndsAt" size="xs" class="text-muted-500">
                  Expira em: {{ new Date(tenant.trialEndsAt).toLocaleDateString('pt-BR') }}
                </BaseParagraph>
              </div>
              <BaseButton size="sm" variant="primary">
                <Icon name="lucide:crown" class="size-4 mr-2" />
                Upgrade
              </BaseButton>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-muted-200 dark:border-muted-800">
              <div>
                <BaseParagraph size="xs" class="text-muted-400 mb-1">Usuários</BaseParagraph>
                <BaseHeading as="h4" size="lg" weight="medium">{{ tenant?._count?.users || 0 }}</BaseHeading>
              </div>
              <div>
                <BaseParagraph size="xs" class="text-muted-400 mb-1">Clientes</BaseParagraph>
                <BaseHeading as="h4" size="lg" weight="medium">{{ tenant?._count?.clients || 0 }}</BaseHeading>
              </div>
              <div>
                <BaseParagraph size="xs" class="text-muted-400 mb-1">Declarações</BaseParagraph>
                <BaseHeading as="h4" size="lg" weight="medium">{{ tenant?._count?.taxDeclarations || 0 }}</BaseHeading>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Save Button -->
      <div class="flex justify-end">
        <BaseButton variant="primary" size="lg" :loading="isSaving" @click="saveSettings">
          <Icon name="lucide:save" class="size-4 mr-2" />
          Salvar Alterações
        </BaseButton>
      </div>
    </template>
  </div>
</template>
