<script setup lang="ts">
  defineOptions({ inheritAttrs: false })
</script>

<template>
  <v-radio-group v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-radio-group>
</template>
