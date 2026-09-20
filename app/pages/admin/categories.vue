<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  definePageMeta({
    middleware: ['admin'],
  })
  useHead({ title: 'Gerenciar Categorias' })

  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  type CategoryRow = Database['public']['Tables']['product_categories']['Row']

  const currentPage = ref(1)
  const itemsPerPage = ref(10)
  const totalItems = ref(0)

  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

  const {
    data: categories,
    pending,
    refresh,
  } = useAsyncData(
    'admin-categories',
    async () => {
      const from = (currentPage.value - 1) * itemsPerPage.value
      const to = from + itemsPerPage.value - 1

      const { data, count, error } = await supabase
        .from('product_categories')
        .select('*', { count: 'exact' })
        .order('name', { ascending: true })
        .range(from, to)

      if (error) {
        console.error(error)
        return []
      }

      totalItems.value = count || 0
      return data
    },
    { watch: [currentPage] },
  )

  const isModalOpen = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')
  const isEditing = ref(false)

  const defaultForm = {
    id: '',
    name: '',
    is_active: true,
  }
  const form = ref({ ...defaultForm })

  const openAddModal = () => {
    form.value = { ...defaultForm }
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (cat: CategoryRow) => {
    form.value = { ...cat }
    isEditing.value = true
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveCategory = async () => {
    if (!form.value.name.trim()) {
      saveError.value = 'O nome da categoria é obrigatório.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      if (isEditing.value) {
        const { error } = await supabase
          .from('product_categories')
          .update({
            name: form.value.name.trim(),
            is_active: form.value.is_active,
          })
          .eq('id', form.value.id)

        if (error) {
          if (error.code === '23505') throw new Error('Já existe uma categoria com este nome.')
          throw error
        }

        await logAction(
          'UPDATE_CATEGORY',
          `Categoria atualizada: ${form.value.name}`,
          user.value?.id,
        )
      } else {
        const { error } = await supabase.from('product_categories').insert({
          name: form.value.name.trim(),
          is_active: form.value.is_active,
        })

        if (error) {
          if (error.code === '23505') throw new Error('Já existe uma categoria com este nome.')
          throw error
        }

        await logAction(
          'CREATE_CATEGORY',
          `Nova categoria criada: ${form.value.name}`,
          user.value?.id,
        )
      }

      await refresh()
      closeModal()
    } catch (err: unknown) {
      saveError.value = err instanceof Error ? err.message : String(err)
    } finally {
      isSaving.value = false
    }
  }
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <UiCard>
          <template #header>
            Categorias de Produtos
            <v-spacer />
            <UiButton color="white" prepend-icon="mdi-plus" @click="openAddModal">
              Nova Categoria
            </UiButton>
            <UiButton
              class="ml-2"
              color="white"
              icon="mdi-refresh"
              :loading="pending"
              variant="text"
              @click="refresh"
            />
          </template>

          <UiTable
            :headers="[
              { text: 'Nome da Categoria', value: 'name' },
              { text: 'Status', value: 'is_active' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="categories || []"
          >
            <template v-if="!categories?.length && !pending" #empty>
              Nenhuma categoria encontrada.
            </template>
            <template #item-name="{ item }">
              <span class="font-weight-medium">{{ item.name }}</span>
            </template>
            <template #item-is_active="{ item }">
              <v-chip :color="item.is_active ? 'success' : 'error'" size="small" variant="flat">
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
      <UiCard :title="isEditing ? 'Editar Categoria' : 'Nova Categoria'" transparent-header>
        <v-alert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ saveError }}
        </v-alert>

        <UiInput v-model="form.name" label="Nome da Categoria (Ex: Papelaria)" />

        <v-switch
          v-model="form.is_active"
          color="success"
          hint="Determina se os usuários podem escolher esta categoria ao cadastrar novos produtos"
          label="Categoria Ativa"
          persistent-hint
        />

        <template #actions>
          <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
          <UiButton color="primary" :loading="isSaving" @click="saveCategory"> Salvar </UiButton>
        </template>
      </UiCard>
    </v-dialog>
  </v-container>
</template>
