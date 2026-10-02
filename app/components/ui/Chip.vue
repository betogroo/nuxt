<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import { iconMap, type IconName } from './icons'

  defineOptions({ inheritAttrs: false })

  defineProps<{
    color?: string
    size?: 'x-small' | 'small' | 'default' | 'large' | 'x-large'
    variant?: 'flat' | 'elevated' | 'tonal' | 'outlined' | 'text' | 'plain'
    closable?: boolean
    disabled?: boolean
  }>()

  defineEmits<{ (e: 'click:close' | 'click'): void }>()

  const attrs = useAttrs()

  const mappedAttrs = computed(() => {
    const newAttrs: Record<string, unknown> = { ...attrs }
    const iconProps = ['prepend-icon', 'append-icon', 'close-icon']

    for (const prop of iconProps) {
      if (typeof newAttrs[prop] === 'string' && newAttrs[prop] in iconMap) {
        newAttrs[prop] = iconMap[newAttrs[prop] as IconName]
      }
    }
    return newAttrs
  })
</script>

<template>
  <v-chip
    :closable="closable"
    :color="color"
    :disabled="disabled"
    :size="size"
    :variant="variant"
    v-bind="mappedAttrs"
    @click="$emit('click')"
    @click:close="$emit('click:close')"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-chip>
</template>
