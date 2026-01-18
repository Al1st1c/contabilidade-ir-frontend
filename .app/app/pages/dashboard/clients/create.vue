<script setup lang="ts">
import { useApi } from '~/composables/useAuth'
import { PanelsPanelViewDocumentDetails } from '#components'

definePageMeta({
  title: 'Cadastro de Cliente',
  preview: {
    title: 'Credit form',
    description: 'For credit application',
    categories: ['layouts', 'lists'],
    src: '/img/screens/layouts-credit.png',
    srcDark: '/img/screens/layouts-credit-dark.png',
    order: 37,
    new: true,
  },
})

// Composables
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()
const { open } = usePanels()

const showFaq = ref(false)
const step = ref(1)
const activateCashback = ref(false)
const cashback = ref(0)
const score = ref(0)
const credit = ref(0)
const observations = ref('')
const invitedBy = ref('')
const codeAccess = ref('')
const document = ref('')
const phone = ref('')
const email = ref('')
const codeValidation = ref('')
const cpf = ref('')
const masks = ref(['999.999.999-99', '99999999999'])

// Estados de loading e dados do CPF
const isLoadingCpf = ref(false)
const isCreatingUser = ref(false)
const cpfData = ref<any>(null)
const cpfConsulted = ref(false)

// Estados para 2FA
const isSendingCode = ref(false)
const isValidatingCode = ref(false)
const codeSent = ref(false)
const phoneValidated = ref(false)

// Função para iniciar cadastro (com ou sem CPF)
async function startRegistration() {
  if (!cpf.value.trim()) {
    // Se não tem CPF, vai direto para o próximo step
    nextStep()
    return
  }

  // Se tem CPF, consulta
  await consultCpf()
}

// Função para consultar CPF
async function consultCpf() {
  isLoadingCpf.value = true
  
  try {
    // Primeiro, validar se o CPF já existe no banco
    try {
      await useCustomFetch<any>('/users/validate-cpf', {
        method: 'POST',
        body: {
          cpf: cpf.value
        }
      })
    } catch (cpfError: any) {
      // Se o CPF já existe, mostrar erro e parar
      if (cpfError.statusCode === 409) {
        toaster.add({
          title: 'CPF já cadastrado',
          description: cpfError.message || 'Este CPF já está cadastrado no sistema',
          icon: 'ph:warning-circle-fill',
          duration: 6000,
        })
        return
      }
      // Se for outro tipo de erro, continuar com a consulta
      console.warn('Erro na validação de CPF:', cpfError)
    }

    // Se chegou até aqui, o CPF não existe no banco, consultar no Ares
    const { data } = await useCustomFetch<any>('/ares/consult-cpf', {
      method: 'POST',
      body: {
        cpf: cpf.value,
        showPhoneValid: false,
        showRestrictions: false
      }
    })

    if (data.success && data.data) {
      cpfData.value = data.data
      cpfConsulted.value = true
      
      // Preencher NOME e DOCUMENTO (CPF) automaticamente
      fullName.value = data.data.name || ''
      document.value = data.data.cpf || cpf.value
      
      // Se tem telefones, usar o primeiro
      if (data.data.phones && data.data.phones.length > 0) {
        phone.value = data.data.phones[0].number || ''
      }

      toaster.add({
        title: 'CPF Consultado!',
        description: `Dados encontrados para ${data.data.name}`,
        icon: 'ph:check-circle-fill',
        duration: 4000,
      })
    } else {
      // CPF não encontrado, mas preenche o campo documento com o CPF digitado
      document.value = cpf.value
      
      toaster.add({
        title: 'CPF não encontrado',
        description: 'Prossiga com o cadastro manual',
        icon: 'ph:info-circle-fill',
        duration: 3000,
      })
    }
    
    nextStep()
  } catch (error: any) {
    console.error('Erro ao consultar CPF:', error)
    
    // Mesmo com erro, preenche o campo documento com o CPF digitado
    document.value = cpf.value
    
    toaster.add({
      title: 'Erro na consulta',
      description: 'Prossiga com o cadastro manual',
      icon: 'ph:warning-circle-fill',
      duration: 3000,
    })
    
    // Mesmo com erro, permite continuar
    nextStep()
  } finally {
    isLoadingCpf.value = false
  }
}

