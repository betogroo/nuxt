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
    customFilter?: unknown
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
  <v-autocomplete
    class="mb-3"
    :clearable="clearable"
    :custom-filter="customFilter"
    :density="vuetifyDensity"
    :hide-details="hideDetails"
    :item-title="itemTitle"
    :item-value="itemValue"
    :items="items"
    :label="label"
    :model-value="modelValue"
    :placeholder="placeholder"
    :variant="vuetifyVariant"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps || {}" />
    </template>
  </v-autocomplete>
</template>
