<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { API_CONFIG } from '~/utils/config'
import { safeColors } from '~/utils/colors'
import { useApi, useAuth } from '~/composables/useAuth'
import { useSubscription } from '~/composables/useSubscription'
import { useTenant } from '~/composables/useTenant'

const { useCustomFetch } = useApi()
const { user } = useAuth()
const { tenant, fetchTenant } = useTenant()
const { currentSubscription, fetchMySubscription, loading: loadingSub } = useSubscription()
const { applyColors } = useWhitelabel()
const toaster = useNuiToasts()
const router = useRouter()

const userCookie = useCookie<any>(API_CONFIG.TOKEN.USER_COOKIE_NAME)

const currentStep = ref(0)
const complete = ref(false)
const loading = ref(false)

const steps = [
  {
    id: 0,
    meta: {
      name: 'Bem-vindo',
      title: 'Bem-vindo ao Contabilidade IR',
      subtitle: 'Vamos configurar seu ambiente em poucos passos. Você pode concluir agora e ajustar depois nas configurações.',
    },
  },
  {
    id: 1,
    meta: {
      name: 'Perfil do Usuário',
      title: 'Configure seu perfil',
      subtitle: 'Envie uma foto para personalizar sua conta',
    },
  },
  {
    id: 2,
    meta: {
      name: 'Dados da Empresa',
      title: 'Dados do seu escritório',
      subtitle: 'Preencha as informações oficiais e a chave PIX para recebimento de honorários',
    },
  },
  {
    id: 3,
    meta: {
      name: 'Cadastro de Equipe',
      title: 'Adicione sua equipe',
      subtitle: 'Convide funcionários e comece a operar com colaboradores',
    },
  },
  {
    id: 4,
    meta: {
      name: 'Whitelabel',
      title: 'Identidade visual',
      subtitle: 'Personalize as cores e a marca do sistema (se o seu plano permitir)',
    },
  },
  {
    id: 5,
    meta: {
      name: 'Finalização',
      title: 'Veja como funciona o sistema',
      subtitle: 'Estamos preparando seu ambiente. Em seguida, assista ao vídeo rápido e conclua.',
    },
  },
] as const

const totalSteps = computed(() => steps.length)
const progress = computed(() => ((currentStep.value + 1) / totalSteps.value) * 100)
const isLastStep = computed(() => currentStep.value === totalSteps.value - 1)
const currentStepMeta = computed(() => steps[currentStep.value]?.meta)
const finalStepId = computed(() => totalSteps.value - 1)

const target = ref(null)
const open = ref(false)
function openDropdown() {
  open.value = true
}
onClickOutside(target, () => (open.value = false))

const profile = ref({
  photo: null as File | null,
  photoPreview: null as string | null,
})

const company = ref({
  name: '',
  tradeName: '',
  document: '',
  pixKey: '',
})

const cnpjMask = { mask: '##.###.###/####-##' }

const logoInput = ref<HTMLInputElement | null>(null)
const isUploadingLogo = ref(false)
function triggerLogoUpload() {
  logoInput.value?.click()
}

async function handleLogoUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file)
    return

  isUploadingLogo.value = true
  try {
    const formData = new FormData()
    formData.append('logo', file)
    const { data } = await useCustomFetch<any>('/tenant/logo', {
      method: 'POST',
      body: formData,
    })
    if (data.success || data) {
      const source = data.data || data
      if (tenant.value) {
        tenant.value.logo = source.logo
      }
      toaster.add({ title: 'Sucesso', description: 'Logo atualizado!', icon: 'solar:check-circle-linear' })
    }
  }
  catch {
    toaster.add({ title: 'Erro', description: 'Erro ao enviar logo', icon: 'solar:danger-circle-linear' })
  }
  finally {
    isUploadingLogo.value = false
    if (target)
      target.value = ''
  }
}

function startOnboarding() {
  if (loading.value)
    return
  currentStep.value++
}

function continueFromTeamTrial() {
  currentStep.value++
}

