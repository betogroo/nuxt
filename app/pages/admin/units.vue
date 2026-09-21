<script setup lang="ts">
  import type { Database } from '~/types/database.types'

  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()
  const { logAction } = useLogger()

  type UnitRow = Database['public']['Tables']['measurement_units']['Row']

  const {
    data: units,
    pending,
    refresh,
  } = useAsyncData('measurement-units-admin', async () => {
    const { data, error } = await supabase.from('measurement_units').select('*').order('name')
    if (error) {
      console.error(error)
      return []
    }
    return data
  })

  // Modal State
  const isModalOpen = ref(false)
  const isEditing = ref(false)
  const isSaving = ref(false)
  const saveError = ref('')

  const form = ref<{
    id: string
    name: string
    legacy_alias: string
    is_active: boolean
  }>({
    id: '',
    name: '',
    legacy_alias: '',
    is_active: true,
  })

  const openAddModal = () => {
    form.value = {
      id: '',
      name: '',
      legacy_alias: '',
      is_active: true,
    }
    isEditing.value = false
    saveError.value = ''
    isModalOpen.value = true
  }

  const openEditModal = (unit: UnitRow) => {
    form.value = {
      id: unit.id,
      name: unit.name,
      legacy_alias: unit.legacy_alias || '',
      is_active: unit.is_active,
    }
    isEditing.value = true
    saveError.value = ''
    isModalOpen.value = true
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const saveUnit = async () => {
    if (!form.value.name) {
      saveError.value = 'O nome da unidade é obrigatório.'
      return
    }

    isSaving.value = true
    saveError.value = ''

    try {
      const payload = {
        name: form.value.name,
        legacy_alias: form.value.legacy_alias || null,
        is_active: form.value.is_active,
      }

      if (isEditing.value) {
        const { error } = await supabase
          .from('measurement_units')
          .update(payload)
          .eq('id', form.value.id)
        if (error) throw error
        await logAction(
          'UPDATE_UNIT',
          `Unidade de medida atualizada: ${form.value.name}`,
          user.value?.id,
        )
      } else {
        const { error } = await supabase.from('measurement_units').insert(payload)
        if (error) throw error
        await logAction(
          'CREATE_UNIT',
          `Nova unidade de medida criada: ${form.value.name}`,
          user.value?.id,
        )
      }

      await refresh()
      closeModal()
    } catch (e: unknown) {
      saveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isSaving.value = false
    }
  }

  const toggleStatus = async (unit: UnitRow) => {
    try {
      const newStatus = !unit.is_active
      const { error } = await supabase
        .from('measurement_units')
        .update({ is_active: newStatus })
        .eq('id', unit.id)

      if (error) throw error

      await logAction(
        'TOGGLE_UNIT_STATUS',
        `Unidade ${unit.name} alterada para ${newStatus ? 'ATIVO' : 'INATIVO'}`,
        user.value?.id,
      )
      await refresh()
    } catch (e: unknown) {
      alert(`Erro ao alterar status: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // --- RESOLVER SUGESTÕES DE UNIDADES PENDENTES ---
  const pendingUnits = computed(() => {
    return units.value?.filter((u) => u.is_pending) || []
  })

  const activeUnits = computed(() => {
    return units.value?.filter((u) => !u.is_pending && u.is_active) || []
  })

  const isResolveModalOpen = ref(false)
  const isResolving = ref(false)
  const resolveError = ref('')
  const resolveTarget = ref<UnitRow | null>(null)
  const resolveMode = ref<'new' | 'link'>('new')
  const resolveLinkUnitId = ref('')

  const openResolveModal = (unit: UnitRow) => {
    resolveTarget.value = unit
    resolveMode.value = 'new'
    resolveLinkUnitId.value = ''
    resolveError.value = ''
    isResolveModalOpen.value = true
  }

  const closeResolveModal = () => {
    isResolveModalOpen.value = false
  }

  const submitResolve = async () => {
    if (!resolveTarget.value) return
    isResolving.value = true
    resolveError.value = ''

    try {
      const targetUnit = resolveTarget.value

      if (resolveMode.value === 'new') {
        // 1. Aprovar a unidade pendente como oficial
        const { error: updateError } = await supabase
          .from('measurement_units')
          .update({ is_pending: false, is_active: true })
          .eq('id', targetUnit.id)

        if (updateError) throw updateError
        await logAction(
          'APPROVE_UNIT',
          `Unidade sugerida aprovada: ${targetUnit.name}`,
          user.value?.id,
        )
      } else {
        // 2. Fundir (Merge) com uma existente
        if (!resolveLinkUnitId.value)
          throw new Error('Selecione uma unidade existente para mesclar.')
        const finalUnitId = resolveLinkUnitId.value

        // 2.a Atualizar product_units para apontar para a final, ignorando duplicadas
        // (Podemos tentar um update, mas se houver UNIQUE violation, significa que o produto ja tem a unidade final. Nesse caso, podemos apagar o vinculo da pendente)
        const { data: productLinks } = await supabase
          .from('product_units')
          .select('*')
          .eq('unit_id', targetUnit.id)

        if (productLinks) {
          for (const link of productLinks) {
            const { error: updErr } = await supabase
              .from('product_units')
              .update({ unit_id: finalUnitId })
              .eq('id', link.id)
            if (updErr && updErr.code === '23505') {
              // Se deu erro de unicidade, quer dizer que o produto ja tinha a final. Entao só deleta o vinculo temporario
              await supabase.from('product_units').delete().eq('id', link.id)
            }
          }
        }

        // 2.b Atualizar demand_products para apontar para a final
        const { data: demandLinks } = await supabase
          .from('demand_products')
          .select('*')
          .eq('unit_id', targetUnit.id)

        if (demandLinks) {
          for (const link of demandLinks) {
            const { error: updErr } = await supabase
              .from('demand_products')
              .update({ unit_id: finalUnitId })
              .eq('id', link.id)
            if (updErr && updErr.code === '23505') {
              // Produto com essa unidade já está na demanda (pouco provável, mas lidando com isso)
              await supabase.from('demand_products').delete().eq('id', link.id)
            }
          }
        }

        // 2.c Deletar a unidade pendente
        const { error: delError } = await supabase
          .from('measurement_units')
          .delete()
          .eq('id', targetUnit.id)
        if (delError) throw delError

        await logAction(
          'MERGE_UNIT',
          `Unidade sugerida "${targetUnit.name}" mesclada na oficial.`,
          user.value?.id,
        )
      }

      await refresh()
      await refreshNuxtData('pending-units-count')

      closeResolveModal()
    } catch (e: unknown) {
      resolveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      isResolving.value = false
    }
  }
</script>

<template>
  <v-container>
    <v-row>
      <v-col v-if="pendingUnits && pendingUnits.length > 0" cols="12">
        <UiCard>
          <template #header>
            <div class="text-warning d-flex align-center">
              <v-icon class="mr-2">mdi-alert-circle</v-icon>
              Unidades Pendentes ({{ pendingUnits.length }})
            </div>
          </template>

          <v-alert class="mb-4" density="compact" type="info" variant="tonal">
            Usuários sugeriram as unidades abaixo ao vincular a produtos. Resolva-as aprovando-as
            como oficiais ou fundindo-as com unidades existentes.
          </v-alert>

          <UiTable
            :headers="[
              { text: 'Unidade Sugerida', value: 'name' },
              { text: 'Apelido (Se houver)', value: 'legacy_alias' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="pendingUnits"
          >
            <template #item-actions="{ item }">
              <UiButton
                color="primary"
                size="small"
                variant="outlined"
                @click="openResolveModal(item)"
              >
                Resolver
              </UiButton>
            </template>
          </UiTable>
        </UiCard>
      </v-col>

      <v-col cols="12">
        <UiCard>
          <template #header>
            Unidades de Medida Oficiais
            <v-spacer />
            <UiButton color="white" prepend-icon="mdi-plus" @click="openAddModal">
              Nova Unidade
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
              { text: 'Nome da Unidade', value: 'name' },
              { text: 'Apelido (Sistema Legado)', value: 'legacy_alias' },
              { text: 'Status', value: 'is_active', align: 'center' },
              { text: 'Ações', value: 'actions', align: 'right' },
            ]"
            :items="activeUnits"
            :loading="pending"
          >
            <template #item-legacy_alias="{ item }">
              <v-chip v-if="item.legacy_alias" color="info" size="small" variant="tonal">
                {{ item.legacy_alias }}
              </v-chip>
              <span v-else class="text-grey">-</span>
            </template>
            <template #item-is_active="{ item }">
              <v-chip
                class="cursor-pointer"
                :color="item.is_active ? 'success' : 'error'"
                size="small"
                variant="flat"
                @click="toggleStatus(item)"
              >
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
        </UiCard>
      </v-col>
    </v-row>

    <!-- Modal Form -->
    <v-dialog v-model="isModalOpen" max-width="500px">
      <UiCard :title="isEditing ? 'Editar Unidade' : 'Nova Unidade'" transparent-header>
        <v-alert v-if="saveError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ saveError }}
        </v-alert>

        <UiInput v-model="form.name" label="Nome da Unidade (ex: Pacote, Bisnaga 90g)" />
        <UiInput v-model="form.legacy_alias" label="Apelido do Sistema Legado (opcional)" />

        <v-switch
          v-model="form.is_active"
          color="success"
          hint="Indica se a unidade está disponível para vínculos"
          label="Unidade Ativa"
          persistent-hint
        />

        <template #actions>
          <UiButton :disabled="isSaving" variant="text" @click="closeModal">Cancelar</UiButton>
          <UiButton color="primary" :loading="isSaving" @click="saveUnit"> Salvar </UiButton>
        </template>
      </UiCard>
    </v-dialog>

    <!-- Modal Resolve Suggestion -->
    <v-dialog v-model="isResolveModalOpen" max-width="600px">
      <UiCard title="Resolver Unidade Pendente" transparent-header>
        <v-alert v-if="resolveError" class="mb-4" density="compact" type="error" variant="tonal">
          {{ resolveError }}
        </v-alert>

        <div class="text-subtitle-1 mb-4">
          Unidade Sugerida: <strong class="text-warning">{{ resolveTarget?.name }}</strong>
        </div>

        <v-radio-group v-model="resolveMode">
          <v-radio label="Aprovar como Nova Unidade Oficial" value="new" />
          <v-radio label="Fundir (Merge) com Unidade Oficial Existente" value="link" />
        </v-radio-group>

        <v-slide-y-transition>
          <div v-if="resolveMode === 'link'" class="mt-4">
            <UiSelect
              v-model="resolveLinkUnitId"
              item-title="name"
              item-value="id"
              :items="activeUnits"
              label="Selecione a unidade oficial correspondente"
            />
          </div>
        </v-slide-y-transition>

        <template #actions>
          <UiButton :disabled="isResolving" variant="text" @click="closeResolveModal"
            >Cancelar</UiButton
          >
          <UiButton color="primary" :loading="isResolving" @click="submitResolve">
            Confirmar
          </UiButton>
        </template>
      </UiCard>
    </v-dialog>
  </v-container>
</template>
