<script setup lang="ts">
  defineProps<{
    title?: string
    maxWidth?: string | number
    persistent?: boolean
    transparentHeader?: boolean
    scrollable?: boolean
  }>()

  const modelValue = defineModel<boolean>()
</script>

<template>
  <v-dialog
    v-model="modelValue"
    :max-width="maxWidth || '520px'"
    :persistent="persistent"
    :scrollable="scrollable ?? true"
    transition="dialog-bottom-transition"
  >
    <UiCard :title="title" :transparent-header="transparentHeader">
      <template v-if="$slots.header || title || transparentHeader" #header>
        <template v-if="$slots.header">
          <slot name="header" />
        </template>
        <template v-else>
          <span :class="transparentHeader ? 'text-high-emphasis font-weight-semibold' : ''">{{
            title
          }}</span>
        </template>
        <v-spacer />
        <v-btn density="compact" icon="close" variant="text" @click="modelValue = false" />
      </template>

      <slot />

      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiCard>
  </v-dialog>
</template>
