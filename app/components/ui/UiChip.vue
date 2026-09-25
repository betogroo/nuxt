<script setup lang="ts">
  defineProps<{
    color?: string
    size?: 'x-small' | 'small' | 'default' | 'large' | 'x-large'
    variant?: 'flat' | 'elevated' | 'tonal' | 'outlined' | 'text' | 'plain'
    closable?: boolean
    disabled?: boolean
  }>()

  defineEmits<{ (e: 'click:close' | 'click'): void }>()
</script>

<template>
  <v-chip
    :closable="closable"
    :color="color"
    :disabled="disabled"
    :size="size"
    :variant="variant"
    @click="$emit('click')"
    @click:close="$emit('click:close')"
  >
    <slot />
  </v-chip>
</template>
