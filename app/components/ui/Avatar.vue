<script setup lang="ts">
  import { computed } from 'vue'

  defineOptions({ inheritAttrs: false })
  const props = defineProps<{ variant?: string; size?: string }>()

  const vuetifyVariant = computed(() => {
    const variant = props.variant
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
