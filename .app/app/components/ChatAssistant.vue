<script setup lang="ts">
/**
 * ChatAssistant - Componente reutilizável de chat com IA
 * Usado tanto na página pública (/links) quanto no dashboard (logado)
 */
const props = defineProps<{
  /** Se true, usa endpoint autenticado. Se false, usa público */
  authenticated?: boolean
  /** URL para o botão de voltar (opcional) */
  showBack?: string
  /** Classes extras para o container */
  containerClass?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { useCustomFetch } = useApi()
const config = useRuntimeConfig()
const apiBaseUrl = (config.public.apiBase as string || '').replace(/\/$/, '')

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
}

const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const threadId = ref<string | null>(null)
const isLoading = ref(false)
const chatContainer = ref<HTMLElement>()
const inputRef = ref<HTMLInputElement>()

// Mensagem de boas vindas
onMounted(() => {
  messages.value.push({
    id: 'welcome',
    role: 'assistant',
    content: 'Oi! Tudo bem? 😊\n\nEu sou a **Sofia**, da equipe do **Gestor IRPF**. Posso te ajudar com qualquer dúvida sobre o sistema — como funciona, preços, planos, ou qualquer outra coisa.\n\nNo que posso te ajudar?',
    timestamp: new Date(),
  })
  nextTick(() => inputRef.value?.focus())
})

