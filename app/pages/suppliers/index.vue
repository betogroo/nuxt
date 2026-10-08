<script setup lang="ts">
  import { useToast } from '~/composables/useToast'
  import type { SupplierRow } from '~/composables/useSuppliers'
  import { useZodForm } from '~/composables/useZodForm'
  import { supplierFormSchema, type SupplierFormInput } from '~/schemas/forms/supplier'
  const toast = useToast()
  definePageMeta({
    icon: 'delivery',
    middleware: ['uge'],
    navLabel: 'Fornecedores',
    navSubtitle: 'Cadastro e gestão de fornecedores',
    navColor: 'secondary',
    navGroup: 'management',
    navOrder: 30,
    roles: ['admin', 'uge'],
    showIn: ['drawer', 'home'],
  })

  useHead({ title: 'Fornecedores' })

  const { fetchSuppliers, createSupplier, updateSupplier, toggleSupplierStatus } = useSuppliers()

  // Pagination State
  const { currentPage, itemsPerPage, totalItems, totalPages, resetPage } = usePagination()
  const searchQuery = ref('')

  // Fetch Suppliers with Pagination and Filter
  const {
    data: suppliers,
    pending,
    refresh,
  } = useAsyncData(
    'suppliers-list',
    async () => {
      const { data, count } = await fetchSuppliers({
        page: currentPage.value,
        itemsPerPage: itemsPerPage.value,
        searchQuery: searchQuery.value,
      })
      totalItems.value = count
      return data
    },
    {
      watch: [currentPage, searchQuery],
    },
  )

  // When search changes, reset page to 1
  watch(searchQuery, () => {
    resetPage()
  })

  const activeSuppliers = computed(() => suppliers.value?.filter((s) => s.is_active) || [])
  const inactiveSuppliers = computed(() => suppliers.value?.filter((s) => !s.is_active) || [])

  // Modal State
  const isModalOpen = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')
  const isEditing = ref(false)

  // Form State
  const defaultForm = {
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
    simples_optant_verified_at: null as string | null,
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

  // Formatar data local
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const openAddModal = () => {
    resetForm({ values: defaultForm })
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (supplier: SupplierRow) => {
    resetForm({
      values: {
        ...supplier,
        responsible_name: supplier.responsible_name || '',
        cell_phone: supplier.cell_phone || '',
        landline: supplier.landline || '',
        address: supplier.address || '',
        has_bb_account: supplier.has_bb_account || '',
      },
    })
    isEditing.value = true
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveSupplier = handleSubmit(async (values: SupplierFormInput) => {
    isSaving.value = true
    saveError.value = ''

    try {
      let verifiedAt = values.simples_optant_verified_at
      if (isEditing.value) {
        const original = suppliers.value?.find((s) => s.id === values.id)
        if (original && original.is_simples_optant !== values.is_simples_optant) {
          verifiedAt = new Date().toISOString()
        }
      } else if (values.is_simples_optant) {
        verifiedAt = new Date().toISOString()
      }

      const payload = {
        cnpj: values.cnpj,
        company_name: values.company_name,
        responsible_name: values.responsible_name || null,
        email: values.email,
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
      } else {
        await createSupplier(payload)
      }

      await refresh()
      closeModal()
    } catch (err: unknown) {
      const e = err as Error
      saveError.value = e.message
    } finally {
      isSaving.value = false
    }
  })

  const toggleStatus = async (supplier: SupplierRow) => {
    try {
      await toggleSupplierStatus(supplier)
      await refresh()
    } catch (err: unknown) {
      const e = err as Error
      toast.error(`Erro ao alterar status: ${e.message}`)
    }
  }
</script>

<template>
  <div>
    <PageHeader subtitle="Gerenciamento de Fornecedores do Sistema" title="Fornecedores" />

    <UiRow>
      <UiCol cols="12">
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold">Lista de Fornecedores</span>
            <UiSpacer />
            <UiButton
              class="mr-2"
              color="secondary"
              icon="refresh"
              :loading="pending"
              size="small"
              variant="tonal"
              @click="refresh"
            />
            <UiButton color="primary" prepend-icon="add" @click="openAddModal">
              Novo Fornecedor
            </UiButton>
          </template>

          <!-- Barra de Pesquisa -->
          <div class="bg-grey-lighten-4 py-3 px-4 border-bottom">
            <UiRow align="center" no-gutters>
              <UiCol cols="12" md="6" sm="8">
                <UiInput
                  v-model="searchQuery"
                  class="mb-0"
                  clearable
                  hide-details
                  label="Pesquisar por CNPJ, Nome ou E-mail"
                  prepend-inner-icon="search"
                />
              </UiCol>
            </UiRow>
          </div>

          <UiDivider />

          <UiTable
            :headers="[
              { text: 'CNPJ', value: 'cnpj' },
              { text: 'Empresa', value: 'company_name' },
              { text: 'E-mail', value: 'email' },
              { text: 'Optante Simples', value: 'is_simples_optant' },
              { text: 'Status', value: 'is_active', align: 'center' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="activeSuppliers"
          >
            <template v-if="!activeSuppliers?.length && !pending" #empty>
              Nenhum fornecedor encontrado.
            </template>

            <template #item-is_simples_optant="{ item }">
              <div class="d-flex flex-column">
                <span
                  :class="item.is_simples_optant ? 'text-success font-weight-bold' : 'text-grey'"
                >
                  {{ item.is_simples_optant ? 'Sim' : 'Não' }}
                </span>
                <span v-if="item.simples_optant_verified_at" class="text-caption text-grey">
                  Verif: {{ formatDate(item.simples_optant_verified_at) }}
                </span>
              </div>
            </template>

            <template #item-is_active="{ item }">
              <UiChip
                class="cursor-pointer"
                :color="item.is_active ? 'success' : 'error'"
                size="sm"
                variant="solid"
                @click="toggleStatus(item)"
              >
                {{ item.is_active ? 'ATIVO' : 'INATIVO' }}
              </UiChip>
            </template>

            <template #item-actions="{ item }">
              <UiButton
                color="primary"
                icon="edit"
                size="small"
                variant="text"
                @click="openEditModal(item)"
              />
            </template>
          </UiTable>

          <!-- Paginação -->
          <div v-if="totalPages > 1" class="d-flex justify-center py-4 w-100">
            <UiPagination
              v-model="currentPage"
              density="comfortable"
              :length="totalPages"
              :total-visible="7"
            />
          </div>
        </UiCard>
      </UiCol>

      <UiCol v-if="inactiveSuppliers.length > 0" cols="12">
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold text-grey">Fornecedores Desativados</span>
          </template>

          <UiTable
            :headers="[
              { text: 'CNPJ', value: 'cnpj' },
              { text: 'Empresa', value: 'company_name' },
              { text: 'E-mail', value: 'email' },
              { text: 'Optante Simples', value: 'is_simples_optant' },
              { text: 'Status', value: 'is_active', align: 'center' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="inactiveSuppliers"
            :loading="pending"
          >
            <template #item-is_simples_optant="{ item }">
              <div class="d-flex flex-column">
                <span
                  :class="item.is_simples_optant ? 'text-success font-weight-bold' : 'text-grey'"
                >
                  {{ item.is_simples_optant ? 'Sim' : 'Não' }}
                </span>
                <span v-if="item.simples_optant_verified_at" class="text-caption text-grey">
                  Verif: {{ formatDate(item.simples_optant_verified_at) }}
                </span>
              </div>
            </template>

            <template #item-is_active="{ item }">
              <UiChip
                class="cursor-pointer"
                :color="item.is_active ? 'success' : 'error'"
                size="sm"
                variant="solid"
                @click="toggleStatus(item)"
              >
                {{ item.is_active ? 'ATIVO' : 'INATIVO' }}
              </UiChip>
            </template>

            <template #item-actions="{ item }">
              <UiButton
                color="primary"
                icon="edit"
                size="small"
                variant="text"
                @click="openEditModal(item)"
              />
            </template>
          </UiTable>
        </UiCard>
      </UiCol>
    </UiRow>

    <!-- Modal Form -->
    <UiModal
      v-model="isModalOpen"
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
                label="E-mail *"
                required
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
        <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveSupplier"> Salvar </UiButton>
      </template>
    </UiModal>
  </div>
</template>
