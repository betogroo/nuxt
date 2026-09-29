<template>
  <UiCombobox
    v-model="internalValue"
    :items="computedUnits"
    item-title="displayName"
    item-value="name"
    :return-object="false"
    :label="label"
    :hint="hint"
    :persistent-hint="persistentHint"
    :density="density"
    :variant="variant"
    :clearable="clearable"
    :loading="pending"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMeasurementUnits } from '~/composables/useMeasurementUnits'
import { useAsyncData } from '#imports'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Apresentação (Unidade de Medida)' },
  hint: { type: String, default: 'Selecione ou digite uma nova embalagem se não existir.' },
  persistentHint: { type: Boolean, default: true },
  density: { type: String, default: 'comfortable' },
  variant: { type: String, default: 'outlined' },
  clearable: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue'])

const internalValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const { fetchUnits } = useMeasurementUnits()

const { data: units, pending } = useAsyncData('all-measurement-units', async () => {
  return await fetchUnits()
})

const computedUnits = computed(() => {
  return (units.value || []).map((u: any) => ({
    ...u,
    displayName: u?.legacy_alias ? `${u.name} (Legado: ${u.legacy_alias})` : u?.name
  }))
})
</script>
