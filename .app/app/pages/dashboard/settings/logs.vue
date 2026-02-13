<script setup lang="ts">
import { useApi } from '~/composables/useAuth'
import { formatDate } from '~/utils/format-dates'

const { useCustomFetch } = useApi()

const isLoading = ref(true)
const logs = ref<any[]>([])
const activeFilter = ref<'ALL' | 'USAGE' | 'AUDIT'>('ALL')

async function fetchLogs() {
  isLoading.value = true
  try {
    const response = await useCustomFetch<any>('/tenant/logs')
    if (response) {
      logs.value = (response as any).data.data || []
    }
  }
  catch (err) {
    console.error('Erro ao buscar logs:', err)
  }
  finally {
    isLoading.value = false
  }
}

const filteredLogs = computed(() => {
  if (activeFilter.value === 'ALL') return logs.value
  return logs.value.filter(log => log.type === activeFilter.value)
})

function getIcon(category: string, type: string, action?: string) {
  if (type === 'USAGE') {
    switch (category) {
      case 'SMS': return 'solar:letter-linear'
      case 'WHATSAPP': return 'solar:whatsapp-linear'
      case 'EMAIL': return 'solar:unread-linear'
      case 'STORAGE': return 'solar:cloud-storage-linear'
      case 'TAX_DECLARATION': return 'solar:document-text-linear'
      default: return 'solar:database-linear'
    }
  }

  // Audit Icons
  const cat = category.toUpperCase()
  if (action) {
    if (action.includes('create')) return 'solar:add-circle-linear'
    if (action.includes('update')) return 'solar:pen-new-square-linear'
    if (action.includes('delete')) return 'solar:trash-bin-trash-linear'
    if (action.includes('move')) return 'solar:transfer-horizontal-linear'
    if (action.includes('checklist')) return 'solar:checklist-minimalistic-linear'
    if (action.includes('attachment')) return 'solar:paperclip-linear'
    if (action.includes('invite')) return 'solar:user-plus-linear'
  }

  if (cat.includes('USER')) return 'solar:user-plus-linear'
  if (cat.includes('TENANT')) return 'solar:settings-linear'
  if (cat.includes('TAX_DECLARATION')) return 'solar:file-text-linear'
  if (cat.includes('CLIENT')) return 'solar:users-group-two-rounded-linear'
  return 'solar:history-linear'
}

function getActionLabel(action: string) {
  if (!action) return ''
  switch (action) {
    case 'created': return 'Criado'
    case 'updated': return 'Atualizado'
    case 'deleted': return 'Excluído'
    case 'moved': return 'Movido'
    case 'checklist_updated': return 'Checklist'
    case 'member_invited': return 'Convite'
    case 'tenant_updated': return 'Ajuste'
    case 'attachment_added': return 'Anexo'
    default: return action
  }
}

function getActionColor(action: string) {
  if (!action) return 'muted'
  if (action.includes('create')) return 'success'
  if (action.includes('update')) return 'info'
  if (action.includes('delete')) return 'danger'
  if (action.includes('move')) return 'warning'
  if (action.includes('checklist')) return 'primary'
  if (action.includes('invite')) return 'primary'
  return 'muted'
}

function getTypeBadge(type: string) {
  return type === 'USAGE' ? 'primary' : 'muted'
}

function formatEntity(entity: string) {
  if (!entity) return ''
  const ent = entity.toUpperCase()
  if (ent === 'TAX_DECLARATION') return 'Imposto de Renda'
  if (ent === 'USER') return 'Usuário'
  if (ent === 'CLIENT') return 'Cliente'
  if (ent === 'TENANT') return 'Configurações'
  return entity
}