// Função para abrir painel com detalhes do CPF
function openCpfDetails() {
  // @ts-ignore - Ignorar erro de tipagem temporariamente
  open(PanelsPanelViewDocumentDetails, { cpfData: cpfData.value })
}

// Função para enviar código 2FA
async function sendValidationCode() {
  if (!phone.value.trim()) {
    toaster.add({
      title: 'Erro!',
      description: 'Telefone é obrigatório para enviar o código de validação',
      icon: 'ph:warning-circle-fill',
      duration: 4000,
    })
    return
  }

  isSendingCode.value = true
  
  try {
    const { data } = await useCustomFetch<any>('/users/validate-phone/send-code', {
      method: 'POST',
      body: {
        phone: phone.value,
        email: email.value,
        name: fullName.value
      }
    })

    if (!data.success) {
      throw new Error(data.message || 'Erro ao enviar código')
    }

    codeSent.value = true
    
    toaster.add({
      title: 'Código Enviado!',
      description: `Código de validação enviado para ${phone.value}`,
      icon: 'ph:check-circle-fill',
      duration: 4000,
    })
    
    nextStep()
  } catch (error: any) {
    console.error('Erro ao enviar código:', error)
    
    toaster.add({
      title: 'Erro ao enviar código',
      description: error.message || 'Erro ao enviar código de validação. Tente novamente.',
      icon: 'ph:warning-circle-fill',
      duration: 4000,
    })
  } finally {
    isSendingCode.value = false
  }
}

// Função para validar código 2FA
async function validateCode() {
  if (!codeValidation.value.trim()) {
    toaster.add({
      title: 'Erro!',
      description: 'Código de validação é obrigatório',
      icon: 'ph:warning-circle-fill',
      duration: 4000,
    })
    return
  }

  isValidatingCode.value = true
  
  try {
    const { data } = await useCustomFetch<any>('/users/validate-phone/verify-code', {
      method: 'POST',
      body: {
        phone: phone.value,
        code: codeValidation.value
      }
    })

    if (!data.success) {
      throw new Error(data.message || 'Código inválido')
    }

    // Marcar telefone como validado
    phoneValidated.value = true
    
    toaster.add({
      title: 'Código Validado!',
      description: 'Telefone validado com sucesso',
      icon: 'ph:check-circle-fill',
      duration: 4000,
    })
    
    nextStep()
  } catch (error: any) {
    console.error('Erro ao validar código:', error)
    
    toaster.add({
      title: 'Código Inválido',
      description: 'Código de validação inválido. Tente novamente.',
      icon: 'ph:warning-circle-fill',
      duration: 4000,
    })
  } finally {
    isValidatingCode.value = false
  }
}

// Função para reenviar código
async function resendCode() {
  if (!phone.value.trim()) {
    toaster.add({
      title: 'Erro!',
      description: 'Telefone é obrigatório para reenviar o código de validação',
      icon: 'ph:warning-circle-fill',
      duration: 4000,
    })
    return
  }

  isSendingCode.value = true
  
  try {
    const { data } = await useCustomFetch<any>('/users/validate-phone/send-code', {
      method: 'POST',
      body: {
        phone: phone.value,
        email: email.value,
        name: fullName.value
      }
    })

    if (!data.success) {
      throw new Error(data.message || 'Erro ao reenviar código')
    }

    codeSent.value = true
    
    toaster.add({
      title: 'Código Reenviado!',
      description: `Novo código de validação enviado para ${phone.value}`,
      icon: 'ph:check-circle-fill',
      duration: 4000,
    })
    
    // Não chama nextStep() aqui para não avançar a etapa
  } catch (error: any) {
    console.error('Erro ao reenviar código:', error)
    
    toaster.add({
      title: 'Erro ao reenviar código',
      description: error.message || 'Erro ao reenviar código de validação. Tente novamente.',
      icon: 'ph:warning-circle-fill',
      duration: 4000,
    })
  } finally {
    isSendingCode.value = false
  }
}

