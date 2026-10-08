<script setup lang="ts">
  import { computed, useAttrs } from 'vue'

  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    label?: string
    hint?: string
    persistentHint?: boolean
    color?: string
    hideDetails?: boolean
  }>()

  const modelValue = defineModel<boolean | null>()
  
  const attrs = useAttrs()
  
  const vuetifyDensity = computed(() => {
    const size = attrs.size as string | undefined
    if (size === 'sm' || size === 'xs') return 'compact'
    if (size === 'lg' || size === 'xl') return 'default'
    return 'comfortable'
  })
</script>

<template>
  <v-switch
    v-model="modelValue"
    :color="color || 'success'"
    :hide-details="hideDetails"
    :hint="hint"
    :label="label"
    :persistent-hint="persistentHint"
    :density="vuetifyDensity"
    v-bind="$attrs"
  >
    <template v-for="(_, slot) in $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope || {}" />
    </template>
  </v-switch>
</template>
