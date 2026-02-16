<script setup lang="ts">
import { onKeyStroke, onClickOutside } from '@vueuse/core'
const isOpen = ref(false)
const isVideoModalOpen = ref(false)

const videoUrl = 'https://gestorx-files.s3.us-east-1.amazonaws.com/tutorial/tutorial-onboarding.mov'

function openWhatsApp() {
  window.open('https://wa.me/551132808396', '_blank')
}

// Close on escape
onKeyStroke('Escape', () => {
  if (isVideoModalOpen.value) isVideoModalOpen.value = false
  if (isOpen.value) isOpen.value = false
})

const container = ref(null)

onMounted(() => {
  // Close popover when clicking outside
  onClickOutside(container, () => (isOpen.value = false))
})
</script>

<template>
  <div ref="container" class="fixed bottom-6 right-6 z-[60]">
    <div class="relative flex flex-col items-end">
      <!-- Popup Menu -->
      <Transition enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-2 opacity-0 scale-95" enter-to-class="translate-y-0 opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in" leave-from-class="translate-y-0 opacity-100 scale-100"
        leave-to-class="translate-y-2 opacity-0 scale-95">
        <div v-if="isOpen"
          class="w-64 bg-white dark:bg-muted-900 border border-muted-200 dark:border-muted-800 rounded-2xl shadow-xl p-2 mb-4">
          <div class="flex flex-col gap-1">
            <div class="px-3 py-2 border-b border-muted-100 dark:border-muted-800 mb-1">
              <p class="text-[10px] font-bold text-muted-400 uppercase tracking-widest">Central de Ajuda</p>
            </div>

            <button type="button"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors text-left w-full group"
              @click="isOpen = false; isVideoModalOpen = true">
              <div
                class="size-9 rounded-lg bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform">
                <Icon name="ph:play-circle-fill" class="size-5" />
              </div>
              <div>
                <p class="text-sm font-medium text-muted-800 dark:text-muted-100">Ver Tutorial</p>
                <p class="text-[10px] text-muted-500">Como funciona o sistema</p>
              </div>
            </button>

            <button type="button"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors text-left w-full group"
              @click="isOpen = false; openWhatsApp()">
              <div
                class="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <Icon name="ph:whatsapp-logo-fill" class="size-5" />
              </div>
              <div>
                <p class="text-sm font-medium text-muted-800 dark:text-muted-100">Suporte WhatsApp</p>
                <p class="text-[10px] text-muted-500">Tire suas dúvidas agora</p>
              </div>
            </button>
          </div>
        </div>
      </Transition>

      <!-- Main Button -->
      <button type="button"
        class="flex size-12 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 relative group"
        :class="{ '!bg-muted-800 dark:!bg-muted-700': isOpen }" @click="isOpen = !isOpen">
        <Icon :name="isOpen ? 'ph:x-bold' : 'ph:chat-teardrop-dots-fill'"
          class="size-6 transition-transform duration-300" :class="{ 'rotate-90': isOpen }" />

        <!-- Subtle Pulse Indicator -->
        <span class="absolute -top-1 -right-1 flex size-3" v-if="!isOpen">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full size-3 bg-primary-600"></span>
        </span>

        <!-- Tooltip on hover (desktop only) -->
        <span
          class="absolute right-full mr-3 px-2 py-1 rounded bg-muted-900 text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity hidden md:block pointer-events-none">
          Precisa de ajuda?
        </span>
      </button>
    </div>

    <!-- Video Modal -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100"
        leave-to-class="opacity-0">
        <div v-if="isVideoModalOpen"
          class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-muted-950/90 backdrop-blur-sm"
          @click.self="isVideoModalOpen = false">
          <div
            class="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border border-muted-800">
            <button type="button"
              class="absolute top-4 right-4 z-[110] size-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              @click="isVideoModalOpen = false">
              <Icon name="ph:x-bold" class="size-5" />
            </button>

            <video v-if="isVideoModalOpen" class="w-full h-full" controls autoplay :src="videoUrl" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
