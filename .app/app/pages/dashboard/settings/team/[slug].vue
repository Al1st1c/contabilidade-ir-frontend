<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Detalhes do Membro',
})

const { useCustomFetch } = useApi()
const route = useRoute()
const router = useRouter()

const slug = computed(() => route.params.slug as string)
const pending = ref(false)
const member = ref<any>(null)

// Fetch member details
async function fetchMember() {
  pending.value = true
  try {
    const { data: response } = await useCustomFetch<any>('/tenant/members')

    if (response?.success && response?.data) {
      // Find the member by ID (slug is the ID)
      const found = response.data.find((m: any) => m.id === slug.value)
      if (found) {
        const roleName = found.role?.name || 'viewer'
        member.value = {
          id: found.id,
          name: found.name,
          email: found.email,
          picture: found.photo,
          phone: found.phone,
          position: found.role?.description,
          role: {
            label: getRoleLabel(roleName),
            value: roleName,
            details: getRoleDetails(roleName),
            apiRole: found.role, // Keep original role object for permissions
          },
          isActive: found.isActive,
          createdAt: found.createdAt,
          lastLoginAt: found.lastLoginAt,
          assignedDeclarations: found.assignedDeclarations,
        }
      }
    }
  } catch (error) {
    console.error('Erro ao buscar membro:', error)
  } finally {
    pending.value = false
  }
}

// Helper to get role label
function getRoleLabel(roleName: string): string {
  const roles: Record<string, string> = {
    master: 'Administrador',
    admin: 'Gerente',
    accountant: 'Contador',
    contador: 'Contador',
    assistant: 'Assistente',
    assistente: 'Assistente',
    viewer: 'Visualizador',
  }
  return roles[roleName] || roleName || 'Membro'
}

