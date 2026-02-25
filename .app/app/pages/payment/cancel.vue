<script setup lang="ts">
definePageMeta({
  layout: 'empty',
  title: 'Pagamento Cancelado',
})
</script>

<template>
  <div class="min-h-screen bg-muted-50 dark:bg-muted-950 flex items-center justify-center p-4">
    <BaseCard rounded="lg" class="max-w-md w-full p-8 text-center shadow-xl">
      <div class="mb-6">
        <div class="size-20 bg-muted-100 dark:bg-muted-800 rounded-full flex items-center justify-center mx-auto">
          <Icon name="solar:close-circle-bold-duotone" class="size-12 text-muted-400" />
        </div>
      </div>

      <BaseHeading as="h1" size="xl" weight="bold" class="mb-4 text-muted-800 dark:text-white font-sans">
        Pagamento Cancelado
      </BaseHeading>

      <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400 mb-8 font-sans">
        Não se preocupe, nenhuma cobrança foi realizada. Se você teve algum problema técnico, tente novamente ou escolha
        outra forma de pagamento.
      </BaseParagraph>

      <div class="space-y-3">
        <BaseButton to="/dashboard/plans" variant="primary" color="primary" class="w-full">
          Tentar Novamente
        </BaseButton>

        <BaseButton to="/dashboard/plans" variant="muted" class="w-full">
          Voltar para Planos
        </BaseButton>
      </div>

      <div class="mt-8 pt-6 border-t border-muted-100 dark:border-muted-800">
        <BaseParagraph size="xs" class="text-muted-400">
          Precisa de ajuda? <NuxtLink class="text-primary-500 underline">Fale com nosso suporte</NuxtLink>
        </BaseParagraph>
      </div>
    </BaseCard>
  </div>
</template>
