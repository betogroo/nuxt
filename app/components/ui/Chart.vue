<script setup lang="ts">
  // Wrapper for VueApexCharts
  defineOptions({ inheritAttrs: false })
</script>

<template>
  <ClientOnly>
    <apexchart v-bind="$attrs" />
    <template #fallback>
      <div class="d-flex justify-center align-center h-100 w-100">
        <UiProgressCircular color="primary" indeterminate />
      </div>
    </template>
  </ClientOnly>
</template>
