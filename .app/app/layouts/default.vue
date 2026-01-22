<script setup lang="ts">
import { useTenant } from '~/composables/useTenant'
const { tenant } = useTenant()
const isMobileOpen = ref(false)
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
          <NuxtLink to="/" class="flex items-center gap-3">
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
          <NuxtLink to="/" class="flex items-center gap-3">
            <TairoLogo class="size-8 text-primary-heavy dark:text-primary-light" />
          </NuxtLink>
          <DemoWorkspaceDropdown class="ms-auto max-w-[170px] md:ms-0 me-4 md:me-0 md:max-w-[240px]" />
        </div>
        <DemoToolbarTopnav />
      </TairoTopnavHeader>

      <TairoTopnavHeader hide="scroll" class="px-4 md:px-6 lg:px-8 xl:px-10 !z-[40] relative">
        <ClientOnly>
          <TairoMenu>
            <TairoMenuList>

              <TairoMenuItem>
                <TairoMenuLink as-child :active="$route.path === '/dashboard'">
                  <NuxtLink to="/dashboard">
                    Dashboard
                  </NuxtLink>
                </TairoMenuLink>
              </TairoMenuItem>

              <TairoMenuItem>
                <TairoMenuLink as-child :active="$route.path === '/dashboard/ir'">
                  <NuxtLink to="/dashboard/ir">
                    Imposto de Renda
                  </NuxtLink>
                </TairoMenuLink>
              </TairoMenuItem>

              <TairoMenuItem>
                <TairoMenuTrigger>
                  <span>Clientes</span>
                  <Icon name="lucide:chevron-down"
                    class="transition-transform duration-200 ease-in group-data-[state=open]:-rotate-180" />
                </TairoMenuTrigger>
                <TairoMenuContent>
                  <TairoMenuListItems class="m-0 list-none p-4 sm:w-[300px] sm:max-w-[300px] flex flex-col">
                    <TairoMenuLink as-child>
                      <NuxtLink to="/dashboard/clients">
                        <BaseHeading size="sm" weight="medium"
                          class="text-muted-900 dark:text-white in-[.router-link-exact-active]:text-primary-500">
                          Listar Todos
                        </BaseHeading>
                        <BaseParagraph size="sm" class="max-w-[260px] text-muted-600 dark:text-muted-400">
                          Veja todos os clientes cadastrados
                        </BaseParagraph>
                      </NuxtLink>
                    </TairoMenuLink>
                    <TairoMenuLink as-child>
                      <NuxtLink to="/dashboard/clients/create">
                        <BaseHeading size="sm" weight="medium"
                          class="text-muted-900 dark:text-white in-[.router-link-exact-active]:text-primary-500">
                          Cadastrar Cliente
                        </BaseHeading>
                        <BaseParagraph size="sm" class="max-w-[260px] text-muted-600 dark:text-muted-400">
                          Cadastre um novo cliente
                        </BaseParagraph>
                      </NuxtLink>
                    </TairoMenuLink>
                  </TairoMenuListItems>
                </TairoMenuContent>
              </TairoMenuItem>


              <TairoMenuItem>
                <TairoMenuTrigger>
                  <span>Minha Empresa</span>
                  <Icon name="lucide:chevron-down"
                    class="transition-transform duration-200 ease-in group-data-[state=open]:-rotate-180" />
                </TairoMenuTrigger>
                <TairoMenuContent class="!z-[100]">
                  <TairoMenuListItems class="m-0 grid list-none gap-x-[10px] p-[22px] sm:w-[500px]">
                    <li class="row-span-3 grid">
                      <div class="grid sm:grid-cols-5 gap-4">
                        <div class="hidden sm:block sm:col-span-2">
                          <div class="flex flex-col justify-end h-full w-full bg-primary-950 rounded-xl p-4">
                            <div>
                              <TairoLogo class="size-10 text-white mb-3" />
                              <BaseHeading class="text-white mb-2">
                                {{ tenant?.name || 'CONTSTAR' }}
                              </BaseHeading>
                              <BaseParagraph size="xs" class="max-w-[260px] text-white">
                                {{ tenant?.tradeName || 'Contabilidade e IR' }}
                              </BaseParagraph>
                            </div>
                          </div>
                        </div>
                        <div class="sm:col-span-3 flex flex-col gap-2">
                          <TairoMenuLink as-child>
                            <NuxtLink to="/dashboard/settings">
                              <div class="flex items-center gap-3">
                                <div class="size-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                                  <Icon name="lucide:palette" class="size-4 text-primary-500" />
                                </div>
                                <div>
                                  <BaseHeading size="sm" weight="medium"
                                    class="text-muted-900 dark:text-white in-[.router-link-exact-active]:text-primary-500">
                                    Whitelabel
                                  </BaseHeading>
                                  <BaseParagraph size="xs" class="text-muted-500">
                                    Logo e cores do sistema
                                  </BaseParagraph>
                                </div>
                              </div>
                            </NuxtLink>
                          </TairoMenuLink>
                          <TairoMenuLink as-child>
                            <NuxtLink to="/dashboard/settings/account">
                              <div class="flex items-center gap-3">
                                <div class="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                  <Icon name="lucide:building-2" class="size-4 text-emerald-500" />
                                </div>
                                <div>
                                  <BaseHeading size="sm" weight="medium"
                                    class="text-muted-900 dark:text-white in-[.router-link-exact-active]:text-primary-500">
                                    Dados da Empresa
                                  </BaseHeading>
                                  <BaseParagraph size="xs" class="text-muted-500">
                                    CNPJ, contato e localização
                                  </BaseParagraph>
                                </div>
                              </div>
                            </NuxtLink>
                          </TairoMenuLink>
                          <TairoMenuLink as-child>
                            <NuxtLink to="/dashboard/settings/team">
                              <div class="flex items-center gap-3">
                                <div class="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                  <Icon name="lucide:users" class="size-4 text-amber-500" />
                                </div>
                                <div>
                                  <BaseHeading size="sm" weight="medium"
                                    class="text-muted-900 dark:text-white in-[.router-link-exact-active]:text-primary-500">
                                    Equipe
                                  </BaseHeading>
                                  <BaseParagraph size="xs" class="text-muted-500">
                                    Gerenciar funcionários
                                  </BaseParagraph>
                                </div>
                              </div>
                            </NuxtLink>
                          </TairoMenuLink>
                        </div>
                      </div>
                    </li>
                  </TairoMenuListItems>
                </TairoMenuContent>
              </TairoMenuItem>



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
      <DemoWorkspaceDropdown class="my-4" />

      <div v-for="i in 6" :key="i" class="space-y-3 mb-10">
        <BaseHeading size="xl" weight="semibold">
          Menu
        </BaseHeading>
        <div>
          <ul class="font-sans text-lg space-y-2">
            <li v-for="item in 6" :key="item">
              <NuxtLink to="#" class="text-muted-600 dark:text-muted-400 underline-offset-8"
                exact-active-class="underline font-medium text-muted-900! dark:text-white!">
                Amazing UI
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </TairoMobileDrawer>
  </TairoTopnavLayout>
</template>
