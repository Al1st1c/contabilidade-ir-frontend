<script setup lang="ts">
interface Props {
  message?: string
  minHeight?: string
}

withDefaults(defineProps<Props>(), {
  message: 'Carregando...',
  minHeight: '50vh',
})
</script>

<template>
  <div class="flex flex-col items-center justify-center p-8 transition-all duration-300" :style="{ minHeight }">
    <img src="/img/loading.gif" class="size-16 mb-2" />
    <BaseParagraph v-if="message" size="sm" class="text-muted-500 font-medium animate-pulse">
      {{ message }}
    </BaseParagraph>
  </div>
</template>
