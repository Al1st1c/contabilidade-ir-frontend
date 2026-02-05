<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Editar Membro',
  pageTransition: false,
  layoutTransition: false,
})

const { useCustomFetch } = useApi()
const { user } = useAuth()
const route = useRoute()
const router = useRouter()
const toaster = useNuiToasts()

const memberId = computed(() => route.params.id as string)
const pending = ref(false)
const saving = ref(false)
const member = ref<any>(null)
const availableRoles = ref<any[]>([])

// Photo upload
const photoInput = ref<HTMLInputElement | null>(null)
const uploadingPhoto = ref(false)
const photoPreview = ref<string | null>(null)

// Selected role ID
const selectedRoleId = ref('')

// Fetch available roles from API
async function fetchRoles() {
  try {
    const { data: response } = await useCustomFetch<any>('/tenant/roles')
    if (response?.success && response?.data) {
      availableRoles.value = response.data
    }
  }
  catch (error) {
    console.error('Erro ao buscar roles:', error)
  }
}

// Fetch member details
async function fetchMember() {
  pending.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/tenant/members')

    if (response?.success && response?.data) {
      const found = response.data.find((m: any) => m.id === memberId.value)
      if (found) {
        member.value = found
        selectedRoleId.value = found.role?.id || ''
        photoPreview.value = found.photo || null
      }
    }
  }
  catch (error) {
    console.error('Erro ao buscar membro:', error)
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível carregar os dados do membro',
      icon: 'ph:warning-fill',
    })
  }
  finally {
    pending.value = false
  }
}

// Trigger file input
function triggerPhotoUpload() {
  photoInput.value?.click()
}

// Handle photo selection
async function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file)
    return

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    toaster.add({
      title: 'Erro',
      description: 'Tipo de arquivo inválido. Use JPEG, PNG ou WebP.',
      icon: 'ph:warning-fill',
    })
    return
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    toaster.add({
      title: 'Erro',
      description: 'Arquivo muito grande. Tamanho máximo: 5MB',
      icon: 'ph:warning-fill',
    })
    return
  }

  // Show preview
  const reader = new FileReader()
  reader.onload = (e) => {
    photoPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // Upload photo
  await uploadPhoto(file)
}

// Upload photo to API
async function uploadPhoto(file: File) {
  uploadingPhoto.value = true

  try {
    const formData = new FormData()
    formData.append('photo', file)

    const { data } = await useCustomFetch<any>(`/users/${memberId.value}/upload-photo`, {
      method: 'POST',
      body: formData,
    })

    if (data?.success || data?.photoUrl) {
      toaster.add({
        title: 'Sucesso',
        description: 'Foto atualizada com sucesso',
        icon: 'ph:check-circle-fill',
      })
      // Update member photo
      const photoUrl = data.photoUrl || data.data?.photoUrl
      if (photoUrl) {
        member.value.photo = photoUrl
        photoPreview.value = photoUrl
      }
    }
    else {
      throw new Error(data?.message || 'Erro ao enviar foto')
    }
  }
  catch (error: any) {
    console.error('Erro ao fazer upload da foto:', error)
    toaster.add({
      title: 'Erro',
      description: error.message || 'Não foi possível atualizar a foto',
      icon: 'ph:warning-fill',
    })
    // Reset preview on error
    photoPreview.value = member.value?.photo || null
  }
  finally {
    uploadingPhoto.value = false
    // Reset input
    if (photoInput.value) {
      photoInput.value.value = ''
    }
  }
}

// Remove photo
async function removePhoto() {
  if (!confirm('Tem certeza que deseja remover a foto?'))
    return

  uploadingPhoto.value = true
  try {
    await useCustomFetch(`/users/${memberId.value}`, {
      method: 'PATCH',
      body: {
        photo: null,
      },
    })

    member.value.photo = null
    photoPreview.value = null

    toaster.add({
      title: 'Sucesso',
      description: 'Foto removida com sucesso',
      icon: 'ph:check-circle-fill',
    })
  }
  catch (error: any) {
    console.error('Erro ao remover foto:', error)
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível remover a foto',
      icon: 'ph:warning-fill',
    })
  }
  finally {
    uploadingPhoto.value = false
  }
}