// Helper to get role details with permissions
function getRoleDetails(role: string): any[] {
  const permissions: Record<string, any[]> = {
    master: [
      {
        label: 'Gestão da Empresa',
        access: 'Acesso Total',
        permissions: [
          { label: 'Gerenciar configurações da empresa', status: true },
          { label: 'Gerenciar membros da equipe', status: true },
          { label: 'Gerenciar planos e faturamento', status: true },
          { label: 'Excluir empresa', status: true },
        ],
      },
      {
        label: 'Declarações de IR',
        access: 'Acesso Total',
        permissions: [
          { label: 'Criar e editar declarações', status: true },
          { label: 'Enviar declarações', status: true },
          { label: 'Excluir declarações', status: true },
          { label: 'Ver todas as declarações', status: true },
        ],
      },
      {
        label: 'Clientes',
        access: 'Acesso Total',
        permissions: [
          { label: 'Cadastrar clientes', status: true },
          { label: 'Editar clientes', status: true },
          { label: 'Excluir clientes', status: true },
          { label: 'Exportar dados', status: true },
        ],
      },
    ],
    admin: [
      {
        label: 'Gestão da Empresa',
        access: 'Acesso Parcial',
        permissions: [
          { label: 'Gerenciar configurações da empresa', status: true },
          { label: 'Gerenciar membros da equipe', status: true },
          { label: 'Gerenciar planos e faturamento', status: false },
          { label: 'Excluir empresa', status: false },
        ],
      },
      {
        label: 'Declarações de IR',
        access: 'Acesso Total',
        permissions: [
          { label: 'Criar e editar declarações', status: true },
          { label: 'Enviar declarações', status: true },
          { label: 'Excluir declarações', status: true },
          { label: 'Ver todas as declarações', status: true },
        ],
      },
      {
        label: 'Clientes',
        access: 'Acesso Total',
        permissions: [
          { label: 'Cadastrar clientes', status: true },
          { label: 'Editar clientes', status: true },
          { label: 'Excluir clientes', status: true },
          { label: 'Exportar dados', status: true },
        ],
      },
    ],
    accountant: [
      {
        label: 'Gestão da Empresa',
        access: 'Sem Acesso',
        permissions: [
          { label: 'Gerenciar configurações da empresa', status: false },
          { label: 'Gerenciar membros da equipe', status: false },
          { label: 'Gerenciar planos e faturamento', status: false },
          { label: 'Excluir empresa', status: false },
        ],
      },
      {
        label: 'Declarações de IR',
        access: 'Acesso Total',
        permissions: [
          { label: 'Criar e editar declarações', status: true },
          { label: 'Enviar declarações', status: true },
          { label: 'Excluir declarações', status: false },
          { label: 'Ver todas as declarações', status: true },
        ],
      },
      {
        label: 'Clientes',
        access: 'Acesso Parcial',
        permissions: [
          { label: 'Cadastrar clientes', status: true },
          { label: 'Editar clientes', status: true },
          { label: 'Excluir clientes', status: false },
          { label: 'Exportar dados', status: true },
        ],
      },
    ],
    assistant: [
      {
        label: 'Gestão da Empresa',
        access: 'Sem Acesso',
        permissions: [
          { label: 'Gerenciar configurações da empresa', status: false },
          { label: 'Gerenciar membros da equipe', status: false },
          { label: 'Gerenciar planos e faturamento', status: false },
          { label: 'Excluir empresa', status: false },
        ],
      },
      {
        label: 'Declarações de IR',
        access: 'Acesso Limitado',
        permissions: [
          { label: 'Criar e editar declarações', status: true },
          { label: 'Enviar declarações', status: false },
          { label: 'Excluir declarações', status: false },
          { label: 'Ver todas as declarações', status: false },
        ],
      },
      {
        label: 'Clientes',
        access: 'Acesso Limitado',
        permissions: [
          { label: 'Cadastrar clientes', status: true },
          { label: 'Editar clientes', status: false },
          { label: 'Excluir clientes', status: false },
          { label: 'Exportar dados', status: false },
        ],
      },
    ],
    viewer: [
      {
        label: 'Gestão da Empresa',
        access: 'Sem Acesso',
        permissions: [
          { label: 'Gerenciar configurações da empresa', status: false },
          { label: 'Gerenciar membros da equipe', status: false },
          { label: 'Gerenciar planos e faturamento', status: false },
          { label: 'Excluir empresa', status: false },
        ],
      },
      {
        label: 'Declarações de IR',
        access: 'Somente Visualização',
        permissions: [
          { label: 'Criar e editar declarações', status: false },
          { label: 'Enviar declarações', status: false },
          { label: 'Excluir declarações', status: false },
          { label: 'Ver todas as declarações', status: true },
        ],
      },
      {
        label: 'Clientes',
        access: 'Somente Visualização',
        permissions: [
          { label: 'Cadastrar clientes', status: false },
          { label: 'Editar clientes', status: false },
          { label: 'Excluir clientes', status: false },
          { label: 'Exportar dados', status: false },
        ],
      },
    ],
  }
  return permissions[role] || permissions.viewer
}

// Format date
function formatDate(date: string): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Edit member
function editMember() {
  router.push(`/dashboard/settings/team-edit/${member.value?.id}`)
}

// Fetch on mount and route change
onMounted(() => {
  fetchMember()
})

watch(slug, () => {
  fetchMember()
})
</script>

