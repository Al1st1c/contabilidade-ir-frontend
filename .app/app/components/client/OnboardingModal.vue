<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  open: boolean
  client: any
}>()

const emit = defineEmits(['close', 'complete'])
const { useCustomFetch } = useApi()
const { user } = useAuth()
const toaster = useNuiToasts()

const currentStep = ref(0)
const isLoading = ref(false)
const isSkipping = ref(false)

// Form Data
const form = ref({
  photo: null as File | null,
  photoPreview: null as string | null,

  // Address
  address: '',
  addressNumber: '',
  addressComplement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',

  // Bank
  bankName: '',
  bankAgency: '',
  bankAccount: '',
  bankAccountType: '', // 'corrente' | 'poupanca'
  pixKey: '',

  // Gov
  govPassword: '',
})

// Initialize form from client data
watch(() => props.client, (newVal) => {
  if (newVal) {
    form.value.address = newVal.address || ''
    form.value.addressNumber = newVal.addressNumber || ''
    form.value.addressComplement = newVal.addressComplement || ''
    form.value.neighborhood = newVal.neighborhood || ''
    form.value.city = newVal.city || ''
    form.value.state = newVal.state || ''
    form.value.zipCode = newVal.zipCode || ''

    form.value.bankName = newVal.bankName || ''
    form.value.bankAgency = newVal.bankAgency || ''
    form.value.bankAccount = newVal.bankAccount || ''
    form.value.bankAccountType = newVal.bankAccountType || 'corrente'
    form.value.pixKey = newVal.pixKey || ''

    // Don't pre-fill password for security/logic reasons usually, but here we might if we had it
    // form.value.govPassword = newVal.govPassword || ''
  }
}, { immediate: true })

const steps = [
  {
    title: 'Bem-vindo',
    description: 'Vamos configurar seu perfil para agilizar sua declaração.',
    icon: 'solar:hand-shake-bold-duotone',
  },
  {
    title: 'Sua Foto',
    description: 'Adicione uma foto para seu perfil.',
    icon: 'solar:camera-bold-duotone',
  },
  {
    title: 'Endereço',
    description: 'Confirme seu endereço atual.',
    icon: 'solar:map-point-bold-duotone',
  },
  {
    title: 'Dados Bancários',
    description: 'Para sua restituição (se houver).',
    icon: 'solar:card-bold-duotone',
  },
  {
    title: 'Senha GOV.br',
    description: 'Necessária para processar sua declaração.',
    icon: 'solar:lock-keyhole-bold-duotone',
  },
]

// Methods
function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
  else {
    finishOnboarding()
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    form.value.photo = file
    form.value.photoPreview = URL.createObjectURL(file)

    // Upload immediately (optional UX choice) or wait till end?
    // Plan says "Implement Step 2: Profile Photo (Upload & Preview)"
    // Let's upload immediately when they click "Next" or just select?
    // Let's upload immediately to give instant feedback
    await uploadPhoto(file)
  }
}

async function uploadPhoto(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  try {
    await useCustomFetch(`/clients/${props.client.id}/avatar`, {
      method: 'POST',
      body: formData,
    })
    toaster.add({
      title: 'Foto atualizada',
      description: 'Sua foto de perfil foi salva.',
      icon: 'solar:check-circle-bold',
    })
  }
  catch (error) {
    console.error('Erro upload foto', error)
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível salvar a foto.',
      icon: 'solar:danger-circle-bold',
    })
  }
}

async function updateProfile() {
  try {
    const payload = {
      address: form.value.address,
      addressNumber: form.value.addressNumber,
      addressComplement: form.value.addressComplement,
      neighborhood: form.value.neighborhood,
      city: form.value.city,
      state: form.value.state,
      zipCode: form.value.zipCode,

      bankName: form.value.bankName,
      bankAgency: form.value.bankAgency,
      bankAccount: form.value.bankAccount,
      bankAccountType: form.value.bankAccountType,
      pixKey: form.value.pixKey,

      govPassword: form.value.govPassword || undefined,
    }

    await useCustomFetch(`/clients/${props.client.id}`, {
      method: 'PUT',
      body: payload,
    })
  }
  catch (error) {
    console.error('Erro ao atualizar perfil', error)
    throw error
  }
}

