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
  tags: [] as string[]
})

// Fetch client data
const fetchClient = async () => {
  if (!clientId) return
  loading.value = true
  try {
    const { data } = await useCustomFetch<any>(`/clients/${clientId}`)
    client.value = data

    // Fill form
    form.value = {
      name: data.name || '',
      email: data.email || '',
      cpf: data.cpfRaw || data.cpf || '',
      phone: data.phone || '',
      whatsapp: data.whatsapp || '',
      birthDate: data.birthDate ? data.birthDate.split('T')[0] : '',
      rg: data.rg || '',
      address: data.address || '',
      addressNumber: data.addressNumber || '',
      addressComplement: data.addressComplement || '',
      neighborhood: data.neighborhood || '',
      city: data.city || '',
      state: data.state || '',
      zipCode: data.zipCode || '',
      occupation: data.occupation || '',
      employer: data.employer || '',
      bankName: data.bankName || '',
      bankAgency: data.bankAgency || '',
      bankAccount: data.bankAccount || '',
      pixKey: data.pixKey || '',
      notes: data.notes || '',
      isActive: data.isActive,
      tags: data.tags || []
    }
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível carregar os dados do cliente.',
      icon: 'ph:warning-circle-fill',
    })
  } finally {
    loading.value = false
  }
}

const saveClient = async () => {
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
  } catch (error: any) {
    console.error('Erro ao salvar cliente:', error)
    toaster.add({
      title: 'Erro',
      description: error.data?.message || 'Erro ao salvar alterações.',
      icon: 'ph:warning-circle-fill',
    })
  } finally {
    saving.value = false
  }
}

onMounted(fetchClient)
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20 max-w-5xl mx-auto">
    <div v-if="loading" class="flex items-center justify-center py-20">
      <BaseSpinner size="lg" />
    </div>

    <div v-else-if="client" class="space-y-8">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <BaseHeading as="h1" size="2xl" weight="medium">
            Editar Cliente
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500">
            Atualize as informações de {{ client.name }}
          </BaseParagraph>
        </div>
        <BaseButton variant="ghost" to="/dashboard/clients" class="flex items-center gap-2">
          <Icon name="lucide:arrow-left" class="size-4" />
          <span>Voltar</span>
        </BaseButton>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Sidebar: Basic Status -->
        <div class="lg:col-span-1 space-y-6">
          <BaseCard rounded="lg" class="p-6 text-center">
            <BaseAvatar size="2xl" :text="form.name.charAt(0).toUpperCase()" rounded="full"
              class="mx-auto mb-4 bg-primary-500/10 text-primary-600" />
            <BaseHeading as="h3" size="lg" weight="medium">{{ form.name }}</BaseHeading>
            <BaseParagraph size="xs" class="text-muted-400 mt-1">CPF: {{ client.cpf }}</BaseParagraph>

            <div class="mt-6 flex flex-col gap-2">
              <BaseTag size="sm" :variant="form.isActive ? 'primary' : 'muted'" rounded="full"
                class="w-full justify-center">
                {{ form.isActive ? 'Cadastro Ativo' : 'Cadastro Inativo' }}
              </BaseTag>
            </div>
          </BaseCard>

          <BaseCard rounded="lg" class="p-6">
            <BaseHeading as="h4" size="sm" weight="medium"
              class="mb-4 text-muted-500 uppercase tracking-wider text-[10px]">
              Resumo de Atividade
            </BaseHeading>
            <div class="space-y-4">
              <div class="flex justify-between items-center text-sm">
                <span class="text-muted-400">Declarações</span>
                <span class="font-bold text-muted-800 dark:text-muted-100">{{ client.declarationsCount }}</span>
              </div>
              <div class="flex justify-between items-center text-sm">
                <span class="text-muted-400">Membro desde</span>
                <span class="text-muted-800 dark:text-muted-100">{{ new
                  Date(client.createdAt).toLocaleDateString('pt-BR') }}</span>
              </div>
            </div>
          </BaseCard>
        </div>

        <!-- Main Form -->
        <div class="lg:col-span-2 space-y-6">
          <BaseCard rounded="lg" class="p-8">
            <form @submit.prevent="saveClient" class="space-y-10">
              <!-- Section: Personal -->
              <div class="space-y-5">
                <div class="flex items-center gap-2 border-b border-muted-100 dark:border-muted-800 pb-2">
                  <Icon name="lucide:user" class="size-4 text-primary-500" />
                  <BaseHeading as="h4" size="sm" weight="medium">Informações Pessoais</BaseHeading>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <BaseField label="Nome Completo">
                    <BaseInput v-model="form.name" />
                  </BaseField>
                  <BaseField label="CPF (Fixo)">
                    <BaseInput v-model="form.cpf" disabled class="bg-muted-50 dark:bg-muted-800/50" />
                  </BaseField>
                  <BaseField label="E-mail">
                    <BaseInput v-model="form.email" type="email" />
                  </BaseField>
                  <BaseField label="Data de Nascimento">
                    <BaseInput v-model="form.birthDate" type="date" />
                  </BaseField>
                  <BaseField label="WhatsApp">
                    <BaseInput v-model="form.whatsapp" />
                  </BaseField>
                  <BaseField label="RG">
                    <BaseInput v-model="form.rg" />
                  </BaseField>
                </div>
              </div>

              <!-- Section: Address -->
              <div class="space-y-5">
                <div class="flex items-center gap-2 border-b border-muted-100 dark:border-muted-800 pb-2">
                  <Icon name="lucide:map-pin" class="size-4 text-primary-500" />
                  <BaseHeading as="h4" size="sm" weight="medium">Localização</BaseHeading>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <BaseField label="CEP">
                    <BaseInput v-model="form.zipCode" />
                  </BaseField>
                  <BaseField label="Endereço" class="md:col-span-2">
                    <BaseInput v-model="form.address" />
                  </BaseField>
                  <BaseField label="Número">
                    <BaseInput v-model="form.addressNumber" />
                  </BaseField>
                  <BaseField label="Cidade">
                    <BaseInput v-model="form.city" />
                  </BaseField>
                  <BaseField label="Bairro">
                    <BaseInput v-model="form.neighborhood" />
                  </BaseField>
                </div>
              </div>

              <!-- Section: Professional / Bank -->
              <div class="space-y-5">
                <div class="flex items-center gap-2 border-b border-muted-100 dark:border-muted-800 pb-2">
                  <Icon name="lucide:briefcase" class="size-4 text-primary-500" />
                  <BaseHeading as="h4" size="sm" weight="medium">Trabalho e Banco</BaseHeading>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <BaseField label="Ocupação">
                    <BaseInput v-model="form.occupation" />
                  </BaseField>
                  <BaseField label="PIX / Restituição">
                    <BaseInput v-model="form.pixKey" />
                  </BaseField>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-3 pt-6 border-t border-muted-200 dark:border-muted-800">
                <BaseButton type="button" variant="ghost" to="/dashboard/clients">Cancelar</BaseButton>
                <BaseButton type="submit" variant="primary" :loading="saving" :disabled="saving">
                  Salvar Alterações
                </BaseButton>
              </div>
            </form>
          </BaseCard>
        </div>
      </div>
    </div>
  </div>
</template>
