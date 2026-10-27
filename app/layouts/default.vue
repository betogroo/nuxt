<script setup lang="ts">
  import { ROLES, ROLE_LABELS } from '~/constants/roles'

  const user = useSupabaseUser()
  const { userId } = useCurrentUserId()
  const { signOut } = useAuth()
  const { profile, fetchProfile } = useProfile()
  const drawer = ref<boolean | null>(null) // null = deixa Vuetify decidir por breakpoint

  const handleSignOut = async () => {
    await signOut(APP_ROUTES.login)
  }

  // Sincroniza o perfil reativamente assim que o ID do usuário estiver pronto
  watchEffect(() => {
    if (userId.value) {
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
    pendingCharacteristicKeysCount,
    pendingReturnsCount,
    totalPending,
    refreshAll: refreshPendingTasks,
  } = usePendingTasks()

  // Inicial do nome/email do usuário
  const userInitial = computed(() => {
    const name = profile.value?.name || user.value?.email || 'U'
    return name.charAt(0).toUpperCase()
  })

  // Label do role formatado (usando constante centralizada)
  const roleLabel = ROLE_LABELS

  const { drawerSections } = useNavLinks()
  const route = useRoute()
  const { getIcon } = usePageIcon()

  // Pending badges per path (preserved as-is for badge-specific logic)
  const pathBadge = computed<Record<string, number>>(() => ({
    [APP_ROUTES.demands.index]: pendingReturnsCount.value,
    [APP_ROUTES.admin.units]: pendingUnitsCount.value,
    [APP_ROUTES.admin.expenseNatures]: pendingExpenseNaturesCount.value,
    [APP_ROUTES.admin.productClasses]: pendingProductClassesCount.value,
    [APP_ROUTES.admin.productCharacteristics]: pendingCharacteristicKeysCount.value,
  }))

  const getSubgroupBadge = (subgroupLinks: { path: string }[]): number => {
    return subgroupLinks.reduce((sum, link) => sum + (pathBadge.value[link.path] || 0), 0)
  }

  const openedGroups = ref<string[]>([])

  // Watch route to open corresponding subgroup automatically and refresh pending badges
  watch(
    () => route.path,
    async (currentPath) => {
      if (profile.value?.role === ROLES.ADMIN) {
        await refreshPendingTasks()
      }

      for (const section of drawerSections.value) {
        for (const subgroup of section.subgroups) {
          if (subgroup.links.some((l) => l.path === currentPath)) {
            if (!openedGroups.value.includes(subgroup.id)) {
              openedGroups.value.push(subgroup.id)
            }
          }
        }
      }
    },
    { immediate: true },
  )
</script>

<template>
  <UiApp>
    <!-- Sistema de notificações global -->
    <UiToast />
    <!-- Menu Lateral (Drawer) -->
    <UiNavigationDrawer v-model="drawer" :elevation="0" :mobile-breakpoint="960">
      <!-- Marca do sistema -->
      <div class="px-3 pt-4 pb-2 d-flex align-center gap-2">
        <UiAvatar color="primary" rounded="lg" size="32">
          <UiIcon color="white" name="inventory" size="18" />
        </UiAvatar>
        <div>
          <div class="text-subtitle-2 font-weight-bold text-high-emphasis leading-tight">
            SistemaGov
          </div>
          <div class="text-caption text-medium-emphasis leading-none">Gestão de Demandas</div>
        </div>
      </div>

      <UiDivider class="mb-1" />

      <!-- Navegação principal: limpa, intuitiva e organizada -->
      <UiList v-model:opened="openedGroups" class="px-2" density="compact" nav>
        <template v-for="section in drawerSections" :key="section.group">
          <!-- Separador para seção informativa / rodapé -->
          <UiDivider v-if="section.group === 'info'" class="my-1.5" />

          <!-- Cabeçalho de seção (apenas para grupos com label) -->
          <div v-if="section.label" class="mt-2 mb-0.5">
            <span
              class="text-caption text-medium-emphasis font-weight-bold px-3 text-uppercase drawer-section-label"
            >
              {{ section.label }}
            </span>
          </div>

          <!-- Links Diretos da Seção -->
          <UiListItem
            v-for="link in section.directLinks"
            :key="link.path"
            class="drawer-nav-item mb-0.5"
            density="compact"
            :prepend-icon="link.icon"
            rounded="md"
            :title="link.label"
            :to="link.path"
          >
            <template v-if="pathBadge[link.path] > 0" #append>
              <UiBadge color="error" :content="pathBadge[link.path]" inline size="x-small" />
            </template>
          </UiListItem>

          <!-- Subgrupos Retráteis da Seção -->
          <UiListGroup
            v-for="subgroup in section.subgroups"
            :key="subgroup.id"
            :value="subgroup.id"
          >
            <template #activator="{ props }">
              <UiListItem
                v-bind="props"
                class="drawer-nav-item mb-0.5"
                density="compact"
                :prepend-icon="subgroup.icon"
                rounded="md"
                :title="subgroup.label"
              >
                <template v-if="getSubgroupBadge(subgroup.links) > 0" #append>
                  <UiBadge
                    color="error"
                    :content="getSubgroupBadge(subgroup.links)"
                    inline
                    size="x-small"
                  />
                </template>
              </UiListItem>
            </template>

            <!-- Links Filhos do Subgrupo -->
            <UiListItem
              v-for="subLink in subgroup.links"
              :key="subLink.path"
              class="drawer-nav-item mb-0.5 ps-5"
              density="compact"
              :prepend-icon="subLink.icon"
              rounded="md"
              :title="subLink.label"
              :to="subLink.path"
            >
              <template v-if="pathBadge[subLink.path] > 0" #append>
                <UiBadge color="error" :content="pathBadge[subLink.path]" inline size="x-small" />
              </template>
            </UiListItem>
          </UiListGroup>
        </template>
      </UiList>

      <!-- Rodapé do Drawer: perfil do usuário -->
      <template #append>
        <UiDivider />
        <div v-if="user" class="pa-2">
          <UiList density="compact" nav>
            <UiListItem
              class="drawer-nav-item"
              density="compact"
              rounded="md"
              :subtitle="user.email"
              :title="profile?.name || 'Usuário'"
              to="/profile"
            >
              <template #prepend>
                <UiAvatar color="primary" size="28">
                  <UiImg
                    v-if="profile?.avatar_url"
                    :alt="profile?.name || 'Avatar'"
                    class="rounded-circle"
                    cover
                    :src="profile.avatar_url"
                  />
                  <span v-else class="text-caption text-white font-weight-bold">{{
                    userInitial
                  }}</span>
                </UiAvatar>
              </template>
              <template #append>
                <UiTooltip location="top" text="Sair">
                  <template #activator="{ props }">
                    <UiButton
                      v-bind="props"
                      color="error"
                      icon="logout"
                      size="xs"
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
          <UiButton v-bind="props" class="mx-1" icon rounded="lg" size="md" variant="ghost">
            <UiBadge color="error" :content="totalPending">
              <UiIcon name="notifications" />
            </UiBadge>
          </UiButton>
        </template>
        <UiCard elevation="4" min-width="280" rounded="xl">
          <template #header
            ><div class="text-subtitle-2 font-weight-bold">Pendências</div></template
          >
          <UiList nav size="sm">
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
              v-if="pendingCharacteristicKeysCount > 0"
              :prepend-icon="getIcon('/admin/product-characteristics')"
              rounded="lg"
              :subtitle="`${pendingCharacteristicKeysCount} característica(s) aguardando aprovação`"
              title="Características de Produtos"
              to="/admin/product-characteristics"
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
          <UiButton v-bind="props" class="ml-1 mr-2" icon rounded="lg" size="md" variant="ghost">
            <UiAvatar color="primary" size="32">
              <UiImg
                v-if="profile?.avatar_url"
                :alt="profile?.name || 'Avatar'"
                class="rounded-circle"
                cover
                :src="profile.avatar_url"
              />
              <span v-else class="text-caption text-white font-weight-bold">{{ userInitial }}</span>
            </UiAvatar>
          </UiButton>
        </template>
        <UiCard elevation="4" min-width="240" rounded="xl">
          <UiList>
            <UiListItem>
              <template #prepend>
                <UiAvatar class="mr-1" color="primary" size="40">
                  <UiImg
                    v-if="profile?.avatar_url"
                    :alt="profile?.name || 'Avatar'"
                    class="rounded-circle"
                    cover
                    :src="profile.avatar_url"
                  />
                  <span v-else class="text-subtitle-1 text-white font-weight-bold">{{
                    userInitial
                  }}</span>
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
          <UiList nav size="sm">
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

<style scoped>
  .drawer-section-label {
    font-size: 0.6875rem !important;
    letter-spacing: 0.05em;
  }

  .drawer-nav-item {
    min-height: 32px !important;
    padding-top: 2px !important;
    padding-bottom: 2px !important;
    font-size: 0.8125rem !important;
  }

  .drawer-nav-item :deep(.v-list-item-title) {
    font-size: 0.8125rem !important;
    line-height: 1.25rem !important;
    font-weight: 500;
  }

  .drawer-nav-item :deep(.v-list-item__prepend > .v-icon) {
    font-size: 1.125rem !important;
    margin-inline-end: 10px !important;
  }

  .drawer-nav-item :deep(.v-list-item__spacer) {
    width: 10px !important;
  }
</style>