// Função para criar usuário
async function createUser() {
  isCreatingUser.value = true
  
  try {
    // Buscar role de "Cliente" (assumindo que existe)
    const { data: rolesData } = await useCustomFetch<any>('/users/roles', {
      method: 'GET',
    })
    
    const clientRole = rolesData.find((role: any) => role.name === 'Cliente')
    if (!clientRole) {
      throw new Error('Role de Cliente não encontrada')
    }

    // Preparar dados do usuário
    const userData = {
      name: fullName.value,
      email: email.value,
      password: codeAccess.value, // Usando código de acesso como senha inicial
      phone: phone.value,
      phoneValidated: phoneValidated.value, // Campo que indica se o telefone foi validado via SMS
      document: document.value,
      roleId: clientRole.id,
      // Campos opcionais
      ...(observations.value && { observations: observations.value }),
      ...(invitedBy.value && { invitedBy: invitedBy.value }),
      ...(cpfData.value && { 
        cpfData: {
          score: cpfData.value.score,
          situation: cpfData.value.situation,
          birth: cpfData.value.birth,
        }
      }),
    }

    const { data } = await useCustomFetch<any>('/users', {
      method: 'POST',
      body: userData,
    })

    if (data.id) {
      // Se tem foto, fazer upload
      if (photo.value && photo.value.length > 0 && photo.value[0]) {
        try {
          const formData = new FormData()
          formData.append('photo', photo.value[0] as Blob)

          await useCustomFetch<any>(`/users/${data.id}/upload-photo`, {
            method: 'POST',
            body: formData,
          })

          toaster.add({
            title: 'Foto enviada!',
            description: 'Foto do cliente foi salva com sucesso',
            icon: 'ph:check-circle-fill',
            duration: 3000,
          })
        } catch (photoError: any) {
          console.error('Erro ao enviar foto:', photoError)
          toaster.add({
            title: 'Aviso',
            description: 'Cliente criado, mas houve erro ao enviar a foto',
            icon: 'ph:warning-circle-fill',
            duration: 4000,
          })
        }
      }
      
      nextStep() // Vai para o step de sucesso
    } else {
      toaster.add({
        title: 'Erro!',
        description: data.message || 'Erro ao criar usuário',
        icon: 'ph:warning-circle-fill',
        duration: 4000,
      })
    }
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    
    toaster.add({
      title: 'Erro ao cadastrar',
      description: error || 'Erro ao cadastrar cliente. Tente novamente.',
      icon: 'ph:warning-circle-fill',
      duration: 4000,
    })
  } finally {
    isCreatingUser.value = false
  }
}

const fullName = ref('')
const photo = ref<FileList | null>(null)
const isCapturing = ref(false)

const cancel = () => {
  navigateTo('/dashboard/clients')
}

function nextStep() {
  step.value += 1
}

function prevStep() {
  step.value -= 1
}

// ========== WEBCAM LOGIC ==========
const showWebcam = ref(false)
const webcamPhoto = ref<string | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)
let currentStream: MediaStream | null = null

async function openWebcam() {
  try {
    showWebcam.value = true
    
    // Aguardar o DOM renderizar
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Buscar elemento de vídeo usando window.document
    const video = window.document.getElementById('webcam-video') as HTMLVideoElement
    if (!video) {
      throw new Error('Elemento de vídeo não encontrado')
    }
    
    videoRef.value = video
    
    // Solicitar acesso à câmera
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    })
    
    // Conectar stream ao vídeo
    video.srcObject = currentStream
    
    // Aguardar vídeo carregar
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        video.play()
        resolve()
      }
    })
    
  } catch (error: any) {
    console.error('Erro ao abrir webcam:', error)
    
    let message = 'Não foi possível acessar a câmera'
    
    if (error.name === 'NotAllowedError') {
      message = 'Permissão negada para acessar a câmera'
    } else if (error.name === 'NotFoundError') {
      message = 'Nenhuma câmera encontrada'
    }
    
    toaster.add({
      title: 'Erro na câmera',
      description: message,
      icon: 'ph:warning-circle-fill',
      duration: 5000,
    })
    
    closeWebcam()
  }
}

function closeWebcam() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop())
    currentStream = null
  }
  
  if (videoRef.value) {
    videoRef.value.srcObject = null
    videoRef.value = null
  }
  
  showWebcam.value = false
}