const photoInput = ref<HTMLInputElement | null>(null)
const uploadingPhoto = ref(false)

function triggerPhotoUpload() {
  photoInput.value?.click()
}

async function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file)
    return

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    toaster.add({
      title: 'Erro',
      description: 'Tipo de arquivo inválido. Use JPEG, PNG ou WebP.',
      icon: 'ph:warning-fill',
    })
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toaster.add({
      title: 'Erro',
      description: 'Arquivo muito grande. Tamanho máximo: 5MB',
      icon: 'ph:warning-fill',
    })
    return
  }

  profile.value.photo = file

  const reader = new FileReader()
  reader.onload = (e) => {
    profile.value.photoPreview = e.target?.result as string
  }
  reader.readAsDataURL(file)

  await uploadPhoto(file)
}

async function uploadPhoto(file: File) {
  if (!user.value?.id)
    return

  uploadingPhoto.value = true

  try {
    const formData = new FormData()
    formData.append('photo', file)

    const { data } = await useCustomFetch<any>(`/users/${user.value.id}/upload-photo`, {
      method: 'POST',
      body: formData,
    })

    if (data?.success || data?.photoUrl) {
      const photoUrl = data.photoUrl || data.data?.photoUrl
      if (photoUrl && userCookie.value) {
        userCookie.value = {
          ...(userCookie.value || {}),
          photo: photoUrl,
        }
      }
      toaster.add({
        title: 'Sucesso',
        description: 'Foto atualizada com sucesso',
        icon: 'ph:check-circle-fill',
      })
    }
    else {
      throw new Error(data?.message || 'Erro ao enviar foto')
    }
  }
  catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Não foi possível atualizar a foto',
      icon: 'ph:warning-fill',
    })
  }
  finally {
    uploadingPhoto.value = false
    if (photoInput.value) {
      photoInput.value.value = ''
    }
  }
}

const roles = ref<any[]>([])
const loadingRoles = ref(false)

async function fetchRoles() {
  loadingRoles.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/tenant/roles', {
      method: 'GET',
    })

    if (response?.success && response?.data) {
      roles.value = response.data
    }
  }
  catch {
  }
  finally {
    loadingRoles.value = false
  }
}

const teamData = ref<any>({ data: [], total: 0 })
const pendingMembers = ref(false)

async function fetchMembers() {
  pendingMembers.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/tenant/members')

    if (response?.success && response?.data) {
      teamData.value = {
        data: response.data,
        total: response.data.length,
      }
    }
    else {
      teamData.value = { data: [], total: 0 }
    }
  }
  catch {
    teamData.value = { data: [], total: 0 }
  }
  finally {
    pendingMembers.value = false
  }
}

const totalMembers = computed(() => teamData.value?.total || 0)
const canAddMember = computed(() => {
  if (!currentSubscription.value)
    return true

  const limit = currentSubscription.value.employeesLimit || 1
  return totalMembers.value < limit
})

const teamForm = ref({
  name: '',
  email: '',
  phone: '',
  roleId: 'placeholder',
})

const isInviting = ref(false)

async function inviteMember() {
  if (!canAddMember.value) {
    toaster.add({
      title: 'Limite Atingido',
      description: 'Você atingiu o limite de colaboradores do seu plano. Faça um upgrade para adicionar mais.',
      icon: 'lucide:lock',
      duration: 5000,
    })
    return
  }

  if (!teamForm.value.name.trim() || !teamForm.value.email.trim() || !teamForm.value.phone.trim() || teamForm.value.roleId === 'placeholder') {
    toaster.add({
      title: 'Atenção',
      description: 'Preencha nome, e-mail, telefone e cargo para convidar um membro.',
      icon: 'ph:warning-fill',
    })
    return
  }

  isInviting.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/tenant/members/invite', {
      method: 'POST',
      body: {
        name: teamForm.value.name,
        email: teamForm.value.email,
        phone: teamForm.value.phone.replace(/\D/g, ''),
        roleId: teamForm.value.roleId,
      },
    })

    if (response?.success) {
      toaster.add({
        title: '✅ Convite criado',
        description: `Convite enviado para ${teamForm.value.email}`,
        icon: 'lucide:mail-check',
        duration: 5000,
      })
      teamForm.value = { name: '', email: '', phone: '', roleId: 'placeholder' }
      await fetchMembers()
    }
  }
  catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao convidar membro',
      icon: 'lucide:alert-triangle',
      duration: 5000,
    })
  }
  finally {
    isInviting.value = false
  }
}

