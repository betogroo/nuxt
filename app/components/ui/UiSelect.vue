<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import { iconMap, type IconName } from './icons'
  import type { UiVariant, UiSize, UiRounded } from '~/types/ui'

  defineOptions({ inheritAttrs: false })

  const props = withDefaults(
    defineProps<{
      variant?: UiVariant
      size?: UiSize
      rounded?: UiRounded
      modelValue: unknown
      items: Array<unknown>
      label?: string
      itemTitle?: unknown
      itemValue?: unknown
      placeholder?: string
      clearable?: boolean
      hideDetails?: boolean | 'auto'
      required?: boolean
    }>(),
    {
      variant: undefined,
      size: undefined,
      rounded: undefined,
      label: undefined,
      itemTitle: undefined,
      itemValue: undefined,
      placeholder: undefined,
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
      flat: 'solo',
      elevated: 'solo',
      outline: 'outlined',
      outlined: 'outlined',
      ghost: 'plain',
      text: 'plain',
      plain: 'plain',
      soft: 'filled',
      tonal: 'filled',
    }
    return props.variant ? map[props.variant] || 'outlined' : 'outlined'
  })

  const vuetifyDensity = computed(() => {
    if (
      props.size === 'sm' ||
      props.size === 'small' ||
      props.size === 'xs' ||
      props.size === 'x-small'
    ) {
      return 'compact'
    }
    if (
      props.size === 'lg' ||
      props.size === 'large' ||
      props.size === 'xl' ||
      props.size === 'x-large'
    ) {
      return 'default'
    }
    return 'comfortable'
  })

  const vuetifyRounded = computed(() => {
    const r = props.rounded || 'lg'
    return r === 'none' ? '0' : r
  })

  const mappedAttrs = computed(() => {
    const newAttrs: Record<string, unknown> = { ...attrs }
    const iconProps = [
      'prepend-inner-icon',
      'prependInnerIcon',
      'append-inner-icon',
      'appendInnerIcon',
      'prepend-icon',
      'prependIcon',
      'append-icon',
      'appendIcon',
    ]

    for (const prop of iconProps) {
      if (typeof newAttrs[prop] === 'string' && newAttrs[prop] in iconMap) {
        newAttrs[prop] = iconMap[newAttrs[prop] as IconName]
      }
    }
    return newAttrs
  })

  const resolveItemProps = (item: unknown) => {
    if (typeof attrs['item-props'] === 'function') {
      return (attrs['item-props'] as (it: unknown) => Record<string, unknown>)(item)
    }
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>
      const nestedProps =
        obj.props && typeof obj.props === 'object' ? (obj.props as Record<string, unknown>) : {}
      if ('disabled' in obj || 'disabled' in nestedProps) {
        return {
          ...nestedProps,
          disabled: Boolean(obj.disabled ?? nestedProps.disabled),
        }
      }
      if (obj.props && typeof obj.props === 'object') {
        return nestedProps
      }
    }
    return {}
  }
</script>

<template>
  <v-select
    :class="{ 'mb-3': !isDetailsHidden }"
    :clearable="clearable"
    :density="vuetifyDensity"
    :hide-details="hideDetails"
    :item-props="resolveItemProps"
    :item-title="itemTitle"
    :item-value="itemValue"
    :items="items"
    :label="label"
    :model-value="modelValue"
    :placeholder="placeholder"
    :required="required"
    :rounded="vuetifyRounded"
    :variant="vuetifyVariant"
    v-bind="mappedAttrs"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
