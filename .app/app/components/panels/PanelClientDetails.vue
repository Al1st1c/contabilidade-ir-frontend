<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

interface Props {
  clientId: string
}

const props = defineProps<Props>()
const { useCustomFetch } = useApi()

// Estados
const isLoading = ref(true)
const clientData = ref<any>(null)

// Função para buscar dados do cliente
async function fetchClientDetails() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any>(`/clients/${props.clientId}`)
    clientData.value = data
  } catch (error) {
    console.error('Erro ao buscar detalhes do cliente:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchClientDetails)

const statusColors: Record<string, string> = {
  pending: 'amber',
  in_progress: 'info',
  submitted: 'success',
  waiting_payment: 'danger'
}

const statusLabels: Record<string, string> = {
  pending: 'Aguardando',
  in_progress: 'Em Análise',
  submitted: 'Transmitida',
  waiting_payment: 'Pendente Pagto'
}
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-700 dark:bg-muted-950 border-l bg-white w-full max-w-lg shadow-2xl"
    trapped loop>
    <!-- Header -->
    <div class="border-muted-200 dark:border-muted-800 flex h-20 w-full items-center justify-between border-b px-8">
      <BaseHeading as="h3" size="sm" weight="medium"
        class="text-muted-800 dark:text-muted-100 uppercase tracking-wider">
        Ficha do Cliente
      </BaseHeading>

      <button type="button"
        class="hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-500 rounded-full p-2 transition-colors duration-300"
        @click="() => $emit('close')">
        <Icon name="lucide:x" class="size-5" />
      </button>
    </div>

    <!-- Content -->
    <div class="nui-slimscroll h-[calc(100dvh-80px)] overflow-y-auto p-8">
      <div v-if="isLoading" class="space-y-6">
        <BasePlaceload class="h-24 w-full rounded-xl" />
        <BasePlaceload class="h-64 w-full rounded-xl" />
      </div>

      <div v-else-if="clientData" class="space-y-10">
        <!-- Header Info -->
        <div class="flex items-center gap-4">
          <BaseAvatar size="xl" :text="clientData.name.charAt(0).toUpperCase()"
            class="bg-primary-500/10 text-primary-600 rounded-2xl" />
          <div>
            <BaseHeading as="h2" size="lg" weight="medium">{{ clientData.name }}</BaseHeading>
            <BaseParagraph size="xs" class="text-muted-400 font-mono mt-1">{{ clientData.cpf }}</BaseParagraph>
          </div>
        </div>

        <!-- Quick Contacts -->
        <div class="grid grid-cols-2 gap-4">
          <BaseCard v-if="clientData.phone" rounded="lg"
            class="p-4 border-muted-200 dark:border-muted-800 shadow-none hover:border-primary-500/30">
            <BaseParagraph size="xs" class="text-muted-400 uppercase tracking-tighter mb-1 font-medium">Telefone
            </BaseParagraph>
            <BaseParagraph size="sm" weight="medium" class="text-muted-800 dark:text-muted-100">{{ clientData.phone }}
            </BaseParagraph>
          </BaseCard>
          <BaseCard v-if="clientData.email" rounded="lg" class="p-4 border-muted-200 dark:border-muted-800 shadow-none">
            <BaseParagraph size="xs" class="text-muted-400 uppercase tracking-tighter mb-1 font-medium">E-mail
            </BaseParagraph>
            <BaseParagraph size="sm" weight="medium" class="truncate text-muted-800 dark:text-muted-100">{{
              clientData.email }}</BaseParagraph>
          </BaseCard>
        </div>

        <!-- Declarations History -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <BaseHeading as="h4" size="sm" weight="medium">Dossiê de IR</BaseHeading>
            <BaseTag size="sm" variant="muted" rounded="full">{{ clientData.taxDeclarations?.length || 0 }} anos
            </BaseTag>
          </div>

          <div v-if="clientData.taxDeclarations?.length > 0" class="space-y-3">
            <div v-for="dec in clientData.taxDeclarations" :key="dec.id"
              class="flex items-center justify-between p-4 bg-muted-50 dark:bg-muted-950 rounded-xl border border-muted-100 dark:border-muted-800">
              <div class="flex items-center gap-3">
                <div
                  class="size-10 rounded-lg bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-800 flex items-center justify-center font-bold text-muted-800 dark:text-muted-100 shadow-sm">
                  {{ String(dec.taxYear).slice(-2) }}
                </div>
                <div>
                  <BaseParagraph size="sm" weight="medium">{{ dec.taxYear }}</BaseParagraph>
                  <BaseParagraph size="xs" class="text-muted-400">{{ dec.column?.name || 'Iniciada' }}</BaseParagraph>
                </div>
              </div>

              <BaseTag size="sm" :variant="(statusColors[dec.status] as any) || 'muted'" rounded="full">
                {{ statusLabels[dec.status] || dec.status }}
              </BaseTag>
            </div>
          </div>
          <div v-else
            class="text-center py-10 bg-muted-50 dark:bg-muted-950 rounded-2xl border-2 border-dashed border-muted-200 dark:border-muted-800">
            <Icon name="lucide:file-question" class="size-10 text-muted-300 mx-auto mb-2" />
            <BaseParagraph size="xs" class="text-muted-400">Nenhuma declaração registrada</BaseParagraph>
            <BaseButton size="sm" variant="primary" class="mt-4"
              :to="{ path: '/dashboard/ir', query: { newFor: clientData.id } }">
              Criar IR {{ new Date().getFullYear() }}
            </BaseButton>
          </div>
        </div>

        <!-- Address / Notes -->
        <div class="space-y-4">
          <BaseHeading as="h4" size="sm" weight="medium">Observações</BaseHeading>
          <div class="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
            <BaseParagraph size="sm" class="text-amber-800 dark:text-amber-200 italic">
              {{ clientData.notes || 'Sem observações importantes para este cliente.' }}
            </BaseParagraph>
          </div>
        </div>
      </div>
    </div>
  </FocusScope>
</template>
