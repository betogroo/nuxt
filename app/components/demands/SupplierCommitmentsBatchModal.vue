<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { useToast } from '~/composables/useToast'
  import { useDemandProducts, type DemandProductRow } from '~/composables/useDemandProducts'
  import { getWinningBid, getItemSubtotal } from '~/utils/bids'
  import { formatCurrency, formatCnpj } from '~/utils/formatters'

  export interface NatureGroupItem {
    id: string
    name: string
    quantity: number
    unit: string
    unitPrice: number
    subtotal: number
    currentCommitment: string | null
  }

  export interface SupplierNatureGroup {
    natureId: string
    natureName: string
    totalAmount: number
    items: NatureGroupItem[]
    initialCommitment: string
  }

  const props = defineProps<{
    modelValue: boolean
    demandId: string
    supplier: {
      id: string
      company_name: string
      cnpj?: string | null
    } | null
    items: DemandProductRow[]
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', val: boolean): void
    (e: 'saved'): void
  }>()

  const toast = useToast()
  const { batchUpdateCommitmentsByNature } = useDemandProducts()

  const isSaving = ref(false)
  const serverError = ref('')
  const commitmentInputs = ref<Record<string, string>>({})

  const natureGroups = computed<SupplierNatureGroup[]>(() => {
    if (!props.supplier || !props.items) return []

    const suppId = props.supplier.id
    const groupsMap = new Map<
      string,
      {
        natureId: string
        natureName: string
        totalAmount: number
        items: NatureGroupItem[]
        initialCommitment: string
      }
    >()

    for (const item of props.items) {
      const bids = item.demand_product_bids || []
      const winningBid = getWinningBid(bids)

      if (winningBid && winningBid.supplier_id === suppId) {
        const prod = Array.isArray(item.product) ? item.product[0] : item.product
        const natureId = prod?.expense_nature_id || 'none'
        const natureName =
          prod?.expense_natures?.name ||
          (natureId === 'none' ? 'Sem Natureza Vinculada' : `Natureza ${natureId}`)

        const subtotal = getItemSubtotal(winningBid.amount, item.quantity)
        const commitment = item.commitment_number?.trim() || null

        if (!groupsMap.has(natureId)) {
          groupsMap.set(natureId, {
            natureId,
            natureName,
            totalAmount: 0,
            items: [],
            initialCommitment: commitment || '',
          })
        }

        const group = groupsMap.get(natureId)!
        group.totalAmount = Number((group.totalAmount + subtotal).toFixed(2))
        if (!group.initialCommitment && commitment) {
          group.initialCommitment = commitment
        }

        group.items.push({
          id: item.id,
          name: item.product_name_snapshot || prod?.name || 'Item da demanda',
          quantity: item.quantity,
          unit: item.unit_name_snapshot || item.measurement_units?.name || 'Un.',
          unitPrice: winningBid.amount,
          subtotal,
          currentCommitment: commitment,
        })
      }
    }

    return Array.from(groupsMap.values()).sort((a, b) => a.natureName.localeCompare(b.natureName))
  })

  watch(
    () => props.modelValue,
    (isOpen) => {
      if (isOpen) {
        serverError.value = ''
        const inputs: Record<string, string> = {}
        for (const g of natureGroups.value) {
          inputs[g.natureId] = g.initialCommitment || ''
        }
        commitmentInputs.value = inputs
      }
    },
    { immediate: true },
  )

  const closeModal = () => {
    emit('update:modelValue', false)
  }

  const validateInputs = (): boolean => {
    serverError.value = ''

    // Check for duplicate commitment notes across different natures
    const seen = new Map<string, string>()
    for (const group of natureGroups.value) {
      const val = (commitmentInputs.value[group.natureId] || '').trim().toUpperCase()
      if (val) {
        if (seen.has(val)) {
          serverError.value = `O número de empenho "${val}" foi informado para mais de uma natureza de despesa diferente. Cada natureza deve possuir uma nota de empenho exclusiva.`
          return false
        }
        seen.set(val, group.natureId)
      }
    }

    return true
  }

  const onSave = async () => {
    if (!props.supplier) return
    if (!validateInputs()) return

    isSaving.value = true
    serverError.value = ''

    try {
      const updates = natureGroups.value.map((g) => ({
        expenseNatureId: g.natureId,
        commitmentNumber: (commitmentInputs.value[g.natureId] || '').trim().toUpperCase() || null,
      }))

      await batchUpdateCommitmentsByNature({
        demandId: props.demandId,
        supplierId: props.supplier.id,
        updates,
      })

      toast.success('Notas de empenho atualizadas com sucesso!')
      emit('saved')
      closeModal()
    } catch (err: unknown) {
      serverError.value = err instanceof Error ? err.message : 'Erro ao atualizar notas de empenho.'
      toast.error(serverError.value)
    } finally {
      isSaving.value = false
    }
  }
