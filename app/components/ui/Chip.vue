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
      outline: 'outlined',
      ghost: 'text',
      soft: 'tonal',
    }
    return props.variant ? map[props.variant] : undefined
  })

  const vuetifySize = computed(() => {
    const map: Record<UiSize, string> = {
      xs: 'x-small',
      sm: 'small',
      md: 'default',
      lg: 'large',
      xl: 'x-large',
    }
    return props.size ? map[props.size] : undefined
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
