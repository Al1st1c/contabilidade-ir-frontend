<script setup lang="ts">
const menu = [
  {
    label: 'Gerenciamento',
    icon: 'solar:sidebar-minimalistic-linear',
    links: [
      {
        label: 'Clientes',
        icon: 'solar:box-minimalistic-linear',
        children: [
          {
            label: 'Listagem de Clientes',
            to: '/dashboard/clients',
          },
          {
            label: 'Cadastro de Clientes',
            to: '/dashboard/clients/create',
          },
        ],
      }
    ],
  },

  {
    label: 'Configurações',
    icon: 'solar:settings-linear',
    links: [
      {
        label: 'Gerenciar Usuários',
        icon: 'solar:user-linear',
        to: '/dashboard/team',
      },
      {
        label: 'Whitelabel',
        icon: 'solar:palette-round-linear',
        to: '/dashboard/settings',
      },
      {
        label: 'Dados da Empresa',
        icon: 'solar:buildings-3-linear',
        to: '/dashboard/settings/account',
      },
    ],
  }
]


const route = useRoute()
const sidebarId = ref(getRouteSidebarId())

watch(() => route.path, () => {
  sidebarId.value = getRouteSidebarId()
})

function getRouteSidebarId() {
  if (route.path =='/dashboard') {
    return 'Dashboard'
  }
  // search for the active menu item
  for (const item of menu) {
    if (item.links.some(link => {
      // Verificação exata para links sem children
      if ('to' in link && link.to === route.path) {
        return true
      }
      // Verificação para children (exata)
      if ('children' in link && link.children) {
        if (link.children.some((child: any) => child.to === route.path)) {
          return true
        }
        // Verificação para rotas que começam com o path do menu (para subrotas)
        if (link.children.some((child: any) => route.path.startsWith(child.to))) {
          return true
        }
      }
      return false
    })) {
      return item.label
    }
  }

  return 'Dashboards'
}
</script>

<template>
  <TairoSidebarLayout
    v-slot="{ toggleMobileNav }"
    v-model="sidebarId"
    :class="[
      sidebarId === 'Dashboard' ? '[--tairo-sidebar-subsidebar-width:0rem]' : ''
    ]"
  >
  <!-- :class="[
      sidebarId === 'Messaging' ? '[--tairo-sidebar-subsidebar-width:4.5rem]' : '',
      sidebarId === 'Inbox' ? '[--tairo-sidebar-subsidebar-width:3.5rem]' : '',
      sidebarId === 'Calendar' ? '[--tairo-sidebar-subsidebar-width:3.5rem]' : '',
      sidebarId === 'Map' ? '[--tairo-sidebar-subsidebar-width:0rem]' : '',
    ]" -->
    <TairoSidebarNav>
      <TairoSidebar>
        <NuxtLink to="/dashboard" class="flex items-center justify-center size-14 shrink-0">
          <TairoLogo class="size-8 text-primary-heavy dark:text-primary-light" />
        </NuxtLink>

        <TairoSidebarLinks class="overflow-y-auto nui-slimscroll">
          <BaseTooltip
            content="Dashboard"
            variant="dark"
            :bindings="{
              content: { side: 'left' },
              portal: { disabled: true },
            }"
          >
            <TairoSidebarTrigger value="Dashboard" to="/dashboard">
              <Icon name="material-symbols:dashboard" class="size-5" />
            </TairoSidebarTrigger>
          </BaseTooltip>

          


          <BaseTooltip
            v-for="item in menu"
            :key="item.label"
            :content="item.label"
            variant="dark"
            :bindings="{
              content: { side: 'left' },
              portal: { disabled: true },
            }"
          >
            <TairoSidebarTrigger :value="item.label">
              <Icon :name="item.icon" class="size-5" />
            </TairoSidebarTrigger>
          </BaseTooltip>

          
