<template>
  <v-app>
    <v-main class="bg-background">
      <v-container class="fill-height pa-4" fluid>
        <v-row align="center" justify="center" style="min-height: 100vh">
          <v-col cols="12" md="5" sm="8">
            <!-- Marca do sistema -->
            <div class="text-center mb-8">
              <v-avatar class="mb-3" color="primary" rounded="xl" size="56">
                <v-icon color="white" icon="mdi-package-variant-closed" size="28" />
              </v-avatar>
              <div class="text-h6 font-weight-bold text-high-emphasis">SistemaGov</div>
              <div class="text-caption text-medium-emphasis">Gestão de Demandas Públicas</div>
            </div>

            <slot />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>
