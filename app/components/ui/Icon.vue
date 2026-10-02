<script setup lang="ts">
  import { computed } from 'vue'
  import { iconMap, type IconName } from './icons'

  const props = defineProps<{
    name: IconName | (string & {})
    size?: string | number
    color?: string

    left?: boolean
    right?: boolean
    start?: boolean
    end?: boolean
  }>()

  const vuetifyIcon = computed(() => iconMap[props.name])
</script>

<template>
  <v-icon
    :color="color"
    :end="end"
    :icon="vuetifyIcon"
    :left="left"
    :right="right"
    :size="size"
    :start="start"
    v-bind="$attrs"
  />
</template>
