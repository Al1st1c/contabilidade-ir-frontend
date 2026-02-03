<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Cadastro de Cliente',
})

// Composables
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()
const router = useRouter()

// Form State
const step = ref(1)
const isLoadingCpf = ref(false)
const isSaving = ref(false)
const cpfConsulted = ref(false)

const form = ref({
  name: '',
  cpf: '',
  birthDate: '',
  email: '',
  phone: '',
  whatsapp: '',
  rg: '',
  // Endereço
  address: '',
  addressNumber: '',
  addressComplement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  // Profissional
  occupation: '',
  employer: '',
  // Bancário
  bankName: '',
  bankAgency: '',
  bankAccount: '',
  pixKey: '',
  // Outros
  notes: '',
  tags: [] as string[],
})

const masks = ref(['999.999.999-99'])

// Methods
async function consultCpf() {
  if (!form.value.cpf.replace(/\D/g, '')) {
    toaster.add({
      title: 'Atenção',
      description: 'Digite um CPF para consultar',
      icon: 'ph:warning-circle-fill',
    })
    return
  }

  isLoadingCpf.value = true
  try {
    const { data } = await useCustomFetch<any>('/clients/consult-cpf', {
      method: 'POST',
      body: { cpf: form.value.cpf },
    })

    if (data.alreadyExists) {
      toaster.add({
        title: 'CPF já cadastrado',
        description: data.message,
        icon: 'ph:warning-circle-fill',
        duration: 5000,
      })
      return
    }

    if (data.success && data.data) {
      form.value.name = data.data.name || ''
      form.value.birthDate = data.data.birthDate || ''
      form.value.phone = data.data.phone || ''
      cpfConsulted.value = true

      toaster.add({
        title: 'Dados encontrados',
        description: `Informações de ${data.data.name} carregadas.`,
        icon: 'ph:check-box-fill',
      })

      step.value = 2
    }
    else {
      toaster.add({
        title: 'Não encontrado',
        description: 'Não encontramos dados para este CPF. Preencha manualmente.',
        icon: 'ph:info-fill',
      })
      step.value = 2
    }
  }
  catch (error) {
    console.error('Erro na consulta:', error)
    step.value = 2
  }
  finally {
    isLoadingCpf.value = false
  }
}

async function saveClient() {
  isSaving.value = true
  try {
    const { data } = await useCustomFetch<any>('/clients', {
      method: 'POST',
      body: form.value,
    })

    if (data.success) {
      toaster.add({
        title: 'Sucesso!',
        description: 'Cliente cadastrado com sucesso.',
        icon: 'ph:check-circle-fill',
      })
      router.push('/dashboard/clients')
    }
  }
  catch (error: any) {
    toaster.add({
      title: 'Erro ao salvar',
      description: error.data?.message || 'Verifique os dados e tente novamente.',
      icon: 'ph:warning-circle-fill',
    })
  }
  finally {
    isSaving.value = false
  }
}

function nextStep() {
  step.value++
}

