<template>
  <UiApp>
    <UiMain class="bg-background">
      <UiContainer class="fill-height pa-4" fluid>
        <UiRow align="center" justify="center" style="min-height: 100vh">
          <UiCol cols="12" md="5" sm="8">
            <!-- Marca do sistema -->
            <div class="text-center mb-8">
              <UiAvatar class="mb-3" color="primary" rounded="xl" size="56">
                <UiIcon color="white" name="inventory" size="28" />
              </UiAvatar>
              <div class="text-h6 font-weight-bold text-high-emphasis">SistemaGov</div>
              <div class="text-caption text-medium-emphasis">Gestão de Demandas Públicas</div>
            </div>

            <slot />
          </UiCol>
        </UiRow>
      </UiContainer>
    </UiMain>
  </UiApp>
</template>
