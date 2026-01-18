<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Dashboard',
  preview: {
    title: 'Casino Dashboard',
    description: 'Visão geral do casino',
    categories: ['dashboards'],
    src: '/img/screens/dashboards-balance.png',
    srcDark: '/img/screens/dashboards-balance-dark.png',
    order: 5,
    new: true,
  },
})

// Tipagem para os fundos
interface Fund {
  id: string
  name: string
  type: 'money' | 'bank'
  createdAt: string
  updatedAt: string
}

// Tipagem para os fundos selecionados com valores
interface SelectedFund {
  fundId: string
  fund: Fund
  initialValue: string
}

interface OperationDay {
  id: string
  date_opened: string
  date_closed: string | null
  total_deposit: number
  total_withdraw: number
  total_cashback: number
  total_bonus: number
  total_free_credits: number
  total_new_clients: number
  FundOperation: any[]
}

const showFeatures = ref(false)
const isCashierActive = ref(false)
const isLoading = ref(false)
const isLoadingFunds = ref(false)
const isLoadingCashierStatus = ref(true)
const cashierStatusChecked = ref(false)
const funds = ref<Fund[]>([])
const selectedFunds = ref<SelectedFund[]>([])
const toaster = useNuiToasts()
const { useCustomFetch } = useApi()

// Dados do dashboard
const operationDay = ref<OperationDay | null>(null)
const availableFunds = ref<any[]>([])
const recentTransactions = ref<any[]>([])
const topDepositors = ref<any[]>([])
const activeRaffles = ref<any[]>([])
const isLoadingDashboard = ref(false)

// Chaves para localStorage
const CASHIER_STATUS_KEY = 'casino_cashier_status'
const CASHIER_DATA_KEY = 'casino_cashier_data'

// Datepicker
const date = ref(new Date())

// Funções para gerenciar cache do caixa
function saveCashierStatus(isActive: boolean, data?: any) {
  const today = new Date().toISOString().split('T')[0]
  
  localStorage.setItem(CASHIER_STATUS_KEY, JSON.stringify({
    isActive,
    date: today,
    timestamp: Date.now()
  }))
  
  if (data) {
    localStorage.setItem(CASHIER_DATA_KEY, JSON.stringify(data))
  }
}

function getCachedCashierStatus() {
  try {
    const cached = localStorage.getItem(CASHIER_STATUS_KEY)
    if (!cached) return null
    
    const data = JSON.parse(cached)
    const today = new Date().toISOString().split('T')[0]
    
    // Verifica se o cache é do dia atual (máximo 24h)
    if (data.date !== today) {
      clearCashierCache()
      return null
    }
    
    return data
  } catch (error) {
    console.error('Erro ao ler cache do caixa:', error)
    clearCashierCache()
    return null
  }
}

function clearCashierCache() {
  localStorage.removeItem(CASHIER_STATUS_KEY)
  localStorage.removeItem(CASHIER_DATA_KEY)
}

// Função para verificar se já existe operação do dia (com cache)
async function checkTodayOperation() {
  try {
    // Primeiro, verifica o cache
    const cachedStatus = getCachedCashierStatus()
    if (cachedStatus) {
      console.log('Estado do caixa encontrado no cache:', cachedStatus)
      isCashierActive.value = cachedStatus.isActive
      
      cashierStatusChecked.value = true
      isLoadingCashierStatus.value = false
      return
    }
    
    // Se não há cache, consulta a API
    await getFunds()
    console.log('Consultando API para verificar operação do dia...')
    const { data } = await useCustomFetch<any>('/operations/today', {
      method: 'GET',
    })
    
    if (data.success && data.data) {
      // Já existe operação do dia, ativar o caixa e salvar no cache
      isCashierActive.value = true
      saveCashierStatus(true, data.data)
      
      console.log('Operação do dia já existe:', data.data)
      
      toaster.add({
        title: 'Dia Já Iniciado',
        description: 'Continuando operação do dia atual',
        icon: 'ph:info-circle-fill',
        progress: true,
      })
    } else {
      // Não existe operação, salvar estado inativo no cache
      saveCashierStatus(false)
      console.log('Nenhuma operação encontrada para hoje, aguardando abertura...')
    }
  } catch (error) {
    console.log('Erro ao verificar operação do dia:', error)
    // Em caso de erro, não salva no cache e deixa como inativo
    saveCashierStatus(false)
  } finally {
    cashierStatusChecked.value = true
    isLoadingCashierStatus.value = false
  }
}

