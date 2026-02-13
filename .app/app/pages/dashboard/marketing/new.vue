<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Nova Campanha SMS',
})

const { useCustomFetch } = useApi()
const router = useRouter()
const toaster = useNuiToasts()

// Wizard steps
const currentStep = ref(1)
const isSubmitting = ref(false)

// Step 1: Campaign info
const campaignName = ref('')
const message = ref('')

const cleanedMessage = computed(() => {
  return message.value
    .normalize('NFD') // Decompor acentos
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^\x00-\x7F]/g, '') // Remover caracteres não-ASCII (emojis, etc)
    .substring(0, 160) // Limitar a 160 caracteres
})

const charCount = computed(() => cleanedMessage.value.length)
const smsCount = ref(1) // Sempre 1 agora que limitamos a 160

// Step 2: Contacts
const inputMethod = ref<'manual' | 'file'>('manual')
const manualPhones = ref('')
const fileContent = ref('')
const fileName = ref('')
const parsedPhones = ref<string[]>([])

function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = async (e) => {
    const content = e.target?.result as string
    fileContent.value = content

    try {
      const format = file.name.endsWith('.csv') || file.name.endsWith('.xlsx') ? 'CSV' : 'TXT'
      const { data } = await useCustomFetch('/marketing/parse-phones', {
        method: 'POST',
        body: { content, format },
      })
      const result = data as any
      parsedPhones.value = result.phones || []
      toaster.add({
        title: `${result.total} números encontrados`,
        description: `Arquivo ${file.name} processado com sucesso.`,
        icon: 'solar:check-circle-bold-duotone',
      })
    } catch (err: any) {
      toaster.add({ title: 'Erro no arquivo', description: err.message, icon: 'solar:danger-triangle-bold-duotone' })
    }
  }
  reader.readAsText(file)
}

function parseManualPhones() {
  const lines = manualPhones.value.split(/[\n\r,;]+/)
  parsedPhones.value = lines
    .map(l => l.trim().replace(/\D/g, ''))
    .filter(p => p.length >= 10 && p.length <= 13)
  parsedPhones.value = [...new Set(parsedPhones.value)]
}

// Step navigation
function nextStep() {
  if (currentStep.value === 1) {
    if (!campaignName.value.trim()) {
      toaster.add({ title: 'Atenção', description: 'Informe o nome da campanha.', icon: 'solar:info-circle-bold-duotone' })
      return
    }
    if (!message.value.trim()) {
      toaster.add({ title: 'Atenção', description: 'Escreva a mensagem do SMS.', icon: 'solar:info-circle-bold-duotone' })
      return
    }
  }
  if (currentStep.value === 2) {
    if (inputMethod.value === 'manual') {
      parseManualPhones()
    }
    if (parsedPhones.value.length === 0) {
      toaster.add({ title: 'Atenção', description: 'Nenhum número válido encontrado.', icon: 'solar:info-circle-bold-duotone' })
      return
    }
  }
  currentStep.value++
}

function prevStep() {
  currentStep.value--
}

async function submitCampaign() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const { data } = await useCustomFetch('/marketing/campaigns', {
      method: 'POST',
      body: {
        name: campaignName.value.trim(),
        message: cleanedMessage.value,
        phones: parsedPhones.value,
        sourceType: inputMethod.value === 'file' ? (fileName.value.endsWith('.csv') ? 'EXCEL' : 'TXT') : 'MANUAL',
      },
    })
    const campaign = data as any

    toaster.add({
      title: 'Campanha criada!',
      description: `${parsedPhones.value.length} contatos adicionados. Pronto para disparo.`,
      icon: 'solar:check-circle-bold-duotone',
    })

    router.push(`/dashboard/marketing/${campaign.id}`)
  } catch (err: any) {
    toaster.add({ title: 'Erro', description: err.message, icon: 'solar:danger-triangle-bold-duotone' })
  } finally {
    isSubmitting.value = false
  }
}

