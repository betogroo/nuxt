<script setup lang="ts">
  defineProps<{
    title?: string
    elevation?: number | string
    loading?: boolean
    transparentHeader?: boolean
  }>()
</script>

<template>
  <v-card class="ui-card" :elevation="elevation ?? 1" :loading="loading" rounded="xl">
    <!-- Header -->
    <v-card-title
      v-if="title || $slots.header"
      :class="[
        'd-flex align-center px-5 pt-5 pb-3',
        transparentHeader ? 'text-high-emphasis' : 'text-primary font-weight-semibold',
      ]"
    >
      <slot name="header">
        {{ title }}
      </slot>
    </v-card-title>

    <v-divider v-if="(title || $slots.header) && !transparentHeader" />

    <!-- Body -->
    <v-card-text class="pa-5">
      <slot />
    </v-card-text>

    <!-- Footer/Actions -->
    <template v-if="$slots.actions">
      <v-divider />
      <v-card-actions class="px-5 py-3 justify-end">
        <slot name="actions" />
      </v-card-actions>
    </template>
  </v-card>
</template>

<style scoped>
  .ui-card {
    border: 1px solid rgba(var(--v-border-color), 0.08);
  }
</style>
