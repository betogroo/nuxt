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

  const vuetifyIcon = computed(() => iconMap[props.name] || props.name)

  const vuetifySize = computed(() => {
    if (props.size === 'xs') return 'x-small'
    if (props.size === 'sm') return 'small'
    if (props.size === 'md') return 'default'
    if (props.size === 'lg') return 'large'
    if (props.size === 'xl') return 'x-large'
    return props.size
  })
</script>

<template>
  <v-icon
    :color="color"
    :end="end"
    :icon="vuetifyIcon"
    :left="left"
    :right="right"
    :size="vuetifySize"
    :start="start"
    v-bind="$attrs"
  />
</template>