const hasWhitelabel = computed(() => Boolean(currentSubscription.value?.hasWhitelabel))
const isTrial = computed(() => currentSubscription.value?.status === 'TRIAL')

const whitelabel = ref({
  name: '',
  tradeName: '',
  primaryColor: 'army',
  secondaryColor: 'zinc',
})

const mutedColors = [
  { name: 'slate', label: 'Slate', class: 'bg-slate-300 dark:bg-slate-700' },
  { name: 'gray', label: 'Gray', class: 'bg-gray-300 dark:bg-gray-700' },
  { name: 'zinc', label: 'Zinc', class: 'bg-zinc-300 dark:bg-zinc-700' },
  { name: 'neutral', label: 'Neutral', class: 'bg-neutral-300 dark:bg-neutral-700' },
  { name: 'stone', label: 'Stone', class: 'bg-stone-300 dark:bg-stone-700' },
]

watchDebounced(
  () => whitelabel.value.primaryColor,
  (c: string) => applyColors(c, whitelabel.value.secondaryColor, undefined, undefined, undefined, false),
  { debounce: 100 },
)
watchDebounced(
  () => whitelabel.value.secondaryColor,
  (c: string) => applyColors(whitelabel.value.primaryColor, c, undefined, undefined, undefined, false),
  { debounce: 100 },
)

async function saveCompany() {
  const payload = {
    name: company.value.name,
    document: company.value.document,
    pixKey: company.value.pixKey,
    ...(hasWhitelabel.value ? { tradeName: company.value.tradeName } : {}),
  }

  await useCustomFetch<any>('/tenant', {
    method: 'PUT',
    body: payload,
  })
  if (tenant.value) {
    tenant.value = {
      ...tenant.value,
      ...payload,
    }
  }
}

async function saveWhitelabel() {
  const payload = {
    name: whitelabel.value.name,
    tradeName: whitelabel.value.tradeName,
    primaryColor: whitelabel.value.primaryColor,
    secondaryColor: whitelabel.value.secondaryColor,
  }

  await useCustomFetch<any>('/tenant', {
    method: 'PUT',
    body: payload,
  })

  if (tenant.value) {
    tenant.value = {
      ...tenant.value,
      ...payload,
    }
  }

  applyColors(
    whitelabel.value.primaryColor,
    whitelabel.value.secondaryColor,
    tenant.value?.logo,
    whitelabel.value.name,
    whitelabel.value.tradeName,
    true,
  )
}

const isPreparing = ref(false)
const readyForVideo = ref(false)

function startPreparing() {
  isPreparing.value = true
  readyForVideo.value = false

  setTimeout(() => {
    isPreparing.value = false
    readyForVideo.value = true
  }, 2500)
}

watch(
  () => currentStep.value,
  (value) => {
    if (value === finalStepId.value) {
      startPreparing()
    }
  },
)

const shouldShowFooterContinue = computed(() => {
  if (complete.value)
    return false

  if (currentStep.value === 4 && !hasWhitelabel.value)
    return false

  if (currentStep.value === 3 && isTrial.value)
    return false

  return true
})

const nextButtonLabel = computed(() => {
  if (currentStep.value === 0)
    return 'Começar'

  return 'Continue'
})

function goToStep(id: number) {
  if (id <= currentStep.value) {
    currentStep.value = id
    open.value = false
  }
}

function prevStep() {
  if (loading.value)
    return
  if (currentStep.value > 0)
    currentStep.value--
}

