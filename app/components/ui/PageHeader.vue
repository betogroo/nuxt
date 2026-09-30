<script setup lang="ts">
  defineProps<{
    title: string
    subtitle?: string
    divider?: boolean
  }>()
</script>

<template>
  <div class="page-header mb-6">
    <div class="d-flex flex-column flex-md-row align-md-center justify-space-between">
      <div>
        <h1 class="text-h5 font-weight-bold text-high-emphasis">{{ title }}</h1>
        <p v-if="subtitle" class="text-body-2 text-medium-emphasis mt-1 mb-0">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="mt-4 mt-md-0 d-flex gap-3 align-center">
        <slot name="actions" />
      </div>
    </div>
    <v-divider class="mt-4" />
  </div>
</template>
