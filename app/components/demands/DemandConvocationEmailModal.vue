<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { useToast } from '~/composables/useToast'
  import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
  import { formatCnpj } from '~/utils/formatters'
  import {
    generateConvocationEmail,
    type DemandForConvocationEmail,
    type SupplierForConvocationEmail,
  } from '~/utils/demandConvocationEmail'

  const props = defineProps<{
    modelValue: boolean
    demand: DemandForConvocationEmail | null
    supplier: SupplierForConvocationEmail | null
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', val: boolean): void
  }>()

  const toast = useToast()
  const { copy } = useCopyToClipboard()

  const emailData = computed(() => {
    return generateConvocationEmail(props.demand, props.supplier)
  })

  const editableSubject = ref('')
  const editableBody = ref('')

  // Sync state whenever modal opens or supplier/demand changes
  watch(
    () => [props.modelValue, props.supplier, props.demand],
    ([isOpen]) => {
      if (isOpen && emailData.value) {
        editableSubject.value = emailData.value.subject
        editableBody.value = emailData.value.body
      }
    },
    { immediate: true },
  )

  const closeModal = () => {
    emit('update:modelValue', false)
  }

  const copySubject = async () => {
    if (!editableSubject.value) return
    const success = await copy(
      editableSubject.value,
      'Assunto copiado para a área de transferência!',
    )
    if (success) {
      toast.success('Assunto copiado com sucesso!')
    }
  }

  const copyFullMessage = async () => {
    const fullText = `Assunto: ${editableSubject.value}\n\n${editableBody.value}`
    const success = await copy(
      fullText,
      'E-mail de convocação completo copiado para a área de transferência!',
    )
    if (success) {
      toast.success('E-mail copiado com sucesso!')
    }
  }

  const openEmailClient = () => {
    const recipient = emailData.value.recipientEmail
      ? encodeURIComponent(emailData.value.recipientEmail)
      : ''
    const subject = encodeURIComponent(editableSubject.value)
    const body = encodeURIComponent(editableBody.value)
    const mailto = `mailto:${recipient}?subject=${subject}&body=${body}`

    if (typeof window !== 'undefined') {
      window.location.href = mailto
    }
  }
</script>

<template>
  <UiModal
    max-width="720px"
    :model-value="modelValue"
    title="E-mail de Convocação do Fornecedor"
    transparent-header
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="supplier" class="mb-4">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <div>
          <div class="text-subtitle-1 font-weight-bold">
            {{ supplier.company_name }}
          </div>
          <div v-if="supplier.cnpj" class="text-caption text-grey">
            CNPJ: {{ formatCnpj(supplier.cnpj) }}
          </div>
        </div>

        <div class="d-flex align-center ga-2">
          <UiChip v-if="supplier.email" color="info" size="xs" variant="soft">
            <UiIcon class="mr-1" name="email" size="xs" />
            {{ supplier.email }}
          </UiChip>
          <UiChip
            v-if="supplier.commitments && supplier.commitments.length > 0"
            color="purple"
            size="xs"
            variant="flat"
          >
            <UiIcon class="mr-1" name="document" size="xs" />
            {{ supplier.commitments.length }}
            {{ supplier.commitments.length === 1 ? 'Empenho' : 'Empenhos' }}
          </UiChip>
        </div>
      </div>

      <UiAlert v-if="!supplier.email" class="mt-2" size="xs" type="warning" variant="soft">
        Fornecedor sem e-mail cadastrado no sistema. Verifique o contato oficial antes do envio.
      </UiAlert>
    </div>

    <!-- Assunto -->
    <div class="mb-3">
      <div class="d-flex align-center justify-space-between mb-1">
        <label class="text-caption font-weight-bold text-grey-darken-1">Assunto</label>
        <UiButton
          color="secondary"
          icon="copy"
          size="xs"
          tooltip="Copiar Assunto"
          variant="ghost"
          @click="copySubject"
        />
      </div>
      <UiInput v-model="editableSubject" />
    </div>

    <!-- Mensagem -->
    <div class="mb-2">
      <div class="d-flex align-center justify-space-between mb-1">
        <label class="text-caption font-weight-bold text-grey-darken-1">Mensagem</label>
        <span class="text-caption text-grey">Você pode ajustar o texto antes de copiar</span>
      </div>
      <UiTextarea v-model="editableBody" :rows="12" />
    </div>

    <template #actions>
      <UiButton variant="ghost" @click="closeModal">Fechar</UiButton>
      <UiButton
        v-if="emailData.recipientEmail"
        color="secondary"
        prepend-icon="email"
        variant="outlined"
        @click="openEmailClient"
      >
        Abrir no E-mail
      </UiButton>
      <UiButton color="primary" prepend-icon="copy" @click="copyFullMessage">
        Copiar Mensagem
      </UiButton>
    </template>
  </UiModal>
</template>
