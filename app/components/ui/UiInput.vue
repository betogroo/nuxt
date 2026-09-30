<script setup lang="ts">
  defineProps<{
    modelValue: string | number | null | undefined
    label: string
    type?: string
    placeholder?: string
    hint?: string
  }>()

  defineEmits(['update:modelValue'])
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
    v-bind="$attrs"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
