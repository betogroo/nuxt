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
        <v-card>
          <v-card-title class="d-flex align-center bg-primary text-white pa-4">
            Categorias de Produtos
            <v-spacer />
            <v-btn color="white" prepend-icon="mdi-plus" variant="elevated" @click="openAddModal">
              Nova Categoria
            </v-btn>
            <v-btn
              class="ml-2"
              color="white"
              icon="mdi-refresh"
              :loading="pending"
              variant="text"
              @click="refresh"
            />
          </v-card-title>

          <v-table hover>
            <thead>
              <tr>
                <th class="text-left">Nome da Categoria</th>
                <th class="text-left">Status</th>
                <th class="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cat in categories" :key="cat.id">
                <td class="font-weight-medium">{{ cat.name }}</td>
                <td>
                  <v-chip :color="cat.is_active ? 'success' : 'error'" size="small" variant="flat">
                    {{ cat.is_active ? 'ATIVO' : 'INATIVO' }}
                  </v-chip>
                </td>
                <td class="text-right">
                  <v-btn
                    color="primary"
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click="openEditModal(cat)"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>

          <v-card-text v-if="!categories?.length && !pending" class="text-center text-grey">
            Nenhuma categoria encontrada.
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
          {{ isEditing ? 'Editar Categoria' : 'Nova Categoria' }}
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
            label="Nome da Categoria (Ex: Papelaria)"
            variant="outlined"
          />

          <v-switch
            v-model="form.is_active"
            color="success"
            hint="Determina se os usuários podem escolher esta categoria ao cadastrar novos produtos"
            label="Categoria Ativa"
            persistent-hint
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="px-4 py-3 justify-end">
          <v-btn :disabled="isSaving" variant="text" @click="closeModal">Cancelar</v-btn>
          <v-btn color="primary" :loading="isSaving" variant="flat" @click="saveCategory">
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
