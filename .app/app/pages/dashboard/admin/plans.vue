<script setup lang="ts">
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

definePageMeta({
  title: 'Gestão de Planos - Admin',
})

const plans = ref<any[]>([])
const loading = ref(true)

async function fetchPlans() {
  try {
    loading.value = true
    const { data } = await useCustomFetch<any>('/admin/plans')
    plans.value = data
  } catch (error) {
    console.error('Erro ao buscar planos:', error)
  } finally {
    loading.value = false
  }
}

async function togglePlanStatus(plan: any) {
  try {
    const newStatus = !plan.isActive
    await useCustomFetch(`/admin/plans/${plan.id}`, {
      method: 'PATCH',
      body: { isActive: newStatus },
    })
    plan.isActive = newStatus
    toaster.add({
      title: 'Sucesso',
      description: `Plano ${plan.name} agora está ${newStatus ? 'ativo' : 'inativo'}.`,
      icon: 'ph:check-circle-fill',
    })
  } catch (error) {
    toaster.add({
      title: 'Erro',
      description: 'Não foi possível alterar status do plano.',
      icon: 'ph:warning-circle-fill',
    })
  }
}

const isEditModalOpen = ref(false)
const selectedPlan = ref<any>(null)
const planForm = ref<{
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
  employeesLimit: number
  taxDeclarationsLimit: number
  storageMbLimit: number
  hasWhitelabel: boolean
  hasReports: boolean
  hasApi: boolean
  hasTeamManagement: boolean
}>({
  name: '',
  description: '',
  priceMonthly: 0,
  priceYearly: 0,
  employeesLimit: 0,
  taxDeclarationsLimit: 0,
  storageMbLimit: 0,
  hasWhitelabel: false,
  hasReports: false,
  hasApi: false,
  hasTeamManagement: false,
})

function openEditModal(plan: any) {
  selectedPlan.value = plan
  planForm.value = {
    name: plan.name,
    description: plan.description,
    priceMonthly: (plan.pricing?.monthly || 0) / 100,
    priceYearly: (plan.pricing?.annual || 0) / 100,
    employeesLimit: plan.planLimit?.employeesLimit || 0,
    taxDeclarationsLimit: plan.planLimit?.taxDeclarationsLimit || 0,
    storageMbLimit: plan.planLimit?.storageMbLimit || 0,
    hasWhitelabel: !!plan.planLimit?.hasWhitelabel,
    hasReports: !!plan.planLimit?.hasReports,
    hasApi: !!plan.planLimit?.hasApi,
    hasTeamManagement: !!plan.planLimit?.hasTeamManagement,
  }
  isEditModalOpen.value = true
}

async function updatePlan() {
  try {
    loading.value = true
    await useCustomFetch(`/admin/plans/${selectedPlan.value.id}`, {
      method: 'PATCH',
      body: {
        name: planForm.value.name,
        description: planForm.value.description,
        pricing: {
          monthly: Math.round(planForm.value.priceMonthly * 100),
          annual: Math.round(planForm.value.priceYearly * 100),
        },
        limits: {
          employeesLimit: Number(planForm.value.employeesLimit),
          taxDeclarationsLimit: Number(planForm.value.taxDeclarationsLimit),
          storageMbLimit: Number(planForm.value.storageMbLimit),
          hasWhitelabel: planForm.value.hasWhitelabel,
          hasReports: planForm.value.hasReports,
          hasApi: planForm.value.hasApi,
          hasTeamManagement: planForm.value.hasTeamManagement,
        }
      },
    })

    toaster.add({
      title: 'Sucesso',
      description: 'Plano atualizado com sucesso.',
      icon: 'ph:check-circle-fill',
    })
    isEditModalOpen.value = false
    await fetchPlans()
  } catch (error) {
    toaster.add({
      title: 'Erro',
      description: 'Erro ao atualizar plano.',
      icon: 'ph:warning-circle-fill',
    })
  } finally {
    loading.value = false
  }
}

onMounted(fetchPlans)

