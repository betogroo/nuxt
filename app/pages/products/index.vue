<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  useHead({ title: 'Produtos' })

  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  type ProductRow = Database['public']['Tables']['products']['Row']

  // Pagination & Filter State
  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const totalItems = ref(0)
  const selectedCategory = ref<string | null>(null)

  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  // Fetch unique categories for the filter
  const { data: categories } = useAsyncData('product-categories', async () => {
    // Light fetch of all products to extract unique categories
    const { data, error } = await supabase.from('products').select('material_category')
    if (error) return []
    const unique = [...new Set(data.map((p) => p.material_category))]
    return unique.sort()
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
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (selectedCategory.value) {
        query = query.eq('material_category', selectedCategory.value)
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
    material_category: '',
    is_active: true,
  }
  const form = ref({ ...defaultForm })

  const openAddModal = () => {
    form.value = { ...defaultForm }
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (product: ProductRow) => {
    form.value = { ...product }
    isEditing.value = true
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveProduct = async () => {
    if (!form.value.name || !form.value.material_category) {
      saveError.value = 'Nome e Categoria são obrigatórios.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      if (isEditing.value) {
        // Edit Product
        const { error } = await supabase
          .from('products')
          .update({
            name: form.value.name,
            material_category: form.value.material_category,
            is_active: form.value.is_active,
          })
          .eq('id', form.value.id)

        if (error) throw error

        await logAction('UPDATE_PRODUCT', `Produto atualizado: ${form.value.name}`, user.value?.id)
      } else {
        // Create Product
        const { error } = await supabase.from('products').insert({
          name: form.value.name,
          material_category: form.value.material_category,
          is_active: form.value.is_active,
        })

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
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            Produtos
            <v-spacer />
            <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddModal">
              Novo Produto
            </v-btn>
            <v-btn
              class="ml-2"
              icon="mdi-refresh"
              :loading="pending"
              variant="text"
              @click="refresh"
            />
          </v-card-title>

          <v-divider />

          <!-- Barra de Filtro -->
          <v-card-text class="bg-grey-lighten-4 py-3">
            <v-row align="center">
              <v-col cols="12" md="4" sm="6">
                <v-select
                  v-model="selectedCategory"
                  clearable
                  density="compact"
                  hide-details
                  :items="categories"
                  label="Filtrar por Categoria"
                  variant="outlined"
                />
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider />

          <v-table hover>
            <thead>
              <tr>
                <th class="text-left">Nome</th>
                <th class="text-left">Categoria (Material)</th>
                <th class="text-left">Status</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in products" :key="product.id">
                <td>
                  <NuxtLink
                    class="text-decoration-none text-primary font-weight-bold"
                    :to="`/products/${product.id}`"
                  >
                    {{ product.name }}
                  </NuxtLink>
                </td>
                <td>{{ product.material_category }}</td>
                <td>
                  <v-chip
                    class="cursor-pointer"
                    :color="product.is_active ? 'success' : 'error'"
                    size="small"
                    variant="flat"
                    @click="toggleStatus(product)"
                  >
                    {{ product.is_active ? 'ATIVO' : 'INATIVO' }}
                  </v-chip>
                </td>
                <td class="text-right">
                  <v-btn
                    color="primary"
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click="openEditModal(product)"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>

          <v-card-text v-if="!products?.length && !pending" class="text-center text-grey">
            Nenhum produto encontrado.
          </v-card-text>

          <!-- Paginação -->
          <v-card-actions v-if="totalPages > 1" class="justify-center py-4">
            <v-pagination
              v-model="currentPage"
              density="comfortable"
              :length="totalPages"
              :total-visible="7"
            />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Modal Form -->
    <v-dialog v-model="isModalOpen" max-width="500px">
      <v-card>
        <v-card-title class="pa-4">
          {{ isEditing ? 'Editar Produto' : 'Novo Produto' }}
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-4">
          <v-alert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
            {{ saveError }}
          </v-alert>

          <v-text-field
            v-model="form.name"
            class="mb-3"
            density="comfortable"
            label="Nome do Produto"
            variant="outlined"
          />

          <v-text-field
            v-model="form.material_category"
            class="mb-3"
            density="comfortable"
            label="Categoria de Material"
            variant="outlined"
          />

          <v-switch
            v-model="form.is_active"
            color="success"
            hint="Indica se o produto está disponível para uso"
            label="Produto Ativo"
            persistent-hint
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="px-4 py-3 justify-end">
          <v-btn :disabled="isSaving" variant="text" @click="closeModal">Cancelar</v-btn>
          <v-btn color="primary" :loading="isSaving" variant="flat" @click="saveProduct">
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
