<script setup lang="ts">
  import type { ProductRow } from '~/composables/useProducts'

  definePageMeta({
    middleware: ['admin'],
  })

  useHead({ title: 'Gerenciar Produtos' })

  const {
    fetchProducts,
    createProduct,
    updateProduct,
    toggleProductStatus,
  } = useProducts()

  const { fetchAllActiveExpenseNatures } = useExpenseNatures()

  // Pagination & Filter State
  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const totalItems = ref(0)
  const selectedExpenseNature = ref<string | null>(null)
  const statusFilter = ref<string>('active')

  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  const { data: expenseNatures } = useAsyncData('expense-natures', fetchAllActiveExpenseNatures)

  const { data: products, pending, refresh } = useAsyncData(
    'products-admin',
    async () => {
      const result = await fetchProducts(
        currentPage.value,
        itemsPerPage.value,
        selectedExpenseNature.value,
        statusFilter.value,
      )
      totalItems.value = result.count
      return result.data
    },
    {
      watch: [currentPage, selectedExpenseNature, statusFilter],
    },
  )

  watch([selectedExpenseNature, statusFilter], () => {
    currentPage.value = 1
  })

  const modal = useModal({
    id: '',
    name: '',
    expense_nature_id: '',
    is_active: true,
  })

  const isEditing = computed(() => !!modal.payload.value.id)

  const openAddModal = () => {
    modal.open({
      id: '',
      name: '',
      expense_nature_id: '',
      is_active: true,
    })
  }

  const openEditModal = (product: ProductRow) => {
    modal.open({
      ...product,
      expense_nature_id: product.expense_nature_id || '',
    })
  }

  const saveProduct = async () => {
    if (!modal.payload.value.name || !modal.payload.value.expense_nature_id) {
      modal.error.value = 'Nome e Natureza de Despesa são obrigatórios.'
      return
    }

    modal.startSaving()
    try {
      const payload = {
        name: modal.payload.value.name,
        expense_nature_id: modal.payload.value.expense_nature_id,
        is_active: modal.payload.value.is_active,
      }

      if (isEditing.value) {
        await updateProduct(modal.payload.value.id as string, payload)
      } else {
        await createProduct(payload)
      }
      await refresh()
      modal.close()
    } catch (e: unknown) {
      modal.handleError(e)
    }
  }

  const toggleStatus = async (item: ProductRow) => {
    try {
      await toggleProductStatus(item)
      await refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }
</script>

<template>
  <div>
    <PageHeader subtitle="Cadastre e gerencie os produtos do sistema" title="Produtos" />

    <v-row>
      <v-col cols="12">
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold">Lista de Produtos</span>
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
              Novo Produto
            </UiButton>
          </template>

          <div class="pa-4 pb-0">
            <v-row align="center" no-gutters>
              <v-col class="pr-sm-2 mb-2 mb-sm-0" cols="12" md="4" sm="6">
                <UiSelect
                  v-model="selectedExpenseNature"
                  class="mb-0"
                  clearable
                  hide-details
                  item-title="name"
                  item-value="id"
                  :items="expenseNatures || []"
                  label="Filtrar por Natureza de Despesa"
                />
              </v-col>
              <v-col class="px-sm-2 mb-2 mb-sm-0" cols="12" md="4" sm="6">
                <UiSelect
                  v-model="statusFilter"
                  class="mb-0"
                  hide-details
                  item-title="title"
                  item-value="value"
                  :items="[
                    { title: 'Ativos', value: 'active' },
                    { title: 'Inativos', value: 'inactive' },
                    { title: 'Todos', value: 'all' },
                  ]"
                  label="Status"
                />
              </v-col>
            </v-row>
          </div>

          <UiTable
            :headers="[
              { text: 'Nome', value: 'name' },
              { text: 'Natureza de Despesa', value: 'expense_nature' },
              { text: 'Status', value: 'is_active', align: 'center' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="products || []"
            :loading="pending"
          >
            <template #item-name="{ item }">
              <NuxtLink
                class="font-weight-medium text-primary text-decoration-none"
                :to="`/admin/products/${item.id}`"
              >
                {{ item.name }}
              </NuxtLink>
            </template>
            <template #item-expense_nature="{ item }">
              {{ item.expense_natures?.name || '-' }}
            </template>
            <template #item-is_active="{ item }">
              <v-tooltip location="top" text="Clique para ativar/desativar">
                <template #activator="{ props }">
                  <span v-bind="props">
                    <UiChip
                      :color="item.is_active ? 'success' : 'error'"
                      size="small"
                      style="cursor: pointer"
                      @click="toggleStatus(item)"
                    >
                      {{ item.is_active ? 'Ativo' : 'Inativo' }}
                    </UiChip>
                  </span>
                </template>
              </v-tooltip>
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

          <div v-if="totalPages > 1" class="d-flex justify-center pa-4">
            <v-pagination
              v-model="currentPage"
              active-color="primary"
              :length="totalPages"
              rounded="circle"
              total-visible="7"
            />
          </div>
        </UiCard>
      </v-col>
    </v-row>

    <!-- Add/Edit Modal -->
    <UiModal
      v-model="modal.isOpen.value"
      max-width="500px"
      :title="isEditing ? 'Editar Produto' : 'Novo Produto'"
    >
      <UiAlert v-if="modal.error.value" class="mb-4" density="compact" type="error" variant="tonal">
        {{ modal.error.value }}
      </UiAlert>

      <UiInput v-model="modal.payload.value.name" label="Nome do Produto" />

      <UiSelect
        v-model="modal.payload.value.expense_nature_id"
        item-title="name"
        item-value="id"
        :items="expenseNatures || []"
        label="Natureza de Despesa"
      />

      <UiSwitch
        v-model="modal.payload.value.is_active"
        color="success"
        label="Produto ativo no sistema"
      />

      <template #actions>
        <UiButton variant="text" @click="modal.close()">Cancelar</UiButton>
        <UiButton color="primary" :loading="modal.isSaving.value" @click="saveProduct">
          Salvar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
