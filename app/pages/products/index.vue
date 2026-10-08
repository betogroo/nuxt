<script setup lang="ts">
  import type { ProductRow } from '~/composables/useProducts'
  import { useZodForm } from '~/composables/useZodForm'
  import { productFormSchema } from '~/schemas/forms/product'

  definePageMeta({
    icon: 'packageSolid',
    middleware: ['uge'],
    navLabel: 'Produtos',
    navSubtitle: 'Catálogo de produtos e naturezas de despesa',
    navColor: 'info',
    navGroup: 'management',
    navOrder: 20,
    roles: ['admin', 'uge'],
    showIn: ['drawer', 'home'],
  })

  useHead({ title: 'Gerenciar Produtos' })

  const { fetchProducts, createProduct, updateProduct, toggleProductStatus } = useProducts()

  const { fetchAllActiveExpenseNatures, registerPendingExpenseNature } = useExpenseNatures()
  const { fetchAllActiveProductClasses, registerPendingProductClass } = useProductClasses()

  // Pagination & Filter State
  const { currentPage, itemsPerPage, totalItems, totalPages, resetPage } = usePagination()
  const selectedExpenseNature = ref<string | null>(null)
  const statusFilter = ref<string>('active')

  const { data: expenseNatures } = useAsyncData('expense-natures', fetchAllActiveExpenseNatures)
  const { data: productClasses } = useAsyncData('product-classes', fetchAllActiveProductClasses)

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
    resetPage()
  })

  const modal = useModal()
  const { errors, defineField, resetForm, handleSubmit } = useZodForm(productFormSchema, {
    id: '',
    name: '',
    expense_nature_id: null,
    is_suggesting_nature: false,
    suggested_nature_id: '',
    suggested_nature_name: '',
    product_class_id: null,
    is_suggesting_class: false,
    suggested_class_id: '',
    suggested_class_name: '',
    is_active: true,
  })

  const [name, nameProps] = defineField('name')
  const [expenseNatureId, expenseNatureIdProps] = defineField('expense_nature_id')
  const [productClassId, productClassIdProps] = defineField('product_class_id')
  const [isSuggestingNature, isSuggestingNatureProps] = defineField('is_suggesting_nature')
  const [suggestedNatureId, suggestedNatureIdProps] = defineField('suggested_nature_id')
  const [suggestedNatureName, suggestedNatureNameProps] = defineField('suggested_nature_name')
  const [isSuggestingClass, isSuggestingClassProps] = defineField('is_suggesting_class')
  const [suggestedClassId, suggestedClassIdProps] = defineField('suggested_class_id')
  const [suggestedClassName, suggestedClassNameProps] = defineField('suggested_class_name')
  const [isActive, isActiveProps] = defineField('is_active')
  const editingId = ref('')

  const isEditing = computed(() => !!editingId.value)

  const openAddModal = () => {
    resetForm({
      values: {
        id: '',
        name: '',
        expense_nature_id: null,
        is_suggesting_nature: false,
        suggested_nature_id: '',
        suggested_nature_name: '',
        product_class_id: null,
        is_suggesting_class: false,
        suggested_class_id: '',
        suggested_class_name: '',
        is_active: true,
      },
    })
    editingId.value = ''
    modal.open()
  }

  const openEditModal = (product: ProductRow) => {
    resetForm({
      values: {
        ...product,
        expense_nature_id: product.expense_nature_id || null,
        is_suggesting_nature: false,
        suggested_nature_id: '',
        suggested_nature_name: '',
        product_class_id: product.product_class_id || null,
        is_suggesting_class: false,
        suggested_class_id: '',
        suggested_class_name: '',
        is_active: product.is_active,
      },
    })
    editingId.value = product.id
    modal.open()
  }

  const saveProduct = handleSubmit(async (values) => {
    modal.startSaving()
    modal.error.value = ''
    try {
      let finalExpenseNatureId = values.expense_nature_id
      let finalProductClassId = values.product_class_id

      if (
        values.is_suggesting_nature &&
        values.suggested_nature_id &&
        values.suggested_nature_name
      ) {
        const expenseNature = await registerPendingExpenseNature({
          id: values.suggested_nature_id,
          name: values.suggested_nature_name,
        })
        finalExpenseNatureId = expenseNature.id
      }

      if (values.is_suggesting_class && values.suggested_class_id && values.suggested_class_name) {
        const pClass = await registerPendingProductClass({
          id: values.suggested_class_id,
          name: values.suggested_class_name,
        })
        finalProductClassId = pClass.id
      }

      const payload = {
        name: values.name,
        expense_nature_id: finalExpenseNatureId,
        product_class_id: finalProductClassId,
        is_active: values.is_active,
      }

      if (isEditing.value && editingId.value) {
        await updateProduct(editingId.value, payload)
      } else {
        await createProduct(payload)
      }

      await refresh()
      modal.close()
    } catch (err) {
      modal.error.value = err instanceof Error ? err.message : String(err)
    } finally {
      modal.stopSaving()
    }
  })

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
        <UiIcon class="mr-2" color="primary" name="product" />
        Lista de Produtos
        <UiChip v-if="totalItems > 0" class="ml-2" label size="x-small" variant="tonal">
          {{ totalItems }}
        </UiChip>
        <UiSpacer />
        <!-- Filtros inline -->
        <div class="d-flex gap-2 align-center">
          <div class="d-flex gap-2">
            <UiSelect
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
            <UiSelect
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
          <UiDivider class="mx-2" vertical />
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
            Novo Produto
          </UiButton>
        </div>
      </template>

      <UiTable
        :headers="[
          { text: 'Nome', value: 'name' },
          { text: 'Natureza de Despesa', value: 'expense_nature' },
          { text: 'Classe', value: 'product_class' },
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
            <UiChip color="blue-grey" label size="sm" variant="soft">
              {{ item.expense_natures.id }}
            </UiChip>
            <span class="text-body-2">{{ item.expense_natures.name }}</span>
          </div>
          <span v-else class="text-medium-emphasis">—</span>
        </template>
        <template #item-product_class="{ item }">
          <div v-if="item.product_classes" class="d-flex align-center gap-2">
            <UiChip color="teal" label size="sm" variant="soft">
              {{ item.product_classes.id }}
            </UiChip>
            <span class="text-body-2">{{ item.product_classes.name }}</span>
          </div>
          <span v-else class="text-medium-emphasis">—</span>
        </template>
        <template #item-is_active="{ item }">
          <UiSwitch
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
            icon="next"
            size="small"
            :to="`/products/${item.id}`"
            variant="text"
          />
          <UiButton
            color="default"
            icon="editOutline"
            size="small"
            variant="text"
            @click="openEditModal(item)"
          />
        </template>
      </UiTable>

      <div v-if="totalPages > 1" class="d-flex justify-center pa-4">
        <UiPagination
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
      <UiAlert v-if="modal.error.value" class="mb-4" size="sm" type="error" variant="soft">
        {{ modal.error.value }}
      </UiAlert>

      <UiInput
        v-model="name"
        v-bind="nameProps"
        :error-messages="errors.name"
        label="Nome do Produto *"
      />

      <UiSwitch
        v-model="isSuggestingNature"
        v-bind="isSuggestingNatureProps"
        class="mb-3"
        color="primary"
        :error-messages="errors.is_suggesting_nature"
        label="Não encontrou a natureza? Sugerir nova"
      />

      <UiAutocomplete
        v-if="!isSuggestingNature"
        v-model="expenseNatureId"
        v-bind="expenseNatureIdProps"
        class="mb-3"
        density="comfortable"
        :error-messages="errors.expense_nature_id"
        :item-title="
          (item: Record<string, unknown>) =>
            typeof item === 'object' && item !== null ? `${item.id} - ${item.name}` : ''
        "
        item-value="id"
        :items="expenseNatures || []"
        label="Natureza de Despesa *"
        rounded="lg"
        variant="outlined"
      />

      <div v-else class="d-flex gap-3 mb-3">
        <UiInput
          v-model="suggestedNatureId"
          v-bind="suggestedNatureIdProps"
          :error-messages="errors.suggested_nature_id"
          label="Código (Ex: 33903000)"
        />
        <UiInput
          v-model="suggestedNatureName"
          v-bind="suggestedNatureNameProps"
          :error-messages="errors.suggested_nature_name"
          label="Nome da Natureza"
        />
      </div>

      <UiSwitch
        v-model="isSuggestingClass"
        v-bind="isSuggestingClassProps"
        class="mb-3"
        color="primary"
        :error-messages="errors.is_suggesting_class"
        label="Não encontrou a classe? Sugerir nova"
      />

      <UiAutocomplete
        v-if="!isSuggestingClass"
        v-model="productClassId"
        v-bind="productClassIdProps"
        class="mb-3"
        clearable
        density="comfortable"
        :error-messages="errors.product_class_id"
        :item-title="
          (item: Record<string, unknown>) =>
            typeof item === 'object' && item !== null ? `${item.id} - ${item.name}` : ''
        "
        item-value="id"
        :items="productClasses || []"
        label="Classe de Produto"
        rounded="lg"
        variant="outlined"
      />

      <div v-else class="d-flex gap-3 mb-3">
        <UiInput
          v-model="suggestedClassId"
          v-bind="suggestedClassIdProps"
          :error-messages="errors.suggested_class_id"
          label="Código (Ex: 5915)"
        />
        <UiInput
          v-model="suggestedClassName"
          v-bind="suggestedClassNameProps"
          :error-messages="errors.suggested_class_name"
          label="Nome da Classe"
        />
      </div>

      <UiSwitch
        v-model="isActive"
        v-bind="isActiveProps"
        color="success"
        :error-messages="errors.is_active"
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