// Buscar fundos da API
async function getFunds() {
  isLoadingFunds.value = true
  try {
    const { data } = await useCustomFetch<any>('/funds', {
      method: 'GET',
    })
    
    if (data.success) {
      funds.value = data.data || []
      console.log('Fundos carregados:', funds.value)
    } else {
      throw new Error(data.message || 'Erro ao buscar fundos')
    }
  } catch (error) {
    console.error('Erro ao buscar fundos:', error)
    toaster.add({
      title: 'Erro',
      description: 'Erro ao carregar fundos. Tente novamente.',
      icon: 'lucide:alert-triangle',
      duration: 3000,
    })
    funds.value = []
  } finally {
    isLoadingFunds.value = false
  }
}


// Carregar dados do dashboard
async function loadDashboardData() {
  if (!isCashierActive.value) return
  
  isLoadingDashboard.value = true
  
  try {
    // 1. Buscar operação do dia
    const { data: opData } = await useCustomFetch<any>('/operations/today', {
      method: 'GET',
    })
    
    if (opData.success && opData.data) {
      operationDay.value = opData.data
    }
    
    // 2. Buscar fundos disponíveis com saldos
    const { data: fundsData } = await useCustomFetch<any>('/dashboard/transactions/available-funds', {
      method: 'GET',
    })
    
    if (fundsData) {
      availableFunds.value = fundsData
    }
    
    // 3. Buscar transações recentes (últimas 10)
    const { data: transData } = await useCustomFetch<any>('/dashboard/transactions', {
      method: 'GET',
      params: {
        page: 1,
        perPage: 10,
        dateRange: 'today'
      }
    })
    
    if (transData && transData.data) {
      recentTransactions.value = transData.data
    }
    
    // 4. Buscar top depositantes (agregação manual se necessário)
    // Por enquanto vamos simular baseado nas transações
    if (transData && transData.data) {
      const depositors = new Map<string, { name: string, total: number }>()
      
      transData.data
        .filter((t: any) => t.transactionType === 'DEPOSIT')
        .forEach((t: any) => {
          const existing = depositors.get(t.user.id)
          if (existing) {
            existing.total += t.amount
          } else {
            depositors.set(t.user.id, {
              name: t.user.name,
              total: t.amount
            })
          }
        })
      
      topDepositors.value = Array.from(depositors.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)
    }
    
    console.log('✅ Dashboard data loaded:', {
      operationDay: operationDay.value,
      availableFunds: availableFunds.value,
      transactions: recentTransactions.value.length,
      topDepositors: topDepositors.value
    })
    
  } catch (error) {
    console.error('Erro ao carregar dados do dashboard:', error)
  } finally {
    isLoadingDashboard.value = false
  }
}

// Carrega os fundos e verifica operação do dia quando o componente é montado
onMounted(async () => {
  await checkTodayOperation()
  
  // Se o caixa está ativo, carregar dados
  if (isCashierActive.value) {
    await loadDashboardData()
  }
})

// Função para adicionar um fundo à seleção
function addFund() {
  if (funds.value.length === 0) return
  
  // Encontra o primeiro fundo que ainda não foi selecionado
  const availableFund = funds.value.find(fund => 
    !selectedFunds.value.some(sf => sf.fundId === fund.id)
  )
  
  if (availableFund) {
    selectedFunds.value.push({
      fundId: availableFund.id,
      fund: availableFund,
      initialValue: ''
    })
  }
}

// Função para remover um fundo da seleção
function removeFund(index: number) {
  selectedFunds.value.splice(index, 1)
}

// Função para alterar o fundo selecionado em um índice específico
function changeFund(index: number, newFundId: string) {
  const fund = funds.value.find(f => f.id === newFundId)
  if (fund && selectedFunds.value[index]) {
    selectedFunds.value[index].fundId = newFundId
    selectedFunds.value[index].fund = fund
  }
}

// Computed para fundos disponíveis (que ainda não foram selecionados)
const availableFundsForSelection = computed(() => {
  return funds.value.filter(fund => 
    !selectedFunds.value.some(sf => sf.fundId === fund.id)
  )
})

