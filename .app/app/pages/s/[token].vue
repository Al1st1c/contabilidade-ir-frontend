<script setup lang="ts">
/**
 * Redirecionador de link curto
 * Captura o token de /s/:token e redireciona para /client?token=:token
 */
const route = useRoute()
const token = route.params.token as string

onMounted(() => {
  if (token) {
    navigateTo({
      path: '/client',
      query: { token }
    })
  } else {
    // Fallback se não houver token
    navigateTo('/')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-white dark:bg-muted-1000">
    <div class="text-center">
      <BasePlaceload class="size-20 rounded-full mx-auto mb-4" />
      <BaseHeading as="h3" size="lg" weight="semibold" class="text-muted-800 dark:text-white mb-2">
        Redirecionando...
      </BaseHeading>
      <BaseParagraph size="sm" class="text-muted-500">
        Aguarde um momento enquanto preparamos seu acesso seguro.
      </BaseParagraph>
    </div>
  </div>
</template>
