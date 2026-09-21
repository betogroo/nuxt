<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  const route = useRoute()
  const router = useRouter()
  const supabase = useSupabaseClient<Database>()

  const demandId = route.params.id as string
  const itemId = route.params.itemId as string

  // Fetch Demand Product (Item) Details
  const {
    data: item,
    pending,
    error,
  } = useAsyncData(`demand-item-${itemId}`, async () => {
    const { data, error: err } = await supabase
      .from('demand_products')
      .select('*, product:products(*), measurement_units(*)')
      .eq('id', itemId)
      .single()

    if (err) throw err
    return data
  })

  // Basic fallback
  if (error.value) {
    console.error(error.value)
  }
</script>

<template>
  <v-container>
    <div class="mb-4 d-flex align-center">
      <UiButton icon="mdi-arrow-left" variant="text" @click="router.push(`/demands/${demandId}`)" />
      <h2 class="text-h5 ml-2">Detalhes do Item na Demanda</h2>
    </div>

    <v-row>
      <v-col cols="12" md="8">
        <UiCard v-if="!pending && item" transparent-header>
          <template #header>
            <div class="d-flex align-center">
              {{ item.product?.name }}
              <UiButton
                class="ml-1"
                color="primary"
                icon="mdi-open-in-new"
                size="small"
                title="Ver Cadastro Original do Produto"
                :to="`/products/${item.product?.id}`"
                variant="text"
              />
              <v-chip class="ml-2" color="secondary" size="small" variant="flat">
                {{ item.measurement_units?.name || 'Unidade' }}
              </v-chip>
            </div>
            <v-spacer />
            <v-chip color="info" variant="outlined">Qtd: {{ item.quantity }}</v-chip>
          </template>

          <v-alert class="mb-4" density="compact" type="info" variant="tonal">
            Esta é a tela exclusiva deste produto dentro da demanda. Futuramente, lances e
            documentos enviados pelos fornecedores aparecerão aqui.
          </v-alert>

          <!-- Futuro Card de Lances -->
          <UiCard class="mb-4" title="Lances Recebidos" variant="outlined">
            <div class="text-body-2 text-grey pa-4 text-center">
              Nenhum lance registrado para este item ainda. (Em desenvolvimento)
            </div>
          </UiCard>

          <!-- Futuro Card de Documentos -->
          <UiCard title="Documentos e Anexos" variant="outlined">
            <div class="text-body-2 text-grey pa-4 text-center">
              Nenhum documento anexado. (Em desenvolvimento)
            </div>
          </UiCard>
        </UiCard>

        <div v-if="pending" class="text-center py-10">
          <v-progress-circular color="primary" indeterminate></v-progress-circular>
        </div>
      </v-col>

      <v-col cols="12" md="4">
        <!-- Resumo da Demanda / Status -->
        <UiCard title="Informações" variant="outlined">
          <v-list class="bg-transparent" density="compact">
            <v-list-item>
              <template #prepend>
                <v-icon color="grey">mdi-identifier</v-icon>
              </template>
              <v-list-item-title>ID do Item</v-list-item-title>
              <v-list-item-subtitle>{{ item?.id }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template #prepend>
                <v-icon color="grey">mdi-calendar</v-icon>
              </template>
              <v-list-item-title>Adicionado em</v-list-item-title>
              <v-list-item-subtitle>
                {{ item?.created_at ? new Date(item.created_at).toLocaleString() : '-' }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </UiCard>
      </v-col>
    </v-row>
  </v-container>
</template>
