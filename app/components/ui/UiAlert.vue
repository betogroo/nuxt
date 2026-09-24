<script setup lang="ts">
  defineProps<{
    type?: 'success' | 'info' | 'warning' | 'error'
    title?: string
    text?: string
    closable?: boolean
    variant?: 'flat' | 'elevated' | 'tonal' | 'outlined' | 'text' | 'plain'
    border?: 'top' | 'end' | 'bottom' | 'start' | boolean
  }>()
</script>

<template>
  <v-alert
    :border="border"
    :closable="closable"
    density="compact"
    :text="text"
    :title="title"
    :type="type || 'info'"
    :variant="variant || 'tonal'"
  >
    <slot />
  </v-alert>
</template>
