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
const transactions = ref<any>({ data: [], total: 0 })
const transactionPage = ref(1)
const transactionLimit = ref(10)
const isLoadingTransactions = ref(false)

// Função para buscar dados do cliente
async function fetchClientDetails() {
  isLoading.value = true
  try {
    const { data } = await useCustomFetch<any>(`/users/${props.clientId}`, {
      method: 'GET'
    })
    clientData.value = data
  } catch (error) {
    console.error('Erro ao buscar detalhes do cliente:', error)
  } finally {
    isLoading.value = false
  }
}

// Função para buscar transações do cliente
async function fetchTransactions() {
  isLoadingTransactions.value = true
  try {
    const { data } = await useCustomFetch<any>(`/users/${props.clientId}/transactions`, {
      method: 'GET',
      query: {
        page: transactionPage.value,
        limit: transactionLimit.value
      }
    })
    transactions.value = data
  } catch (error) {
    console.error('Erro ao buscar transações:', error)
    transactions.value = { data: [], total: 0 }
  } finally {
    isLoadingTransactions.value = false
  }
}

// Função para formatar tipo de transação
function formatTransactionType(type: string) {
  const types = {
    DEPOSIT: 'Depósito',
    WITHDRAW: 'Saque',
    CASHBACK: 'Cashback',
    BONUS: 'Bônus',
    FREE_CREDITS: 'Créditos Grátis'
  }
  return types[type] || type
}

// Função para obter cor do tipo de transação
function getTransactionColor(type: string) {
  const colors = {
    DEPOSIT: 'success',
    WITHDRAW: 'danger',
    CASHBACK: 'primary',
    BONUS: 'info',
    FREE_CREDITS: 'warning'
  }
  return colors[type] || 'muted'
}

// Buscar dados ao montar
onMounted(() => {
  fetchClientDetails()
  fetchTransactions()
})

// Watch para mudanças na página de transações
watch(transactionPage, () => {
  fetchTransactions()
})
</script>