async function finishOnboarding() {
  isLoading.value = true
  try {
    // 1. Update Profile Data
    await updateProfile()

    // 2. Mark as completed
    await useCustomFetch(`/clients/${props.client.id}`, {
      method: 'PUT',
      body: { onboardingCompleted: true },
    })

    emit('complete')
    emit('close')

    toaster.add({
      title: 'Tudo pronto!',
      description: 'Seu perfil foi configurado com sucesso.',
      icon: 'solar:confetti-bold-duotone',
    })
  }
  catch (error) {
    toaster.add({
      title: 'Erro',
      description: 'Houve um problema ao salvar seus dados.',
      icon: 'solar:danger-circle-bold',
    })
  }
  finally {
    isLoading.value = false
  }
}

async function skipOnboarding() {
  if (!confirm('Deseja pular a configuração inicial? Você poderá preencher esses dados depois.'))
    return

  isSkipping.value = true
  try {
    // Even if skipped, mark as completed so it doesnt show again every time?
    // User request: "tudo opcional, ele pode pular tudo."
    // Usually this means "Don't show me again right now" or "Mark as done".
    // Let's mark as done.
    await useCustomFetch(`/clients/${props.client.id}`, {
      method: 'PUT',
      body: { onboardingCompleted: true },
    })
    emit('complete')
    emit('close')
  }
  catch (e) {
    console.error(e)
  }
  finally {
    isSkipping.value = false
  }
}
</script>