function prevStep() {
  step.value--
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <BaseHeading as="h1" size="2xl" weight="medium">
        Novo Cliente
      </BaseHeading>
      <BaseParagraph size="sm" class="text-muted-500">
        Cadastre um novo cliente para gestão de IR
      </BaseParagraph>
    </div>

    <!-- Multi-step Form -->
    <BaseCard rounded="lg" class="p-6 md:p-10 shadow-sm overflow-hidden">
      <!-- Steps Indicator -->
      <div class="flex items-center justify-between mb-10 relative">
        <div class="absolute top-1/2 left-0 w-full h-0.5 bg-muted-200 dark:bg-muted-800 -translate-y-1/2 z-0" />
        <div
          v-for="i in 4" :key="i"
          class="relative z-10 size-10 rounded-full flex items-center justify-center border-4 border-white dark:border-muted-900 transition-colors duration-300"
          :class="step >= i ? 'bg-primary-500 text-white' : 'bg-muted-200 dark:bg-muted-800 text-muted-400'"
        >
          <span class="text-xs font-bold">{{ i }}</span>
        </div>
      </div>

      <!-- Step 1: CPF / Busca -->
      <div v-if="step === 1" class="space-y-6">
        <div class="flex flex-col md:flex-row items-center gap-10">
          <div class="flex-1 space-y-4">
            <BaseHeading as="h2" size="xl" weight="medium" class="text-muted-800 dark:text-muted-100">
              Comece pelo CPF
            </BaseHeading>
            <BaseParagraph class="text-muted-500">
              Nosso sistema busca automaticamente o nome e data de nascimento do cliente direto na Receita Federal para
              facilitar seu trabalho.
            </BaseParagraph>

            <BaseField label="CPF do Cliente">
              <BaseInput
                v-model="form.cpf" placeholder="000.000.000-00" :masks="masks" size="lg"
                @keyup.enter="consultCpf"
              />
            </BaseField>

            <div class="flex gap-3">
              <BaseButton variant="primary" size="lg" class="flex-1" :loading="isLoadingCpf" @click="consultCpf">
                {{ isLoadingCpf ? 'Consultando...' : 'Consultar e Iniciar' }}
              </BaseButton>
              <BaseButton variant="ghost" @click="nextStep">
                Pular busca
              </BaseButton>
            </div>
          </div>
          <div class="hidden md:block w-72">
            <img src="/img/illustrations/placeholders/flat/placeholder-search-1.svg" alt="Busca" class="w-full">
          </div>
        </div>
      </div>

      <!-- Step 2: Dados Pessoais -->
      <div v-if="step === 2" class="space-y-6">
        <BaseHeading as="h2" size="xl" weight="medium">
          Dados Pessoais
        </BaseHeading>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BaseField label="Nome Completo">
            <BaseInput v-model="form.name" placeholder="Nome do cliente" />
          </BaseField>
          <BaseField label="Data de Nascimento">
            <BaseInput v-model="form.birthDate" type="date" />
          </BaseField>
          <BaseField label="Email">
            <BaseInput v-model="form.email" type="email" placeholder="email@exemplo.com" />
          </BaseField>
          <BaseField label="Telefone / WhatsApp">
            <BaseInput v-model="form.phone" placeholder="(11) 99999-9999" />
          </BaseField>
        </div>
        <div class="flex justify-between pt-6 border-t border-muted-200 dark:border-muted-800">
          <BaseButton variant="ghost" @click="prevStep">
            Voltar
          </BaseButton>
          <BaseButton variant="primary" @click="nextStep">
            Continuar
          </BaseButton>
        </div>
      </div>

      <!-- Step 3: Endereço -->
      <div v-if="step === 3" class="space-y-6">
        <BaseHeading as="h2" size="xl" weight="medium">
          Endereço
        </BaseHeading>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BaseField label="CEP" class="md:col-span-1">
            <BaseInput v-model="form.zipCode" placeholder="00000-000" />
          </BaseField>
          <BaseField label="Endereço" class="md:col-span-2">
            <BaseInput v-model="form.address" placeholder="Rua, Avenida..." />
          </BaseField>
          <BaseField label="Número">
            <BaseInput v-model="form.addressNumber" />
          </BaseField>
          <BaseField label="Bairro">
            <BaseInput v-model="form.neighborhood" />
          </BaseField>
          <BaseField label="Cidade">
            <BaseInput v-model="form.city" />
          </BaseField>
          <BaseField label="Estado">
            <BaseInput v-model="form.state" />
          </BaseField>
        </div>
        <div class="flex justify-between pt-6 border-t border-muted-200 dark:border-muted-800">
          <BaseButton variant="ghost" @click="prevStep">
            Voltar
          </BaseButton>
          <BaseButton variant="primary" @click="nextStep">
            Continuar
          </BaseButton>
        </div>
      </div>

      <!-- Step 4: Dados Finais -->
      <div v-if="step === 4" class="space-y-6">
        <BaseHeading as="h2" size="xl" weight="medium">
          Profissional e Bancário
        </BaseHeading>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BaseField label="Profissão / Ocupação">
            <BaseInput v-model="form.occupation" placeholder="Ex: Contador" />
          </BaseField>
          <BaseField label="Fonte Pagadora">
            <BaseInput v-model="form.employer" placeholder="Nome da empresa" />
          </BaseField>
          <BaseField label="Banco">
            <BaseInput v-model="form.bankName" />
          </BaseField>
          <BaseField label="Chave PIX (Para restituição)">
            <BaseInput v-model="form.pixKey" placeholder="CPF, e-mail ou telefone" />
          </BaseField>
          <BaseField label="Observações Internas" class="md:col-span-2">
            <BaseTextarea v-model="form.notes" rows="3" />
          </BaseField>
        </div>
        <div class="flex justify-between pt-6 border-t border-muted-200 dark:border-muted-800">
          <BaseButton variant="ghost" @click="prevStep">
            Voltar
          </BaseButton>
          <BaseButton variant="primary" :loading="isSaving" @click="saveClient">
            Finalizar Cadastro
          </BaseButton>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
