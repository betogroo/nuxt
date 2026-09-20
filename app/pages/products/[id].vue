<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  const route = useRoute()
  const router = useRouter()
  const supabase = useSupabaseClient<Database>()
  const productId = route.params.id as string

  const { data: product, pending } = useAsyncData(`product-${productId}`, async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_categories(id, name)')
      .eq('id', productId)
      .single()

    if (error) {
      console.error(error)
      return null
    }
    return data
  })

  useHead({
    title: computed(() =>
      product.value?.name ? `Produto: ${product.value.name}` : 'Detalhes do Produto',
    ),
  })
</script>

<template>
  <v-container>
    <UiButton class="mb-4" prepend-icon="mdi-arrow-left" variant="text" @click="router.back()">
      Voltar
    </UiButton>

    <v-row v-if="pending">
      <v-col class="text-center" cols="12">
        <v-progress-circular color="primary" indeterminate></v-progress-circular>
      </v-col>
    </v-row>

    <v-row v-else-if="product">
      <v-col cols="12" md="8" offset-md="2">
        <UiCard transparent-header>
          <template #header>
            <div class="d-flex align-center w-100 bg-primary text-white pa-4" style="margin: -16px">
              <v-icon class="mr-3" size="large">mdi-package-variant</v-icon>
              {{ product.name }}
              <v-spacer />
              <v-chip :color="product.is_active ? 'success' : 'error'" variant="elevated">
                {{ product.is_active ? 'ATIVO' : 'INATIVO' }}
              </v-chip>
            </div>
          </template>

          <v-row class="mt-4">
            <v-col cols="12" sm="6">
              <div class="text-caption text-grey mb-1">ID do Produto</div>
              <div class="text-body-1 font-weight-mono">{{ product.id }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-grey mb-1">Categoria de Material</div>
              <div class="text-body-1">{{ product.product_categories?.name || '-' }}</div>
            </v-col>

            <v-col cols="12" sm="6">
              <div class="text-caption text-grey mb-1">Criado em</div>
              <div class="text-body-1">{{ new Date(product.created_at).toLocaleString() }}</div>
            </v-col>
            <v-col cols="12" sm="6">
              <div class="text-caption text-grey mb-1">Última atualização</div>
              <div class="text-body-1">{{ new Date(product.updated_at).toLocaleString() }}</div>
            </v-col>

            <v-col v-if="product.created_by" cols="12">
              <div class="text-caption text-grey mb-1">Criado por (ID)</div>
              <div class="text-body-1">
                {{ product.created_by }}
              </div>
            </v-col>
          </v-row>
        </UiCard>
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col cols="12">
        <v-alert type="error" variant="tonal"> Produto não encontrado. </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>
