<script setup lang="ts">
  import type { SupplierRow } from '~/composables/useSuppliers'

  useHead({ title: 'Fornecedores' })

  const { fetchSuppliers, createSupplier, updateSupplier, toggleSupplierStatus } = useSuppliers()

  // Pagination State
  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const totalItems = ref(0)
  const searchQuery = ref('')

  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

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
    currentPage.value = 1
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
  const form = ref({ ...defaultForm })

  // Formatar data local
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const openAddModal = () => {
    form.value = { ...defaultForm }
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (supplier: SupplierRow) => {
    form.value = {
      ...supplier,
      responsible_name: supplier.responsible_name || '',
      cell_phone: supplier.cell_phone || '',
      landline: supplier.landline || '',
      address: supplier.address || '',
      has_bb_account: supplier.has_bb_account || '',
    }
    isEditing.value = true
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveSupplier = async () => {
    if (!form.value.cnpj || !form.value.company_name || !form.value.email) {
      saveError.value = 'CNPJ, Nome da Empresa e E-mail são obrigatórios.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      // Se a opção do simples mudar, atualiza a data de verificação.
      let verifiedAt = form.value.simples_optant_verified_at
      if (isEditing.value) {
        const original = suppliers.value?.find((s) => s.id === form.value.id)
        if (original && original.is_simples_optant !== form.value.is_simples_optant) {
          verifiedAt = new Date().toISOString()
        }
      } else if (form.value.is_simples_optant) {
        verifiedAt = new Date().toISOString()
      }

      const payload = {
        cnpj: form.value.cnpj,
        company_name: form.value.company_name,
        responsible_name: form.value.responsible_name || null,
        email: form.value.email,
        cell_phone: form.value.cell_phone || null,
        landline: form.value.landline || null,
        address: form.value.address || null,
        has_bb_account: form.value.has_bb_account || null,
        is_simples_optant: form.value.is_simples_optant,
        simples_optant_verified_at: verifiedAt,
        is_active: form.value.is_active,
      }

      if (isEditing.value) {
        await updateSupplier(form.value.id, payload)
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
  }

  const toggleStatus = async (supplier: SupplierRow) => {
    try {
      await toggleSupplierStatus(supplier)
      await refresh()
    } catch (err: unknown) {
      const e = err as Error
      alert(`Erro ao alterar status: ${e.message}`)
    }
  }
</script>

<template>
  <div>
    <PageHeader subtitle="Gerenciamento de Fornecedores do Sistema" title="Fornecedores" />

    <v-row>
      <v-col cols="12">
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold">Lista de Fornecedores</span>
            <v-spacer />
            <UiButton
              class="mr-2"
              color="secondary"
              icon="mdi-refresh"
              :loading="pending"
              size="small"
              variant="tonal"
              @click="refresh"
            />
            <UiButton color="primary" prepend-icon="mdi-plus" @click="openAddModal">
              Novo Fornecedor
            </UiButton>
          </template>

          <!-- Barra de Pesquisa -->
          <div class="bg-grey-lighten-4 py-3 px-4 border-bottom">
            <v-row align="center" no-gutters>
              <v-col cols="12" md="6" sm="8">
                <UiInput
                  v-model="searchQuery"
                  class="mb-0"
                  clearable
                  hide-details
                  label="Pesquisar por CNPJ, Nome ou E-mail"
                  prepend-inner-icon="mdi-magnify"
                />
              </v-col>
            </v-row>
          </div>

          <v-divider />

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
                size="small"
                variant="flat"
                @click="toggleStatus(item)"
              >
                {{ item.is_active ? 'ATIVO' : 'INATIVO' }}
              </UiChip>
            </template>

            <template #item-actions="{ item }">
              <UiButton
                color="primary"
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="openEditModal(item)"
              />
            </template>
          </UiTable>

          <!-- Paginação -->
          <div v-if="totalPages > 1" class="d-flex justify-center py-4 w-100">
            <v-pagination
              v-model="currentPage"
              density="comfortable"
              :length="totalPages"
              :total-visible="7"
            />
          </div>
        </UiCard>
      </v-col>

      <v-col v-if="inactiveSuppliers.length > 0" cols="12">
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
                size="small"
                variant="flat"
                @click="toggleStatus(item)"
              >
                {{ item.is_active ? 'ATIVO' : 'INATIVO' }}
              </UiChip>
            </template>

            <template #item-actions="{ item }">
              <UiButton
                color="primary"
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="openEditModal(item)"
              />
            </template>
          </UiTable>
        </UiCard>
      </v-col>
    </v-row>

    <!-- Modal Form -->
    <UiModal
      v-model="isModalOpen"
      max-width="700px"
      scrollable
      :title="isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'"
      transparent-header
    >
      <v-card-text class="pa-0" style="max-height: 60vh; overflow-y: auto">
        <div class="pa-4">
          <UiAlert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
            {{ saveError }}
          </UiAlert>

          <v-row>
            <v-col cols="12" md="4">
              <UiInput v-model="form.cnpj" label="CNPJ *" required />
            </v-col>
            <v-col cols="12" md="8">
              <UiInput v-model="form.company_name" label="Nome da Empresa *" required />
            </v-col>

            <v-col cols="12" md="6">
              <UiInput v-model="form.responsible_name" label="Nome do Responsável" />
            </v-col>
            <v-col cols="12" md="6">
              <UiInput v-model="form.email" label="E-mail *" required type="email" />
            </v-col>

            <v-col cols="12" md="6">
              <UiInput v-model="form.cell_phone" label="Telefone Celular" />
            </v-col>
            <v-col cols="12" md="6">
              <UiInput v-model="form.landline" label="Telefone Fixo" />
            </v-col>

            <v-col cols="12">
              <UiInput v-model="form.address" label="Endereço" />
            </v-col>

            <v-col cols="12">
              <UiInput
                v-model="form.has_bb_account"
                hint="Ex: Ag: 1234-5, CC: 12345-6"
                label="Conta no Banco do Brasil"
                persistent-hint
              />
            </v-col>

            <v-col cols="12">
              <UiSwitch
                v-model="form.is_simples_optant"
                color="primary"
                hint="A data e hora da verificação serão salvas automaticamente."
                label="Optante pelo Simples Nacional"
                persistent-hint
              />
            </v-col>

            <v-col cols="12">
              <UiSwitch
                v-model="form.is_active"
                color="success"
                hint="Indica se o fornecedor está ativo no sistema"
                label="Fornecedor Ativo"
                persistent-hint
              />
            </v-col>
          </v-row>
        </div>
      </v-card-text>

      <v-divider />

      <template #actions>
        <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveSupplier"> Salvar </UiButton>
      </template>
    </UiModal>
  </div>
</template>
