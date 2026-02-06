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
    <div class="mb-10 text-center md:text-left">
      <BaseHeading as="h1" size="2xl" weight="medium" class="text-muted-800 dark:text-white">
        Novo Cliente
      </BaseHeading>
      <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
        Preencha os dados abaixo para cadastrar um novo cliente no sistema.
      </BaseParagraph>
    </div>

    <!-- Multi-step Form -->
    <BaseCard rounded="lg"
      class="p-6 md:p-10 shadow-sm border border-muted-200 dark:border-muted-800 overflow-hidden relative">
      <!-- Steps Indicator -->
      <div class="flex items-center justify-between mb-12 relative max-w-sm mx-auto">
        <div class="absolute top-1/2 left-0 w-full h-0.5 bg-muted-100 dark:bg-muted-800 -translate-y-1/2 z-0" />
        <div v-for="i in 4" :key="i"
          class="relative z-10 size-10 rounded-full flex items-center justify-center border-4 border-white dark:border-muted-900 transition-all duration-300 ring-1"
          :class="step === i
            ? 'bg-primary-500 text-white ring-primary-500/30'
            : step > i
              ? 'bg-emerald-500 text-white ring-emerald-500/20'
              : 'bg-muted-100 dark:bg-muted-800 text-muted-400 ring-transparent'">
          <Icon v-if="step > i" name="lucide:check" class="size-4" />
          <span v-else class="text-xs font-medium">{{ i }}</span>

          <!-- Label below tooltip-style -->
          <div v-if="step === i"
            class="absolute -bottom-6 whitespace-nowrap text-[10px] uppercase tracking-wider text-primary-500 font-medium">
            Passo {{ i }}
          </div>
        </div>
      </div>

      <!-- Step 1: CPF / Busca -->
      <div v-if="step === 1" class="space-y-8 py-4">
        <div class="flex flex-col md:flex-row items-center gap-12">
          <div class="flex-1 space-y-6">
            <div class="space-y-2">
              <BaseHeading as="h2" size="xl" weight="medium" class="text-muted-800 dark:text-muted-100">
                Identificação Inicial
              </BaseHeading>
              <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
                Inicie digitando o CPF. Nosso sistema tentará recuperar os dados básicos automaticamente para agilizar o
                processo.
              </BaseParagraph>
            </div>

            <div class="max-w-md">
              <BaseField label="CPF do Cliente">
                <BaseInput v-model="form.cpf" placeholder="000.000.000-00" :masks="masks" size="lg"
                  icon="lucide:fingerprint" @keyup.enter="consultCpf" />
              </BaseField>
            </div>

            <div class="flex flex-wrap gap-3">
              <BaseButton variant="primary" size="lg" class="px-8 shadow-lg shadow-primary-500/20"
                :loading="isLoadingCpf" @click="consultCpf">
                {{ isLoadingCpf ? 'Consultando...' : 'Consultar e Iniciar' }}
              </BaseButton>
              <BaseButton variant="muted" size="lg" @click="nextStep">
                Preencher Manualmente
              </BaseButton>
            </div>
          </div>
          <div class="hidden md:flex w-64 items-center justify-center">
            <div class="relative">
              <div class="absolute inset-0 bg-primary-500/10 blur-3xl rounded-full" />
              <img src="/img/logo-icon.png" alt="Busca" class="relative z-10 w-full drop-shadow-xl">
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: Dados Pessoais -->
      <div v-if="step === 2" class="space-y-8 py-4">
        <div class="flex items-center gap-2 pb-2 border-b border-muted-100 dark:border-muted-800">
          <Icon name="solar:user-id-linear" class="size-5 text-primary-500" />
          <BaseHeading as="h2" size="xl" weight="medium">
            Dados Pessoais
          </BaseHeading>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <BaseField label="Nome Completo">
            <BaseInput v-model="form.name" placeholder="Ex: João da Silva" icon="lucide:user" />
          </BaseField>
          <BaseField label="Data de Nascimento">
            <BaseInput v-model="form.birthDate" type="date" icon="lucide:calendar" />
          </BaseField>
          <BaseField label="Email Principal">
            <BaseInput v-model="form.email" type="email" placeholder="contato@exemplo.com" icon="lucide:mail" />
          </BaseField>
          <BaseField label="Telefone / WhatsApp">
            <BaseInput v-model="form.phone" placeholder="(00) 00000-0000" icon="lucide:phone" />
          </BaseField>
        </div>

        <div class="flex justify-between items-center pt-8 border-t border-muted-100 dark:border-muted-800 mt-10">
          <BaseButton variant="muted" @click="prevStep">
            <Icon name="lucide:arrow-left" class="size-4 mr-1" />
            Voltar
          </BaseButton>
          <BaseButton variant="primary" class="px-8" @click="nextStep">
            Continuar
            <Icon name="lucide:arrow-right" class="size-4 ml-1" />
          </BaseButton>
        </div>
      </div>

      <!-- Step 3: Endereço -->
      <div v-if="step === 3" class="space-y-8 py-4">
        <div class="flex items-center gap-2 pb-2 border-b border-muted-100 dark:border-muted-800">
          <Icon name="solar:map-point-linear" class="size-5 text-primary-500" />
          <BaseHeading as="h2" size="xl" weight="medium">
            Endereço Residencial
          </BaseHeading>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-6">
          <div class="md:col-span-4">
            <BaseField label="CEP">
              <BaseInput v-model="form.zipCode" placeholder="00000-000" icon="lucide:map-pin" />
            </BaseField>
          </div>
          <div class="md:col-span-8">
            <BaseField label="Logradouro">
              <BaseInput v-model="form.address" placeholder="Rua, Avenida, etc." />
            </BaseField>
          </div>
          <div class="md:col-span-3">
            <BaseField label="Número">
              <BaseInput v-model="form.addressNumber" placeholder="Ex: 123" />
            </BaseField>
          </div>
          <div class="md:col-span-4">
            <BaseField label="Bairro">
              <BaseInput v-model="form.neighborhood" placeholder="Bairro" />
            </BaseField>
          </div>
          <div class="md:col-span-5">
            <BaseField label="Complemento">
              <BaseInput v-model="form.addressComplement" placeholder="Apt, Bloco, etc." />
            </BaseField>
          </div>
          <div class="md:col-span-8">
            <BaseField label="Cidade">
              <BaseInput v-model="form.city" placeholder="Cidade" icon="lucide:building" />
            </BaseField>
          </div>
          <div class="md:col-span-4">
            <BaseField label="Estado / UF">
              <BaseInput v-model="form.state" placeholder="UF" />
            </BaseField>
          </div>
        </div>

        <div class="flex justify-between items-center pt-8 border-t border-muted-100 dark:border-muted-800 mt-10">
          <BaseButton variant="muted" @click="prevStep">
            <Icon name="lucide:arrow-left" class="size-4 mr-1" />
            Voltar
          </BaseButton>
          <BaseButton variant="primary" class="px-8" @click="nextStep">
            Continuar
            <Icon name="lucide:arrow-right" class="size-4 ml-1" />
          </BaseButton>
        </div>
      </div>

      <!-- Step 4: Dados Finais -->
      <div v-if="step === 4" class="space-y-8 py-4">
        <div class="flex items-center gap-2 pb-2 border-b border-muted-100 dark:border-muted-800">
          <Icon name="solar:wallet-linear" class="size-5 text-primary-500" />
          <BaseHeading as="h2" size="xl" weight="medium">
            Profissão e Dados Bancários
          </BaseHeading>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <BaseField label="Profissão / Ocupação">
            <BaseInput v-model="form.occupation" placeholder="Ex: Advogado" icon="lucide:briefcase" />
          </BaseField>
          <BaseField label="Principal Fonte Pagadora">
            <BaseInput v-model="form.employer" placeholder="Nome da empresa" icon="lucide:building-2" />
          </BaseField>
          <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            <BaseField label="Banco">
              <BaseInput v-model="form.bankName" placeholder="Ex: Nubank" />
            </BaseField>
            <BaseField label="Agência">
              <BaseInput v-model="form.bankAgency" placeholder="0001" />
            </BaseField>
            <BaseField label="Conta">
              <BaseInput v-model="form.bankAccount" placeholder="00000000-0" />
            </BaseField>
          </div>
          <BaseField label="Chave PIX (Para restituir)" class="md:col-span-2">
            <BaseInput v-model="form.pixKey" placeholder="CPF, e-mail ou telefone" icon="logos:pix" />
          </BaseField>
          <BaseField label="Observações de Uso Interno" class="md:col-span-2">
            <BaseTextarea v-model="form.notes" rows="4" placeholder="Algum detalhe importante sobre este cliente..." />
          </BaseField>
        </div>

        <div class="flex justify-between items-center pt-8 border-t border-muted-100 dark:border-muted-800 mt-10">
          <BaseButton variant="muted" @click="prevStep">
            <Icon name="lucide:arrow-left" class="size-4 mr-1" />
            Voltar
          </BaseButton>
          <BaseButton variant="primary" size="lg" class="px-10 shadow-lg shadow-primary-500/20" :loading="isSaving"
            @click="saveClient">
            Finalizar Cadastro
            <Icon name="lucide:check" class="size-4 ml-2" />
          </BaseButton>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
