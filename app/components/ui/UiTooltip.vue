<script setup lang="ts">
  defineProps<{
    text: string
    location?: 'top' | 'bottom' | 'start' | 'end' | 'left' | 'right'
    disabled?: boolean
  }>()
</script>

<template>
  <v-tooltip :disabled="disabled" :location="location || 'top'" :text="text">
    <template #activator="{ props }">
      <slot name="activator" :props="props" />
    </template>
  </v-tooltip>
</template>
