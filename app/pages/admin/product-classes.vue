<script setup lang="ts">
  import type { ProductClassRow } from '~/composables/useProductClasses'

  definePageMeta({
    icon: 'categories',
    middleware: ['admin'],
    navLabel: 'Classes de Produtos',
    navSubtitle: 'Gerencie as classes de produtos',
    navColor: 'teal',
    navGroup: 'admin',
    navOrder: 95,
    roles: ['admin'],
    showIn: ['drawer', 'admin-shortcuts'],
  })

  useHead({ title: 'Gerenciar Classes de Produtos' })

  const {
    fetchProductClasses,
    fetchPendingProductClasses,
    fetchAllActiveProductClasses,
    createProductClass,
    updateProductClass,
    deleteProductClass,
    toggleProductClassStatus,
    approvePendingProductClass,
    mergePendingProductClass,
  } = useProductClasses()

  const activeTab = ref('active')

  // Pagination and Search State (Active Classes)
  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const searchQuery = ref('')
  const totalItems = ref(0)
  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  const {
    data: productClasses,
    pending,
    refresh,
  } = useAsyncData(
    'product-classes-admin',
    async () => {
      const result = await fetchProductClasses(
        currentPage.value,
        itemsPerPage.value,
        searchQuery.value,
      )
      totalItems.value = result.count
      return result.data
    },
    { watch: [currentPage, itemsPerPage] },
  )

  const { data: pendingClasses, refresh: refreshPending } = useAsyncData(
    'product-classes-pending',
    fetchPendingProductClasses,
  )

  const { data: allActiveClasses } = useAsyncData(
    'product-classes-all-active',
    fetchAllActiveProductClasses,
  )

  let timeout: ReturnType<typeof setTimeout> | null = null
  const handleSearch = () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      currentPage.value = 1
      refresh()
    }, 500)
  }

  // Modal State
  const isModalOpen = ref(false)
  const isEditing = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  const form = ref<{
    id: string
    name: string
    is_active: boolean
  }>({
    id: '',
    name: '',
    is_active: true,
  })

  const openAddModal = () => {
    form.value = {
      id: '',
      name: '',
      is_active: true,
    }
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (productClass: ProductClassRow) => {
    form.value = {
      id: productClass.id,
      name: productClass.name,
      is_active: productClass.is_active,
    }
    isEditing.value = true
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveProductClass = async () => {
    if (!form.value.name) {
      saveError.value = 'O Nome da Classe é obrigatório.'
      return
    }
    if (!form.value.id && !isEditing.value) {
      saveError.value = 'O Código (ID) é obrigatório.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      const payload = {
        name: form.value.name,
        id: form.value.id,
        is_active: form.value.is_active,
        is_pending: false,
      }

      if (isEditing.value) {
        await updateProductClass(form.value.id, payload)
      } else {
        await createProductClass(payload)
      }

      await refresh()
      closeModal()
    } catch (e: unknown) {
      saveError.value = getErrorMessage(e, 'esta classe de produto')
    } finally {
      isSaving.value = false
    }
  }

  const toggleStatus = async (item: ProductClassRow) => {
    try {
      await toggleProductClassStatus(item)
      await refresh()
    } catch (e: unknown) {
      alert(getErrorMessage(e, 'esta classe de produto'))
    }
  }

  const deleteClass = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta Classe de Produto?')) return
    try {
      await deleteProductClass(id)
      await refresh()
    } catch (e: unknown) {
      alert(getErrorMessage(e, 'esta classe de produto'))
    }
  }

  // --- Resolve Pending Modal ---
  const isResolveModalOpen = ref(false)
  const isResolving = ref(false)
  const resolveError = ref('')
  const resolveMode = ref<'approve' | 'merge'>('approve')
  const targetPendingClass = ref<ProductClassRow | null>(null)

  const resolveForm = ref({
    newName: '',
    finalClassId: '',
  })

  const openResolveModal = (pClass: ProductClassRow) => {
    targetPendingClass.value = pClass
    resolveForm.value = {
      newName: pClass.name,
      finalClassId: '',
    }
    resolveMode.value = 'approve'
    resolveError.value = ''
    isResolveModalOpen.value = true
  }

  const closeResolveModal = () => {
    isResolveModalOpen.value = false
    targetPendingClass.value = null
  }

  const submitResolve = async () => {
    if (!targetPendingClass.value) return
    isResolving.value = true
    resolveError.value = ''

    try {
      if (resolveMode.value === 'approve') {
        await approvePendingProductClass(targetPendingClass.value, resolveForm.value.newName)
      } else {
        await mergePendingProductClass(targetPendingClass.value, resolveForm.value.finalClassId)
      }
      await refreshPending()
      await refresh()
      closeResolveModal()
    } catch (e: unknown) {
      resolveError.value = getErrorMessage(e, 'esta classe de produto')
    } finally {
      isResolving.value = false
    }
  }
