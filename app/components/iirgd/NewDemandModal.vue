<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { useZodForm } from '~/composables/useZodForm'
  import { useIirgdDemands } from '~/composables/useIirgdDemands'
  import { useIirgdCitizens } from '~/composables/useIirgdCitizens'
  import { useIirgdDocumentTypes } from '~/composables/useIirgdDocumentTypes'
  import { iirgdDemandFormSchema, type IirgdDemandFormInput } from '~/schemas/forms/iirgd-demand'
  import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'
  import { padAndFormatRg, formatCpf, isValidRgSP } from '~/utils/formatters'

  const props = defineProps<{
    modelValue: boolean
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'created'): void
  }>()

  const isOpen = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val),
  })

  const { createDemand } = useIirgdDemands()
  const { fetchCitizenByDocument } = useIirgdCitizens()
  const { fetchAllActiveDocumentTypes, createPendingDocumentType } = useIirgdDocumentTypes()
  const toast = useToast()

  const isSaving = ref(false)
  const errorMessage = ref('')
  const existingCitizen = ref<Record<string, unknown> | null>(null)

  const emptyDemandForm = (): Partial<IirgdDemandFormInput> => ({
    rg: '',
    cpf: '',
    name: '',
    document_type_id: '',
    observation: '',
  })

  const { errors, values, defineField, setFieldValue, validateField, handleSubmit, resetForm } =
    useZodForm(iirgdDemandFormSchema, emptyDemandForm())

  const [stationCode] = defineField('station_code')
  const [documentTypeId] = defineField('document_type_id')
  const [rg] = defineField('rg', { validateOnModelUpdate: false })
  const [cpf] = defineField('cpf', { validateOnModelUpdate: false })
  const [name] = defineField('name')
  const [observation] = defineField('observation')

  const { data: documentTypes } = useAsyncData('active-document-types', fetchAllActiveDocumentTypes, {
    default: () => [],
  })

  // Ao abrir o modal, reseta os dados
  watch(isOpen, (newVal) => {
    if (newVal) {
      resetForm({ values: emptyDemandForm() })
      errorMessage.value = ''
      existingCitizen.value = null
      isSaving.value = false
    }
  })

  const onRgBlur = async () => {
    const formattedRg = values.rg || ''

    if (!formattedRg && !values.cpf) {
      existingCitizen.value = null
      return
    }

    if (!formattedRg) return

    const { valid } = await validateField('rg')
    if (!valid || !isValidRgSP(formattedRg)) return

    const citizen = await fetchCitizenByDocument('rg', formattedRg)
    if (citizen) {
      existingCitizen.value = citizen
      setFieldValue('name', citizen.name)
      if (citizen.cpf && !values.cpf) {
        setFieldValue('cpf', citizen.cpf)
      }
    }
  }

  const closeModal = () => {
    isOpen.value = false
  }

  const isUUID = (str: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str)

  const saveDemand = handleSubmit(async (formValues) => {
    try {
      errorMessage.value = ''
      isSaving.value = true
      
      let finalDocTypeId = formValues.document_type_id
      if (finalDocTypeId && !isUUID(finalDocTypeId)) {
        const newType = await createPendingDocumentType(finalDocTypeId)
        finalDocTypeId = newType.id
      }

      await createDemand({
        ...formValues,
        document_type_id: finalDocTypeId,
        rg: formValues.rg ? padAndFormatRg(formValues.rg, true) : formValues.rg,
        cpf: formValues.cpf ? formatCpf(formValues.cpf) : formValues.cpf,
      })

      closeModal()
      toast.success('Demanda criada com sucesso!')
      emit('created')
    } catch (e: unknown) {
      errorMessage.value = e instanceof Error ? e.message : 'Ocorreu um erro ao salvar.'
    } finally {
      isSaving.value = false
    }
  })
</script>

<template>
  <UiModal v-model="isOpen" max-width="600px" title="Nova Demanda IIRGD">
    <UiAlert v-if="errorMessage" class="mb-4" size="sm" type="error" variant="soft">
      {{ errorMessage }}
    </UiAlert>

    <UiRow dense>
      <UiCol cols="12">
        <UiSelect
          v-model="stationCode"
          :error-messages="errors.station_code"
          :items="[...IIRGD_STATION_CODES]"
          label="Código do Posto *"
          placeholder="Selecione"
        />
      </UiCol>
      <UiCol cols="12">
        <UiCombobox
          v-model="documentTypeId"
          :error-messages="errors.document_type_id"
          :items="documentTypes"
          item-title="name"
          item-value="id"
          label="Tipo do Documento *"
          placeholder="Selecione ou digite um novo tipo..."
        />
      </UiCol>
      <UiCol cols="12" sm="6">
        <UiRgInput
          v-model="rg"
          :disabled="!!existingCitizen?.rg"
          :error-messages="errors.rg"
          label="Número do RG *"
          @blur="onRgBlur"
        />
      </UiCol>
      <UiCol cols="12" sm="6">
        <UiCpfInput
          v-model="cpf"
          :disabled="!!existingCitizen?.cpf"
          :error-messages="errors.cpf"
          label="CPF (Opcional)"
        />
      </UiCol>
      <UiCol cols="12">
        <UiInput
          v-model="name"
          :disabled="!!existingCitizen"
          :error-messages="errors.name"
          label="Nome do Cidadão *"
        />
      </UiCol>
      <UiCol cols="12">
        <UiTextarea
          v-model="observation"
          :error-messages="errors.observation"
          label="Observação"
          rounded="lg"
          rows="3"
          size="md"
          variant="outline"
        />
      </UiCol>
    </UiRow>

    <template #actions>
      <UiButton variant="ghost" @click="closeModal">Cancelar</UiButton>
      <UiButton color="primary" :loading="isSaving" variant="solid" @click="saveDemand">
        Salvar
      </UiButton>
    </template>
  </UiModal>
</template>
