<script setup lang="ts">
const props = defineProps<{
  open: boolean
  type: 'terms' | 'lgpd'
  mandatory?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'close'): void
  (e: 'accept'): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => {
    emit('update:open', value)
    if (!value) emit('close')
  }
})

function handleAccept() {
  emit('accept')
  isOpen.value = false
}

const modalTitle = computed(() => {
  return props.type === 'terms' ? 'Termos de Uso' : 'LGPD e Privacidade'
})

const pdfUrl = computed(() => {
  return props.type === 'terms' ? '/termos-de-uso.pdf' : '/lgpd.pdf'
})
</script>

<template>
  <DialogRoot v-model:open="isOpen">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-[100] bg-muted-900/50 backdrop-blur-sm" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-[101] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-0 shadow-2xl dark:bg-muted-900 border border-muted-200 dark:border-muted-800 flex flex-col h-[90vh]"
        @pointer-down-outside="mandatory ? $event.preventDefault() : undefined"
        @escape-keydown="mandatory ? $event.preventDefault() : undefined"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-muted-200 dark:border-muted-800">
          <DialogTitle as="h3" class="text-xl font-bold text-muted-800 dark:text-muted-100">
            {{ modalTitle }}
          </DialogTitle>
          <DialogClose v-if="!mandatory" class="text-muted-400 hover:text-muted-600 dark:hover:text-muted-200 transition-colors">
            <Icon name="lucide:x" class="size-5" />
          </DialogClose>
        </div>

        <!-- Content (PDF Viewer) -->
        <div class="flex-1 w-full bg-muted-100 dark:bg-muted-950 overflow-hidden">
          <iframe
            :src="pdfUrl"
            class="w-full h-full border-none"
            title="PDF Viewer"
          ></iframe>
        </div>

        <!-- Footer -->
        <div class="flex justify-between items-center p-6 border-t border-muted-200 dark:border-muted-800 bg-white dark:bg-muted-900">
          <BaseParagraph size="xs" class="text-muted-500 italic">
            Caso não consiga visualizar, utilize o botão ao lado para baixar.
          </BaseParagraph>
          <div class="flex gap-3">
             <BaseButton 
              :href="pdfUrl" 
              target="_blank" 
              download 
              variant="muted"
              rounded="lg"
            >
              <Icon name="lucide:download" class="size-4 mr-2" />
              Baixar PDF
            </BaseButton>
            <BaseButton color="primary" rounded="lg" @click="handleAccept">
              Li e compreendi
            </BaseButton>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