function formatPhone(phone: string) {
  if (phone.length === 11) {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`
  }
  if (phone.length === 10) {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`
  }
  return phone
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="mx-auto max-w-3xl">
      <!-- Header -->
      <div class="mb-8">
        <NuxtLink to="/dashboard/marketing"
          class="text-primary-500 hover:opacity-75 transition-opacity flex items-center gap-2 mb-2 font-medium text-sm">
          <Icon name="solar:alt-arrow-left-linear" class="size-4" />
          Voltar às Campanhas
        </NuxtLink>
        <BaseHeading as="h1" size="2xl" weight="bold" class="text-muted-800 dark:text-white">
          Nova Campanha SMS
        </BaseHeading>
      </div>

      <!-- Step Indicator -->
      <div class="flex items-center gap-3 mb-8">
        <div v-for="step in 3" :key="step" class="flex items-center gap-2" :class="{ 'flex-1': step < 3 }">
          <div class="size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
            :class="currentStep >= step ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'bg-muted-200 dark:bg-muted-700 text-muted-500'">
            <Icon v-if="currentStep > step" name="solar:check-read-linear" class="size-4" />
            <span v-else>{{ step }}</span>
          </div>
          <BaseText size="xs" weight="semibold" class="hidden sm:block"
            :class="currentStep >= step ? 'text-primary-500' : 'text-muted-400'">
            {{ step === 1 ? 'Mensagem' : step === 2 ? 'Contatos' : 'Confirmar' }}
          </BaseText>
          <div v-if="step < 3" class="flex-1 h-0.5 rounded-full"
            :class="currentStep > step ? 'bg-primary-500' : 'bg-muted-200 dark:bg-muted-700'" />
        </div>
      </div>

      <!-- Step 1: Message -->
      <BaseCard v-if="currentStep === 1" rounded="md" class="p-6">
        <BaseHeading as="h3" size="md" weight="bold" class="mb-6 flex items-center gap-2">
          <Icon name="solar:pen-new-round-bold-duotone" class="size-5 text-primary-500" />
          Compose a Mensagem
        </BaseHeading>

        <div class="space-y-4">
          <div>
            <BaseText size="xs" weight="semibold" class="text-muted-600 dark:text-muted-300 mb-1 block">
              Nome da Campanha
            </BaseText>
            <BaseInput v-model="campaignName" placeholder="Ex: Promoção Janeiro 2026" />
          </div>

          <div>
            <BaseText size="xs" weight="semibold" class="text-muted-600 dark:text-muted-300 mb-1 block">
              Mensagem que será entregue via SMS
            </BaseText>
            <textarea v-model="message" rows="5" placeholder="Digite sua mensagem aqui..."
              class="w-full rounded-lg border border-muted-300 dark:border-muted-700 bg-white dark:bg-muted-800 px-4 py-3 text-sm text-muted-800 dark:text-muted-200 placeholder:text-muted-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none transition-colors" />
            <div class="flex justify-between mt-1">
              <BaseText size="xs" class="text-muted-400">
                {{ charCount }}/160 caracteres · SMS limpo (sem acentos/emojis)
              </BaseText>
              <BaseText size="xs" :class="charCount >= 160 ? 'text-yellow-500' : 'text-muted-400'">
                {{ charCount >= 160 ? 'Limite máximo atingido' : `${160 - charCount} restantes` }}
              </BaseText>
            </div>
          </div>
        </div>

        <div class="flex justify-end mt-6">
          <BaseButton variant="primary" color="primary" @click="nextStep" class="gap-2">
            Próximo
            <Icon name="solar:alt-arrow-right-linear" class="size-4" />
          </BaseButton>
        </div>
      </BaseCard>

      <!-- Step 2: Contacts -->
      <BaseCard v-if="currentStep === 2" rounded="md" class="p-6">
        <BaseHeading as="h3" size="md" weight="bold" class="mb-6 flex items-center gap-2">
          <Icon name="solar:users-group-rounded-bold-duotone" class="size-5 text-primary-500" />
          Adicionar Contatos
        </BaseHeading>

        <!-- Method Toggle -->
        <div class="flex gap-2 mb-6">
          <BaseButton :variant="inputMethod === 'manual' ? 'primary' : 'muted'"
            :color="inputMethod === 'manual' ? 'primary' : 'default'" size="sm" @click="inputMethod = 'manual'"
            class="gap-2">
            <Icon name="solar:pen-2-bold-duotone" class="size-4" />
            Digitar Números
          </BaseButton>
          <BaseButton :variant="inputMethod === 'file' ? 'primary' : 'muted'"
            :color="inputMethod === 'file' ? 'primary' : 'default'" size="sm" @click="inputMethod = 'file'"
            class="gap-2">
            <Icon name="solar:cloud-upload-bold-duotone" class="size-4" />
            Importar Arquivo
          </BaseButton>
        </div>

        <!-- Manual Input -->
        <div v-if="inputMethod === 'manual'">
          <BaseText size="xs" weight="semibold" class="text-muted-600 dark:text-muted-300 mb-1 block">
            Números (um por linha, ou separados por vírgula)
          </BaseText>
          <textarea v-model="manualPhones" rows="8" placeholder="11999887766&#10;21888776655&#10;31977665544"
            class="w-full rounded-lg border border-muted-300 dark:border-muted-700 bg-white dark:bg-muted-800 px-4 py-3 text-sm text-muted-800 dark:text-muted-200 placeholder:text-muted-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none transition-colors font-mono" />
        </div>

        <!-- File Upload -->
        <div v-else>
          <div
            class="border-2 border-dashed border-muted-300 dark:border-muted-600 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer relative"
            @click="($refs.fileInput as HTMLInputElement)?.click()">
            <input ref="fileInput" type="file" accept=".txt,.csv,.xlsx" class="hidden" @change="handleFileUpload" />
            <Icon name="solar:cloud-upload-bold-duotone" class="size-10 text-muted-400 mb-3" />
            <BaseText size="sm" weight="semibold" class="text-muted-800 dark:text-white block mb-1">
              {{ fileName || 'Clique ou arraste um arquivo' }}
            </BaseText>
            <BaseText size="xs" class="text-muted-400">
              Formatos: TXT, CSV (primeira coluna = telefones)
            </BaseText>
          </div>
        </div>

        <!-- Parsed Preview -->
        <div v-if="parsedPhones.length > 0" class="mt-4 p-4 rounded-lg bg-success-500/5 border border-success-500/20">
          <div class="flex items-center gap-2 mb-2">
            <Icon name="solar:check-circle-bold-duotone" class="size-5 text-success-500" />
            <BaseText size="sm" weight="bold" class="text-success-600 dark:text-success-400">
              {{ parsedPhones.length }} números válidos
            </BaseText>
          </div>
          <div class="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            <span v-for="(phone, i) in parsedPhones.slice(0, 50)" :key="i"
              class="px-2 py-0.5 bg-white dark:bg-muted-800 rounded text-[10px] font-mono text-muted-600 dark:text-muted-300">
              {{ formatPhone(phone) }}
            </span>
            <span v-if="parsedPhones.length > 50"
              class="px-2 py-0.5 bg-muted-100 dark:bg-muted-700 rounded text-[10px] text-muted-500">
              +{{ parsedPhones.length - 50 }} mais
            </span>
          </div>
        </div>

        <div class="flex justify-between mt-6">
          <BaseButton variant="muted" @click="prevStep" class="gap-2">
            <Icon name="solar:alt-arrow-left-linear" class="size-4" />
            Voltar
          </BaseButton>
          <BaseButton variant="primary" color="primary" @click="nextStep" class="gap-2">
            Próximo
            <Icon name="solar:alt-arrow-right-linear" class="size-4" />
          </BaseButton>
        </div>
      </BaseCard>

      <!-- Step 3: Confirm -->
      <BaseCard v-if="currentStep === 3" rounded="md" class="p-6">
        <BaseHeading as="h3" size="md" weight="bold" class="mb-6 flex items-center gap-2">
          <Icon name="solar:eye-bold-duotone" class="size-5 text-primary-500" />
          Revisar e Criar Campanha
        </BaseHeading>

        <div class="space-y-4">
          <!-- Campaign Summary -->
          <div class="p-4 rounded-lg bg-muted-50 dark:bg-muted-800/50 space-y-3">
            <div class="flex justify-between">
              <BaseText size="xs" class="text-muted-500">Nome</BaseText>
              <BaseText size="xs" weight="bold" class="text-muted-800 dark:text-white">{{ campaignName }}</BaseText>
            </div>
            <div class="flex justify-between">
              <BaseText size="xs" class="text-muted-500">Contatos</BaseText>
              <BaseText size="xs" weight="bold" class="text-muted-800 dark:text-white">{{ parsedPhones.length }} números
              </BaseText>
            </div>
            <div class="flex justify-between">
              <BaseText size="xs" class="text-muted-500">SMS por contato</BaseText>
              <BaseText size="xs" weight="bold" class="text-muted-800 dark:text-white">{{ smsCount }}</BaseText>
            </div>
            <div class="flex justify-between pt-3 border-t border-muted-200 dark:border-muted-700">
              <BaseText size="sm" weight="bold" class="text-muted-800 dark:text-white">Total de SMS</BaseText>
              <BaseText size="sm" weight="bold" class="text-primary-500">{{ parsedPhones.length * smsCount }}</BaseText>
            </div>
          </div>

          <!-- Message Preview -->
          <div>
            <BaseText size="xs" weight="semibold" class="text-muted-500 mb-2 block uppercase tracking-wider">
              Prévia da Mensagem
            </BaseText>
            <div class="p-4 rounded-lg bg-primary-500/5 border border-primary-500/20">
              <div class="flex items-start gap-3">
                <div class="p-2 rounded-full bg-primary-500/10 shrink-0">
                  <Icon name="solar:chat-round-dots-bold-duotone" class="size-4 text-primary-500" />
                </div>
                <BaseText size="sm" class="text-muted-700 dark:text-muted-200 whitespace-pre-wrap">
                  {{ cleanedMessage }}
                </BaseText>
              </div>
            </div>
          </div>

          <!-- Warning -->
          <div class="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 flex items-start gap-2">
            <Icon name="solar:info-circle-bold-duotone" class="size-5 text-yellow-500 shrink-0 mt-0.5" />
            <BaseText size="xs" class="text-yellow-700 dark:text-yellow-400">
              A campanha será criada como <strong>rascunho</strong>. Você poderá revisar e disparar na página de
              detalhes.
            </BaseText>
          </div>
        </div>

        <div class="flex justify-between mt-6">
          <BaseButton variant="muted" @click="prevStep" class="gap-2">
            <Icon name="solar:alt-arrow-left-linear" class="size-4" />
            Voltar
          </BaseButton>
          <BaseButton variant="primary" color="primary" :loading="isSubmitting" @click="submitCampaign" class="gap-2">
            <Icon name="solar:check-circle-bold-duotone" class="size-4" />
            Criar Campanha
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
