<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  const route = useRoute()
  const router = useRouter()
  const supabase = useSupabaseClient<Database>()
  const productId = route.params.id as string

  const { data: product, pending } = useAsyncData(`product-${productId}`, async () => {
    const { data, error } = await supabase.from('products').select('*').eq('id', productId).single()

    if (error) {
      console.error(error)
      throw error
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
    <v-btn class="mb-4" prepend-icon="mdi-arrow-left" variant="text" @click="router.back()">
      Voltar
    </v-btn>

    <v-row v-if="pending">
      <v-col class="text-center" cols="12">
        <v-progress-circular color="primary" indeterminate></v-progress-circular>
      </v-col>
    </v-row>

    <v-row v-else-if="product">
      <v-col cols="12" md="8" offset-md="2">
        <v-card>
          <v-card-title class="d-flex align-center bg-primary text-white pa-4">
            <v-icon class="mr-3" size="large">mdi-package-variant</v-icon>
            {{ product.name }}
            <v-spacer />
            <v-chip :color="product.is_active ? 'success' : 'error'" variant="elevated">
              {{ product.is_active ? 'ATIVO' : 'INATIVO' }}
            </v-chip>
          </v-card-title>

          <v-card-text class="pa-6">
            <v-row>
              <v-col cols="12" sm="6">
                <div class="text-caption text-grey mb-1">ID do Produto</div>
                <div class="text-body-1 font-weight-mono">{{ product.id }}</div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-caption text-grey mb-1">Categoria de Material</div>
                <div class="text-body-1">{{ product.material_category }}</div>
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
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col cols="12">
        <v-alert type="error" variant="tonal"> Produto não encontrado. </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>
