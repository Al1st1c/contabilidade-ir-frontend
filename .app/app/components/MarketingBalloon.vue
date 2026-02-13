<script setup lang="ts">
const route = useRoute()

const isVisible = ref(true)
const { user } = useAuth()

// Show only on the main dashboard page
const isDashboardPage = computed(() => {
  return route.path === '/dashboard' || route.path === '/dashboard/'
})

const isOwner = computed(() => {
  const roleName = user.value?.role?.name?.toLowerCase()
  return (roleName === 'master' || user.value?.isAdmin) && isDashboardPage.value
})

function close() {
  isVisible.value = false
}
</script>

<template>
  <div v-if="isVisible && isOwner" class="fixed bottom-6 right-6 z-[100] animate-bounce-subtle">
    <div class="relative">
      <!-- Close Button -->
      <button @click.stop="close"
        class="absolute -top-2 -right-2 size-6 rounded-full bg-muted-800 text-white flex items-center justify-center hover:bg-muted-700 transition-colors z-10 border-2 border-white dark:border-muted-950">
        <Icon name="solar:close-circle-bold" class="size-4" />
      </button>

      <!-- Balloon Content -->
      <NuxtLink to="/dashboard/marketing"
        class="flex items-center gap-3 p-4 bg-white dark:bg-muted-900 rounded-2xl shadow-xl border border-muted-200 dark:border-muted-800 hover:shadow-2xl hover:scale-105 transition-all duration-300 group ring-4 ring-primary-500/10">
        <div
          class="size-12 rounded-xl bg-primary-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary-500/30 group-hover:rotate-12 transition-transform">
          <Icon name="solar:chat-round-dots-bold-duotone" class="size-7" />
        </div>
        <div class="pr-2">
          <p class="text-xs font-bold text-primary-500 uppercase tracking-wider mb-0.5">Novo Módulo</p>
          <h4 class="text-sm font-bold text-muted-800 dark:text-white leading-tight">Campanhas SMS</h4>
          <p class="text-[10px] text-muted-500 dark:text-muted-400 mt-1">Aumente suas vendas agora!</p>
        </div>
        <div class="ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
          <Icon name="solar:alt-arrow-right-linear" class="size-4 text-primary-500" />
        </div>
      </NuxtLink>

      <!-- Arrow -->
      <div
        class="absolute -bottom-2 right-8 size-4 bg-white dark:bg-muted-900 rotate-45 border-r border-b border-muted-200 dark:border-muted-800">
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes bounce-subtle {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
  }
}

.animate-bounce-subtle {
  animation: bounce-subtle 3s ease-in-out infinite;
}
</style>
