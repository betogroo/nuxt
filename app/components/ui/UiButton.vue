<script setup lang="ts">
  defineProps<{
    color?: string
    variant?: 'elevated' | 'flat' | 'text' | 'outlined' | 'tonal'
    loading?: boolean
    disabled?: boolean
    icon?: string
    prependIcon?: string
    block?: boolean
    size?: string
  }>()
</script>

<template>
  <v-btn
    :block="block"
    :color="color || 'primary'"
    :disabled="disabled"
    :icon="!!icon"
    :loading="loading"
    :prepend-icon="prependIcon"
    :size="size"
    :variant="variant || (icon ? 'text' : 'elevated')"
  >
    <v-icon v-if="icon">{{ icon }}</v-icon>
    <slot v-else />
  </v-btn>
</template>
