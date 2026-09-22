<script setup lang="ts">
  defineProps<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelValue: any
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
    :type="type || 'text'"
    variant="outlined"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
