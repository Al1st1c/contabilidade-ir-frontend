<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    closeLabel?: string
    closeTo?: string
  }>(),
  {
    closeLabel: 'Back',
    closeTo: '/dashboard/clients',
  },
)
</script>

<template>
  <div class="absolute start-0 top-0 w-full z-10">
    <div class="flex w-full items-center justify-between px-6 py-4">
      <!-- Título à esquerda, próximo ao menu -->
      <div class="flex items-center gap-4">
        <BaseHeading as="h1" size="lg" weight="semibold" class="text-muted-800 dark:text-muted-100">
          {{ props.title }}
        </BaseHeading>
      </div>

      <!-- Botão de voltar à direita -->
      <div class="flex items-center">
        <NuxtLink
          :to="props.closeTo"
          class="group flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted-100 dark:hover:bg-muted-800 transition-all duration-300 border border-muted-200 dark:border-muted-700"
        >
          <Icon
            name="lucide:arrow-left"
            class="text-muted-600 dark:text-muted-400 group-hover:text-muted-800 dark:group-hover:text-muted-200 size-4 transition-colors duration-300"
          />
          <BaseText
            size="sm"
            weight="medium"
            class="text-muted-600 dark:text-muted-400 group-hover:text-muted-800 dark:group-hover:text-muted-200 transition-colors duration-300"
          >
            {{ props.closeLabel }}
          </BaseText>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
