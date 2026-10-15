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
</style>
