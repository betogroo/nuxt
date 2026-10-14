<script setup lang="ts">
  import { computed } from 'vue'
  import type { UiVariant, UiSize, UiRounded } from '~/types/ui'

  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    variant?: UiVariant
    size?: UiSize
    rounded?: UiRounded
    rows?: number | string
  }>()

  type VTextareaVariant = 'solo' | 'outlined' | 'plain' | 'filled'
  type VTextareaDensity = 'compact' | 'default' | 'comfortable'

  const vuetifyVariant = computed<VTextareaVariant>(() => {
    const map: Record<UiVariant, VTextareaVariant> = {
      solid: 'solo',
      outline: 'outlined',
      ghost: 'plain',
      soft: 'filled',
    }
    return props.variant ? map[props.variant] : 'outlined'
  })

  const vuetifyDensity = computed<VTextareaDensity>(() => {
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
  <v-textarea
    v-bind="$attrs"
    :density="vuetifyDensity"
    :rounded="vuetifyRounded"
    :rows="props.rows || 3"
    :variant="vuetifyVariant"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-textarea>
</template>
