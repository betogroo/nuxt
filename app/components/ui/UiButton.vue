<script setup lang="ts">
  defineProps<{
    color?: string
    variant?: 'elevated' | 'flat' | 'text' | 'outlined' | 'tonal' | 'plain'
    icon?: string | boolean
  }>()
</script>

<template>
  <v-btn
    :color="color || 'primary'"
    :icon="icon"
    :variant="variant || (icon ? 'text' : 'elevated')"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-btn>
</template>
