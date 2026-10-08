<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import type { UiVariant, UiColor, UiRounded } from '~/types/ui'

  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    title?: string
    elevation?: number | string
    loading?: boolean
    transparentHeader?: boolean
    variant?: UiVariant
    color?: UiColor
    rounded?: UiRounded
  }>()

  const attrs = useAttrs()

  const vuetifyVariant = computed(() => {
    const map: Record<UiVariant, string> = {
      solid: 'elevated',
      outline: 'outlined',
      ghost: 'text',
      soft: 'tonal'
    }
    return props.variant ? map[props.variant] : undefined
  })

  const vuetifyRounded = computed(() => {
    const r = props.rounded || 'xl'
    return r === 'none' ? '0' : r
  })
</script>

<template>
  <v-card
    class="ui-card"
    :elevation="vuetifyVariant === 'outlined' ? 0 : (elevation ?? 1)"
    :loading="loading"
    :rounded="vuetifyRounded"
    :variant="vuetifyVariant"
    :color="color"
    v-bind="attrs"
  >
    <!-- Header -->
    <v-card-title
      v-if="title || $slots.header"
      :class="[
        'd-flex align-center px-5 pt-5 pb-3 flex-wrap ga-2',
        transparentHeader ? 'text-high-emphasis' : 'text-primary font-weight-semibold',
      ]"
      style="white-space: normal"
    >
      <slot name="header">
        {{ title }}
      </slot>
    </v-card-title>

    <UiDivider v-if="(title || $slots.header) && !transparentHeader" />

    <!-- Body -->
    <v-card-text class="pa-5">
      <slot />
    </v-card-text>

    <!-- Footer/Actions -->
    <template v-if="$slots.actions">
      <UiDivider />
      <v-card-actions class="px-5 py-3 justify-end">
        <slot name="actions" />
      </v-card-actions>
    </template>
  </v-card>
</template>

<style scoped>
  .ui-card {
    border: 1px solid rgba(var(--v-border-color), 0.08);
  }
</style>
