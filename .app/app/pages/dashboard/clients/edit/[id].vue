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
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div>
            <BaseHeading as="h1" size="2xl" weight="medium" class="text-muted-800 dark:text-white">
              {{ client?.name || 'Editar Cliente' }}
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
              Gerencie as informações detalhadas, histórico e documentos deste cliente.
            </BaseParagraph>
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <BaseButton variant="muted" to="/dashboard/clients" class="w-full sm:w-auto justify-center rounded-lg">
              <Icon name="lucide:arrow-left" class="size-4 mr-1" />
              <span>Voltar</span>
            </BaseButton>
            <BaseButton variant="primary" :loading="saving"
              class="w-full sm:w-auto justify-center rounded-lg shadow-lg shadow-primary-500/20" @click="saveClient">
              <Icon name="lucide:save" class="size-4 mr-1" />
              <span>Salvar Alterações</span>
            </BaseButton>
          </div>
        </div>
      </template>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-4">
        <Icon name="svg-spinners:blocks-shuffle-3" class="size-8 text-primary-500" />
        <p class="text-xs text-muted-400 uppercase tracking-widest">Carregando dados</p>
      </div>

      <!-- Content -->
      <div v-else-if="client" class="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
        <!-- Left Column: Profile & Stats -->
        <div class="lg:col-span-4 space-y-8">
          <!-- Profile Card -->
          <BaseCard rounded="lg"
            class="p-8 flex flex-col items-center text-center border border-muted-200 dark:border-muted-800 shadow-sm">
            <div class="relative mb-6">
              <BaseAvatar size="2xl" :text="form.name.charAt(0).toUpperCase()" rounded="full"
                class="bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400 ring-8 ring-muted-50 dark:ring-muted-950 transition-all duration-300" />
              <div
                class="absolute -bottom-1 -right-1 p-1.5 bg-white dark:bg-muted-900 rounded-full shadow-lg border border-muted-100 dark:border-muted-800">
                <Icon name="solar:shield-check-bold" class="size-5 text-emerald-500" />
              </div>
            </div>

            <BaseHeading as="h3" size="lg" weight="medium" class="text-muted-800 dark:text-white leading-tight">
              {{ form.name }}
            </BaseHeading>
            <p class="text-xs font-mono text-muted-400 dark:text-muted-500 mt-2 tracking-widest">
              {{ form.cpf }}
            </p>

            <div class="w-full grid grid-cols-2 gap-4 border-t border-muted-100 dark:border-muted-800 pt-6 mt-6">
              <div class="flex flex-col gap-1 items-center">
                <span class="text-[10px] text-muted-400 uppercase tracking-wider font-medium">Status</span>
                <BaseTag size="sm" :variant="form.isActive ? 'none' : 'muted'" rounded="full"
                  class="font-medium text-[10px] px-3 transition-colors"
                  :class="form.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20' : ''">
                  {{ form.isActive ? 'Ativo' : 'Inativo' }}
                </BaseTag>
              </div>
              <div class="flex flex-col gap-1 items-center border-l border-muted-100 dark:border-muted-800 px-2">
                <span class="text-[10px] text-muted-400 uppercase tracking-wider font-medium">Desde</span>
                <span class="text-sm font-medium text-muted-800 dark:text-white">
                  {{ new Date(client.createdAt).getFullYear() }}
                </span>
              </div>
            </div>
          </BaseCard>

          <!-- Quick Actions / Stats -->
          <BaseCard rounded="lg" class="p-6 space-y-5 border border-muted-200 dark:border-muted-800 shadow-sm">
            <div class="flex items-center justify-between pb-4 border-b border-muted-100 dark:border-muted-800">
              <div class="flex items-center gap-4">
                <div
                  class="flex items-center justify-center size-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 ring-1 ring-orange-100 dark:ring-orange-500/20 shadow-inner">
                  <Icon name="solar:document-text-bold-duotone" class="size-6" />
                </div>
                <div>
                  <p class="text-[10px] text-muted-400 font-medium uppercase tracking-wider">
                    Declarações
                  </p>
                  <p class="text-2xl font-medium text-muted-800 dark:text-white leading-none mt-1">
                    {{ client.declarationsCount }}
                  </p>
                </div>
              </div>
            </div>

            <BaseButton variant="primary" class="w-full shadow-lg shadow-primary-500/20 py-3 rounded-xl"
              :to="{ path: '/dashboard/ir', query: { newFor: client.id } }">
              <Icon name="solar:file-add-bold-duotone" class="size-4 mr-2" />
              Nova Declaração
            </BaseButton>
          </BaseCard>

          <!-- Contact Info Read-only Summary -->
          <BaseCard rounded="lg" class="p-6 border border-muted-200 dark:border-muted-800 shadow-sm">
            <BaseHeading as="h4" size="sm" weight="medium"
              class="mb-6 text-muted-400 uppercase tracking-widest text-[10px] flex items-center gap-2">
              <span>Contato Rápido</span>
              <div class="h-px flex-1 bg-muted-100 dark:bg-muted-800" />
            </BaseHeading>

            <div class="space-y-2">
              <a v-if="form.email" :href="`mailto:${form.email}`"
                class="flex items-center gap-3 p-3 rounded-xl hover:bg-muted-50 dark:hover:bg-muted-900 transition-all group border border-transparent hover:border-muted-100 dark:hover:border-muted-800">
                <div
                  class="size-8 rounded-lg bg-muted-100 dark:bg-muted-800 flex items-center justify-center text-muted-400 group-hover:text-primary-500 group-hover:bg-primary-500/10 transition-colors">
                  <Icon name="lucide:mail" class="size-4" />
                </div>
                <span class="text-sm text-muted-600 dark:text-muted-300 truncate font-sans">{{ form.email }}</span>
              </a>

              <a v-if="form.whatsapp" :href="`https://wa.me/55${form.whatsapp.replace(/\D/g, '')}`" target="_blank"
                class="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all group border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900">
                <div
                  class="size-8 rounded-lg bg-muted-100 dark:bg-muted-800 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                  <Icon name="logos:whatsapp-icon"
                    class="size-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                </div>
                <span class="text-sm text-muted-600 dark:text-muted-300 font-sans">{{ form.whatsapp }}</span>
              </a>

              <a v-else-if="form.phone" :href="`tel:${form.phone}`"
                class="flex items-center gap-3 p-3 rounded-xl hover:bg-muted-50 dark:hover:bg-muted-900 transition-all group border border-transparent hover:border-muted-100 dark:hover:border-muted-800">
                <div
                  class="size-8 rounded-lg bg-muted-100 dark:bg-muted-800 flex items-center justify-center text-muted-400 group-hover:text-primary-500 group-hover:bg-primary-500/10 transition-colors">
                  <Icon name="lucide:phone" class="size-4" />
                </div>
                <span class="text-sm text-muted-600 dark:text-muted-300 font-sans">{{ form.phone }}</span>
              </a>
            </div>
          </BaseCard>
        </div>

        <!-- Right Column: Form -->
        <div class="lg:col-span-8 space-y-8 mt-2">
          <form class="space-y-8" @submit.prevent="saveClient">
            <!-- Personal Data -->
            <BaseCard rounded="lg"
              class="p-8 border border-muted-200 dark:border-muted-800 shadow-sm relative overflow-hidden">
              <div class="absolute top-0 right-0 p-4">
                <BaseTag variant="primary" size="sm" rounded="full" class="text-[10px] uppercase font-medium">Básico
                </BaseTag>
              </div>

              <div class="flex items-center gap-3 mb-8 border-b border-muted-100 dark:border-muted-800 pb-4">
                <div class="size-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                  <Icon name="solar:user-id-bold-duotone" class="size-5" />
                </div>
                <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-white">
                  Identificação do Cliente
                </BaseHeading>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                <BaseField label="Nome Completo" required>
                  <BaseInput v-model="form.name" icon="lucide:user" rounded="lg" />
                </BaseField>
                <BaseField label="CPF (Inalterável)" required>
                  <BaseInput v-model="form.cpf" icon="lucide:fingerprint" disabled
                    class="opacity-60 bg-muted-50 dark:bg-muted-950 cursor-not-allowed rounded-lg border-dashed" />
                </BaseField>
                <BaseField label="Data de Nascimento">
                  <BaseInput v-model="form.birthDate" type="date" icon="lucide:calendar" rounded="lg" />
                </BaseField>
                <BaseField label="RG / Cadastro Estadual">
                  <BaseInput v-model="form.rg" icon="lucide:credit-card" rounded="lg" />
                </BaseField>
                <BaseField label="E-mail Principal">
                  <BaseInput v-model="form.email" type="email" icon="lucide:mail" rounded="lg" />
                </BaseField>
                <BaseField label="WhatsApp">
                  <BaseInput v-model="form.whatsapp" icon="lucide:スマートフォン" rounded="lg" />
                </BaseField>
              </div>
            </BaseCard>

            <!-- Address and Location -->
            <BaseCard rounded="lg"
              class="p-8 border border-muted-200 dark:border-muted-800 shadow-sm relative overflow-hidden">
              <div class="absolute top-0 right-0 p-4">
                <BaseTag variant="none" size="sm" rounded="full"
                  class="text-[10px] uppercase font-medium bg-muted-100 dark:bg-muted-800">Endereço</BaseTag>
              </div>

              <div class="flex items-center gap-3 mb-8 border-b border-muted-100 dark:border-muted-800 pb-4">
                <div class="size-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                  <Icon name="solar:map-point-bold-duotone" class="size-5" />
                </div>
                <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-white">
                  Localização Residencial
                </BaseHeading>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-6">
                <div class="md:col-span-4">
                  <BaseField label="CEP">
                    <BaseInput v-model="form.zipCode" icon="lucide:map" rounded="lg" />
                  </BaseField>
                </div>
                <div class="md:col-span-8 text-right hidden md:block">
                  <BaseButton variant="ghost" size="sm" rounded="full"
                    class="text-primary-500 text-[11px] p-0 h-auto font-medium hover:underline">
                    Ver no Google Maps
                  </BaseButton>
                </div>

                <div class="md:col-span-8">
                  <BaseField label="Logradouro (Rua, Av, Pça)">
                    <BaseInput v-model="form.address" icon="lucide:home" rounded="lg" />
                  </BaseField>
                </div>
                <div class="md:col-span-4">
                  <BaseField label="Número">
                    <BaseInput v-model="form.addressNumber" rounded="lg" />
                  </BaseField>
                </div>

                <div class="md:col-span-6">
                  <BaseField label="Bairro">
                    <BaseInput v-model="form.neighborhood" rounded="lg" />
                  </BaseField>
                </div>
                <div class="md:col-span-6">
                  <BaseField label="Cidade / Estado">
                    <div class="flex gap-2">
                      <BaseInput v-model="form.city" class="flex-1" placeholder="Cidade" rounded="lg" />
                      <BaseInput v-model="form.state" class="w-20" placeholder="UF" rounded="lg" />
                    </div>
                  </BaseField>
                </div>
                <div class="md:col-span-12">
                  <BaseField label="Complemento">
                    <BaseInput v-model="form.addressComplement" placeholder="Apartamento, torre, bloco..."
                      rounded="lg" />
                  </BaseField>
                </div>
              </div>
            </BaseCard>

            <!-- Professional & Bank -->
            <BaseCard rounded="lg"
              class="p-8 border border-muted-200 dark:border-muted-800 shadow-sm relative overflow-hidden">
              <div class="absolute top-0 right-0 p-4">
                <BaseTag variant="none" size="sm" rounded="full"
                  class="text-[10px] uppercase font-medium bg-orange-500/10 text-orange-500">Fiscais</BaseTag>
              </div>

              <div class="flex items-center gap-3 mb-8 border-b border-muted-100 dark:border-muted-800 pb-4">
                <div class="size-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                  <Icon name="solar:wallet-money-bold-duotone" class="size-5" />
                </div>
                <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-white">
                  Informações Fiscais e Bancárias
                </BaseHeading>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                <BaseField label="Ocupação / Profissão">
                  <BaseInput v-model="form.occupation" icon="lucide:briefcase" rounded="lg" />
                </BaseField>
                <BaseField label="Principal Fonte Pagadora">
                  <BaseInput v-model="form.employer" icon="lucide:building" rounded="lg" />
                </BaseField>

                <div class="md:col-span-2">
                  <BaseField label="Conta de Restituição (PIX)">
                    <BaseInput v-model="form.pixKey" icon="logos:pix" placeholder="Escolha a chave para restituição..."
                      rounded="lg" />
                    <p class="text-[10px] text-muted-400 mt-2 flex items-center gap-1">
                      <Icon name="lucide:info" class="size-3" />
                      Esta informação é crucial para o envio da declaração de IR.
                    </p>
                  </BaseField>
                </div>

                <div class="md:col-span-2 mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <BaseField label="Banco">
                    <BaseInput v-model="form.bankName" placeholder="Banco" rounded="lg" />
                  </BaseField>
                  <BaseField label="Agência">
                    <BaseInput v-model="form.bankAgency" placeholder="0001" rounded="lg" />
                  </BaseField>
                  <BaseField label="C/C">
                    <BaseInput v-model="form.bankAccount" placeholder="00000-0" rounded="lg" />
                  </BaseField>
                </div>
              </div>
            </BaseCard>

            <!-- Metadata -->
            <BaseCard rounded="lg" class="p-8 border border-muted-200 dark:border-muted-800 shadow-sm">
              <div class="flex items-center gap-3 mb-6 border-b border-muted-100 dark:border-muted-800 pb-4">
                <div class="size-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                  <Icon name="solar:notebook-linear" class="size-5" />
                </div>
                <BaseHeading as="h3" size="md" weight="medium" class="text-muted-800 dark:text-white">
                  Notas do Contador
                </BaseHeading>
              </div>
              <BaseTextarea v-model="form.notes" rows="5"
                placeholder="Registre observações importantes ou orientações específicas para as próximas declarações..."
                class="bg-muted-50/50 dark:bg-muted-950/20 focus:bg-white dark:focus:bg-muted-950 border-muted-200 dark:border-muted-800 transition-all rounded-xl p-4" />
            </BaseCard>
          </form>
        </div>
      </div>
    </TairoContentWrapper>
  </div>
</template>
