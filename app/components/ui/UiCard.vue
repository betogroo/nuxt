<script setup lang="ts">
  defineProps<{
    title?: string
    elevation?: number | string
    loading?: boolean
    transparentHeader?: boolean
  }>()
</script>

<template>
  <v-card border :elevation="elevation || 0" :loading="loading" rounded="lg">
    <!-- Header -->
    <v-card-title
      v-if="title || $slots.header"
      :class="[
        'd-flex align-center px-4 pt-4 pb-2',
        transparentHeader ? '' : 'text-primary font-weight-bold',
      ]"
    >
      <slot name="header">
        {{ title }}
      </slot>
    </v-card-title>

    <v-divider v-if="(title || $slots.header) && !transparentHeader" class="mt-2" />

    <!-- Body -->
    <v-card-text class="pa-4">
      <slot />
    </v-card-text>

    <!-- Footer/Actions -->
    <template v-if="$slots.actions">
      <v-divider />
      <v-card-actions class="px-4 py-3 justify-end bg-grey-lighten-4">
        <slot name="actions" />
      </v-card-actions>
    </template>
  </v-card>
</template>