async function handleSubmit() {
  if (loading.value)
    return

  loading.value = true
  try {
    if (currentStep.value === 2) {
      await saveCompany()
    }

    if (currentStep.value === 4 && hasWhitelabel.value) {
      await saveWhitelabel()
    }

    if (isLastStep.value) {
      await completeOnboarding()
      return
    }

    currentStep.value++
  }
  catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error?.message || 'Não foi possível salvar seus dados',
      icon: 'lucide:alert-triangle',
      progress: true,
    })
  }
  finally {
    loading.value = false
  }
}

async function handleUpgrade() {
  try {
    await saveCompany()
  }
  catch {
  }

  router.push('/plans')
}

function continueWithoutUpgrade() {
  currentStep.value++
}

async function completeOnboarding() {
  await useCustomFetch<any>('/tenant/onboarding/complete', {
    method: 'POST',
  })

  if (userCookie.value) {
    userCookie.value = {
      ...(userCookie.value || {}),
      onboardingStatus: 'COMPLETED',
    }
  }

  complete.value = true
  router.push('/dashboard')
}

onMounted(async () => {
  try {
    await Promise.all([
      fetchTenant(),
      fetchMySubscription(),
      fetchRoles(),
      fetchMembers(),
    ])

    const t = tenant.value
    if (t) {
      company.value = {
        name: t.name || '',
        tradeName: t.tradeName || '',
        document: t.document || '',
        pixKey: t.pixKey || '',
      }
      whitelabel.value = {
        name: t.name || '',
        tradeName: t.tradeName || '',
        primaryColor: t.primaryColor || 'army',
        secondaryColor: t.secondaryColor || 'zinc',
      }
    }
  }
  catch {
  }
})
</script>

