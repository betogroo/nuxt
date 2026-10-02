<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import { iconMap, type IconName } from './icons'

  defineOptions({ inheritAttrs: false })

  defineProps<{
    title?: string
    subtitle?: string
    value?: unknown
    to?: string | object
    active?: boolean
    color?: string
    rounded?: string
  }>()

  const attrs = useAttrs()

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
  <v-list-item
    :active="active"
    :color="color"
    :rounded="rounded"
    :subtitle="subtitle"
    :title="title"
    :to="to"
    :value="value"
    v-bind="mappedAttrs"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-list-item>
</template>
