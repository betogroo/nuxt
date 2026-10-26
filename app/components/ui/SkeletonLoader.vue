<script setup lang="ts">
  defineOptions({ inheritAttrs: false })
</script>

<template>
  <v-skeleton-loader v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-skeleton-loader>
</template>
