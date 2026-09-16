<script setup>
  const theme = useTheme()
</script>
<template>
  <v-app>
    <v-app-bar>
      <v-app-bar-title>Nuxt</v-app-bar-title>
      <v-spacer />
      <v-btn color="primary" to="/">Home</v-btn>
      <v-btn color="primary" to="/about">About</v-btn>
      <v-icon-btn
        :icon="theme.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        @click="theme.toggle()"
      />
    </v-app-bar>
    <v-main>
      <v-container>
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>
