<script setup lang="ts">
definePageMeta({
  title: 'Sistema de Gestão de IRPF',
  layout: false,
})

const features = [
  {
    icon: 'solar:users-group-rounded-bold-duotone',
    title: 'Gestão de Clientes',
    description: 'Organize todos os seus clientes em um só lugar com busca avançada e filtros inteligentes.',
  },
  {
    icon: 'solar:document-text-bold-duotone',
    title: 'Declarações IRPF',
    description: 'Controle completo do status de cada declaração, prazos e documentos necessários.',
  },
  {
    icon: 'solar:clipboard-list-bold-duotone',
    title: 'Kanban Visual',
    description: 'Quadros Kanban personalizáveis para acompanhar o progresso das declarações em tempo real.',
  },
  {
    icon: 'solar:folder-with-files-bold-duotone',
    title: 'Drive Integrado',
    description: 'Armazenamento seguro de documentos com organização automática por cliente.',
  },
  {
    icon: 'solar:chat-round-dots-bold-duotone',
    title: 'Comunicação Automática',
    description: 'Envio de SMS e WhatsApp para manter seus clientes sempre informados.',
  },
  {
    icon: 'solar:chart-2-bold-duotone',
    title: 'Relatórios e Dashboards',
    description: 'Análises detalhadas e dashboards em tempo real para tomada de decisão estratégica.',
  },
]

