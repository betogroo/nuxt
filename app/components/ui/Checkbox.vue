<script setup lang="ts">
  import UiCheckbox from './UiCheckbox.vue'

  defineOptions({ inheritAttrs: false })
</script>

<template>
  <UiCheckbox v-bind="$attrs">
    <template v-for="(_, slot) in $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope || {}" />
    </template>
  </UiCheckbox>
</template>