<template>
  <div class="flex h-full max-h-[90vh] min-h-[500px] flex-col overflow-hidden bg-white dark:bg-muted-950">
    <!-- Header: Progress -->
    <div
      class="flex shrink-0 items-center justify-between border-b border-muted-200 bg-muted-50/50 p-4 px-6 dark:border-muted-800 dark:bg-muted-900/50">
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
          <Icon name="solar:stars-bold-duotone" class="size-6" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-muted-900 dark:text-white leading-tight">
            Configuração Inicial
          </h3>
          <p class="text-xs text-muted-500 dark:text-muted-400">
            Passo {{ currentStep + 1 }} de {{ totalSteps }} • {{ currentStepMeta?.name }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="hidden sm:block text-right">
          <p class="text-[10px] uppercase tracking-wider font-bold text-muted-400">Progresso</p>
          <p class="text-xs font-semibold text-primary-500">{{ Math.round(progress) }}%</p>
        </div>
        <div class="w-24 sm:w-32">
          <BaseProgress :model-value="progress" size="xs" rounded="full" variant="primary" />
        </div>
      </div>
    </div>

    <!-- Main Content: Scrollable -->
    <div class="flex-1 overflow-y-auto p-6 sm:p-10">
      <form action="" method="POST" novalidate @submit.prevent="handleSubmit">
        <!-- Step Header -->
        <div class="mb-8 text-center sm:text-left">
          <h1 class="text-2xl font-bold text-muted-900 dark:text-white sm:text-3xl">
            {{ currentStepMeta?.title }}
          </h1>
          <p class="mt-2 text-muted-600 dark:text-muted-400">
            {{ currentStepMeta?.subtitle }}
          </p>
        </div>

        <!-- Step content -->
        <Transition mode="out-in" enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2">
          <div :key="currentStep">
            <!-- Step 0: Welcome -->
            <div v-if="currentStep === 0" class="space-y-8">
              <div
                class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-muted-50/50 dark:bg-muted-900/40 p-6 rounded-2xl border border-muted-200 dark:border-muted-800">
                <div>
                  <h2 class="text-lg font-semibold text-muted-800 dark:text-white mb-4">
                    Tudo pronto para começar?
                  </h2>
                  <p class="text-sm text-muted-600 dark:text-muted-400 leading-relaxed mb-6">
                    Bem-vindo ao <b>Contabilidade IR</b>. Projetamos este guia para ajudar você a configurar seu
                    escritório em menos de 5 minutos.
                  </p>
                  <div class="space-y-4">
                    <div v-for="(item, i) in [
                      { icon: 'lucide:user', title: 'Perfil', desc: 'Sua foto e identificação' },
                      { icon: 'lucide:building-2', title: 'Empresa', desc: 'Dados fiscais e PIX' },
                      { icon: 'lucide:palette', title: 'Identidade', desc: 'Cores e Whitelabel' }
                    ]" :key="i" class="flex items-center gap-3">
                      <div
                        class="flex size-8 items-center justify-center rounded-lg bg-white dark:bg-muted-800 shadow-sm border border-muted-200 dark:border-muted-700">
                        <Icon :name="item.icon" class="size-4 text-primary-500" />
                      </div>
                      <div>
                        <p class="text-sm font-medium text-muted-800 dark:text-muted-100">{{ item.title }}</p>
                        <p class="text-[11px] text-muted-500">{{ item.desc }}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="hidden md:block relative group">
                  <div
                    class="aspect-video rounded-xl overflow-hidden shadow-2xl border-4 border-white dark:border-muted-800 rotate-2 group-hover:rotate-0 transition-transform duration-500">
                    <img src="/img/screens/dashboards-personal-2.png" alt="Dashboard"
                      class="w-full h-full object-cover dark:hidden">
                    <img src="/img/screens/dashboards-personal-2-dark.png" alt="Dashboard"
                      class="hidden w-full h-full object-cover dark:block">
                    <div class="absolute inset-0 bg-gradient-to-t from-primary-500/20 to-transparent" />
                  </div>
                  <div class="absolute -bottom-4 -right-4 size-20 bg-primary-500/10 rounded-full blur-3xl" />
                </div>
              </div>

              <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <BaseButton rounded="xl" variant="primary" size="lg" shadow="primary" class="w-full sm:w-64 h-14"
                  @click.prevent="startOnboarding">
                  <span>Vamos Começar</span>
                  <Icon name="lucide:arrow-right" class="ms-2 size-5" />
                </BaseButton>
                <BaseButton rounded="xl" size="lg" variant="ghost" class="w-full sm:w-48 h-14"
                  @click.prevent="router.push('/dashboard')">
                  <span>Pular Guia</span>
                </BaseButton>
              </div>
            </div>

            <!-- Step 1: User Profile -->
            <div v-else-if="currentStep === 1" class="max-w-md mx-auto py-4">
              <input ref="photoInput" type="file" accept="image/*" class="hidden" @change="handlePhotoChange">
              <div class="flex flex-col items-center gap-8 text-center">
                <div class="relative group">
                  <div
                    class="relative size-40 rounded-3xl overflow-hidden cursor-pointer border-2 border-dashed border-muted-200 dark:border-muted-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-300 shadow-xl"
                    @click="triggerPhotoUpload">
                    <img v-if="profile.photoPreview || user?.photo" :src="profile.photoPreview || user?.photo"
                      class="w-full h-full object-cover">
                    <div v-else
                      class="w-full h-full flex items-center justify-center bg-muted-50 dark:bg-muted-900 text-muted-300 dark:text-muted-700">
                      <Icon name="solar:user-circle-bold" class="size-24" />
                    </div>
                    <div
                      class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon v-if="uploadingPhoto" name="svg-spinners:ring-resize" class="size-10 text-white" />
                      <Icon v-else name="lucide:camera" class="size-10 text-white" />
                    </div>
                  </div>
                  <div
                    class="absolute -bottom-2 -right-2 flex size-10 items-center justify-center rounded-xl bg-primary-500 text-white shadow-lg">
                    <Icon name="lucide:plus" class="size-5" />
                  </div>
                </div>

                <div class="space-y-4">
                  <p class="text-sm text-muted-600 dark:text-muted-400">
                    Apareça para seu time e clientes! Uma foto profissional transmite mais confiança.
                  </p>
                  <BaseButton rounded="lg" shadow="flat" :disabled="uploadingPhoto" @click="triggerPhotoUpload"
                    class="h-12 px-8">
                    <Icon name="lucide:upload" class="size-4 me-2" />
                    <span>{{ (profile.photoPreview || user?.photo) ? 'Trocar Foto' : 'Subir Foto' }}</span>
                  </BaseButton>
                </div>
              </div>
            </div>

            <!-- Step 2: Company Data -->
            <div v-else-if="currentStep === 2" class="space-y-8">
              <div class="flex flex-col md:flex-row gap-10">
                <div class="shrink-0 flex flex-col items-center">
                  <div class="relative group">
                    <div
                      class="size-44 rounded-2xl border-2 border-dashed border-muted-200 dark:border-muted-800 bg-muted-50/50 dark:bg-muted-950 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-primary-500 shadow-sm">
                      <img v-if="tenant?.logo" :src="tenant.logo" alt="Logo" class="size-full object-contain p-6">
                      <div v-else class="text-center p-4">
                        <Icon name="solar:gallery-bold-duotone" class="size-12 text-muted-300 mb-2 mx-auto" />
                        <span class="text-[10px] text-muted-400 font-medium uppercase">Logo Empresa</span>
                      </div>
                      <div
                        class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <BaseButton color="white" rounded="full" size="sm" :disabled="isUploadingLogo"
                          @click="triggerLogoUpload">
                          Subir Logo
                        </BaseButton>
                      </div>
                    </div>
                    <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="handleLogoUpload">
                  </div>
                  <p class="mt-3 text-[10px] text-muted-400 text-center max-w-[120px]">Recomendamos PNG transparente</p>
                </div>

                <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div class="sm:col-span-2">
                    <BaseField label="Razão Social" required>
                      <TairoInput v-model="company.name" placeholder="Ex: Contabilidade Silva & Associados"
                        icon="solar:buildings-bold-duotone" />
                    </BaseField>
                  </div>
                  <div>
                    <BaseField label="Nome Fantasia">
                      <TairoInput v-model="company.tradeName" :disabled="!hasWhitelabel"
                        placeholder="Ex: Contábil Silva" icon="solar:shop-bold-duotone" />
                    </BaseField>
                  </div>
                  <div>
                    <BaseField label="CNPJ">
                      <TairoInput v-model="company.document" v-maska="cnpjMask" placeholder="00.000.000/0000-00"
                        icon="solar:document-text-bold-duotone" />
                    </BaseField>
                  </div>
                  <div class="sm:col-span-2 bg-primary-500/5 p-4 rounded-xl border border-primary-500/20">
                    <BaseField label="Chave PIX para Honorários" help="Seus clientes verão esta chave para pagar você.">
                      <TairoInput v-model="company.pixKey" placeholder="E-mail, CPF/CNPJ ou Aleatória"
                        icon="solar:wallet-money-bold-duotone" />
                    </BaseField>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 3: Team -->
            <div v-else-if="currentStep === 3">
              <AppPageLoading v-if="pendingMembers || loadingSub" message="Verificando seu plano..." />
              <div v-else>
                <div v-if="isTrial"
                  class="bg-muted-50/50 dark:bg-muted-900/40 p-10 rounded-3xl border border-muted-200 dark:border-muted-800 text-center">
                  <div
                    class="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-white dark:bg-muted-800 shadow-xl">
                    <Icon name="solar:lock-bold-duotone" class="size-10 text-primary-500" />
                  </div>
                  <h3 class="text-xl font-bold text-muted-800 dark:text-white mb-3">
                    Gestão de Equipe Bloqueada
                  </h3>
                  <p class="text-sm text-muted-500 dark:text-muted-400 mb-8 max-w-md mx-auto leading-relaxed">
                    Durante o período de teste, apenas você pode acessar o sistema. Faça um upgrade para convidar seus
                    colaboradores.
                  </p>
                  <div class="flex items-center justify-center gap-3">
                    <BaseButton rounded="xl" variant="primary" size="lg" shadow="primary" class="px-10"
                      @click.prevent="handleUpgrade">
                      Assinar Agora
                    </BaseButton>
                    <BaseButton rounded="xl" size="lg" @click.prevent="continueFromTeamTrial">
                      Pular por enquanto
                    </BaseButton>
                  </div>
                </div>
                <div v-else class="space-y-6">
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-semibold text-muted-800 dark:text-white">Convidar Colaborador</span>
                      <span class="text-[11px] bg-muted-100 dark:bg-muted-800 px-2 py-0.5 rounded-full text-muted-500">
                        {{ totalMembers }} / {{ currentSubscription?.employeesLimit }} usados
                      </span>
                    </div>
                  </div>
                  <div
                    class="grid grid-cols-1 sm:grid-cols-2 gap-5 p-6 bg-muted-50 dark:bg-muted-900/40 rounded-2xl border border-muted-200 dark:border-muted-800">
                    <BaseField label="Nome">
                      <BaseInput v-model="teamForm.name" placeholder="Nome completo" />
                    </BaseField>
                    <BaseField label="Email">
                      <BaseInput v-model="teamForm.email" type="email" placeholder="email@trabalho.com" />
                    </BaseField>
                    <BaseField label="Telefone">
                      <BaseInput v-model="teamForm.phone" placeholder="(00) 00000-0000" />
                    </BaseField>
                    <BaseField label="Cargo">
                      <BaseSelect v-model="teamForm.roleId">
                        <BaseSelectItem value="placeholder" disabled>Selecione um cargo</BaseSelectItem>
                        <BaseSelectItem v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}
                        </BaseSelectItem>
                      </BaseSelect>
                    </BaseField>
                    <div class="sm:col-span-2 flex justify-end">
                      <BaseButton variant="primary" :loading="isInviting" :disabled="!canAddMember"
                        @click="inviteMember">
                        <Icon name="lucide:plus" class="me-2 size-4" />
                        Adicionar à Equipe
                      </BaseButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 4: Whitelabel -->
            <div v-else-if="currentStep === 4">
              <div v-if="hasWhitelabel" class="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div class="lg:col-span-8 space-y-8">
                  <div
                    class="p-6 bg-muted-50 dark:bg-muted-900/40 rounded-2xl border border-muted-200 dark:border-muted-800">
                    <h3 class="text-xs font-bold text-muted-400 uppercase tracking-widest mb-6">Paleta de Cores</h3>
                    <div class="space-y-8">
                      <div>
                        <p class="text-[11px] text-muted-500 font-medium mb-3">COR PRINCIPAL</p>
                        <div class="flex flex-wrap gap-2">
                          <button v-for="c in safeColors" :key="c.name" type="button"
                            class="size-8 rounded-lg transition-all duration-200 hover:scale-110"
                            :class="[c.class, whitelabel.primaryColor === c.name ? 'ring-4 ring-primary-500 ring-offset-2 dark:ring-offset-muted-950 scale-110 shadow-lg' : 'opacity-80']"
                            @click="whitelabel.primaryColor = c.name" />
                        </div>
                      </div>
                      <div>
                        <p class="text-[11px] text-muted-500 font-medium mb-3">TOM DE FUNDO</p>
                        <div class="flex gap-3">
                          <button v-for="c in mutedColors" :key="c.name" type="button"
                            class="size-12 rounded-xl border-2 transition-all duration-200"
                            :class="[c.class, whitelabel.secondaryColor === c.name ? 'border-primary-500 ring-4 ring-primary-500/10' : 'border-transparent opacity-60']"
                            @click="whitelabel.secondaryColor = c.name" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <BaseField label="Nome Expositor">
                      <TairoInput v-model="whitelabel.name" icon="solar:buildings-bold-duotone" />
                    </BaseField>
                    <BaseField label="Nome Menu">
                      <TairoInput v-model="whitelabel.tradeName" icon="solar:shop-bold-duotone" />
                    </BaseField>
                  </div>
                </div>
                <div class="lg:col-span-4">
                  <div class="sticky top-0 p-6 rounded-3xl bg-muted-900 text-white shadow-2xl space-y-6">
                    <h3 class="text-xs font-bold text-primary-400 uppercase tracking-widest">Visualização</h3>
                    <div class="space-y-4">
                      <div
                        class="h-10 w-full bg-primary-500 rounded-lg flex items-center justify-center text-xs font-bold">
                        Botão Principal</div>
                      <div
                        class="h-10 w-full bg-white/10 rounded-lg flex items-center justify-center text-xs font-medium">
                        Botão Secundário</div>
                      <div class="flex gap-2">
                        <div class="size-8 rounded-full bg-primary-500" />
                        <div class="flex-1 h-8 bg-white/5 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-10">
                <div
                  class="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-muted-100 dark:bg-muted-900 animate-pulse">
                  <Icon name="solar:pallete-bold-duotone" class="size-10 text-muted-300" />
                </div>
                <h3 class="text-xl font-bold text-muted-800 dark:text-white mb-2">Whitelabel Bloqueado</h3>
                <p class="text-sm text-muted-500 mb-8 max-w-sm mx-auto">Sua marca e cores personalizadas disponíveis nos
                  planos <b>Professional</b> e <b>Enterprise</b>.</p>
                <BaseButton variant="primary" rounded="xl" shadow="primary" class="px-10 h-14"
                  @click.prevent="handleUpgrade">Liberar Agora</BaseButton>
              </div>
            </div>

            <!-- Step 5: Video / Finish -->
            <div v-else-if="currentStep === 5" class="max-w-3xl mx-auto space-y-8">
              <div v-if="isPreparing" class="py-20 flex flex-col items-center">
                <Icon name="svg-spinners:ring-resize" class="size-16 text-primary-500 mb-6" />
                <p class="text-lg font-medium text-muted-800 dark:text-white animate-pulse">Personalizando sua
                  plataforma...</p>
              </div>
              <div v-else class="space-y-6">
                <div class="aspect-video bg-muted-900 rounded-3xl overflow-hidden shadow-2xl relative group">
                  <iframe v-if="readyForVideo" class="w-full h-full border-0"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Tour do Sistema"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen />
                  <div v-else class="absolute inset-0 flex items-center justify-center">
                    <Icon name="solar:play-bold" class="size-20 text-white/20" />
                  </div>
                </div>
                <div class="flex items-center gap-4 bg-primary-500/5 p-4 rounded-2xl border border-primary-500/10">
                  <div class="flex size-10 items-center justify-center rounded-xl bg-primary-500 text-white shadow-lg">
                    <Icon name="lucide:check" class="size-6" />
                  </div>
                  <div>
                    <p class="text-sm font-bold text-muted-900 dark:text-white">Tudo configurado!</p>
                    <p class="text-xs text-muted-500">Assista este tour rápido de 60 segundos ou clique em concluir.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </form>
    </div>

    <!-- Footer: Navigation -->
    <div v-if="!complete && currentStep !== 0"
      class="shrink-0 border-t border-muted-200 bg-white p-6 px-10 dark:border-muted-800 dark:bg-muted-950">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <BaseButton rounded="xl" class="w-full sm:w-32 h-12" :disabled="loading" @click.prevent="prevStep">
          <Icon name="lucide:chevron-left" class="me-2 size-4" />
          <span>Voltar</span>
        </BaseButton>

        <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <BaseButton v-if="currentStep === 4 && !hasWhitelabel" rounded="xl" class="h-12 px-8"
            @click.prevent="continueWithoutUpgrade">
            <span>Pular Customização</span>
          </BaseButton>

          <BaseButton v-if="shouldShowFooterContinue" type="submit" rounded="xl" variant="primary" shadow="primary"
            class="w-full sm:w-48 h-12" :loading="loading" :disabled="loading" @click.prevent="handleSubmit">
            <span>{{ isLastStep ? 'Concluir' : 'Continuar' }}</span>
            <Icon v-if="!isLastStep" name="lucide:chevron-right" class="ms-2 size-4" />
            <Icon v-else name="lucide:check" class="ms-2 size-4" />
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
