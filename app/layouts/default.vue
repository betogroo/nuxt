<script setup lang="ts">
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  const signOut = async () => {
    await supabase.auth.signOut()
    navigateTo('/login')
  }
</script>
<template>
  <v-app app>
    <v-app-bar>
      <v-app-bar-title>Nuxt</v-app-bar-title>
      <v-spacer />
      <v-btn color="primary" to="/">Home</v-btn>
      <v-btn color="primary" to="/users">Usuários</v-btn>
      <v-btn color="primary" to="/about">About</v-btn>
      <ThemeToggle />
      <!-- Menu do usuário -->
      <v-menu v-if="user">
        <template #activator="{ props }">
          <v-btn icon v-bind="props">
            <v-icon>mdi-account</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item>
            <v-list-item-title>{{ user.email }}</v-list-item-title>
          </v-list-item>
          <v-divider />
          <v-list-item @click="signOut">
            <v-list-item-title>Sair</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>
    <v-main>
      <v-container>
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>