<template>
  <div>
    <!-- Loading -->
    <BaseCard v-if="pending" rounded="lg">
      <div class="p-10 flex items-center justify-center">
        <Icon name="svg-spinners:blocks-shuffle-3" class="size-8 text-primary-500" />
      </div>
    </BaseCard>

    <!-- Member Details -->
    <BaseCard v-else-if="member" rounded="lg">
      <!-- Header -->
      <div class="border-muted-200 dark:border-muted-800 flex flex-col sm:flex-row gap-4 border-b p-6 sm:p-8">
        <BaseAvatar :src="member.picture" :text="member.name?.charAt(0) || 'U'" size="xl" rounded="lg" />
        <div class="flex-1">
          <div class="flex items-start justify-between gap-4">
            <div>
              <BaseHeading weight="semibold" size="xl" lead="none" class="text-muted-800 dark:text-muted-100 mb-1">
                {{ member.name }}
              </BaseHeading>
              <BaseParagraph size="sm" class="text-muted-500 mb-3">
                {{ member.email }}
              </BaseParagraph>
              <div class="flex items-center gap-2 flex-wrap">
                <BaseTag rounded="lg" :color="member.role.value === 'master' ? 'primary' : 'muted'" size="sm">
                  {{ member.role.label }}
                </BaseTag>
                <BaseTag v-if="member.position" rounded="lg" color="info" variant="pastel" size="sm">
                  {{ member.position }}
                </BaseTag>
                <BaseTag rounded="lg" :color="member.isActive ? 'success' : 'danger'" variant="pastel" size="sm">
                  {{ member.isActive ? 'Ativo' : 'Inativo' }}
                </BaseTag>
              </div>
            </div>
            <BaseButton rounded="lg" size="sm" @click="editMember">
              <Icon name="solar:pen-2-linear" class="size-4" />
              <span>Editar</span>
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Info -->
      <div class="p-6 sm:p-8 border-b border-muted-200 dark:border-muted-800">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <BaseText size="xs" class="text-muted-400 uppercase mb-1">Telefone</BaseText>
            <br />
            <BaseText size="sm" class="text-muted-700 dark:text-muted-200">
              {{ member.phone || 'Não informado' }}
            </BaseText>
          </div>
          <div>
            <BaseText size="xs" class="text-muted-400 uppercase mb-1">Membro desde</BaseText>
            <br />
            <BaseText size="sm" class="text-muted-700 dark:text-muted-200">
              {{ formatDate(member.createdAt) }}
            </BaseText>
          </div>
          <div>
            <BaseText size="xs" class="text-muted-400 uppercase mb-1">Status</BaseText> <br />
            <BaseText size="sm" class="text-muted-700 dark:text-muted-200">
              {{ member.isActive ? 'Conta ativa' : 'Conta desativada' }}
            </BaseText>
          </div>
          <div>
            <BaseText size="xs" class="text-muted-400 uppercase mb-1">Função</BaseText>
            <br />
            <BaseText size="sm" class="text-muted-700 dark:text-muted-200">
              {{ member.role.label }}
            </BaseText>
          </div>
        </div>
      </div>

      <!-- Permissions -->
      <div class="p-6 sm:p-8">
        <BaseHeading size="md" weight="medium" class="mb-6 text-muted-800 dark:text-muted-100">
          Permissões
        </BaseHeading>

        <div class="space-y-6">
          <div v-for="roleDetail in member.role.details" :key="roleDetail.label"
            class="border-muted-200 dark:border-muted-800 grid grid-cols-12 border-b pb-6 last:border-0">
            <div class="col-span-12 sm:col-span-4 mb-4 sm:mb-0">
              <BaseParagraph size="sm" class="text-muted-500">
                {{ roleDetail.label }}
              </BaseParagraph>
              <BaseHeading size="sm" weight="medium" class="text-muted-800 dark:text-muted-100">
                {{ roleDetail.access }}
              </BaseHeading>
            </div>
            <div class="col-span-12 sm:col-span-8">
              <ul class="space-y-2">
                <li v-for="permission in roleDetail.permissions" :key="permission.label" class="flex gap-2 items-start">
                  <Icon v-if="permission.status" name="lucide:check"
                    class="text-success-500 relative top-0.5 size-4 shrink-0" />
                  <Icon v-else name="lucide:x" class="text-danger-500 relative top-0.5 size-4 shrink-0" />
                  <BaseParagraph size="sm" class="text-muted-500">
                    {{ permission.label }}
                  </BaseParagraph>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Not Found -->
    <BaseCard v-else rounded="lg">
      <div class="p-6 text-center py-10">
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
      </div>
    </BaseCard>
  </div>
</template>
