<script setup lang="ts">
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  const { profile, fetchProfile } = useProfile()
  const drawer = ref(true)

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
  const { pendingCategoriesCount, pendingUnitsCount, pendingExpenseNaturesCount, pendingReturnsCount, totalPending } =
    usePendingTasks()

  const signOut = async () => {
    if (user.value) {
      await logAction('LOGOUT', 'Usuário fez logoff do sistema.', user.value.id)
    }
    await supabase.auth.signOut()
    navigateTo('/login')
  }
</script>

<template>
  <v-app>
    <!-- Menu Lateral (Drawer) -->
    <v-navigation-drawer v-model="drawer" app elevation="1">
      <div class="pa-4 text-h5 font-weight-bold text-primary d-flex align-center gap-2">
        <v-icon>mdi-cube-outline</v-icon>
        Dashboard
      </div>
      <v-divider />

      <v-list density="compact" nav>
        <v-list-item prepend-icon="mdi-home" title="Home" to="/" />
        <v-list-item prepend-icon="mdi-information" title="Sobre" to="/about" />

        <v-divider class="my-2" />

        <v-list-subheader v-if="user">Gestão</v-list-subheader>
        <v-list-item v-if="user" prepend-icon="mdi-clipboard-list" title="Demandas" to="/demands">
          <template v-if="pendingReturnsCount > 0" #append>
            <v-badge color="error" :content="pendingReturnsCount" inline />
          </template>
        </v-list-item>
        <v-list-item
          v-if="user"
          prepend-icon="mdi-package-variant"
          title="Produtos"
          to="/products"
        />
        <v-list-item
          v-if="user"
          prepend-icon="mdi-truck-outline"
          title="Fornecedores"
          to="/suppliers"
        />

        <template v-if="profile?.role === 'admin'">
          <v-divider class="my-2" />
          <v-list-subheader>Administração</v-list-subheader>

          <v-list-item prepend-icon="mdi-view-dashboard" title="Painel" to="/admin" />
          <v-list-item prepend-icon="mdi-account-group" title="Usuários" to="/users" />
          <v-list-item prepend-icon="mdi-format-list-bulleted-type" title="Logs" to="/logs" />

          <v-list-item prepend-icon="mdi-shape" title="Categorias" to="/admin/categories">
            <template v-if="pendingCategoriesCount > 0" #append>
              <v-badge color="error" :content="pendingCategoriesCount" inline />
            </template>
          </v-list-item>

          <v-list-item prepend-icon="mdi-scale-balance" title="Unidades" to="/admin/units">
            <template v-if="pendingUnitsCount > 0" #append>
              <v-badge color="error" :content="pendingUnitsCount" inline />
            </template>
          </v-list-item>

          <v-list-item prepend-icon="mdi-cash-multiple" title="Naturezas de Despesa" to="/admin/expense-natures">
            <template v-if="pendingExpenseNaturesCount > 0" #append>
              <v-badge color="error" :content="pendingExpenseNaturesCount" inline />
            </template>
          </v-list-item>
        </template>
      </v-list>
    </v-navigation-drawer>

    <!-- Cabeçalho (App Bar) -->
    <v-app-bar app border="b" elevation="0">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-spacer />

      <ThemeToggle />

      <!-- Notificações (apenas Admin) -->
      <v-menu v-if="profile?.role === 'admin' && totalPending > 0">
        <template #activator="{ props }">
          <v-btn v-bind="props" class="mx-2" icon>
            <v-badge color="error" :content="totalPending">
              <v-icon>mdi-bell-outline</v-icon>
            </v-badge>
          </v-btn>
        </template>
        <v-list>
          <v-list-subheader>Pendências</v-list-subheader>
          <v-list-item
            v-if="pendingCategoriesCount > 0"
            prepend-icon="mdi-shape"
            to="/admin/categories"
          >
            <v-list-item-title>{{ pendingCategoriesCount }} categorias sugeridas</v-list-item-title>
          </v-list-item>
          <v-list-item
            v-if="pendingUnitsCount > 0"
            prepend-icon="mdi-scale-balance"
            to="/admin/units"
          >
            <v-list-item-title>{{ pendingUnitsCount }} unidades sugeridas</v-list-item-title>
          </v-list-item>
          <v-list-item
            v-if="pendingExpenseNaturesCount > 0"
            prepend-icon="mdi-cash-multiple"
            to="/admin/expense-natures"
          >
            <v-list-item-title>{{ pendingExpenseNaturesCount }} naturezas sugeridas</v-list-item-title>
          </v-list-item>
          <v-list-item
            v-if="pendingReturnsCount > 0"
            prepend-icon="mdi-keyboard-return"
            to="/admin"
          >
            <v-list-item-title
              >{{ pendingReturnsCount }} pedidos de retorno em demandas</v-list-item-title
            >
          </v-list-item>
        </v-list>
      </v-menu>

      <!-- Menu do usuário -->
      <v-menu v-if="user">
        <template #activator="{ props }">
          <v-btn v-bind="props" class="ml-2" icon>
            <v-avatar color="primary" size="36">
              <span class="text-white text-uppercase">{{ user.email?.charAt(0) || 'U' }}</span>
            </v-avatar>
          </v-btn>
        </template>
        <v-list min-width="200">
          <v-list-item>
            <template #prepend>
              <v-avatar color="primary" size="40">
                <span class="text-white text-uppercase">{{ user.email?.charAt(0) || 'U' }}</span>
              </v-avatar>
            </template>
            <v-list-item-title>{{ profile?.name || 'Usuário' }}</v-list-item-title>
            <v-list-item-subtitle>{{ user.email }}</v-list-item-subtitle>
          </v-list-item>
          <v-divider class="my-2" />
          <v-list-item prepend-icon="mdi-account-edit" title="Meu Perfil" to="/profile" />
          <v-list-item color="error" prepend-icon="mdi-logout" title="Sair" @click="signOut" />
        </v-list>
      </v-menu>

      <v-btn v-if="!user" class="ml-4" color="primary" to="/login" variant="tonal">Entrar</v-btn>
    </v-app-bar>

    <v-main class="bg-background">
      <v-container class="pa-4 pa-md-6" fluid style="max-width: 1400px">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>
