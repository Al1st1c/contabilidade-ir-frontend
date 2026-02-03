<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

const props = defineProps<{
  raffle: any
}>()
const emits = defineEmits<{
  close: []
}>()
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

const loading = ref(false)
const selectedWinner = ref<any>(null)
const printerStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
const availablePrinters = ref<any[]>([])
const selectedPrinter = ref<any>(null)
const logoInput = ref<HTMLInputElement | null>(null)

// Estados do painel
const activeTab = ref<'preview' | 'customize'>('preview')

// Dados da empresa (configuráveis)
const companyData = ref({
  name: 'Casino Royal',
  cnpj: '12.345.678/0001-90',
  address: 'Rua das Flores, 123 - Centro',
  city: 'São Paulo - SP',
  phone: '(11) 99999-9999',
  email: 'contato@casinoroyal.com.br',
  website: 'www.casinoroyal.com.br',
  logo: null as string | null,
})

// Configurações do comprovante
const receiptConfig = ref({
  showLogo: true,
  showCompanyInfo: true,
  showLegalText: true,
  showQRCode: true,
  showTimestamp: true,
  fontSize: 'normal' as 'small' | 'normal' | 'large',
  paperWidth: '58mm' as '58mm' | '80mm',
  margins: 'normal' as 'small' | 'normal' | 'large',
  language: 'pt-BR' as 'pt-BR' | 'en-US' | 'es-ES',
  customFields: [] as Array<{
    id: string
    label: string
    value: string
    position: 'header' | 'footer' | 'after-winner' | 'after-prize'
  }>,
})

// Templates pré-definidos removidos - mantendo apenas configuração padrão

// Carregar ganhadores quando o componente é montado
onMounted(() => {
  if (props.raffle.winners?.length > 0) {
    selectedWinner.value = props.raffle.winners[0]
  }
  loadSavedConfig()
})

// Carregar configurações salvas
function loadSavedConfig() {
  const savedCompany = localStorage.getItem('receipt-company-data')
  const savedConfig = localStorage.getItem('receipt-config')

  if (savedCompany) {
    companyData.value = { ...companyData.value, ...JSON.parse(savedCompany) }
  }

  if (savedConfig) {
    receiptConfig.value = { ...receiptConfig.value, ...JSON.parse(savedConfig) }
  }
}

// Salvar configurações
function saveConfig() {
  localStorage.setItem('receipt-company-data', JSON.stringify(companyData.value))
  localStorage.setItem('receipt-config', JSON.stringify(receiptConfig.value))

  toaster.add({
    title: 'Sucesso',
    description: 'Configurações salvas com sucesso!',
    icon: 'ph:check-circle-fill',
    progress: true,
  })
}

// Função de aplicar template removida - não mais necessária

// Adicionar campo personalizado
function addCustomField() {
  const newField = {
    id: `custom-${Date.now()}`,
    label: 'Campo Personalizado',
    value: '',
    position: 'footer' as const,
  }
  receiptConfig.value.customFields.push(newField)
}

// Remover campo personalizado
function removeCustomField(fieldId: string) {
  const index = receiptConfig.value.customFields.findIndex(f => f.id === fieldId)
  if (index > -1) {
    receiptConfig.value.customFields.splice(index, 1)
  }
}

// Upload de logo
function handleLogoUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toaster.add({
        title: 'Erro',
        description: 'Tipo de arquivo não suportado. Use apenas imagens (JPEG, PNG, GIF, WebP)',
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
      return
    }

    // Validar tamanho do arquivo (máximo 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      toaster.add({
        title: 'Erro',
        description: 'Arquivo muito grande. Tamanho máximo permitido: 2MB',
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      companyData.value.logo = e.target?.result as string
      toaster.add({
        title: 'Sucesso',
        description: 'Logo carregado com sucesso!',
        icon: 'ph:check-circle-fill',
        progress: true,
      })
    }
    reader.onerror = () => {
      toaster.add({
        title: 'Erro',
        description: 'Erro ao carregar o arquivo',
        icon: 'ph:warning-circle-fill',
        progress: true,
      })
    }
    reader.readAsDataURL(file)
  }
}

