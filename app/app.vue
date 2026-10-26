<template>
  <div>
    <NuxtLayout>
      <NuxtRouteAnnouncer />
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
  /* Decoupled flexbox gap utilities */
  .gap-0 {
    gap: 0px !important;
  }
  .gap-1 {
    gap: 4px !important;
  }
  .gap-2 {
    gap: 8px !important;
  }
  .gap-3 {
    gap: 12px !important;
  }
  .gap-4 {
    gap: 16px !important;
  }
  .gap-5 {
    gap: 20px !important;
  }
  .gap-6 {
    gap: 24px !important;
  }
  .gap-8 {
    gap: 32px !important;
  }

  .gap-x-1 {
    column-gap: 4px !important;
  }
  .gap-x-2 {
    column-gap: 8px !important;
  }
  .gap-x-3 {
    column-gap: 12px !important;
  }
  .gap-x-4 {
    column-gap: 16px !important;
  }

  .gap-y-1 {
    row-gap: 4px !important;
  }
  .gap-y-2 {
    row-gap: 8px !important;
  }
  .gap-y-3 {
    row-gap: 12px !important;
  }
  .gap-y-4 {
    row-gap: 16px !important;
  }

  /* Tooltip High-Contrast Styling */
  .v-tooltip > .v-overlay__content {
    background-color: #1e293b !important;
    color: #ffffff !important;
    font-size: 0.75rem !important;
    font-weight: 500 !important;
    line-height: 1.25 !important;
    padding: 4px 8px !important;
    border-radius: 6px !important;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.15),
      0 2px 4px -2px rgba(0, 0, 0, 0.1) !important;
    opacity: 1 !important;
    z-index: 99999 !important;
  }

  .v-theme--dark .v-tooltip > .v-overlay__content {
    background-color: #334155 !important;
    color: #f8fafc !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
  }

  /* Salvaguarda de Alto Contraste para .bg-surface-variant */
  .bg-surface-variant {
    color: rgb(var(--v-theme-on-surface-variant, 30, 41, 59)) !important;
  }

  .v-theme--dark .bg-surface-variant {
    color: rgb(var(--v-theme-on-surface-variant, 248, 250, 252)) !important;
  }

  .bg-surface-variant th,
  .bg-surface-variant td {
    color: inherit !important;
  }
</style>
