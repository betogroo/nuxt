<script setup lang="ts">
  import { ROLES, ROLE_LABELS } from '~/constants/roles'

  const user = useSupabaseUser()
  const { signOut } = useAuth()
  const { profile, fetchProfile } = useProfile()
  const drawer = ref<boolean | null>(null) // null = deixa Vuetify decidir por breakpoint

  const handleSignOut = async () => {
    await signOut('/login')
  }

  // Sincroniza o perfil reativamente assim que o ID do usuário estiver pronto
  watchEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = user.value?.id || (user.value as any)?.sub
    if (userId) {
      fetchProfile()
    } else if (!user.value) {
      profile.value = null
    }
  })

  // Central de Pendências
  const {
    pendingUnitsCount,
    pendingExpenseNaturesCount,
    pendingProductClassesCount,
    pendingReturnsCount,
    totalPending,
  } = usePendingTasks()

  // Inicial do nome/email do usuário
  const userInitial = computed(() => {
    const name = profile.value?.name || user.value?.email || 'U'
    return name.charAt(0).toUpperCase()
  })

  // Label do role formatado (usando constante centralizada)
  const roleLabel = ROLE_LABELS

  const { drawerByGroup } = useNavLinks()
  const { getIcon } = usePageIcon()

  // Pending badges per path (preserved as-is for badge-specific logic)
  const pathBadge = computed<Record<string, number>>(() => ({
    '/demands': pendingReturnsCount.value,
    '/admin/units': pendingUnitsCount.value,
    '/admin/expense-natures': pendingExpenseNaturesCount.value,
    '/admin/product-classes': pendingProductClassesCount.value,
  }))
</script>

