<script setup lang="ts">
  import { ref, watch, computed } from 'vue'
  import { useZodForm } from '~/composables/useZodForm'
  import { useIirgdDemands } from '~/composables/useIirgdDemands'
  import { useIirgdCitizens } from '~/composables/useIirgdCitizens'
  import { useIirgdDocumentTypes } from '~/composables/useIirgdDocumentTypes'
  import {
    iirgdDemandFormSchema,
    isAntecedentesDocumentType,
    type IirgdDemandFormInput,
  } from '~/schemas/forms/iirgd-demand'
  import { IIRGD_STATION_CODES } from '~/constants/iirgd-stations'
  import {
    padAndFormatRg,
    formatCpf,
    isValidRgSP,
    isValidCpf,
    formatCitizenName,
  } from '~/utils/formatters'

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
  const isSavingAndContinuing = ref(false)
  const errorMessage = ref('')
  const existingCitizen = ref<Record<string, unknown> | null>(null)

  const STORAGE_STATION_KEY = 'iirgd_last_station_code'
  const STORAGE_DOC_TYPE_KEY = 'iirgd_last_document_type_id'

  const { data: documentTypes } = useAsyncData(
    'active-document-types',
    fetchAllActiveDocumentTypes,
    {
      default: () => [],
    },
  )

  const getLastStationCode = (): (typeof IIRGD_STATION_CODES)[number] | undefined => {
    if (!import.meta.client) return undefined
    const val = localStorage.getItem(STORAGE_STATION_KEY)
    return IIRGD_STATION_CODES.includes(val as (typeof IIRGD_STATION_CODES)[number])
      ? (val as (typeof IIRGD_STATION_CODES)[number])
      : undefined
  }

  const getLastDocumentTypeId = (): string => {
    if (!import.meta.client) return ''
    return localStorage.getItem(STORAGE_DOC_TYPE_KEY) || ''
  }

  const initialDemandForm = (): Partial<IirgdDemandFormInput> => {
    const lastDocType = getLastDocumentTypeId()
    const matched = documentTypes.value?.find(
      (dt) => dt.id === lastDocType || dt.name === lastDocType,
    )
    return {
      station_code: getLastStationCode(),
      document_type_id: lastDocType,
      document_type_name: matched?.name || lastDocType || '',
      rg: '',
      cpf: '',
      other_document: '',
      is_other_state: false,
      name: '',
      observation: '',
    }
  }

  const { errors, values, defineField, setFieldValue, validateField, handleSubmit, resetForm } =
    useZodForm(iirgdDemandFormSchema, initialDemandForm())

  const [stationCode] = defineField('station_code')
  const [documentTypeId] = defineField('document_type_id')
  const [isOtherState] = defineField('is_other_state')
  const [rg] = defineField('rg', { validateOnModelUpdate: false })
  const [otherDocument] = defineField('other_document', { validateOnModelUpdate: false })
  const [cpf] = defineField('cpf', { validateOnModelUpdate: false })
  const [name] = defineField('name')
  const [observation] = defineField('observation')

  const selectedDocType = computed(() => {
    if (!values.document_type_id) return null
    return documentTypes.value?.find(
      (dt) => dt.id === values.document_type_id || dt.name === values.document_type_id,
    )
  })

  const isAntecedentes = computed(() => {
    return isAntecedentesDocumentType(selectedDocType.value?.name || values.document_type_id)
  })

  // Ao alterar o tipo de documento, atualiza o nome no schema e revalida documentos se já preenchidos
  watch(documentTypeId, async (newVal) => {
    const matched = documentTypes.value?.find((dt) => dt.id === newVal || dt.name === newVal)
    setFieldValue('document_type_name', matched?.name || newVal || '')
    if (values.rg || values.cpf || values.other_document) {
      if (values.is_other_state) {
        await validateField('other_document')
      } else {
        await validateField('rg')
      }
      await validateField('cpf')
    }
  })

  watch(documentTypes, (types) => {
    if (values.document_type_id && !values.document_type_name) {
      const matched = types?.find(
        (dt) => dt.id === values.document_type_id || dt.name === values.document_type_id,
      )
      if (matched?.name) {
        setFieldValue('document_type_name', matched.name)
      }
    }
  })

  // Ao alternar estado de origem do documento, limpa o campo correspondente
  watch(isOtherState, (val) => {
    if (val) {
      setFieldValue('rg', '')
    } else {
      setFieldValue('other_document', '')
    }
  })

  // Ao abrir o modal, reseta os dados preservando os últimos código do posto e tipo de documento
  watch(isOpen, (newVal) => {
    if (newVal) {
      resetForm({ values: initialDemandForm() })
      errorMessage.value = ''
      existingCitizen.value = null
      isSaving.value = false
      isSavingAndContinuing.value = false
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
      setFieldValue('name', formatCitizenName(citizen.name))
      if (citizen.cpf && !values.cpf) {
        setFieldValue('cpf', citizen.cpf)
      }
    }
  }

  const onOtherDocumentBlur = async () => {
    const formattedOther = (values.other_document || '').trim().toUpperCase()

    if (!formattedOther && !values.cpf) {
      existingCitizen.value = null
      return
    }

    if (!formattedOther) return

    const { valid } = await validateField('other_document')
    if (!valid) return

    const citizen = await fetchCitizenByDocument('other_document', formattedOther)
    if (citizen) {
      existingCitizen.value = citizen
      setFieldValue('name', formatCitizenName(citizen.name))
      if (citizen.cpf && !values.cpf) {
        setFieldValue('cpf', citizen.cpf)
      }
    }
  }

  const onCpfBlur = async () => {
    const formattedCpf = values.cpf || ''

    if (!formattedCpf && !values.rg && !values.other_document) {
      existingCitizen.value = null
      return
    }

    if (!formattedCpf) return

    const { valid } = await validateField('cpf')
    if (!valid || !isValidCpf(formattedCpf)) return

    const citizen = await fetchCitizenByDocument('cpf', formattedCpf)
    if (citizen) {
      existingCitizen.value = citizen
      setFieldValue('name', formatCitizenName(citizen.name))
      if (citizen.other_document && !citizen.rg && !values.other_document) {
        setFieldValue('is_other_state', true)
        setFieldValue('other_document', citizen.other_document)
      } else if (citizen.rg && !values.rg) {
        setFieldValue('is_other_state', false)
        setFieldValue('rg', citizen.rg)
      }
    }
  }

  const closeModal = () => {
    isOpen.value = false
  }

  const isUUID = (str: string) =>
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str)

  const executeSave = async (formValues: IirgdDemandFormInput, keepOpen: boolean) => {
    try {
      errorMessage.value = ''
      if (keepOpen) {
        isSavingAndContinuing.value = true
      } else {
        isSaving.value = true
      }

      let finalDocTypeId = formValues.document_type_id
      if (finalDocTypeId && !isUUID(finalDocTypeId)) {
        const newType = await createPendingDocumentType(finalDocTypeId)
        finalDocTypeId = newType.id
      }

      await createDemand({
        ...formValues,
        name: formatCitizenName(formValues.name),
        document_type_id: finalDocTypeId,
        rg:
          !formValues.is_other_state && formValues.rg ? padAndFormatRg(formValues.rg, true) : null,
        other_document:
          formValues.is_other_state && formValues.other_document
            ? formValues.other_document.trim().toUpperCase()
            : null,
        cpf: formValues.cpf ? formatCpf(formValues.cpf) : null,
      })

      if (import.meta.client) {
        if (formValues.station_code) {
          localStorage.setItem(STORAGE_STATION_KEY, formValues.station_code)
        }
        if (finalDocTypeId) {
          localStorage.setItem(STORAGE_DOC_TYPE_KEY, finalDocTypeId)
        }
      }

      toast.success('Demanda criada com sucesso!')
      emit('created')

      if (keepOpen) {
        const currentStation = formValues.station_code
        const currentDocTypeId = finalDocTypeId
        const currentDocTypeName = formValues.document_type_name

        resetForm({
          values: {
            station_code: currentStation,
            document_type_id: currentDocTypeId,
            document_type_name: currentDocTypeName,
            rg: '',
            cpf: '',
            other_document: '',
            is_other_state: false,
            name: '',
            observation: '',
          },
        })
        existingCitizen.value = null
        errorMessage.value = ''
      } else {
        closeModal()
      }
    } catch (e: unknown) {
      errorMessage.value = e instanceof Error ? e.message : 'Ocorreu um erro ao salvar.'
    } finally {
      isSaving.value = false
      isSavingAndContinuing.value = false
    }
  }

  const saveDemand = handleSubmit((formValues) => executeSave(formValues, false))
  const saveAndContinue = handleSubmit((formValues) => executeSave(formValues, true))

  defineExpose({
    saveDemand,
    saveAndContinue,
    values,
    errors,
  })