// Get selected role object
const selectedRole = computed(() => {
  return availableRoles.value.find(r => r.id === selectedRoleId.value)
})

// Get role label for display
function getRoleLabel(roleName: string): string {
  const labels: Record<string, string> = {
    master: 'Administrador',
    admin: 'Gerente',
    contador: 'Contador',
    accountant: 'Contador',
    assistente: 'Assistente',
    assistant: 'Assistente',
    viewer: 'Visualizador',
  }
  return labels[roleName] || roleName
}

// Get role icon
function getRoleIcon(roleName: string): string {
  const icons: Record<string, string> = {
    master: 'solar:crown-bold-duotone',
    admin: 'solar:shield-user-bold-duotone',
    contador: 'solar:calculator-bold-duotone',
    accountant: 'solar:calculator-bold-duotone',
    assistente: 'solar:user-hand-up-bold-duotone',
    assistant: 'solar:user-hand-up-bold-duotone',
    viewer: 'solar:eye-bold-duotone',
  }
  return icons[roleName] || 'solar:user-bold-duotone'
}

// Get role color
function getRoleColor(roleName: string): string {
  const colors: Record<string, string> = {
    master: 'primary',
    admin: 'info',
    contador: 'success',
    accountant: 'success',
    assistente: 'warning',
    assistant: 'warning',
    viewer: 'muted',
  }
  return colors[roleName] || 'muted'
}

// Save member - send roleId to API
async function saveMember() {
  if (!selectedRoleId.value) {
    toaster.add({
      title: 'Atenção',
      description: 'Selecione uma função para o membro',
      icon: 'ph:warning-fill',
    })
    return
  }

  saving.value = true
  try {
    await useCustomFetch(`/tenant/members/${memberId.value}/role`, {
      method: 'PATCH',
      body: {
        roleId: selectedRoleId.value,
      },
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Permissões atualizadas com sucesso',
      icon: 'ph:check-circle-fill',
    })

    router.push('/dashboard/settings/team')
  }
  catch (error: any) {
    console.error('Erro ao salvar membro:', error)
    toaster.add({
      title: 'Erro',
      description: error?.data?.message || 'Não foi possível atualizar o membro',
      icon: 'ph:warning-fill',
    })
  }
  finally {
    saving.value = false
  }
}

// Deactivate member
async function deactivateMember() {
  if (!confirm('Tem certeza que deseja desativar este membro?'))
    return

  saving.value = true
  try {
    await useCustomFetch(`/tenant/members/${memberId.value}`, {
      method: 'DELETE',
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Membro desativado com sucesso',
      icon: 'ph:check-circle-fill',
    })

    router.push('/dashboard/settings/team')
  }
  catch (error: any) {
    console.error('Erro ao desativar membro:', error)
    toaster.add({
      title: 'Erro',
      description: error?.data?.message || 'Não foi possível desativar o membro',
      icon: 'ph:warning-fill',
    })
  }
  finally {
    saving.value = false
  }
}

// Reactivate member
async function reactivateMember() {
  saving.value = true
  try {
    await useCustomFetch(`/tenant/members/${memberId.value}/reactivate`, {
      method: 'POST',
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Membro reativado com sucesso',
      icon: 'ph:check-circle-fill',
    })

    await fetchMember()
  }
  catch (error: any) {
    console.error('Erro ao reativar membro:', error)
    toaster.add({
      title: 'Erro',
      description: error?.data?.message || 'Não foi possível reativar o membro',
      icon: 'ph:warning-fill',
    })
  }
  finally {
    saving.value = false
  }
}

// Fetch on mount
onMounted(async () => {
  if (!user.value?.role?.canManageTeam) {
    router.push('/dashboard')
    return
  }
  await fetchRoles()
  await fetchMember()
})
</script>