<template>
  <UiApp>
    <!-- Sistema de notificações global -->
    <UiToast />
    <!-- Menu Lateral (Drawer) -->
    <UiNavigationDrawer v-model="drawer" :elevation="0" :mobile-breakpoint="960">
      <!-- Marca do sistema -->
      <div class="px-4 pt-5 pb-3 d-flex align-center gap-3">
        <UiAvatar color="primary" rounded="lg" size="36">
          <UiIcon color="white" name="inventory" size="20" />
        </UiAvatar>
        <div>
          <div class="text-subtitle-2 font-weight-bold text-high-emphasis">SistemaGov</div>
          <div class="text-caption text-medium-emphasis">Gestão de Demandas</div>
        </div>
      </div>

      <UiDivider class="mb-2" />

      <!-- Navegação principal: gerada automaticamente por definePageMeta -->
      <UiList class="px-3" size="sm" nav>
        <template v-for="section in drawerByGroup" :key="section.group">
          <!-- Cabeçalho de seção (apenas para grupos com label) -->
          <div v-if="section.label" class="mt-3 mb-1">
            <span class="text-caption text-medium-emphasis font-weight-bold px-3 text-uppercase">
              {{ section.label }}
            </span>
          </div>

          <UiListItem
            v-for="link in section.links"
            :key="link.path"
            :prepend-icon="link.icon"
            rounded="lg"
            :title="link.label"
            :to="link.path"
          >
            <template v-if="pathBadge[link.path] > 0" #append>
              <UiBadge color="error" :content="pathBadge[link.path]" inline />
            </template>
          </UiListItem>
        </template>
      </UiList>

      <!-- Rodapé do Drawer: perfil do usuário -->
      <template #append>
        <UiDivider />
        <div v-if="user" class="pa-3">
          <UiList size="sm" nav>
            <UiListItem
              rounded="lg"
              :subtitle="user.email"
              :title="profile?.name || 'Usuário'"
              to="/profile"
            >
              <template #prepend>
                <UiAvatar color="primary" size="32">
                  <span class="text-caption text-white font-weight-bold">{{ userInitial }}</span>
                </UiAvatar>
              </template>
              <template #append>
                <UiTooltip location="top" text="Sair">
                  <template #activator="{ props }">
                    <UiButton
                      v-bind="props"
                      color="error"
                      size="sm"
                      icon="logout"
                      variant="ghost"
                      @click.prevent="handleSignOut"
                    />
                  </template>
                </UiTooltip>
              </template>
            </UiListItem>
          </UiList>
        </div>
      </template>
    </UiNavigationDrawer>

    <!-- Cabeçalho (App Bar) -->
    <UiAppBar :border="false" elevation="0" height="60">
      <template #prepend>
        <UiAppBar-nav-icon @click="drawer = !drawer" />
      </template>

      <UiSpacer />

      <ThemeToggle />

      <!-- Notificações (apenas Admin) -->
      <UiMenu
        v-if="profile?.role === ROLES.ADMIN && totalPending > 0"
        :close-on-content-click="false"
      >
        <template #activator="{ props }">
          <UiButton
            v-bind="props"
            class="mx-1"
            size="md"
            icon
            rounded="lg"
            variant="ghost"
          >
            <UiBadge color="error" :content="totalPending">
              <UiIcon name="notifications" />
            </UiBadge>
          </UiButton>
        </template>
        <UiCard elevation="4" min-width="280" rounded="xl">
          <template #header
            ><div class="text-subtitle-2 font-weight-bold">Pendências</div></template
          >
          <UiList size="sm" nav>
            <UiListItem
              v-if="pendingUnitsCount > 0"
              :prepend-icon="getIcon('/admin/units')"
              rounded="lg"
              :subtitle="`${pendingUnitsCount} unidade(s) aguardando aprovação`"
              title="Unidades de Medida"
              to="/admin/units"
            />
            <UiListItem
              v-if="pendingExpenseNaturesCount > 0"
              :prepend-icon="getIcon('/admin/expense-natures')"
              rounded="lg"
              :subtitle="`${pendingExpenseNaturesCount} natureza(s) aguardando aprovação`"
              title="Naturezas de Despesa"
              to="/admin/expense-natures"
            />
            <UiListItem
              v-if="pendingProductClassesCount > 0"
              :prepend-icon="getIcon('/admin/product-classes')"
              rounded="lg"
              :subtitle="`${pendingProductClassesCount} classe(s) aguardando aprovação`"
              title="Classes de Produtos"
              to="/admin/product-classes"
            />
            <UiListItem
              v-if="pendingReturnsCount > 0"
              :prepend-icon="getIcon('/demands')"
              rounded="lg"
              :subtitle="`${pendingReturnsCount} pedido(s) de retorno em demandas`"
              title="Retornos de Status"
              to="/demands"
            />
          </UiList>
        </UiCard>
      </UiMenu>

      <!-- Menu do usuário (mobile/alternativo) -->
      <UiMenu v-if="user">
        <template #activator="{ props }">
          <UiButton
            v-bind="props"
            class="ml-1 mr-2"
            size="md"
            icon
            rounded="lg"
            variant="ghost"
          >
            <UiAvatar color="primary" size="32">
              <span class="text-caption text-white font-weight-bold">{{ userInitial }}</span>
            </UiAvatar>
          </UiButton>
        </template>
        <UiCard elevation="4" min-width="240" rounded="xl">
          <UiList>
            <UiListItem>
              <template #prepend>
                <UiAvatar class="mr-1" color="primary" size="40">
                  <span class="text-subtitle-1 text-white font-weight-bold">{{ userInitial }}</span>
                </UiAvatar>
              </template>
              <UiListItemTitle class="font-weight-semibold">
                {{ profile?.name || 'Usuário' }}
              </UiListItemTitle>
              <UiListItemSubtitle>{{ user.email }}</UiListItemSubtitle>
              <UiListItemSubtitle v-if="profile?.role" class="mt-1">
                <UiChip color="primary" label size="xs" variant="soft">
                  {{ roleLabel[profile.role] || profile.role.toUpperCase() }}
                </UiChip>
              </UiListItemSubtitle>
            </UiListItem>
          </UiList>
          <UiDivider />
          <UiList size="sm" nav>
            <UiListItem
              :prepend-icon="getIcon('/profile')"
              rounded="lg"
              title="Meu Perfil"
              to="/profile"
            />
            <UiListItem
              color="error"
              prepend-icon="logout"
              rounded="lg"
              title="Sair"
              @click="handleSignOut"
            />
          </UiList>
        </UiCard>
      </UiMenu>

      <UiButton v-if="!user" class="mr-3" color="primary" rounded="lg" to="/login" variant="soft">
        Entrar
      </UiButton>
    </UiAppBar>

    <UiMain class="bg-background">
      <UiContainer class="pa-5 pa-md-7" fluid style="max-width: 1440px">
        <slot />
      </UiContainer>
    </UiMain>
  </UiApp>
</template>
