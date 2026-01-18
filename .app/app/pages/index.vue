<script setup lang="ts">
definePageMeta({
  title: 'Início',
  layout: false,
})

const features = [
  {
    icon: 'lucide:users',
    title: 'Gestão de Funcionários',
    description: 'Controle completo de funcionários, horários e permissões de acesso.',
  },
  {
    icon: 'lucide:coins',
    title: 'Controle Financeiro',
    description: 'Acompanhe receitas, despesas e fluxo de caixa em tempo real.',
  },
  {
    icon: 'lucide:bar-chart-3',
    title: 'Relatórios Detalhados',
    description: 'Análises e relatórios completos para tomada de decisão estratégica.',
  },
  {
    icon: 'lucide:shield-check',
    title: 'Segurança Avançada',
    description: 'Sistema de autenticação e controle de acesso robusto.',
  },
  {
    icon: 'lucide:gamepad-2',
    title: 'Gestão de Jogos',
    description: 'Monitore e gerencie todos os jogos e máquinas do casino.',
  },
  {
    icon: 'lucide:clock',
    title: 'Monitoramento 24/7',
    description: 'Acompanhamento em tempo real de todas as operações.',
  },
]
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900">
    <!-- Header -->
    <header class="absolute top-0 left-0 right-0 z-50">
      <div class="container mx-auto px-4 py-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Icon name="lucide:sparkles" class="h-8 w-8 text-primary-400" />
            <h1 class="text-2xl font-bold text-white">Casino Manager</h1>
          </div>
          <NuxtLink
            to="/auth"
            class="rounded-lg bg-white px-6 py-2.5 font-semibold text-primary-900 transition-all hover:bg-primary-50 hover:shadow-lg"
          >
            Acessar Sistema
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="relative pt-32 pb-20">
      <div class="container mx-auto px-4">
        <div class="mx-auto max-w-4xl text-center">
          <div class="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-800/50 px-4 py-2 backdrop-blur-sm">
            <Icon name="lucide:zap" class="h-4 w-4 text-primary-300" />
            <span class="text-sm font-medium text-primary-200">Sistema de Gerenciamento Profissional</span>
          </div>
          
          <h2 class="mb-6 text-5xl font-bold leading-tight text-white md:text-6xl">
            Gerencie seu Casino com
            <span class="bg-gradient-to-r from-primary-300 to-primary-400 bg-clip-text text-transparent">
              Eficiência Total
            </span>
          </h2>
          
          <p class="mb-10 text-xl text-primary-200 md:text-2xl">
            Plataforma completa para gestão operacional, financeira e administrativa do seu estabelecimento.
          </p>
          
          <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <NuxtLink
              to="/auth"
              class="group flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-primary-900 shadow-xl transition-all hover:scale-105 hover:shadow-2xl sm:w-auto"
            >
              <span>Começar Agora</span>
              <Icon name="lucide:arrow-right" class="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </NuxtLink>
            
            <button
              class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-white/20 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:w-auto"
            >
              <Icon name="lucide:play-circle" class="h-5 w-5" />
              <span>Ver Demonstração</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Decorative elements -->
      <div class="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary-400/20 blur-3xl" />
      <div class="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-primary-600/20 blur-3xl" />
    </section>

    <!-- Features Section -->
    <section class="relative py-20">
      <div class="container mx-auto px-4">
        <div class="mb-16 text-center">
          <h3 class="mb-4 text-3xl font-bold text-white md:text-4xl">
            Recursos Completos
          </h3>
          <p class="text-lg text-primary-200">
            Tudo que você precisa para gerenciar seu casino em um único lugar
          </p>
        </div>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="group rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all hover:scale-105 hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
          >
            <div class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary-400/20 text-primary-300 transition-all group-hover:bg-primary-400/30 group-hover:text-primary-200">
              <Icon :name="feature.icon" class="h-7 w-7" />
            </div>
            <h4 class="mb-3 text-xl font-semibold text-white">
              {{ feature.title }}
            </h4>
            <p class="text-primary-200">
              {{ feature.description }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="relative py-20">
      <div class="container mx-auto px-4">
        <div class="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-primary-800/50 to-primary-900/50 p-12 backdrop-blur-sm md:p-16">
          <div class="text-center">
            <h3 class="mb-4 text-3xl font-bold text-white md:text-4xl">
              Pronto para começar?
            </h3>
            <p class="mb-8 text-lg text-primary-200">
              Acesse o sistema e comece a gerenciar seu casino de forma profissional
            </p>
            <NuxtLink
              to="/auth"
              class="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-primary-900 shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
            >
              <Icon name="lucide:log-in" class="h-5 w-5" />
              <span>Acessar Agora</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-white/10 py-8">
      <div class="container mx-auto px-4">
        <div class="text-center text-primary-300">
          <p>&copy; {{ new Date().getFullYear() }} Casino Manager. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  </div>
</template>