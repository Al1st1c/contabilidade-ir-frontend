<script setup lang="ts">
/**
 * Redirecionador de link curto
 * Captura o token de /s/:token e redireciona para /client?token=:token
 */
definePageMeta({
  layout: 'empty'
})

const route = useRoute()
const token = route.params.token as string

onMounted(() => {
  if (token) {
    navigateTo(`/client?token=${token}`)
  } else {
    navigateTo('/')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-white dark:bg-muted-1000">
    <div class="text-center">
      <AppPageLoading message="Carregando acesso seguro..." />
    </div>
  </div>
</template>
