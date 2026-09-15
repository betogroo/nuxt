<template>
  <v-app>
    <v-app-bar>
      <v-app-bar-title>Nuxt</v-app-bar-title>
      <v-spacer />
      <v-btn to="/">Home</v-btn>
      <v-btn to="/about">About</v-btn>
    </v-app-bar>
    <v-main>
      <v-container>
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>
