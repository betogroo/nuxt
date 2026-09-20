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
      .select('*, product:products(*, product_categories(id, name))')
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
    <UiButton class="mb-4" prepend-icon="mdi-arrow-left" variant="text" @click="router.back()">
      Voltar para Demandas
    </UiButton>

    <!-- Cabeçalho da Demanda -->
    <UiCard v-if="demand" class="mb-6" transparent-header>
      <template #header>
        {{ demand.name }}
      </template>
      <v-row>
        <v-col cols="12" sm="3">
          <div class="text-caption text-grey">Tipo</div>
          <div class="text-body-1 font-weight-medium">
            {{ demand.type === 'consumption' ? 'Consumo' : 'Permanente' }}
          </div>
        </v-col>
        <v-col cols="12" sm="3">
          <div class="text-caption text-grey">Data da Disputa</div>
          <div class="text-body-1">
            {{
              demand.dispute_date
                ? new Date(demand.dispute_date).toLocaleDateString()
                : 'Não informada'
            }}
          </div>
        </v-col>
        <v-col cols="12" sm="3">
          <div class="text-caption text-grey">Abertura de Ofertas</div>
          <div class="text-body-1">
            {{
              demand.offer_opening_date
                ? new Date(demand.offer_opening_date).toLocaleString([], {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : 'Não informada'
            }}
          </div>
        </v-col>
        <v-col cols="12" sm="3">
          <div class="text-caption text-grey">ID</div>
          <div class="text-caption font-weight-mono">{{ demand.id.split('-')[0] }}</div>
        </v-col>
      </v-row>
    </UiCard>

    <!-- Lista de Produtos da Demanda -->
    <UiCard transparent-header>
      <template #header>
        Produtos na Demanda
        <v-spacer />
        <UiButton color="primary" prepend-icon="mdi-plus" @click="openAddModal">
          Adicionar Produto
        </UiButton>
      </template>

      <UiTable
        :headers="[
          { text: 'Produto', value: 'product' },
          { text: 'Categoria', value: 'category' },
          { text: 'Quantidade', value: 'quantity', align: 'center' },
          { text: 'Ações', value: 'actions', align: 'right' },
        ]"
        :items="items || []"
      >
        <template v-if="!items?.length && !itemsPending" #empty>
          Nenhum produto adicionado a esta demanda ainda.
        </template>
        <template #item-product="{ item }">
          <NuxtLink
            class="text-decoration-none text-primary font-weight-bold"
            :to="`/products/${item.product_id}`"
          >
            {{ item.product?.name || 'Produto desconhecido' }}
          </NuxtLink>
        </template>
        <template #item-category="{ item }">
          {{ (item.product as any)?.product_categories?.name || '-' }}
        </template>
        <template #item-quantity="{ item }">
          <v-chip class="cursor-pointer" size="small" @click="updateQuantity(item)">
            {{ item.quantity }}
            <v-icon class="ml-1" size="x-small">mdi-pencil</v-icon>
          </v-chip>
        </template>
        <template #item-actions="{ item }">
          <UiButton
            color="error"
            icon="mdi-delete"
            size="small"
            variant="text"
            @click="removeItem(item.id, item.product?.name || '')"
          />
        </template>
      </UiTable>
      <div v-if="itemsPending" class="text-center py-4">
        <v-progress-circular color="primary" indeterminate></v-progress-circular>
      </div>
    </UiCard>

    <!-- Modal Adicionar Produto -->
    <v-dialog v-model="isModalOpen" max-width="600px" persistent>
      <UiCard title="Inserir Produto na Demanda" transparent-header>
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
            :items="allProducts || []"
            label="Buscar Produto"
            placeholder="Digite o nome do produto..."
            variant="outlined"
          >
            <!-- Personalizando a pesquisa no front-end para simplificar -->
            <template #no-data>
              <div class="pa-3 text-center">
                <span class="text-grey mr-2">Produto não encontrado.</span>
                <UiButton
                  color="primary"
                  size="small"
                  variant="tonal"
                  @click="activateNewProductMode"
                >
                  Cadastrar novo
                </UiButton>
              </div>
            </template>
          </v-autocomplete>

          <UiInput
            v-if="selectedProductId"
            v-model.number="itemQuantity"
            class="mt-3"
            label="Quantidade"
            min="1"
            type="number"
          />
        </template>

        <!-- Seção de Cadastro Rápido de Novo Produto -->
        <template v-else>
          <v-alert class="mb-4" density="compact" type="info" variant="tonal">
            Você está cadastrando um novo produto. Ele será salvo no sistema e automaticamente
            adicionado à demanda.
          </v-alert>

          <UiInput v-model="newProductName" label="Nome do Produto" />
          <UiSelect
            v-model="newProductCategoryId"
            item-title="name"
            item-value="id"
            :items="categories || []"
            label="Categoria de Material"
          />
          <UiInput v-model.number="itemQuantity" label="Quantidade" min="1" type="number" />

          <div class="text-right">
            <UiButton size="small" variant="text" @click="isNewProductMode = false">
              Voltar à Busca
            </UiButton>
          </div>
        </template>

        <template #actions>
          <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
          <UiButton color="primary" :loading="isSaving" @click="saveToDemand">
            Adicionar à Demanda
          </UiButton>
        </template>
      </UiCard>
    </v-dialog>
  </v-container>
</template>
