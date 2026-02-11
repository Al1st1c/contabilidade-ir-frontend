<script setup lang="ts">
const { user } = useAuth()
const isMobileOpen = ref(false)

const companyName = 'Gestor IRPF - Afiliados'
const companyLogo = '/img/logo-icon.png'
</script>

<template>
  <TairoTopnavLayout>
    <!-- Mobile -->
    <TairoTopnavNavbar class="md:hidden">
      <TairoTopnavHeader hide="scroll-down" class="px-4 md:px-6 lg:px-8 xl:px-10 z-10">
        <div class="flex-1 flex md:hidden">
          <button type="button" class="flex items-center" @click="isMobileOpen = !isMobileOpen">
            <span class="flex flex-col gap-1.5">
              <span class="block w-4 h-0.5 bg-muted-500" />
              <span class="block w-5 h-0.5 bg-muted-500" />
            </span>
          </button>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink to="/affiliate/dashboard" class="flex items-center gap-3 mt-2">
            <TairoLogo class="size-8 text-primary-heavy dark:text-primary-light" />
          </NuxtLink>
        </div>
        <DemoToolbarTopnav class="flex-1" />
      </TairoTopnavHeader>
    </TairoTopnavNavbar>

    <!-- Desktop -->
    <TairoTopnavNavbar class="hidden md:flex">
      <TairoTopnavHeader hide="scroll" class="px-4 md:px-6 lg:px-8 xl:px-10 !z-[50] relative">
        <div class="flex items-center gap-3 flex-1">
          <NuxtLink to="/affiliate/dashboard" class="flex items-center gap-3 mt-2">
            <TairoLogo class="size-20 text-primary-heavy dark:text-primary-light" />
          </NuxtLink>
          <div class="ms-4 font-bold text-lg text-muted-800 dark:text-white">
            Portal do Afiliado
          </div>
        </div>
        <DemoToolbarTopnav />
      </TairoTopnavHeader>

      <TairoTopnavHeader hide="scroll" class="px-4 md:px-6 lg:px-8 xl:px-10 !z-[40] relative">
        <ClientOnly>
          <TairoMenu>
            <TairoMenuList>
              <TairoMenuItem>
                <TairoMenuLink as-child :active="$route.path === '/affiliate/dashboard'">
                  <NuxtLink to="/affiliate/dashboard" active-class="!text-primary-500 font-semibold">
                    Painel Geral
                  </NuxtLink>
                </TairoMenuLink>
              </TairoMenuItem>

              <!-- Outros links se houver futuramente -->
              <TairoMenuIndicator />
            </TairoMenuList>

            <div class="absolute top-full start-0 flex w-full mt-[10px]">
              <TairoMenuViewport />
            </div>
          </TairoMenu>
        </ClientOnly>
      </TairoTopnavHeader>
    </TairoTopnavNavbar>

    <TairoTopnavContent class="pt-20 md:pt-32 min-h-screen">
      <slot />
    </TairoTopnavContent>

    <TairoMobileDrawer v-model="isMobileOpen">
      <div class="space-y-6 mt-6 px-2">
        <BaseHeading size="xs" weight="bold" class="text-muted-400 uppercase tracking-widest px-4">
          Navegação
        </BaseHeading>
        <ul class="space-y-1">
          <li>
            <NuxtLink to="/affiliate/dashboard"
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-600 dark:text-muted-400 hover:bg-muted-100 dark:hover:bg-muted-800 transition-colors"
              exact-active-class="bg-primary-500/10 text-primary-500! font-semibold">
              <Icon name="solar:widget-3-bold-duotone" class="size-5" />
              Painel Geral
            </NuxtLink>
          </li>
        </ul>
      </div>
    </TairoMobileDrawer>

    <!-- Sem SubscriptionOverlay aqui! -->
  </TairoTopnavLayout>
</template>
