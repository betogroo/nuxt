<script setup lang="ts">
  import type { ProductRow } from '~/composables/useProducts'

  useHead({ title: 'Produtos' })

  const {
    fetchProducts,
    createProduct,
    updateProduct,
    toggleProductStatus,
    fetchPendingProductSuggestions,
  } = useProducts()

  const { fetchAllActiveCategories } = useCategories()

  // Pagination & Filter State
  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const totalItems = ref(0)
  // selectedCategory will now hold category_id instead of material_category string
  const selectedCategory = ref<string | null>(null)
  const statusFilter = ref<string>('active')

  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  // Fetch unique categories for the filter
  const { data: categories } = useAsyncData('product-categories', fetchAllActiveCategories)

  const { fetchAllActiveExpenseNatures } = useExpenseNatures()
  const { data: expenseNatures } = useAsyncData('expense-natures', fetchAllActiveExpenseNatures)

  // Fetch pending suggestions for the combobox
  const { data: pendingSuggestions, refresh: refreshPendingSuggestions } = useAsyncData(
    'pending-suggestions-products',
    fetchPendingProductSuggestions,
  )

  // Fetch Products with Pagination and Filter
  const {
    data: products,
    pending,
    refresh,
  } = useAsyncData(
    'products-list',
    async () => {
      const result = await fetchProducts(
        currentPage.value,
        itemsPerPage.value,
        selectedCategory.value,
        statusFilter.value,
      )
      totalItems.value = result.count
      return result.data
    },
    {
      watch: [currentPage, selectedCategory, statusFilter],
    },
  )

  // When filters change, reset page to 1
  watch([selectedCategory, statusFilter], () => {
    currentPage.value = 1
  })

  // Modal State
  const modal = useModal({
    id: '',
    name: '',
    category_id: '',
    expense_nature_id: '',
    suggested_category: '',
    is_suggesting_category: false,
    is_active: true,
  })

  const isEditing = computed(() => !!modal.payload.value.id)

  const filteredCategories = computed(() => {
    return categories.value?.filter((c) => c.name !== 'Outros') || []
  })

  const outrosCategory = computed(() => {
    return categories.value?.find((c) => c.name === 'Outros')
  })

  const openAddModal = () => {
    modal.open()
  }

  const openEditModal = (product: ProductRow) => {
    const isOutros =
      product.product_categories?.name === 'Outros' ||
      product.category_id === outrosCategory.value?.id

    modal.open({
      ...product,
      expense_nature_id: product.expense_nature_id || '',
      suggested_category: product.suggested_category || '',
      is_suggesting_category: isOutros,
    })
  }

  const closeModal = () => {
    modal.close()
  }

  const saveProduct = async () => {
    if (modal.payload.value.is_suggesting_category) {
      if (!modal.payload.value.name || !modal.payload.value.suggested_category) {
        modal.error.value = 'Nome e Sugestão de Categoria são obrigatórios.'
        return
      }
      modal.payload.value.category_id = outrosCategory.value?.id || ''
    } else {
      if (!modal.payload.value.name || !modal.payload.value.category_id) {
        modal.error.value = 'Nome e Categoria são obrigatórios.'
        return
      }
      modal.payload.value.suggested_category = '' // Limpa se desmarcou
    }

    modal.startSaving()
    modal.error.value = ''

    try {
      const payload = {
        name: modal.payload.value.name,
        category_id: modal.payload.value.category_id,
        expense_nature_id: modal.payload.value.expense_nature_id || null,
        suggested_category: modal.payload.value.is_suggesting_category
          ? typeof modal.payload.value.suggested_category === 'string'
            ? modal.payload.value.suggested_category.trim()
            : modal.payload.value.suggested_category
              ? String(
                  (modal.payload.value.suggested_category as Record<string, unknown>).name ||
                    (modal.payload.value.suggested_category as Record<string, unknown>).title ||
                    modal.payload.value.suggested_category,
                ).trim()
              : null
          : null,
        is_active: modal.payload.value.is_active,
      }

      if (isEditing.value) {
        // Edit Product
        await updateProduct(modal.payload.value.id, payload)
      } else {
        // Create Product
        await createProduct(payload)
      }

      await refresh()
      await refreshPendingSuggestions()
      closeModal()
    } catch (err: unknown) {
      const e = err as Error
      modal.error.value = e.message
    } finally {
      modal.stopSaving()
    }
  }

  const toggleStatus = async (product: ProductRow) => {
    try {
      await toggleProductStatus(product)
      await refresh()
    } catch (err: unknown) {
      const e = err as Error
      alert(`Erro ao alterar status: ${e.message}`)
    }
  }
