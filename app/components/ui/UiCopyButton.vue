<script setup lang="ts">
  import type { UiColor, UiSize, UiVariant } from '~/types/ui'
  import { useCopyToClipboard } from '~/composables/useCopyToClipboard'

  defineOptions({ inheritAttrs: false })

  const props = withDefaults(
    defineProps<{
      value?: string | number | null
      text?: string | number | null
      tooltip?: string
      successMessage?: string
      cleanDigitsOnly?: boolean
      icon?: string
      size?: UiSize
      color?: UiColor
      variant?: UiVariant
      disabled?: boolean
    }>(),
    {
      value: undefined,
      text: undefined,
      tooltip: 'Copiar',
      successMessage: 'Copiado para a área de transferência!',
      cleanDigitsOnly: false,
      icon: 'copy',
      size: 'xs',
      color: 'secondary',
      variant: 'ghost',
      disabled: false,
    },
  )

  const emit = defineEmits<{
    copied: [text: string]
  }>()

  const { copy } = useCopyToClipboard()

  const handleCopy = async (e?: Event) => {
    e?.stopPropagation()
    const target = props.value ?? props.text
    if (target == null || target === '') return
    const raw = String(target)
    const textToCopy = props.cleanDigitsOnly ? raw.replace(/\D/g, '') : raw
    const success = await copy(textToCopy, props.successMessage)
    if (success) {
      emit('copied', textToCopy)
    }
  }
</script>

<template>
  <UiTooltip v-if="tooltip" :text="tooltip">
    <template #activator="{ props: tooltipProps }">
      <UiButton
        v-bind="{ ...tooltipProps, ...$attrs }"
        :color="color"
        :disabled="disabled || (value == null && text == null)"
        :icon="icon"
        :size="size"
        :variant="variant"
        @click.stop="handleCopy"
      />
    </template>
  </UiTooltip>
  <UiButton
    v-else
    v-bind="$attrs"
    :color="color"
    :disabled="disabled || (value == null && text == null)"
    :icon="icon"
    :size="size"
    :variant="variant"
    @click.stop="handleCopy"
  />
</template>
