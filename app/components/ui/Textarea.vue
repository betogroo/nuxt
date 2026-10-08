<script setup lang="ts">
  import { computed } from 'vue'
  import type { UiVariant, UiSize, UiRounded } from '~/types/ui'
  defineOptions({ inheritAttrs: false })

  const vuetifyVariant = computed(() => {
    const map: Record<UiVariant, string> = { solid: 'solo', outline: 'outlined', ghost: 'plain', soft: 'filled' }
    return props.variant ? map[props.variant] : 'outlined'
  })

  const vuetifyDensity = computed(() => {
    if (props.size === 'sm' || props.size === 'xs') return 'compact'
    if (props.size === 'lg' || props.size === 'xl') return 'default'
    return 'comfortable'
  })

  const vuetifyRounded = computed(() => {
    const r = props.rounded || 'lg'
    return r === 'none' ? '0' : r
  })
</script>

<template>
  <v-textarea v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-textarea>
</template>