function capturePhoto() {
  if (!videoRef.value) {
    toaster.add({
      title: 'Erro',
      description: 'Vídeo não está disponível',
      icon: 'ph:warning-circle-fill',
      duration: 3000,
    })
    return
  }
  
  isCapturing.value = true
  
  try {
    const video = videoRef.value
    
    // Criar canvas para capturar frame
    const canvas = window.document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Não foi possível criar contexto 2D')
    }
    
    // Desenhar frame do vídeo no canvas
    ctx.drawImage(video, 0, 0)
    
    // Converter para data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    webcamPhoto.value = dataUrl
    
    // Converter para File
    canvas.toBlob((blob: Blob | null) => {
      if (blob) {
        const file = new File([blob], 'webcam-photo.jpg', { type: 'image/jpeg' })
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        photo.value = dataTransfer.files
      }
    }, 'image/jpeg', 0.9)
    
    toaster.add({
      title: 'Foto capturada!',
      description: 'Imagem salva com sucesso',
      icon: 'ph:check-circle-fill',
      duration: 3000,
    })
    
    closeWebcam()
    
  } catch (error: any) {
    console.error('Erro ao capturar foto:', error)
    toaster.add({
      title: 'Erro na captura',
      description: 'Não foi possível capturar a foto',
      icon: 'ph:warning-circle-fill',
      duration: 4000,
    })
  } finally {
    isCapturing.value = false
  }
}

function retakePhoto() {
  webcamPhoto.value = null
  photo.value = null
  openWebcam()
}

