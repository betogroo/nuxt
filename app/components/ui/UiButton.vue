<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import { iconMap, type IconName } from './icons'

  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    color?: string
    variant?: 'elevated' | 'flat' | 'text' | 'outlined' | 'tonal' | 'plain'
    icon?: IconName | string | boolean
    rounded?: string
  }>()

  const attrs = useAttrs()

  const mappedIcon = computed(() => {
    if (typeof props.icon === 'string' && props.icon in iconMap) {
      return iconMap[props.icon as IconName]
    }
    return props.icon
  })

  const mappedAttrs = computed(() => {
    const newAttrs: Record<string, unknown> = { ...attrs }
    const iconProps = ['prepend-icon', 'append-icon']

    for (const prop of iconProps) {
      if (typeof newAttrs[prop] === 'string' && newAttrs[prop] in iconMap) {
        newAttrs[prop] = iconMap[newAttrs[prop] as IconName]
      }
    }
    return newAttrs
  })
</script>

<template>
  <v-btn
    :color="color || 'primary'"
    :icon="mappedIcon"
    :rounded="rounded ?? (icon ? 'lg' : 'lg')"
    :variant="variant || (icon ? 'text' : 'tonal')"
    v-bind="mappedAttrs"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-btn>
</template>
