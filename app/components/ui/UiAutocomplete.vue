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
    customFilter?: unknown
  }>()

  defineEmits(['update:modelValue'])
</script>

<template>
  <v-autocomplete
    class="mb-3"
    :clearable="clearable"
    :custom-filter="customFilter"
    density="comfortable"
    :hide-details="hideDetails"
    :item-title="itemTitle"
    :item-value="itemValue"
    :items="items"
    :label="label"
    :model-value="modelValue"
    :placeholder="placeholder"
    variant="outlined"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps || {}" />
    </template>
  </v-autocomplete>
</template>