</script>

<template>
  <div>
    <PageHeader subtitle="Gerencie as Classes de Produtos do sistema" title="Classes de Produtos" />

    <v-tabs v-model="activeTab" class="mb-5" color="primary" density="compact">
      <v-tab value="active">
        <UiIcon class="mr-2" name="categories" size="18" />
        Classes Oficiais
      </v-tab>
      <v-tab value="pending">
        <UiIcon class="mr-2" name="time" size="18" />
        Pendentes
        <v-badge
          v-if="pendingClasses && pendingClasses.length > 0"
          class="ml-2"
          color="error"
          :content="pendingClasses.length"
          inline
        />
      </v-tab>
    </v-tabs>

    <!-- Aba Ativas -->
    <div v-if="activeTab === 'active'">
      <UiCard>
        <template #header>
          <UiIcon class="mr-2" color="primary" name="categories" />
          Lista de Classes de Produtos
          <UiChip v-if="totalItems > 0" class="ml-2" label size="x-small" variant="tonal">
            {{ totalItems }}
          </UiChip>
          <UiSpacer />
          <v-text-field
            v-model="searchQuery"
            clearable
            density="compact"
            hide-details
            label="Buscar..."
            prepend-inner-icon="search"
            rounded="lg"
            style="max-width: 260px"
            variant="outlined"
            @update:model-value="handleSearch"
          />
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
            Nova Classe
          </UiButton>
        </template>

        <UiTable
          :headers="[
            { text: 'Código', value: 'id' },
            { text: 'Nome', value: 'name' },
            { text: 'Status', value: 'is_active', align: 'center' },
            { text: 'Ações', value: 'actions', align: 'right' },
          ]"
          :items="productClasses || []"
          :loading="pending"
        >
          <template #item-id="{ item }">
            <UiChip v-if="item.id" color="info" label size="small" variant="tonal">
              {{ item.id }}
            </UiChip>
            <span v-else class="text-medium-emphasis">—</span>
          </template>

          <template #item-is_active="{ item }">
            <v-switch
              class="d-inline-flex"
              color="primary"
              density="compact"
              hide-details
              :model-value="item.is_active"
              @update:model-value="toggleStatus(item)"
            />
          </template>

          <template #item-actions="{ item }">
            <div class="d-flex justify-end gap-1">
              <UiButton
                color="secondary"
                icon="editOutline"
                size="x-small"
                variant="text"
                @click="openEditModal(item)"
              />
              <UiButton
                color="error"
                icon="deleteOutline"
                size="x-small"
                variant="text"
                @click="deleteClass(item.id)"
              />
            </div>
          </template>
        </UiTable>

        <div v-if="totalPages > 1" class="d-flex justify-center pa-4 border-t">
          <v-pagination
            v-model="currentPage"
            density="comfortable"
            :length="totalPages"
            :total-visible="7"
          />
        </div>
      </UiCard>
    </div>

    <!-- Aba Pendentes -->
    <div v-else-if="activeTab === 'pending'">
      <UiCard>
        <template #header>
          <UiIcon class="mr-2" color="warning" name="time" />
          Classes Sugeridas por Usuários
          <UiSpacer />
          <UiButton
            color="secondary"
            icon="refresh"
            size="small"
            variant="tonal"
            @click="refreshPending"
          />
        </template>

        <UiTable
          :headers="[
            { text: 'Código Sugerido', value: 'id' },
            { text: 'Nome Sugerido', value: 'name' },
            { text: 'Data Sugestão', value: 'created_at' },
            { text: 'Ações', value: 'actions', align: 'right' },
          ]"
          :items="pendingClasses || []"
        >
          <template #item-id="{ item }">
            <UiChip color="warning" label size="small" variant="tonal">
              {{ item.id }}
            </UiChip>
          </template>

          <template #item-created_at="{ item }">
            {{ new Date(item.created_at).toLocaleDateString('pt-BR') }}
          </template>

          <template #item-actions="{ item }">
            <div class="d-flex justify-end gap-2">
              <UiButton
                color="primary"
                prepend-icon="check"
                size="small"
                variant="tonal"
                @click="openResolveModal(item)"
              >
                Revisar
              </UiButton>
              <UiButton
                color="error"
                icon="deleteOutline"
                size="small"
                variant="text"
                @click="deleteClass(item.id)"
              />
            </div>
          </template>

          <template #empty>
            <div class="text-center pa-6 text-medium-emphasis">
              <UiIcon class="mb-2" color="grey" name="success" size="36" />
              <div>Nenhuma classe de produto pendente de revisão.</div>
            </div>
          </template>
        </UiTable>
      </UiCard>
    </div>

    <!-- Modal Adicionar / Editar Classe Oficial -->
    <UiModal
      v-model="isModalOpen"
      :title="isEditing ? 'Editar Classe de Produto' : 'Nova Classe de Produto'"
    >
      <UiAlert v-if="saveError" class="mb-4" type="error">
        {{ saveError }}
      </UiAlert>

      <v-form @submit.prevent="saveProductClass">
        <v-text-field
          v-model="form.id"
          class="mb-3"
          :disabled="isEditing"
          hint="Ex: 5915"
          label="Código da Classe"
          persistent-hint
          required
          variant="outlined"
        />

        <v-text-field
          v-model="form.name"
          class="mb-3"
          label="Nome da Classe"
          placeholder="Ex: Filtros e redes"
          required
          variant="outlined"
        />

        <v-switch
          v-model="form.is_active"
          color="primary"
          density="compact"
          hide-details
          label="Classe Ativa"
        />
      </v-form>

      <template #actions>
        <UiButton color="grey" variant="text" @click="closeModal"> Cancelar </UiButton>
        <UiButton color="primary" :loading="isSaving" @click="saveProductClass"> Salvar </UiButton>
      </template>
    </UiModal>

    <!-- Modal Resolver Pendência (Aprovar / Mesclar) -->
    <UiModal
      v-model="isResolveModalOpen"
      :title="`Revisar Classe: ${targetPendingClass?.name || ''}`"
    >
      <UiAlert v-if="resolveError" class="mb-4" type="error">
        {{ resolveError }}
      </UiAlert>

      <div class="text-body-2 mb-4">
        Esta classe foi sugerida pelo usuário com o código
        <strong>{{ targetPendingClass?.id }}</strong> e o nome
        <strong>{{ targetPendingClass?.name }}</strong
        >.
      </div>

      <v-radio-group v-model="resolveMode" class="mb-4" color="primary">
        <v-radio label="Aprovar e Ativar (tornar classe oficial no sistema)" value="approve" />
        <v-radio label="Mesclar em uma Classe Oficial já existente" value="merge" />
      </v-radio-group>

      <div v-if="resolveMode === 'approve'">
        <v-text-field
          v-model="resolveForm.newName"
          class="mb-2"
          label="Nome Oficial da Classe"
          variant="outlined"
        />
      </div>

      <div v-if="resolveMode === 'merge'">
        <v-autocomplete
          v-model="resolveForm.finalClassId"
          class="mb-2"
          item-title="name"
          item-value="id"
          :items="allActiveClasses || []"
          label="Selecione a Classe Oficial de Destino"
          placeholder="Busque pelo nome da classe..."
          variant="outlined"
        />
        <div class="text-caption text-medium-emphasis">
          Todos os produtos vinculados a esta sugestão serão apontados para a classe oficial
          escolhida e a sugestão pendente será excluída.
        </div>
      </div>

      <template #actions>
        <UiButton color="grey" variant="text" @click="closeResolveModal"> Cancelar </UiButton>
        <UiButton color="primary" :loading="isResolving" @click="submitResolve">
          {{ resolveMode === 'approve' ? 'Aprovar Classe' : 'Confirmar Mesclagem' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
