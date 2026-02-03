<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

const { useCustomFetch } = useApi()
const route = useRoute()
const router = useRouter()
const toaster = useNuiToasts()

definePageMeta({
  title: 'Editar Cliente',
})

// States
const clientId = route.params.id as string
const client = ref<any>(null)
const loading = ref(true)
const saving = ref(false)

const form = ref({
  name: '',
  email: '',
  cpf: '',
  phone: '',
  whatsapp: '',
  birthDate: '',
  rg: '',
  address: '',
  addressNumber: '',
  addressComplement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  occupation: '',
  employer: '',
  bankName: '',
  bankAgency: '',
  bankAccount: '',
  pixKey: '',
  notes: '',
  isActive: true,
  tags: [] as string[],
})

// Fetch client data
async function fetchClient() {
  if (!clientId)
    return
  loading.value = true
  try {
    const { data: response } = await useCustomFetch<any>(`/clients/${clientId}`)

    // Unwrap the response if it has a data property (standard API wrapper)
    const clientData = response.data || response // Handle { data: ... } or raw object
    client.value = clientData

    // Fill form
    form.value = {
      name: clientData.name || '',
      email: clientData.email || '',
      cpf: clientData.cpfRaw || clientData.cpf || '',
      phone: clientData.phone || '',
      whatsapp: clientData.whatsapp || '',
      birthDate: clientData.birthDate ? clientData.birthDate.split('T')[0] : '',
      rg: clientData.rg || '',
      address: clientData.address || '',
      addressNumber: clientData.addressNumber || '',
      addressComplement: clientData.addressComplement || '',
      neighborhood: clientData.neighborhood || '',
      city: clientData.city || '',
      state: clientData.state || '',
      zipCode: clientData.zipCode || '',
      occupation: clientData.occupation || '',
      employer: clientData.employer || '',
      bankName: clientData.bankName || '',
      bankAgency: clientData.bankAgency || '',
      bankAccount: clientData.bankAccount || '',
      pixKey: clientData.pixKey || '',
      notes: clientData.notes || '',
      isActive: clientData.isActive,
      tags: clientData.tags || [],
    }
  }
  catch (error) {
    console.error('Erro ao buscar cliente:', error)
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível carregar os dados do cliente.',
      icon: 'ph:warning-circle-fill',
    })
  }
  finally {
    loading.value = false
  }
}

async function saveClient() {
  saving.value = true
  try {
    await useCustomFetch(`/clients/${clientId}`, {
      method: 'PUT',
      body: form.value,
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Cliente atualizado com sucesso!',
      icon: 'ph:check-box-fill',
    })

    router.push('/dashboard/clients')
  }
  catch (error: any) {
    console.error('Erro ao salvar cliente:', error)
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao salvar alterações.',
      icon: 'ph:warning-circle-fill',
    })
  }
  finally {
    saving.value = false
  }
}

