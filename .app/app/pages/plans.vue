<script setup lang="ts">
definePageMeta({
  layout: 'empty',
})

const router = useRouter()

onMounted(() => {
  router.replace('/dashboard/plans')
})
</script>

<template>
  <AppPageLoading message="Redirecionando para planos..." />
</template>
