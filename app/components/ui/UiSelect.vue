<script setup lang="ts">
  defineProps<{
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
</script>

<template>
  <v-select
    class="mb-3"
    :clearable="clearable"
    density="comfortable"
    :hide-details="hideDetails"
    :item-title="itemTitle"
    :item-value="itemValue"
    :items="items"
    :label="label"
    :model-value="modelValue"
    :placeholder="placeholder"
    :required="required"
    rounded="lg"
    variant="outlined"
    v-bind="$attrs"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