<template>
  <DialogRoot :open="open">
    <DialogPortal>
      <DialogOverlay class="bg-muted-800/70 dark:bg-muted-900/80 fixed inset-0 z-[99]" />
      <DialogContent
        class="fixed top-[50%] start-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-2xl bg-white dark:bg-muted-900 rounded-2xl shadow-2xl border border-muted-200 dark:border-muted-800 z-[100] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <!-- Header -->
        <div
          class="px-6 py-4 border-b border-muted-200 dark:border-muted-800 flex items-center justify-between bg-white dark:bg-muted-950"
        >
          <div>
            <BaseHeading as="h2" size="lg" weight="bold" class="text-muted-800 dark:text-white leading-tight">
              {{ currentStep === 0 ? `Olá, ${client?.name?.split(' ')[0] || 'Usuário'}!` : (steps[currentStep]?.title
                || 'Configuração') }}
            </BaseHeading>
            <BaseParagraph size="xs" class="text-muted-500 mt-0.5">
              Etapa {{ currentStep + 1 }} de {{ steps.length }}
            </BaseParagraph>
          </div>
          <button
            class="text-[10px] font-bold text-muted-400 hover:text-primary-500 transition-colors uppercase tracking-widest"
            @click="skipOnboarding"
          >
            Pular
          </button>
        </div>

        <!-- Body -->
        <div class="p-0 overflow-hidden flex-1 flex flex-col md:flex-row">
          <!-- Sidebar Steps (Desktop) -->
          <div
            class="hidden md:flex flex-col w-[220px] border-r border-muted-200 dark:border-muted-800 bg-muted-50/20 dark:bg-muted-950/20 p-4 gap-1"
          >
            <div
              v-for="(step, idx) in steps" :key="idx" class="group relative flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300"
              :class="[
                idx === currentStep ? 'bg-white dark:bg-muted-900 shadow-sm z-10'
                : idx < currentStep ? 'cursor-pointer hover:bg-muted-100 dark:hover:bg-muted-800' : 'opacity-40',
              ]" @click="idx < currentStep ? currentStep = idx : null"
            >
              <div
                class="size-8 rounded-lg flex items-center justify-center border transition-all duration-300 font-bold text-xs shrink-0"
                :class="[
                  idx === currentStep ? 'border-primary-500 bg-primary-500 text-white'
                  : idx < currentStep ? 'border-primary-500/20 bg-primary-50 dark:bg-primary-500/5 text-primary-500'
                    : 'border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-900 text-muted-400',
                ]"
              >
                <Icon v-if="idx < currentStep" name="solar:check-read-bold-duotone" class="size-4" />
                <span v-else>{{ idx + 1 }}</span>
              </div>

              <div class="flex flex-col overflow-hidden">
                <BaseText
                  size="xs" weight="bold" class="truncate transition-colors"
                  :class="idx === currentStep ? 'text-muted-800 dark:text-white' : 'text-muted-500'"
                >
                  {{ step.title }}
                </BaseText>
              </div>

              <!-- Connecting Line -->
              <div
                v-if="idx < steps.length - 1"
                class="absolute left-6 top-[38px] w-px h-2 bg-muted-200 dark:border-muted-800"
                :class="idx < currentStep ? 'bg-primary-500/30' : ''"
              />
            </div>
          </div>

          <!-- Content Area -->
          <div class="flex-1 p-6 md:p-10 overflow-y-auto bg-white dark:bg-muted-900 relative">
            <div class="max-w-md mx-auto h-full flex flex-col">
              <!-- Step 1: Welcome -->
              <div
                v-if="currentStep === 0"
                class="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 flex flex-col justify-center"
              >
                <div class="relative size-20 mx-auto mb-2">
                  <div
                    class="relative size-20 bg-primary-500/5 rounded-2xl flex items-center justify-center border border-primary-500/10"
                  >
                    <Icon name="solar:hand-shake-bold-duotone" class="size-10 text-primary-500" />
                  </div>
                </div>

                <div class="space-y-2">
                  <BaseHeading as="h3" size="xl" weight="bold" class="text-muted-800 dark:text-white">
                    Seja bem-vindo!
                  </BaseHeading>
                  <BaseParagraph size="sm" class="text-muted-500 leading-relaxed max-w-[280px] mx-auto">
                    Configure seu perfil em poucos passos para agilizar sua declaração de IR.
                  </BaseParagraph>
                </div>

                <div class="flex items-center justify-center gap-3 py-4">
                  <div
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted-50 dark:bg-muted-950/50 border border-muted-100 dark:border-muted-800"
                  >
                    <Icon name="solar:shield-check-bold-duotone" class="size-3.5 text-primary-500" />
                    <BaseText size="xs" weight="medium" class="text-muted-600 dark:text-muted-400">
                      Seguro
                    </BaseText>
                  </div>
                  <div
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted-50 dark:bg-muted-950/50 border border-muted-100 dark:border-muted-800"
                  >
                    <Icon name="solar:bolt-bold-duotone" class="size-3.5 text-amber-500" />
                    <BaseText size="xs" weight="medium" class="text-muted-600 dark:text-muted-400">
                      Rápido
                    </BaseText>
                  </div>
                </div>
              </div>

              <!-- Step 2: Photo -->
              <div
                v-if="currentStep === 1"
                class="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 flex flex-col justify-center"
              >
                <div class="space-y-4">
                  <div class="relative size-32 mx-auto group">
                    <div
                      class="relative size-32 rounded-2xl overflow-hidden border border-muted-200 dark:border-muted-800 bg-muted-100 dark:bg-muted-950"
                    >
                      <img
                        v-if="form.photoPreview || client?.photoUrl" :src="form.photoPreview || client.photoUrl"
                        class="w-full h-full object-cover"
                      >
                      <div
                        v-else
                        class="w-full h-full flex items-center justify-center text-muted-300 dark:text-muted-700"
                      >
                        <Icon name="solar:user-bold-duotone" class="size-16" />
                      </div>
                    </div>
                    <label
                      class="absolute -bottom-1 -right-1 size-10 bg-primary-500 text-white rounded-xl cursor-pointer hover:bg-primary-600 transition-all shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 z-20"
                    >
                      <Icon name="solar:camera-add-bold-duotone" class="size-5" />
                      <input type="file" class="hidden" accept="image/*" @change="handleFileSelect">
                    </label>
                  </div>

                  <div class="max-w-xs mx-auto">
                    <BaseHeading as="h3" size="lg" weight="bold" class="text-muted-800 dark:text-white">
                      Identificação
                    </BaseHeading>
                    <BaseParagraph size="xs" class="text-muted-500 mt-1 leading-relaxed">
                      Uma foto ajuda nosso time a te
                      reconhecer e personalizar seu atendimento.
                    </BaseParagraph>
                  </div>
                </div>
              </div>

              <!-- Step 3: Address -->
              <div v-if="currentStep === 2" class="space-y-6 animate-fade-in w-full py-2">
                <div class="grid grid-cols-12 gap-x-4 gap-y-4">
                  <div class="col-span-12 md:col-span-4">
                    <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-wider mb-1.5 block">
                      CEP
                    </BaseText>
                    <BaseInput
                      v-model="form.zipCode" v-maska="'#####-###'" placeholder="00000-000"
                      icon="solar:letter-bold-duotone" rounded="lg" size="sm" class="!bg-muted-50 dark:!bg-muted-950"
                    />
                  </div>

                  <div class="col-span-12 md:col-span-8">
                    <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-wider mb-1.5 block">
                      Logradouro
                    </BaseText>
                    <BaseInput
                      v-model="form.address" placeholder="Rua, Avenida..." icon="solar:map-point-bold-duotone"
                      rounded="lg" size="sm" class="!bg-muted-50 dark:!bg-muted-950"
                    />
                  </div>

                  <div class="col-span-12 md:col-span-3">
                    <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-wider mb-1.5 block">
                      Número
                    </BaseText>
                    <BaseInput
                      v-model="form.addressNumber" placeholder="123" rounded="lg" size="sm"
                      class="!bg-muted-50 dark:!bg-muted-950"
                    />
                  </div>

                  <div class="col-span-12 md:col-span-5">
                    <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-wider mb-1.5 block">
                      Bairro
                    </BaseText>
                    <BaseInput
                      v-model="form.neighborhood" placeholder="Seu bairro" rounded="lg" size="sm"
                      class="!bg-muted-50 dark:!bg-muted-950"
                    />
                  </div>

                  <div class="col-span-12 md:col-span-4">
                    <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-wider mb-1.5 block">
                      Complemento
                    </BaseText>
                    <BaseInput
                      v-model="form.addressComplement" placeholder="Apto, Sala..." rounded="lg" size="sm"
                      class="!bg-muted-50 dark:!bg-muted-950"
                    />
                  </div>

                  <div class="col-span-12 md:col-span-8">
                    <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-wider mb-1.5 block">
                      Cidade
                    </BaseText>
                    <BaseInput
                      v-model="form.city" placeholder="Ex: São Paulo" icon="solar:city-bold-duotone"
                      rounded="lg" size="sm" class="!bg-muted-50 dark:!bg-muted-950"
                    />
                  </div>

                  <div class="col-span-12 md:col-span-4">
                    <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-widest mb-2 block">
                      UF
                    </BaseText>
                    <BaseInput
                      v-model="form.state" v-maska="'AA'" placeholder="SP" rounded="lg"
                      class="!bg-muted-50 dark:!bg-muted-950"
                    />
                  </div>
                </div>
              </div>

              <!-- Step 4: Bank -->
              <div v-if="currentStep === 3" class="space-y-6 animate-fade-in w-full py-2">
                <div class="flex gap-3 p-3 rounded-xl bg-primary-500/5 border border-primary-500/10">
                  <Icon name="solar:wallet-money-bold-duotone" class="size-5 text-primary-500 shrink-0" />
                  <BaseParagraph
                    size="xs"
                    class="text-primary-700/80 dark:text-primary-300/80 leading-relaxed font-medium"
                  >
                    Dados necessários para o depósito da sua restituição diretamente na sua conta.
                  </BaseParagraph>
                </div>

                <div class="space-y-4">
                  <div>
                    <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-wider mb-1.5 block">
                      Chave
                      PIX (CPF vinculada)
                    </BaseText>
                    <BaseInput
                      v-model="form.pixKey" placeholder="Seu CPF ou Email" icon="fa6-brands:pix" rounded="lg"
                      size="sm" class="!bg-muted-50 dark:!bg-muted-950"
                    />
                  </div>

                  <div class="relative flex py-2 items-center">
                    <div class="flex-grow border-t border-muted-200 dark:border-muted-800" />
                    <span class="flex-shrink-0 mx-4 text-muted-400 text-[10px] uppercase font-bold tracking-widest">OU
                      DADOS BANCÁRIOS</span>
                    <div class="flex-grow border-t border-muted-200 dark:border-muted-800" />
                  </div>

                  <div class="grid grid-cols-12 gap-x-4 gap-y-4">
                    <div class="col-span-12 md:col-span-7">
                      <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-wider mb-1.5 block">
                        Instituição
                      </BaseText>
                      <BaseInput
                        v-model="form.bankName" placeholder="Itaú, Nubank..." icon="solar:bank-bold-duotone"
                        rounded="lg" size="sm" class="!bg-muted-50 dark:!bg-muted-950"
                      />
                    </div>
                    <div class="col-span-12 md:col-span-5">
                      <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-wider mb-1.5 block">
                        Tipo
                      </BaseText>
                      <BaseSelect
                        v-model="form.bankAccountType" rounded="lg" size="sm"
                        class="!bg-muted-50 dark:!bg-muted-950"
                      >
                        <BaseSelectItem value="corrente" text="Corrente" />
                        <BaseSelectItem value="poupanca" text="Poupança" />
                      </BaseSelect>
                    </div>

                    <div class="col-span-6 md:col-span-4">
                      <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-wider mb-1.5 block">
                        Agência
                      </BaseText>
                      <BaseInput
                        v-model="form.bankAgency" placeholder="0001" rounded="lg" size="sm"
                        class="!bg-muted-50 dark:!bg-muted-950"
                      />
                    </div>
                    <div class="col-span-6 md:col-span-8">
                      <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-wider mb-1.5 block">
                        Conta
                      </BaseText>
                      <BaseInput
                        v-model="form.bankAccount" placeholder="00000-0" rounded="lg" size="sm"
                        class="!bg-muted-50 dark:!bg-muted-950"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 5: Gov -->
              <div
                v-if="currentStep === 4"
                class="space-y-6 animate-fade-in w-full py-2 flex-1 flex flex-col justify-center"
              >
                <div class="text-center mb-2">
                  <div
                    class="size-16 bg-primary-500/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-500 border border-primary-500/10"
                  >
                    <Icon name="solar:shield-keyhole-bold-duotone" class="size-8" />
                  </div>
                  <BaseHeading as="h3" size="lg" weight="bold" class="text-muted-800 dark:text-white">
                    Conexão GOV.br
                  </BaseHeading>
                  <BaseParagraph size="xs" class="text-muted-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
                    Acesso necessário para baixar sua declaração pré-preenchida.
                  </BaseParagraph>
                </div>

                <div class="max-w-xs mx-auto w-full space-y-4">
                  <div>
                    <BaseText size="xs" weight="bold" class="text-muted-400 uppercase tracking-wider mb-1.5 block">
                      Senha
                      GOV.br
                    </BaseText>
                    <BaseInput
                      v-model="form.govPassword" type="password" placeholder="Sua senha segura"
                      icon="solar:lock-password-bold-duotone" rounded="lg" size="sm"
                      class="!bg-muted-50 dark:!bg-muted-950"
                    />
                  </div>

                  <div class="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <div class="flex gap-3">
                      <Icon name="solar:shield-warning-bold-duotone" class="size-4 text-amber-500 shrink-0" />
                      <BaseParagraph
                        size="xs"
                        class="text-amber-700/80 dark:text-amber-200/80 leading-tight font-medium"
                      >
                        Seus dados são criptografados. Usamos sua senha apenas para recuperar comprovantes.
                      </BaseParagraph>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="p-4 border-t border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-950 flex justify-between items-center px-6 md:px-10"
        >
          <BaseButton
            v-if="currentStep > 0" variant="muted" rounded="lg" size="sm" class="px-5 h-9 font-bold"
            @click="prevStep"
          >
            <Icon name="solar:arrow-left-linear" class="mr-1.5 size-3" />
            Voltar
          </BaseButton>
          <div v-else />

          <div class="flex items-center gap-3">
            <button
              v-if="currentStep > 0 && currentStep < steps.length - 1" class="text-[10px] font-bold text-muted-400 hover:text-muted-600 px-2 uppercase tracking-wider"
              @click="nextStep"
            >
              Pular
            </button>
            <BaseButton
              variant="primary" :loading="isLoading" rounded="lg" size="sm" class="w-36 h-9 font-bold shadow-lg shadow-primary-500/10"
              @click="nextStep"
            >
              {{ currentStep === steps.length - 1 ? 'Concluir' : 'Próxima' }}
              <Icon v-if="currentStep < steps.length - 1" name="solar:arrow-right-linear" class="ml-1.5 size-3" />
            </BaseButton>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
