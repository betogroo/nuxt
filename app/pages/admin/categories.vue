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

  const { data: allActiveCategories } = useAsyncData('all-active-categories', async () => {
    const { data } = await supabase
      .from('product_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    return data || []
  })

  const {
    data: pendingSuggestions,
    pending: pendingSuggestionsPending,
    refresh: refreshSuggestions,
  } = useAsyncData('admin-suggestions', async () => {
    const { data, error } = await supabase
      .from('products')
      .select('suggested_category')
      .not('suggested_category', 'is', null)

    if (error) return []

    const groups: Record<string, number> = {}
    data.forEach((p) => {
      const cat = p.suggested_category as string
      groups[cat] = (groups[cat] || 0) + 1
    })

    return Object.keys(groups).map((name) => ({
      name,
      count: groups[name],
    }))
  })

  // Resolve Modal State
  const isResolveModalOpen = ref(false)
  const resolveTarget = ref('')
  const resolveMode = ref<'new' | 'existing'>('new')
  const resolveNewName = ref('')
  const resolveExistingId = ref<string | null>(null)
  const isResolving = ref(false)
  const resolveError = ref('')

  const openResolveModal = (suggestion: string) => {
    resolveTarget.value = suggestion
    resolveMode.value = 'new'
    resolveNewName.value = suggestion
    resolveExistingId.value = null
    resolveError.value = ''
    isResolveModalOpen.value = true
  }

  const closeResolveModal = () => {
    isResolveModalOpen.value = false
  }

  const submitResolve = async () => {
    resolveError.value = ''
    isResolving.value = true
    try {
      let finalCategoryId = resolveExistingId.value

      if (resolveMode.value === 'new') {
        if (!resolveNewName.value.trim()) {
          throw new Error('Informe o nome da nova categoria.')
        }
        const { data: newCat, error: insertError } = await supabase
          .from('product_categories')
          .insert({ name: resolveNewName.value.trim(), is_active: true })
          .select()
          .single()

        if (insertError) {
          if (insertError.code === '23505')
            throw new Error('Já existe uma categoria com este nome.')
          throw insertError
        }
        finalCategoryId = newCat.id
      }

      if (!finalCategoryId) {
        throw new Error('Selecione uma categoria existente.')
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({
          category_id: finalCategoryId,
          suggested_category: null,
        })
        .eq('suggested_category', resolveTarget.value)

      if (updateError) throw updateError

      await logAction(
        'RESOLVE_SUGGESTION',
        `Sugestão "${resolveTarget.value}" resolvida`,
        user.value?.id,
      )

      await refreshSuggestions()
      if (resolveMode.value === 'new') await refresh()
      await refreshNuxtData('pending-categories-count')

      closeResolveModal()
    } catch (e: unknown) {
      resolveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isResolving.value = false
    }
  }

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
  <div>
    <PageHeader
      subtitle="Gerencie as categorias disponíveis e avalie sugestões"
      title="Categorias de Produtos"
    />

    <v-row>
      <v-col cols="12">
        <!-- Tabela de Sugestões Pendentes -->
        <UiCard
          v-if="pendingSuggestions && pendingSuggestions.length > 0"
          class="mb-6"
          title="Sugestões Pendentes"
        >
          <template #header>
            Sugestões Pendentes ({{ pendingSuggestions.length }})
            <v-spacer />
            <UiButton
              color="primary"
              icon="mdi-refresh"
              :loading="pendingSuggestionsPending"
              size="small"
              variant="text"
              @click="refreshSuggestions"
            />
          </template>
          <UiTable
            :headers="[
              { text: 'Sugestão', value: 'name' },
              { text: 'Produtos aguardando', value: 'count', align: 'center' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="pendingSuggestions"
          >
            <template #item-name="{ item }">
              <span class="font-weight-medium text-warning">{{ item.name }}</span>
            </template>
            <template #item-count="{ item }">
              <v-chip size="small">{{ item.count }}</v-chip>
            </template>
            <template #item-actions="{ item }">
              <UiButton
                color="primary"
                size="small"
                variant="tonal"
                @click="openResolveModal(item.name)"
              >
                Resolver
              </UiButton>
            </template>
          </UiTable>
        </UiCard>

        <!-- Tabela Principal de Categorias -->
        <UiCard>
          <template #header>
            <span class="text-subtitle-1 font-weight-bold">Categorias de Produtos</span>
            <v-spacer />
            <UiButton
              class="mr-2"
              color="secondary"
              icon="mdi-refresh"
              :loading="pending"
              size="small"
              variant="tonal"
              @click="refresh"
            />
            <UiButton color="primary" prepend-icon="mdi-plus" @click="openAddModal">
              Nova Categoria
            </UiButton>
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

    <!-- Resolve Modal -->
    <v-dialog v-model="isResolveModalOpen" max-width="550px" persistent>
      <UiCard title="Resolver Sugestão de Categoria" transparent-header>
        <v-alert v-if="resolveError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ resolveError }}
        </v-alert>

        <p class="mb-4 text-body-2">
          Resolvendo a sugestão: <strong class="text-warning">{{ resolveTarget }}</strong>
        </p>

        <v-radio-group v-model="resolveMode" class="mb-2">
          <v-radio label="Criar Nova Categoria" value="new" />
          <v-radio label="Vincular a Categoria Existente" value="existing" />
        </v-radio-group>

        <v-slide-y-transition leave-absolute>
          <div v-if="resolveMode === 'new'">
            <UiInput
              v-model="resolveNewName"
              hint="Você pode ajustar o texto digitado pelo usuário para o padrão oficial."
              label="Nome da Nova Categoria"
              persistent-hint
            />
          </div>
          <div v-else>
            <UiSelect
              v-model="resolveExistingId"
              item-title="name"
              item-value="id"
              :items="allActiveCategories || []"
              label="Selecione a Categoria"
            />
          </div>
        </v-slide-y-transition>

        <template #actions>
          <UiButton :disabled="isResolving" variant="text" @click="closeResolveModal"
            >Cancelar</UiButton
          >
          <UiButton color="primary" :loading="isResolving" @click="submitResolve"
            >Confirmar</UiButton
          >
        </template>
      </UiCard>
    </v-dialog>
  </div>
</template>