onMounted(fetchClient)
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <TairoContentWrapper>
      <!-- Header -->
      <template #header>
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <BaseHeading as="h1" size="2xl" weight="medium" class="text-muted-800 dark:text-white">
              {{ client?.name || 'Editar Cliente' }}
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
              Gerencie as informações pessoais, fiscais e bancárias.
            </BaseParagraph>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <BaseButton variant="ghost" to="/dashboard/clients" class="w-full sm:w-auto justify-center">
              <Icon name="lucide:arrow-left" class="size-4" />
              <span>Voltar</span>
            </BaseButton>
            <BaseButton
              variant="primary" :loading="saving" class="w-full sm:w-auto justify-center shadow-lg shadow-primary-500/20"
              @click="saveClient"
            >
              <Icon name="lucide:save" class="size-4" />
              <span>Salvar Alterações</span>
            </BaseButton>
          </div>
        </div>
      </template>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <BaseSpinner size="lg" class="text-primary-500" />
      </div>

      <!-- Content -->
      <div v-else-if="client" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left Column: Profile & Stats -->
        <div class="lg:col-span-4 space-y-6">
          <!-- Profile Card -->
          <BaseCard rounded="lg" class="p-6 flex flex-col items-center text-center">
            <div class="relative mb-4">
              <BaseAvatar
                size="2xl" :text="form.name.charAt(0).toUpperCase()" rounded="full"
                class="bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400 ring-4 ring-white dark:ring-muted-900"
              />
              <div class="absolute bottom-0 right-0 p-1 bg-white dark:bg-muted-900 rounded-full">
                <Icon name="solar:shield-check-bold" class="size-6 text-emerald-500" />
              </div>
            </div>

            <BaseHeading as="h3" size="lg" weight="medium" class="text-muted-800 dark:text-white">
              {{ form.name }}
            </BaseHeading>
            <p class="text-sm font-mono text-muted-500 dark:text-muted-400 mt-1 mb-4">
              {{ form.cpf }}
            </p>

            <div class="w-full grid grid-cols-2 gap-4 border-t border-muted-200 dark:border-muted-800 pt-4 mt-2">
              <div class="flex flex-col">
                <span class="text-xs text-muted-500 uppercase font-medium">Status</span>
                <BaseTag
                  size="sm" :variant="form.isActive ? 'none' : 'muted'" rounded="full" class="mx-auto mt-1"
                  :class="form.isActive ? 'bg-emerald-500/10 text-emerald-600' : ''"
                >
                  {{ form.isActive ? 'Ativo' : 'Inativo' }}
                </BaseTag>
              </div>
              <div class="flex flex-col border-l border-muted-200 dark:border-muted-800">
                <span class="text-xs text-muted-500 uppercase font-medium">Cliente Desde</span>
                <span class="text-sm font-medium text-muted-800 dark:text-white mt-1">
                  {{ new Date(client.createdAt).getFullYear() }}
                </span>
              </div>
            </div>
          </BaseCard>

          <!-- Quick Actions / Stats -->
          <BaseCard rounded="lg" class="p-5 space-y-4">
            <div class="flex items-center justify-between pb-4 border-b border-muted-200 dark:border-muted-800">
              <div class="flex items-center gap-3">
                <div
                  class="flex items-center justify-center size-10 rounded-lg bg-orange-100 dark:bg-orange-500/10 text-orange-500"
                >
                  <Icon name="solar:document-text-bold-duotone" class="size-5" />
                </div>
                <div>
                  <p class="text-xs text-muted-500 font-medium uppercase">
                    Declarações
                  </p>
                  <p class="text-lg font-bold text-muted-800 dark:text-white leading-none">
                    {{ client.declarationsCount }}
                  </p>
                </div>
              </div>
              <BaseButton
                size="sm" rounded="full" variant="ghost"
                class="size-8 p-0 flex items-center justify-center hover:bg-muted-100 dark:hover:bg-muted-800"
              >
                <Icon name="lucide:arrow-right" class="size-4" />
              </BaseButton>
            </div>
            <BaseButton
              variant="primary" class="w-full shadow-lg shadow-primary-500/20"
              :to="{ path: '/dashboard/ir', query: { newFor: client.id } }"
            >
              <Icon name="solar:file-add-bold-duotone" class="size-4 mr-2" />
              Nova Declaração
            </BaseButton>
          </BaseCard>

          <!-- Contact Info Read-only Summary -->
          <BaseCard rounded="lg" class="p-5">
            <BaseHeading
              as="h4" size="sm" weight="medium"
              class="mb-4 text-muted-500 uppercase tracking-wider text-[11px]"
            >
              Contato Rápido
            </BaseHeading>
            <div class="space-y-3">
              <a
                v-if="form.email" :href="`mailto:${form.email}`"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted-50 dark:hover:bg-muted-800 transition-colors group"
              >
                <Icon name="lucide:mail" class="size-4 text-muted-400 group-hover:text-primary-500" />
                <span class="text-sm text-muted-600 dark:text-muted-300 truncate">{{ form.email }}</span>
              </a>
              <a
                v-if="form.whatsapp" :href="`https://wa.me/55${form.whatsapp.replace(/\D/g, '')}`" target="_blank"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted-50 dark:hover:bg-muted-800 transition-colors group"
              >
                <Icon name="logos:whatsapp-icon" class="size-4 opacity-80 group-hover:opacity-100" />
                <span class="text-sm text-muted-600 dark:text-muted-300">{{ form.whatsapp }}</span>
              </a>
              <a
                v-else-if="form.phone" :href="`tel:${form.phone}`"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted-50 dark:hover:bg-muted-800 transition-colors group"
              >
                <Icon name="lucide:phone" class="size-4 text-muted-400 group-hover:text-primary-500" />
                <span class="text-sm text-muted-600 dark:text-muted-300">{{ form.phone }}</span>
              </a>
            </div>
          </BaseCard>
        </div>

        <!-- Right Column: Form -->
        <div class="lg:col-span-8 space-y-6">
          <form class="space-y-6" @submit.prevent="saveClient">
            <!-- Personal Data -->
            <BaseCard rounded="lg" class="p-6 md:p-8">
              <div class="flex items-center gap-2 mb-6 border-b border-muted-200 dark:border-muted-800 pb-4">
                <Icon name="solar:user-id-bold-duotone" class="size-5 text-primary-500" />
                <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-white">
                  Dados Pessoais
                </BaseHeading>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BaseField label="Nome Completo" required>
                  <BaseInput v-model="form.name" icon="lucide:user" />
                </BaseField>
                <BaseField label="CPF" required>
                  <BaseInput
                    v-model="form.cpf" icon="lucide:fingerprint" disabled
                    class="opacity-70 bg-muted-50 dark:bg-muted-900"
                  />
                </BaseField>
                <BaseField label="Data de Nascimento">
                  <BaseInput v-model="form.birthDate" type="date" />
                </BaseField>
                <BaseField label="RG">
                  <BaseInput v-model="form.rg" icon="lucide:credit-card" />
                </BaseField>
                <BaseField label="E-mail">
                  <BaseInput v-model="form.email" type="email" icon="lucide:mail" />
                </BaseField>
                <BaseField label="WhatsApp / Celular">
                  <BaseInput v-model="form.whatsapp" icon="lucide:smartphone" />
                </BaseField>
              </div>
            </BaseCard>

            <!-- Address and Location -->
            <BaseCard rounded="lg" class="p-6 md:p-8">
              <div class="flex items-center gap-2 mb-6 border-b border-muted-200 dark:border-muted-800 pb-4">
                <Icon name="solar:map-point-bold-duotone" class="size-5 text-primary-500" />
                <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-white">
                  Endereço
                </BaseHeading>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div class="md:col-span-4">
                  <BaseField label="CEP">
                    <BaseInput v-model="form.zipCode" icon="lucide:map" />
                  </BaseField>
                </div>
                <div class="md:col-span-8">
                  <BaseField label="Cidade / UF">
                    <div class="flex gap-2">
                      <BaseInput v-model="form.city" class="flex-1" placeholder="Cidade" />
                      <BaseInput v-model="form.state" class="w-20" placeholder="UF" />
                    </div>
                  </BaseField>
                </div>
                <div class="md:col-span-8">
                  <BaseField label="Logradouro">
                    <BaseInput v-model="form.address" icon="lucide:home" />
                  </BaseField>
                </div>
                <div class="md:col-span-4">
                  <BaseField label="Número">
                    <BaseInput v-model="form.addressNumber" />
                  </BaseField>
                </div>
                <div class="md:col-span-6">
                  <BaseField label="Bairro">
                    <BaseInput v-model="form.neighborhood" />
                  </BaseField>
                </div>
                <div class="md:col-span-6">
                  <BaseField label="Complemento">
                    <BaseInput v-model="form.addressComplement" />
                  </BaseField>
                </div>
              </div>
            </BaseCard>

            <!-- Professional & Bank -->
            <BaseCard rounded="lg" class="p-6 md:p-8">
              <div class="flex items-center gap-2 mb-6 border-b border-muted-200 dark:border-muted-800 pb-4">
                <Icon name="solar:wallet-money-bold-duotone" class="size-5 text-primary-500" />
                <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-white">
                  Financeiro
                </BaseHeading>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BaseField label="Ocupação Principal">
                  <BaseInput v-model="form.occupation" icon="lucide:briefcase" />
                </BaseField>
                <BaseField label="Fonte Pagadora">
                  <BaseInput v-model="form.employer" icon="lucide:building" />
                </BaseField>
                <BaseField label="Chave PIX (Restituição)" class="md:col-span-2">
                  <BaseInput v-model="form.pixKey" icon="logos:pix" placeholder="CPF, Email, Telefone..." />
                  <p class="text-[11px] text-muted-400 mt-1">
                    Usada prioritariamente para informar a conta de
                    restituição.
                  </p>
                </BaseField>
                <div class="md:col-span-2">
                  <BaseField label="Dados Bancários (Opcional)">
                    <div class="grid grid-cols-3 gap-4">
                      <BaseInput v-model="form.bankName" placeholder="Banco" />
                      <BaseInput v-model="form.bankAgency" placeholder="Agência" />
                      <BaseInput v-model="form.bankAccount" placeholder="Conta" />
                    </div>
                  </BaseField>
                </div>
              </div>
            </BaseCard>

            <!-- Metadata -->
            <BaseCard rounded="lg" class="p-6 md:p-8">
              <div class="flex items-center gap-2 mb-6 border-b border-muted-200 dark:border-muted-800 pb-4">
                <Icon name="solar:notebook-linear" class="size-5 text-primary-500" />
                <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-white">
                  Anotações Internas
                </BaseHeading>
              </div>
              <BaseTextarea
                v-model="form.notes" rows="4" placeholder="Observações específicas sobre este cliente..."
                class="bg-muted-50/50 dark:bg-muted-900/50 focus:bg-white dark:focus:bg-muted-950"
              />
            </BaseCard>
          </form>
        </div>
      </div>
    </TairoContentWrapper>
  </div>
</template>
