<script setup lang="ts">
  import { useAttrs } from 'vue'

  defineOptions({ inheritAttrs: false })

  defineProps<{
    value?: unknown
    subgroup?: boolean
  }>()

  const attrs = useAttrs()
</script>

<template>
  <v-list-group :subgroup="subgroup" :value="value" v-bind="attrs">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-list-group>
</template>
