<script setup lang="ts">
interface Props {
  title?: string
  description?: string
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Limite da Conta',
  description: 'O seu plano atual atingiu o limite de uso para este recurso. Verifique as opções de upgrade para continuar.',
  icon: 'solar:shield-warning-bold-duotone',
})
</script>

<template>
  <div class="rounded-lg border border-muted-200 bg-muted-50/50 p-4 dark:border-muted-800 dark:bg-muted-900/40">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div class="flex items-start gap-3 sm:items-center">
        <!-- Minimalist Icon -->
        <div
          class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-muted-500 shadow-sm ring-1 ring-muted-200 dark:bg-muted-950 dark:text-muted-400 dark:ring-muted-800">
          <Icon :name="icon" class="size-5" />
        </div>

        <!-- Professional Text -->
        <div class="grow">
          <BaseHeading as="h5" size="sm" weight="semibold" class="text-muted-800 dark:text-muted-100">
            {{ title }}
          </BaseHeading>
          <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400">
            {{ description }}
          </BaseParagraph>
        </div>
      </div>

      <!-- Discreet Action -->
      <div class="flex shrink-0 items-center">
        <BaseButton to="/dashboard/plans" variant="outline" rounded="md" size="sm"
          class="w-full sm:w-auto px-4 font-medium text-muted-700 bg-white hover:bg-muted-50 dark:bg-muted-950 dark:text-muted-200 dark:hover:bg-muted-800 border-muted-200 dark:border-muted-800 shadow-sm transition-all duration-200">
          <span>Aumentar Limite</span>
          <Icon name="lucide:external-link" class="ms-1.5 size-3 opacity-60" />
        </BaseButton>
      </div>
    </div>
  </div>
</template>
