<script setup lang="ts">
  defineProps<{
    title: string
    subtitle?: string
  }>()
</script>

<template>
  <div class="d-flex flex-column flex-md-row align-md-center justify-space-between mb-6">
    <div>
      <h1 class="text-h4 font-weight-bold text-primary">{{ title }}</h1>
      <p v-if="subtitle" class="text-subtitle-1 text-grey-darken-1 mt-1">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="mt-4 mt-md-0 d-flex gap-4">
      <slot name="actions" />
    </div>
  </div>
</template>
