<script setup lang="ts">
  defineProps<{
    title?: string
    maxWidth?: string | number
    persistent?: boolean
    transparentHeader?: boolean
  }>()

  const modelValue = defineModel<boolean>()
</script>

<template>
  <v-dialog v-model="modelValue" :max-width="maxWidth || '500px'" :persistent="persistent">
    <UiCard :title="title" :transparent-header="transparentHeader">
      <template v-if="$slots.header" #header>
        <slot name="header" />
      </template>

      <slot />

      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiCard>
  </v-dialog>
</template>
