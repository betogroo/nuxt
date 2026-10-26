<script setup lang="ts">
  defineProps<{
    disabled?: boolean
    loading?: boolean
    length?: number
  }>()

  defineEmits<{
    (e: 'finish', value: string): void
  }>()

  const modelValue = defineModel<string>()
</script>

<template>
  <v-otp-input
    v-model="modelValue"
    :disabled="disabled"
    :length="length || 6"
    :loading="loading"
    @finish="$emit('finish', $event)"
  />
</template>
