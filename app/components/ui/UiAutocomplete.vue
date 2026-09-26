<script setup lang="ts">
  defineProps<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelValue: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: Array<any>
    label?: string
    itemTitle?: string
    itemValue?: string
    placeholder?: string
    clearable?: boolean
    hideDetails?: boolean
    customFilter?: any
  }>()

  defineEmits(['update:modelValue'])
</script>

<template>
  <v-autocomplete
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
    :custom-filter="customFilter"
    variant="outlined"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps || {}" />
    </template>
  </v-autocomplete>
</template>
