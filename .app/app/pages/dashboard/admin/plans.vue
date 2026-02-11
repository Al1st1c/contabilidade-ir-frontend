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

      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <BaseButton block variant="muted" rounded="md">
              <Icon name="lucide:edit" class="size-4 mr-1" />
              Editar Detalhes
            </BaseButton>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
