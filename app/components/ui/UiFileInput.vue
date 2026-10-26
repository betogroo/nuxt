<script setup lang="ts">
  import { computed, useAttrs } from 'vue'
  import { iconMap, type IconName } from './icons'
  import type { UiVariant, UiSize, UiRounded } from '~/types/ui'

  defineOptions({ inheritAttrs: false })

  const props = withDefaults(
    defineProps<{
      modelValue?: File | File[] | null
      label?: string
      placeholder?: string
      accept?: string
      hint?: string
      variant?: UiVariant
      size?: UiSize
      rounded?: UiRounded
      hideDetails?: boolean | 'auto'
      showSize?: boolean | 1000 | 1024
      clearable?: boolean
    }>(),
    {
      modelValue: null,
      hideDetails: 'auto',
      clearable: true,
      showSize: true,
    },
  )

  const emit = defineEmits(['update:modelValue', 'change'])

  const attrs = useAttrs()

  const isDetailsHidden = computed(() => {
    return (
      props.hideDetails === true ||
      (attrs['hide-details'] !== undefined && attrs['hide-details'] !== false)
    )
  })

  const vuetifyVariant = computed(() => {
    const map: Record<UiVariant, string> = {
      solid: 'solo',
      outline: 'outlined',
      ghost: 'plain',
      soft: 'filled',
    }
    return props.variant ? map[props.variant] : 'outlined'
  })

  const vuetifyDensity = computed(() => {
    if (props.size === 'sm' || props.size === 'xs') return 'compact'
    if (props.size === 'lg' || props.size === 'xl') return 'default'
    return 'comfortable'
  })

  const vuetifyRounded = computed(() => {
    const r = props.rounded || 'lg'
    return r === 'none' ? '0' : r
  })

  const mappedAttrs = computed(() => {
    const newAttrs: Record<string, unknown> = { ...attrs }
    const iconProps = ['prepend-inner-icon', 'append-inner-icon', 'prepend-icon', 'append-icon']

    for (const prop of iconProps) {
      if (typeof newAttrs[prop] === 'string' && newAttrs[prop] in iconMap) {
        newAttrs[prop] = iconMap[newAttrs[prop] as IconName]
      }
    }
    return newAttrs
  })

  const onUpdateModel = (val: File | File[] | null) => {
    emit('update:modelValue', val)
  }

  const onChange = (event: Event) => {
    emit('change', event)
  }
</script>

<template>
  <v-file-input
    :accept="accept"
    :class="{ 'mb-3': !isDetailsHidden }"
    :clearable="clearable"
    :density="vuetifyDensity"
    :hide-details="hideDetails"
    :hint="hint"
    :label="label"
    :model-value="modelValue"
    :persistent-hint="Boolean(hint)"
    :placeholder="placeholder"
    :rounded="vuetifyRounded"
    :show-size="showSize"
    v-bind="mappedAttrs"
    :variant="vuetifyVariant"
    @change="onChange"
    @update:model-value="onUpdateModel"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
  </v-file-input>
</template>
