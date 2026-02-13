<script setup lang="ts">
import { useApi, useAuth } from '~/composables/useAuth'

definePageMeta({
  title: 'Meu Perfil',
})

const { user, fetchUser } = useAuth()
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

// State
const isLoading = ref(false)
const isSaving = ref(false)
const isUpdatingPassword = ref(false)
const isUploadingPhoto = ref(false)

// Form
const form = ref({
  name: user.value?.name || '',
  phone: (user.value as any)?.phone || '',
})

// Masks
const phoneMask = { mask: '(##) #####-####' }

// Password Form
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// Load user data on mount
onMounted(async () => {
  if (user.value) {
    form.value.name = user.value.name
    // Fetch fresh data to be sure
    const freshUser = await fetchUser()
    if (freshUser) {
      form.value.name = freshUser.name
      form.value.phone = (freshUser as any).phone || ''
    }
  }
})

// Photo upload logic
const photoInput = ref<HTMLInputElement | null>(null)
const localPreview = ref<string | null>(null)

function triggerPhotoUpload() {
  photoInput.value?.click()
}

async function handlePhotoUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Create local preview immediately
  const reader = new FileReader()
  reader.onload = (e) => {
    localPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  isUploadingPhoto.value = true
  try {
    const formData = new FormData()
    formData.append('photo', file)

    await useCustomFetch<any>('/users/me/upload-photo', {
      method: 'POST',
      body: formData,
    })

    await fetchUser() // Update global state
    localPreview.value = null // Clear local preview once global state is updated

    toaster.add({
      title: 'Sucesso',
      description: 'Foto de perfil atualizada!',
      icon: 'solar:check-circle-linear',
    })
  }
  catch (error: any) {
    localPreview.value = null // Revert preview on error
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao enviar foto',
      icon: 'solar:danger-circle-linear',
    })
  }
  finally {
    isUploadingPhoto.value = false
    if (target) target.value = ''
  }
}

// Save profile data
async function saveProfile() {
  isSaving.value = true
  try {
    await useCustomFetch<any>('/users/me', {
      method: 'PATCH',
      body: {
        name: form.value.name,
        phone: form.value.phone,
      },
    })

    await fetchUser() // Update global state
    toaster.add({
      title: 'Sucesso',
      description: 'Perfil atualizado com sucesso!',
      icon: 'solar:check-circle-linear',
    })
  }
  catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao salvar alterações',
      icon: 'solar:danger-circle-linear',
    })
  }
  finally {
    isSaving.value = false
  }
}

// Update password
async function updatePassword() {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toaster.add({
      title: 'Erro',
      description: 'As senhas não coincidem',
      icon: 'solar:danger-circle-linear',
    })
    return
  }

  isUpdatingPassword.value = true
  try {
    await useCustomFetch<any>('/users/me/change-password', {
      method: 'POST',
      body: {
        currentPassword: passwordForm.value.currentPassword,
        newPassword: passwordForm.value.newPassword,
      },
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Senha alterada com sucesso!',
      icon: 'solar:check-circle-linear',
    })

    // Clear form
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  }
  catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao alterar senha',
      icon: 'solar:danger-circle-linear',
    })
  }
  finally {
    isUpdatingPassword.value = false
  }
}
</script>

