<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import { iconMap, type IconName } from './icons'
  import type { UiVariant, UiSize, UiRounded } from '~/types/ui'

  defineOptions({ inheritAttrs: false })

  const props = withDefaults(
    defineProps<{
      modelValue: string | number | null | undefined
      label?: string
      type?: string
      placeholder?: string
      hint?: string
      variant?: UiVariant
      size?: UiSize
      rounded?: UiRounded
      hideDetails?: boolean | 'auto'
    }>(),
    {
      hideDetails: 'auto',
    },
  )

  defineEmits(['update:modelValue'])

  const attrs = useAttrs()

  const isDetailsHidden = computed(() => {
    return (
      props.hideDetails === true ||
      (attrs['hide-details'] !== undefined && attrs['hide-details'] !== false)
    )
  })

  const vuetifyVariant = computed(() => {
    const map: Record<UiVariant, string> = {
      solid: 'solo',
      outline: 'outlined',
      ghost: 'plain',
      soft: 'filled',
    }
    return props.variant ? map[props.variant] : 'outlined'
  })

  const vuetifyDensity = computed(() => {
    if (props.size === 'sm' || props.size === 'xs') return 'compact'
    if (props.size === 'lg' || props.size === 'xl') return 'default'
    return 'comfortable'
  })

  const vuetifyRounded = computed(() => {
    const r = props.rounded || 'lg'
    return r === 'none' ? '0' : r
  })

  const mappedAttrs = computed(() => {
    const newAttrs: Record<string, unknown> = { ...attrs }
    const iconProps = ['prepend-inner-icon', 'append-inner-icon', 'prepend-icon', 'append-icon']

    for (const prop of iconProps) {
      if (typeof newAttrs[prop] === 'string' && newAttrs[prop] in iconMap) {
        newAttrs[prop] = iconMap[newAttrs[prop] as IconName]
      }
    }
    return newAttrs
  })
</script>

<template>
  <v-text-field
    :class="{ 'mb-3': !isDetailsHidden }"
    :density="vuetifyDensity"
    :hide-details="hideDetails"
    :hint="hint"
    :label="label"
    :model-value="modelValue"
    :persistent-hint="!!hint"
    :placeholder="placeholder"
    :rounded="vuetifyRounded"
    :type="type || 'text'"
    :variant="vuetifyVariant"
    v-bind="mappedAttrs"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
