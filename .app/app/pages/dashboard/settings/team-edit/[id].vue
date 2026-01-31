<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Editar Membro',
  pageTransition: false,
  layoutTransition: false,
})

const { useCustomFetch } = useApi()
const route = useRoute()
const router = useRouter()
const toaster = useNuiToasts()

const memberId = computed(() => route.params.id as string)
const pending = ref(false)
const saving = ref(false)
const member = ref<any>(null)

// Form data
const form = ref({
  name: '',
  email: '',
  phone: '',
  position: '',
  role: 'assistant',
})

// Available roles
const roles = [
  { value: 'master', label: 'Administrador', description: 'Acesso total ao sistema' },
  { value: 'admin', label: 'Gerente', description: 'Gerencia equipe e declarações' },
  { value: 'accountant', label: 'Contador', description: 'Trabalha com declarações e clientes' },
  { value: 'assistant', label: 'Assistente', description: 'Acesso limitado às declarações' },
  { value: 'viewer', label: 'Visualizador', description: 'Apenas visualização' },
]

// Fetch member details
async function fetchMember() {
  pending.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/tenant/members')

    if (response?.success && response?.data) {
      const found = response.data.find((m: any) => m.id === memberId.value)
      if (found) {
        member.value = found
        form.value = {
          name: found.name || '',
          email: found.email || '',
          phone: found.phone || '',
          position: found.role?.description || '',
          role: found.role?.name || 'assistant',
        }
      }
    }
  } catch (error) {
    console.error('Erro ao buscar membro:', error)
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível carregar os dados do membro',
      icon: 'ph:warning-fill',
    })
  } finally {
    pending.value = false
  }
}

// Save member
async function saveMember() {
  saving.value = true
  try {
    // Update role
    await useCustomFetch(`/tenant/members/${memberId.value}/role`, {
      method: 'PATCH',
      body: {
        role: form.value.role,
        position: form.value.position,
      },
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Membro atualizado com sucesso',
      icon: 'ph:check-circle-fill',
    })

    router.push('/dashboard/settings/team')
  } catch (error: any) {
    console.error('Erro ao salvar membro:', error)
    toaster.add({
      title: 'Erro',
      description: error?.data?.message || 'Não foi possível atualizar o membro',
      icon: 'ph:warning-fill',
    })
  } finally {
    saving.value = false
  }
}

// Deactivate member
async function deactivateMember() {
  if (!confirm('Tem certeza que deseja desativar este membro?')) return

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
  } catch (error: any) {
    console.error('Erro ao desativar membro:', error)
    toaster.add({
      title: 'Erro',
      description: error?.data?.message || 'Não foi possível desativar o membro',
      icon: 'ph:warning-fill',
    })
  } finally {
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
  } catch (error: any) {
    console.error('Erro ao reativar membro:', error)
    toaster.add({
      title: 'Erro',
      description: error?.data?.message || 'Não foi possível reativar o membro',
      icon: 'ph:warning-fill',
    })
  } finally {
    saving.value = false
  }
}

// Fetch on mount
onMounted(() => {
  fetchMember()
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
          Atualize as informações e permissões do membro
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
        <BaseCard rounded="lg" class="p-6">
          <BaseHeading size="md" weight="medium" class="mb-6 text-muted-800 dark:text-muted-100">
            Informações do Membro
          </BaseHeading>

          <div class="grid grid-cols-12 gap-4">
            <!-- Name -->
            <div class="col-span-12 md:col-span-6">
              <BaseInput v-model="form.name" label="Nome completo" placeholder="Nome do membro" disabled />
              <BaseText size="xs" class="text-muted-400 mt-1">
                O nome não pode ser alterado
              </BaseText>
            </div>

            <!-- Email -->
            <div class="col-span-12 md:col-span-6">
              <BaseInput v-model="form.email" label="E-mail" type="email" placeholder="email@exemplo.com" disabled />
              <BaseText size="xs" class="text-muted-400 mt-1">
                O e-mail não pode ser alterado
              </BaseText>
            </div>

            <!-- Phone -->
            <div class="col-span-12 md:col-span-6">
              <BaseInput v-model="form.phone" label="Telefone" placeholder="(00) 00000-0000" disabled />
            </div>

            <!-- Position -->
            <div class="col-span-12 md:col-span-6">
              <BaseInput v-model="form.position" label="Cargo" placeholder="Ex: Contador Sênior" />
            </div>

            <!-- Role -->
            <div class="col-span-12">
              <label class="mb-2 block text-sm font-medium text-muted-700 dark:text-muted-300">
                Função no sistema
              </label>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div v-for="role in roles" :key="role.value"
                  class="border-2 rounded-lg p-4 cursor-pointer transition-all" :class="{
                    'border-primary-500 bg-primary-500/10': form.role === role.value,
                    'border-muted-200 dark:border-muted-700 hover:border-muted-300 dark:hover:border-muted-600': form.role !== role.value,
                  }" @click="form.role = role.value">
                  <div class="flex items-center gap-3">
                    <div class="size-4 rounded-full border-2 flex items-center justify-center" :class="{
                      'border-primary-500 bg-primary-500': form.role === role.value,
                      'border-muted-300 dark:border-muted-600': form.role !== role.value,
                    }">
                      <Icon v-if="form.role === role.value" name="lucide:check" class="size-3 text-white" />
                    </div>
                    <div>
                      <BaseText weight="medium" class="text-muted-800 dark:text-muted-100">
                        {{ role.label }}
                      </BaseText>
                      <BaseText size="xs" class="text-muted-400">
                        {{ role.description }}
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
        <!-- Member Info -->
        <BaseCard rounded="lg" class="p-6 mb-6">
          <div class="text-center">
            <BaseAvatar :src="member.photo" :text="member.name?.charAt(0) || 'U'" size="xl" class="mx-auto mb-4" />
            <BaseHeading size="md" weight="medium" class="text-muted-800 dark:text-muted-100">
              {{ member.name }}
            </BaseHeading>
            <BaseText size="sm" class="text-muted-400">
              {{ member.email }}
            </BaseText>
            <div class="mt-3">
              <BaseTag rounded="lg" :color="member.isActive ? 'success' : 'danger'">
                {{ member.isActive ? 'Ativo' : 'Inativo' }}
              </BaseTag>
            </div>
          </div>
        </BaseCard>

        <!-- Danger Zone -->
        <BaseCard rounded="lg" class="p-6 border-danger-500/50">
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
