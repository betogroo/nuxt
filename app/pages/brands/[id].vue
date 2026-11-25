<script setup lang="ts">
  import type { BrandProductItem } from '~/composables/useBrands'

  definePageMeta({ middleware: ['uge'] })

  const route = useRoute()
  const toast = useToast()
  const { isAdmin } = usePermissions()

  const { fetchBrandById, fetchBrandProducts, updateBrand, toggleBrandStatus } = useBrands()

  const brandId = route.params.id as string

  // 1. Carregamento dos dados cadastrais da marca
  const {
    data: brand,
    pending: isBrandLoading,
    error: brandError,
    refresh: refreshBrand,
  } = await useAsyncData(`brand-${brandId}`, () => fetchBrandById(brandId))

  // Se a marca não for encontrada, exibe mensagem amigável
  const brandNotFound = computed(() => !isBrandLoading.value && (!brand.value || brandError.value))

  // 2. Carregamento dos produtos vinculados a esta marca
  const {
    data: rawProducts,
    pending: isProductsLoading,
    refresh: refreshProducts,
  } = await useAsyncData(`brand-products-${brandId}`, async () => {
    if (!brand.value) return []
    return await fetchBrandProducts(brandId, brand.value.name)
  })

  useHead({
    title: computed(() => (brand.value ? `Marca: ${brand.value.name}` : 'Detalhes da Marca')),
  })

  // 3. Filtros e Pesquisa Local
  const searchQuery = ref('')

  const filteredProducts = computed<BrandProductItem[]>(() => {
    const items = rawProducts.value || []
    const term = searchQuery.value?.trim().toLowerCase()
    if (!term) return items

    return items.filter((item) => {
      const matchCommercialName = item.name?.toLowerCase().includes(term)
      const matchTechnicalName = item.product?.name?.toLowerCase().includes(term)
      const matchCatMat = String(item.product?.cat_mat || '').includes(term)
      const matchCatBec = String(item.product?.cat_bec || '').includes(term)
      const matchNature = item.product?.expense_natures?.name?.toLowerCase().includes(term)
      const matchClass = item.product?.product_classes?.name?.toLowerCase().includes(term)

      return (
        matchCommercialName ||
        matchTechnicalName ||
        matchCatMat ||
        matchCatBec ||
        matchNature ||
        matchClass
      )
    })
  })

  // 4. Métricas Computadas
  const totalCommercialProducts = computed(() => rawProducts.value?.length || 0)

  const uniqueTechnicalProducts = computed(() => {
    const set = new Set((rawProducts.value || []).map((p) => p.product?.id).filter(Boolean))
    return set.size
  })

  const activeTechnicalProductsCount = computed(() => {
    return (rawProducts.value || []).filter((p) => p.product?.is_active).length
  })

  // 5. Edição do Nome da Marca (Admin)
  const isEditModalOpen = ref(false)
  const editedName = ref('')
  const editError = ref('')
  const isSavingName = ref(false)

  const openEditModal = () => {
    if (!brand.value) return
    editedName.value = brand.value.name
    editError.value = ''
    isEditModalOpen.value = true
  }

  const closeEditModal = () => {
    isEditModalOpen.value = false
    editError.value = ''
  }

  const handleSaveBrandName = async () => {
    const trimmed = editedName.value.trim()
    if (!trimmed) {
      editError.value = 'O nome da marca não pode ser vazio.'
      return
    }

    if (!brand.value) return

    isSavingName.value = true
    editError.value = ''

    try {
      await updateBrand(brand.value.id, { name: trimmed })
      toast.success(`Marca atualizada para "${trimmed}" com sucesso!`)
      closeEditModal()
      await refreshBrand()
      await refreshProducts()
    } catch (e: unknown) {
      editError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isSavingName.value = false
    }
  }

  // 6. Alternância de Status (Admin)
  const isTogglingStatus = ref(false)

  const handleToggleStatus = async () => {
    if (!brand.value || isTogglingStatus.value) return
    isTogglingStatus.value = true
    try {
      await toggleBrandStatus(brand.value)
      const nextStatus = !brand.value.is_active
      toast.success(`Marca ${nextStatus ? 'ativada' : 'inativada'} com sucesso!`)
      await refreshBrand()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      isTogglingStatus.value = false
    }
  }

  // 7. Sanitização de URLs externas
  const ensureValidUrl = (url: string | null | undefined): string => {
    if (!url) return ''
    const trimmed = url.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    return `https://${trimmed}`
  }

  const tableHeaders = [
    { text: 'Produto Real (Modelo Comercial)', value: 'name' },
    { text: 'Link de Referência', value: 'link' },
    { text: 'Produto do Catálogo Técnico', value: 'technical_product' },
    { text: 'Classificação', value: 'classification' },
    { text: 'Status Técnico', value: 'status', align: 'center' },
    { text: 'Ações', value: 'actions', align: 'right' },
  ]
