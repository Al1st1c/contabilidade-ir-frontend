<script setup lang="ts">
import { io } from 'socket.io-client'

definePageMeta({
  layout: 'client',
  title: 'Chat',
})

const route = useRoute()
const config = useRuntimeConfig()
const apiBaseUrl = (config.public.apiBase as string || '').replace(/\/$/, '')
const { useCustomFetch } = useApi()
const auth = useAuth()
const user = auth.user

const token = computed(() => route.query.token as string | undefined)
const isPublicMode = computed(() => Boolean(token.value))

const messages = ref<any[]>([])
const chatInput = ref('')
const isSending = ref(false)
const isLoading = ref(true)
const chatContainerRef = ref<HTMLElement | null>(null)
const socket = ref<any>(null)
const declarationId = ref<string | null>(null)

// Load declaration ID and messages
async function loadChat() {
  isLoading.value = true
  try {
    let data: any
    if (isPublicMode.value) {
      // Public mode: fetch via token
      const res = await fetch(`${apiBaseUrl}/public/${token.value}/chat`)
      data = await res.json()

      // Also get the declaration ID for socket
      const linkRes = await fetch(`${apiBaseUrl}/public/${token.value}`)
      const linkData = await linkRes.json()
      if (linkData?.success) {
        declarationId.value = linkData.data?.declaration?.id || null
      }
    }
    else {
      // Authenticated mode: get from user's declaration
      const clientRes = await useCustomFetch<any>(`/clients/${(user.value as any)?.id}`)
      if (clientRes.data?.success) {
        const { selectedTaxYear } = useClientSession()
        const dec = clientRes.data.data.taxDeclarations?.find((d: any) => Number(d.taxYear) === selectedTaxYear.value)
        if (dec) {
          declarationId.value = dec.id
          const chatRes = await useCustomFetch<any>(`/chat/${dec.id}`)
          data = chatRes.data
        }
      }
    }

    if (data?.success) {
      messages.value = data.data || []
      await nextTick()
      scrollToBottom()
    }

    // Mark as read
    if (isPublicMode.value && token.value) {
      await fetch(`${apiBaseUrl}/public/${token.value}/chat/read`, { method: 'PATCH' })
    }
    else if (declarationId.value) {
      await useCustomFetch<any>(`/chat/${declarationId.value}/read`, { method: 'PATCH' })
    }
  }
  catch (error) {
    console.error('Erro ao carregar chat:', error)
  }
  finally {
    isLoading.value = false
  }
}

