<script setup lang="ts">
  import { padAndFormatRg } from '~/utils/formatters'

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
      label: 'RG',
      placeholder: '00000000-0',
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
      emit('update:modelValue', padAndFormatRg(val, false))
    }
  }

  const onBlur = () => {
    if (props.modelValue) {
      emit('update:modelValue', padAndFormatRg(props.modelValue, true))
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
