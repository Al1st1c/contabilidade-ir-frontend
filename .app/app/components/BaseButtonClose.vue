<script setup lang="ts">
const props = defineProps({
  onClose: {
    type: Function,
    required: true,
  },
})
</script>

<template>

  <button type="button"
    class="nui-mask nui-mask-blob hover:bg-muted-100 focus:bg-muted-100 dark:hover:bg-muted-700 dark:focus:bg-muted-700 text-muted-700 dark:text-muted-400 flex size-10 cursor-pointer items-center justify-center outline-transparent transition-colors duration-300"
    @click="props.onClose">
    <Icon name="lucide:x" class="size-4" />
  </button>
</template>
