<script setup lang="ts">
  import { computed } from 'vue'

  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    label?: string
    hint?: string
    persistentHint?: boolean
    color?: string
    hideDetails?: boolean | 'auto'
    size?: string
    density?: 'compact' | 'comfortable' | 'default'
    disabled?: boolean
    readonly?: boolean
    errorMessages?: string | string[]
  }>()

  const modelValue = defineModel<boolean | null>({ default: false })

  const vuetifyDensity = computed(() => {
    if (props.density) return props.density
    const size = props.size
    if (size === 'sm' || size === 'xs') return 'compact'
    if (size === 'lg' || size === 'xl') return 'default'
    return 'comfortable'
  })
</script>

<template>
  <v-checkbox
    v-model="modelValue"
    :color="color || 'primary'"
    :density="vuetifyDensity"
    :disabled="disabled"
    :error-messages="errorMessages"
    :hide-details="hideDetails"
    :hint="hint"
    :label="label"
    :persistent-hint="persistentHint"
    :readonly="readonly"
    v-bind="$attrs"
  >
    <template v-for="(_, slot) in $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope || {}" />
    </template>
  </v-checkbox>
</template>
