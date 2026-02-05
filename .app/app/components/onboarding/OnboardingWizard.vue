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
      name: 'Perfil do Usuário',
      title: 'Configure seu perfil',
      subtitle: 'Envie uma foto para personalizar sua conta',
    },
  },
  {
    id: 1,
    meta: {
      name: 'Dados da Empresa',
      title: 'Dados do seu escritório',
      subtitle: 'Preencha as informações oficiais e a chave PIX para recebimento de honorários',
    },
  },
  {
    id: 2,
    meta: {
      name: 'Cadastro de Equipe',
      title: 'Adicione sua equipe',
      subtitle: 'Convide funcionários e comece a operar com colaboradores',
    },
  },
  {
    id: 3,
    meta: {
      name: 'Whitelabel',
      title: 'Identidade visual',
      subtitle: 'Personalize as cores e a marca do sistema (se o seu plano permitir)',
    },
  },
  {
    id: 4,
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
    if (value === 4) {
      startPreparing()
    }
  },
)

const shouldShowFooterContinue = computed(() => {
  if (complete.value)
    return false

  if (currentStep.value === 3 && !hasWhitelabel.value)
    return false

  return true
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
    if (currentStep.value === 1) {
      await saveCompany()
    }

    if (currentStep.value === 3 && hasWhitelabel.value) {
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
  <TairoSidebarLayout
    :toolbar="false"
    :sidebar="false"
    class="bg-muted-100 dark:bg-muted-900 min-h-screen w-full"
  >
    <template #logo>
      <NuxtLink
        to="/dashboard"
        class="text-muted-400 hover:text-primary-500 hover:bg-primary-500/20 flex size-12 items-center justify-center rounded-2xl transition-colors duration-300"
        @click.prevent="router.push('/dashboard')"
      >
        <Icon name="lucide:arrow-left" class="size-5" />
      </NuxtLink>
    </template>

    <div class="dark:bg-muted-950 absolute start-0 top-0 h-16 w-full bg-white">
      <div class="relative flex h-16 w-full items-center justify-between px-4">
        <div class="flex items-center">
          <NuxtLink
            to="/dashboard"
            class="border-muted-200 dark:border-muted-800 flex w-14 items-center justify-center border-r pe-6"
          >
            <TairoLogo class="text-primary-600 h-8 shrink-0" />
          </NuxtLink>
          <div class="hidden items-center gap-2 ps-6 font-sans sm:flex">
            <p class="text-muted-500 dark:text-muted-400">
              Step {{ currentStep + 1 }}:
            </p>
            <h2 class="text-muted-800 font-semibold dark:text-white">
              {{ currentStepMeta?.name }}
            </h2>
          </div>
          <div ref="target" class="relative hidden sm:block">
            <button
              type="button"
              class="flex size-10 items-center justify-center"
              @click="openDropdown"
            >
              <Icon
                name="lucide:chevron-down"
                class="text-muted-400 size-4 transition-transform duration-300"
                :class="open ? 'rotate-180' : ''"
              />
            </button>
            <div
              class="border-muted-200 dark:border-muted-800 dark:bg-muted-950 shadow-muted-300/30 dark:shadow-muted-900/30 absolute start-0 top-8 z-20 w-52 rounded-xl border bg-white p-2 shadow-xl transition-all duration-300"
              :class="
                open
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 pointer-events-none translate-y-1'
              "
            >
              <div class="space-y-1">
                <button
                  v-for="step in steps"
                  :key="step.id"
                  type="button"
                  class="cursor-pointer hover:bg-muted-100 dark:hover:bg-muted-900 flex w-full items-center gap-2 rounded-lg px-3 py-2 font-sans disabled:cursor-not-allowed disabled:opacity-70"
                  :disabled="step.id > currentStep"
                  @click="goToStep(step.id)"
                >
                  <p class="text-muted-500 dark:text-muted-400 text-xs">
                    Step {{ step.id + 1 }}:
                  </p>
                  <h4 class="text-muted-800 text-xs font-medium dark:text-white">
                    {{ step.meta.name }}
                  </h4>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-4">
          <BaseThemeToggle />
          <DemoAccountMenu horizontal />
        </div>
        <div class="absolute inset-x-0 bottom-0 z-10 w-full">
          <BaseProgress
            :model-value="progress"
            size="xs"
            rounded="full"
            variant="primary"
          />
        </div>
      </div>
    </div>

    <form
      action=""
      method="POST"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <div class="pb-32 pt-24">
        <div class="mb-10 text-center">
          <BaseHeading
            tag="h1"
            size="2xl"
            weight="medium"
            class="text-muted-900 dark:text-white"
          >
            <span>{{ currentStepMeta?.title }}</span>
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-400">
            <span>{{ currentStepMeta?.subtitle }}</span>
          </BaseParagraph>
        </div>

        <div v-if="currentStep === 0" class="mx-auto flex w-full max-w-5xl flex-col px-4">
          <BaseCard rounded="lg" class="p-8">
            <input
              ref="photoInput"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              class="hidden"
              @change="handlePhotoChange"
            >
            <div class="flex flex-col items-center gap-6 text-center">
              <div class="relative group">
                <div
                  class="relative size-24 rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-muted-200 dark:border-muted-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
                  @click="triggerPhotoUpload"
                >
                  <img
                    v-if="profile.photoPreview || user?.photo"
                    :src="profile.photoPreview || user?.photo"
                    class="w-full h-full object-cover"
                  >
                  <div v-else class="w-full h-full flex items-center justify-center bg-muted-100 dark:bg-muted-800">
                    <BaseText size="2xl" weight="semibold" class="text-muted-400">
                      {{ user?.name?.charAt(0) || 'U' }}
                    </BaseText>
                  </div>

                  <div
                    class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    :class="{ 'opacity-100': uploadingPhoto }"
                  >
                    <Icon v-if="uploadingPhoto" name="svg-spinners:ring-resize" class="size-8 text-white" />
                    <Icon v-else name="lucide:camera" class="size-8 text-white" />
                  </div>
                </div>
              </div>

              <div class="max-w-sm">
                <BaseHeading size="lg" weight="medium" class="text-muted-800 dark:text-muted-100">
                  Foto de perfil
                </BaseHeading>
                <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
                  Envie uma imagem para personalizar seu perfil no sistema.
                </BaseParagraph>
              </div>

              <div class="flex items-center gap-2">
                <BaseButton size="sm" rounded="lg" :disabled="uploadingPhoto" @click="triggerPhotoUpload">
                  <Icon name="lucide:upload" class="size-3.5" />
                  <span>{{ (profile.photoPreview || user?.photo) ? 'Alterar Foto' : 'Adicionar Foto' }}</span>
                </BaseButton>
              </div>

              <BaseParagraph size="xs" class="text-muted-400">
                <Icon name="lucide:info" class="size-3 inline me-1" />
                Formatos aceitos: JPEG, PNG, WebP. Tamanho máximo: 5MB.
              </BaseParagraph>
            </div>
          </BaseCard>
        </div>

        <div v-else-if="currentStep === 1" class="mx-auto flex w-full max-w-5xl flex-col px-4">
          <BaseCard rounded="lg" class="p-8">
            <div class="flex flex-col sm:flex-row items-center gap-10">
              <div class="relative group">
                <div
                  class="size-40 rounded-2xl border-2 border-dashed border-muted-200 dark:border-muted-800 bg-muted-50/50 dark:bg-muted-950 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-primary-500"
                >
                  <img v-if="tenant?.logo" :src="tenant.logo" alt="Logo" class="size-full object-contain p-4">
                  <Icon v-else name="solar:gallery-linear" class="size-16 text-muted-300" />

                  <div
                    class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                  >
                    <BaseButton color="white" rounded="full" size="sm" :disabled="isUploadingLogo" @click="triggerLogoUpload">
                      Alterar
                    </BaseButton>
                  </div>
                </div>
              </div>

              <div class="flex-1 space-y-6">
                <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="handleLogoUpload">

                <div class="grid grid-cols-12 gap-6">
                  <div class="col-span-12">
                    <BaseField label="Razão Social" required>
                      <TairoInput
                        v-model="company.name"
                        placeholder="Ex: Contabilidade Silva & Associados"
                        icon="solar:buildings-linear"
                      />
                    </BaseField>
                  </div>

                  <div class="col-span-12 md:col-span-6">
                    <BaseField label="Nome Fantasia">
                      <TairoInput
                        v-model="company.tradeName"
                        :disabled="!hasWhitelabel"
                        placeholder="Ex: Contábil Silva"
                        icon="solar:shop-linear"
                      />
                    </BaseField>
                  </div>

                  <div class="col-span-12 md:col-span-6">
                    <BaseField label="CNPJ">
                      <TairoInput
                        v-model="company.document"
                        v-maska="cnpjMask"
                        placeholder="00.000.000/0000-00"
                        icon="solar:document-text-linear"
                      />
                    </BaseField>
                  </div>

                  <div class="col-span-12 md:col-span-6">
                    <BaseField label="Chave PIX (Vai aparecer para o cliente pagar os honorários)">
                      <TairoInput
                        v-model="company.pixKey"
                        placeholder="E-mail, CPF/CNPJ ou Aleatória"
                        icon="solar:wallet-money-linear"
                      />
                    </BaseField>
                  </div>
                </div>
              </div>
            </div>
          </BaseCard>
        </div>

        <div v-else-if="currentStep === 2" class="mx-auto flex w-full max-w-5xl flex-col px-4">
          <AppPageLoading v-if="pendingMembers || loadingSub" message="Carregando equipe e limites..." />

          <div v-else class="space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <BaseHeading tag="h2" size="lg" weight="medium" class="text-muted-800 dark:text-muted-100">
                  Convites de Equipe
                </BaseHeading>
                <BaseParagraph size="sm" class="text-muted-400">
                  <span v-if="currentSubscription" class="ms-2 text-xs bg-muted-100 dark:bg-muted-800 px-2 py-0.5 rounded-full">
                    {{ totalMembers }} / {{ currentSubscription.employeesLimit }}
                  </span>
                </BaseParagraph>
              </div>
            </div>

            <AppLimitAlert
              v-if="!canAddMember"
              title="Limite de Equipe Atingido"
              description="Você atingiu o número máximo de colaboradores permitidos no seu plano atual. Ative um plano superior para adicionar mais membros e escalar sua operação."
            />

            <BaseCard rounded="lg" class="p-6">
              <div class="space-y-6">
                <div class="grid grid-cols-12 gap-6">
                  <div class="col-span-12 md:col-span-6">
                    <BaseField label="Nome completo *">
                      <BaseInput v-model="teamForm.name" placeholder="Nome do funcionário" :disabled="isInviting || !canAddMember" />
                    </BaseField>
                  </div>
                  <div class="col-span-12 md:col-span-6">
                    <BaseField label="Email *">
                      <BaseInput v-model="teamForm.email" type="email" placeholder="email@exemplo.com" :disabled="isInviting || !canAddMember" />
                    </BaseField>
                  </div>
                  <div class="col-span-12 md:col-span-6">
                    <BaseField label="Telefone *">
                      <BaseInput v-model="teamForm.phone" placeholder="(00) 00000-0000" maxlength="15" :disabled="isInviting || !canAddMember" />
                    </BaseField>
                  </div>
                  <div class="col-span-12 md:col-span-6">
                    <BaseField label="Cargo *">
                      <BaseSelect v-model="teamForm.roleId" :disabled="isInviting || loadingRoles || !canAddMember">
                        <BaseSelectItem value="placeholder" disabled>
                          {{ loadingRoles ? 'Carregando...' : 'Selecione um cargo' }}
                        </BaseSelectItem>
                        <BaseSelectItem v-for="role in roles" :key="role.id" :value="role.id">
                          {{ role.name }}
                        </BaseSelectItem>
                      </BaseSelect>
                    </BaseField>
                  </div>
                </div>

                <div class="flex items-center justify-end gap-3 pt-2">
                  <BaseButton type="button" variant="primary" rounded="lg" :loading="isInviting" :disabled="isInviting || !canAddMember" @click="inviteMember">
                    <Icon v-if="!isInviting" name="lucide:send" class="mr-2 size-4" />
                    {{ isInviting ? 'Enviando...' : 'Enviar Convite' }}
                  </BaseButton>
                </div>
              </div>
            </BaseCard>
          </div>
        </div>

        <div v-else-if="currentStep === 3" class="mx-auto flex w-full max-w-5xl flex-col px-4">
          <BaseCard rounded="lg" class="p-8">
            <div v-if="hasWhitelabel" class="space-y-10">
              <div>
                <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-400 uppercase tracking-widest mb-4">
                  Cor Primária (Marca)
                </BaseHeading>
                <div class="grid grid-cols-6 sm:grid-cols-11 gap-3">
                  <button
                    v-for="c in safeColors"
                    :key="c.name"
                    type="button"
                    class="size-10 rounded-xl transition-all duration-200"
                    :class="[
                      c.class,
                      whitelabel.primaryColor === c.name
                        ? 'ring-4 ring-primary-500 ring-offset-2 dark:ring-offset-muted-950 scale-110 shadow-lg'
                        : 'hover:scale-110 opacity-80 hover:opacity-100',
                    ]"
                    @click="whitelabel.primaryColor = c.name"
                  />
                </div>
              </div>

              <div>
                <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-400 uppercase tracking-widest mb-4">
                  Tom de Fundo (Muted)
                </BaseHeading>
                <div class="flex flex-wrap gap-4">
                  <button
                    v-for="c in mutedColors"
                    :key="c.name"
                    type="button"
                    class="size-14 rounded-xl border-2 transition-all duration-200"
                    :class="[
                      c.class,
                      whitelabel.secondaryColor === c.name
                        ? 'border-primary-500 ring-4 ring-primary-500/20 scale-110'
                        : 'border-transparent hover:scale-105 opacity-60 hover:opacity-100',
                    ]"
                    @click="whitelabel.secondaryColor = c.name"
                  />
                </div>
              </div>

              <div class="grid grid-cols-12 gap-6">
                <div class="col-span-12 md:col-span-6">
                  <BaseField label="Nome por Extenso">
                    <TairoInput v-model="whitelabel.name" placeholder="Ex: Contabilidade Silva" icon="solar:buildings-bold-duotone" />
                  </BaseField>
                </div>
                <div class="col-span-12 md:col-span-6">
                  <BaseField label="Nome Curto (Menu)">
                    <TairoInput v-model="whitelabel.tradeName" placeholder="Ex: Contábil Silva" icon="solar:shop-bold-duotone" />
                  </BaseField>
                </div>
              </div>

              <div class="p-6 rounded-2xl bg-muted-50/50 dark:bg-muted-900/50 border border-muted-200 dark:border-muted-800 shadow-inner">
                <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-400 mb-6 uppercase tracking-widest">
                  Preview em Tempo Real
                </BaseHeading>
                <div class="flex flex-wrap items-center gap-6">
                  <BaseButton variant="primary" class="shadow-lg shadow-primary-500/20">
                    Botão Principal
                  </BaseButton>
                  <BaseButton variant="muted">
                    Botão Neutro
                  </BaseButton>
                  <BaseTag variant="none" rounded="lg" class="px-4 py-2 font-bold bg-primary-500/20 text-primary-500">
                    Status Badge
                  </BaseTag>
                  <div class="flex gap-2">
                    <div class="size-10 rounded-full bg-primary-500 shadow-lg" />
                    <div class="size-10 rounded-full bg-primary-200 dark:bg-primary-900/40" />
                  </div>
                </div>
              </div>
            </div>

            <div v-else>
              <div class="relative">
                <div class="opacity-60 pointer-events-none">
                  <div class="space-y-10">
                    <div>
                      <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-400 uppercase tracking-widest mb-4">
                        Cor Primária (Marca)
                      </BaseHeading>
                      <div class="grid grid-cols-6 sm:grid-cols-11 gap-3">
                        <button v-for="c in safeColors" :key="c.name" type="button" class="size-10 rounded-xl transition-all duration-200" :class="c.class" />
                      </div>
                    </div>

                    <div>
                      <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-400 uppercase tracking-widest mb-4">
                        Tom de Fundo (Muted)
                      </BaseHeading>
                      <div class="flex flex-wrap gap-4">
                        <button v-for="c in mutedColors" :key="c.name" type="button" class="size-14 rounded-xl border-2 transition-all duration-200" :class="c.class" />
                      </div>
                    </div>

                    <div class="p-6 rounded-2xl bg-muted-50/50 dark:bg-muted-900/50 border border-muted-200 dark:border-muted-800 shadow-inner">
                      <BaseHeading as="h4" size="xs" weight="semibold" class="text-muted-400 mb-6 uppercase tracking-widest">
                        Preview em Tempo Real
                      </BaseHeading>
                      <div class="flex flex-wrap items-center gap-6">
                        <BaseButton variant="primary" class="shadow-lg shadow-primary-500/20">
                          Botão Principal
                        </BaseButton>
                        <BaseButton variant="muted">
                          Botão Neutro
                        </BaseButton>
                        <BaseTag variant="none" rounded="lg" class="px-4 py-2 font-bold bg-primary-500/20 text-primary-500">
                          Status Badge
                        </BaseTag>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="rounded-2xl border border-muted-200 bg-white/80 p-6 text-center shadow-xl dark:border-muted-800 dark:bg-muted-950/80">
                    <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted-100 dark:bg-muted-900">
                      <Icon name="lucide:lock" class="size-6 text-muted-500" />
                    </div>
                    <BaseHeading size="md" weight="medium" class="text-muted-800 dark:text-white mb-2">
                      Whitelabel bloqueado
                    </BaseHeading>
                    <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400 mb-6 max-w-sm mx-auto">
                      Seu plano atual não inclui a funcionalidade de Whitelabel. Faça upgrade para liberar a personalização.
                    </BaseParagraph>
                    <div class="flex items-center justify-center gap-2">
                      <BaseButton rounded="lg" variant="primary" class="w-40" @click.prevent="handleUpgrade">
                        <span>Fazer Upgrade</span>
                      </BaseButton>
                      <BaseButton rounded="lg" class="w-56" @click.prevent="continueWithoutUpgrade">
                        <span>Continuar sem Upgrade</span>
                      </BaseButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </BaseCard>
        </div>

        <div v-else-if="currentStep === 4" class="mx-auto flex w-full max-w-4xl flex-col px-4">
          <AppPageLoading v-if="isPreparing" message="Preparando seu ambiente..." />

          <BaseCard v-else rounded="lg" class="p-8">
            <div class="space-y-6">
              <div>
                <BaseHeading as="h2" size="xl" weight="medium" class="text-muted-800 dark:text-white mb-2">
                  Veja como funciona o sistema
                </BaseHeading>
                <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
                  Assista ao vídeo rápido e conclua o onboarding.
                </BaseParagraph>
              </div>

              <div class="bg-muted-50 dark:bg-muted-900/40 rounded-xl p-4 flex items-center justify-center overflow-hidden">
                <div class="w-full">
                  <iframe
                    v-if="readyForVideo"
                    class="w-full h-[400px] rounded-lg border-0"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                    title="Veja como funciona o sistema"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen
                  />
                </div>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="translate-y-20 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition-all duration-100 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-20 opacity-0"
      >
        <div
          v-if="!complete"
          class="fixed inset-x-0 bottom-6 z-20 mx-auto w-full max-w-[304px]"
        >
          <BaseCard
            class="shadow-muted-300/30 dark:shadow-muted-800/30 flex items-center justify-between gap-2 rounded-2xl p-4 shadow-xl"
          >
            <BaseButton
              rounded="lg"
              class="w-full"
              :disabled="currentStep === 0 || loading"
              @click.prevent="prevStep"
            >
              <span>Previous</span>
            </BaseButton>

            <BaseButton
              v-if="shouldShowFooterContinue && !isLastStep"
              type="submit"
              rounded="lg"
              variant="primary"
              class="w-full"
              :loading="loading"
              :disabled="loading"
            >
              <span>Continue</span>
            </BaseButton>

            <BaseButton
              v-else-if="shouldShowFooterContinue && isLastStep"
              type="submit"
              rounded="lg"
              variant="primary"
              class="w-full"
              :loading="loading"
              :disabled="loading"
            >
              <span>Concluir</span>
            </BaseButton>
          </BaseCard>
        </div>
      </Transition>
    </form>
  </TairoSidebarLayout>
</template>
