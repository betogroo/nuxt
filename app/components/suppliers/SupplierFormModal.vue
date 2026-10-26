<script setup lang="ts">
  import { useZodForm } from '~/composables/useZodForm'
  import { useToast } from '~/composables/useToast'
  import { supplierFormSchema, type SupplierFormInput } from '~/schemas/forms/supplier'
  import type { SupplierRow } from '~/composables/useSuppliers'

  const props = defineProps<{
    supplier?: SupplierRow | null
  }>()

  const emit = defineEmits<{
    (e: 'saved', supplierId?: string): void
  }>()

  const isOpen = defineModel<boolean>({ default: false })

  const toast = useToast()
  const { createSupplier, updateSupplier } = useSuppliers()

  const isSaving = ref(false)
  const saveError = ref('')

  const isEditing = computed(() => !!props.supplier?.id)

  const defaultForm: SupplierFormInput = {
    id: '',
    cnpj: '',
    company_name: '',
    responsible_name: '',
    email: '',
    cell_phone: '',
    landline: '',
    address: '',
    has_bb_account: '',
    is_simples_optant: false,
    simples_optant_verified_at: null,
    is_active: true,
  }

  const { errors, defineField, handleSubmit, resetForm } = useZodForm(
    supplierFormSchema,
    defaultForm,
  )

  const [cnpj, cnpjProps] = defineField('cnpj')
  const [companyName, companyNameProps] = defineField('company_name')
  const [responsibleName, responsibleNameProps] = defineField('responsible_name')
  const [email, emailProps] = defineField('email')
  const [cellPhone, cellPhoneProps] = defineField('cell_phone')
  const [landline, landlineProps] = defineField('landline')
  const [address, addressProps] = defineField('address')
  const [hasBbAccount, hasBbAccountProps] = defineField('has_bb_account')
  const [isSimplesOptant, isSimplesOptantProps] = defineField('is_simples_optant')
  const [isActive, isActiveProps] = defineField('is_active')

  watch(
    () => [isOpen.value, props.supplier] as const,
    ([open, currentSupplier]) => {
      if (open) {
        saveError.value = ''
        if (currentSupplier) {
          resetForm({
            values: {
              id: currentSupplier.id,
              cnpj: currentSupplier.cnpj,
              company_name: currentSupplier.company_name,
              responsible_name: currentSupplier.responsible_name || '',
              email: currentSupplier.email || '',
              cell_phone: currentSupplier.cell_phone || '',
              landline: currentSupplier.landline || '',
              address: currentSupplier.address || '',
              has_bb_account: currentSupplier.has_bb_account || '',
              is_simples_optant: currentSupplier.is_simples_optant ?? false,
              simples_optant_verified_at: currentSupplier.simples_optant_verified_at || null,
              is_active: currentSupplier.is_active ?? true,
            },
          })
        } else {
          resetForm({ values: defaultForm })
        }
      }
    },
    { immediate: true },
  )

  const closeModal = () => {
    isOpen.value = false
  }

  const saveSupplier = handleSubmit(async (values: SupplierFormInput) => {
    isSaving.value = true
    saveError.value = ''

    try {
      let verifiedAt = values.simples_optant_verified_at
      if (isEditing.value && props.supplier) {
        if (props.supplier.is_simples_optant !== values.is_simples_optant) {
          verifiedAt = new Date().toISOString()
        }
      } else if (values.is_simples_optant) {
        verifiedAt = new Date().toISOString()
      }

      const payload = {
        cnpj: values.cnpj,
        company_name: values.company_name,
        responsible_name: values.responsible_name || null,
        email: values.email?.trim() || null,
        cell_phone: values.cell_phone || null,
        landline: values.landline || null,
        address: values.address || null,
        has_bb_account: values.has_bb_account || null,
        is_simples_optant: values.is_simples_optant,
        simples_optant_verified_at: verifiedAt,
        is_active: values.is_active,
      }

      if (isEditing.value && values.id) {
        await updateSupplier(values.id, payload)
        toast.success('Fornecedor atualizado com sucesso!')
      } else {
        await createSupplier(payload)
        toast.success('Fornecedor cadastrado com sucesso!')
      }

      emit('saved', values.id || undefined)
      closeModal()
    } catch (err: unknown) {
      console.error(err)
      saveError.value =
        (err as Error)?.message ||
        'Erro ao salvar fornecedor. Verifique os dados e tente novamente.'
    } finally {
      isSaving.value = false
    }
  })
