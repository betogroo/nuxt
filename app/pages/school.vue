<script setup lang="ts">
  definePageMeta({
    middleware: [
      () => {
        return navigateTo('/schools', { replace: true })
      },
    ],
  })
</script>

<template>
  <div />
</template>
