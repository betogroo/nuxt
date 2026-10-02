<script setup lang="ts">
  defineOptions({ inheritAttrs: false })
</script>

<template>
  <v-progress-circular v-bind="$attrs">
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-progress-circular>
</template>