<!-- 
          <BaseTooltip
            content="Messaging"
            variant="dark"
            :bindings="{
              content: { side: 'left' },
              portal: { disabled: true },
            }"
          >
            <TairoSidebarTrigger value="Messaging" to="/dashboards/messaging">
              <Icon name="solar:chat-round-unread-linear" class="size-5" />
            </TairoSidebarTrigger>
          </BaseTooltip> -->

          <!-- <BaseTooltip
            content="Inbox"
            variant="dark"
            :bindings="{
              content: { side: 'left' },
              portal: { disabled: true },
            }"
          >
            <TairoSidebarTrigger value="Inbox" to="/dashboards/inbox">
              <Icon name="solar:letter-unread-linear" class="size-5" />
            </TairoSidebarTrigger>
          </BaseTooltip> -->

          <!-- <BaseTooltip
            content="Calendar"
            variant="dark"
            :bindings="{
              content: { side: 'left' },
              portal: { disabled: true },
            }"
          >
            <TairoSidebarTrigger value="Calendar" to="/dashboards/calendar">
              <Icon name="solar:calendar-linear" class="size-5" />
            </TairoSidebarTrigger>
          </BaseTooltip> -->
          <!-- <BaseTooltip
            content="Map"
            variant="dark"
            :bindings="{
              content: { side: 'left' },
              portal: { disabled: true },
            }"
          >
            <TairoSidebarTrigger value="Map" to="/dashboards/map">
              <Icon name="solar:map-point-wave-linear" class="size-5" />
            </TairoSidebarTrigger>
          </BaseTooltip> -->
        </TairoSidebarLinks>

        <TairoSidebarLinks class="shrink-0 mt-auto">
          
          <BaseTooltip
            content="Settings"
            variant="dark"
            :bindings="{
              content: { side: 'left' },
              portal: { disabled: true },
            }"
          >
            <TairoSidebarLink to="/dashboard/settings">
              <Icon name="solar:settings-linear" class="size-5" />
            </TairoSidebarLink>
          </BaseTooltip>
          <TairoSidebarLink>
            <BaseThemeToggle class="scale-90" />
          </TairoSidebarLink>
          <TairoSidebarLink to="/layouts/profile">
            <BaseChip size="sm" pulse color="custom" :offset="3" class="text-green-600 flex items-center justify-center">
              <BaseAvatar
                size="xs"
                src="/img/avatars/10.svg"
              />
            </BaseChip>
          </TairoSidebarLink>
        </TairoSidebarLinks>
      </TairoSidebar>

      <TairoSidebarSubsidebar v-for="item in menu" :key="item.label" :value="item.label">
        <TairoSidebarSubsidebarHeader>
          {{ item.label }}
        </TairoSidebarSubsidebarHeader>
        <TairoSidebarSubsidebarContent>
          <template v-for="link in item.links" :key="link.label">
            <TairoSidebarSubsidebarLink v-if="!('children' in link)" :to="link.to">
              <Icon :name="link.icon" class="size-4 text-muted-500 dark:text-muted-400" />
              <span>{{ link.label }}</span>
            </TairoSidebarSubsidebarLink>
            <TairoSidebarSubsidebarCollapsible
              v-else
              :children="link.children"
              :default-open="'children' in link && link.children ? link.children.some((child: any) => child.to === $route.path) || undefined : undefined"
            >
              <template #trigger>
                <TairoSidebarSubsidebarCollapsibleTrigger>
                  <Icon :name="link.icon" class="size-4 text-muted-500 dark:text-muted-400" />
                  <span>{{ link.label }}</span>
                </TairoSidebarSubsidebarCollapsibleTrigger>
              </template>
            </TairoSidebarSubsidebarCollapsible>
          </template>
        </TairoSidebarSubsidebarContent>
      </TairoSidebarSubsidebar>

    </TairoSidebarNav>

    <TairoSidebarContent class="min-h-screen">
      <div class="px-4 md:px-6 xl:px-8">
        <DemoToolbar
          @toggle-mobile-nav="toggleMobileNav"
        />
      </div>
      <slot />
    </TairoSidebarContent>
  </TairoSidebarLayout>
</template>