async function sendMessage() {
  const text = inputMessage.value.trim()
  if (!text || isLoading.value) return

  // Adicionar mensagem do usuário
  const userMsg: ChatMessage = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: text,
    timestamp: new Date(),
  }
  messages.value.push(userMsg)
  inputMessage.value = ''

  // Adicionar placeholder de loading
  const loadingMsg: ChatMessage = {
    id: `loading-${Date.now()}`,
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    isLoading: true,
  }
  messages.value.push(loadingMsg)
  isLoading.value = true
  scrollToBottom()

  try {
    let result: any

    if (props.authenticated) {
      // Endpoint autenticado
      const { data } = await useCustomFetch<any>('/ai-assistant/chat', {
        method: 'POST',
        body: {
          message: text,
          threadId: threadId.value,
        },
      })
      result = data
    }
    else {
      // Endpoint público
      const res = await $fetch<any>(`${apiBaseUrl}/ai-assistant/public/chat`, {
        method: 'POST',
        body: {
          message: text,
          threadId: threadId.value,
        },
      })
      result = res
    }

    // Remover loading
    const loadingIdx = messages.value.findIndex(m => m.id === loadingMsg.id)
    if (loadingIdx !== -1) messages.value.splice(loadingIdx, 1)

    if (result?.success && result.data) {
      threadId.value = result.data.threadId

      // Divide a resposta em blocos, mas mantém listas juntas
      const rawParts = result.data.response
        .split('\n\n')
        .map((b: string) => b.trim())
        .filter((b: string) => b.length > 0)

      const bubbles: string[] = []
      for (const part of rawParts) {
        // Se a parte atual começa com '-' (item) e já temos um balão, junta com o anterior
        if (part.startsWith('-') && bubbles.length > 0) {
          bubbles[bubbles.length - 1] += `\n\n${part}`
        }
        else {
          bubbles.push(part)
        }
      }

      for (let i = 0; i < bubbles.length; i++) {
        const bubbleId = `assistant-bubble-${Date.now()}-${i}`

        // Adiciona indicador de "digitando..."
        messages.value.push({
          id: bubbleId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isLoading: true,
        })
        scrollToBottom()

        // Tempo de "digitação" mais humano (mínimo 2s, escala com texto)
        const typingTime = Math.min(Math.max(bubbles[i].length * 15, 2000), 4500)
        await new Promise(resolve => setTimeout(resolve, typingTime))

        // Exibe o conteúdo real
        const msgIdx = messages.value.findIndex(m => m.id === bubbleId)
        if (msgIdx !== -1) {
          if (messages.value[msgIdx]) {
            messages.value[msgIdx].content = bubbles[i]
            messages.value[msgIdx].isLoading = false
          }
        }

        scrollToBottom()

        // Pausa entre balões
        if (i < bubbles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800))
        }
      }
    }
    else {
      messages.value.push({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente? Se o problema persistir, entre em contato pelo nosso [WhatsApp](https://wa.me/5511945390461).',
        timestamp: new Date(),
      })
    }
  }
  catch (error) {
    // Remover loading
    const loadingIdx = messages.value.findIndex(m => m.id === loadingMsg.id)
    if (loadingIdx !== -1) messages.value.splice(loadingIdx, 1)

    messages.value.push({
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: 'Ops! Não consegui me conectar ao servidor. Verifique sua conexão ou tente novamente em alguns segundos. 😅',
      timestamp: new Date(),
    })
  }
  finally {
    isLoading.value = false
    scrollToBottom()
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// Formatar markdown simples (bold, links, quebras de linha)
function formatMessage(content: string): string {
  return content
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary-500 hover:text-primary-600 underline font-medium">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br>')
}

// Quick action buttons
const quickActions = [
  { text: 'Como funciona o sistema?', icon: 'solar:question-circle-bold-duotone' },
  { text: 'Quanto custa?', icon: 'solar:tag-price-bold-duotone' },
  { text: 'Quero testar grátis', icon: 'solar:user-plus-bold-duotone' },
  // { text: 'Agendar uma apresentação', icon: 'solar:calendar-date-bold-duotone' },
]

function sendQuickAction(text: string) {
  inputMessage.value = text
  sendMessage()
}
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-muted-950" :class="containerClass">
    <!-- Chat Header -->
    <div
      class="shrink-0 flex items-center justify-between p-4 border-b border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-950/50">
      <div class="flex items-center gap-3">
        <!-- Back Button (Optional) -->
        <NuxtLink v-if="props.showBack" :to="props.showBack"
          class="hover:bg-muted-100 dark:hover:bg-muted-800 text-muted-400 hover:text-muted-600 rounded-lg p-1.5 transition-colors mr-1">
          <Icon name="lucide:arrow-left" class="size-5" />
        </NuxtLink>

        <div class="relative">
          <div class="size-10 rounded-full overflow-hidden ring-2 ring-primary-500/10">
            <img src="/img/sofia-avatar.png" alt="Sofia" class="size-full object-cover">
          </div>
          <span
            class="absolute bottom-0 right-0 size-2.5 rounded-full bg-green-500 border-2 border-white dark:border-muted-950"></span>
        </div>
        <div>
          <h3 class="text-sm font-bold text-muted-800 dark:text-white leading-tight">Sofia</h3>
          <p class="text-[10px] text-muted-400 dark:text-muted-500 flex items-center gap-1">
            Consultora Virtual • Online agora
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <BaseThemeToggle />
        <button v-if="props.authenticated" type="button"
          class="p-2 rounded-full hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors" @click="emit('close')">
          <Icon name="lucide:x" class="size-5 text-muted-400" />
        </button>
      </div>
    </div>

    <!-- Chat Messages -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto nui-slimscroll p-4 space-y-4">
      <template v-for="msg in messages" :key="msg.id">
        <!-- Mensagem da IA -->
        <div v-if="msg.role === 'assistant'" class="flex gap-3 max-w-[92%] animate-fade-in">
          <div class="relative shrink-0 mt-0.5">
            <div
              class="size-9 rounded-full overflow-hidden ring-2 ring-primary-500/20 shadow-sm transition-transform hover:scale-105 active:scale-95 duration-200">
              <img src="/img/sofia-avatar.png" alt="Sofia" class="size-full object-cover">
            </div>
            <!-- Online Status Dot -->
            <span
              class="absolute bottom-0 right-0 size-2.5 rounded-full bg-green-500 border-2 border-white dark:border-muted-950"></span>
          </div>
          <div class="min-w-0">
            <div v-if="msg.isLoading"
              class="flex items-center gap-2 py-3 px-4 rounded-2xl rounded-tl-sm bg-muted-100 dark:bg-muted-800">
              <div class="flex gap-1">
                <span class="size-2 rounded-full bg-muted-400 animate-bounce" style="animation-delay: 0ms" />
                <span class="size-2 rounded-full bg-muted-400 animate-bounce" style="animation-delay: 150ms" />
                <span class="size-2 rounded-full bg-muted-400 animate-bounce" style="animation-delay: 300ms" />
              </div>
              <span class="text-xs text-muted-400 ml-1">Sofia está digitando...</span>
            </div>
            <div v-else
              class="py-3 px-4 rounded-2xl rounded-tl-sm bg-muted-100 dark:bg-muted-800 text-sm text-muted-700 dark:text-muted-200 leading-relaxed"
              v-html="formatMessage(msg.content)" />
            <span class="text-[10px] text-muted-400 mt-1 ml-1 block">
              {{ msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }}
            </span>
          </div>
        </div>

        <!-- Mensagem do usuário -->
        <div v-else class="flex justify-end animate-fade-in">
          <div class="max-w-[80%]">
            <div
              class="py-3 px-4 rounded-2xl rounded-tr-sm bg-primary-500 text-white text-sm leading-relaxed shadow-sm shadow-primary-500/20">
              {{ msg.content }}
            </div>
            <span class="text-[10px] text-muted-400 mt-1 mr-1 block text-right">
              {{ msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }}
            </span>
          </div>
        </div>
      </template>

      <!-- Quick actions (appear after welcome message when no user messages yet) -->
      <div v-if="messages.length <= 1" class="flex flex-wrap gap-2 mt-2 animate-fade-in">
        <button v-for="action in quickActions" :key="action.text" type="button"
          class="flex items-center gap-1.5 px-3 py-2 rounded-full border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10 text-primary-600 dark:text-primary-400 text-xs font-medium hover:bg-primary-100 dark:hover:bg-primary-900/20 transition-colors"
          @click="sendQuickAction(action.text)">
          <Icon :name="action.icon" class="size-3.5" />
          {{ action.text }}
        </button>
      </div>
    </div>

    <!-- Input Area -->
    <div class="shrink-0 border-t border-muted-200 dark:border-muted-800 p-3 bg-white dark:bg-muted-950/50">
      <form class="flex items-center gap-2" @submit.prevent="sendMessage">
        <input ref="inputRef" v-model="inputMessage" type="text" placeholder="Digite sua dúvida..." autocomplete="off"
          class="flex-1 bg-muted-100 dark:bg-muted-800 text-muted-800 dark:text-muted-100 rounded-full px-4 py-2.5 text-sm placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
          :disabled="isLoading" @keydown.enter.prevent="sendMessage">
        <button type="submit" :disabled="isLoading || !inputMessage.trim()"
          class="size-10 rounded-full bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-sm shadow-primary-500/30 active:scale-95">
          <Icon v-if="isLoading" name="svg-spinners:ring-resize" class="size-4" />
          <Icon v-else name="lucide:send" class="size-4" />
        </button>
      </form>
      <p class="text-[10px] text-muted-400 text-center mt-2">
        Sofia é uma IA e pode cometer erros. Para dúvidas complexas, contate nosso
        <a href="https://wa.me/5511945390461" target="_blank" class="text-primary-500 hover:underline">suporte
          humano</a>.
      </p>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {

  0%,
  80%,
  100% {
    transform: scale(0);
  }

  40% {
    transform: scale(1);
  }
}
</style>