// Detectar impressoras disponíveis
async function detectPrinters() {
  try {
    printerStatus.value = 'connecting'
    availablePrinters.value = []

    // Tentar detectar impressoras USB via Web Serial API (para impressoras térmicas/fiscais)
    if ('serial' in navigator) {
      try {
        // Solicitar acesso a uma porta serial
        const port = await (navigator as any).serial.requestPort({
          filters: [
            // Filtros comuns para impressoras térmicas/fiscais
            { usbVendorId: 0x04B8 }, // EPSON
            { usbVendorId: 0x0483 }, // Bematech
            { usbVendorId: 0x0519 }, // Elgin
            { usbVendorId: 0x0FE6 }, // Daruma
            { usbVendorId: 0x0DD4 }, // Diebold
          ],
        })

        const info = port.getInfo()
        availablePrinters.value.push({
          id: `usb-${info.usbVendorId}-${info.usbProductId}`,
          name: `Impressora Fiscal USB (${info.usbVendorId ? `VID: ${info.usbVendorId.toString(16)}` : 'Desconhecida'})`,
          type: 'usb',
          port,
        })

        toaster.add({
          title: 'Impressora detectada',
          description: 'Impressora USB conectada com sucesso',
          icon: 'ph:check-circle-fill',
          duration: 3000,
        })
      }
      catch (error: any) {
        console.log('Web Serial API - Usuário cancelou ou erro:', error)

        if (error.name !== 'NotFoundError') {
          toaster.add({
            title: 'Aviso',
            description: 'Nenhuma impressora USB foi selecionada',
            icon: 'ph:info',
            duration: 3000,
          })
        }
      }
    }
    else {
      toaster.add({
        title: 'Não suportado',
        description: 'Seu navegador não suporta conexão USB. Use Chrome, Edge ou Opera.',
        icon: 'ph:warning-circle-fill',
        duration: 5000,
      })
    }

    // Tentar detectar impressoras Bluetooth (para impressoras portáteis)
    if ('bluetooth' in navigator && availablePrinters.value.length === 0) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [
            { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Serial Port Profile
            { namePrefix: 'POS' },
            { namePrefix: 'Printer' },
            { namePrefix: 'EPSON' },
            { namePrefix: 'Bematech' },
            { namePrefix: 'Elgin' },
            { namePrefix: 'Daruma' },
          ],
          optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
        })

        availablePrinters.value.push({
          id: `bluetooth-${device.id}`,
          name: device.name || 'Impressora Bluetooth',
          type: 'bluetooth',
          device,
        })

        toaster.add({
          title: 'Impressora detectada',
          description: 'Impressora Bluetooth conectada com sucesso',
          icon: 'ph:check-circle-fill',
          duration: 3000,
        })
      }
      catch (error) {
        console.log('Bluetooth - Usuário cancelou ou erro:', error)
      }
    }

    if (availablePrinters.value.length > 0) {
      printerStatus.value = 'connected'
      selectedPrinter.value = availablePrinters.value[0]
    }
    else {
      printerStatus.value = 'disconnected'
      toaster.add({
        title: 'Nenhuma impressora',
        description: 'Nenhuma impressora foi detectada ou selecionada',
        icon: 'ph:warning-circle-fill',
        duration: 4000,
      })
    }
  }
  catch (error) {
    console.error('Erro ao detectar impressoras:', error)
    printerStatus.value = 'error'
    toaster.add({
      title: 'Erro',
      description: 'Erro ao tentar detectar impressoras',
      icon: 'ph:warning-circle-fill',
      duration: 4000,
    })
  }
}

