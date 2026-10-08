<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  defineOptions({ inheritAttrs: false })
  
  const attrs = useAttrs()
  
  const vuetifyDensity = computed(() => {
    const size = attrs.size as string | undefined
    if (size === 'sm' || size === 'xs') return 'compact'
    if (size === 'lg' || size === 'xl') return 'default'
    return 'comfortable'
  })
</script>

<template>
  <v-pagination v-bind="$attrs" :density="vuetifyDensity">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-pagination>
</template>
