<script setup lang="ts">
definePageMeta({
  layout: 'client',
})

const { user } = useAuth()
const { useCustomFetch } = useApi()
const route = useRoute()
const config = useRuntimeConfig()
const apiBaseUrl = (config.public.apiBase as string || '').replace(/\/$/, '')
const token = computed(() => route.query.token as string | undefined)
const isPublicMode = computed(() => Boolean(token.value))

const isLoading = ref(true)
const history = ref<any[]>([])

async function loadHistory() {
  try {
    isLoading.value = true

    if (isPublicMode.value) {
      // Public mode: load limited data from public API
      const res = await fetch(`${apiBaseUrl}/public/${token.value}`)
      const result = await res.json()
      if (result?.success && result.data?.declaration) {
        const d = result.data.declaration
        history.value = [{
          year: Number(d.taxYear),
          status: d.status === 'submitted'
            ? 'Entregue'
            : d.status === 'finished' ? 'Finalizado' : 'Em Processamento',
          result: d.result || 'neutral',
          value: Number(d.resultValue) || 0,
          date: '-',
        }]
      }
    } else {
      // Authenticated mode
      if (!user.value?.id) return

      const { data } = await useCustomFetch(`/clients/${user.value.id}`)
      if (data.success && data.data.taxDeclarations) {
        history.value = data.data.taxDeclarations.map((d: any) => ({
          year: Number(d.taxYear),
          status: d.status === 'submitted'
            ? 'Entregue'
            : d.status === 'finished' ? 'Finalizado' : 'Em Processamento',
          result: d.result || 'neutral',
          value: Number(d.resultValue) || 0,
          date: d.submittedAt ? new Date(d.submittedAt).toLocaleDateString('pt-BR') : '-',
        }))
      }
    }
  }
  catch (error) {
    console.error('Erro ao carregar histórico:', error)
  }
  finally {
    isLoading.value = false
  }
}

onMounted(loadHistory)

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
</script>

<template>
  <div class="space-y-6 pb-24">
    <section>
      <BaseHeading as="h2" size="xl" weight="bold" class="text-muted-800 dark:text-white">
        Histórico
      </BaseHeading>
      <BaseParagraph size="sm" class="text-muted-500">
        Acesse suas declarações de anos anteriores.
      </BaseParagraph>
    </section>

    <!-- Skeleton if loading -->
    <AppPageLoading v-if="isLoading" message="Carregando seu histórico..." />

    <!-- History List -->
    <div v-else-if="history.length > 0" class="space-y-4">
      <BaseCard v-for="item in history" :key="item.year"
        class="p-5 flex items-center justify-between hover:shadow-lg transition-all duration-300 border-none shadow-sm">
        <div class="flex items-center gap-4">
          <div class="size-12 rounded-2xl bg-muted-100 dark:bg-muted-800 flex items-center justify-center">
            <Icon name="solar:calendar-date-bold-duotone" class="size-6 text-primary-500" />
          </div>
          <div>
            <BaseHeading as="h4" size="md" weight="bold">
              IRPF {{ item.year }}
            </BaseHeading>
            <div class="flex items-center gap-2 mt-0.5">
              <BaseTag color="success" rounded="full" size="sm" variant="muted">
                {{ item.status }}
              </BaseTag>
              <span class="text-[10px] text-muted-400 font-medium">{{ item.date }}</span>
            </div>
          </div>
        </div>

        <div class="text-right">
          <div class="text-sm font-bold" :class="[
            item.result === 'refund' ? 'text-emerald-500'
              : item.result === 'pay' ? 'text-rose-500'
                : 'text-muted-500',
          ]">
            {{ item.result === 'refund' ? '+' : item.result === 'pay' ? '-' : '' }}
            {{ formatCurrency(item.value) }}
          </div>
          <button class="text-[10px] text-primary-500 font-bold uppercase tracking-wider hover:underline mt-1">
            Ver Detalhes
          </button>
        </div>
      </BaseCard>
    </div>

    <!-- Empty State -->
    <div v-else class="py-20 text-center">
      <Icon name="solar:history-linear" class="size-16 text-muted-300 mb-4 mx-auto" />
      <BaseHeading as="h3" size="md" weight="semibold" class="text-muted-400">
        Nenhum histórico encontrado
      </BaseHeading>
      <BaseParagraph size="sm" class="text-muted-400 mt-1">
        Sua primeira declaração conosco aparecerá aqui.
      </BaseParagraph>
    </div>
  </div>
</template>