async function sendMessage() {
  if (!chatInput.value.trim() || isSending.value)
    return
  isSending.value = true
  const content = chatInput.value.trim()
  chatInput.value = ''
  try {
    let result: any
    if (isPublicMode.value) {
      const res = await fetch(`${apiBaseUrl}/public/${token.value}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      result = await res.json()
    }
    else if (declarationId.value) {
      const { data } = await useCustomFetch<any>(`/chat/${declarationId.value}`, {
        method: 'POST',
        body: { content },
      })
      result = data
    }

    if (result?.success) {
      const exists = messages.value.find(m => m.id === result.data.id)
      if (!exists) {
        messages.value.push(result.data)
        await nextTick()
        scrollToBottom()
      }
    }
  }
  catch {
    chatInput.value = content
  }
  finally {
    isSending.value = false
  }
}

function scrollToBottom() {
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
  }
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString())
    return 'Hoje'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString())
    return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

onMounted(async () => {
  await loadChat()

  // Connect socket for real-time
  try {
    const url = (config.public.apiBase || '').replace(/\/$/, '')
    socket.value = io(url, { transports: ['websocket'], autoConnect: true })

    if (declarationId.value) {
      socket.value.emit('chat:join', { declarationId: declarationId.value })
      socket.value.on('chat:message', (msg: any) => {
        if (!msg)
          return
        const exists = messages.value.find(m => m.id === msg.id)
        if (!exists) {
          messages.value.push(msg)
          nextTick(() => scrollToBottom())
          // Mark as read since we're viewing
          if (isPublicMode.value && token.value) {
            fetch(`${apiBaseUrl}/public/${token.value}/chat/read`, { method: 'PATCH' })
          }
          else if (declarationId.value) {
            useCustomFetch<any>(`/chat/${declarationId.value}/read`, { method: 'PATCH' })
          }
        }
      })
    }
  }
  catch { }
})

onBeforeUnmount(() => {
  if (socket.value) {
    socket.value.disconnect()
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <Icon name="solar:chat-round-dots-bold-duotone" class="size-6 text-primary-500" />
      <BaseHeading as="h2" size="lg" weight="bold" class="text-muted-800 dark:text-white">
        Chat
      </BaseHeading>
    </div>

    <BaseCard class="relative overflow-hidden border-none shadow-sm bg-white dark:bg-muted-950">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <Icon name="svg-spinners:ring-resize" class="size-8 text-primary-500" />
      </div>

      <template v-else>
        <!-- Messages -->
        <div ref="chatContainerRef" class="h-[60vh] overflow-y-auto p-4 space-y-1 scroll-smooth">
          <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center">
            <Icon name="solar:chat-round-dots-linear" class="size-16 text-muted-200 dark:text-muted-700 mb-3" />
            <BaseText size="sm" class="text-muted-400 font-medium">Nenhuma mensagem ainda</BaseText>
            <BaseText size="xs" class="text-muted-300 mt-1">Envie uma mensagem para iniciar a conversa</BaseText>
          </div>

          <template v-for="(msg, idx) in messages" :key="msg.id">
            <!-- Date separator -->
            <div v-if="idx === 0 || formatDate(msg.createdAt) !== formatDate(messages[idx - 1].createdAt)"
              class="text-center py-3">
              <span class="text-[10px] bg-muted-100 dark:bg-muted-800 text-muted-400 px-3 py-1 rounded-full">
                {{ formatDate(msg.createdAt) }}
              </span>
            </div>

            <!-- Message bubble -->
            <div class="flex" :class="msg.senderType === 'client' ? 'justify-end' : 'justify-start'">
              <div class="max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed" :class="msg.senderType === 'client'
                ? 'bg-primary-500 text-white rounded-br-md'
                : 'bg-muted-100 dark:bg-muted-800 text-muted-800 dark:text-muted-200 rounded-bl-md'">
                <p v-if="msg.senderType === 'staff'" class="text-[10px] font-bold mb-0.5"
                  :class="msg.senderType === 'staff' ? 'text-primary-600 dark:text-primary-400' : ''">
                  {{ msg.senderName || 'Equipe' }}
                </p>
                <p class="whitespace-pre-wrap break-words">{{ msg.content }}</p>
                <p class="text-[10px] mt-0.5 text-right"
                  :class="msg.senderType === 'client' ? 'text-white/60' : 'text-muted-400'">
                  {{ formatTime(msg.createdAt) }}
                </p>
              </div>
            </div>
          </template>
        </div>

        <!-- Input -->
        <div class="border-t border-muted-200 dark:border-muted-800 p-3 flex items-center gap-2">
          <input v-model="chatInput"
            class="flex-1 rounded-xl border border-muted-200 dark:border-muted-700 bg-muted-50 dark:bg-muted-900 px-4 py-2.5 text-sm text-muted-800 dark:text-muted-200 placeholder:text-muted-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            placeholder="Digite sua mensagem..." @keydown.enter.prevent="sendMessage" />
          <button
            class="size-10 flex items-center justify-center rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            :disabled="!chatInput.trim() || isSending" @click="sendMessage">
            <Icon v-if="isSending" name="svg-spinners:ring-resize" class="size-4" />
            <Icon v-else name="solar:plain-3-outline" class="size-4" />
          </button>
        </div>
      </template>
    </BaseCard>
  </div>
</template>
