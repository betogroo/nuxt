<script setup lang="ts" generic="T">
  defineProps<{
    label?: string
    items?: T[]
    itemTitle?: string | ((item: T) => string)
    itemValue?: string | ((item: T) => unknown)
    hint?: string
    persistentHint?: boolean
    multiple?: boolean
    returnObject?: boolean
    clearable?: boolean
    required?: boolean
    errorMessages?: string | string[]
    hideDetails?: boolean
  }>()

  const modelValue = defineModel<T | T[]>()
</script>

<template>
  <v-combobox
    v-model="modelValue"
    :clearable="clearable"
    color="primary"
    density="comfortable"
    :error-messages="errorMessages"
    :hide-details="hideDetails"
    :hint="hint"
    :item-title="itemTitle"
    :item-value="itemValue"
    :items="items"
    :label="label"
    :multiple="multiple"
    :persistent-hint="persistentHint"
    :return-object="returnObject"
    variant="outlined"
  >
    <template v-for="(_, slot) in $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope || {}" />
    </template>
  </v-combobox>
</template>
