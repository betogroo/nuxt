<script setup lang="ts">
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  const { profile, fetchProfile } = useProfile()
  const drawer = ref<boolean | null>(null) // null = deixa Vuetify decidir por breakpoint

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

  const { logAction } = useLogger()

  // Central de Pendências
  const {
    pendingUnitsCount,
    pendingExpenseNaturesCount,
    pendingProductClassesCount,
    pendingReturnsCount,
    totalPending,
  } = usePendingTasks()

  const signOut = async () => {
    if (user.value) {
      await logAction('LOGOUT', 'Usuário fez logoff do sistema.', user.value.id)
    }
    await supabase.auth.signOut()
    navigateTo('/login')
  }

  // Inicial do nome/email do usuário
  const userInitial = computed(() => {
    const name = profile.value?.name || user.value?.email || 'U'
    return name.charAt(0).toUpperCase()
  })

  // Label do role formatado
  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    uge: 'UGE',
    iirgd: 'IIRGD',
    user: 'Usuário',
  }

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
  <v-app>
    <!-- Menu Lateral (Drawer) -->
    <v-navigation-drawer v-model="drawer" :elevation="0" :mobile-breakpoint="960">
      <!-- Marca do sistema -->
      <div class="px-4 pt-5 pb-3 d-flex align-center gap-3">
        <v-avatar color="primary" rounded="lg" size="36">
          <v-icon color="white" icon="mdi-package-variant-closed" size="20" />
        </v-avatar>
        <div>
          <div class="text-subtitle-2 font-weight-bold text-high-emphasis">SistemaGov</div>
          <div class="text-caption text-medium-emphasis">Gestão de Demandas</div>
        </div>
      </div>

      <v-divider class="mb-2" />

      <!-- Navegação principal: gerada automaticamente por definePageMeta -->
      <v-list class="px-3" density="compact" nav>
        <template v-for="section in drawerByGroup" :key="section.group">
          <!-- Cabeçalho de seção (apenas para grupos com label) -->
          <div v-if="section.label" class="mt-3 mb-1">
            <span class="text-caption text-medium-emphasis font-weight-bold px-3 text-uppercase">
              {{ section.label }}
            </span>
          </div>

          <v-list-item
            v-for="link in section.links"
            :key="link.path"
            rounded="lg"
            :title="link.label"
            :to="link.path"
          >
            <template #prepend>
              <UiIcon class="mr-4" :name="link.icon" />
            </template>
            <template v-if="pathBadge[link.path] > 0" #append>
              <v-badge color="error" :content="pathBadge[link.path]" inline />
            </template>
          </v-list-item>
        </template>
      </v-list>

      <!-- Rodapé do Drawer: perfil do usuário -->
      <template #append>
        <v-divider />
        <div v-if="user" class="pa-3">
          <v-list density="compact" nav>
            <v-list-item
              rounded="lg"
              :subtitle="user.email"
              :title="profile?.name || 'Usuário'"
              to="/profile"
            >
              <template #prepend>
                <v-avatar color="primary" size="32">
                  <span class="text-caption text-white font-weight-bold">{{ userInitial }}</span>
                </v-avatar>
              </template>
              <template #append>
                <v-tooltip location="top" text="Sair">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      color="error"
                      density="compact"
                      icon="mdi-logout"
                      variant="text"
                      @click.prevent="signOut"
                    />
                  </template>
                </v-tooltip>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Cabeçalho (App Bar) -->
    <v-app-bar :border="false" elevation="0" height="60">
      <template #prepend>
        <v-app-bar-nav-icon @click="drawer = !drawer" />
      </template>

      <v-spacer />

      <ThemeToggle />

      <!-- Notificações (apenas Admin) -->
      <v-menu v-if="profile?.role === 'admin' && totalPending > 0" :close-on-content-click="false">
        <template #activator="{ props }">
          <v-btn v-bind="props" class="mx-1" density="comfortable" icon rounded="lg" variant="text">
            <v-badge color="error" :content="totalPending">
              <v-icon>mdi-bell-outline</v-icon>
            </v-badge>
          </v-btn>
        </template>
        <v-card elevation="4" min-width="280" rounded="xl">
          <v-card-title class="text-subtitle-2 font-weight-bold pa-4 pb-2">
            Pendências
          </v-card-title>
          <v-list density="compact" nav>
            <v-list-item
              v-if="pendingUnitsCount > 0"
              :prepend-icon="getIcon('/admin/units')"
              rounded="lg"
              :subtitle="`${pendingUnitsCount} unidade(s) aguardando aprovação`"
              title="Unidades de Medida"
              to="/admin/units"
            />
            <v-list-item
              v-if="pendingExpenseNaturesCount > 0"
              :prepend-icon="getIcon('/admin/expense-natures')"
              rounded="lg"
              :subtitle="`${pendingExpenseNaturesCount} natureza(s) aguardando aprovação`"
              title="Naturezas de Despesa"
              to="/admin/expense-natures"
            />
            <v-list-item
              v-if="pendingProductClassesCount > 0"
              :prepend-icon="getIcon('/admin/product-classes')"
              rounded="lg"
              :subtitle="`${pendingProductClassesCount} classe(s) aguardando aprovação`"
              title="Classes de Produtos"
              to="/admin/product-classes"
            />
            <v-list-item
              v-if="pendingReturnsCount > 0"
              :prepend-icon="getIcon('/demands')"
              rounded="lg"
              :subtitle="`${pendingReturnsCount} pedido(s) de retorno em demandas`"
              title="Retornos de Status"
              to="/demands"
            />
          </v-list>
        </v-card>
      </v-menu>

      <!-- Menu do usuário (mobile/alternativo) -->
      <v-menu v-if="user">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            class="ml-1 mr-2"
            density="comfortable"
            icon
            rounded="lg"
            variant="text"
          >
            <v-avatar color="primary" size="32">
              <span class="text-caption text-white font-weight-bold">{{ userInitial }}</span>
            </v-avatar>
          </v-btn>
        </template>
        <v-card elevation="4" min-width="240" rounded="xl">
          <v-list>
            <v-list-item>
              <template #prepend>
                <v-avatar class="mr-1" color="primary" size="40">
                  <span class="text-subtitle-1 text-white font-weight-bold">{{ userInitial }}</span>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-semibold">
                {{ profile?.name || 'Usuário' }}
              </v-list-item-title>
              <v-list-item-subtitle>{{ user.email }}</v-list-item-subtitle>
              <v-list-item-subtitle v-if="profile?.role" class="mt-1">
                <v-chip color="primary" label size="x-small" variant="tonal">
                  {{ roleLabel[profile.role] || profile.role.toUpperCase() }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <v-divider />
          <v-list density="compact" nav>
            <v-list-item rounded="lg" title="Meu Perfil" to="/profile">
              <template #prepend><UiIcon class="mr-4" :name="getIcon('/profile')" /></template>
            </v-list-item>
            <v-list-item
              color="error"
              prepend-icon="mdi-logout"
              rounded="lg"
              title="Sair"
              @click="signOut"
            />
          </v-list>
        </v-card>
      </v-menu>

      <v-btn v-if="!user" class="mr-3" color="primary" rounded="lg" to="/login" variant="tonal">
        Entrar
      </v-btn>
    </v-app-bar>

    <v-main class="bg-background">
      <v-container class="pa-5 pa-md-7" fluid style="max-width: 1440px">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>
