<script setup lang="ts">
definePageMeta({
  title: 'Assistente Virtual',
})
</script>

<template>
  <div class="overflow-hidden relative px-4 md:px-6 lg:px-8 pb-4">
    <div class="grid grid-cols-12 gap-4">
      <div class="col-span-12 lg:col-span-8 lg:col-start-3">
        <!-- Header Card -->
        <div class="bg-primary-800 rounded-2xl p-5 mb-4 flex items-center gap-4">
          <div class="relative shrink-0">
            <div class="size-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Icon name="solar:stars-minimalistic-bold-duotone" class="size-7 text-white" />
            </div>
            <div
              class="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-success-500 border-2 border-primary-800" />
          </div>
          <div class="flex-1 min-w-0">
            <BaseHeading tag="h1" size="lg" class="text-white">
              Sofia — Assistente Virtual
            </BaseHeading>
            <BaseParagraph size="xs" class="text-white/70 mt-0.5">
              Tire dúvidas sobre o sistema, funcionalidades, pagamentos e muito mais.
            </BaseParagraph>
          </div>
        </div>

        <!-- Chat Card -->
        <BaseCard rounded="lg" class="overflow-hidden" style="height: calc(100vh - 240px);">
          <ChatAssistant :authenticated="true" />
        </BaseCard>
      </div>
    </div>
  </div>
</template>
