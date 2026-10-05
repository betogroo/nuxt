<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useMeasurementUnits } from '~/composables/useMeasurementUnits'
  import { useAsyncData } from '#imports'

  export interface MeasurementUnitItem {
    id?: string
    name: string
    legacy_alias?: string | null
    displayName?: string
  }

  const props = withDefaults(
    defineProps<{
      modelValue?: string | null
      items?: MeasurementUnitItem[] | null
      label?: string
      hint?: string
      persistentHint?: boolean
      density?: 'comfortable' | 'compact' | 'default' | null
      variant?:
        'outlined' | 'filled' | 'plain' | 'underlined' | 'solo' | 'solo-inverted' | 'solo-filled'
      clearable?: boolean
    }>(),
    {
      modelValue: '',
      items: null,
      label: 'Apresentação (Unidade de Medida)',
      hint: 'Selecione ou digite uma nova embalagem se não existir.',
      persistentHint: true,
      density: 'comfortable',
      variant: 'outlined',
      clearable: true,
    },
  )

  const emit = defineEmits<{
    (e: 'update:modelValue', val: string): void
  }>()

  const searchText = ref('')

  const internalValue = computed<string>({
    get: () => props.modelValue || '',
    set: (val) => {
      emit('update:modelValue', val || '')
    },
  })

  // Sincroniza o texto de busca caso o modelValue seja alterado externamente
  watch(
    () => props.modelValue,
    (newVal) => {
      if (newVal && newVal !== searchText.value) {
        searchText.value = newVal
      }
    },
    { immediate: true },
  )

  const { fetchAllActiveUnits } = useMeasurementUnits()

  // Busca unidades globais apenas se props.items não for fornecido
  const { data: globalUnits, pending } = useAsyncData('all-active-measurement-units', async () => {
    if (props.items !== null && props.items !== undefined) {
      return []
    }
    return await fetchAllActiveUnits()
  })

  const computedUnits = computed<MeasurementUnitItem[]>(() => {
    const list =
      props.items !== null && props.items !== undefined ? props.items : globalUnits.value || []

    return list.map((u) => ({
      ...u,
      displayName: u.legacy_alias ? `${u.name} (Legado: ${u.legacy_alias})` : u.name,
    }))
  })

  const onBlur = () => {
    if (searchText.value && searchText.value.trim() !== '') {
      internalValue.value = searchText.value.trim()
    }
  }
</script>

<template>
  <UiCombobox
    v-model="internalValue"
    v-model:search="searchText"
    :clearable="clearable"
    :density="density"
    :hint="hint"
    item-title="displayName"
    item-value="name"
    :items="computedUnits"
    :label="label"
    :loading="pending"
    :persistent-hint="persistentHint"
    :return-object="false"
    :variant="variant"
    v-bind="$attrs"
    @blur="onBlur"
  />
</template>