<template>
  <div class="w-full pb-20">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <BaseButton rounded="full" size="sm" @click="router.push('/dashboard/settings/team')">
        <Icon name="lucide:arrow-left" class="size-4" />
      </BaseButton>
      <div>
        <BaseHeading tag="h1" size="xl" weight="medium">
          Editar Membro
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-400">
          Atualize as permissões do membro
        </BaseParagraph>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-20">
      <Icon name="svg-spinners:blocks-shuffle-3" class="size-12 text-primary-500" />
    </div>

    <!-- Form -->
    <div v-else-if="member" class="grid grid-cols-12 gap-6">
      <!-- Main Form -->
      <div class="col-span-12 lg:col-span-8">
        <!-- Member Info Card with Photo Upload -->
        <BaseCard rounded="lg" class="p-6 mb-6">
          <!-- Hidden file input -->
          <input ref="photoInput" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" class="hidden"
            @change="handlePhotoChange">

          <div class="flex items-start gap-6">
            <!-- Photo Upload Area -->
            <div class="relative group">
              <div
                class="relative size-24 rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed border-muted-200 dark:border-muted-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
                @click="triggerPhotoUpload">
                <!-- Photo or Placeholder -->
                <img v-if="photoPreview" :src="photoPreview" :alt="member.name" class="w-full h-full object-cover">
                <div v-else class="w-full h-full flex items-center justify-center bg-muted-100 dark:bg-muted-800">
                  <BaseText size="2xl" weight="semibold" class="text-muted-400">
                    {{ member.name?.charAt(0) || 'U' }}
                  </BaseText>
                </div>

                <!-- Upload Overlay -->
                <div
                  class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  :class="{ 'opacity-100': uploadingPhoto }">
                  <Icon v-if="uploadingPhoto" name="svg-spinners:ring-resize" class="size-8 text-white" />
                  <Icon v-else name="lucide:camera" class="size-8 text-white" />
                </div>
              </div>

              <!-- Remove Photo Button -->
              <button v-if="photoPreview && !uploadingPhoto"
                class="absolute -top-2 -right-2 size-6 rounded-full bg-danger-500 text-white flex items-center justify-center hover:bg-danger-600 transition-colors shadow-lg"
                @click.stop="removePhoto">
                <Icon name="lucide:x" class="size-3" />
              </button>
            </div>

            <!-- Member Info -->
            <div class="flex-1">
              <BaseHeading size="lg" weight="medium" class="text-muted-800 dark:text-muted-100">
                {{ member.name }}
              </BaseHeading>
              <BaseText size="sm" class="text-muted-400 mb-3">
                {{ member.email }}
              </BaseText>

              <!-- Photo Upload Buttons -->
              <div class="flex items-center gap-2 mb-3">
                <BaseButton size="sm" rounded="lg" :disabled="uploadingPhoto" @click="triggerPhotoUpload">
                  <Icon name="lucide:upload" class="size-3.5" />
                  <span>{{ photoPreview ? 'Alterar Foto' : 'Adicionar Foto' }}</span>
                </BaseButton>
                <BaseButton v-if="photoPreview" size="sm" rounded="lg" color="danger" :disabled="uploadingPhoto"
                  @click="removePhoto">
                  <Icon name="lucide:trash-2" class="size-3.5" />
                  <span>Remover</span>
                </BaseButton>
              </div>

              <!-- Tags -->
              <div class="flex items-center gap-2">
                <BaseTag v-if="member.phone" rounded="lg" size="sm" color="muted">
                  <Icon name="lucide:phone" class="size-3 me-1" />
                  {{ member.phone }}
                </BaseTag>
                <BaseTag rounded="lg" size="sm" :color="member.isActive ? 'success' : 'danger'">
                  {{ member.isActive ? 'Ativo' : 'Inativo' }}
                </BaseTag>
              </div>
            </div>
          </div>

          <!-- Photo Upload Hint -->
          <BaseParagraph size="xs" class="text-muted-400 mt-4">
            <Icon name="lucide:info" class="size-3 inline me-1" />
            Clique na foto para alterar. Formatos aceitos: JPEG, PNG, WebP. Tamanho máximo: 5MB.
          </BaseParagraph>
        </BaseCard>

        <!-- Roles Selection -->
        <BaseCard rounded="lg" class="p-6">
          <BaseHeading size="md" weight="medium" class="mb-2 text-muted-800 dark:text-muted-100">
            Função no Sistema
          </BaseHeading>
          <BaseParagraph size="sm" class="text-muted-400 mb-6">
            Selecione a função que define as permissões do membro
          </BaseParagraph>

          <div class="space-y-3">
            <div v-for="role in availableRoles" :key="role.id"
              class="border-2 rounded-xl p-4 cursor-pointer transition-all" :class="{
                'border-primary-500 bg-primary-500/5 ring-2 ring-primary-500/20': selectedRoleId === role.id,
                'border-muted-200 dark:border-muted-700 hover:border-muted-300 dark:hover:border-muted-600': selectedRoleId !== role.id,
              }" @click="selectedRoleId = role.id">
              <div class="flex items-start gap-4">
                <!-- Radio button -->
                <div class="size-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0" :class="{
                  'border-primary-500 bg-primary-500': selectedRoleId === role.id,
                  'border-muted-300 dark:border-muted-600': selectedRoleId !== role.id,
                }">
                  <Icon v-if="selectedRoleId === role.id" name="lucide:check" class="size-3 text-white" />
                </div>

                <!-- Role icon -->
                <div class="size-10 rounded-lg flex items-center justify-center shrink-0" :class="{
                  'bg-primary-500/10 text-primary-500': role.name === 'master',
                  'bg-info-500/10 text-info-500': role.name === 'admin',
                  'bg-success-500/10 text-success-500': role.name === 'contador',
                  'bg-warning-500/10 text-warning-500': role.name === 'assistente',
                  'bg-muted-500/10 text-muted-500': !['master', 'admin', 'contador', 'assistente'].includes(role.name),
                }">
                  <Icon :name="getRoleIcon(role.name)" class="size-5" />
                </div>

                <!-- Role info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <BaseHeading size="sm" weight="semibold" class="text-muted-800 dark:text-muted-100">
                      {{ getRoleLabel(role.name) }}
                    </BaseHeading>
                    <BaseTag v-if="role.name === 'master'" rounded="lg" size="sm" color="primary">
                      Admin
                    </BaseTag>
                  </div>
                  <BaseParagraph size="xs" class="text-muted-400 mb-3">
                    {{ role.description }}
                  </BaseParagraph>

                  <!-- Permissions -->
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div class="flex items-center gap-1.5">
                      <Icon :name="role.canViewAllCards ? 'lucide:check' : 'lucide:x'" class="size-3.5"
                        :class="role.canViewAllCards ? 'text-success-500' : 'text-muted-300'" />
                      <BaseText size="xs" class="text-muted-500">
                        Ver todos cards
                      </BaseText>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <Icon :name="role.canManageTeam ? 'lucide:check' : 'lucide:x'" class="size-3.5"
                        :class="role.canManageTeam ? 'text-success-500' : 'text-muted-300'" />
                      <BaseText size="xs" class="text-muted-500">
                        Gerenciar equipe
                      </BaseText>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <Icon :name="role.canManageClients ? 'lucide:check' : 'lucide:x'" class="size-3.5"
                        :class="role.canManageClients ? 'text-success-500' : 'text-muted-300'" />
                      <BaseText size="xs" class="text-muted-500">
                        Gerenciar clientes
                      </BaseText>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <Icon :name="role.canManageSettings ? 'lucide:check' : 'lucide:x'" class="size-3.5"
                        :class="role.canManageSettings ? 'text-success-500' : 'text-muted-300'" />
                      <BaseText size="xs" class="text-muted-500">
                        Configurações
                      </BaseText>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <Icon :name="role.canExportData ? 'lucide:check' : 'lucide:x'" class="size-3.5"
                        :class="role.canExportData ? 'text-success-500' : 'text-muted-300'" />
                      <BaseText size="xs" class="text-muted-500">
                        Exportar dados
                      </BaseText>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <Icon :name="role.canDeleteRecords ? 'lucide:check' : 'lucide:x'" class="size-3.5"
                        :class="role.canDeleteRecords ? 'text-success-500' : 'text-muted-300'" />
                      <BaseText size="xs" class="text-muted-500">
                        Excluir registros
                      </BaseText>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-muted-200 dark:border-muted-800">
            <BaseButton rounded="lg" @click="router.push('/dashboard/settings/team')">
              Cancelar
            </BaseButton>
            <BaseButton variant="primary" rounded="lg" :loading="saving" @click="saveMember">
              <Icon name="lucide:save" class="size-4" />
              <span>Salvar Alterações</span>
            </BaseButton>
          </div>
        </BaseCard>
      </div>

      <!-- Sidebar -->
      <div class="col-span-12 lg:col-span-4">
        <!-- Current Role -->
        <BaseCard rounded="lg" class="p-6 mb-6">
          <BaseHeading size="sm" weight="medium" class="mb-4 text-muted-800 dark:text-muted-100">
            Função Atual
          </BaseHeading>
          <div class="flex items-center gap-3">
            <div class="size-12 rounded-xl flex items-center justify-center" :class="{
              'bg-primary-500/10 text-primary-500': member.role?.name === 'master',
              'bg-info-500/10 text-info-500': member.role?.name === 'admin',
              'bg-success-500/10 text-success-500': member.role?.name === 'contador',
              'bg-warning-500/10 text-warning-500': member.role?.name === 'assistente',
              'bg-muted-500/10 text-muted-500': !['master', 'admin', 'contador', 'assistente'].includes(member.role?.name),
            }">
              <Icon :name="getRoleIcon(member.role?.name)" class="size-6" />
            </div>
            <div>
              <BaseHeading size="sm" weight="medium" class="text-muted-800 dark:text-muted-100">
                {{ getRoleLabel(member.role?.name) }}
              </BaseHeading>
              <BaseText size="xs" class="text-muted-400 line-clamp-2">
                {{ member.role?.description }}
              </BaseText>
            </div>
          </div>
        </BaseCard>

        <!-- Stats -->
        <BaseCard rounded="lg" class="p-6 mb-6">
          <BaseHeading size="sm" weight="medium" class="mb-4 text-muted-800 dark:text-muted-100">
            Estatísticas
          </BaseHeading>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <BaseText size="sm" class="text-muted-400">
                Declarações atribuídas
              </BaseText>
              <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-muted-100">
                {{ member.assignedDeclarations || 0 }}
              </BaseText>
            </div>
            <div class="flex items-center justify-between">
              <BaseText size="sm" class="text-muted-400">
                Último acesso
              </BaseText>
              <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-muted-100">
                {{ member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString('pt-BR') : 'Nunca' }}
              </BaseText>
            </div>
            <div class="flex items-center justify-between">
              <BaseText size="sm" class="text-muted-400">
                Membro desde
              </BaseText>
              <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-muted-100">
                {{ new Date(member.createdAt).toLocaleDateString('pt-BR') }}
              </BaseText>
            </div>
          </div>
        </BaseCard>

        <!-- Danger Zone -->
        <BaseCard rounded="lg" class="p-6 border border-danger-500/30">
          <BaseHeading size="sm" weight="medium" class="mb-4 text-danger-500">
            Zona de Perigo
          </BaseHeading>

          <div v-if="member.isActive">
            <BaseParagraph size="sm" class="text-muted-400 mb-4">
              Desativar este membro irá revogar seu acesso ao sistema imediatamente.
            </BaseParagraph>
            <BaseButton color="danger" rounded="lg" class="w-full" :loading="saving" @click="deactivateMember">
              <Icon name="lucide:user-x" class="size-4" />
              <span>Desativar Membro</span>
            </BaseButton>
          </div>
          <div v-else>
            <BaseParagraph size="sm" class="text-muted-400 mb-4">
              Este membro está desativado. Reative para restaurar seu acesso.
            </BaseParagraph>
            <BaseButton color="success" rounded="lg" class="w-full" :loading="saving" @click="reactivateMember">
              <Icon name="lucide:user-check" class="size-4" />
              <span>Reativar Membro</span>
            </BaseButton>
          </div>
        </BaseCard>
      </div>
    </div>

    <!-- Not Found -->
    <BaseCard v-else rounded="lg" class="p-6 text-center py-10">
      <Icon name="solar:user-cross-bold-duotone" class="size-16 text-muted-300 dark:text-muted-700 mx-auto mb-4" />
      <BaseHeading weight="medium" size="lg" class="mb-2 text-muted-800 dark:text-muted-100">
        Membro não encontrado
      </BaseHeading>
      <BaseParagraph size="sm" class="text-muted-400 mb-4">
        O membro selecionado não foi encontrado.
      </BaseParagraph>
      <BaseButton variant="primary" @click="router.push('/dashboard/settings/team')">
        Voltar para a lista
      </BaseButton>
    </BaseCard>
  </div>
</template>
