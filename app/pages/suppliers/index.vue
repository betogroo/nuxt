<script setup lang="ts">
  import { useToast } from '~/composables/useToast'
  import { formatDate, formatCnpj } from '~/utils/formatters'
  import SupplierFormModal from '~/components/suppliers/SupplierFormModal.vue'
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

  const { fetchSuppliers, toggleSupplierStatus } = useSuppliers()

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
  const selectedSupplier = ref<SupplierRow | null>(null)

  const openAddModal = () => {
    selectedSupplier.value = null
    isModalOpen.value = true
  }

  const openEditModal = (supplier: SupplierRow) => {
    selectedSupplier.value = supplier
    isModalOpen.value = true
  }

  const onSupplierSaved = async () => {
    await refresh()
  }

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
            <div class="d-flex align-center gap-3">
              <UiActionButton
                action="refresh"
                :loading="pending"
                tooltip="Atualizar lista"
                variant="soft"
                @click="refresh"
              />
              <UiButton color="primary" prepend-icon="add" @click="openAddModal">
                Novo Fornecedor
              </UiButton>
            </div>
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

            <template #item-cnpj="{ item }">
              <div class="d-flex align-center ga-1 text-no-wrap">
                <span>{{ formatCnpj(item.cnpj) }}</span>
                <UiCopyButton
                  v-if="item.cnpj"
                  clean-digits-only
                  color="secondary"
                  size="xs"
                  success-message="CNPJ copiado!"
                  tooltip="Copiar CNPJ (apenas números)"
                  :value="item.cnpj"
                />
              </div>
            </template>

            <template #item-company_name="{ item }">
              <NuxtLink
                class="text-primary font-weight-medium text-decoration-none"
                :to="`/suppliers/${item.id}`"
              >
                {{ item.company_name }}
              </NuxtLink>
            </template>

            <template #item-email="{ item }">
              <span :class="{ 'text-grey': !item.email }">{{ item.email || '-' }}</span>
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
              <div class="d-flex justify-end gap-2">
                <UiActionButton
                  action="view"
                  icon="recordsList"
                  :to="`/suppliers/${item.id}`"
                  tooltip="Ver Detalhes"
                />
                <UiActionButton
                  action="edit"
                  icon="edit"
                  tooltip="Editar"
                  @click="openEditModal(item)"
                />
              </div>
            </template>
          </UiTable>

          <!-- Paginação -->
          <div v-if="totalPages > 1" class="d-flex justify-center py-4 w-100">
            <UiPagination v-model="currentPage" :length="totalPages" size="md" :total-visible="7" />
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
            <template #item-cnpj="{ item }">
              <div class="d-flex align-center ga-1 text-no-wrap">
                <span>{{ formatCnpj(item.cnpj) }}</span>
                <UiCopyButton
                  v-if="item.cnpj"
                  clean-digits-only
                  color="secondary"
                  size="xs"
                  success-message="CNPJ copiado!"
                  tooltip="Copiar CNPJ (apenas números)"
                  :value="item.cnpj"
                />
              </div>
            </template>

            <template #item-company_name="{ item }">
              <NuxtLink
                class="text-primary font-weight-medium text-decoration-none"
                :to="`/suppliers/${item.id}`"
              >
                {{ item.company_name }}
              </NuxtLink>
            </template>

            <template #item-email="{ item }">
              <span :class="{ 'text-grey': !item.email }">{{ item.email || '-' }}</span>
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
              <div class="d-flex justify-end gap-2">
                <UiActionButton
                  action="view"
                  icon="recordsList"
                  :to="`/suppliers/${item.id}`"
                  tooltip="Ver Detalhes"
                />
                <UiActionButton
                  action="edit"
                  icon="edit"
                  tooltip="Editar"
                  @click="openEditModal(item)"
                />
              </div>
            </template>
          </UiTable>
        </UiCard>
      </UiCol>
    </UiRow>

    <!-- Modal Form -->
    <SupplierFormModal
      v-model="isModalOpen"
      :supplier="selectedSupplier"
      @saved="onSupplierSaved"
    />
  </div>
</template>
