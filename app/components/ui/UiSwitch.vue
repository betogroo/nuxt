<script setup lang="ts">
  import { computed } from 'vue'

  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    label?: string
    hint?: string
    persistentHint?: boolean
    color?: string
    hideDetails?: boolean
    size?: string
  }>()

  const modelValue = defineModel<boolean | null>()

  const vuetifyDensity = computed(() => {
    const size = props.size
    if (size === 'sm' || size === 'xs') return 'compact'
    if (size === 'lg' || size === 'xl') return 'default'
    return 'comfortable'
  })
</script>

<template>
  <v-switch
    v-model="modelValue"
    :color="color || 'success'"
    :density="vuetifyDensity"
    :hide-details="hideDetails"
    :hint="hint"
    :label="label"
    :persistent-hint="persistentHint"
    v-bind="$attrs"
  >
    <template v-for="(_, slot) in $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope || {}" />
    </template>
  </v-switch>
</template>