</script>

<template>
  <UiModal
    v-model="isOpen"
    max-width="700px"
    scrollable
    :title="isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'"
    transparent-header
  >
    <div class="pa-0" style="max-height: 60vh; overflow-y: auto">
      <div class="pa-4">
        <UiAlert v-if="saveError" class="mb-4" size="sm" type="error" variant="soft">
          {{ saveError }}
        </UiAlert>

        <UiRow>
          <UiCol cols="12" md="4">
            <UiInput
              v-model="cnpj"
              v-bind="cnpjProps"
              :error-messages="errors.cnpj"
              label="CNPJ *"
              required
            />
          </UiCol>
          <UiCol cols="12" md="8">
            <UiInput
              v-model="companyName"
              v-bind="companyNameProps"
              :error-messages="errors.company_name"
              label="Nome da Empresa *"
              required
            />
          </UiCol>

          <UiCol cols="12" md="6">
            <UiInput
              v-model="responsibleName"
              v-bind="responsibleNameProps"
              :error-messages="errors.responsible_name"
              label="Nome do Responsável"
            />
          </UiCol>
          <UiCol cols="12" md="6">
            <UiInput
              v-model="email"
              v-bind="emailProps"
              :error-messages="errors.email"
              label="E-mail"
              type="email"
            />
          </UiCol>

          <UiCol cols="12" md="6">
            <UiInput
              v-model="cellPhone"
              v-bind="cellPhoneProps"
              :error-messages="errors.cell_phone"
              label="Telefone Celular"
            />
          </UiCol>
          <UiCol cols="12" md="6">
            <UiInput
              v-model="landline"
              v-bind="landlineProps"
              :error-messages="errors.landline"
              label="Telefone Fixo"
            />
          </UiCol>

          <UiCol cols="12">
            <UiInput
              v-model="address"
              v-bind="addressProps"
              :error-messages="errors.address"
              label="Endereço"
            />
          </UiCol>

          <UiCol cols="12">
            <UiInput
              v-model="hasBbAccount"
              v-bind="hasBbAccountProps"
              :error-messages="errors.has_bb_account"
              hint="Ex: Ag: 1234-5, CC: 12345-6"
              label="Conta no Banco do Brasil"
              persistent-hint
            />
          </UiCol>

          <UiCol cols="12">
            <UiSwitch
              v-model="isSimplesOptant"
              v-bind="isSimplesOptantProps"
              color="primary"
              :error-messages="errors.is_simples_optant"
              hint="A data e hora da verificação serão salvas automaticamente."
              label="Optante pelo Simples Nacional"
              persistent-hint
            />
          </UiCol>

          <UiCol cols="12">
            <UiSwitch
              v-model="isActive"
              v-bind="isActiveProps"
              color="success"
              :error-messages="errors.is_active"
              hint="Indica se o fornecedor está ativo no sistema"
              label="Fornecedor Ativo"
              persistent-hint
            />
          </UiCol>
        </UiRow>
      </div>
    </div>

    <UiDivider />

    <template #actions>
      <UiButton :disabled="isSaving" variant="ghost" @click="closeModal">Cancelar</UiButton>
      <UiButton color="primary" :loading="isSaving" @click="saveSupplier"> Salvar </UiButton>
    </template>
  </UiModal>
</template>
