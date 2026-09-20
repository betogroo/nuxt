<script setup lang="ts">
  defineProps<{
    color?: string
    variant?: 'elevated' | 'flat' | 'text' | 'outlined' | 'tonal'
    loading?: boolean
    disabled?: boolean
    icon?: string | boolean
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
    :icon="icon"
    :loading="loading"
    :prepend-icon="prependIcon"
    :size="size"
    :variant="variant || (icon ? 'text' : 'elevated')"
  >
    <slot />
  </v-btn>
</template>
