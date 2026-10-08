<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import type { UiVariant } from '~/types/ui'

  defineOptions({ inheritAttrs: false })
  
  const attrs = useAttrs()
  
  const vuetifyVariant = computed(() => {
    const variant = attrs.variant as string | undefined
    if (variant === 'soft') return 'tonal'
    if (variant === 'solid') return 'flat'
    if (variant === 'outline') return 'outlined'
    if (variant === 'ghost') return 'text'
    return variant
  })
</script>

<template>
  <v-avatar v-bind="$attrs" :variant="vuetifyVariant">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-avatar>
</template>
