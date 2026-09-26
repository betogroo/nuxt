<script setup lang="ts">
  const route = useRoute()
  const router = useRouter()

  const demandId = route.params.id as string
  const supplierId = route.params.supplierId as string

  const { fetchDemandDetails } = useDemands()
  const { fetchSupplierById } = useSuppliers()
  const { fetchDemandProducts } = useDemandProducts()

  const { data: demand } = useAsyncData(`demand-${demandId}`, () => fetchDemandDetails(demandId))
  const { data: supplier } = useAsyncData(`supplier-${supplierId}`, () => fetchSupplierById(supplierId))
  const { data: demandProducts, pending } = useAsyncData(`demand-products-${demandId}`, () => fetchDemandProducts(demandId))

  const wonItems = computed(() => {
    if (!demandProducts.value) return []

    const items = []

    for (const product of demandProducts.value) {
      const bids = product.demand_product_bids || []
      if (bids.length === 0) continue

      let minAmount = Infinity
      let winningBid: any = null

      bids.forEach(bid => {
        if (bid.amount < minAmount) {
          minAmount = bid.amount
          winningBid = bid
        }
      })

      if (winningBid && winningBid.supplier_id === supplierId) {
        items.push({
          ...product,
          winning_bid_amount: winningBid.amount,
          subtotal: winningBid.amount * (product.quantity || 1)
        })
      }
    }

    return items
  })

  const grandTotal = computed(() => {
    return wonItems.value.reduce((sum, item) => sum + item.subtotal, 0)
  })

  const goBack = () => {
    router.push(`/demands/${demandId}`)
  }
</script>

<template>
  <v-container>
    <div class="mb-4 d-flex align-center">
      <UiButton icon="mdi-arrow-left" variant="text" @click="goBack" />
      <h2 class="text-h5 ml-2">Itens Vencidos pelo Fornecedor</h2>
    </div>

    <v-row>
      <v-col cols="12" md="4">
        <UiCard title="Dados do Fornecedor" variant="outlined" class="mb-4">
          <v-list density="compact" class="bg-transparent" v-if="supplier">
            <v-list-item>
              <template #prepend>
                <v-icon color="grey">mdi-domain</v-icon>
              </template>
              <v-list-item-title>Razão Social</v-list-item-title>
              <v-list-item-subtitle class="text-wrap">{{ supplier.company_name }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template #prepend>
                <v-icon color="grey">mdi-card-account-details</v-icon>
              </template>
              <v-list-item-title>CNPJ</v-list-item-title>
              <v-list-item-subtitle>{{ supplier.cnpj }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="supplier.email">
              <template #prepend>
                <v-icon color="grey">mdi-email</v-icon>
              </template>
              <v-list-item-title>E-mail</v-list-item-title>
              <v-list-item-subtitle>{{ supplier.email }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </UiCard>

        <UiCard title="Resumo" variant="outlined">
          <div class="text-center pa-4">
            <div class="text-caption text-grey text-uppercase font-weight-bold mb-1">Total Arrematado</div>
            <div class="text-h4 text-success font-weight-bold">
              {{ new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotal) }}
            </div>
            <div class="text-body-2 text-grey mt-2">Em {{ wonItems.length }} itens</div>
          </div>
        </UiCard>
      </v-col>

      <v-col cols="12" md="8">
        <UiCard title="Itens Arrematados" variant="outlined">
          <div v-if="pending" class="text-center py-4">
            <v-progress-circular color="primary" indeterminate></v-progress-circular>
          </div>
          <UiTable
            v-else
            :headers="[
              { text: 'Produto', value: 'product' },
              { text: 'Qtd.', value: 'quantity', align: 'center' },
              { text: 'Valor Unit.', value: 'unit_price', align: 'right' },
              { text: 'Subtotal', value: 'subtotal', align: 'right' }
            ]"
            :items="wonItems"
          >
            <template #empty>
              <div class="text-center py-4 text-grey">
                Nenhum item vencido por este fornecedor.
              </div>
            </template>
            <template #item-product="{ item }">
              <NuxtLink
                class="text-decoration-none text-primary font-weight-bold"
                :to="`/demands/${demandId}/items/${item.id}`"
              >
                {{ item.product_name_snapshot || item.product?.name || 'Produto desconhecido' }}
              </NuxtLink>
              <div class="text-caption text-grey">
                {{ item.unit_name_snapshot || item.measurement_units?.name || 'Un.' }}
              </div>
            </template>
            <template #item-quantity="{ item }">
              {{ item.quantity }}
            </template>
            <template #item-unit_price="{ item }">
              <span class="font-weight-bold">
                {{ new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.winning_bid_amount) }}
              </span>
            </template>
            <template #item-subtotal="{ item }">
              <span class="text-success font-weight-bold">
                {{ new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.subtotal) }}
              </span>
            </template>
          </UiTable>
        </UiCard>
      </v-col>
    </v-row>
  </v-container>
</template>