<template>
  <FocusScope
    class="border-muted-200 dark:border-muted-700 dark:bg-muted-800 border-l bg-white w-200"
    trapped
    loop
  >
    <div
      class="border-muted-200 dark:border-muted-700 flex h-20 w-full items-center justify-between border-b px-6 "
    >
      <BaseHeading
        as="h3"
        size="xs"
        
        class="text-muted-500 dark:text-muted-100 uppercase"
      >
        Detalhes da Consulta CPF
      </BaseHeading>

      <!-- Close button -->
      <button
        type="button"
        class="nui-mask nui-mask-blob hover:bg-muted-100 focus:bg-muted-100 dark:hover:bg-muted-700 dark:focus:bg-muted-700 text-muted-700 dark:text-muted-400 flex size-10 cursor-pointer items-center justify-center outline-transparent transition-colors duration-300"
        @click="() => $emit('close')"
      >
        <Icon name="lucide:arrow-right" class="size-4" />
      </button>
    </div>

    <div
      class="nui-slimscroll relative h-[calc(100dvh_-_80px)] w-full overflow-y-auto p-6"
    >
    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <BasePlaceload class="h-32 w-full rounded-lg" />
    </div>

    <!-- Client Details -->
    <div v-else-if="clientData" class="space-y-6">
      <!-- Basic Info Card -->
        <div class="mb-4">
          <BaseHeading size="md" weight="medium">
            Informações Básicas
          </BaseHeading>
        </div>
        
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-muted-500 dark:text-muted-400 text-sm ">Nome Completo</label>
            <p class="text-muted-800 dark:text-muted-100 ">{{ clientData.name }}</p>
          </div>
          
          <div>
            <label class="text-muted-500 dark:text-muted-400 text-sm ">Documento</label>
            <p class="text-muted-800 dark:text-muted-100 ">{{ clientData.document || 'Não informado' }}</p>
          </div>
          
          <div>
            <label class="text-muted-500 dark:text-muted-400 text-sm ">Telefone</label>
            <div class="flex items-center gap-2">
              <p class="text-muted-800 dark:text-muted-100">{{ clientData.phone || 'Não informado' }}</p>
              <br/>
              <BaseTag
                size="sm"
                :color="clientData.phoneValidated ? 'success' : 'danger'"
                rounded="full"
              >
                {{ clientData.phoneValidated ? 'Validado' : 'Não validado' }}
              </BaseTag>
            </div>
          </div>

          <br />
          
          <div>
            <label class="text-muted-500 dark:text-muted-400 text-sm ">Email</label>
            <p class="text-muted-800 dark:text-muted-100 ">{{ clientData.email || 'Não informado' }}</p>
          </div>
          
          <div>
            <label class="text-muted-500 dark:text-muted-400 text-sm ">Código de Acesso</label>
            <p class="text-muted-800 dark:text-muted-100 ">{{ clientData.codeAccess || 'Não definido' }}</p>
          </div>
          
          <div>
            <label class="text-muted-500 dark:text-muted-400 text-sm ">Convidado por</label>
            <p class="text-muted-800 dark:text-muted-100 ">{{ clientData.invitedBy?.name || 'Cadastro direto' }}</p>
          </div>
        </div>

      <!-- Financial Info Card -->
      <BaseCard rounded="lg" class="p-6">
        <div class="mb-4">
          <BaseHeading size="md" weight="medium">
            Informações Financeiras
          </BaseHeading>
        </div>
        
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-muted-500 dark:text-muted-400 text-sm ">Créditos Disponíveis</label>
            <p class="text-muted-800 dark:text-muted-100  text-lg">R$ {{ Number(clientData.credits).toFixed(2) }}</p>
          </div>
          
          <div>
            <label class="text-muted-500 dark:text-muted-400 text-sm ">Créditos em Cashback</label>
            <p class="text-muted-800 dark:text-muted-100  text-lg">R$ {{ Number(clientData.creditsInCashback).toFixed(2) }}</p>
          </div>
        </div>
      </BaseCard>

      <!-- Additional Info Card -->
      <BaseCard v-if="clientData.observations" rounded="lg" class="p-6">
        <div class="mb-4">
          <BaseHeading size="md" weight="medium">
            Observações
          </BaseHeading>
        </div>
        <p class="text-muted-600 dark:text-muted-400">{{ clientData.observations }}</p>
      </BaseCard>

      <!-- Transactions Table -->
      <BaseCard rounded="lg" class="p-6">
        <div class="mb-6 flex items-center justify-between">
          <BaseHeading size="md" weight="medium">
            Histórico de Transações
          </BaseHeading>
        </div>

        <!-- Loading state for transactions -->
        <div v-if="isLoadingTransactions" class="flex justify-center py-8">
          <BasePlaceload class="h-20 w-full rounded-lg" />
        </div>

        <!-- Transactions table -->
        <div v-else-if="transactions.data.length > 0" class="space-y-4">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-muted-200 dark:border-muted-800 border-b">
                  <th class="text-muted-500 dark:text-muted-400 pb-3 text-left text-sm ">Data</th>
                  <th class="text-muted-500 dark:text-muted-400 pb-3 text-left text-sm ">Tipo</th>
                  <th class="text-muted-500 dark:text-muted-400 pb-3 text-right text-sm ">Valor</th>
                  <th class="text-muted-500 dark:text-muted-400 pb-3 text-left text-sm ">Referência</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="transaction in transactions.data" 
                  :key="transaction.id"
                  class="border-muted-200 dark:border-muted-800 border-b last:border-b-0"
                >
                  <td class="py-3">
                    <span class="text-muted-800 dark:text-muted-100 text-sm">
                      {{ new Date(transaction.createdAt).toLocaleDateString('pt-BR') }}
                    </span>
                  </td>
                  <td class="py-3">
                    <BaseTag
                      size="xs"
                      :variant="getTransactionColor(transaction.type)"
                      rounded="full"
                    >
                      {{ formatTransactionType(transaction.type) }}
                    </BaseTag>
                  </td>
                  <td class="py-3 text-right">
                    <span class="text-muted-800 dark:text-muted-100 ">
                      R$ {{ Number(transaction.amount).toFixed(2) }}
                    </span>
                  </td>
                  <td class="py-3">
                    <span class="text-muted-600 dark:text-muted-400 text-sm">
                      {{ transaction.referenceId || '-' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="mt-4 flex justify-center">
            <BasePagination
              v-model:page="transactionPage"
              :items-per-page="transactionLimit"
              :total="transactions.total"
              :sibling-count="1"
              rounded="full"
            />
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="py-8 text-center">
          <Icon name="ph:wallet" class="text-muted-400 mx-auto mb-3 size-12" />
          <p class="text-muted-500 dark:text-muted-400">Nenhuma transação encontrada</p>
        </div>
      </BaseCard>
    </div>

    <!-- Error state -->
    <div v-else class="py-8 text-center">
      <Icon name="ph:warning-circle" class="text-danger-500 mx-auto mb-3 size-12" />
      <p class="text-muted-500 dark:text-muted-400">Erro ao carregar detalhes do cliente</p>
    </div>
    </div> 
  </FocusScope>
</template>
