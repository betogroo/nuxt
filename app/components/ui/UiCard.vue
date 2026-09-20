<script setup lang="ts">
  defineProps<{
    title?: string
    elevation?: number | string
    loading?: boolean
    transparentHeader?: boolean
  }>()
</script>

<template>
  <v-card :elevation="elevation || 2" :loading="loading">
    <!-- Header -->
    <v-card-title
      v-if="title || $slots.header"
      :class="['d-flex align-center pa-4', transparentHeader ? '' : 'bg-primary text-white']"
    >
      <slot name="header">
        {{ title }}
      </slot>
    </v-card-title>

    <v-divider v-if="title || $slots.header" />

    <!-- Body -->
    <v-card-text class="pa-4">
      <slot />
    </v-card-text>

    <!-- Footer/Actions -->
    <template v-if="$slots.actions">
      <v-divider />
      <v-card-actions class="px-4 py-3 justify-end">
        <slot name="actions" />
      </v-card-actions>
    </template>
  </v-card>
</template>
