<script setup lang="ts">
  defineProps<{
    label?: string
    hint?: string
    persistentHint?: boolean
    color?: string
    hideDetails?: boolean
  }>()

  const modelValue = defineModel<boolean | null>()
</script>

<template>
  <v-switch
    v-model="modelValue"
    :color="color || 'success'"
    :hide-details="hideDetails"
    :hint="hint"
    :label="label"
    :persistent-hint="persistentHint"
  >
    <template v-for="(_, slot) in $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope || {}" />
    </template>
  </v-switch>
</template>