<template>
  <div class="pb-24">
    <div class="space-y-20">
      <!-- Section: Profile Photo & Basic Info -->
      <div class="grid grid-cols-12 gap-8 lg:gap-12">
        <div class="col-span-12 lg:col-span-4">
          <div class="sticky top-24">
            <BaseHeading as="h3" size="lg" weight="medium" class="text-muted-800 dark:text-white mb-2">
              Informações Pessoais
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
              Sua foto e nome serão exibidos em todo o sistema e nas interações com os clientes.
            </BaseParagraph>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-8">
          <BaseCard rounded="lg" class="p-8">
            <div class="flex flex-col sm:flex-row items-center gap-10">
              <div class="relative group">
                <div
                  class="size-32 rounded-full border-4 border-muted-200 dark:border-muted-800 bg-muted-50 dark:bg-muted-950 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-primary-500">
                  <img v-if="localPreview" :src="localPreview" alt="Avatar Preview" class="size-full object-cover">
                  <img v-else-if="user?.photo" :src="user.photo" alt="Avatar" class="size-full object-cover">
                  <Icon v-else name="solar:user-circle-bold-duotone" class="size-20 text-muted-300" />

                  <div
                    class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <BaseButton color="white" rounded="full" size="sm" :loading="isUploadingPhoto"
                      @click="triggerPhotoUpload">
                      Alterar
                    </BaseButton>
                  </div>
                </div>
                <input ref="photoInput" type="file" accept="image/*" class="hidden" @change="handlePhotoUpload">
              </div>

              <div class="flex-1 w-full space-y-6">
                <form @submit.prevent="saveProfile" class="space-y-6">
                  <div class="grid grid-cols-12 gap-6">
                    <div class="col-span-12">
                      <BaseField label="Nome Completo" required>
                        <TairoInput v-model="form.name" placeholder="Seu nome" icon="solar:user-linear" />
                      </BaseField>
                    </div>
                    <div class="col-span-12 md:col-span-6">
                      <BaseField label="E-mail (Não editável)">
                        <TairoInput :model-value="user?.email" disabled icon="solar:letter-linear" />
                      </BaseField>
                    </div>
                    <div class="col-span-12 md:col-span-6">
                      <BaseField label="Telefone / WhatsApp">
                        <TairoInput v-model="form.phone" v-maska="phoneMask" placeholder="(00) 00000-0000"
                          icon="fa6-brands:whatsapp" />
                      </BaseField>
                    </div>
                  </div>
                  <div class="flex justify-end">
                    <BaseButton type="submit" color="primary" rounded="lg" :loading="isSaving">
                      Salvar Alterações
                    </BaseButton>
                  </div>
                </form>
              </div>
            </div>
          </BaseCard>
        </div>
      </div>

      <!-- Section: Password Change -->
      <div class="grid grid-cols-12 gap-8 lg:gap-12 border-t border-muted-200 dark:border-muted-800 pt-16">
        <div class="col-span-12 lg:col-span-4">
          <div class="sticky top-24">
            <BaseHeading as="h3" size="lg" weight="medium" class="text-muted-800 dark:text-white mb-2">
              Segurança
            </BaseHeading>
            <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
              Altere sua senha periodicamente para manter sua conta segura.
            </BaseParagraph>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-8">
          <BaseCard rounded="lg" class="p-8">
            <form @submit.prevent="updatePassword" class="space-y-6">
              <div class="grid grid-cols-12 gap-6">
                <div class="col-span-12">
                  <BaseField label="Senha Atual" required>
                    <TairoInput v-model="passwordForm.currentPassword" type="password" placeholder="••••••••"
                      icon="solar:lock-password-linear" />
                  </BaseField>
                </div>
                <div class="col-span-12 md:col-span-6">
                  <BaseField label="Nova Senha" required>
                    <TairoInput v-model="passwordForm.newPassword" type="password" placeholder="Nova senha"
                      icon="solar:key-linear" />
                  </BaseField>
                </div>
                <div class="col-span-12 md:col-span-6">
                  <BaseField label="Confirmar Nova Senha" required>
                    <TairoInput v-model="passwordForm.confirmPassword" type="password" placeholder="Repita a nova senha"
                      icon="solar:check-circle-linear" />
                  </BaseField>
                </div>
              </div>
              <div class="flex justify-end">
                <BaseButton type="submit" color="primary" rounded="lg" :loading="isUpdatingPassword">
                  Atualizar Senha
                </BaseButton>
              </div>
            </form>
          </BaseCard>
        </div>
      </div>
    </div>
  </div>
</template>
