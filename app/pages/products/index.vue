<script setup lang="ts">
  import type { ProductRow } from '~/composables/useProducts'

  definePageMeta({
    icon: 'mdi-package-variant',
    middleware: ['uge'],
  })

  useHead({ title: 'Gerenciar Produtos' })

  const { fetchProducts, createProduct, updateProduct, toggleProductStatus } = useProducts()

  const { fetchAllActiveExpenseNatures, registerPendingExpenseNature } = useExpenseNatures()

  // Pagination & Filter State
  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const totalItems = ref(0)
  const selectedExpenseNature = ref<string | null>(null)
  const statusFilter = ref<string>('active')

  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  const { data: expenseNatures } = useAsyncData('expense-natures', fetchAllActiveExpenseNatures)

  const {
    data: products,
    pending,
    refresh,
  } = useAsyncData(
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
    expense_nature_id: null,
    is_suggesting_nature: false,
    suggested_nature_id: '',
    suggested_nature_name: '',
    is_active: true,
  })

  const isEditing = computed(() => !!modal.payload.value.id)

  const openAddModal = () => {
    modal.open({
      id: '',
      name: '',
      expense_nature_id: null,
      is_suggesting_nature: false,
      suggested_nature_id: '',
      suggested_nature_name: '',
      is_active: true,
    })
  }

  const openEditModal = (product: ProductRow) => {
    modal.open({
      ...product,
      expense_nature_id: product.expense_nature_id || null,
      is_suggesting_nature: false,
      suggested_nature_id: '',
      suggested_nature_name: '',
    })
  }

  const saveProduct = async () => {
    if (modal.payload.value.is_suggesting_nature) {
      if (
        !modal.payload.value.name ||
        !modal.payload.value.suggested_nature_id ||
        !modal.payload.value.suggested_nature_name
      ) {
        modal.error.value = 'Nome do Produto e Código/Nome da Natureza são obrigatórios.'
        return
      }
    } else {
      if (!modal.payload.value.name || !modal.payload.value.expense_nature_id) {
        modal.error.value = 'Nome e Natureza de Despesa são obrigatórios.'
        return
      }
    }

    modal.startSaving()
    try {
      let finalExpenseNatureId = modal.payload.value.expense_nature_id

      if (modal.payload.value.is_suggesting_nature) {
        const expenseNature = await registerPendingExpenseNature({
          id: modal.payload.value.suggested_nature_id,
          name: modal.payload.value.suggested_nature_name,
        })
        finalExpenseNatureId = expenseNature.id
      }

      const payload = {
        name: modal.payload.value.name,
        expense_nature_id: finalExpenseNatureId,
        is_active: modal.payload.value.is_active,
      }

      if (isEditing.value) {
        await updateProduct(modal.payload.value.id as string, payload)
      } else {
        await createProduct(payload)
      }
      await refresh()
      modal.close()
      modal.stopSaving()
    } catch (e: unknown) {
      modal.stopSaving(e instanceof Error ? e.message : String(e))
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
    <PageHeader subtitle="Cadastre e gerencie os produtos do sistema" title="Produtos">
    </PageHeader>

    <UiCard>
      <template #header>
        <v-icon class="mr-2" color="primary" icon="mdi-package-variant-outline" />
        Lista de Produtos
        <v-chip v-if="totalItems > 0" class="ml-2" label size="x-small" variant="tonal">
          {{ totalItems }}
        </v-chip>
        <v-spacer />
        <!-- Filtros inline -->
        <div class="d-flex gap-2 align-center">
          <div class="d-flex gap-2">
            <v-select
              v-model="selectedExpenseNature"
              clearable
              density="compact"
              hide-details
              item-title="name"
              item-value="id"
              :items="expenseNatures || []"
              label="Natureza de Despesa"
              rounded="lg"
              style="min-width: 200px; max-width: 260px"
              variant="outlined"
            />
            <v-select
              v-model="statusFilter"
              density="compact"
              hide-details
              item-title="title"
              item-value="value"
              :items="[
                { title: 'Ativos', value: 'active' },
                { title: 'Inativos', value: 'inactive' },
                { title: 'Todos', value: 'all' },
              ]"
              label="Status"
              rounded="lg"
              style="min-width: 130px; max-width: 160px"
              variant="outlined"
            />
          </div>
          <v-divider class="mx-2" vertical />
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
        </div>
      </template>

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
            :to="`/products/${item.id}`"
          >
            {{ item.name }}
          </NuxtLink>
        </template>
        <template #item-expense_nature="{ item }">
          <div v-if="item.expense_natures" class="d-flex align-center gap-2">
            <v-chip color="blue-grey" label size="small" variant="tonal">
              {{ item.expense_natures.id }}
            </v-chip>
            <span class="text-body-2">{{ item.expense_natures.name }}</span>
          </div>
          <span v-else class="text-medium-emphasis">—</span>
        </template>
        <template #item-is_active="{ item }">
          <v-switch
            color="success"
            density="compact"
            hide-details
            :model-value="item.is_active"
            @update:model-value="toggleStatus(item)"
          />
        </template>
        <template #item-actions="{ item }">
          <UiButton
            color="primary"
            icon="mdi-arrow-right"
            size="small"
            :to="`/products/${item.id}`"
            variant="text"
          />
          <UiButton
            color="default"
            icon="mdi-pencil-outline"
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
          rounded="lg"
          total-visible="7"
        />
      </div>
    </UiCard>

    <!-- Add/Edit Modal -->
    <UiModal
      v-model="modal.isOpen.value"
      max-width="500px"
      :title="isEditing ? 'Editar Produto' : 'Novo Produto'"
    >
      <UiAlert v-if="modal.error.value" class="mb-4" density="compact" type="error" variant="tonal">
        {{ modal.error.value }}
      </UiAlert>

      <UiInput v-model="modal.payload.value.name" label="Nome do Produto *" />

      <UiSwitch
        v-model="modal.payload.value.is_suggesting_nature"
        class="mb-3"
        color="primary"
        label="Não encontrou a natureza? Sugerir nova"
      />

      <v-autocomplete
        v-if="!modal.payload.value.is_suggesting_nature"
        v-model="modal.payload.value.expense_nature_id"
        class="mb-3"
        density="comfortable"
        :item-title="
          (item) => (typeof item === 'object' && item !== null ? `${item.id} - ${item.name}` : '')
        "
        item-value="id"
        :items="expenseNatures || []"
        label="Natureza de Despesa *"
        rounded="lg"
        variant="outlined"
      />

      <div v-else class="d-flex gap-3 mb-3">
        <UiInput v-model="modal.payload.value.suggested_nature_id" label="Código (Ex: 33903000)" />
        <UiInput v-model="modal.payload.value.suggested_nature_name" label="Nome da Natureza" />
      </div>

      <UiSwitch
        v-model="modal.payload.value.is_active"
        color="success"
        label="Produto ativo no sistema"
      />

      <template #actions>
        <UiButton variant="text" @click="modal.close()">Cancelar</UiButton>
        <UiButton
          color="primary"
          :loading="modal.isSaving.value"
          variant="flat"
          @click="saveProduct"
        >
          Salvar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
