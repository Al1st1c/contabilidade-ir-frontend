<script setup lang="ts">
definePageMeta({
  title: 'Links Úteis',
  layout: 'empty',
})

useSeoMeta({
  title: 'Gestor IRPF - Links',
  description: 'Acesse nossos principais links: agende uma apresentação, crie sua conta com desconto, acesse nosso suporte ou visite nosso site.',
})

const links = [
  {
    title: 'Agendar uma apresentação',
    url: '/links/assistente',
    icon: 'solar:calendar-date-bold-duotone',
    color: 'primary',
    subtitle: 'Fale com a Sofia para agendar'
  },
  {
    title: 'Criar conta com 5% de desconto',
    url: 'https://r.gestorirpf.com.br/cadastro',
    icon: 'solar:user-plus-bold-duotone',
    color: 'success'
  },
  {
    title: 'Suporte',
    url: '/links/assistente',
    icon: 'logos:whatsapp-icon',
    color: 'green',
    subtitle: 'Tire suas dúvidas agora'
  },
  {
    title: 'Nossos Preços e Simulador',
    url: '/links/precos',
    icon: 'solar:dollar-minimalistic-bold-duotone',
    color: 'warning'
  },
  {
    title: 'Site',
    url: 'https://gestorirpf.com.br',
    icon: 'solar:earth-bold-duotone',
    color: 'info'
  }
]
</script>

<template>
  <div
    class="relative flex min-h-screen flex-col items-center justify-center bg-muted-50 px-4 py-12 dark:bg-muted-950 sm:px-6 lg:px-8">

    <!-- Theme Toggle at top right -->
    <div class="absolute right-4 top-4">
      <BaseThemeToggle />
    </div>

    <div class="w-full max-w-md space-y-8 animate-fade-in-up">
      <!-- Profile / Header section -->
      <div class="flex flex-col items-center text-center">
        <!-- Logo -->
        <div
          class="mb-4 flex size-24 items-center justify-center overflow-hidden rounded-full border border-muted-200 bg-white p-2 shadow-xl shadow-primary-500/10 dark:border-muted-800 dark:bg-muted-900">
          <img src="/img/logo.png" alt="Gestor IRPF" class="h-full w-full object-contain" />
        </div>

        <BaseHeading tag="h1" size="2xl" weight="medium" class="tracking-tight text-muted-900 dark:text-white">
          Gestor IRPF
        </BaseHeading>

        <BaseParagraph size="sm" class="mt-2 text-muted-500 dark:text-muted-400">
          Simplifique a gestão de Imposto de Renda do seu escritório.
        </BaseParagraph>
      </div>

      <!-- Support CTA -->
      <NuxtLink to="/links/assistente"
        class="group relative mt-8 flex w-full items-center gap-4 overflow-hidden rounded-2xl border-2 border-primary-500/30 bg-gradient-to-r from-primary-500/5 to-primary-600/5 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary-500 hover:shadow-xl hover:shadow-primary-500/20 dark:from-primary-900/20 dark:to-primary-800/20">
        <div
          class="absolute inset-0 translate-y-[100%] bg-gradient-to-t from-primary-500/10 to-transparent transition-transform duration-300 group-hover:translate-y-0" />
        <div class="relative shrink-0">
          <div class="size-12 rounded-full overflow-hidden shadow-lg shadow-primary-500/30 ring-2 ring-primary-500/20">
            <img src="/img/sofia-avatar.png" alt="Sofia Suporte" class="size-full object-cover">
          </div>
          <div
            class="absolute bottom-0 right-0 size-3.5 rounded-full bg-success-500 border-2 border-white dark:border-muted-950 animate-pulse" />
        </div>
        <div class="relative z-10 flex-1">
          <p class="text-base font-bold text-muted-800 dark:text-white">Suporte Online</p>
          <p class="text-xs text-muted-500 dark:text-muted-400 mt-0.5">Tire suas dúvidas — Disponível 24h</p>
        </div>
        <Icon name="lucide:chevron-right"
          class="relative z-10 size-5 text-primary-400 group-hover:translate-x-1 transition-transform" />
      </NuxtLink>

      <!-- Links List -->
      <div class="mt-4 flex flex-col gap-4">
        <template v-for="(link, index) in links" :key="index">
          <NuxtLink v-if="link.url.startsWith('/')" :to="link.url"
            class="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-muted-200 bg-white p-4 text-center text-base font-medium text-muted-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 hover:shadow-xl hover:shadow-primary-500/20 dark:border-muted-800 dark:bg-muted-900 dark:text-muted-100 dark:hover:border-primary-500 dark:hover:bg-muted-800 dark:hover:text-primary-400">
            <div
              class="absolute inset-0 translate-y-[100%] bg-gradient-to-t from-primary-500/10 to-transparent transition-transform duration-300 group-hover:translate-y-0" />
            <Icon :name="link.icon"
              class="size-6 text-muted-400 transition-colors duration-300 group-hover:text-primary-500 dark:group-hover:text-primary-400" />
            <div class="relative z-10 flex flex-col items-center">
              <span>{{ link.title }}</span>
              <span v-if="link.subtitle" class="text-[10px] opacity-60 font-normal">{{ link.subtitle }}</span>
            </div>
          </NuxtLink>
          <a v-else :href="link.url" target="_blank" rel="noopener noreferrer"
            class="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-muted-200 bg-white p-4 text-center text-base font-medium text-muted-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 hover:shadow-xl hover:shadow-primary-500/20 dark:border-muted-800 dark:bg-muted-900 dark:text-muted-100 dark:hover:border-primary-500 dark:hover:bg-muted-800 dark:hover:text-primary-400">
            <div
              class="absolute inset-0 translate-y-[100%] bg-gradient-to-t from-primary-500/10 to-transparent transition-transform duration-300 group-hover:translate-y-0" />
            <Icon :name="link.icon"
              class="size-6 text-muted-400 transition-colors duration-300 group-hover:text-primary-500 dark:group-hover:text-primary-400" />
            <div class="relative z-10 flex flex-col items-center">
              <span>{{ link.title }}</span>
              <span v-if="link.subtitle" class="text-[10px] opacity-60 font-normal">{{ link.subtitle }}</span>
            </div>
          </a>
        </template>
      </div>

      <!-- Footer -->
      <div class="mt-8 text-center">
        <BaseParagraph size="xs" class="text-muted-400 dark:text-muted-500">
          &copy; {{ new Date().getFullYear() }} Gestor IRPF. Todos os direitos reservados.
        </BaseParagraph>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out forwards;
}
</style>