</script>

<template>
  <div>
    <PageHeader subtitle="Catálogo centralizado de produtos e materiais" title="Produtos" />

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

          <!-- Barra de Filtro -->
          <div class="bg-grey-lighten-4 py-3 px-4 border-bottom">
            <v-row align="center" no-gutters>
              <v-col class="pr-sm-2 mb-2 mb-sm-0" cols="12" md="4" sm="6">
                <UiSelect
                  v-model="selectedCategory"
                  class="mb-0"
                  clearable
                  hide-details
                  item-title="name"
                  item-value="id"
                  :items="filteredCategories"
                  label="Filtrar por Categoria"
                />
              </v-col>
              <v-col class="pl-sm-2" cols="12" md="4" sm="6">
                <UiSelect
                  v-model="statusFilter"
                  class="mb-0"
                  hide-details
                  item-title="title"
                  item-value="value"
                  :items="[
                    { title: 'Todos', value: 'all' },
                    { title: 'Ativos', value: 'active' },
                    { title: 'Inativos', value: 'inactive' },
                  ]"
                  label="Status"
                />
              </v-col>
            </v-row>
          </div>

          <v-divider />

          <UiTable
            :headers="[
              { text: 'Nome', value: 'name' },
              { text: 'Categoria (Material)', value: 'category' },
              { text: 'Status', value: 'is_active', align: 'center' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="products || []"
            :loading="pending"
          >
            <template v-if="!products?.length && !pending" #empty>
              Nenhum produto encontrado.
            </template>
            <template #item-name="{ item }">
              <NuxtLink
                class="text-decoration-none text-primary font-weight-bold"
                :to="`/products/${item.id}`"
              >
                {{ item.name }}
              </NuxtLink>
            </template>
            <template #item-category="{ item }">
              {{ item.product_categories?.name || '-' }}
              <span
                v-if="item.product_categories?.name === 'Outros' && item.suggested_category"
                class="text-caption text-grey ml-1"
              >
                (Sugestão: {{ item.suggested_category }})
              </span>
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
    </v-row>

    <!-- Modal Form -->
    <UiModal
      v-model="modal.isOpen.value"
      max-width="500px"
      :title="isEditing ? 'Editar Produto' : 'Novo Produto'"
      transparent-header
    >
      <UiAlert v-if="modal.error.value" class="mb-4" density="compact" type="error" variant="tonal">
        {{ modal.error.value }}
      </UiAlert>

      <UiInput v-model="modal.payload.value.name" label="Nome do Produto" />

      <UiSwitch
        v-model="modal.payload.value.is_suggesting_category"
        color="primary"
        label="Não encontrou a categoria? Sugerir nova"
      />

      <UiSelect
        v-if="!modal.payload.value.is_suggesting_category"
        v-model="modal.payload.value.category_id"
        item-title="name"
        item-value="id"
        :items="filteredCategories"
        label="Categoria de Material"
      />
      <UiAutocomplete
        v-model="modal.payload.value.expense_nature_id"
        item-title="name"
        item-value="id"
        :items="expenseNatures || []"
        :custom-filter="(value, query, item) => item?.raw?.id?.includes?.(query) || item?.raw?.name?.toLowerCase?.()?.includes?.(query?.toLowerCase?.())"
        label="Natureza de Despesa"
        clearable
      >
        <template #item="{ props, item }">
          <v-list-item v-bind="props" :subtitle="item.raw.id" />
        </template>
      </UiAutocomplete>

      <UiCombobox
        v-if="modal.payload.value.is_suggesting_category"
        v-model="modal.payload.value.suggested_category"
        hint="Digite uma nova ou escolha uma sugestão pendente de outros usuários."
        :items="pendingSuggestions || []"
        label="Qual categoria você sugere?"
        persistent-hint
        :return-object="false"
      />

      <UiSwitch
        v-model="modal.payload.value.is_active"
        color="success"
        hint="Indica se o produto está disponível para uso"
        label="Produto Ativo"
        persistent-hint
      />

      <template #actions>
        <UiButton :disabled="modal.isSaving.value" variant="text" @click="closeModal"
          >Cancelar</UiButton
        >
        <UiButton color="primary" :loading="modal.isSaving.value" @click="saveProduct">
          Salvar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
