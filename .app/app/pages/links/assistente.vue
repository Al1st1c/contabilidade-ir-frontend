<script setup lang="ts">
definePageMeta({
  title: 'Assistente Virtual',
  layout: 'empty',
})

useSeoMeta({
  title: 'Sofia - Assistente Virtual | Gestor IRPF',
  description: 'Tire suas dúvidas sobre o Gestor IRPF com a Sofia, nossa assistente virtual com inteligência artificial.',
})
</script>

<template>
  <div class="flex flex-col h-screen bg-white dark:bg-muted-950">
    <!-- Chat -->
    <ChatAssistant :authenticated="false" show-back="/links" class="flex-1 min-h-0" />
  </div>
</template>
