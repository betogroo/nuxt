<script setup lang="ts">
  import UiInput from './UiInput.vue'

  defineOptions({ inheritAttrs: false })
</script>

<template>
  <UiInput v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </UiInput>
</template>
