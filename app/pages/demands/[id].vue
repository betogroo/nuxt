<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  const route = useRoute()
  const router = useRouter()
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  const demandId = route.params.id as string

  // Fetch Demand Details
  const { data: demand } = useAsyncData(`demand-${demandId}`, async () => {
    const { data, error } = await supabase.from('demands').select('*').eq('id', demandId).single()

    if (error) {
      console.error('Demand error:', error)
      return null
    }
    return data
  })

  useHead({
    title: computed(() => (demand.value ? `Demanda: ${demand.value.name}` : 'Detalhes da Demanda')),
  })

  // Fetch Demand Products

  const {
    data: items,
    pending: itemsPending,
    refresh: refreshItems,
  } = useAsyncData(`demand-items-${demandId}`, async () => {
    const { data, error } = await supabase
      .from('demand_products')
      .select('*, product:products(*)')
      .eq('demand_id', demandId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Demand items error:', error)
      return []
    }
    return data
  })

  // Fetch all active products for the autocomplete
  const { data: allProducts, refresh: refreshProducts } = useAsyncData(
    'all-active-products',
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_categories(id, name)')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('Products error:', error)
        return []
      }
      return data
    },
  )

  const { data: categories } = useAsyncData('active-categories', async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    if (error) return []
    return data
  })

  // Modal State
  const isModalOpen = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  const isNewProductMode = ref(false)

  // Form states
  const selectedProductId = ref<string | null>(null)
  const itemQuantity = ref<number>(1)
  const searchProductText = ref('')

  // New Product Form state
  const newProductName = ref('')
  const newProductCategoryId = ref<string | null>(null)

  const openAddModal = () => {
    selectedProductId.value = null
    itemQuantity.value = 1
    searchProductText.value = ''
    isNewProductMode.value = false
    newProductName.value = ''
    newProductCategoryId.value = null
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const activateNewProductMode = () => {
    newProductName.value = searchProductText.value
    isNewProductMode.value = true
  }

  const saveToDemand = async () => {
    isSaving.value = true
    saveError.value = ''

    try {
      let finalProductId = selectedProductId.value

      // Create new product if in new product mode
      if (isNewProductMode.value) {
        if (!newProductName.value || !newProductCategoryId.value) {
          throw new Error('Nome e Categoria são obrigatórios para novo produto.')
        }

        const { data: newProd, error: prodError } = await supabase
          .from('products')
          .insert({
            name: newProductName.value,
            category_id: newProductCategoryId.value,
            is_active: true,
          })
          .select()
          .single()

        if (prodError) throw prodError

        await logAction(
          'CREATE_PRODUCT',
          `Novo produto criado via demanda: ${newProd.name}`,
          user.value?.id,
        )

        finalProductId = newProd.id
        await refreshProducts() // reload product list
      }

      if (!finalProductId) {
        throw new Error('Selecione um produto ou cadastre um novo.')
      }

      if (itemQuantity.value <= 0) {
        throw new Error('A quantidade deve ser maior que zero.')
      }

      // Check if product already in demand
      const alreadyExists = items.value?.find((i) => i.product_id === finalProductId)
      if (alreadyExists) {
        // Update quantity
        const { error } = await supabase
          .from('demand_products')
          .update({ quantity: Number(alreadyExists.quantity) + Number(itemQuantity.value) })
          .eq('id', alreadyExists.id)

        if (error) throw error

        await logAction(
          'UPDATE_DEMAND_PRODUCT',
          `Atualizada a quantidade do produto na demanda ${demandId}`,
          user.value?.id,
        )
      } else {
        // Insert new association
        const { error } = await supabase.from('demand_products').insert({
          demand_id: demandId,
          product_id: finalProductId,
          quantity: itemQuantity.value,
        })

        if (error) throw error

        await logAction(
          'ADD_DEMAND_PRODUCT',
          `Produto adicionado à demanda ${demandId}`,
          user.value?.id,
        )
      }

      await refreshItems()
      closeModal()
    } catch (err: unknown) {
      saveError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isSaving.value = false
    }
  }

  const removeItem = async (itemId: string, productName: string) => {
    if (!confirm(`Deseja realmente remover o produto ${productName} desta demanda?`)) return

    try {
      const { error } = await supabase.from('demand_products').delete().eq('id', itemId)

      if (error) throw error

      await logAction(
        'REMOVE_DEMAND_PRODUCT',
        `Produto ${productName} removido da demanda ${demandId}`,
        user.value?.id,
      )
      await refreshItems()
    } catch (err: unknown) {
      alert(`Erro ao remover: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const updateQuantity = async (item: {
    id: string
    quantity: number
    product: { name: string }
  }) => {
    const newQtdStr = prompt(`Nova quantidade para ${item.product.name}:`, String(item.quantity))
    if (newQtdStr === null) return

    const newQtd = Number(newQtdStr)
    if (isNaN(newQtd) || newQtd <= 0) {
      alert('Quantidade inválida.')
      return
    }

    try {
      const { error } = await supabase
        .from('demand_products')
        .update({ quantity: newQtd })
        .eq('id', item.id)

      if (error) throw error

      await logAction(
        'UPDATE_DEMAND_PRODUCT',
        `Quantidade atualizada para ${newQtd} (${item.product.name})`,
        user.value?.id,
      )
      await refreshItems()
    } catch (err: unknown) {
      alert(`Erro ao atualizar quantidade: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
</script>

<template>
  <v-container>
    <v-btn class="mb-4" prepend-icon="mdi-arrow-left" variant="text" @click="router.back()">
      Voltar para Demandas
    </v-btn>

    <!-- Cabeçalho da Demanda -->
    <v-card v-if="demand" class="mb-6">
      <v-card-title class="bg-primary text-white pa-4">
        {{ demand.name }}
      </v-card-title>
      <v-card-text class="pa-4">
        <v-row>
          <v-col cols="12" sm="4">
            <div class="text-caption text-grey">Tipo</div>
            <div class="text-body-1 font-weight-medium">
              {{ demand.type === 'consumption' ? 'Consumo' : 'Permanente' }}
            </div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-caption text-grey">Data da Disputa</div>
            <div class="text-body-1">
              {{
                demand.dispute_date
                  ? new Date(demand.dispute_date).toLocaleDateString()
                  : 'Não informada'
              }}
            </div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-caption text-grey">ID</div>
            <div class="text-caption font-weight-mono">{{ demand.id.split('-')[0] }}</div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Lista de Produtos da Demanda -->
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        Produtos na Demanda
        <v-spacer />
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddModal">
          Adicionar Produto
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-table hover>
        <thead>
          <tr>
            <th class="text-left">Produto</th>
            <th class="text-left">Categoria</th>
            <th class="text-center">Quantidade</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <NuxtLink
                class="text-decoration-none text-primary font-weight-bold"
                :to="`/products/${item.product_id}`"
              >
                {{ item.product?.name || 'Produto desconhecido' }}
              </NuxtLink>
            </td>
            <td>{{ item.product?.product_categories?.name || '-' }}</td>
            <td class="text-center">
              <v-chip class="cursor-pointer" size="small" @click="updateQuantity(item)">
                {{ item.quantity }}
                <v-icon class="ml-1" size="x-small">mdi-pencil</v-icon>
              </v-chip>
            </td>
            <td class="text-right">
              <v-btn
                color="error"
                icon="mdi-delete"
                size="small"
                variant="text"
                @click="removeItem(item.id, item.product?.name || '')"
              />
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-card-text v-if="!items?.length && !itemsPending" class="text-center text-grey">
        Nenhum produto adicionado a esta demanda ainda.
      </v-card-text>
      <v-card-text v-if="itemsPending" class="text-center">
        <v-progress-circular color="primary" indeterminate></v-progress-circular>
      </v-card-text>
    </v-card>

    <!-- Modal Adicionar Produto -->
    <v-dialog v-model="isModalOpen" max-width="600px" persistent>
      <v-card>
        <v-card-title class="pa-4 d-flex justify-space-between align-center">
          Inserir Produto na Demanda
          <v-btn icon="mdi-close" variant="text" @click="closeModal" />
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-4">
          <v-alert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
            {{ saveError }}
          </v-alert>

          <!-- Seção de Busca de Produto Existente -->
          <template v-if="!isNewProductMode">
            <v-autocomplete
              v-model="selectedProductId"
              v-model:search="searchProductText"
              clearable
              density="comfortable"
              item-title="name"
              item-value="id"
              :items="allProducts"
              label="Buscar Produto"
              placeholder="Digite o nome do produto..."
              variant="outlined"
            >
              <!-- Personalizando a pesquisa no front-end para simplificar -->
              <template #no-data>
                <div class="pa-3 text-center">
                  <span class="text-grey mr-2">Produto não encontrado.</span>
                  <v-btn
                    color="primary"
                    size="small"
                    variant="tonal"
                    @click="activateNewProductMode"
                  >
                    Cadastrar novo
                  </v-btn>
                </div>
              </template>
            </v-autocomplete>

            <v-text-field
              v-if="selectedProductId"
              v-model.number="itemQuantity"
              class="mt-3"
              density="comfortable"
              label="Quantidade"
              min="1"
              type="number"
              variant="outlined"
            />
          </template>

          <!-- Seção de Cadastro Rápido de Novo Produto -->
          <template v-else>
            <v-alert class="mb-4" density="compact" type="info" variant="tonal">
              Você está cadastrando um novo produto. Ele será salvo no sistema e automaticamente
              adicionado à demanda.
            </v-alert>

            <v-text-field
              v-model="newProductName"
              density="comfortable"
              label="Nome do Produto"
              variant="outlined"
            />
            <v-select
              v-model="newProductCategoryId"
              density="comfortable"
              item-title="name"
              item-value="id"
              :items="categories"
              label="Categoria de Material"
              variant="outlined"
            />
            <v-text-field
              v-model.number="itemQuantity"
              density="comfortable"
              label="Quantidade"
              min="1"
              type="number"
              variant="outlined"
            />

            <div class="text-right">
              <v-btn size="small" variant="text" @click="isNewProductMode = false">
                Voltar à Busca
              </v-btn>
            </div>
          </template>
        </v-card-text>

        <v-divider />

        <v-card-actions class="px-4 py-3 justify-end">
          <v-btn :disabled="isSaving" variant="text" @click="closeModal">Cancelar</v-btn>
          <v-btn color="primary" :loading="isSaving" variant="flat" @click="saveToDemand">
            Adicionar à Demanda
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
