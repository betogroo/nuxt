<script setup lang="ts" generic="T">
  const props = defineProps<{
    variant?: UiVariant
    size?: UiSize
    rounded?: UiRounded
    label?: string
    items?: unknown[]
    itemTitle?: unknown
    itemValue?: unknown
    hint?: string
    persistentHint?: boolean
    multiple?: boolean
    returnObject?: boolean
    clearable?: boolean
    required?: boolean
    errorMessages?: string | string[]
    hideDetails?: boolean
    loading?: boolean
    density?: 'comfortable' | 'compact' | 'default' | null
    variant?:
      'outlined' | 'filled' | 'plain' | 'underlined' | 'solo' | 'solo-inverted' | 'solo-filled'
  }>()

  const modelValue = defineModel<unknown>({ default: undefined })
  const search = defineModel<string>('search', { default: '' })

  const vuetifyVariant = computed(() => {
    const map: Record<UiVariant, string> = { solid: 'solo', outline: 'outlined', ghost: 'plain', soft: 'filled' }
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
</script>

<template>
  <v-combobox
    v-model="modelValue"
    v-model:search="search"
    :clearable="clearable"
    color="primary"
    :density="density || 'comfortable'"
    :error-messages="errorMessages"
    :hide-details="hideDetails"
    :hint="hint"
    :item-title="itemTitle"
    :item-value="itemValue"
    :items="items"
    :label="label"
    :loading="loading"
    :multiple="multiple"
    :persistent-hint="persistentHint"
    :return-object="returnObject"
    :variant="variant || 'outlined'"
    v-bind="$attrs"
  >
    <template v-for="(_, slot) in $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope || {}" />
    </template>
  </v-combobox>
</template>
