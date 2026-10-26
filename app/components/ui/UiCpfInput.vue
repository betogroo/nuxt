<script setup lang="ts">
  import { formatCpf } from '~/utils/formatters'

  const props = withDefaults(
    defineProps<{
      modelValue?: string | null
      label?: string
      placeholder?: string
      disabled?: boolean
      errorMessages?: string | string[]
    }>(),
    {
      modelValue: '',
      label: 'CPF',
      placeholder: '000.000.000-00',
      disabled: false,
      errorMessages: '',
    },
  )

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    blur: []
  }>()

  const onInput = (val: string | null) => {
    if (val !== null) {
      emit('update:modelValue', formatCpf(val))
    }
  }

  const onBlur = () => {
    if (props.modelValue) {
      emit('update:modelValue', formatCpf(props.modelValue))
    }
    emit('blur')
  }
</script>

<template>
  <UiInput
    :disabled="disabled"
    :error-messages="errorMessages"
    :label="label"
    :model-value="modelValue"
    :placeholder="placeholder"
    v-bind="$attrs"
    @blur="onBlur"
    @update:model-value="onInput"
  />
</template>