function formatLogDescription(log: any) {
  if (log.type === 'USAGE') {
    if (log.category === 'TAX_DECLARATION') {
      return 'Criação de um novo Imposto de Renda'
    }
    if (log.category === 'STORAGE') {
      return 'Novo arquivo adicionado ao drive'
    }
  }
  return log.description
}

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2 p-1 bg-muted-100 dark:bg-muted-900 rounded-xl w-fit">
      <button type="button" class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
        :class="activeFilter === 'ALL' ? 'bg-white dark:bg-muted-800 shadow-sm text-primary-600 dark:text-primary-400' : 'text-muted-500 hover:text-muted-700'"
        @click="activeFilter = 'ALL'">
        Tudo
      </button>
      <button type="button" class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
        :class="activeFilter === 'USAGE' ? 'bg-white dark:bg-muted-800 shadow-sm text-primary-600 dark:text-primary-400' : 'text-muted-500 hover:text-muted-700'"
        @click="activeFilter = 'USAGE'">
        Uso do Plano
      </button>
      <button type="button" class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
        :class="activeFilter === 'AUDIT' ? 'bg-white dark:bg-muted-800 shadow-sm text-primary-600 dark:text-primary-400' : 'text-muted-500 hover:text-muted-700'"
        @click="activeFilter = 'AUDIT'">
        Logs da Empresa
      </button>
    </div>

    <BaseCard rounded="lg" class="p-0 overflow-hidden">
      <div v-if="isLoading" class="p-6 flex flex-col items-center justify-center">
        <AppPageLoading message="Carregando histórico..." />
      </div>

      <div v-else-if="filteredLogs.length === 0" class="p-12 text-center">
        <Icon name="solar:history-linear" class="size-16 text-muted-300 mx-auto mb-4" />
        <BaseHeading as="h3" size="lg" weight="medium" class="text-muted-400">
          Nenhum log encontrado
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500 mt-1">
          As atividades e o consumo de recursos aparecerão aqui.
        </BaseParagraph>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse border-spacing-0">
          <thead>
            <tr class="bg-muted-50 dark:bg-muted-900/50 border-b border-muted-200 dark:border-muted-800">
              <th class="px-6 py-4 text-xs font-semibold text-muted-400 uppercase tracking-widest whitespace-nowrap">
                Atividade
              </th>
              <th class="px-6 py-4 text-xs font-semibold text-muted-400 uppercase tracking-widest whitespace-nowrap">
                Fonte / Tipo
              </th>
              <th class="px-6 py-4 text-xs font-semibold text-muted-400 uppercase tracking-widest whitespace-nowrap">
                Responsável
              </th>
              <th
                class="px-6 py-4 text-xs font-semibold text-muted-400 uppercase tracking-widest text-right whitespace-nowrap">
                Data/Hora
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-muted-200 dark:divide-muted-800">
            <tr v-for="log in filteredLogs" :key="log.id"
              class="hover:bg-muted-50/50 dark:hover:bg-muted-900/30 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="size-9 rounded-lg bg-muted-100 dark:bg-muted-800 flex items-center justify-center text-primary-500 shrink-0">
                    <Icon :name="getIcon(log.category, log.type, log.action)" class="size-5" />
                  </div>
                  <div class="min-w-0">
                    <BaseText size="sm" weight="medium" class="text-muted-800 dark:text-white block truncate">
                      {{ formatLogDescription(log) }}
                    </BaseText>
                    <div class="flex items-center gap-2 mt-0.5">
                      <BaseText size="xs" class="text-muted-400 block">
                        {{ formatEntity(log.category) }}
                      </BaseText>
                      <BaseTag v-if="log.action" :color="getActionColor(log.action)" rounded="full"
                        class="px-1.5 py-0 h-4 text-[8px] uppercase font-bold shrink-0">
                        {{ getActionLabel(log.action) }}
                      </BaseTag>
                    </div>
                    <!-- Detalhes Extras -->
                    <div v-if="log.oldValue || log.newValue || log.entityId" class="mt-2 space-y-1">
                      <BaseText v-if="log.oldValue || log.newValue" size="xs"
                        class="text-muted-400 italic bg-muted-50 dark:bg-muted-900/50 p-1.5 rounded-md border border-muted-200 dark:border-muted-800 w-fit max-w-sm">
                        <span v-if="log.oldValue" class="line-through opacity-70">{{ log.oldValue }}</span>
                        <Icon v-if="log.oldValue" name="solar:alt-arrow-right-linear" class="size-3 mx-1" />
                        <span class="text-muted-600 dark:text-muted-200">{{ log.newValue }}</span>
                      </BaseText>
                      <BaseText v-if="log.entityId && !log.description.includes(log.entityId.substring(0, 8))" size="xs"
                        class="text-[10px] text-muted-400 font-mono">
                        ID: {{ log.entityId.substring(0, 8) }}...
                      </BaseText>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col gap-1">
                  <BaseTag :color="getTypeBadge(log.type)" rounded="full" size="sm"
                    class="uppercase text-[9px] font-bold w-fit">
                    {{ log.type === 'USAGE' ? 'Consumo' : 'Ação' }}
                  </BaseTag>
                  <BaseText v-if="log.source" size="xs" class="text-muted-400 italic">
                    {{ log.source }}
                  </BaseText>
                </div>
              </td>
              <td class="px-6 py-4">
                <BaseText size="sm" class="text-muted-500 whitespace-nowrap">
                  {{ log.userName || 'Sistema' }}
                </BaseText>
              </td>
              <td class="px-6 py-4 text-right">
                <BaseText size="sm" class="text-muted-500 whitespace-nowrap">
                  {{ formatDate(log.recordedAt, 'Long') }}
                </BaseText>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>