</script>

<template>
  <div>
    <!-- Botão de Voltar -->
    <div class="mb-4">
      <UiButton
        color="default"
        prepend-icon="arrowLeft"
        size="sm"
        :to="isAdmin ? '/admin/brands' : '/products'"
        variant="ghost"
      >
        {{ isAdmin ? 'Voltar para Marcas' : 'Voltar para Produtos' }}
      </UiButton>
    </div>

    <!-- Estado de Carregamento -->
    <div v-if="isBrandLoading" class="d-flex flex-column align-center justify-center py-12">
      <UiProgressCircular color="primary" indeterminate size="48" />
      <span class="text-caption text-medium-emphasis mt-3">Carregando dados da marca...</span>
    </div>

    <!-- Marca Não Encontrada -->
    <UiCard v-else-if="brandNotFound" class="pa-8 text-center" variant="outline">
      <UiIcon class="mb-3" color="error" name="alert" size="48" />
      <h3 class="text-h6 font-weight-bold mb-2">Marca Não Encontrada</h3>
      <p class="text-body-2 text-medium-emphasis mb-6">
        A marca solicitada não foi localizada ou pode ter sido removida do catálogo.
      </p>
      <UiButton
        color="primary"
        prepend-icon="arrowLeft"
        :to="isAdmin ? '/admin/brands' : '/products'"
      >
        {{ isAdmin ? 'Ir para Catálogo de Marcas' : 'Ir para Produtos' }}
      </UiButton>
    </UiCard>

    <!-- Conteúdo da Marca -->
    <div v-else-if="brand">
      <!-- Cabeçalho Principal -->
      <UiPageHeader
        :subtitle="`Cadastrada em ${new Date(brand.created_at).toLocaleDateString('pt-BR')}`"
        :title="brand.name"
      >
        <template #actions>
          <div class="d-flex align-center flex-wrap ga-2">
            <!-- Badges de Status -->
            <UiChip :color="brand.is_active ? 'success' : 'error'" label size="sm" variant="soft">
              {{ brand.is_active ? 'Ativa' : 'Inativa' }}
            </UiChip>

            <UiChip v-if="brand.is_pending" color="warning" label size="sm" variant="soft">
              <UiIcon class="mr-1" name="time" size="14" />
              Pendente de Aprovação
            </UiChip>

            <!-- Ações Administrativas -->
            <UiButton
              v-if="isAdmin"
              color="primary"
              density="comfortable"
              prepend-icon="edit"
              size="sm"
              variant="outline"
              @click="openEditModal"
            >
              Editar Nome
            </UiButton>

            <UiButton
              v-if="isAdmin"
              :color="brand.is_active ? 'error' : 'success'"
              density="comfortable"
              :loading="isTogglingStatus"
              :prepend-icon="brand.is_active ? 'lock' : 'check'"
              size="sm"
              variant="soft"
              @click="handleToggleStatus"
            >
              {{ brand.is_active ? 'Inativar Marca' : 'Ativar Marca' }}
            </UiButton>
          </div>
        </template>
      </UiPageHeader>

      <!-- Métricas Resumidas -->
      <UiRow class="mb-5">
        <UiCol cols="12" md="4" sm="6">
          <UiCard class="pa-4" variant="outline">
            <div class="d-flex align-center ga-3">
              <UiAvatar color="primary" rounded="lg" size="48" variant="soft">
                <UiIcon name="packageSolid" size="24" />
              </UiAvatar>
              <div>
                <div class="text-caption text-medium-emphasis font-weight-medium">
                  Produtos Reais Registrados
                </div>
                <div class="text-h5 font-weight-bold text-primary">
                  {{ totalCommercialProducts }}
                </div>
              </div>
            </div>
          </UiCard>
        </UiCol>

        <UiCol cols="12" md="4" sm="6">
          <UiCard class="pa-4" variant="outline">
            <div class="d-flex align-center ga-3">
              <UiAvatar color="info" rounded="lg" size="48" variant="soft">
                <UiIcon name="product" size="24" />
              </UiAvatar>
              <div>
                <div class="text-caption text-medium-emphasis font-weight-medium">
                  Itens Técnicos Atendidos
                </div>
                <div class="text-h5 font-weight-bold text-info">
                  {{ uniqueTechnicalProducts }}
                </div>
              </div>
            </div>
          </UiCard>
        </UiCol>

        <UiCol cols="12" md="4" sm="6">
          <UiCard class="pa-4" variant="outline">
            <div class="d-flex align-center ga-3">
              <UiAvatar color="teal" rounded="lg" size="48" variant="soft">
                <UiIcon name="check" size="24" />
              </UiAvatar>
              <div>
                <div class="text-caption text-medium-emphasis font-weight-medium">
                  Itens Técnicos Ativos
                </div>
                <div class="text-h5 font-weight-bold text-teal">
                  {{ activeTechnicalProductsCount }}
                </div>
              </div>
            </div>
          </UiCard>
        </UiCol>
      </UiRow>

      <!-- Card com a Lista de Produtos -->
      <UiCard variant="outline">
        <template #header>
          <UiIcon class="mr-2" color="primary" name="packageSolid" />
          Produtos desta Marca
          <UiChip v-if="filteredProducts.length > 0" class="ml-2" label size="xs" variant="soft">
            {{ filteredProducts.length }}
          </UiChip>
          <UiSpacer />
          <UiInput
            v-model="searchQuery"
            clearable
            hide-details
            label="Buscar por modelo ou item técnico..."
            prepend-inner-icon="search"
            rounded="lg"
            size="sm"
            style="max-width: 320px"
            variant="outline"
          />
        </template>

        <UiTable :headers="tableHeaders" :items="filteredProducts" :loading="isProductsLoading">
          <!-- Modelo Comercial -->
          <template #item-name="{ item }">
            <div class="d-flex flex-column">
              <span class="font-weight-medium text-body-1">{{ item.name }}</span>
              <span class="text-caption text-medium-emphasis">
                Vinculado em {{ new Date(item.created_at).toLocaleDateString('pt-BR') }}
              </span>
            </div>
          </template>

          <!-- Link Comercial -->
          <template #item-link="{ item }">
            <UiButton
              v-if="item.link"
              append-icon="externalLink"
              color="info"
              :href="ensureValidUrl(item.link)"
              rel="noopener noreferrer"
              size="xs"
              target="_blank"
              title="Abrir página comercial de referência"
              variant="tonal"
            >
              Acessar Referência
            </UiButton>
            <span v-else class="text-caption text-medium-emphasis">—</span>
          </template>

          <!-- Produto Técnico do Catálogo -->
          <template #item-technical_product="{ item }">
            <div v-if="item.product" class="d-flex flex-column ga-1">
              <NuxtLink
                class="font-weight-medium text-primary text-decoration-none"
                :to="`/products/${item.product.id}`"
              >
                {{ item.product.name }}
              </NuxtLink>
              <div class="d-flex flex-wrap ga-1">
                <UiChip v-if="item.product.cat_mat" color="primary" label size="xs" variant="soft">
                  CATMAT: {{ item.product.cat_mat }}
                </UiChip>
                <UiChip
                  v-if="item.product.cat_bec"
                  color="secondary"
                  label
                  size="xs"
                  variant="soft"
                >
                  CATBEC: {{ item.product.cat_bec }}
                </UiChip>
              </div>
            </div>
            <span v-else class="text-caption text-medium-emphasis">Produto desvinculado</span>
          </template>

          <!-- Classificação -->
          <template #item-classification="{ item }">
            <div v-if="item.product" class="d-flex flex-column ga-1">
              <span v-if="item.product.expense_natures" class="text-caption">
                <strong>Natureza:</strong> {{ item.product.expense_natures.name }}
              </span>
              <span v-if="item.product.product_classes" class="text-caption text-medium-emphasis">
                <strong>Classe:</strong> {{ item.product.product_classes.name }}
              </span>
              <span
                v-if="!item.product.expense_natures && !item.product.product_classes"
                class="text-caption text-medium-emphasis"
              >
                —
              </span>
            </div>
            <span v-else class="text-medium-emphasis">—</span>
          </template>

          <!-- Status Técnico -->
          <template #item-status="{ item }">
            <UiChip
              v-if="item.product"
              :color="item.product.is_active ? 'success' : 'default'"
              label
              size="xs"
              variant="soft"
            >
              {{ item.product.is_active ? 'Ativo' : 'Inativo' }}
            </UiChip>
            <span v-else class="text-medium-emphasis">—</span>
          </template>

          <!-- Ações -->
          <template #item-actions="{ item }">
            <div v-if="item.product" class="d-flex justify-end">
              <UiButton
                append-icon="arrowRight"
                color="primary"
                size="xs"
                :to="`/products/${item.product.id}`"
                variant="soft"
              >
                Ver Produto
              </UiButton>
            </div>
          </template>

          <!-- Estado Vazio -->
          <template #empty>
            <div class="text-center pa-8 text-medium-emphasis">
              <UiIcon class="mb-2" color="disabled" name="packageSolid" size="40" />
              <div class="text-body-1 font-weight-medium">
                {{
                  searchQuery
                    ? 'Nenhum produto atende aos critérios de busca.'
                    : 'Nenhum produto cadastrado para esta marca ainda.'
                }}
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                {{
                  searchQuery
                    ? 'Tente pesquisar com outros termos.'
                    : 'Ao cadastrar produtos reais na ficha técnica dos itens, eles serão listados aqui.'
                }}
              </div>
              <div v-if="!searchQuery" class="mt-4">
                <UiButton
                  color="primary"
                  prepend-icon="product"
                  size="sm"
                  to="/products"
                  variant="soft"
                >
                  Ir para Catálogo de Produtos
                </UiButton>
              </div>
            </div>
          </template>
        </UiTable>
      </UiCard>
    </div>

    <!-- Modal para Edição do Nome da Marca (Admin) -->
    <UiModal v-model="isEditModalOpen" max-width="500px" title="Editar Nome da Marca">
      <div class="d-flex flex-column ga-4">
        <UiAlert v-if="editError" size="sm" type="error">
          {{ editError }}
        </UiAlert>

        <UiInput
          v-model="editedName"
          label="Nome da Marca *"
          placeholder="Ex: BIC, Chamex, Faber-Castell..."
          @keydown.enter.prevent="handleSaveBrandName"
        />

        <p class="text-caption text-medium-emphasis">
          A alteração do nome será sincronizada automaticamente em todos os produtos reais
          vinculados a esta marca.
        </p>
      </div>

      <template #actions>
        <UiButton :disabled="isSavingName" variant="ghost" @click="closeEditModal">
          Cancelar
        </UiButton>
        <UiButton
          color="primary"
          :disabled="!editedName.trim()"
          :loading="isSavingName"
          prepend-icon="check"
          @click="handleSaveBrandName"
        >
          Salvar Alterações
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