// Limpar recursos ao desmontar
onUnmounted(() => {
  closeWebcam()
})
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="flex min-h-[450px] items-center">
      <!-- Step 1 -->
      <div
        v-if="step === 1"
        class="flex w-full flex-col items-center md:flex-row"
      >
        <!-- Column -->
        <div v-if="!showFaq" class="w-full md:w-1/2">
          <div class="max-w-md space-y-3 p-4">
            <BaseHeading
              as="h2"
              weight="bold"
              size="3xl"
              lead="tight"
              class="text-muted-800 dark:text-white"
            >
              Boa! Vamos adicionar um novo cliente na casa.
            </BaseHeading>
            <BaseParagraph class="text-muted-500 dark:text-muted-400">
              Preencha o CPF do cliente, o sistema irá buscar automaticamente as informações, ou deixe em branco para iniciar sem CPF.
            </BaseParagraph>

            <BaseField label="CPF">
              <BaseInput
                v-model="cpf"
                placeholder="000.000.000-00"
                :masks="masks"
              />
            </BaseField>


            <div class="flex gap-2">
              <BaseButton
                rounded="md"
                variant="primary"
                class="w-32"
                :loading="isLoadingCpf"
                :disabled="isLoadingCpf"
                @click="startRegistration()"
              >
                {{ isLoadingCpf ? 'Consultando...' : 'Iniciar' }}
              </BaseButton>
              <BaseButton
                rounded="md"
                variant="muted"
                class="w-32"
                :disabled="isLoadingCpf"
                @click="cancel()"
              >
                Cancelar
              </BaseButton>
            </div>
          </div>
        </div>
        <!-- Column -->
        <div v-if="!showFaq" class="w-full md:w-1/2">
          <div class="text-primary-500 mx-auto max-w-sm">
            <VectorIllustrationManWondering />
          </div>
        </div>
      </div>

      <!-- Step 2 -->
      <div
        v-else-if="step === 2"
        class="flex w-full flex-col items-center md:flex-row"
      >
        <!-- Column -->
        <div class="w-full md:w-1/2">
          <div class="max-w-md space-y-3 p-4">
            <BaseHeading
              as="h2"
              weight="bold"
              size="3xl"
              lead="tight"
              class="text-muted-800 dark:text-white"
            >
              Dados Cadastrais
            </BaseHeading>
            <BaseParagraph class="text-muted-500 dark:text-muted-400">
              Esses dados serão utilizados para identificar o cliente e para fins de contato.
            </BaseParagraph>
            
            <!-- Indicador de CPF consultado -->
            <div v-if="cpfConsulted && cpfData" class="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-3 mb-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Icon name="ph:check-circle-fill" class="size-5 text-success-600" />
                  <div>
                    <BaseText size="sm" weight="medium" class="text-success-800 dark:text-success-200">
                      CPF consultado com sucesso
                    </BaseText>
                    <br />
                    <BaseText size="xs" class="text-success-600 dark:text-success-400">
                      Dados preenchidos automaticamente
                    </BaseText>
                  </div>
                </div>
                <BaseButton
                  size="sm"
                  variant="muted"
                  rounded="md"
                  @click="openCpfDetails()"
                >
                  <Icon name="ph:eye" class="size-4 me-1" />
                  Detalhes
                </BaseButton>
              </div>
            </div>
            <!-- Form -->
            <form class="space-y-4 pb-6">

              <BaseField label="Foto">
                <div class="space-y-3">
                  <!-- Preview da foto capturada -->
                  <div v-if="webcamPhoto" class="relative inline-block">
                    <img 
                      :src="webcamPhoto" 
                      alt="Foto capturada" 
                      class="w-32 h-32 object-cover rounded-lg border-2 border-primary-500 dark:border-primary-600"
                    />
                    <button
                      @click="retakePhoto"
                      class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                      type="button"
                    >
                      <Icon name="ph:x" class="size-4" />
                    </button>
                  </div>
                  
                  <!-- Botões de ação -->
                  <div v-if="!webcamPhoto" class="flex gap-2">
                    <BaseButton
                      @click="openWebcam"
                      variant="primary"
                      size="sm"
                      rounded="md"
                      type="button"
                    >
                      <Icon name="ph:camera" class="size-4 me-2" />
                      Tirar Foto
                    </BaseButton>
                  </div>
                </div>
              </BaseField>
              <BaseField v-slot="{ inputAttrs, inputRef }" label="Nome Completo">
                <TairoInput
                  :ref="inputRef"
                  v-bind="inputAttrs"
                  v-model="fullName"
                  icon="solar:user-rounded-linear"
                  placeholder="Ex: José Lima"
                  class="w-full"
                />
              </BaseField>
              <div class="grid gap-4 md:grid-cols-2">
                <!-- Field -->
                <BaseField label="Documento">
                  <BaseInput
                    v-model="document"
                    placeholder="000.000.000-00"
                    :masks="masks"
                  />
                </BaseField>
                <!-- Field -->
                <BaseField label="Telefone">
                  <BaseInput
                    v-model="phone"
                    placeholder="Ex: (11) 11111-1111"
                  />
                </BaseField>
              </div>
              <BaseField label="Email">
                <BaseInput
                  v-model="email"
                  placeholder="Ex: jose@gmail.com"
                />
              </BaseField>

              <BaseField label="Código de Acesso (6 dígitos)">
                <BaseInput
                  v-model="codeAccess"
                  placeholder="Ex: 123456"
                />
              </BaseField>

              <BaseField label="Convidado por">
                <BaseInput
                  v-model="invitedBy"
                  placeholder="Ex: José Lima"
                />
              </BaseField>

              <BaseField label="Observações">
                <BaseTextarea
                  v-model="observations"
                  placeholder="Ex: Observações"
                />
              </BaseField>
            </form>

            <!-- Buttons -->
            <div class="flex gap-2">
              <BaseButton
                rounded="md"
                variant="muted"
                class="w-32"
                :disabled="isSendingCode"
                @click="prevStep()"
              >
                Voltar
              </BaseButton>
              <BaseButton
                rounded="md"
                variant="primary"
                class="w-32"
                :loading="isSendingCode"
                :disabled="isSendingCode"
                @click="sendValidationCode()"
              >
                {{ isSendingCode ? 'Enviando...' : 'Avançar' }}
              </BaseButton>
            </div>
          </div>
        </div>
        <!-- Column -->
        <div class="w-full md:w-1/2">
          <div class="text-primary-500 mx-auto max-w-sm">
            <VectorIllustrationTransaction />
          </div>
        </div>
      </div>

      <!-- Step 3 -->
      <div
        v-else-if="step === 3"
        class="flex w-full flex-col items-center md:flex-row"
      >
        <!-- Column -->
        <div class="w-full md:w-1/2">
          <div class="max-w-md space-y-3 p-4">
            <BaseHeading
              as="h2"
              weight="bold"
              size="3xl"
              lead="tight"
              class="text-muted-800 dark:text-white"
            >
              Validação de Conta
            </BaseHeading>
            <BaseParagraph class="text-muted-500 dark:text-muted-400">
              Foi enviado um código de validação para o telefone {{ phone }}. Preencha o código informado.
            </BaseParagraph>
            
            <!-- Status do envio -->
            <div v-if="codeSent" class="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-3 mb-4">
              <div class="flex items-center gap-2">
                <Icon name="ph:check-circle-fill" class="size-5 text-success-600" />
                <div>
                  <BaseText size="sm" weight="medium" class="text-success-800 dark:text-success-200">
                    Código enviado com sucesso
                  </BaseText>
                  <BaseText size="xs" class="text-success-600 dark:text-success-400">
                    Verifique seu telefone
                  </BaseText>
                </div>
              </div>
            </div>
            
            <BaseField label="Código de Validação">
              <BaseInput
                v-model="codeValidation"
                placeholder="Ex: 12345"
                maxlength="5"
              />
            </BaseField>

            <!-- Botão reenviar -->
            <div class="text-left">
              <BaseButton
                variant="muted"
                size="sm"
                rounded="md"
                :loading="isSendingCode"
                :disabled="isSendingCode"
                @click="resendCode()"
              >
                <Icon name="ph:arrow-clockwise" class="size-4 me-1" />
                {{ isSendingCode ? 'Reenviando...' : 'Reenviar Código' }}
              </BaseButton>
            </div>

            <BaseParagraph class="text-primary-500 dark:text-primary-400" font="sans" weight="medium" size="sm">
              Não é obrigatório confirmar o telefone, você pode pular essa etapa clicando em "Pular Validação". 
            </BaseParagraph>

            <!-- Buttons -->
            <div class="flex gap-2">
              <BaseButton
                rounded="md"
                variant="muted"
                class="w-32"
                :disabled="isValidatingCode"
                @click="prevStep()"
              >
                Voltar
              </BaseButton>
              <BaseButton
                rounded="md"
                variant="ghost"
                class="w-32"
                :disabled="isValidatingCode"
                @click="nextStep()"
              >
                Pular Validação
              </BaseButton>
              <BaseButton
                rounded="md"
                variant="primary"
                class="w-32"
                :loading="isValidatingCode"
                :disabled="isValidatingCode || !codeValidation.trim()"
                @click="validateCode()"
              >
                {{ isValidatingCode ? 'Validando...' : 'Validar' }}
              </BaseButton>
            </div>
          </div>
        </div>
        <!-- Column -->
        <div class="w-full md:w-1/2">
          <div class="text-primary-500 mx-auto max-w-sm">
            <VectorIllustrationCreditCard />
          </div>
        </div>
      </div>

       <!-- Step 3 -->
       <div
        v-else-if="step === 4"
        class="flex w-full flex-col items-center md:flex-row"
      >
        <!-- Column -->
        <div class="w-full md:w-1/2">
          <div class="max-w-md space-y-3 p-4">
            <BaseHeading
              as="h2"
              weight="bold"
              size="3xl"
              lead="tight"
              class="text-muted-800 dark:text-white"
            >
              Adicionar Crédito
            </BaseHeading>
            <BaseParagraph class="text-muted-500 dark:text-muted-400">
              Informe o valor em reais que o cliente irá receber em fichas.
            </BaseParagraph>
            <BaseField label="Valor de Entrada (R$)">
              <BaseInput
                v-model="credit"
                placeholder="Ex: 100,00"
              />
            </BaseField>

             <BaseField>
               <template #label>
                 <div class="flex items-center gap-2">
                   <span>Bônus</span>
                   <BasePopover size="sm">
                     <span class="text-primary-500 flex items-center cursor-pointer">
                       <Icon name="lucide:help-circle" class="size-4" />
                     </span>

                     <template #content>
                       <TairoPopoverContentHelp
                         title="Cashback"
                         subtitle="Como funciona o cashback"
                         text="O cashback é adicionado direto ao saldo do cliente, sob o calculo: (valor de entrada - valor de saque) * % de cashback. É um percentual do valor apostado que é devolvido ao cliente."
                         icon="material-symbols:attach-money"
                         icon-color="success"
                       />
                     </template>
                   </BasePopover>
                 </div>
               </template>
               
               <BaseCheckbox v-model="activateCashback" label="Cashback automático" />
               <BaseInput
                 v-if="activateCashback"
                 v-model="cashback"
                 placeholder="Digite a % de cashback (Ex: 10)"
               />
             </BaseField>

             <BaseField>
               <template #label>
                 <div class="flex items-center gap-2">
                   <span>Análise de Risco</span>
                   <BasePopover size="sm">
                     <span class="text-warning-500 flex items-center cursor-pointer">
                       <Icon name="uil:money-withdrawal" class="size-4" />
                     </span>

                     <template #content>
                       <TairoPopoverContentHelp
                         title="Análise de Risco"
                         subtitle="Score de Risco"
                         text="Scores mais altos indicam que o cliente é baixo risco, tende a apostar pouco, não ganha muito. Scores menores são para clientes de alto risco, deposita muito e tem altas chances de ganhar."
                         icon="material-symbols:security"
                         icon-color="warning"
                       />
                     </template>
                   </BasePopover>
                 </div>
               </template>
               
               <BaseSelect
                 v-model="score"
                 placeholder="Selecione o score"
               >
                 <BaseSelectItem value="1">
                   Score Baixo 
                 </BaseSelectItem>
                 <BaseSelectItem value="2">
                   Score Médio
                 </BaseSelectItem>
                 <BaseSelectItem value="3">
                   Score Alto
                 </BaseSelectItem>
                 <BaseSelectItem value="4">
                   Score Muito Alto
                 </BaseSelectItem>
               </BaseSelect>
             </BaseField>
           


            <!-- Buttons -->
            <div class="flex gap-2">
              <BaseButton
                rounded="md"
                variant="muted"
                class="w-32"
                :disabled="isCreatingUser"
                @click="prevStep()"
              >
                Voltar
              </BaseButton>
              <BaseButton
                rounded="md"
                variant="primary"
                class="w-32"
                :loading="isCreatingUser"
                :disabled="isCreatingUser"
                @click="createUser()"
              >
                {{ isCreatingUser ? 'Criando...' : 'Finalizar' }}
              </BaseButton>
            </div>
          </div>
        </div>
        <!-- Column -->
        <div class="w-full md:w-1/2">
          <div class="text-primary-500 mx-auto max-w-sm">
            <VectorIllustrationCreditCard />
          </div>
        </div>
      </div>

      <!-- Step 4 -->
      <div v-else-if="step === 5" class="flex w-full items-center">
        <div class="mx-auto w-full max-w-md py-6 text-center">
          <div class="text-primary-500 mx-auto mb-4 size-14">
            <TairoCheckAnimated color="primary" size="lg" />
          </div>
          <BaseHeading
            as="h2"
            weight="medium"
            size="2xl"
            lead="tight"
            class="text-muted-800 mb-2 dark:text-white"
          >
            Cliente cadastrado com sucesso!
          </BaseHeading>
          <BaseParagraph class="text-muted-500 dark:text-muted-400 mb-5">
            O cliente foi cadastrado com sucesso e já foi contabilizado a entrada.
          </BaseParagraph>

          <div class="flex justify-center">
            <BaseButton
              to="/dashboard/clients"
              variant="primary"
              rounded="md"
              class="w-48"
            >
              Voltar para Clientes
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal da Webcam -->
    <div
      v-if="showWebcam"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="closeWebcam"
    >
      <div class="bg-white dark:bg-muted-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div class="flex items-center justify-between mb-4">
          <BaseHeading
            as="h3"
            size="lg"
            weight="medium"
            class="text-muted-900 dark:text-muted-100"
          >
            Capturar Foto
          </BaseHeading>
          <BaseButton
            @click="closeWebcam"
            variant="muted"
            size="sm"
            rounded="full"
            type="button"
          >
            <Icon name="ph:x" class="size-4" />
          </BaseButton>
        </div>
        
        <!-- Vídeo da webcam -->
        <div class="relative mb-4">
          <video
            id="webcam-video"
            autoplay
            muted
            playsinline
            class="w-full h-64 object-cover rounded-lg border-2 border-muted-200 dark:border-muted-700"
          ></video>
          
          <!-- Overlay de captura -->
          <div class="absolute inset-0 border-4 border-primary-500 rounded-lg pointer-events-none"></div>
        </div>
        
        <!-- Instruções -->
        <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400 mb-4 text-center">
          Posicione o rosto dentro da área destacada e clique em "Capturar"
        </BaseParagraph>
        
        <!-- Botões de ação -->
        <div class="flex gap-3">
          <BaseButton
            @click="closeWebcam"
            variant="muted"
            rounded="md"
            class="flex-1"
            type="button"
          >
            <Icon name="ph:x" class="size-4 me-2" />
            Cancelar
          </BaseButton>
          
          <BaseButton
            @click="capturePhoto"
            variant="primary"
            rounded="md"
            class="flex-1"
            :loading="isCapturing"
            :disabled="isCapturing"
            type="button"
          >
            <Icon name="ph:camera" class="size-4 me-2" />
            {{ isCapturing ? 'Capturando...' : 'Capturar' }}
          </BaseButton>
        </div>
      </div>
    </div>

  </div>
</template>
