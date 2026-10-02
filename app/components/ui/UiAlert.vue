<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import { iconMap, type IconName } from './icons'

  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    type?: 'success' | 'info' | 'warning' | 'error'
    title?: string
    text?: string
    closable?: boolean
    variant?: 'flat' | 'elevated' | 'tonal' | 'outlined' | 'text' | 'plain'
    border?: 'top' | 'end' | 'bottom' | 'start' | boolean
    icon?: string | boolean
  }>()

  const attrs = useAttrs()

  const mappedIcon = computed(() => {
    // If it's a known string in our map, return the mdi class
    const attrIcon = props.icon || attrs.icon
    if (typeof attrIcon === 'string' && attrIcon in iconMap) {
      return iconMap[attrIcon as IconName]
    }
    return attrIcon
  })
</script>

<template>
  <v-alert
    :border="border"
    :closable="closable"
    density="compact"
    :icon="mappedIcon"
    :text="text"
    :title="title"
    :type="type || 'info'"
    :variant="variant || 'tonal'"
    v-bind="attrs"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-alert>
</template>
