<script setup lang="ts">
import { onKeyStroke, onClickOutside } from '@vueuse/core'

interface Props {
  welcomeMessage?: string
  forceShow?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  welcomeMessage: 'Sou a Sofia, precisa de ajuda? Estou online! 👋',
  forceShow: false,
})

const isOpen = ref(false)
const showWelcomeBubble = ref(true)
const container = ref<HTMLElement | null>(null)

// If forceShow is true, ensure bubble is visible on mount
onMounted(() => {
  if (props.forceShow) {
    showWelcomeBubble.value = true
  }
  
  // Close popover when clicking outside
  onClickOutside(container, () => {
    if (isOpen.value) isOpen.value = false
  })
})

// Watch for forceShow changes to trigger bubble
watch(() => props.forceShow, (val) => {
  if (val) showWelcomeBubble.value = true
})
</script>

<template>
  <div ref="container" class="fixed bottom-6 right-6 z-[60]">
    <div class="relative flex flex-col items-end">
      <!-- Chat Interface Popover -->
      <Transition enter-active-class="transition duration-300 ease-out origin-bottom-right"
        enter-from-class="translate-y-4 opacity-0 scale-95" enter-to-class="translate-y-0 opacity-100 scale-100"
        leave-active-class="transition duration-200 ease-in origin-bottom-right"
        leave-from-class="translate-y-0 opacity-100 scale-100" leave-to-class="translate-y-4 opacity-0 scale-95">
        <div v-if="isOpen"
          class="w-[360px] sm:w-[400px] h-[600px] max-h-[85vh] mb-4 overflow-hidden rounded-2xl border border-muted-200 dark:border-muted-800 shadow-2xl bg-white dark:bg-muted-950 flex flex-col">
          <ChatAssistant :authenticated="true" @close="isOpen = false" />
        </div>
      </Transition>

      <!-- Main Button (Sofia Avatar) -->
      <button type="button"
        class="focus:outline-none focus:ring-4 focus:ring-primary-500/30 rounded-full transition-all duration-300"
        :class="{ 'hover:scale-105 active:scale-95': !isOpen }" @click="isOpen = !isOpen">

        <div v-if="!isOpen" class="relative size-14 shadow-xl rounded-full">
          <div class="size-full rounded-full overflow-hidden border-[3px] border-primary-500">
            <img src="/img/sofia-avatar.png" alt="Sofia Suporte" class="size-full object-cover" />
          </div>
          <!-- Pulse indicator -->
          <span
            class="absolute bottom-0 right-0 z-10 size-3.5 rounded-full bg-success-500 border-2 border-white dark:border-muted-950 animate-pulse"></span>

          <!-- Welcome Bubble -->
          <Transition enter-active-class="transition duration-500 ease-out delay-500"
            enter-from-class="opacity-0 translate-x-4 scale-95" enter-to-class="opacity-100 translate-x-0 scale-100"
            leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95">
            <div v-if="showWelcomeBubble && !isOpen"
              class="absolute right-[calc(100%+16px)] top-1/2 -translate-y-1/2 w-48 p-3 rounded-2xl bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-800 shadow-xl cursor-default"
              @click.stop>
              <button type="button"
                class="absolute -top-2 -left-2 size-6 rounded-full bg-white dark:bg-muted-800 border border-muted-200 dark:border-muted-700 flex items-center justify-center text-muted-500 hover:text-muted-800 dark:hover:text-muted-200 transition-colors shadow-sm hover:scale-105"
                @click.stop="showWelcomeBubble = false">
                <Icon name="lucide:x" class="size-3" />
              </button>

              <div class="flex items-start">
                <p class="text-[13px] font-medium text-muted-800 dark:text-muted-100 leading-snug">
                  {{ props.welcomeMessage }}
                </p>
              </div>

              <!-- Small arrow pointing right -->
              <span
                class="absolute right-[-7px] top-1/2 -translate-y-1/2 border-y-[6px] border-y-transparent border-l-[7px] border-l-white dark:border-l-muted-900"></span>
            </div>
          </Transition>
        </div>

        <div v-else
          class="flex size-14 items-center justify-center rounded-full bg-muted-800 text-white shadow-lg hover:scale-105 transition-all duration-300">
          <Icon name="lucide:x" class="size-6" />
        </div>
      </button>
    </div>
  </div>
</template>