</script>

<template>
  <UiModal
    max-width="680px"
    :model-value="modelValue"
    title="Gerenciar Notas de Empenho do Fornecedor"
    transparent-header
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="supplier" class="mb-3">
      <div class="text-subtitle-1 font-weight-bold">
        {{ supplier.company_name }}
      </div>
      <div v-if="supplier.cnpj" class="text-caption text-grey">
        CNPJ: {{ formatCnpj(supplier.cnpj) }}
      </div>
    </div>

    <UiAlert class="mb-4" size="xs" type="info" variant="soft">
      Os itens arrematados por este fornecedor estão agrupados por
      <strong>Natureza de Despesa</strong>. Todos os itens de uma mesma natureza compartilharão
      obrigatoriamente o mesmo número de Nota de Empenho.
    </UiAlert>

    <UiAlert v-if="serverError" class="mb-4" size="sm" type="error" variant="soft">
      {{ serverError }}
    </UiAlert>

    <div v-if="natureGroups.length === 0" class="text-center py-6 text-grey text-body-2">
      Nenhum item vencido encontrado para este fornecedor nesta demanda.
    </div>

    <div v-else class="d-flex flex-column ga-4">
      <UiCard v-for="group in natureGroups" :key="group.natureId" class="pa-3" variant="outline">
        <div class="d-flex align-center justify-space-between mb-2">
          <div>
            <span class="font-weight-bold text-body-2 text-primary">
              {{ group.natureName }}
            </span>
            <UiChip class="ml-2" color="default" size="xs">
              {{ group.items.length }} {{ group.items.length === 1 ? 'item' : 'itens' }}
            </UiChip>
          </div>
          <span class="font-weight-bold text-success text-body-2">
            Total: {{ formatCurrency(group.totalAmount) }}
          </span>
        </div>

        <!-- Lista compacta dos itens pertencentes à natureza -->
        <div class="bg-surface-variant pa-2 rounded mb-3">
          <div
            v-for="it in group.items"
            :key="it.id"
            class="d-flex align-center justify-space-between text-caption py-1 border-bottom"
          >
            <div class="text-truncate mr-2" style="max-width: 380px">
              <span class="font-weight-medium">{{ it.name }}</span>
              <span class="text-grey ml-1">({{ it.quantity }} {{ it.unit }})</span>
            </div>
            <div class="text-no-wrap font-weight-medium">
              {{ formatCurrency(it.subtotal) }}
            </div>
          </div>
        </div>

        <!-- Campo para a Nota de Empenho do lote -->
        <UiInput
          v-model="commitmentInputs[group.natureId]"
          hint="Informe o número da NE para todos os itens desta natureza"
          label="Número da Nota de Empenho *"
          persistent-hint
          placeholder="Ex: 2026-NE-00247"
        />
      </UiCard>
    </div>

    <template #actions>
      <UiButton :disabled="isSaving" variant="ghost" @click="closeModal"> Cancelar </UiButton>
      <UiButton
        color="primary"
        :disabled="natureGroups.length === 0"
        :loading="isSaving"
        @click="onSave"
      >
        Salvar Empenhos
      </UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
  .border-bottom:not(:last-child) {
    border-bottom: 1px dashed rgba(var(--v-border-color), 0.2);
  }
</style>
