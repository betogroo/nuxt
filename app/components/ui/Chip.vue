<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import { iconMap, type IconName } from './icons'
  import type { UiVariant, UiSize, UiColor } from '~/types/ui'

  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    color?: UiColor
    size?: UiSize
    variant?: UiVariant
    closable?: boolean
    disabled?: boolean
    label?: boolean
  }>()

  defineEmits<{ (e: 'click:close' | 'click'): void }>()

  const attrs = useAttrs()

  const vuetifyVariant = computed(() => {
    const map: Record<UiVariant, string> = {
      solid: 'flat',
      flat: 'flat',
      elevated: 'elevated',
      outline: 'outlined',
      outlined: 'outlined',
      ghost: 'text',
      text: 'text',
      plain: 'plain',
      soft: 'tonal',
      tonal: 'tonal',
    }
    return props.variant ? map[props.variant] || props.variant : undefined
  })

  const vuetifySize = computed(() => {
    const map: Record<UiSize, string> = {
      xs: 'x-small',
      'x-small': 'x-small',
      sm: 'small',
      small: 'small',
      md: 'default',
      default: 'default',
      lg: 'large',
      large: 'large',
      xl: 'x-large',
      'x-large': 'x-large',
    }
    return props.size ? map[props.size] || props.size : undefined
  })

  const mappedAttrs = computed(() => {
    const newAttrs: Record<string, unknown> = { ...attrs }
    const iconProps = ['prepend-icon', 'append-icon', 'close-icon']

    for (const prop of iconProps) {
      if (typeof newAttrs[prop] === 'string' && newAttrs[prop] in iconMap) {
        newAttrs[prop] = iconMap[newAttrs[prop] as IconName]
      }
    }
    return newAttrs
  })
</script>

<template>
  <v-chip
    :closable="closable"
    :color="color"
    :disabled="disabled"
    :label="label"
    :size="vuetifySize"
    :variant="vuetifyVariant"
    v-bind="mappedAttrs"
    @click="$emit('click')"
    @click:close="$emit('click:close')"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-chip>
</template>