function formatCurrency(val: any) {
  if (typeof val === 'number') return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return 'Sob consulta'
}
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <BaseHeading as="h2" size="2xl">Gestão de Planos</BaseHeading>
          <BaseParagraph size="sm" class="text-muted-500">Configuração de preços e limites</BaseParagraph>
        </div>
        <BaseButton variant="primary" rounded="md">
          <Icon name="lucide:plus" class="size-4 mr-1" />
          Novo Plano
        </BaseButton>
      </div>

      <div v-if="loading && !isEditModalOpen" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <BaseCard v-for="i in 3" :key="i" class="p-6 animate-pulse h-64 bg-muted-100 dark:bg-muted-800" />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <BaseCard v-for="plan in plans" :key="plan.id" class="p-6 flex flex-col h-full"
          :class="!plan.isActive ? 'opacity-60 grayscale' : ''">
          <div class="flex justify-between items-start mb-4">
            <div>
              <BaseHeading as="h3" size="lg">{{ plan.name }}</BaseHeading>
              <BaseText size="xs" class="text-muted-400 font-mono">{{ plan.slug }}</BaseText>
            </div>
            <BaseSwitch v-model="plan.isActive" @change="togglePlanStatus(plan)" />
          </div>

          <div class="space-y-4 flex-1">
            <div class="p-3 bg-muted-50 dark:bg-muted-900 rounded-lg">
              <BaseText size="xs" class="text-muted-500 uppercase tracking-widest mb-1">Preços</BaseText>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <BaseText size="xs" color="primary">Mensal</BaseText>
                  <p>{{ formatCurrency(plan.pricing?.monthly / 100) }}</p>
                </div>
                <div>
                  <BaseText size="xs" color="primary">Anual</BaseText>
                  <p>{{ formatCurrency(plan.pricing?.annual / 100) }}</p>
                </div>
              </div>
            </div>

            <div>
              <BaseText size="xs" class="text-muted-500 uppercase tracking-widest mb-2">Limites</BaseText>
              <ul class="text-sm space-y-1">
                <li class="flex justify-between">
                  <span class="text-muted-500">Funcionários:</span>
                  <span>{{ plan.planLimit?.employeesLimit }}</span>
                </li>
                <li class="flex justify-between">
                  <span class="text-muted-500">IRs/ano:</span>
                  <span>{{ plan.planLimit?.taxDeclarationsLimit || 'Ilimitado' }}</span>
                </li>
                <li class="flex justify-between">
                  <span class="text-muted-500">Storage:</span>
                  <span>{{ plan.planLimit?.storageMbLimit }} MB</span>
                </li>
              </ul>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-muted-200 dark:border-muted-800">
            <BaseButton block variant="muted" rounded="md" @click="openEditModal(plan)">
              <Icon name="lucide:edit" class="size-4 mr-1" />
              Editar Detalhes
            </BaseButton>
          </div>
        </BaseCard>
      </div>

      <!-- Edit Modal -->
      <div v-if="isEditModalOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-muted-900/50 backdrop-blur-sm">
        <BaseCard class="w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <div>
              <BaseHeading as="h3" size="lg">Editar Plano {{ selectedPlan?.name }}</BaseHeading>
              <BaseParagraph size="sm" class="text-muted-500">Ajuste os preços e limites do plano</BaseParagraph>
            </div>
            <BaseButton variant="muted" rounded="full" size="sm" @click="isEditModalOpen = false">
              <Icon name="lucide:x" class="size-4" />
            </BaseButton>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
              <BaseField label="Nome do Plano">
                <BaseInput v-model="planForm.name" rounded="md" />
              </BaseField>
            </div>

            <BaseField label="Preço Mensal (R$)">
              <BaseInput v-model="planForm.priceMonthly" type="number" icon="ph:currency-dollar" rounded="md" />
            </BaseField>

            <BaseField label="Preço Anual (R$)">
              <BaseInput v-model="planForm.priceYearly" type="number" icon="ph:currency-dollar" rounded="md" />
            </BaseField>

            <BaseField label="Limite Funcionários">
              <BaseInput v-model="planForm.employeesLimit" type="number" icon="ph:users" rounded="md" />
            </BaseField>

            <BaseField label="Limite IRs (Ano)">
              <BaseInput v-model="planForm.taxDeclarationsLimit" type="number" icon="ph:files" rounded="md" />
            </BaseField>

            <BaseField label="Espaço Storage (MB)">
              <BaseInput v-model="planForm.storageMbLimit" type="number" icon="ph:database" rounded="md" />
            </BaseField>

            <div class="space-y-4 pt-4 border-t border-muted-200 dark:border-muted-800 md:col-span-2">
              <BaseHeading as="h4" size="sm" class="mb-2">Funcionalidades</BaseHeading>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  class="flex items-center justify-between p-2 rounded border border-muted-200 dark:border-muted-800">
                  <BaseText size="sm">Recurso Whitelabel</BaseText>
                  <BaseCheckbox v-model="planForm.hasWhitelabel" color="primary" />
                </div>
                <div
                  class="flex items-center justify-between p-2 rounded border border-muted-200 dark:border-muted-800">
                  <BaseText size="sm">Relatórios Avançados</BaseText>
                  <BaseCheckbox v-model="planForm.hasReports" color="primary" />
                </div>
                <div
                  class="flex items-center justify-between p-2 rounded border border-muted-200 dark:border-muted-800">
                  <BaseText size="sm">Acesso via API</BaseText>
                  <BaseCheckbox v-model="planForm.hasApi" color="primary" />
                </div>
                <div
                  class="flex items-center justify-between p-2 rounded border border-muted-200 dark:border-muted-800">
                  <BaseText size="sm">Gestão de Equipe</BaseText>
                  <BaseCheckbox v-model="planForm.hasTeamManagement" color="primary" />
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 flex justify-end gap-3">
            <BaseButton variant="muted" @click="isEditModalOpen = false">Cancelar</BaseButton>
            <BaseButton variant="primary" :loading="loading" @click="updatePlan">Salvar Alterações</BaseButton>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
