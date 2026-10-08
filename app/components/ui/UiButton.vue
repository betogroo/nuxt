<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import { iconMap, type IconName } from './icons'
  import type { UiVariant, UiColor, UiSize, UiRounded } from '~/types/ui'

  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    color?: UiColor
    variant?: UiVariant
    size?: UiSize
    icon?: IconName | string | boolean
    rounded?: UiRounded
  }>()

  const attrs = useAttrs()

  const mappedIcon = computed(() => {
    if (typeof props.icon === 'string' && props.icon in iconMap) {
      return iconMap[props.icon as IconName]
    }
    return props.icon
  })

  const vuetifySize = computed(() => {
    const map: Record<UiSize, string> = {
      xs: 'x-small',
      sm: 'small',
      md: 'default',
      lg: 'large',
      xl: 'x-large'
    }
    return props.size ? map[props.size] : undefined
  })

  const vuetifyVariant = computed(() => {
    const map: Record<UiVariant, string> = {
      solid: 'flat',
      outline: 'outlined',
      ghost: 'text',
      soft: 'tonal'
    }
    const defaultVariant = props.icon ? 'ghost' : 'soft'
    return props.variant ? map[props.variant] : map[defaultVariant]
  })

  const vuetifyRounded = computed(() => {
    const r = props.rounded || 'lg'
    return r === 'none' ? '0' : r
  })

  const mappedAttrs = computed(() => {
    const newAttrs: Record<string, unknown> = { ...attrs }
    const iconProps = ['prepend-icon', 'append-icon']

    for (const prop of iconProps) {
      if (typeof newAttrs[prop] === 'string' && newAttrs[prop] in iconMap) {
        newAttrs[prop] = iconMap[newAttrs[prop] as IconName]
      }
    }
    return newAttrs
  })
</script>

<template>
  <v-btn
    :color="color || 'primary'"
    :icon="mappedIcon"
    :rounded="vuetifyRounded"
    :size="vuetifySize"
    :variant="vuetifyVariant"
    v-bind="mappedAttrs"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-btn>
</template>
