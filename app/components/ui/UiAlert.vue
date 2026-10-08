<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import { iconMap, type IconName } from './icons'
  import type { UiVariant, UiSize } from '~/types/ui'

  defineOptions({ inheritAttrs: false })

  export type UiAlertType = 'success' | 'info' | 'warning' | 'error'

  const props = defineProps<{
    type?: UiAlertType
    title?: string
    text?: string
    closable?: boolean
    variant?: UiVariant
    size?: UiSize
    border?: 'top' | 'end' | 'bottom' | 'start' | boolean
    icon?: string | boolean
  }>()

  const attrs = useAttrs()

  const vuetifyVariant = computed(() => {
    const map: Record<UiVariant, string> = {
      solid: 'flat',
      outline: 'outlined',
      ghost: 'text',
      soft: 'tonal'
    }
    return props.variant ? map[props.variant] : 'soft'
  })

  const vuetifyDensity = computed(() => {
    if (props.size === 'sm' || props.size === 'xs') return 'compact'
    if (props.size === 'lg' || props.size === 'xl') return 'comfortable'
    return 'default'
  })

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
    :density="vuetifyDensity"
    :icon="mappedIcon"
    :text="text"
    :title="title"
    :type="type || 'info'"
    :variant="vuetifyVariant"
    v-bind="attrs"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-alert>
</template>