// Gerar comprovante em PDF
async function generateReceiptPDF() {
  if (!selectedWinner.value) {
    toaster.add({
      title: 'Erro',
      description: 'Selecione um ganhador para gerar o comprovante',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
    return
  }

  try {
    loading.value = true

    // Preparar dados completos em JSON
    const receiptData = {
      // Dados do sorteio
      raffle: {
        id: props.raffle.id,
        name: props.raffle.name,
        description: props.raffle.description,
        drawDate: props.raffle.drawDate,
        status: props.raffle.status,
      },
      // Dados do ganhador
      winner: {
        id: selectedWinner.value.id,
        position: selectedWinner.value.position,
        user: {
          name: selectedWinner.value.user?.name || 'Ganhador',
          document: selectedWinner.value.user?.document || 'N/A',
          phone: selectedWinner.value.user?.phone || 'N/A',
        },
        prize: {
          name: selectedWinner.value.prize?.name || 'Prêmio',
          description: selectedWinner.value.prize?.description || '',
          value: selectedWinner.value.prize?.value || 0,
        },
        entry: {
          ticket: selectedWinner.value.entry?.ticket || 'N/A',
          purchaseDate: selectedWinner.value.entry?.createdAt,
        },
      },
      // Dados da empresa
      company: {
        name: companyData.value.name,
        cnpj: companyData.value.cnpj,
        address: companyData.value.address,
        city: companyData.value.city,
        phone: companyData.value.phone,
        email: companyData.value.email,
        website: companyData.value.website,
        logo: companyData.value.logo,
      },
      // Configurações do comprovante
      config: {
        showLogo: receiptConfig.value.showLogo,
        showCompanyInfo: receiptConfig.value.showCompanyInfo,
        showLegalText: receiptConfig.value.showLegalText,
        showTimestamp: receiptConfig.value.showTimestamp,
        language: receiptConfig.value.language,
        customFields: receiptConfig.value.customFields,
      },
      // Metadados
      generatedAt: new Date().toISOString(),
      receiptId: `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }

    // Gerar PDF do comprovante
    const { data } = await useCustomFetch<any>('/raffles/generate-receipt', {
      method: 'POST',
      body: receiptData,
    })

    // Abrir PDF em nova aba
    window.open(data.pdfUrl, '_blank')

    toaster.add({
      title: 'Sucesso',
      description: 'Comprovante gerado com sucesso!',
      icon: 'ph:check-circle-fill',
      progress: true,
    })
  }
  catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao gerar comprovante',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  }
  finally {
    loading.value = false
  }
}

// Imprimir comprovante diretamente
async function printReceipt() {
  if (!selectedWinner.value) {
    toaster.add({
      title: 'Erro',
      description: 'Selecione um ganhador para imprimir o comprovante',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
    return
  }

  if (!selectedPrinter.value) {
    toaster.add({
      title: 'Erro',
      description: 'Selecione uma impressora para imprimir',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
    return
  }

  try {
    loading.value = true

    // Gerar dados do comprovante para impressão ESC/POS
    const receiptData = {
      raffle: props.raffle,
      winner: selectedWinner.value,
      company: companyData.value,
      config: receiptConfig.value,
      generatedAt: new Date().toISOString(),
      receiptId: `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }

    // Enviar para impressão
    const { data } = await useCustomFetch<any>('/raffles/print-receipt', {
      method: 'POST',
      body: {
        ...receiptData,
        printerType: selectedPrinter.value.type,
        printerId: selectedPrinter.value.id,
      },
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Comprovante enviado para impressão!',
      icon: 'ph:check-circle-fill',
      progress: true,
    })
  }
  catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao imprimir comprovante',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  }
  finally {
    loading.value = false
  }
}

// Preview do comprovante
const receiptPreview = computed(() => {
  if (!selectedWinner.value)
    return null

  return {
    company: companyData.value,
    raffle: props.raffle,
    winner: selectedWinner.value,
    config: receiptConfig.value,
    generatedAt: new Date(),
    receiptId: `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  }
})
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white"
    trapped
    style="width: 50%"
    loop
  >
    <div
      class="border-muted-200 dark:border-muted-700 flex h-20 w-full items-center justify-between border-b px-6"
    >
      <BaseHeading
        as="h3"
        size="xs"
        weight="semibold"
        class="text-muted-500 dark:text-muted-100 uppercase"
      >
        Emitir Comprovante
      </BaseHeading>

      <!-- Close button -->
      <button
        type="button"
        class="nui-mask nui-mask-blob hover:bg-muted-100 focus:bg-muted-100 dark:hover:bg-muted-700 dark:focus:bg-muted-700 text-muted-700 dark:text-muted-400 flex size-10 cursor-pointer items-center justify-center outline-transparent transition-colors duration-300"
        @click="() => emits('close')"
      >
        <Icon name="lucide:arrow-right" class="size-4" />
      </button>
    </div>

    <div
      class="nui-slimscroll relative h-[calc(100dvh_-_80px)] w-full overflow-y-auto p-6"
    >
      <!-- Abas de Navegação -->
      <div class="mb-6">
        <div class="flex border-b border-muted-200 dark:border-muted-700">
          <button
            class="px-4 py-2 text-sm font-medium transition-colors"
            :class="{
              'text-primary-600 border-b-2 border-primary-600': activeTab === 'preview',
              'text-muted-500 hover:text-muted-700 dark:text-muted-400 dark:hover:text-muted-300': activeTab !== 'preview',
            }"
            @click="activeTab = 'preview'"
          >
            <Icon name="lucide:eye" class="size-4 mr-2" />
            Preview
          </button>
          <button
            class="px-4 py-2 text-sm font-medium transition-colors"
            :class="{
              'text-primary-600 border-b-2 border-primary-600': activeTab === 'customize',
              'text-muted-500 hover:text-muted-700 dark:text-muted-400 dark:hover:text-muted-300': activeTab !== 'customize',
            }"
            @click="activeTab = 'customize'"
          >
            <Icon name="lucide:settings" class="size-4 mr-2" />
            Personalizar
          </button>
        </div>
      </div>

      <!-- Conteúdo das Abas -->
      <div v-if="activeTab === 'preview'">
        <!-- Informações do Sorteio -->
        <div class="mb-6">
          <BaseHeading
            as="h4"
            size="sm"
            weight="medium"
            class="text-muted-700 dark:text-muted-300 mb-2"
          >
            {{ raffle.name }}
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500">
            {{ raffle.description || 'Sem descrição' }}
          </BaseParagraph>
        </div>

        <!-- Seleção do Ganhador -->
        <div class="mb-6">
          <BaseHeading
            as="h5"
            size="sm"
            weight="medium"
            class="text-muted-700 dark:text-muted-300 mb-3"
          >
            Selecionar Ganhador
          </BaseHeading>

          <div class="space-y-3">
            <div
              v-for="winner in raffle.winners"
              :key="winner.id"
              class="border rounded-lg p-4 transition-colors cursor-pointer"
              :class="{
                'border-primary-500 bg-primary-50 dark:bg-primary-900/20': selectedWinner?.id === winner.id,
                'border-muted-200 dark:border-muted-700 hover:bg-muted-50 dark:hover:bg-muted-800': selectedWinner?.id !== winner.id,
              }"
              @click="selectedWinner = winner"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div
                    class="size-4 rounded-full border-2"
                    :class="{
                      'border-primary-500 bg-primary-500': selectedWinner?.id === winner.id,
                      'border-muted-300': selectedWinner?.id !== winner.id,
                    }"
                  >
                    <Icon
                      v-if="selectedWinner?.id === winner.id"
                      name="lucide:check"
                      class="size-3 text-white"
                    />
                  </div>
                  <div>
                    <div class="font-medium text-muted-700 dark:text-muted-300">
                      {{ winner.user?.name || 'Ganhador' }}
                    </div>
                    <div class="text-sm text-muted-500">
                      {{ winner.user?.document || 'Sem documento' }} • Bilhete: {{ winner.entry?.ticket || 'N/A' }}
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium text-success-600 dark:text-success-400">
                    {{ winner.prize?.name || 'Prêmio' }}
                  </div>
                  <div class="text-xs text-muted-500">
                    {{ winner.prize?.value ? `R$ ${winner.prize.value}` : 'Sem valor' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Configuração da Impressora -->
        <div class="mb-6">
          <BaseHeading
            as="h5"
            size="sm"
            weight="medium"
            class="text-muted-700 dark:text-muted-300 mb-3"
          >
            Impressora
          </BaseHeading>

          <div class="space-y-3">
            <!-- Status da Impressora -->
            <div class="flex items-center gap-3">
              <div
                class="size-3 rounded-full"
                :class="{
                  'bg-success-500': printerStatus === 'connected',
                  'bg-warning-500': printerStatus === 'connecting',
                  'bg-destructive-500': printerStatus === 'error',
                  'bg-muted-400': printerStatus === 'disconnected',
                }"
              />
              <span class="text-sm text-muted-600 dark:text-muted-400">
                {{
                  printerStatus === 'connected' ? 'Conectada'
                  : printerStatus === 'connecting' ? 'Conectando...'
                    : printerStatus === 'error' ? 'Erro na conexão'
                      : 'Desconectada'
                }}
              </span>
            </div>

            <!-- Botão para detectar impressoras -->
            <BaseButton
              variant="default"
              size="sm"
              rounded="lg"
              :disabled="printerStatus === 'connecting'"
              @click="detectPrinters"
            >
              <Icon name="lucide:search" class="size-3" />
              <span>Detectar Impressoras</span>
            </BaseButton>

            <!-- Lista de impressoras disponíveis -->
            <div v-if="availablePrinters.length > 0" class="space-y-2">
              <div
                v-for="printer in availablePrinters"
                :key="printer.id"
                class="border rounded-lg p-3 transition-colors cursor-pointer"
                :class="{
                  'border-primary-500 bg-primary-50 dark:bg-primary-900/20': selectedPrinter?.id === printer.id,
                  'border-muted-200 dark:border-muted-700 hover:bg-muted-50 dark:hover:bg-muted-800': selectedPrinter?.id !== printer.id,
                }"
                @click="selectedPrinter = printer"
              >
                <div class="flex items-center gap-3">
                  <Icon
                    :name="printer.type === 'usb' ? 'lucide:usb' : 'lucide:bluetooth'"
                    class="size-4 text-muted-500"
                  />
                  <div>
                    <div class="font-medium text-sm text-muted-700 dark:text-muted-300">
                      {{ printer.name }}
                    </div>
                    <div class="text-xs text-muted-500">
                      {{ printer.type === 'usb' ? 'USB' : 'Bluetooth' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview do Comprovante -->
        <div v-if="receiptPreview" class="mb-6">
          <BaseHeading
            as="h5"
            size="sm"
            weight="medium"
            class="text-muted-700 dark:text-muted-300 mb-3"
          >
            Preview do Comprovante
          </BaseHeading>

          <div class="border rounded-lg p-4 bg-white dark:bg-muted-900">
            <!-- Logo da empresa -->
            <div v-if="receiptPreview.company.logo && receiptConfig.showLogo" class="text-center mb-4">
              <img
                :src="receiptPreview.company.logo"
                alt="Logo da empresa"
                class="mx-auto h-16 object-contain"
              >
            </div>

            <!-- Campos personalizados do cabeçalho -->
            <div v-if="receiptConfig.customFields.filter(f => f.position === 'header').length > 0" class="mb-4">
              <div
                v-for="field in receiptConfig.customFields.filter(f => f.position === 'header')"
                :key="field.id"
                class="text-sm text-center mb-1"
              >
                <strong>{{ field.label }}:</strong> {{ field.value }}
              </div>
            </div>

            <div v-if="receiptConfig.showCompanyInfo" class="text-center mb-4">
              <div class="font-bold text-lg">
                {{ receiptPreview.company.name }}
              </div>
              <div class="text-sm text-muted-600">
                {{ receiptPreview.company.cnpj }}
              </div>
              <div class="text-sm text-muted-600">
                {{ receiptPreview.company.address }}
              </div>
              <div class="text-sm text-muted-600">
                {{ receiptPreview.company.city }}
              </div>
            </div>

            <div class="border-t pt-4 mb-4">
              <div class="text-center font-bold text-lg mb-2">
                COMPROVANTE DE SORTEIO
              </div>
              <div class="text-sm text-muted-600 mb-2">
                Sorteio: {{ receiptPreview.raffle.name }}
              </div>
              <div class="text-sm text-muted-600 mb-2">
                Data: {{ receiptPreview.generatedAt.toLocaleDateString('pt-BR') }}
              </div>
              <div class="text-sm text-muted-600 mb-4">
                ID: {{ receiptPreview.receiptId }}
              </div>
            </div>

            <div class="border-t pt-4 mb-4">
              <div class="font-bold text-center mb-2">
                GANHADOR
              </div>
              <div class="text-sm mb-1">
                <strong>Nome:</strong> {{ receiptPreview.winner.user?.name || 'Ganhador' }}
              </div>
              <div class="text-sm mb-1">
                <strong>Documento:</strong> {{ receiptPreview.winner.user?.document || 'N/A' }}
              </div>
              <div class="text-sm mb-1">
                <strong>Bilhete:</strong> {{ receiptPreview.winner.entry?.ticket || 'N/A' }}
              </div>
              <div class="text-sm mb-1">
                <strong>Prêmio:</strong> {{ receiptPreview.winner.prize?.name || 'Prêmio' }}
              </div>
              <div class="text-sm mb-1">
                <strong>Valor:</strong> {{ receiptPreview.winner.prize?.value ? `R$ ${receiptPreview.winner.prize.value}` : 'Sem valor' }}
              </div>

              <!-- Campos personalizados após ganhador -->
              <div v-if="receiptConfig.customFields.filter(f => f.position === 'after-winner').length > 0" class="mt-3 pt-3 border-t border-muted-200">
                <div
                  v-for="field in receiptConfig.customFields.filter(f => f.position === 'after-winner')"
                  :key="field.id"
                  class="text-sm mb-1"
                >
                  <strong>{{ field.label }}:</strong> {{ field.value }}
                </div>
              </div>
            </div>

            <!-- Campos personalizados após prêmio -->
            <div v-if="receiptConfig.customFields.filter(f => f.position === 'after-prize').length > 0" class="border-t pt-4 mb-4">
              <div
                v-for="field in receiptConfig.customFields.filter(f => f.position === 'after-prize')"
                :key="field.id"
                class="text-sm mb-1"
              >
                <strong>{{ field.label }}:</strong> {{ field.value }}
              </div>
            </div>

            <div class="border-t pt-4 text-center text-xs text-muted-500">
              <!-- Campos personalizados do rodapé -->
              <div v-if="receiptConfig.customFields.filter(f => f.position === 'footer').length > 0" class="mb-3">
                <div
                  v-for="field in receiptConfig.customFields.filter(f => f.position === 'footer')"
                  :key="field.id"
                  class="text-xs mb-1"
                >
                  <strong>{{ field.label }}:</strong> {{ field.value }}
                </div>
              </div>

              <div v-if="receiptConfig.showTimestamp">
                Comprovante gerado em: {{ receiptPreview.generatedAt.toLocaleString('pt-BR') }}
              </div>
              <div class="mt-2">
                Este documento comprova a participação e vitória no sorteio
              </div>
            </div>
          </div>
        </div>

        <!-- Botões de Ação -->
        <div class="flex gap-3 pt-6 border-t border-muted-200 dark:border-muted-700">
          <BaseButton
            :disabled="!selectedWinner || loading"
            variant="default"
            size="lg"
            rounded="lg"
            :loading="loading"
            class="flex-1"
            @click="generateReceiptPDF"
          >
            <Icon name="lucide:download" class="size-4" />
            <span>Gerar PDF</span>
          </BaseButton>

          <BaseButton
            :disabled="!selectedWinner || !selectedPrinter || loading"
            variant="primary"
            size="lg"
            rounded="lg"
            :loading="loading"
            class="flex-1"
            @click="printReceipt"
          >
            <Icon name="lucide:printer" class="size-4" />
            <span>Imprimir</span>
          </BaseButton>
        </div>

        <!-- Aviso Legal -->
        <div class="mt-4 p-4 bg-info-50 dark:bg-info-900/20 rounded-lg">
          <div class="flex items-start gap-3">
            <Icon name="lucide:info" class="size-5 text-info-500 mt-0.5" />
            <div>
              <div class="font-medium text-info-700 dark:text-info-300 mb-1">
                Informação Legal
              </div>
              <div class="text-sm text-info-600 dark:text-info-400">
                Este comprovante é um documento oficial que comprova a participação e vitória no sorteio.
                Mantenha-o em local seguro para futuras verificações.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Aba de Personalização -->
      <div v-if="activeTab === 'customize'" class="space-y-6">
        <!-- Templates Pré-definidos - REMOVIDO -->

        <!-- Dados da Empresa -->
        <div>
          <BaseHeading
            as="h5"
            size="sm"
            weight="medium"
            class="text-muted-700 dark:text-muted-300 mb-3"
          >
            Dados da Empresa
          </BaseHeading>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <BaseField label="Nome da Empresa">
                <BaseInput
                  v-model="companyData.name"
                  placeholder="Nome da empresa"
                />
              </BaseField>
              <BaseField label="CNPJ">
                <BaseInput
                  v-model="companyData.cnpj"
                  placeholder="00.000.000/0000-00"
                />
              </BaseField>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <BaseField label="Endereço">
                <BaseInput
                  v-model="companyData.address"
                  placeholder="Rua, número"
                />
              </BaseField>
              <BaseField label="Cidade/Estado">
                <BaseInput
                  v-model="companyData.city"
                  placeholder="Cidade - Estado"
                />
              </BaseField>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <BaseField label="Telefone">
                <BaseInput
                  v-model="companyData.phone"
                  placeholder="(00) 00000-0000"
                />
              </BaseField>
              <BaseField label="Email">
                <BaseInput
                  v-model="companyData.email"
                  placeholder="contato@empresa.com"
                />
              </BaseField>
            </div>
            <BaseField label="Website">
              <BaseInput
                v-model="companyData.website"
                placeholder="www.empresa.com.br"
              />
            </BaseField>
            <BaseField label="Logo">
              <div class="flex items-center gap-4">
                <input
                  ref="logoInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleLogoUpload"
                >
                <BaseButton
                  variant="default"
                  size="sm"
                  rounded="lg"
                  @click="logoInput?.click()"
                >
                  <Icon name="lucide:upload" class="size-3" />
                  <span>Upload Logo</span>
                </BaseButton>
                <div v-if="companyData.logo" class="flex items-center gap-2">
                  <img :src="companyData.logo" alt="Logo" class="size-8 object-contain">
                  <BaseButton
                    variant="destructive"
                    size="sm"
                    rounded="lg"
                    @click="companyData.logo = null"
                  >
                    <Icon name="lucide:x" class="size-3" />
                  </BaseButton>
                </div>
              </div>
            </BaseField>
          </div>
        </div>

        <!-- Configurações do Layout -->
        <div>
          <BaseHeading
            as="h5"
            size="sm"
            weight="medium"
            class="text-muted-700 dark:text-muted-300 mb-3"
          >
            Configurações do Layout
          </BaseHeading>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <BaseField label="Tamanho da Fonte">
                <BaseSelect v-model="receiptConfig.fontSize">
                  <BaseSelectItem value="small">
                    Pequena
                  </BaseSelectItem>
                  <BaseSelectItem value="normal">
                    Normal
                  </BaseSelectItem>
                  <BaseSelectItem value="large">
                    Grande
                  </BaseSelectItem>
                </BaseSelect>
              </BaseField>
              <BaseField label="Largura do Papel">
                <BaseSelect v-model="receiptConfig.paperWidth">
                  <BaseSelectItem value="58mm">
                    58mm (Padrão)
                  </BaseSelectItem>
                  <BaseSelectItem value="80mm">
                    80mm (Grande)
                  </BaseSelectItem>
                </BaseSelect>
              </BaseField>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <BaseField label="Margens">
                <BaseSelect v-model="receiptConfig.margins">
                  <BaseSelectItem value="small">
                    Pequenas
                  </BaseSelectItem>
                  <BaseSelectItem value="normal">
                    Normais
                  </BaseSelectItem>
                  <BaseSelectItem value="large">
                    Grandes
                  </BaseSelectItem>
                </BaseSelect>
              </BaseField>
              <BaseField label="Idioma">
                <BaseSelect v-model="receiptConfig.language">
                  <BaseSelectItem value="pt-BR">
                    Português (BR)
                  </BaseSelectItem>
                  <BaseSelectItem value="en-US">
                    English (US)
                  </BaseSelectItem>
                  <BaseSelectItem value="es-ES">
                    Español (ES)
                  </BaseSelectItem>
                </BaseSelect>
              </BaseField>
            </div>
          </div>
        </div>

        <!-- Elementos Visuais -->
        <div>
          <BaseHeading
            as="h5"
            size="sm"
            weight="medium"
            class="text-muted-700 dark:text-muted-300 mb-3"
          >
            Elementos Visuais
          </BaseHeading>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-600 dark:text-muted-400">Mostrar Logo</span>
              <BaseSwitchThin v-model="receiptConfig.showLogo" />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-600 dark:text-muted-400">Mostrar Informações da Empresa</span>
              <BaseSwitchThin v-model="receiptConfig.showCompanyInfo" />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-600 dark:text-muted-400">Mostrar Texto Legal</span>
              <BaseSwitchThin v-model="receiptConfig.showLegalText" />
            </div>
            <!-- <div class="flex items-center justify-between">
              <span class="text-sm text-muted-600 dark:text-muted-400">Mostrar QR Code</span>
              <BaseSwitchThin v-model="receiptConfig.showQRCode" />
            </div> -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-muted-600 dark:text-muted-400">Mostrar Data/Hora</span>
              <BaseSwitchThin v-model="receiptConfig.showTimestamp" />
            </div>
          </div>
        </div>

        <!-- Campos Personalizados -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <BaseHeading
              as="h5"
              size="sm"
              weight="medium"
              class="text-muted-700 dark:text-muted-300"
            >
              Campos Personalizados
            </BaseHeading>
            <BaseButton
              variant="default"
              size="sm"
              rounded="lg"
              @click="addCustomField"
            >
              <Icon name="lucide:plus" class="size-3" />
              <span>Adicionar</span>
            </BaseButton>
          </div>
          <div class="space-y-3">
            <div
              v-for="field in receiptConfig.customFields"
              :key="field.id"
              class="border rounded-lg p-4"
            >
              <div class="grid grid-cols-3 gap-3 mb-3">
                <BaseInput
                  v-model="field.label"
                  placeholder="Rótulo do campo"
                />
                <BaseInput
                  v-model="field.value"
                  placeholder="Valor do campo"
                />
                <BaseSelect v-model="field.position">
                  <BaseSelectItem value="header">
                    Cabeçalho
                  </BaseSelectItem>
                  <BaseSelectItem value="after-winner">
                    Após Ganhador
                  </BaseSelectItem>
                  <BaseSelectItem value="after-prize">
                    Após Prêmio
                  </BaseSelectItem>
                  <BaseSelectItem value="footer">
                    Rodapé
                  </BaseSelectItem>
                </BaseSelect>
              </div>
              <div class="flex justify-end">
                <BaseButton
                  variant="destructive"
                  size="sm"
                  rounded="lg"
                  @click="removeCustomField(field.id)"
                >
                  <Icon name="lucide:trash-2" class="size-3" />
                  <span>Remover</span>
                </BaseButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Botões de Ação -->
        <div class="flex gap-3 pt-6 border-t border-muted-200 dark:border-muted-700">
          <BaseButton
            variant="primary"
            size="lg"
            rounded="lg"
            class="flex-1"
            @click="saveConfig"
          >
            <Icon name="lucide:save" class="size-4" />
            <span>Salvar Configurações</span>
          </BaseButton>
        </div>
      </div>
    </div>
  </FocusScope>
</template>