const plans = [
  {
    name: 'Gratuito',
    price: 'R$ 0',
    period: '',
    description: 'Ideal para experimentar',
    features: ['1 usuário', '1 IR/ano', '250MB de armazenamento', '5 SMS/mês'],
    highlighted: false,
  },
  {
    name: 'Básico',
    price: 'R$ 99',
    period: '/mês',
    description: 'Para contadores autônomos',
    features: ['2 usuários', '50 IRs/ano', '5GB de armazenamento', '100 SMS/mês', 'Relatórios'],
    highlighted: false,
  },
  {
    name: 'Profissional',
    price: 'R$ 249',
    period: '/mês',
    description: 'Escritórios em crescimento',
    features: ['10 usuários', '250 IRs/ano', '20GB de armazenamento', '500 SMS/mês', 'WhatsApp', 'Gestão de Equipe'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'R$ 599',
    period: '/mês',
    description: 'Grandes operações',
    features: ['50 usuários', '1000 IRs/ano', '100GB de armazenamento', '2000 SMS/mês', 'API', 'White Label'],
    highlighted: false,
  },
]
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-muted-900">
    <!-- Header -->
    <header
      class="sticky top-0 z-50 border-b border-muted-200 bg-white/80 backdrop-blur-xl dark:border-muted-800 dark:bg-muted-900/80">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <TairoLogo class="h-10 w-auto" />
            <div>
              <BaseText weight="semibold" class="text-muted-800 dark:text-white block">
                Contabilidade IR
              </BaseText>
              <BaseText size="xs" class="text-muted-500">
                Gestão Profissional de IRPF
              </BaseText>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <NuxtLink to="/auth"
              class="hidden sm:inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-700 transition-colors hover:bg-muted-100 dark:text-muted-300 dark:hover:bg-muted-800">
              Fazer Login
            </NuxtLink>
            <NuxtLink to="/auth/register"
              class="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/50 transition-all hover:bg-primary-600 hover:shadow-xl hover:shadow-primary-500/50">
              <Icon name="solar:user-plus-bold" class="h-4 w-4" />
              <span>Começar Grátis</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="relative overflow-hidden py-20 lg:py-32">
      <div class="container mx-auto px-4">
        <div class="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div
              class="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-4 py-2 dark:bg-primary-500/20">
              <Icon name="solar:verified-check-bold" class="h-4 w-4 text-primary-500" />
              <BaseText size="sm" weight="medium" class="text-primary-600 dark:text-primary-400">
                Sistema Completo para Contadores
              </BaseText>
            </div>

            <BaseHeading tag="h1" size="4xl" weight="bold" class="text-muted-900 dark:text-white mb-6 leading-tight">
              Gerencie Declarações de IRPF com
              <span class="bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                Eficiência Total
              </span>
            </BaseHeading>

            <BaseParagraph size="lg" class="text-muted-600 dark:text-muted-400 mb-8">
              Plataforma completa para escritórios de contabilidade organizarem clientes, controlarem declarações
              e automatizarem processos com dashboards, Kanban e comunicação integrada.
            </BaseParagraph>

            <div class="flex flex-col gap-4 sm:flex-row">
              <NuxtLink to="/auth/register"
                class="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-primary-500/50 transition-all hover:scale-105 hover:bg-primary-600 hover:shadow-2xl hover:shadow-primary-500/50">
                <Icon name="solar:rocket-2-bold" class="h-5 w-5" />
                <span>Começar Gratuitamente</span>
                <Icon name="solar:arrow-right-linear" class="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </NuxtLink>

              <a href="#features"
                class="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-muted-300 bg-white px-8 py-4 text-base font-semibold text-muted-700 transition-all hover:border-primary-500 hover:bg-primary-50 dark:border-muted-700 dark:bg-muted-800 dark:text-white dark:hover:border-primary-500 dark:hover:bg-muted-700">
                <Icon name="solar:play-circle-bold" class="h-5 w-5" />
                <span>Ver Recursos</span>
              </a>
            </div>

            <div class="mt-8 flex items-center gap-6">
              <div class="flex items-center gap-2">
                <Icon name="solar:check-circle-bold" class="h-5 w-5 text-success-500" />
                <BaseText size="sm" class="text-muted-600 dark:text-muted-400">
                  Teste grátis sem cartão
                </BaseText>
              </div>
              <div class="flex items-center gap-2">
                <Icon name="solar:shield-check-bold" class="h-5 w-5 text-success-500" />
                <BaseText size="sm" class="text-muted-600 dark:text-muted-400">
                  Dados 100% seguros
                </BaseText>
              </div>
            </div>
          </div>

          <div class="relative">
            <div
              class="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary-500/20 to-primary-600/20 blur-3xl" />
            <img
              src="/Users/computer/.gemini/antigravity/brain/47083866-edc2-40c8-b9f4-ac662f752b00/dashboard_hero_1770421479224.png"
              alt="Dashboard do Sistema"
              class="relative rounded-2xl shadow-2xl ring-1 ring-muted-200 dark:ring-muted-800">
          </div>
        </div>
      </div>

      <!-- Background decoration -->
      <div class="absolute top-0 right-0 -z-10 h-96 w-96 rounded-full bg-primary-500/5 blur-3xl" />
      <div class="absolute bottom-0 left-0 -z-10 h-96 w-96 rounded-full bg-primary-600/5 blur-3xl" />
    </section>

    <!-- Features Section -->
    <section id="features" class="py-20 bg-muted-50 dark:bg-muted-950">
      <div class="container mx-auto px-4">
        <div class="mx-auto max-w-3xl text-center mb-16">
          <BaseHeading tag="h2" size="3xl" weight="bold" class="text-muted-900 dark:text-white mb-4">
            Tudo que você precisa em um só lugar
          </BaseHeading>
          <BaseParagraph size="lg" class="text-muted-600 dark:text-muted-400">
            Conjunto completo de ferramentas para escritórios de contabilidade modernos
          </BaseParagraph>
        </div>

        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div v-for="feature in features" :key="feature.title"
            class="group rounded-2xl border border-muted-200 bg-white p-8 transition-all hover:scale-105 hover:border-primary-500 hover:shadow-xl dark:border-muted-800 dark:bg-muted-900 dark:hover:border-primary-500">
            <div
              class="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500 transition-all group-hover:bg-primary-500 group-hover:text-white dark:bg-primary-500/20">
              <Icon :name="feature.icon" class="h-7 w-7" />
            </div>
            <BaseHeading tag="h3" size="lg" weight="semibold" class="text-muted-900 dark:text-white mb-3">
              {{ feature.title }}
            </BaseHeading>
            <BaseParagraph class="text-muted-600 dark:text-muted-400">
              {{ feature.description }}
            </BaseParagraph>
          </div>
        </div>
      </div>
    </section>

    <!-- Screenshots Section -->
    <section class="py-20">
      <div class="container mx-auto px-4">
        <div class="mx-auto max-w-3xl text-center mb-16">
          <BaseHeading tag="h2" size="3xl" weight="bold" class="text-muted-900 dark:text-white mb-4">
            Interface moderna e intuitiva
          </BaseHeading>
          <BaseParagraph size="lg" class="text-muted-600 dark:text-muted-400">
            Desenvolvido pensando em produtividade e facilidade de uso
          </BaseParagraph>
        </div>

        <div class="space-y-12">
          <!-- Kanban -->
          <div class="mx-auto max-w-6xl">
            <div class="mb-6 text-center">
              <BaseHeading tag="h3" size="xl" weight="semibold" class="text-muted-800 dark:text-white mb-2">
                Quadro Kanban Interativo
              </BaseHeading>
              <BaseParagraph class="text-muted-600 dark:text-muted-400">
                Acompanhe visualmente o progresso de cada declaração
              </BaseParagraph>
            </div>
            <div
              class="relative rounded-2xl border border-muted-200 bg-muted-50 p-4 dark:border-muted-800 dark:bg-muted-950">
              <img
                src="/Users/computer/.gemini/antigravity/brain/47083866-edc2-40c8-b9f4-ac662f752b00/kanban_board_1770421495988.png"
                alt="Kanban Board" class="rounded-xl shadow-lg w-full">
            </div>
          </div>

          <!-- Document Management -->
          <div class="mx-auto max-w-6xl">
            <div class="mb-6 text-center">
              <BaseHeading tag="h3" size="xl" weight="semibold" class="text-muted-800 dark:text-white mb-2">
                Gestão de Documentos
              </BaseHeading>
              <BaseParagraph class="text-muted-600 dark:text-muted-400">
                Armazene e organize todos os arquivos com segurança
              </BaseParagraph>
            </div>
            <div
              class="relative rounded-2xl border border-muted-200 bg-muted-50 p-4 dark:border-muted-800 dark:bg-muted-950">
              <img
                src="/Users/computer/.gemini/antigravity/brain/47083866-edc2-40c8-b9f4-ac662f752b00/document_management_1770421509322.png"
                alt="Document Management" class="rounded-xl shadow-lg w-full">
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="py-20 bg-muted-50 dark:bg-muted-950">
      <div class="container mx-auto px-4">
        <div class="mx-auto max-w-3xl text-center mb-16">
          <BaseHeading tag="h2" size="3xl" weight="bold" class="text-muted-900 dark:text-white mb-4">
            Planos para todos os tamanhos
          </BaseHeading>
          <BaseParagraph size="lg" class="text-muted-600 dark:text-muted-400">
            Escolha o plano ideal para o seu escritório
          </BaseParagraph>
        </div>

        <div class="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div v-for="plan in plans" :key="plan.name" :class="[
            'relative rounded-2xl border p-8 transition-all',
            plan.highlighted
              ? 'border-primary-500 bg-primary-500 shadow-2xl shadow-primary-500/50 scale-105'
              : 'border-muted-200 bg-white hover:border-primary-500 hover:shadow-xl dark:border-muted-800 dark:bg-muted-900'
          ]">
            <div v-if="plan.highlighted"
              class="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-success-500 px-4 py-1">
              <BaseText size="xs" weight="semibold" class="text-white uppercase">
                Mais Popular
              </BaseText>
            </div>

            <div class="mb-6">
              <BaseHeading tag="h3" size="xl" weight="bold"
                :class="plan.highlighted ? 'text-white' : 'text-muted-900 dark:text-white'">
                {{ plan.name }}
              </BaseHeading>
              <BaseParagraph size="sm"
                :class="plan.highlighted ? 'text-white/80' : 'text-muted-600 dark:text-muted-400'">
                {{ plan.description }}
              </BaseParagraph>
            </div>

            <div class="mb-6">
              <div class="flex items-baseline gap-1">
                <BaseText size="4xl" weight="bold"
                  :class="plan.highlighted ? 'text-white' : 'text-muted-900 dark:text-white'">
                  {{ plan.price }}
                </BaseText>
                <BaseText size="lg" :class="plan.highlighted ? 'text-white/80' : 'text-muted-600 dark:text-muted-400'">
                  {{ plan.period }}
                </BaseText>
              </div>
            </div>

            <ul class="mb-8 space-y-3">
              <li v-for="feature in plan.features" :key="feature" class="flex items-center gap-2">
                <Icon name="solar:check-circle-bold"
                  :class="plan.highlighted ? 'text-white h-5 w-5' : 'text-success-500 h-5 w-5'" />
                <BaseText size="sm" :class="plan.highlighted ? 'text-white' : 'text-muted-700 dark:text-muted-300'">
                  {{ feature }}
                </BaseText>
              </li>
            </ul>

            <NuxtLink to="/auth/register" :class="[
              'block w-full rounded-lg py-3 text-center font-semibold transition-all',
              plan.highlighted
                ? 'bg-white text-primary-600 hover:bg-primary-50'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            ]">
              Começar Agora
            </NuxtLink>
          </div>
        </div>

        <div class="mt-12 text-center">
          <BaseParagraph class="text-muted-600 dark:text-muted-400">
            Todos os planos incluem 14 dias de teste grátis • Sem necessidade de cartão de crédito
          </BaseParagraph>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="py-20">
      <div class="container mx-auto px-4">
        <div
          class="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-700 p-12 shadow-2xl shadow-primary-500/50 md:p-16">
          <div class="text-center">
            <BaseHeading tag="h2" size="3xl" weight="bold" class="text-white mb-4">
              Pronto para transformar a gestão do seu escritório?
            </BaseHeading>
            <BaseParagraph size="lg" class="text-white/90 mb-8">
              Junte-se a centenas de contadores que já otimizaram seus processos
            </BaseParagraph>

            <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <NuxtLink to="/auth/register"
                class="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-primary-600 shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                <Icon name="solar:rocket-2-bold" class="h-5 w-5" />
                <span>Criar Conta Gratuita</span>
                <Icon name="solar:arrow-right-linear" class="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </NuxtLink>

              <NuxtLink to="/auth/login"
                class="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20">
                <Icon name="solar:login-3-bold" class="h-5 w-5" />
                <span>Fazer Login</span>
              </NuxtLink>
            </div>

            <div class="mt-8 flex flex-wrap items-center justify-center gap-6">
              <div class="flex items-center gap-2 text-white/90">
                <Icon name="solar:check-circle-bold" class="h-5 w-5" />
                <BaseText size="sm">Teste grátis por 14 dias</BaseText>
              </div>
              <div class="flex items-center gap-2 text-white/90">
                <Icon name="solar:shield-check-bold" class="h-5 w-5" />
                <BaseText size="sm">Sem compromisso</BaseText>
              </div>
              <div class="flex items-center gap-2 text-white/90">
                <Icon name="solar:card-bold" class="h-5 w-5" />
                <BaseText size="sm">Não precisa de cartão</BaseText>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-muted-200 bg-muted-50 py-12 dark:border-muted-800 dark:bg-muted-950">
      <div class="container mx-auto px-4">
        <div class="grid gap-8 md:grid-cols-4">
          <div class="md:col-span-2">
            <div class="mb-4 flex items-center gap-3">
              <TairoLogo class="h-10 w-auto" />
              <div>
                <BaseText weight="semibold" class="text-muted-800 dark:text-white block">
                  Contabilidade IR
                </BaseText>
                <BaseText size="xs" class="text-muted-500">
                  Gestão Profissional de IRPF
                </BaseText>
              </div>
            </div>
            <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-400 max-w-md">
              Plataforma completa para escritórios de contabilidade gerenciarem declarações de IRPF
              com eficiência, organização e segurança.
            </BaseParagraph>
          </div>

          <div>
            <BaseHeading tag="h4" size="sm" weight="semibold" class="text-muted-900 dark:text-white mb-4">
              Produto
            </BaseHeading>
            <ul class="space-y-2">
              <li>
                <a href="#features" class="text-sm text-muted-600 hover:text-primary-500 dark:text-muted-400">
                  Recursos
                </a>
              </li>
              <li>
                <a href="#pricing" class="text-sm text-muted-600 hover:text-primary-500 dark:text-muted-400">
                  Preços
                </a>
              </li>
              <li>
                <NuxtLink to="/auth/register" class="text-sm text-muted-600 hover:text-primary-500 dark:text-muted-400">
                  Começar Grátis
                </NuxtLink>
              </li>
            </ul>
          </div>

          <div>
            <BaseHeading tag="h4" size="sm" weight="semibold" class="text-muted-900 dark:text-white mb-4">
              Empresa
            </BaseHeading>
            <ul class="space-y-2">
              <li>
                <NuxtLink to="/auth/login" class="text-sm text-muted-600 hover:text-primary-500 dark:text-muted-400">
                  Login
                </NuxtLink>
              </li>
              <li>
                <a href="#" class="text-sm text-muted-600 hover:text-primary-500 dark:text-muted-400">
                  Suporte
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-12 border-t border-muted-200 pt-8 dark:border-muted-800">
          <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <BaseParagraph size="sm" class="text-muted-500">
              © {{ new Date().getFullYear() }} Contabilidade IR. Todos os direitos reservados.
            </BaseParagraph>
            <div class="flex gap-4">
              <a href="#" class="text-muted-500 hover:text-primary-500">
                <Icon name="lucide:linkedin" class="h-5 w-5" />
              </a>
              <a href="#" class="text-muted-500 hover:text-primary-500">
                <Icon name="lucide:instagram" class="h-5 w-5" />
              </a>
              <a href="#" class="text-muted-500 hover:text-primary-500">
                <Icon name="lucide:facebook" class="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
