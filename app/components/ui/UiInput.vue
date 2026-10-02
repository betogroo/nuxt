<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import { iconMap, type IconName } from './icons'

  defineOptions({ inheritAttrs: false })

  defineProps<{
    modelValue: string | number | null | undefined
    label: string
    type?: string
    placeholder?: string
    hint?: string
  }>()

  defineEmits(['update:modelValue'])

  const attrs = useAttrs()

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
    class="mb-3"
    density="comfortable"
    :hint="hint"
    :label="label"
    :model-value="modelValue"
    :persistent-hint="!!hint"
    :placeholder="placeholder"
    rounded="lg"
    :type="type || 'text'"
    variant="outlined"
    v-bind="mappedAttrs"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
