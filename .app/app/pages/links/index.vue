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
    title: 'Agende uma apresentação',
    url: 'https://calendly.com/gustavo-bindandi-arestech/apresentacao-gestor-irpf',
    icon: 'solar:calendar-date-bold-duotone',
    color: 'primary'
  },
  {
    title: 'Criar conta com 5% de desconto',
    url: 'https://r.gestorirpf.com.br/cadastro',
    icon: 'solar:user-plus-bold-duotone',
    color: 'success'
  },
  {
    title: 'Suporte no WhatsApp',
    url: 'https://wa.me/5521979044284',
    icon: 'logos:whatsapp-icon',
    color: 'green'
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

      <!-- Links List -->
      <div class="mt-8 flex flex-col gap-4">
        <a v-for="(link, index) in links" :key="index" :href="link.url" target="_blank" rel="noopener noreferrer"
          class="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-muted-200 bg-white p-4 text-center text-base font-medium text-muted-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 hover:shadow-xl hover:shadow-primary-500/20 dark:border-muted-800 dark:bg-muted-900 dark:text-muted-100 dark:hover:border-primary-500 dark:hover:bg-muted-800 dark:hover:text-primary-400">
          <!-- Subtle background highlight on hover -->
          <div
            class="absolute inset-0 translate-y-[100%] bg-gradient-to-t from-primary-500/10 to-transparent transition-transform duration-300 group-hover:translate-y-0" />

          <Icon :name="link.icon"
            class="size-6 text-muted-400 transition-colors duration-300 group-hover:text-primary-500 dark:group-hover:text-primary-400" />
          <span class="relative z-10">{{ link.title }}</span>
        </a>
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
