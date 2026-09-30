<script setup lang="ts">
  defineProps<{
    color?: string
    variant?: 'elevated' | 'flat' | 'text' | 'outlined' | 'tonal' | 'plain'
    icon?: string | boolean
    rounded?: string
  }>()
</script>

<template>
  <v-btn
    :color="color || 'primary'"
    :icon="icon"
    :rounded="rounded ?? (icon ? 'lg' : 'lg')"
    :variant="variant || (icon ? 'text' : 'tonal')"
    v-bind="$attrs"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-btn>
</template>
