<script setup lang="ts">
  import { computed } from 'vue'
  import type { UiVariant, UiSize, UiRounded } from '~/types/ui'
  const props = defineProps<{
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
    hideDetails?: boolean
    required?: boolean
  }>()

  defineEmits(['update:modelValue'])

  const vuetifyVariant = computed(() => {
    const map: Record<UiVariant, string> = { solid: 'solo', outline: 'outlined', ghost: 'plain', soft: 'filled' }
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
</script>

<template>
  <v-select
    class="mb-3"
    :clearable="clearable"
    :density="vuetifyDensity"
    :hide-details="hideDetails"
    :item-title="itemTitle"
    :item-value="itemValue"
    :items="items"
    :label="label"
    :model-value="modelValue"
    :placeholder="placeholder"
    :required="required"
    :rounded="vuetifyRounded"
    :variant="vuetifyVariant"
    v-bind="$attrs"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