// Computed para total de valores
const totalValue = computed(() => {
  return selectedFunds.value.reduce((sum, sf) => {
    const value = parseFloat(sf.initialValue.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0
    return sum + value
  }, 0)
})

const activateCashier = async () => {
  // Validação dos fundos selecionados
  if (selectedFunds.value.length === 0) {
    toaster.add({
      title: 'Erro!',
      description: 'Por favor, adicione pelo menos um fundo para iniciar o dia',
      icon: 'lucide:alert-triangle',
      duration: 3000,
    })
    return
  }

  // Validação dos valores de cada fundo
  const invalidFunds = selectedFunds.value.filter(sf => {
    const value = parseFloat(sf.initialValue.replace(/[^\d,.-]/g, '').replace(',', '.'))
    return !sf.initialValue.trim() || isNaN(value) || value <= 0
  })

  if (invalidFunds.length > 0) {
    toaster.add({
      title: 'Erro!',
      description: 'Todos os fundos devem ter valores válidos maiores que zero',
      icon: 'lucide:alert-triangle',
      duration: 3000,
    })
    return
  }

  isLoading.value = true
  
  try {
    // Prepara os dados para a API
    const today = new Date().toISOString().split('T')[0]
    const fundsData = selectedFunds.value.map(sf => ({
      fundId: sf.fundId,
      amount: parseFloat(sf.initialValue.replace(/[^\d,.-]/g, '').replace(',', '.'))
    }))

    const payload = {
      dateOpened: today,
      funds: fundsData
    }

    console.log('Enviando dados para API:', payload)

    // Chama a API para abrir o dia
    let response
    try {
      response = await useCustomFetch<any>('/operations/open-day', {
        method: 'POST',
        body: payload,
      })
      console.log('Resposta completa da API:', response)
    } catch (fetchError: any) {
      console.error('Erro no fetch:', fetchError)
      console.error('Tipo do erro:', typeof fetchError)
      console.error('Stack do erro:', fetchError.stack)
      throw new Error(`Erro na comunicação com a API: ${fetchError.message}`)
    }

    // Verifica se a resposta tem o formato esperado
    if (!response || typeof response !== 'object') {
      throw new Error('Resposta inválida da API')
    }

    const { data } = response

    if (data && data.success) {
      isCashierActive.value = true
      
      // Salvar no cache que o caixa foi ativado
      saveCashierStatus(true, data.data)
      
      const totalAmount = fundsData.reduce((sum, f) => sum + f.amount, 0)
      
      toaster.add({
        title: 'Sucesso!',
        description: `Dia aberto com ${fundsData.length} fundo(s) - Total: R$ ${totalAmount.toFixed(2)}`,
        icon: 'lucide:check-circle',
        duration: 4000,
      })
      
      console.log('Resposta da API:', data)
      
      // Carregar dados do dashboard
      await loadDashboardData()
    } else {
      throw new Error(data?.message || 'Erro ao abrir o dia')
    }
    
  } catch (error: any) {
    console.error('Erro ao ativar o caixa:', error)
    
    toaster.add({
      title: 'Erro!',
      description: error.message || 'Erro ao ativar o caixa. Tente novamente.',
      icon: 'lucide:alert-triangle',
      duration: 3000,
    })
  } finally {
    isLoading.value = false
  }
}

// Função para fechar o caixa
async function closeCashier() {
  if (!operationDay.value) return
  
  const confirmed = confirm('Tem certeza que deseja fechar o caixa? Esta ação não pode ser desfeita.')
  if (!confirmed) return
  
  isLoading.value = true
  
  try {
    const payload = {
      operationDayId: operationDay.value.id,
      dateClosed: new Date().toISOString()
    }
    
    const { data } = await useCustomFetch<any>('/operations/close-day', {
      method: 'POST',
      body: payload,
    })
    
    if (data && data.success) {
      toaster.add({
        title: 'Caixa Fechado!',
        description: 'O caixa foi fechado com sucesso',
        icon: 'lucide:check-circle',
        duration: 4000,
      })
      
      // Limpar cache e recarregar
      clearCashierCache()
      isCashierActive.value = false
      operationDay.value = null
      
      // Recarregar a página após 2 segundos
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } else {
      throw new Error(data?.message || 'Erro ao fechar o caixa')
    }
  } catch (error: any) {
    console.error('Erro ao fechar o caixa:', error)
    toaster.add({
      title: 'Erro!',
      description: error.message || 'Erro ao fechar o caixa',
      icon: 'lucide:alert-triangle',
      duration: 3000,
    })
  } finally {
    isLoading.value = false
  }
}

// Expor função para limpar cache (para uso no login)
defineExpose({
  clearCashierCache
})
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20 relative">
    <!-- Loading inicial enquanto verifica status do caixa -->
    <div 
      v-if="!cashierStatusChecked" 
      class="fixed inset-0 z-50 bg-white dark:bg-muted-800 flex items-center justify-center"
    >
      <div class="text-center">
        <div class="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-4">
          <Icon name="lucide:loader-2" class="size-8 text-primary-600 dark:text-primary-400 animate-spin" />
        </div>
        <BaseHeading as="h2" size="lg" class="text-muted-800 dark:text-muted-100 mb-2">
          Carregando Dashboard
        </BaseHeading>
        <BaseParagraph class="text-muted-600 dark:text-muted-400" size="sm">
          Verificando status do sistema...
        </BaseParagraph>
      </div>
    </div>

    <!-- Overlay com blur quando caixa não está ativo -->
    <div 
      v-if="cashierStatusChecked && !isCashierActive" 
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-muted-800 rounded-xl p-8 max-w-md w-full shadow-2xl">
        <div class="text-center mb-6">
          <div class="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-4">
            <Icon name="lucide:lock" class="size-8 text-primary-600 dark:text-primary-400" />
          </div>
          <BaseHeading as="h2" size="lg" class="text-muted-800 dark:text-muted-100 mb-2">
            Iniciar o Dia!
          </BaseHeading>
          <BaseParagraph class="text-muted-600 dark:text-muted-400" size="sm">
            Para começar a usar o sistema, você precisa inserir o valor inicial do caixa.
          </BaseParagraph>
        </div>

        <div class="space-y-4">
          <!-- Loading state para verificação do caixa -->
          <div v-if="isLoadingCashierStatus" class="text-center py-8">
            <div class="mx-auto w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-4">
              <Icon name="lucide:loader-2" class="size-6 text-primary-600 dark:text-primary-400 animate-spin" />
            </div>
            <BaseText size="sm" class="text-muted-600 dark:text-muted-400 font-medium">
              Consultando informações do caixa...
            </BaseText>
            <BaseText size="xs" class="text-muted-500 mt-1">
              Verificando se o dia já foi iniciado
            </BaseText>
          </div>

          <!-- Loading state para fundos -->
          <div v-else-if="isLoadingFunds" class="text-center py-4">
            <BaseText size="sm" class="text-muted-500">
              <Icon name="lucide:loader-2" class="size-4 animate-spin me-2" />
              Carregando fundos...
            </BaseText>
          </div>
          
          <!-- Estado quando não há fundos -->
          <div v-else-if="!funds.length" class="text-center py-4">
            <BaseText size="sm" class="text-muted-500">
              <Icon name="lucide:alert-circle" class="size-4 me-2" />
              Nenhum fundo disponível
            </BaseText>
          </div>

          <!-- Lista de Fundos Selecionados -->
          <div v-else class="space-y-4">
            <div class="flex items-center justify-between">
              <BaseHeading as="h5" size="sm" weight="medium" class="text-muted-800 dark:text-muted-200">
                Fundos do Dia
              </BaseHeading>
              <BaseButton
                @click="addFund"
                :disabled="availableFundsForSelection.length === 0"
                variant="muted"
                size="sm"
                rounded="md"
              >
                <Icon name="lucide:plus" class="size-3 me-1" />
                Adicionar Fundo
              </BaseButton>
            </div>

            <!-- Lista de fundos selecionados -->
            <div v-if="selectedFunds.length === 0" class="text-center py-8 border-2 border-dashed border-muted-200 dark:border-muted-700 rounded-lg">
              <Icon name="lucide:wallet" class="size-8 text-muted-400 mx-auto mb-2" />
              <BaseText size="sm" class="text-muted-500">
                Clique em "Adicionar Fundo" para começar
              </BaseText>
            </div>

            <div v-else class="space-y-3">
              <div 
                v-for="(selectedFund, index) in selectedFunds"
                :key="`selected-${index}`"
                class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 border border-muted-200 dark:border-muted-700"
              >
                <div class="flex items-start gap-3">
                  <!-- Seletor de Fundo -->
                  <div class="flex-1">
                    <BaseField :label="`Fundo ${index + 1}`" size="sm">
                      <BaseSelect
                        :model-value="selectedFund.fundId"
                        @update:model-value="(value) => changeFund(index, value)"
                        rounded="md"
                        size="sm"
                      >
                        <!-- Fundo atual (sempre disponível para ele mesmo) -->
                        <BaseSelectItem :value="selectedFund.fundId">
                          <div class="flex items-center gap-2">
                            <div 
                              class="size-3 rounded-full"
                              :class="selectedFund.fund.type === 'money' ? 'bg-primary-500' : 'bg-success-500'"
                            />
                            <span class="font-medium">{{ selectedFund.fund.name }}</span>
                            <span class="text-muted-500 text-xs">({{ selectedFund.fund.type === 'money' ? 'Dinheiro' : 'Banco' }})</span>
                          </div>
                        </BaseSelectItem>
                        
                        <!-- Outros fundos disponíveis -->
                        <BaseSelectItem
                          v-for="fund in availableFundsForSelection"
                          :key="fund.id"
                          :value="fund.id"
                        >
                          <div class="flex items-center gap-2">
                            <div 
                              class="size-3 rounded-full"
                              :class="fund.type === 'money' ? 'bg-primary-500' : 'bg-success-500'"
                            />
                            <span class="font-medium">{{ fund.name }}</span>
                            <span class="text-muted-500 text-xs">({{ fund.type === 'money' ? 'Dinheiro' : 'Banco' }})</span>
                          </div>
                        </BaseSelectItem>
                      </BaseSelect>
                    </BaseField>
                  </div>

                  <!-- Campo de Valor -->
                  <div class="flex-1">
                    <BaseField label="Valor Inicial (R$)" size="sm" required>
                      <BaseInput
                        v-model="selectedFund.initialValue"
                        placeholder="0,00"
                        rounded="md"
                        size="sm"
                        class="text-right font-medium"
                      />
                    </BaseField>
                  </div>

                  <!-- Botão de Remover -->
                  <div class="pt-6">
                    <BaseButton
                      @click="removeFund(index)"
                      variant="destructive"
                      size="sm"
                      rounded="md"
                    >
                      <Icon name="lucide:trash-2" class="size-3" />
                    </BaseButton>
                  </div>
                </div>
              </div>
            </div>

            <!-- Resumo Total -->
            <div 
              v-if="selectedFunds.length > 0" 
              class="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4"
            >
              <div class="flex items-center justify-between">
                <div>
                  <BaseText weight="medium" class="text-primary-800 dark:text-primary-200">
                    Total Inicial do Caixa
                  </BaseText>
                  <BaseText size="xs" class="text-primary-600 dark:text-primary-400">
                    {{ selectedFunds.length }} fundo(s) selecionado(s)
                  </BaseText>
                </div>
                <div class="text-right">
                  <BaseHeading as="h4" size="lg" weight="semibold" class="text-primary-800 dark:text-primary-200">
                    R$ {{ totalValue.toFixed(2) }}
                  </BaseHeading>
                </div>
              </div>
            </div>

            <BaseButton
              @click="activateCashier"
              :loading="isLoading"
              :disabled="isLoading || selectedFunds.length === 0"
              variant="primary"
              size="lg"
              class="w-full"
            >
              <Icon name="lucide:unlock" class="size-4 me-2" />
              {{ isLoading ? 'Ativando...' : 'Iniciar o dia & Ativar caixa' }}
            </BaseButton>
          </div>
        </div>

        <div class="mt-6 text-center">
          <BaseText size="xs" class="text-muted-500 dark:text-muted-400">
            <Icon name="lucide:info" class="size-3 me-1" />
            Adicione um ou mais fundos com seus valores iniciais para controlar o fluxo de caixa do dia
          </BaseText>
        </div>
      </div>
    </div>

    <!-- Conteúdo principal com blur quando caixa não está ativo -->
    <div :class="{ 'blur-sm pointer-events-none': cashierStatusChecked && !isCashierActive }">
      <div class="grid grid-cols-12 gap-4">
      <div class="col-span-12 lg:col-span-9">
        <div class="grid grid-cols-12 gap-4">
          <!-- Saldo Total do Caixa -->
          <div class="col-span-12 md:col-span-7">
            <BaseCard rounded="md">
              <div class="flex flex-col gap-4 px-8 pt-8 text-center">
                <div class="flex items-center justify-between">
                  <BaseHeading as="h4" size="xs" weight="medium" lead="none" class="text-muted-700 dark:text-muted-100 uppercase">
                    Saldo Total em Caixa
                  </BaseHeading>
                  <BaseTag variant="primary" rounded="full" size="sm" v-if="operationDay">
                    Caixa Aberto
                  </BaseTag>
                </div>
                <p>
                  <span class="text-muted-900 font-sans text-4xl font-medium dark:text-white">
                    R$ {{ (operationDay ? Number(operationDay.total_deposit) - Number(operationDay.total_withdraw) : 0).toFixed(2) }}
                  </span>
                </p>
                <div class="grid grid-cols-3 gap-4 text-left">
                  <div>
                    <BaseText size="xs" class="text-muted-500">Depósitos</BaseText>
                    <BaseText weight="semibold" class="text-success-600">
                      +R$ {{ (operationDay ? Number(operationDay.total_deposit) : 0).toFixed(2) }}
                    </BaseText>
                  </div>
                  <div>
                    <BaseText size="xs" class="text-muted-500">Saques</BaseText>
                    <BaseText weight="semibold" class="text-danger-600">
                      -R$ {{ (operationDay ? Number(operationDay.total_withdraw) : 0).toFixed(2) }}
                    </BaseText>
                  </div>
                  <div>
                    <BaseText size="xs" class="text-muted-500">Bônus</BaseText>
                    <BaseText weight="semibold" class="text-primary-600">
                      R$ {{ (operationDay ? Number(operationDay.total_bonus) + Number(operationDay.total_cashback) : 0).toFixed(2) }}
                    </BaseText>
                  </div>
                </div>
              </div>
              <div class="px-8 pb-6 pt-4">
                <div class="bg-muted-100 dark:bg-muted-800 h-1 rounded-full overflow-hidden">
                  <div 
                    class="bg-success-500 h-full transition-all duration-300"
                    :style="{ width: operationDay ? `${(Number(operationDay.total_deposit) / (Number(operationDay.total_deposit) + Number(operationDay.total_withdraw) || 1)) * 100}%` : '0%' }"
                  />
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- Resumo do Dia -->
          <div class="col-span-12 md:col-span-5">
            <BaseCard rounded="md" class="h-full p-6">
              <BaseHeading as="h4" size="xs" weight="medium" lead="none" class="text-muted-700 dark:text-muted-100 uppercase mb-4">
                Resumo do Dia
              </BaseHeading>
              <div class="space-y-3">
                <div class="flex items-center justify-between p-3 bg-muted-50 dark:bg-muted-900 rounded-lg">
                  <div class="flex items-center gap-3">
                    <div class="size-10 rounded-full bg-success-100 dark:bg-success-900 flex items-center justify-center">
                      <Icon name="lucide:trending-up" class="size-5 text-success-600" />
                    </div>
                    <div>
                      <BaseText size="xs" class="text-muted-500">Depósitos</BaseText>
                      <BaseText weight="semibold">{{ (operationDay ? Number(operationDay.total_deposit) : 0).toFixed(2) }}</BaseText>
                    </div>
                  </div>
                </div>
                <div class="flex items-center justify-between p-3 bg-muted-50 dark:bg-muted-900 rounded-lg">
                  <div class="flex items-center gap-3">
                    <div class="size-10 rounded-full bg-danger-100 dark:bg-danger-900 flex items-center justify-center">
                      <Icon name="lucide:trending-down" class="size-5 text-danger-600" />
                    </div>
                    <div>
                      <BaseText size="xs" class="text-muted-500">Saques</BaseText>
                      <BaseText weight="semibold">{{ (operationDay ? Number(operationDay.total_withdraw) : 0).toFixed(2) }}</BaseText>
                    </div>
                  </div>
                </div>
                <div class="flex items-center justify-between p-3 bg-muted-50 dark:bg-muted-900 rounded-lg">
                  <div class="flex items-center gap-3">
                    <div class="size-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <Icon name="lucide:users" class="size-5 text-primary-600" />
                    </div>
                    <div>
                      <BaseText size="xs" class="text-muted-500">Novos Clientes</BaseText>
                      <BaseText weight="semibold">{{ (operationDay ? operationDay.total_new_clients : 0) }}</BaseText>
                    </div>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- Fundos Disponíveis -->
          <div class="col-span-12 md:col-span-6">
            <BaseCard rounded="md" class="h-full p-6">
              <div class="flex items-center justify-between mb-4">
                <BaseHeading as="h4" size="xs" weight="medium" lead="none" class="text-muted-700 dark:text-muted-100 uppercase">
                  Fundos Disponíveis
                </BaseHeading>
              </div>
              <div v-if="availableFunds.length === 0" class="text-center py-8">
                <Icon name="lucide:wallet" class="size-12 text-muted-300 mx-auto mb-2" />
                <BaseText size="sm" class="text-muted-500">Nenhum fundo disponível</BaseText>
              </div>
              <div v-else class="space-y-3">
                <div 
                  v-for="fund in availableFunds" 
                  :key="fund.id"
                  class="flex items-center justify-between p-3 bg-muted-50 dark:bg-muted-900 rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <div 
                      class="size-3 rounded-full"
                      :class="fund.type === 'money' ? 'bg-primary-500' : 'bg-success-500'"
                    />
                    <BaseText weight="medium">{{ fund.name }}</BaseText>
                  </div>
                  <BaseText weight="semibold" class="text-muted-800 dark:text-muted-100">
                    R$ {{ Number(fund.availableAmount || 0).toFixed(2) }}
                  </BaseText>
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- Top 3 Depositantes -->
          <div class="col-span-12 md:col-span-6">
            <BaseCard rounded="md" class="h-full p-6">
              <div class="flex items-center justify-between mb-4">
                <BaseHeading as="h4" size="xs" weight="medium" lead="none" class="text-muted-700 dark:text-muted-100 uppercase">
                  Top 3 Depositantes
                </BaseHeading>
                <Icon name="lucide:trophy" class="size-5 text-warning-500" />
              </div>
              <div v-if="topDepositors.length === 0" class="text-center py-8">
                <Icon name="lucide:users" class="size-12 text-muted-300 mx-auto mb-2" />
                <BaseText size="sm" class="text-muted-500">Nenhum depósito hoje</BaseText>
              </div>
              <div v-else class="space-y-3">
                <div 
                  v-for="(depositor, index) in topDepositors" 
                  :key="index"
                  class="flex items-center justify-between p-3 bg-muted-50 dark:bg-muted-900 rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <div 
                      class="size-8 rounded-full flex items-center justify-center font-bold"
                      :class="{
                        'bg-warning-100 text-warning-600': index === 0,
                        'bg-muted-200 text-muted-600': index === 1,
                        'bg-orange-100 text-orange-600': index === 2
                      }"
                    >
                      {{ index + 1 }}
                    </div>
                    <BaseText weight="medium">{{ depositor.name }}</BaseText>
                  </div>
                  <BaseText weight="semibold" class="text-success-600">
                    R$ {{ depositor.total.toFixed(2) }}
                  </BaseText>
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- Transações Recentes -->
          <div class="col-span-12">
            <BaseCard rounded="md" class="p-4 md:p-6">
              <div class="items-center justify-between flex mb-4">
                <BaseHeading as="h4" size="xs" weight="medium" lead="none" class="text-muted-700 dark:text-muted-100 uppercase">
                  Transações Recentes
                </BaseHeading>
                <NuxtLink to="/dashboard/transactions" class="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
                  Ver todas
                  <Icon name="lucide:arrow-right" class="size-4" />
                </NuxtLink>
              </div>
              <div v-if="recentTransactions.length === 0" class="text-center py-12">
                <Icon name="lucide:inbox" class="size-12 text-muted-300 mx-auto mb-2" />
                <BaseText class="text-muted-500">Nenhuma transação hoje</BaseText>
              </div>
              <div v-else class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-muted-200 dark:border-muted-700">
                      <th class="text-left py-3 px-2">
                        <BaseText size="xs" weight="medium" class="text-muted-500 uppercase">Data/Hora</BaseText>
                      </th>
                      <th class="text-left py-3 px-2">
                        <BaseText size="xs" weight="medium" class="text-muted-500 uppercase">Cliente</BaseText>
                      </th>
                      <th class="text-right py-3 px-2">
                        <BaseText size="xs" weight="medium" class="text-muted-500 uppercase">Valor</BaseText>
                      </th>
                      <th class="text-left py-3 px-2">
                        <BaseText size="xs" weight="medium" class="text-muted-500 uppercase">Tipo</BaseText>
                      </th>
                      <th class="text-left py-3 px-2">
                        <BaseText size="xs" weight="medium" class="text-muted-500 uppercase">Fundo</BaseText>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="transaction in recentTransactions.slice(0, 8)" 
                      :key="transaction.id"
                      class="border-b border-muted-100 dark:border-muted-800 hover:bg-muted-50 dark:hover:bg-muted-900 transition-colors"
                    >
                      <td class="py-3 px-2">
                        <BaseText size="sm" class="text-muted-600 dark:text-muted-400">
                          {{ new Date(transaction.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }}
                        </BaseText>
                      </td>
                      <td class="py-3 px-2">
                        <BaseText size="sm" weight="medium">{{ transaction.user.name }}</BaseText>
                      </td>
                      <td class="py-3 px-2 text-right">
                        <BaseText 
                          size="sm" 
                          weight="semibold"
                          :class="transaction.type === 'in' ? 'text-success-600' : 'text-danger-600'"
                        >
                          {{ transaction.type === 'in' ? '+' : '-' }}R$ {{ transaction.amount.toFixed(2) }}
                        </BaseText>
                      </td>
                      <td class="py-3 px-2">
                        <BaseTag 
                          size="sm" 
                          rounded="full"
                          :variant="transaction.type === 'in' ? 'primary' : 'dark'"
                        >
                          {{ transaction.transactionType }}
                        </BaseTag>
                      </td>
                      <td class="py-3 px-2">
                        <BaseText size="sm" class="text-muted-500">{{ transaction.account }}</BaseText>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </BaseCard>
          </div>
        </div>
      </div>
      <div class="col-span-12 lg:col-span-3">
        <!-- Column -->
        <div class="relative flex flex-col gap-4">
          <!-- Ações Rápidas -->
          <BaseCard rounded="md" class="p-6">
            <BaseHeading as="h3" size="sm" weight="medium" class="text-muted-900 dark:text-white mb-4">
              Ações Rápidas
            </BaseHeading>
            <div class="space-y-3">
              <BaseButton
                v-if="operationDay && !operationDay.date_closed"
                variant="destructive"
                class="w-full"
                size="md"
                @click="closeCashier"
              >
                <Icon name="lucide:lock" class="size-4 me-2" />
                Fechar Caixa
              </BaseButton>
              
              <BaseButton
                variant="primary"
                class="w-full"
                size="md"
                to="/dashboard/clients"
              >
                <Icon name="lucide:plus-circle" class="size-4 me-2" />
                Nova Transação
              </BaseButton>
              
              <BaseButton
                variant="muted"
                class="w-full"
                size="md"
                to="/users"
              >
                <Icon name="lucide:user-plus" class="size-4 me-2" />
                Novo Cliente
              </BaseButton>
            </div>
          </BaseCard>

          <!-- Status do Caixa -->
          <BaseCard rounded="md" class="p-6">
            <div class="flex items-center justify-between mb-4">
              <BaseHeading as="h3" size="sm" weight="medium" class="text-muted-900 dark:text-white">
                Status do Caixa
              </BaseHeading>
              <div 
                class="size-3 rounded-full animate-pulse"
                :class="operationDay && !operationDay.date_closed ? 'bg-success-500' : 'bg-danger-500'"
              />
            </div>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <BaseText size="sm" class="text-muted-500">Aberto em:</BaseText>
                <BaseText size="sm" weight="medium">
                  {{ operationDay ? new Date(operationDay.date_opened).toLocaleDateString('pt-BR') : '-' }}
                </BaseText>
              </div>
              <div class="flex items-center justify-between">
                <BaseText size="sm" class="text-muted-500">Saldo Líquido:</BaseText>
                <BaseText size="sm" weight="semibold" class="text-success-600">
                  R$ {{ (operationDay ? Number(operationDay.total_deposit) - Number(operationDay.total_withdraw) : 0).toFixed(2) }}
                </BaseText>
              </div>
              <div class="flex items-center justify-between pt-3 border-t border-muted-200 dark:border-muted-700">
                <BaseText size="sm" class="text-muted-500">Total Fundos:</BaseText>
                <BaseText size="sm" weight="semibold">
                  R$ {{ availableFunds.reduce((sum, f) => sum + Number(f.availableAmount || 0), 0).toFixed(2) }}
                </BaseText>
              </div>
            </div>
          </BaseCard>

          <!-- Data do Caixa -->
          <BaseCard rounded="md" class="p-2">
            <LazyAddonDatepicker 
              v-model="date" 
              locale="pt-BR" 
              :label="operationDay ? 'Data da Operação' : 'Data Atual'"
              :disabled="true"
            />
          </BaseCard>

          <!-- Sorteios Ativos -->
          <BaseCard rounded="md" class="p-6">
            <div class="flex items-center justify-between mb-4">
              <BaseHeading as="h3" size="sm" weight="medium" class="text-muted-900 dark:text-white">
                Sorteios Ativos
              </BaseHeading>
              <Icon name="lucide:gift" class="size-5 text-primary-500" />
            </div>
            <div v-if="activeRaffles.length === 0" class="text-center py-8">
              <Icon name="lucide:gift" class="size-12 text-muted-300 mx-auto mb-2" />
              <BaseText size="sm" class="text-muted-500">Nenhum sorteio ativo</BaseText>
              <BaseButton
                variant="muted"
                size="sm"
                class="mt-3"
                to="/dashboard/raffles"
              >
                Criar Sorteio
              </BaseButton>
            </div>
            <div v-else class="space-y-3">
              <div 
                v-for="raffle in activeRaffles" 
                :key="raffle.id"
                class="p-3 bg-muted-50 dark:bg-muted-900 rounded-lg"
              >
                <BaseText weight="medium" size="sm">{{ raffle.name }}</BaseText>
                <div class="flex items-center justify-between mt-2">
                  <BaseText size="xs" class="text-muted-500">Participantes</BaseText>
                  <BaseTag size="sm" variant="primary">{{ raffle.participantCount || 0 }}</BaseTag>
                </div>
              </div>
            </div>
          </BaseCard>

        </div>
      </div>
    </div>
    </div>
  </div>
</template>