</script>

<template>
  <UiModal v-model="isOpen" max-width="600px" title="Nova Demanda IIRGD">
    <form id="iirgd-new-demand-form" @submit.prevent="saveAndContinue">
      <UiAlert v-if="errorMessage" class="mb-4" size="sm" type="error" variant="soft">
        {{ errorMessage }}
      </UiAlert>

      <UiRow density="compact">
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
            item-title="name"
            item-value="id"
            :items="documentTypes"
            label="Tipo do Documento *"
            placeholder="Selecione ou digite um novo tipo..."
          />
        </UiCol>

        <UiCol cols="12">
          <UiCheckbox
            v-model="isOtherState"
            class="my-1"
            density="compact"
            hide-details
            label="Cidadão de outro estado (sem RG de SP)"
          />
        </UiCol>

        <UiCol v-if="isAntecedentes" class="mb-2" cols="12">
          <div class="text-caption text-medium-emphasis">
            * Para Antecedentes, informe ao menos um documento (RG ou CPF).
          </div>
        </UiCol>

        <UiCol v-if="isOtherState" cols="12" sm="6">
          <UiInput
            v-model="otherDocument"
            :disabled="!!existingCitizen?.other_document"
            :error-messages="errors.other_document"
            label="Documento de Outro Estado *"
            placeholder="Ex: 0561015112-BA"
            @blur="onOtherDocumentBlur"
            @update:model-value="otherDocument = String($event || '').toUpperCase()"
          />
        </UiCol>
        <UiCol v-else cols="12" sm="6">
          <UiRgInput
            v-model="rg"
            :disabled="!!existingCitizen?.rg"
            :error-messages="errors.rg"
            :label="isAntecedentes ? 'Número do RG' : 'Número do RG *'"
            @blur="onRgBlur"
          />
        </UiCol>

        <UiCol cols="12" sm="6">
          <UiCpfInput
            v-model="cpf"
            :disabled="!!existingCitizen?.cpf"
            :error-messages="errors.cpf"
            :label="isAntecedentes ? 'Número do CPF' : 'CPF (Opcional)'"
            @blur="onCpfBlur"
          />
        </UiCol>

        <UiCol cols="12">
          <UiInput
            v-model="name"
            :disabled="!!existingCitizen"
            :error-messages="errors.name"
            label="Nome do Cidadão *"
            @update:model-value="setFieldValue('name', String($event || '').toUpperCase())"
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
            @keydown.ctrl.enter="saveAndContinue"
          />
        </UiCol>
      </UiRow>

      <!-- Invisible button to ensure standard HTML form submit on Enter key in text fields -->
      <button aria-hidden="true" class="d-none" tabindex="-1" type="submit"></button>
    </form>

    <template #actions>
      <UiButton :disabled="isSaving || isSavingAndContinuing" variant="ghost" @click="closeModal">
        Cancelar
      </UiButton>
      <UiButton
        color="primary"
        :disabled="isSaving"
        :loading="isSavingAndContinuing"
        variant="tonal"
        @click="saveAndContinue"
      >
        Salvar e Continuar Inserindo
      </UiButton>
      <UiButton
        color="primary"
        :disabled="isSavingAndContinuing"
        :loading="isSaving"
        variant="solid"
        @click="saveDemand"
      >
        Salvar
      </UiButton>
    </template>
  </UiModal>
</template>
