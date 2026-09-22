<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  useHead({ title: 'Produtos' })

  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  type ProductRow = Database['public']['Tables']['products']['Row'] & {
    product_categories?: { id: string; name: string } | null
  }

  // Pagination & Filter State
  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const totalItems = ref(0)
  // selectedCategory will now hold category_id instead of material_category string
  const selectedCategory = ref<string | null>(null)

  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  // Fetch unique categories for the filter
  const { data: categories } = useAsyncData('product-categories', async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    if (error) return []
    return data
  })

  // Fetch Products with Pagination and Filter
  const {
    data: products,
    pending,
    refresh,
  } = useAsyncData(
    'products-list',
    async () => {
      const from = (currentPage.value - 1) * itemsPerPage.value
      const to = from + itemsPerPage.value - 1

      let query = supabase
        .from('products')
        .select('*, product_categories(id, name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (selectedCategory.value) {
        query = query.eq('category_id', selectedCategory.value)
      }

      const { data, count, error } = await query

      if (error) {
        console.error(error)
        return []
      }

      totalItems.value = count || 0
      return data
    },
    {
      watch: [currentPage, selectedCategory],
    },
  )

  // When category changes, reset page to 1
  watch(selectedCategory, () => {
    currentPage.value = 1
  })

  // Modal State
  const isModalOpen = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')
  const isEditing = ref(false)

  // Form State
  const defaultForm = {
    id: '',
    name: '',
    category_id: '',
    suggested_category: '',
    is_active: true,
  }
  const form = ref({ ...defaultForm })

  const isOutrosCategory = computed(() => {
    const cat = categories.value?.find((c) => c.id === form.value.category_id)
    return cat?.name === 'Outros'
  })

  const openAddModal = () => {
    form.value = { ...defaultForm }
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (product: ProductRow) => {
    form.value = {
      ...product,
      suggested_category: product.suggested_category || '',
    }
    isEditing.value = true
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveProduct = async () => {
    if (!form.value.name || !form.value.category_id) {
      saveError.value = 'Nome e Categoria são obrigatórios.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      const payload = {
        name: form.value.name,
        category_id: form.value.category_id,
        suggested_category: isOutrosCategory.value ? form.value.suggested_category || null : null,
        is_active: form.value.is_active,
      }

      if (isEditing.value) {
        // Edit Product
        const { error } = await supabase.from('products').update(payload).eq('id', form.value.id)

        if (error) throw error

        await logAction('UPDATE_PRODUCT', `Produto atualizado: ${form.value.name}`, user.value?.id)
      } else {
        // Create Product
        const { error } = await supabase.from('products').insert(payload)

        if (error) throw error

        await logAction('CREATE_PRODUCT', `Novo produto criado: ${form.value.name}`, user.value?.id)
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

  const toggleStatus = async (product: ProductRow) => {
    try {
      const newStatus = !product.is_active
      const { error } = await supabase
        .from('products')
        .update({ is_active: newStatus })
        .eq('id', product.id)

      if (error) throw error

      await logAction(
        'TOGGLE_PRODUCT_STATUS',
        `Produto ${product.name} alterado para ${newStatus ? 'ATIVO' : 'INATIVO'}`,
        user.value?.id,
      )
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
              <v-col cols="12" md="4" sm="6">
                <UiSelect
                  v-model="selectedCategory"
                  class="mb-0"
                  clearable
                  hide-details
                  item-title="name"
                  item-value="id"
                  :items="categories || []"
                  label="Filtrar por Categoria"
                />
              </v-col>
            </v-row>
          </div>

          <v-divider />

          <UiTable
            :headers="[
              { text: 'Nome', value: 'name' },
              { text: 'Categoria (Material)', value: 'category' },
              { text: 'Status', value: 'is_active' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="products || []"
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
              <v-chip
                class="cursor-pointer"
                :color="item.is_active ? 'success' : 'error'"
                size="small"
                variant="flat"
                @click="toggleStatus(item)"
              >
                {{ item.is_active ? 'ATIVO' : 'INATIVO' }}
              </v-chip>
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
    <v-dialog v-model="isModalOpen" max-width="500px">
      <UiCard :title="isEditing ? 'Editar Produto' : 'Novo Produto'" transparent-header>
        <v-alert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ saveError }}
        </v-alert>

        <UiInput v-model="form.name" label="Nome do Produto" />

        <UiSelect
          v-model="form.category_id"
          item-title="name"
          item-value="id"
          :items="categories || []"
          label="Categoria de Material"
        />

        <UiInput
          v-if="isOutrosCategory"
          v-model="form.suggested_category"
          class="mb-4"
          hint="Digite a categoria desejada para que o administrador possa cadastrá-la futuramente."
          label="Qual categoria você sugere?"
          persistent-hint
        />

        <v-switch
          v-model="form.is_active"
          color="success"
          hint="Indica se o produto está disponível para uso"
          label="Produto Ativo"
          persistent-hint
        />

        <template #actions>
          <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
          <UiButton color="primary" :loading="isSaving" @click="saveProduct"> Salvar </UiButton>
        </template>
      </UiCard>
    </v-dialog>
  </div>
</template>
